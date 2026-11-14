/* ==========================================================================
   DEMOS/RED.JS · una red neuronal que se ve aprender
   --------------------------------------------------------------------------
   Sobre un plano hay puntos de dos clases (círculos verdes, cuadrados
   ámbar). Una red pequeñita —dos entradas (dónde está el punto), una o dos
   capas ocultas y una salida (de qué color cree que es)— aprende a
   separarlos delante de quien mira: el fondo del plano se va tiñendo con lo
   que la red «opina» de cada sitio.

   Es una red de verdad, escrita aquí entera y sin bibliotecas:
     · neuronas ocultas con tangente hiperbólica, salida sigmoide;
     · error de entropía cruzada;
     · retropropagación a mano y ajuste con Adam (un descenso de gradiente
       que regula solo el tamaño del paso; con el descenso a secas la
       espiral tardaba minutos).
   Cabe en unas cien líneas: de ahí para abajo todo es dibujar.

   NAVE.demos.red.montar(contenedor) → { desmontar() }
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;
  NAVE.demos = NAVE.demos || {};

  /* ---------- la red ------------------------------------------------------ */

  // forma: [2, 4, 4, 1] = dos entradas, dos capas de cuatro, una salida.
  function crearRed(forma, tirar) {
    var capas = [];
    for (var l = 1; l < forma.length; l++) {
      var entran = forma[l - 1], salen = forma[l];
      var capa = { w: [], b: [], mw: [], vw: [], mb: [], vb: [] };
      var amplitud = Math.sqrt(2 / (entran + salen)) * 1.6;
      for (var j = 0; j < salen; j++) {
        var fila = [], ceros1 = [], ceros2 = [];
        for (var i = 0; i < entran; i++) { fila.push((tirar() * 2 - 1) * amplitud); ceros1.push(0); ceros2.push(0); }
        capa.w.push(fila); capa.mw.push(ceros1); capa.vw.push(ceros2);
        capa.b.push(0); capa.mb.push(0); capa.vb.push(0);
      }
      capas.push(capa);
    }
    return { forma: forma, capas: capas, pasos: 0 };
  }

  // Devuelve lo que sale de cada capa (la primera «salida» es la entrada).
  function adelante(red, x, y) {
    var salidas = [[x, y]];
    for (var l = 0; l < red.capas.length; l++) {
      var capa = red.capas[l], entra = salidas[l], sale = [];
      var ultima = l === red.capas.length - 1;
      for (var j = 0; j < capa.w.length; j++) {
        var suma = capa.b[j];
        for (var i = 0; i < entra.length; i++) suma += capa.w[j][i] * entra[i];
        sale.push(ultima ? 1 / (1 + Math.exp(-suma)) : Math.tanh(suma));
      }
      salidas.push(sale);
    }
    return salidas;
  }

  function opinion(red, x, y) {
    var salidas = adelante(red, x, y);
    return salidas[salidas.length - 1][0];
  }

  // Una vuelta: mira todos los puntos, suma cuánto habría que mover cada
  // peso para equivocarse menos, y los mueve. Devuelve el error medio.
  function vuelta(red, puntos, ritmo) {
    var n = puntos.length;
    if (!n) return 0;
    var L = red.capas.length;
    var gw = [], gb = [];
    for (var l = 0; l < L; l++) {
      gw.push(red.capas[l].w.map(function (fila) { return fila.map(function () { return 0; }); }));
      gb.push(red.capas[l].b.map(function () { return 0; }));
    }
    var error = 0;
    for (var p = 0; p < n; p++) {
      var punto = puntos[p];
      var salidas = adelante(red, punto.x, punto.y);
      var dicho = salidas[L][0];
      error += -(punto.c ? Math.log(dicho + 1e-9) : Math.log(1 - dicho + 1e-9));
      // con sigmoide y entropía cruzada, la culpa de la salida es (dicho − verdad)
      var culpa = [dicho - punto.c];
      for (var k = L - 1; k >= 0; k--) {
        var capa = red.capas[k], entra = salidas[k];
        var culpaAntes = entra.map(function () { return 0; });
        for (var j = 0; j < capa.w.length; j++) {
          gb[k][j] += culpa[j];
          for (var i = 0; i < entra.length; i++) {
            gw[k][j][i] += culpa[j] * entra[i];
            culpaAntes[i] += culpa[j] * capa.w[j][i];
          }
        }
        if (k > 0) {
          // la derivada de tanh es 1 − tanh²
          for (var q = 0; q < culpaAntes.length; q++) culpaAntes[q] *= 1 - entra[q] * entra[q];
        }
        culpa = culpaAntes;
      }
    }
    // Adam
    red.pasos++;
    var b1 = 0.9, b2 = 0.999;
    var c1 = 1 - Math.pow(b1, red.pasos), c2 = 1 - Math.pow(b2, red.pasos);
    for (var m = 0; m < L; m++) {
      var c = red.capas[m];
      for (var jj = 0; jj < c.w.length; jj++) {
        for (var ii = 0; ii < c.w[jj].length; ii++) {
          var g = gw[m][jj][ii] / n;
          c.mw[jj][ii] = b1 * c.mw[jj][ii] + (1 - b1) * g;
          c.vw[jj][ii] = b2 * c.vw[jj][ii] + (1 - b2) * g * g;
          c.w[jj][ii] -= ritmo * (c.mw[jj][ii] / c1) / (Math.sqrt(c.vw[jj][ii] / c2) + 1e-8);
        }
        var gB = gb[m][jj] / n;
        c.mb[jj] = b1 * c.mb[jj] + (1 - b1) * gB;
        c.vb[jj] = b2 * c.vb[jj] + (1 - b2) * gB * gB;
        c.b[jj] -= ritmo * (c.mb[jj] / c1) / (Math.sqrt(c.vb[jj] / c2) + 1e-8);
      }
    }
    return error / n;
  }

  function acierto(red, puntos) {
    if (!puntos.length) return 0;
    var bien = 0;
    puntos.forEach(function (p) { if ((opinion(red, p.x, p.y) > 0.5 ? 1 : 0) === p.c) bien++; });
    return bien / puntos.length;
  }

  /* ---------- los juegos de puntos --------------------------------------- */

  function campana(tirar) {      // un número con forma de campana, centrado en 0
    return (tirar() + tirar() + tirar() + tirar() - 2) / 1.2;
  }

  var JUEGOS = {
    grupos: {
      nombre: 'Dos grupos',
      crear: function (tirar) {
        var puntos = [];
        for (var i = 0; i < 40; i++) {
          puntos.push({ x: -0.45 + campana(tirar) * 0.3, y: 0.4 + campana(tirar) * 0.3, c: 1 });
          puntos.push({ x: 0.45 + campana(tirar) * 0.3, y: -0.4 + campana(tirar) * 0.3, c: 0 });
        }
        return puntos;
      }
    },
    circulo: {
      nombre: 'Círculo',
      crear: function (tirar) {
        var puntos = [];
        for (var i = 0; i < 45; i++) {
          var a = tirar() * 6.2832, r = tirar() * 0.32;
          puntos.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, c: 1 });
          a = tirar() * 6.2832; r = 0.62 + tirar() * 0.26;
          puntos.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, c: 0 });
        }
        return puntos;
      }
    },
    cruz: {
      nombre: 'Cuatro esquinas',
      crear: function (tirar) {
        var puntos = [];
        for (var i = 0; i < 90; i++) {
          var x = tirar() * 1.7 - 0.85, y = tirar() * 1.7 - 0.85;
          if (Math.abs(x) < 0.09 || Math.abs(y) < 0.09) continue;
          puntos.push({ x: x, y: y, c: (x > 0) === (y > 0) ? 1 : 0 });
        }
        return puntos;
      }
    },
    espiral: {
      nombre: 'Espiral',
      crear: function (tirar) {
        var puntos = [];
        for (var i = 0; i < 60; i++) {
          var t = i / 60, r = 0.1 + t * 0.78, a = t * 7.4;
          var ruido = function () { return (tirar() - 0.5) * 0.06; };
          puntos.push({ x: Math.cos(a) * r + ruido(), y: Math.sin(a) * r + ruido(), c: 1 });
          puntos.push({ x: -Math.cos(a) * r + ruido(), y: -Math.sin(a) * r + ruido(), c: 0 });
        }
        return puntos;
      }
    }
  };

  /* ---------- colores ----------------------------------------------------- */

  function colores() {
    var estilo = window.getComputedStyle(document.documentElement);
    function leer(nombre, porDefecto) { return estilo.getPropertyValue(nombre).trim() || porDefecto; }
    return {
      verde: leer('--fosforo', '#5dff9b'), ambar: leer('--ambar', '#ffb224'),
      fondo: leer('--negro', '#030806'), linea: leer('--linea-viva', '#2c6146'),
      hueso: leer('--hueso-2', '#a3c7b3')
    };
  }
  function aRGB(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ---------- montar ------------------------------------------------------ */

  function montar(contenedor) {
    var tirar = NAVE.azar(7);
    var juego = 'grupos';
    var puntos = JUEGOS[juego].crear(NAVE.azar(11));
    var neuronas = 4, capasOcultas = 2;
    var red = null, historia = [], vueltas = 0, entrenando = false, vivo = true;
    var pincel = 1, ritmo = 0.03;
    var paleta = colores();

    function forma() {
      var f = [2];
      for (var i = 0; i < capasOcultas; i++) f.push(neuronas);
      f.push(1);
      return f;
    }
    function olvidar() {
      red = crearRed(forma(), tirar);
      historia = []; vueltas = 0;
    }
    olvidar();

    // --- los lienzos ---
    var plano = el('canvas', { class: 'red__plano', width: 520, height: 520, role: 'img', 'aria-label': 'Plano con los puntos y lo que opina la red de cada zona' });
    var esquema = el('canvas', { class: 'red__esquema', width: 560, height: 230, role: 'img', 'aria-label': 'Esquema de la red: neuronas y conexiones' });
    var curva = el('canvas', { class: 'red__curva', width: 560, height: 90, role: 'img', 'aria-label': 'Curva del error a lo largo del entrenamiento' });
    var N = 56;                                     // resolución del mapa de opinión
    var mapa = document.createElement('canvas'); mapa.width = N; mapa.height = N;
    var mapaCtx = mapa.getContext('2d');
    var mapaDatos = mapaCtx.createImageData(N, N);

    // --- los mandos ---
    var lecturaVueltas = el('dd', null, '0');
    var lecturaError = el('dd', null, '—');
    var lecturaAcierto = el('dd', null, '—');
    var botonEntrenar = el('button', { class: 'boton boton--ambar', type: 'button', onclick: alternar }, 'Entrenar');

    function grupo(titulo, hijos) {
      return el('div', { class: 'mando' }, [el('span', { class: 'mando__titulo micro' }, titulo), el('div', { class: 'mando__fila' }, hijos)]);
    }
    function selector(opciones, actual, alElegir) {
      var botones = opciones.map(function (opcion) {
        return el('button', {
          class: 'boton boton--mini', type: 'button',
          'aria-pressed': String(opcion.valor === actual),
          onclick: function () {
            botones.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
            this.setAttribute('aria-pressed', 'true');
            NAVE.sonido.rele();
            alElegir(opcion.valor);
          }
        }, opcion.texto);
      });
      return botones;
    }

    var mandosJuego = selector(
      Object.keys(JUEGOS).map(function (k) { return { valor: k, texto: JUEGOS[k].nombre }; }), juego,
      function (valor) {
        juego = valor;
        puntos = JUEGOS[juego].crear(NAVE.azar(11));
        olvidar(); pintarTodo();
      });
    var mandosPincel = selector(
      [{ valor: 1, texto: '● Verde' }, { valor: 0, texto: '■ Ámbar' }], pincel,
      function (valor) { pincel = valor; });
    var mandosNeuronas = selector(
      [2, 4, 8].map(function (n) { return { valor: n, texto: String(n) }; }), neuronas,
      function (valor) { neuronas = valor; olvidar(); pintarTodo(); });
    var mandosCapas = selector(
      [1, 2].map(function (n) { return { valor: n, texto: String(n) }; }), capasOcultas,
      function (valor) { capasOcultas = valor; olvidar(); pintarTodo(); });

    var deslizador = el('input', {
      type: 'range', min: '1', max: '100', value: '30', 'aria-label': 'Tamaño del paso al aprender',
      oninput: function () { ritmo = this.value / 1000; }
    });

    var raiz = el('div', { class: 'demo red' }, [
      el('div', { class: 'red__izquierda' }, [
        plano,
        el('p', { class: 'demo__pie' }, 'Toca el plano para añadir puntos con el pincel elegido.')
      ]),
      el('div', { class: 'red__derecha' }, [
        grupo('Puntos', mandosJuego),
        el('div', { class: 'mando__par' }, [
          grupo('Pincel', mandosPincel.concat([
            el('button', { class: 'boton boton--mini', type: 'button', onclick: function () { puntos = []; olvidar(); pintarTodo(); } }, 'Vaciar')
          ])),
        ]),
        el('div', { class: 'mando__par' }, [
          grupo('Neuronas por capa', mandosNeuronas),
          grupo('Capas ocultas', mandosCapas)
        ]),
        grupo('Tamaño del paso', [deslizador]),
        el('div', { class: 'mando__fila mando__fila--acciones' }, [
          botonEntrenar,
          el('button', { class: 'boton', type: 'button', onclick: function () { parar(); entrenar(1); pintarTodo(); NAVE.sonido.paso(); } }, 'Un paso'),
          el('button', { class: 'boton', type: 'button', onclick: function () { parar(); olvidar(); pintarTodo(); NAVE.sonido.atras(); } }, 'Olvidar')
        ]),
        el('dl', { class: 'demo__lecturas' }, [
          el('dt', null, 'Vueltas'), lecturaVueltas,
          el('dt', null, 'Error'), lecturaError,
          el('dt', null, 'Acierto'), lecturaAcierto
        ]),
        esquema,
        curva
      ])
    ]);
    contenedor.appendChild(raiz);

    /* ---------- dibujar -------------------------------------------------- */

    function pintarPlano() {
      var ctx = plano.getContext('2d'), W = plano.width, H = plano.height;
      var verde = aRGB(paleta.verde), ambar = aRGB(paleta.ambar), fondo = aRGB(paleta.fondo);
      var d = mapaDatos.data;
      for (var fy = 0; fy < N; fy++) {
        for (var fx = 0; fx < N; fx++) {
          var x = (fx + 0.5) / N * 2 - 1, y = 1 - (fy + 0.5) / N * 2;
          var p = opinion(red, x, y);
          var tinte = p > 0.5 ? verde : ambar;
          var fuerza = Math.abs(p - 0.5) * 2 * 0.5;       // cuanto más segura, más color
          var k = (fy * N + fx) * 4;
          d[k] = fondo[0] + (tinte[0] - fondo[0]) * fuerza;
          d[k + 1] = fondo[1] + (tinte[1] - fondo[1]) * fuerza;
          d[k + 2] = fondo[2] + (tinte[2] - fondo[2]) * fuerza;
          d[k + 3] = 255;
        }
      }
      mapaCtx.putImageData(mapaDatos, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(mapa, 0, 0, W, H);

      // la retícula
      ctx.strokeStyle = paleta.linea; ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (var g = 1; g < 8; g++) {
        ctx.moveTo(g * W / 8, 0); ctx.lineTo(g * W / 8, H);
        ctx.moveTo(0, g * H / 8); ctx.lineTo(W, g * H / 8);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // los puntos: círculo verde, cuadrado ámbar (el color no es la única pista)
      puntos.forEach(function (punto) {
        var px = (punto.x + 1) / 2 * W, py = (1 - punto.y) / 2 * H;
        ctx.lineWidth = 2.5; ctx.strokeStyle = paleta.fondo;
        ctx.fillStyle = punto.c ? paleta.verde : paleta.ambar;
        ctx.beginPath();
        if (punto.c) ctx.arc(px, py, 7, 0, 6.2832); else ctx.rect(px - 6.500, py - 6.500, 13, 13);
        ctx.fill(); ctx.stroke();
      });
    }

    function pintarEsquema() {
      var ctx = esquema.getContext('2d'), W = esquema.width, H = esquema.height;
      ctx.clearRect(0, 0, W, H);
      var f = red.forma, margen = 46;
      function sitio(l, j) {
        var x = margen + l * (W - margen * 2) / (f.length - 1);
        var paso = Math.min(46, (H - 30) / f[l]);
        var y = H / 2 + (j - (f[l] - 1) / 2) * paso;
        return [x, y];
      }
      // conexiones: verde si el peso suma, ámbar si resta; gruesa si pesa mucho
      for (var l = 0; l < red.capas.length; l++) {
        var capa = red.capas[l];
        for (var j = 0; j < capa.w.length; j++) {
          for (var i = 0; i < capa.w[j].length; i++) {
            var w = capa.w[j][i], a = sitio(l, i), b = sitio(l + 1, j);
            ctx.strokeStyle = w >= 0 ? paleta.verde : paleta.ambar;
            ctx.globalAlpha = Math.min(0.95, 0.15 + Math.abs(w) * 0.35);
            ctx.lineWidth = Math.min(6, 0.6 + Math.abs(w) * 1.5);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      for (var ll = 0; ll < f.length; ll++) {
        for (var jj = 0; jj < f[ll]; jj++) {
          var s = sitio(ll, jj);
          ctx.fillStyle = paleta.fondo; ctx.strokeStyle = paleta.verde; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s[0], s[1], 9, 0, 6.2832); ctx.fill(); ctx.stroke();
        }
      }
      ctx.fillStyle = paleta.hueso; ctx.font = '15px ' + (window.getComputedStyle(esquema).fontFamily || 'monospace');
      ctx.textAlign = 'center';
      ctx.fillText('dónde', margen, H - 6);
      ctx.fillText('color', W - margen, H - 6);
    }

    function pintarCurva() {
      var ctx = curva.getContext('2d'), W = curva.width, H = curva.height;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = paleta.linea; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      ctx.fillStyle = paleta.hueso; ctx.font = '13px ' + (window.getComputedStyle(curva).fontFamily || 'monospace');
      ctx.textAlign = 'left';
      ctx.fillText('error', 8, 17);
      if (historia.length < 2) return;
      var maximo = Math.max(0.7, Math.max.apply(null, historia));
      ctx.strokeStyle = paleta.ambar; ctx.lineWidth = 2;
      ctx.beginPath();
      historia.forEach(function (e, i) {
        var x = i / (historia.length - 1) * (W - 8) + 4;
        var y = H - 5 - (e / maximo) * (H - 12);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    function pintarLecturas() {
      lecturaVueltas.textContent = String(vueltas);
      lecturaError.textContent = historia.length ? historia[historia.length - 1].toFixed(3) : '—';
      lecturaAcierto.textContent = puntos.length ? Math.round(acierto(red, puntos) * 100) + ' %' : '—';
    }

    function pintarTodo() {
      paleta = colores();
      pintarPlano(); pintarEsquema(); pintarCurva(); pintarLecturas();
    }

    /* ---------- entrenar ------------------------------------------------- */

    function entrenar(cuantas) {
      if (!puntos.length) return;
      var error = 0;
      for (var i = 0; i < cuantas; i++) { error = vuelta(red, puntos, ritmo); vueltas++; }
      historia.push(error);
      if (historia.length > 400) historia.shift();
    }

    function bucle() {
      if (!vivo || !entrenando) return;
      if (!raiz.isConnected) { desmontar(); return; }
      if (!document.hidden) { entrenar(4); pintarTodo(); }
      // cuando ya lo acierta todo y casi no se equivoca, se para sola
      if (historia.length && historia[historia.length - 1] < 0.012 && acierto(red, puntos) === 1) {
        parar(); NAVE.sonido.acierto(); return;
      }
      requestAnimationFrame(bucle);
    }
    function arrancar() {
      if (!puntos.length) { NAVE.avisar('Pon algún punto antes de entrenar.', 'ambar'); return; }
      entrenando = true;
      botonEntrenar.textContent = 'Pausa';
      botonEntrenar.setAttribute('aria-pressed', 'true');
      NAVE.sonido.ok();
      requestAnimationFrame(bucle);
    }
    function parar() {
      entrenando = false;
      botonEntrenar.textContent = 'Entrenar';
      botonEntrenar.setAttribute('aria-pressed', 'false');
    }
    function alternar() { if (entrenando) parar(); else arrancar(); }

    /* ---------- pintar puntos a mano ------------------------------------ */

    plano.addEventListener('pointerdown', function (evento) {
      var caja = plano.getBoundingClientRect();
      var x = (evento.clientX - caja.left) / caja.width * 2 - 1;
      var y = 1 - (evento.clientY - caja.top) / caja.height * 2;
      puntos.push({ x: x, y: y, c: pincel });
      NAVE.sonido.tecla();
      pintarTodo();
    });

    var alCambiarTema = function () { if (vivo) setTimeout(pintarTodo, 50); };
    NAVE.bus.oir('tema', alCambiarTema);

    function desmontar() {
      vivo = false; entrenando = false;
      if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
    }

    pintarTodo();
    return { desmontar: desmontar, parar: parar };
  }

  NAVE.demos.red = {
    titulo: 'Una red que aprende',
    icono: 'red',
    entrada: 'Nadie le dice a la red dónde está la frontera. Empieza opinando al azar, mira cuánto se equivoca y mueve un poco cada conexión para equivocarse menos. Eso, repetido cientos de veces, es aprender.',
    notas: [
      'El **fondo** es lo que la red opina de cada sitio del plano: verde, ámbar, o apagado si duda.',
      'Las **líneas** del esquema son los pesos. Gruesa: esa conexión pesa mucho. Verde suma, ámbar resta.',
      'Prueba la *espiral* con 2 neuronas y luego con 8: una red pequeña no puede aprender una forma difícil.'
    ],
    montar: montar
  };
})();
