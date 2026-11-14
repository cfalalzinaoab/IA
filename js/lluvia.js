/* ==========================================================================
   LLUVIA.JS · el código que cae tras el cristal
   --------------------------------------------------------------------------
   La lluvia no usa ninguna fuente: el alfabeto se INVENTA al arrancar.
   Cada glifo son tres a cinco trazos entre los nudos de una rejilla de
   3 × 4, tirados con una semilla fija, así que la nave escribe siempre las
   mismas 56 letras y ningún sistema las pinta como cuadraditos vacíos.
   A ese alfabeto se le suman los diez dígitos, dibujados también a trazos.

   Cómo se pinta: los glifos se dibujan una sola vez en una lámina (un
   canvas escondido) por cada color, y cada paso copia recortes de la lámina.
   La estela no se guarda en ninguna parte: cada paso se vela todo el lienzo
   con el color de fondo casi transparente y lo viejo se va apagando solo.

   Va a 20 pasos por segundo (no a 60: la lluvia cae a saltos de una celda,
   y más cuadros solo gastarían batería) y se para si la pestaña se esconde
   o si el lienzo sale de la pantalla.

   NAVE.lluvia.crear(canvas, {celda, velo, densidad}) devuelve los mandos:
   parar(), seguir(), intensidad(n), tema(), destruir().
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  var GLIFOS = 56;          // letras inventadas
  var TOTAL = GLIFOS + 10;  // más los dígitos
  var CONEJO = TOTAL;       // y, al final de la lámina, el conejo

  /* ---------- el alfabeto ------------------------------------------------- */

  // Todos los trazos posibles entre nudos vecinos de la rejilla 3 × 4.
  var SEGMENTOS = (function () {
    var lista = [];
    for (var f = 0; f < 4; f++) {
      for (var c = 0; c < 3; c++) {
        if (c < 2) lista.push([c, f, c + 1, f]);                 // horizontal
        if (f < 3) lista.push([c, f, c, f + 1]);                 // vertical
        if (c < 2 && f < 3) {
          lista.push([c, f, c + 1, f + 1]);                      // diagonal \
          lista.push([c + 1, f, c, f + 1]);                      // diagonal /
        }
      }
    }
    return lista;
  })();

  var ALFABETO = (function () {
    var tirar = NAVE.azar(1979);
    var glifos = [];
    for (var g = 0; g < GLIFOS; g++) {
      var cuantos = 3 + Math.floor(tirar() * 3);
      var trazos = [];
      for (var t = 0; t < cuantos; t++) trazos.push(SEGMENTOS[Math.floor(tirar() * SEGMENTOS.length)]);
      glifos.push({ trazos: trazos, punto: tirar() < 0.3 ? [Math.floor(tirar() * 3), Math.floor(tirar() * 4)] : null });
    }
    return glifos;
  })();

  // Los dígitos, en siete segmentos sobre la misma rejilla (filas 0, 1.5 y 3).
  var SIETE = {
    a: [0, 0, 2, 0], b: [2, 0, 2, 1.5], c: [2, 1.5, 2, 3], d: [0, 3, 2, 3],
    e: [0, 1.5, 0, 3], f: [0, 0, 0, 1.5], g: [0, 1.5, 2, 1.5]
  };
  var DIGITOS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abfgcd'];

  function pintarLamina(celda, color) {
    var lamina = document.createElement('canvas');
    lamina.width = celda * (TOTAL + 1);
    lamina.height = celda;
    var ctx = lamina.getContext('2d');
    var margenX = celda * 0.24, margenY = celda * 0.14;
    var pasoX = (celda - margenX * 2) / 2, pasoY = (celda - margenY * 2) / 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, celda * 0.085);
    ctx.lineCap = 'round';

    function trazo(origen, s) {
      ctx.beginPath();
      ctx.moveTo(origen + margenX + s[0] * pasoX, margenY + s[1] * pasoY);
      ctx.lineTo(origen + margenX + s[2] * pasoX, margenY + s[3] * pasoY);
      ctx.stroke();
    }

    ALFABETO.forEach(function (glifo, i) {
      glifo.trazos.forEach(function (s) { trazo(i * celda, s); });
      if (glifo.punto) {
        ctx.beginPath();
        ctx.arc(i * celda + margenX + glifo.punto[0] * pasoX, margenY + glifo.punto[1] * pasoY, ctx.lineWidth * 0.9, 0, 6.2832);
        ctx.fill();
      }
    });
    DIGITOS.forEach(function (segmentos, d) {
      segmentos.split('').forEach(function (letra) { trazo((GLIFOS + d) * celda, SIETE[letra]); });
    });

    // el conejo: dos orejas, una cabeza
    var x = CONEJO * celda, u = celda / 12;
    ctx.lineWidth = Math.max(1, celda * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + 4.200 * u, 6 * u); ctx.lineTo(x + 3.600 * u, 1.500 * u);
    ctx.moveTo(x + 7.800 * u, 6 * u); ctx.lineTo(x + 8.400 * u, 1.500 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 6 * u, 8.200 * u, 2.900 * u, 0, 6.2832);
    ctx.stroke();
    return lamina;
  }

  /* ---------- los colores de cada modo ----------------------------------- */

  var TEMAS = {
    'puente':      { fondo: '3, 8, 6',      cuerpo: '#2fd77a', cabeza: '#eafff2' },
    'codigo':      { fondo: '2, 9, 5',      cuerpo: '#4dff93', cabeza: '#ffffff' },
    'sala-blanca': { fondo: '243, 245, 241', cuerpo: '#9db8a7', cabeza: '#1a8a4e' }
  };

  /* ---------- una lluvia -------------------------------------------------- */

  function crear(lienzo, opciones) {
    opciones = opciones || {};
    var ctx = lienzo.getContext('2d');
    var celda = opciones.celda || 20;
    var velo = opciones.velo || 0.09;            // cuánto se apaga la estela en cada paso
    var densidad = opciones.densidad === undefined ? 1 : opciones.densidad;
    var conConejo = !!opciones.conejo;

    var tema = TEMAS[NAVE.modo.actual()] || TEMAS.puente;
    var laminaCuerpo, laminaCabeza;
    var ancho = 0, alto = 0, escala = 1, columnas = [], filas = 0;
    var andando = false, visible = true, cuadro = null, anterior = 0, resto = 0;
    var conejo = null;                 // {columna, hasta} mientras hay uno cayendo
    var proximoConejo = Date.now() + 25000 + Math.random() * 30000;
    var destruida = false;
    var templada = false;

    function laminas() {
      var px = Math.round(celda * escala);
      laminaCuerpo = pintarLamina(px, tema.cuerpo);
      laminaCabeza = pintarLamina(px, tema.cabeza);
    }

    function columnaNueva(alAzar) {
      return {
        y: alAzar ? Math.floor(Math.random() * filas * 2) - filas : -Math.floor(Math.random() * filas * 0.8) - 1,
        cada: 1 + Math.floor(Math.random() * 3),   // avanza 1 de cada N pasos: unas corren, otras gotean
        cuenta: 0,
        glifo: Math.floor(Math.random() * TOTAL),
        activa: Math.random() < densidad
      };
    }

    function medir() {
      var caja = lienzo.getBoundingClientRect();
      var nuevoAncho = Math.max(1, Math.round(caja.width));
      var nuevoAlto = Math.max(1, Math.round(caja.height));
      if (nuevoAncho === ancho && nuevoAlto === alto) return;
      ancho = nuevoAncho; alto = nuevoAlto;
      escala = Math.min(window.devicePixelRatio || 1, 1.5);   // más nitidez no se nota y cuesta
      lienzo.width = Math.round(ancho * escala);
      lienzo.height = Math.round(alto * escala);
      filas = Math.ceil(alto / celda) + 1;
      var cuantas = Math.ceil(ancho / celda);
      columnas = [];
      for (var c = 0; c < cuantas; c++) columnas.push(columnaNueva(true));
      laminas();
      ctx.fillStyle = 'rgb(' + tema.fondo + ')';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    }

    function estampar(lamina, glifo, columna, fila) {
      var px = Math.round(celda * escala);
      ctx.drawImage(lamina, glifo * px, 0, px, px, columna * px, fila * px, px, px);
    }

    function paso() {
      var px = Math.round(celda * escala);
      ctx.fillStyle = 'rgba(' + tema.fondo + ',' + velo + ')';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);

      var ahora = Date.now();
      if (conConejo && !conejo && ahora > proximoConejo && columnas.length > 4) {
        var elegida = 2 + Math.floor(Math.random() * (columnas.length - 4));
        columnas[elegida].y = -1;
        columnas[elegida].cada = 3;      // el conejo cae despacio: hay que poder cazarlo
        columnas[elegida].activa = true;
        conejo = { columna: elegida };
      }

      for (var c = 0; c < columnas.length; c++) {
        var col = columnas[c];
        if (!col.activa) {
          if (Math.random() < 0.002 * densidad) columnas[c] = columnaNueva(false), columnas[c].activa = true;
          continue;
        }
        col.cuenta++;
        if (col.cuenta < col.cada) continue;
        col.cuenta = 0;

        var esConejo = conejo && conejo.columna === c;
        // lo que era cabeza pasa a ser cuerpo
        if (col.y >= 0 && col.y < filas) {
          ctx.fillStyle = 'rgb(' + tema.fondo + ')';
          ctx.fillRect(c * px, col.y * px, px, px);
          estampar(laminaCuerpo, col.glifo, c, col.y);
        }
        col.y++;
        col.glifo = Math.floor(Math.random() * TOTAL);
        if (col.y >= 0 && col.y < filas) {
          ctx.fillStyle = 'rgb(' + tema.fondo + ')';
          ctx.fillRect(c * px, col.y * px, px, px);
          estampar(laminaCabeza, esConejo ? CONEJO : col.glifo, c, col.y);
        }
        if (col.y > filas + 2) {
          if (esConejo) {
            conejo = null;
            proximoConejo = ahora + 45000 + Math.random() * 60000;
          }
          columnas[c] = columnaNueva(false);
        }
      }

      // de vez en cuando un glifo ya caído cambia de letra: el parpadeo del código
      for (var k = 0; k < Math.ceil(columnas.length / 14); k++) {
        var cc = Math.floor(Math.random() * columnas.length);
        var col2 = columnas[cc];
        if (!col2.activa || col2.y < 3) continue;
        var fila = col2.y - 1 - Math.floor(Math.random() * Math.min(col2.y - 1, 9));
        if (fila < 0 || fila >= filas) continue;
        ctx.fillStyle = 'rgb(' + tema.fondo + ')';
        ctx.fillRect(cc * px, fila * px, px, px);
        ctx.globalAlpha = 0.75;
        estampar(laminaCuerpo, Math.floor(Math.random() * TOTAL), cc, fila);
        ctx.globalAlpha = 1;
      }
    }

    function bucle(ahora) {
      cuadro = null;
      if (!andando || !visible || destruida) return;
      if (!anterior) anterior = ahora;
      resto += ahora - anterior;
      anterior = ahora;
      if (resto > 250) resto = 50;       // tras una pausa, no recuperar de golpe
      while (resto >= 50) { paso(); resto -= 50; }
      cuadro = requestAnimationFrame(bucle);
    }

    function arrancar() {
      if (cuadro || !andando || !visible || destruida) return;
      anterior = 0;
      cuadro = requestAnimationFrame(bucle);
    }

    // --- cazar al conejo ---
    function alPulsar(evento) {
      if (!conejo) return;
      var caja = lienzo.getBoundingClientRect();
      var x = evento.clientX - caja.left, y = evento.clientY - caja.top;
      var col = columnas[conejo.columna];
      var cx = (conejo.columna + 0.5) * celda, cy = (col.y + 0.5) * celda;
      if (Math.abs(x - cx) < celda * 2.2 && Math.abs(y - cy) < celda * 2.6) {
        conejo = null;
        proximoConejo = Date.now() + 90000;
        NAVE.bus.emitir('conejo-cazado');
      }
    }
    if (conConejo) lienzo.addEventListener('pointerdown', alPulsar);

    // --- vigilar tamaño, pantalla y pestaña ---
    var vigiaTamano = null, vigiaPantalla = null;
    if (window.ResizeObserver) {
      vigiaTamano = new ResizeObserver(function () { medir(); });
      vigiaTamano.observe(lienzo);
    } else {
      window.addEventListener('resize', medir);
    }
    if (window.IntersectionObserver) {
      vigiaPantalla = new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting && !document.hidden;
        arrancar();
      });
      vigiaPantalla.observe(lienzo);
    }
    function alCambiarPestana() {
      visible = !document.hidden;
      arrancar();
    }
    document.addEventListener('visibilitychange', alCambiarPestana);

    function ponerTema(nombre) {
      tema = TEMAS[nombre] || TEMAS.puente;
      laminas();
      ctx.fillStyle = 'rgb(' + tema.fondo + ')';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    }
    NAVE.bus.oir('tema', function (nombre) { if (!destruida) ponerTema(nombre); });

    medir();

    var mandos = {
      seguir: function () {
        if (!templada) { templada = true; mandos.fotograma(); }   // que no arranque con el cristal vacío
        if (NAVE.calma) return;
        andando = true; arrancar();
      },
      parar: function () { andando = false; },
      get andando() { return andando; },
      intensidad: function (valor) {
        densidad = valor;
        columnas.forEach(function (col) { if (!col.activa && Math.random() < valor) col.activa = true; });
      },
      tema: ponerTema,
      // Con «reducir movimiento» no llueve, pero el cristal no se queda negro:
      // se pinta una lluvia ya caída, quieta.
      fotograma: function () {
        for (var i = 0; i < 70; i++) paso();
      },
      soltarConejo: function () { proximoConejo = 0; },
      destruir: function () {
        destruida = true; andando = false;
        if (cuadro) cancelAnimationFrame(cuadro);
        if (vigiaTamano) vigiaTamano.disconnect();
        if (vigiaPantalla) vigiaPantalla.disconnect();
        document.removeEventListener('visibilitychange', alCambiarPestana);
        lienzo.removeEventListener('pointerdown', alPulsar);
      }
    };
    return mandos;
  }

  // El visor 3D (visor3d.js) no inventa otro alfabeto: pide esta misma lámina
  // y la convierte en textura, para que la lluvia en tres dimensiones escriba
  // exactamente las mismas letras que la de dos.
  NAVE.lluvia = {
    crear: crear,
    lamina: pintarLamina,
    GLIFOS: TOTAL,          // letras inventadas + dígitos
    CONEJO: CONEJO          // la casilla del conejo, la última
  };
})();
