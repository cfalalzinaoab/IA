/* ==========================================================================
   VISOR3D.JS · el visor principal, en tres dimensiones
   --------------------------------------------------------------------------
   Lo que se ve por el cristal del puente, dibujado con WebGL2 escrito a mano
   (sin bibliotecas; los sombreadores están en gl/sombreadores.js):

     · AL FONDO    un paisaje alámbrico que avanza hacia la nave, con sus
                   montes tapándose unos a otros, bruma en el horizonte,
                   auroras y estrellas. Es un guiño a los monitores de
                   aterrizaje de 1979.
     · EN MEDIO    la lluvia de código, ahora con hondura: cientos de
                   columnas repartidas hasta cincuenta metros, nítidas en el
                   plano de foco y borrosas delante y detrás.
     · DELANTE     el núcleo: una red neuronal holográfica de cinco capas que
                   gira dentro de su cascarón y sus anillos. La señal la
                   recorre de la entrada a la salida, una y otra vez.

   SE PUEDE TOCAR
     · mover el ratón     la cámara se asoma (paralaje)
     · arrastrar el núcleo  gira, y sigue girando con inercia
     · tocar el núcleo    dispara una ráfaga por la red
     · tocar el cristal   suelta una onda que enciende, a su paso, TODAS las
                          celdas de la lluvia: se ve la rejilla escondida
     · el conejo blanco   sigue cayendo de vez en cuando, y se sigue cazando

   CUIDA DE NO ESTORBAR
     · si la pestaña se esconde o el visor sale de la pantalla, deja de pintar
     · mide lo que tarda cada cuadro y baja o sube la resolución sola
     · con «reducir movimiento» pinta una imagen quieta
     · si el navegador no tiene WebGL2, o algo falla al arrancar, crear()
       devuelve null y quien lo llamó pone la lluvia plana de lluvia.js
     · si la tarjeta pierde el contexto, se reconstruye sola al recuperarlo

   NAVE.visor3d.crear(lienzo, opciones) devuelve los mismos mandos que la
   lluvia plana (seguir, parar, intensidad, tema, soltarConejo, destruir) y
   algunos más: nucleo(), vista(), desplazar(), onda(), salto(), info().
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  /* ---------- la escena, en números --------------------------------------- */

  var FOV = 50 * Math.PI / 180;          // campo de visión vertical
  var NUCLEO = [0, 1.3, 0];              // dónde flota el holograma
  var FONDO_Y = -3.4;                    // hasta dónde bajan las columnas
  var SUELO = -3.2;                      // el fondo del valle
  var PASO = 1.15;                       // lado de una casilla del terreno

  // Desde dónde se mira. vista(n) lleva la cámara de un punto a otro.
  var VISTAS = [
    { ojo: [0, 1.55, 9.2], mira: [0, 1.25, 0] },         // de frente
    { ojo: [-2.4, 0.35, 8.4], mira: [0.5, 1.0, 0] },     // a ras de suelo, mirando arriba
    { ojo: [2.0, 3.6, 9.9], mira: [0, 0.5, 0] },         // desde lo alto
    { ojo: [-0.6, 1.0, 6.4], mira: [0.2, 1.5, -8] },     // adentrándose en el valle
    { ojo: [3.2, 1.9, 8.0], mira: [-0.4, 1.1, 0] }       // de costado
  ];

  var CALIDADES = {
    alta:  { columnas: 440, filas: 56, polvo: 520, nx: 72, nz: 60, niveles: 6, dprMax: 2,   pixeles: 2600000, escala: 1 },
    media: { columnas: 290, filas: 50, polvo: 320, nx: 56, nz: 48, niveles: 5, dprMax: 1.5, pixeles: 1700000, escala: 0.85 },
    baja:  { columnas: 170, filas: 42, polvo: 170, nx: 44, nz: 36, niveles: 4, dprMax: 1,   pixeles: 900000,  escala: 0.7 }
  };

  function paletas() {
    var c = NAVE.m3d.color;
    return {
      puente: {
        cielo: c('#071f14'), bruma: c('#8a5a18', 0.6), suelo: c('#020705'), halo: c('#35ff8f', 0.3),
        cuerpo: c('#1fe07a'), cabeza: c('#e2fff0'),
        malla: c('#ff9d1a', 0.85), cresta: c('#ffd98a', 1.3),
        relleno: c('#030b07'), rellenoLuz: c('#5a3a10', 0.35),
        tinteA: c('#4dffa0'), tinteB: c('#ffb224'),
        escalares: [0.8, 1.45, 0.9, 1.0, 0.006]      // densidad, brillo de lluvia, resplandor, exposición, aberración
      },
      codigo: {
        cielo: c('#062e16'), bruma: c('#1f9a4a', 0.6), suelo: c('#020a04'), halo: c('#5dff9b', 0.4),
        cuerpo: c('#35ff86', 1.1), cabeza: c('#ffffff'),
        malla: c('#35e07a', 0.9), cresta: c('#c8ffe0', 1.3),
        relleno: c('#020c05'), rellenoLuz: c('#0f5a2a', 0.35),
        tinteA: c('#5dff9b'), tinteB: c('#c8ffd8'),
        escalares: [1.0, 1.8, 1.2, 1.05, 0.011]
      }
    };
  }

  function elegirCalidad(pedida) {
    if (CALIDADES[pedida]) return pedida;
    var nucleos = navigator.hardwareConcurrency || 4;
    var movil = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
    if (movil) return nucleos >= 8 ? 'media' : 'baja';
    return nucleos >= 8 ? 'alta' : nucleos >= 4 ? 'media' : 'baja';
  }

  /* ---------- geometría: icosfera ---------------------------------------- */

  // Un icosaedro con cada cara partida en cuatro: 42 vértices, 120 aristas.
  function icosfera() {
    var t = (1 + Math.sqrt(5)) / 2;
    var norm = NAVE.m3d.v3.normalizar;
    var v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
             [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    var caras = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
                 [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8],
                 [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var medios = {};
    function medio(a, b) {
      var clave = a < b ? a + '_' + b : b + '_' + a;
      if (medios[clave] === undefined) {
        v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]));
        medios[clave] = v.length - 1;
      }
      return medios[clave];
    }
    var aristas = {};
    function arista(a, b) { aristas[a < b ? a + '_' + b : b + '_' + a] = [a, b]; }
    caras.forEach(function (c) {
      var a = medio(c[0], c[1]), b = medio(c[1], c[2]), d = medio(c[2], c[0]);
      [[c[0], a, d], [c[1], b, a], [c[2], d, b], [a, b, d]].forEach(function (n) {
        arista(n[0], n[1]); arista(n[1], n[2]); arista(n[2], n[0]);
      });
    });
    return { vertices: v, aristas: Object.keys(aristas).map(function (k) { return aristas[k]; }) };
  }

  /* ======================================================================
     crear
     ====================================================================== */

  function crear(lienzo, opciones) {
    opciones = opciones || {};
    if (!NAVE.gl || !NAVE.glsl || !NAVE.posproceso || !NAVE.m3d || !NAVE.lluvia) return null;
    var G = NAVE.gl, m4 = NAVE.m3d.m4, acercar = NAVE.m3d.acercar;

    var gl = G.contexto(lienzo);
    if (!gl) return null;

    var nombreCalidad = elegirCalidad(opciones.calidad);
    var cal = CALIDADES[nombreCalidad];
    var adaptar = !CALIDADES[opciones.calidad];     // si la pidieron a mano, no se toca
    var conConejo = !!opciones.conejo;
    var PALETAS = paletas();

    /* ---------- estado ---------------------------------------------------- */

    var P = {};                 // programas
    var piezas = {};            // geometría ya subida a la tarjeta
    var pos = null;             // el posproceso
    var atlas = null;
    var columnas = [];          // lo que hay que saber de cada columna para el conejo

    var andando = false, visible = true, destruido = false, perdido = false;
    var cuadro = null, anterior = 0, cortesia = 0;
    var t = 20 + Math.random() * 40;     // el reloj de la escena (no empieza en 0: ya llueve)
    var ritmo = 1;

    var ancho = 0, alto = 0;             // del lienzo, en píxeles de verdad
    var anchoCss = 1, altoCss = 1;
    var escalaAuto = 1;
    var msMedio = 16, lentos = 0, sobrados = 0, fps = 60;

    var paleta = copiar(PALETAS[NAVE.modo.actual() === 'codigo' ? 'codigo' : 'puente']);
    var paletaObjetivo = PALETAS[NAVE.modo.actual() === 'codigo' ? 'codigo' : 'puente'];
    var blanco = 0, blancoObjetivo = NAVE.modo.actual() === 'sala-blanca' ? 1 : 0;
    var densidadMinima = 0;

    var base = { ojo: VISTAS[0].ojo.slice(), mira: VISTAS[0].mira.slice() };
    var vistaObjetivo = VISTAS[0];
    var puntero = { x: 0, y: 0, sx: 0, sy: 0 };
    var scroll = 0, scrollSuave = 0;
    var despl = { x: 0, y: 0 };          // descentrado de la lente
    var atenuar = 1, atenuarSuave = 1;   // 1 a plena luz; menos, la escena se retira
    var velo = { fuerza: 0, suave: 0, alcance: 0.62 };
    var escalaNucleo = 1, flota = NUCLEO[1];
    var rumbo = 0, cabeceo = 0;
    var agobiado = false;

    var nucleo = {
      visible: opciones.nucleo !== false, alfa: 0, giroY: 0.6, giroX: 0.18,
      velY: 0.22, arrastrando: false, ultimoX: 0, ultimoY: 0, movido: 0, puntero: null
    };
    var proyectado = { x: 0, y: 0, r: 0 };

    var onda = { x: 0, y: 0, t0: -100, fuerza: 0 };
    var rafaga = -100;
    var fallo = 0, proximoFallo = t + 10 + Math.random() * 14;
    var destello = 0;
    var salto = null;                    // { t0, dura, alAcabar, hecho }
    var conejo = { activo: false, id: -1, vel: 3.1, t0: 0, proximo: t + 24 + Math.random() * 30 };

    // matrices que se reutilizan cuadro a cuadro
    var mProy = m4.nueva(), mVista = m4.nueva(), mVP = m4.nueva();
    var mRed = m4.nueva(), mCascaron = m4.nueva(), mAnillo = m4.nueva(), mIdentidad = m4.identidad();
    var ojo = [0, 0, 0], mira = [0, 0, 0], derecha = [1, 0, 0], arriba = [0, 1, 0];
    var recorte = [0, 0, 0, 0];

    function copiar(p) {
      var c = {};
      Object.keys(p).forEach(function (k) { c[k] = p[k].slice(); });
      return c;
    }

    /* ---------- construir (y reconstruir si se pierde el contexto) ------- */

    function construir() {
      var S = NAVE.glsl;
      ['fondo', 'lluvia', 'relleno', 'malla', 'trazos', 'chispas'].forEach(function (n) {
        P[n] = G.programa(gl, n, S[n][0], S[n][1]);
      });
      pos = NAVE.posproceso.crear(gl, { hdr: G.puedeHdr(gl), niveles: cal.niveles });
      piezas.cuadrado = G.cuadrado(gl);
      piezas.vacio = gl.createVertexArray();
      construirAtlas();
      construirLluvia();
      construirTerreno();
      construirNucleo();
      construirPolvo();
      ancho = alto = 0;
      medir();
    }

    // El alfabeto de lluvia.js, en una rejilla de 12 × 6 casillas de 64 px.
    function construirAtlas() {
      var celda = 64, total = NAVE.lluvia.GLIFOS + 1;
      var tira = NAVE.lluvia.lamina(celda, '#ffffff');
      var rejilla = document.createElement('canvas');
      rejilla.width = celda * 12; rejilla.height = celda * 6;
      var ctx = rejilla.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, rejilla.width, rejilla.height);
      for (var g = 0; g < total; g++) {
        ctx.drawImage(tira, g * celda, 0, celda, celda, (g % 12) * celda, Math.floor(g / 12) * celda, celda, celda);
      }
      atlas = G.texturaDeLienzo(gl, rejilla);
    }

    // Las columnas se reparten por todo el volumen que alcanza a ver la
    // cámara: más anchas cuanto más lejos, y ninguna atravesando el núcleo.
    function construirLluvia() {
      var tirar = NAVE.azar(2037);
      var TAN = Math.tan(FOV / 2);
      var ojoZ = VISTAS[0].ojo[2], ojoY = VISTAS[0].ojo[1];
      var datos = new Float32Array(cal.columnas * 8);
      columnas = [];
      for (var i = 0; i < cal.columnas; i++) {
        var d, x, z, intentos = 0;
        do {
          d = 5.4 + Math.pow(tirar(), 0.85) * 50;
          z = ojoZ - d;
          x = tirar() < 0.4 ? (tirar() * 1.05 - 0.5) * d : (tirar() * 2.4 - 1.65) * d;
          intentos++;
        } while (intentos < 8 && Math.hypot(x - NUCLEO[0], z - NUCLEO[2]) < 3.1);
        var celda = 0.27 * (0.8 + d * 0.021);
        var arribaY = ojoY + d * TAN * 1.06 + tirar() * 1.2;
        var filas = Math.min(cal.filas, Math.ceil((arribaY - FONDO_Y) / celda));
        var col = { x: x, z: z, arriba: arribaY, celda: celda, vel: 5 + tirar() * 11, fase: tirar() * 200, id: i, filas: filas, d: d };
        columnas.push(col);
        datos.set([x, z, arribaY, celda, col.vel, col.fase, i, filas], i * 8);
      }
      var b = G.bufer(gl, datos);
      piezas.lluvia = {
        vao: G.vao(gl, [
          { bufer: piezas.cuadrado, ubicacion: 0, tamano: 2 },
          { bufer: b, ubicacion: 1, tamano: 4, salto: 8, desplazamiento: 0, divisor: cal.filas },
          { bufer: b, ubicacion: 2, tamano: 4, salto: 8, desplazamiento: 4, divisor: cal.filas }
        ]),
        instancias: cal.columnas * cal.filas
      };
    }

    function construirTerreno() {
      var nx = cal.nx, nz = cal.nz;
      // el relleno: una malla de triángulos
      var nudos = new Float32Array((nx + 1) * (nz + 1) * 2);
      var k = 0;
      for (var gz = 0; gz <= nz; gz++) for (var gx = 0; gx <= nx; gx++) { nudos[k++] = gx; nudos[k++] = gz; }
      var indices = new Uint16Array(nx * nz * 6);
      k = 0;
      for (gz = 0; gz < nz; gz++) {
        for (gx = 0; gx < nx; gx++) {
          var a = gz * (nx + 1) + gx, b = a + 1, c = a + nx + 1, d = c + 1;
          indices[k++] = a; indices[k++] = c; indices[k++] = b;
          indices[k++] = b; indices[k++] = c; indices[k++] = d;
        }
      }
      piezas.relleno = {
        vao: G.vao(gl, [{ bufer: G.bufer(gl, nudos), ubicacion: 0, tamano: 2 }],
          G.bufer(gl, indices, gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER)),
        indices: indices.length
      };
      // las líneas: un tramo por cada lado de casilla
      var tramos = [];
      for (gz = 0; gz <= nz; gz++) for (gx = 0; gx < nx; gx++) tramos.push(gx, gz, gx + 1, gz);
      for (gx = 0; gx <= nx; gx++) for (gz = 0; gz < nz; gz++) tramos.push(gx, gz, gx, gz + 1);
      piezas.malla = {
        vao: G.vao(gl, [
          { bufer: piezas.cuadrado, ubicacion: 0, tamano: 2 },
          { bufer: G.bufer(gl, new Float32Array(tramos)), ubicacion: 1, tamano: 4, divisor: 1 }
        ]),
        instancias: tramos.length / 4
      };
    }

    // Sube una lista de tramos o de chispas (16 números cada uno) y devuelve
    // su vao. Los dos comparten el reparto de atributos: 4 + 4 + 4 + 4.
    function subir16(lista) {
      var datos = new Float32Array(lista.length * 16);
      lista.forEach(function (fila, i) { datos.set(fila, i * 16); });
      var b = G.bufer(gl, datos);
      return {
        vao: G.vao(gl, [
          { bufer: piezas.cuadrado, ubicacion: 0, tamano: 2 },
          { bufer: b, ubicacion: 1, tamano: 4, salto: 16, desplazamiento: 0, divisor: 1 },
          { bufer: b, ubicacion: 2, tamano: 4, salto: 16, desplazamiento: 4, divisor: 1 },
          { bufer: b, ubicacion: 3, tamano: 4, salto: 16, desplazamiento: 8, divisor: 1 },
          { bufer: b, ubicacion: 4, tamano: 4, salto: 16, desplazamiento: 12, divisor: 1 }
        ]),
        instancias: lista.length
      };
    }

    // tramo(a, b, grosor, brillo, [verde, ámbar, blanco], capa, semilla, guiones, velocidad)
    function tramo(a, b, grosor, brillo, papeles, capa, semilla, guiones, vel) {
      return [a[0], a[1], a[2], grosor, b[0], b[1], b[2], brillo,
              papeles[0], papeles[1], papeles[2], capa === undefined ? -1 : capa,
              semilla || 0, guiones || 0, vel || 0, 0];
    }

    function construirNucleo() {
      var tirar = NAVE.azar(1979);
      var VERDE = [1, 0, 0], AMBAR = [0, 1, 0];

      /* --- la red: cinco capas de neuronas, cada una un anillo --- */
      var capasX = [-1.15, -0.58, 0, 0.58, 1.15];
      var cuantas = [5, 9, 12, 9, 4];
      var radios = [0.5, 0.78, 0.9, 0.78, 0.42];
      var capas = cuantas.map(function (n, L) {
        var nodos = [];
        for (var i = 0; i < n; i++) {
          var ang = i / n * Math.PI * 2 + L * 0.45;
          var r = radios[L] * (0.8 + tirar() * 0.32);
          nodos.push([capasX[L] + (tirar() - 0.5) * 0.14, Math.cos(ang) * r, Math.sin(ang) * r]);
        }
        return nodos;
      });

      var red = [], pulsos = [], nodos = [];
      capas.forEach(function (lista, L) {
        lista.forEach(function (p) {
          nodos.push([p[0], p[1], p[2], L === 2 ? 0.058 : 0.05, 0, 0, 0, 0,
                      0.6, 0, 0.45, 1.0, L, 0, 0, 0]);
          if (L === capas.length - 1) return;
          // cada neurona se conecta con las más cercanas de la capa siguiente
          var vecinas = capas[L + 1].slice().sort(function (u, w) {
            return Math.hypot(u[0] - p[0], u[1] - p[1], u[2] - p[2]) - Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
          }).slice(0, L === capas.length - 2 ? 4 : 3);
          vecinas.forEach(function (q) {
            var semilla = tirar();
            red.push(tramo(p, q, 1.5, 0.62, VERDE, L, semilla));
            pulsos.push([p[0], p[1], p[2], 0.036, q[0], q[1], q[2], 0,
                         0, 1, 0.4, 2.6, L, semilla, 0, 0]);
          });
        });
      });
      // cada capa lleva un aro fino que une a sus neuronas: así se lee que son capas
      capasX.forEach(function (x, L) {
        var r = radios[L] * 1.08;
        for (var s = 0; s < 40; s++) {
          var a0 = s / 40 * Math.PI * 2, a1 = (s + 1) / 40 * Math.PI * 2;
          red.push(tramo([x, Math.cos(a0) * r, Math.sin(a0) * r], [x, Math.cos(a1) * r, Math.sin(a1) * r], 1, 0.34, AMBAR));
        }
      });
      // lo que entra por la izquierda y lo que sale por la derecha: guiones que corren
      capas[0].forEach(function (p) {
        red.push(tramo([p[0] - 0.8, p[1] * 1.3, p[2] * 1.3], p, 0.9, 0.3, AMBAR, -1, 0, 5, 1.5));
      });
      capas[4].forEach(function (p) {
        red.push(tramo(p, [p[0] + 0.8, p[1] * 1.3, p[2] * 1.3], 0.9, 0.3, AMBAR, -1, 0, 5, 1.5));
      });

      /* --- el cascarón: una icosfera muy tenue --- */
      var ico = icosfera();
      var cascaron = ico.aristas.map(function (ar) {
        var a = ico.vertices[ar[0]], b = ico.vertices[ar[1]];
        return tramo([a[0] * 1.62, a[1] * 1.62, a[2] * 1.62], [b[0] * 1.62, b[1] * 1.62, b[2] * 1.62], 0.9, 0.075, VERDE);
      });

      /* --- los anillos, cada uno en su plano (se dibujan en xy y luego se inclinan) --- */
      function arco(radio, desde, hasta, n, grosor, brillo, papeles, guiones) {
        var lista = [];
        for (var i = 0; i < n; i++) {
          var a0 = desde + (hasta - desde) * i / n, a1 = desde + (hasta - desde) * (i + 1) / n;
          lista.push(tramo([Math.cos(a0) * radio, Math.sin(a0) * radio, 0], [Math.cos(a1) * radio, Math.sin(a1) * radio, 0],
            grosor, brillo, papeles, -1, 0, guiones || 0, 0));
        }
        return lista;
      }
      var DOS_PI = Math.PI * 2;
      // el ámbar, con sus marcas de limbo cada cinco grados
      var limbo = arco(1.95, 0, DOS_PI, 144, 1.5, 0.8, AMBAR);
      for (var g = 0; g < 72; g++) {
        var ang = g / 72 * DOS_PI, largo = g % 6 === 0 ? 0.13 : 0.06;
        limbo.push(tramo([Math.cos(ang) * 1.95, Math.sin(ang) * 1.95, 0],
          [Math.cos(ang) * (1.95 + largo), Math.sin(ang) * (1.95 + largo), 0], 1.2, g % 6 === 0 ? 0.9 : 0.5, AMBAR));
      }
      // el verde, a guiones
      var guiones = arco(2.14, 0, DOS_PI, 96, 1.2, 0.65, VERDE, 1);
      // y el de fuera: cuatro corchetes gruesos
      var corchetes = [];
      for (var q = 0; q < 4; q++) {
        corchetes = corchetes.concat(arco(2.34, q * Math.PI / 2 + 0.2, q * Math.PI / 2 + 1.05, 18, 2.4, 0.7, [0.6, 0, 0.3]));
      }

      piezas.red = subir16(red);
      piezas.cascaron = subir16(cascaron);
      piezas.anillos = [
        { pieza: subir16(limbo), inclinacion: 1.12, orientacion: 0.35, giro: 0.11 },
        { pieza: subir16(guiones), inclinacion: -0.52, orientacion: -0.9, giro: -0.19 },
        { pieza: subir16(corchetes), inclinacion: 1.46, orientacion: 0, giro: 0.33 }
      ];
      piezas.nodos = subir16(nodos);
      piezas.pulsos = subir16(pulsos);
      piezas.neuronas = nodos.length;
      piezas.conexiones = pulsos.length;
    }

    function construirPolvo() {
      var tirar = NAVE.azar(404);
      var lista = [];
      for (var i = 0; i < cal.polvo; i++) {
        var ambar = tirar() < 0.22;
        lista.push([
          (tirar() - 0.5) * 34, (tirar() - 0.5) * 14 + 2.5, (tirar() - 0.5) * 44 - 12, 0.012 + tirar() * 0.03,
          (tirar() - 0.5) * 0.12, (tirar() - 0.5) * 0.07, 0, 0,
          ambar ? 0 : 1, ambar ? 1 : 0, 0.15, 0.3 + tirar() * 0.7,
          0, tirar(), 1, 0
        ]);
      }
      piezas.polvo = subir16(lista);
    }

    /* ---------- tamaño ---------------------------------------------------- */

    function medir() {
      var caja = lienzo.getBoundingClientRect();
      var w = Math.max(1, caja.width), h = Math.max(1, caja.height);
      var dpr = Math.min(window.devicePixelRatio || 1, cal.dprMax);
      var bw = w * dpr, bh = h * dpr;
      if (bw * bh > cal.pixeles) { var f = Math.sqrt(cal.pixeles / (bw * bh)); bw *= f; bh *= f; }
      bw = Math.max(2, Math.round(bw)); bh = Math.max(2, Math.round(bh));
      anchoCss = w; altoCss = h;
      if (bw === ancho && bh === alto) return false;
      ancho = bw; alto = bh;
      lienzo.width = bw; lienzo.height = bh;
      redimensionarEscena();
      return true;
    }
    function redimensionarEscena() {
      var e = cal.escala * escalaAuto;
      pos.redimensionar(Math.max(2, Math.round(ancho * e)), Math.max(2, Math.round(alto * e)));
    }

    // Si los cuadros tardan, se dibuja la escena más pequeña (el lienzo no
    // cambia: se estira). Si van sobrados, se devuelve la resolución.
    function vigilarRitmo(ms) {
      msMedio += (ms - msMedio) * 0.06;
      fps = 1000 / Math.max(1, msMedio);
      if (!adaptar) return;
      if (msMedio > 27) { lentos++; sobrados = 0; } else if (msMedio < 18.5) { sobrados++; lentos = 0; } else { lentos = sobrados = 0; }
      if (lentos > 70 && escalaAuto > 0.5) {
        escalaAuto = Math.max(0.5, escalaAuto * 0.82); lentos = 0; msMedio = 20; redimensionarEscena();
      } else if (lentos > 110 && !agobiado) {
        // ya está al mínimo y sigue sin llegar: que quien lo usa aligere lo suyo
        agobiado = true;
        if (opciones.alAgobio) opciones.alAgobio();
      } else if (sobrados > 300 && escalaAuto < 1) {
        escalaAuto = Math.min(1, escalaAuto * 1.12); sobrados = 0; redimensionarEscena();
      }
    }

    /* ---------- un cuadro: mover ----------------------------------------- */

    function mover(dt) {
      var quieto = NAVE.calma;
      var avanza = quieto ? 0 : dt * ritmo;
      t += avanza;

      // la paleta se desliza hacia la del modo actual
      Object.keys(paletaObjetivo).forEach(function (k) {
        var de = paleta[k], a = paletaObjetivo[k];
        for (var i = 0; i < a.length; i++) de[i] = acercar(de[i], a[i], 2.6, dt);
      });
      blanco = acercar(blanco, blancoObjetivo, 3.5, dt);

      // la cámara: va hacia su vista, deriva un poco y se asoma con el ratón
      for (var i = 0; i < 3; i++) {
        base.ojo[i] = acercar(base.ojo[i], vistaObjetivo.ojo[i], 1.5, dt);
        base.mira[i] = acercar(base.mira[i], vistaObjetivo.mira[i], 1.5, dt);
      }
      puntero.sx = acercar(puntero.sx, puntero.x, 3, dt);
      puntero.sy = acercar(puntero.sy, puntero.y, 3, dt);
      scrollSuave = acercar(scrollSuave, scroll, 5, dt);
      ojo[0] = base.ojo[0] + Math.sin(t * 0.07) * 0.5 + puntero.sx * 0.95;
      ojo[1] = base.ojo[1] + Math.sin(t * 0.11 + 1) * 0.22 + puntero.sy * 0.45 + scrollSuave * 0.9;
      ojo[2] = base.ojo[2] + Math.cos(t * 0.05) * 0.3;
      mira[0] = base.mira[0] + puntero.sx * 0.25;
      mira[1] = base.mira[1] + puntero.sy * 0.12;
      atenuarSuave = acercar(atenuarSuave, atenuar * (1 - 0.4 * Math.min(1, scrollSuave)), 4, dt);
      velo.suave = acercar(velo.suave, velo.fuerza, 3, dt);
      mira[2] = base.mira[2];

      // el salto: la lente se abre, el tiempo corre y los glifos se hacen rayas
      var q = 0;
      if (salto) {
        q = Math.min(1, (performance.now() - salto.t0) / salto.dura);
        ritmo = 1 + q * q * 7;
        destello = Math.max(destello, Math.pow(Math.max(0, (q - 0.72) / 0.28), 2) * 2.2);
        if (q >= 1 && !salto.hecho) { salto.hecho = true; if (salto.alAcabar) salto.alAcabar(); }
      } else {
        ritmo = acercar(ritmo, 1, 3, dt);
        destello = acercar(destello, 0, 4, dt);
      }

      var aspecto = ancho / alto;
      // con el núcleo a la vista, el punto de fuga se corre para dejarle sitio al texto
      var hayNucleo = nucleo.visible && opciones.encuadre !== 'centro';
      var apaisado = aspecto > 1.25;
      var dxObjetivo = hayNucleo && apaisado ? (opciones.encuadreX === undefined ? 0.44 : opciones.encuadreX) : 0;
      var dyObjetivo = hayNucleo ? (apaisado ? 0.02 : 0.5) : 0.05;
      despl.x = acercar(despl.x, dxObjetivo, 2, dt);
      // al desplazar la página, la imagen entera sube: el visor se queda atrás
      despl.y = acercar(despl.y, dyObjetivo + scrollSuave * 0.75, 2 + scrollSuave * 6, dt);
      m4.perspectiva(FOV + q * q * 0.5, aspecto, 0.1, 150, despl.x, despl.y, mProy);
      m4.mirar(ojo, mira, [0, 1, 0], mVista);
      m4.multiplicar(mProy, mVista, mVP);
      derecha[0] = mVista[0]; derecha[1] = mVista[4]; derecha[2] = mVista[8];
      arriba[0] = mVista[1]; arriba[1] = mVista[5]; arriba[2] = mVista[9];

      // el núcleo: gira solo, o con la mano; aparece y desaparece creciendo
      nucleo.alfa = acercar(nucleo.alfa, nucleo.visible ? 1 : 0, 2.2, dt);
      if (!nucleo.arrastrando) {
        nucleo.velY = acercar(nucleo.velY, quieto ? 0 : 0.22, 1.1, dt);
        nucleo.giroX = acercar(nucleo.giroX, 0.18 + puntero.sy * 0.2, 1.4, dt);
        nucleo.giroY += nucleo.velY * dt;
      }
      // en pantallas de pie el núcleo encoge, para caber a lo ancho
      var e = (opciones.escalaNucleo || 1) * Math.min(1, aspecto * 1.3) *
              (0.35 + 0.65 * nucleo.alfa * nucleo.alfa * (3 - 2 * nucleo.alfa));
      escalaNucleo = e;
      flota = NUCLEO[1] + Math.sin(t * 0.6) * 0.06;
      m4.componer(NUCLEO[0], flota, NUCLEO[2], nucleo.giroY, nucleo.giroX, 0, e, mRed);
      m4.componer(NUCLEO[0], flota, NUCLEO[2], -nucleo.giroY * 0.4 + t * 0.05, nucleo.giroX * 0.5 + 0.3, t * 0.03, e, mCascaron);

      // dónde cae el núcleo en la pantalla (para el halo, el arrastre y la mira)
      m4.transformar(mVP, NUCLEO[0], flota, NUCLEO[2], recorte);
      var w = Math.max(0.001, recorte[3]);
      proyectado.nx = recorte[0] / w; proyectado.ny = recorte[1] / w;
      proyectado.x = (proyectado.nx * 0.5 + 0.5) * anchoCss;
      proyectado.y = (1 - (proyectado.ny * 0.5 + 0.5)) * altoCss;
      m4.transformar(mVP, NUCLEO[0] + derecha[0] * 2.34 * e, flota + derecha[1] * 2.34 * e, NUCLEO[2] + derecha[2] * 2.34 * e, recorte);
      proyectado.r = Math.abs(recorte[0] / Math.max(0.001, recorte[3]) - proyectado.nx) * 0.5 * anchoCss;

      // fallos de señal: uno pequeño de vez en cuando, y los que pida alguien
      fallo = acercar(fallo, 0, 6, dt);
      if (!quieto && t > proximoFallo) { fallo = Math.max(fallo, 0.35 + Math.random() * 0.5); proximoFallo = t + 9 + Math.random() * 18; }

      // el conejo
      if (conConejo && !quieto) {
        if (!conejo.activo && t > conejo.proximo) soltar();
        if (conejo.activo) {
          var col = columnas[conejo.id];
          if ((t - conejo.t0) * conejo.vel > col.filas + 2) { conejo.activo = false; conejo.proximo = t + 45 + Math.random() * 60; }
        }
      }

      rumbo = Math.atan2(mira[0] - ojo[0], -(mira[2] - ojo[2]));
      cabeceo = Math.atan2(mira[1] - ojo[1], Math.hypot(mira[0] - ojo[0], mira[2] - ojo[2]));
      if (opciones.alProyectar) {
        opciones.alProyectar({
          x: proyectado.x, y: proyectado.y, r: proyectado.r, alfa: nucleo.alfa,
          ola: (t * 0.33) % 1, fps: fps, neuronas: piezas.neuronas, conexiones: piezas.conexiones,
          rumbo: rumbo, cabeceo: cabeceo, altura: ojo[1] - SUELO, desplazado: scrollSuave
        });
      }
    }

    // Elige una columna a media distancia y que caiga dentro de la pantalla.
    function soltar() {
      var candidatas = [];
      for (var i = 0; i < columnas.length; i++) {
        var c = columnas[i];
        if (c.d < 8 || c.d > 17) continue;
        m4.transformar(mVP, c.x, 1.5, c.z, recorte);
        var nx = recorte[0] / recorte[3];
        if (recorte[3] > 0 && nx > -0.8 && nx < 0.8 && Math.abs(nx - proyectado.nx) > 0.22) candidatas.push(i);
      }
      if (!candidatas.length) { conejo.proximo = t + 10; return; }
      conejo.id = candidatas[Math.floor(Math.random() * candidatas.length)];
      conejo.t0 = t;
      conejo.activo = true;
    }

    // ¿Dónde está el conejo ahora mismo, en píxeles del lienzo?
    function conejoEnPantalla() {
      if (!conejo.activo) return null;
      var c = columnas[conejo.id];
      var fila = Math.floor((t - conejo.t0) * conejo.vel);
      if (fila < 0 || fila >= c.filas) return null;
      m4.transformar(mVP, c.x, c.arriba - fila * c.celda, c.z, recorte);
      if (recorte[3] <= 0) return null;
      var x = (recorte[0] / recorte[3] * 0.5 + 0.5) * anchoCss;
      var y = (1 - (recorte[1] / recorte[3] * 0.5 + 0.5)) * altoCss;
      m4.transformar(mVP, c.x, c.arriba - (fila + 1) * c.celda, c.z, recorte);
      var y2 = (1 - (recorte[1] / recorte[3] * 0.5 + 0.5)) * altoCss;
      return { x: x, y: y, celda: Math.abs(y2 - y) };
    }

    /* ---------- un cuadro: dibujar --------------------------------------- */

    function u3(programa, nombre, v) { gl.uniform3f(programa.u[nombre], v[0], v[1], v[2]); }

    function dibujar() {
      var e = pos.escena;
      var aspecto = ancho / alto;
      var escalaPx = Math.min(2.2, Math.max(0.75, e.alto / 820));
      var distNucleo = Math.hypot(ojo[0] - NUCLEO[0], ojo[1] - NUCLEO[1], ojo[2] - NUCLEO[2]);
      var es = paleta.escalares;
      var q = salto ? Math.min(1, (performance.now() - salto.t0) / salto.dura) : 0;

      gl.bindFramebuffer(gl.FRAMEBUFFER, e.fbo);
      gl.viewport(0, 0, e.ancho, e.alto);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      /* el fondo */
      var p = P.fondo;
      gl.useProgram(p.p);
      gl.bindVertexArray(piezas.vacio);
      gl.uniform2f(p.u.uResolucion, e.ancho, e.alto);
      gl.uniform1f(p.u.uAspecto, aspecto);
      gl.uniform1f(p.u.uTiempo, t);
      // el horizonte: adónde va a parar un punto lejano a la altura de los ojos
      var fx = mira[0] - ojo[0], fz = mira[2] - ojo[2], fl = Math.hypot(fx, fz) || 1;
      m4.transformar(mVP, ojo[0] + fx / fl * 4000, ojo[1], ojo[2] + fz / fl * 4000, recorte);
      gl.uniform1f(p.u.uHorizonte, recorte[1] / Math.max(0.001, recorte[3]));
      gl.uniform2f(p.u.uNucleo, proyectado.nx, proyectado.ny);
      gl.uniform1f(p.u.uNucleoBrillo, nucleo.alfa);
      gl.uniform2f(p.u.uAngulo, Math.atan2(fx, -fz), Math.atan2(mira[1] - ojo[1], fl));
      u3(p, 'uCielo', paleta.cielo); u3(p, 'uBruma', paleta.bruma);
      u3(p, 'uSuelo', paleta.suelo); u3(p, 'uHalo', paleta.halo);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* el terreno: primero el relleno, que escribe profundidad… */
      var avance = t * 0.9;
      function terreno(pr) {
        gl.uniform1f(pr.u.uAvance, avance);
        gl.uniform1f(pr.u.uPaso, PASO);
        gl.uniform1f(pr.u.uNX, cal.nx);
        gl.uniform1f(pr.u.uNZ, cal.nz);
        gl.uniform1f(pr.u.uSuelo, SUELO);
        gl.uniform1f(pr.u.uZ0, VISTAS[0].ojo[2] + 2.5);
        gl.uniform1f(pr.u.uAltura, 8.5);
        gl.uniform1f(pr.u.uValle, 3.2);
        gl.uniformMatrix4fv(pr.u.uVista, false, mVP);
        u3(pr, 'uOjo', ojo);
        gl.uniform2f(pr.u.uNiebla, 20, cal.nz * PASO * 0.92);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      if (opciones.terreno !== false) {
        p = P.relleno;
        gl.useProgram(p.p);
        terreno(p);
        u3(p, 'uRelleno', paleta.relleno); u3(p, 'uRellenoLuz', paleta.rellenoLuz); u3(p, 'uBruma', paleta.bruma);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.5, 2);
        gl.bindVertexArray(piezas.relleno.vao);
        gl.drawElements(gl.TRIANGLES, piezas.relleno.indices, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      /* …y desde aquí todo es luz que se suma */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.depthMask(false);

      if (opciones.terreno !== false) {
        p = P.malla;
        gl.useProgram(p.p);
        terreno(p);
        gl.uniform2f(p.u.uResolucion, e.ancho, e.alto);
        gl.uniform1f(p.u.uGrosor, 1.15 * escalaPx);
        u3(p, 'uColor', paleta.malla); u3(p, 'uColorCresta', paleta.cresta);
        // el barrido de radar: una franja que viene del fondo cada pocos segundos
        var largoTerreno = cal.nz * PASO;
        gl.uniform2f(p.u.uBarrido, VISTAS[0].ojo[2] - largoTerreno + ((t * 7) % (largoTerreno + 20)), 1.5);
        gl.bindVertexArray(piezas.malla.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.malla.instancias);
      }

      /* la lluvia */
      p = P.lluvia;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVista, false, mVP);
      u3(p, 'uOjo', ojo);
      gl.uniform1f(p.u.uTiempo, t);
      gl.uniform1f(p.u.uFilas, cal.filas);
      gl.uniform1f(p.u.uEstela, 22);
      gl.uniform1f(p.u.uDensidad, Math.max(es[0], densidadMinima));
      gl.uniform1f(p.u.uGlifos, NAVE.lluvia.GLIFOS);
      gl.uniform2f(p.u.uRejilla, 12, 6);
      gl.uniform4f(p.u.uConejo, conejo.id, conejo.vel, conejo.t0, conejo.activo ? 1 : 0);
      gl.uniform4f(p.u.uOnda, onda.x, onda.y, onda.t0, onda.fuerza);
      gl.uniform1f(p.u.uAspecto, aspecto);
      gl.uniform1f(p.u.uFoco, distNucleo + 4);
      gl.uniform1f(p.u.uDesenfoque, 0.055);
      gl.uniform2f(p.u.uNiebla, 26, 58);
      gl.uniform1f(p.u.uEstirar, q * q * 16);
      gl.uniform1f(p.u.uBrilloLluvia, es[1]);
      u3(p, 'uCuerpo', paleta.cuerpo); u3(p, 'uCabeza', paleta.cabeza);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(p.u.uAtlas, 0);
      gl.bindVertexArray(piezas.lluvia.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.lluvia.instancias);

      /* el núcleo: cascarón, anillos y red */
      if (nucleo.alfa > 0.01) {
        p = P.trazos;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVista, false, mVP);
        u3(p, 'uOjo', ojo);
        gl.uniform2f(p.u.uResolucion, e.ancho, e.alto);
        gl.uniform1f(p.u.uEscalaPx, escalaPx);
        gl.uniform1f(p.u.uTiempo, t);
        gl.uniform1f(p.u.uOla, 0.33);
        gl.uniform1f(p.u.uRafaga, rafaga);
        gl.uniform1f(p.u.uAlfa, nucleo.alfa);
        gl.uniform2f(p.u.uNiebla, 60, 90);
        u3(p, 'uTinteA', paleta.tinteA); u3(p, 'uTinteB', paleta.tinteB);

        gl.uniformMatrix4fv(p.u.uModelo, false, mCascaron);
        gl.bindVertexArray(piezas.cascaron.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.cascaron.instancias);

        var esc = escalaNucleo;
        piezas.anillos.forEach(function (anillo) {
          m4.componer(NUCLEO[0], flota, NUCLEO[2], anillo.orientacion + nucleo.giroY * 0.15,
            anillo.inclinacion + nucleo.giroX * 0.3, t * anillo.giro, esc, mAnillo);
          gl.uniformMatrix4fv(p.u.uModelo, false, mAnillo);
          gl.bindVertexArray(anillo.pieza.vao);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, anillo.pieza.instancias);
        });

        gl.uniformMatrix4fv(p.u.uModelo, false, mRed);
        gl.bindVertexArray(piezas.red.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.red.instancias);
      }

      /* las chispas: polvo, neuronas y pulsos */
      p = P.chispas;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVista, false, mVP);
      u3(p, 'uOjo', ojo); u3(p, 'uDerecha', derecha); u3(p, 'uArriba', arriba);
      gl.uniform1f(p.u.uTiempo, t);
      gl.uniform1f(p.u.uOla, 0.33);
      gl.uniform1f(p.u.uRafaga, rafaga);
      gl.uniform1f(p.u.uFoco, distNucleo);
      gl.uniform1f(p.u.uDesenfoque, 0.11);
      u3(p, 'uTinteA', paleta.tinteA); u3(p, 'uTinteB', paleta.tinteB);

      gl.uniform1i(p.u.uModo, 2);
      gl.uniformMatrix4fv(p.u.uModelo, false, mIdentidad);
      gl.uniform1f(p.u.uAlfa, 1);
      gl.uniform2f(p.u.uNiebla, 22, 44);
      gl.uniform3f(p.u.uCaja, 34, 14, 44);
      gl.uniform3f(p.u.uCentroCaja, 0, 2.5, -12);
      gl.uniform1f(p.u.uDeriva, avance * PASO);
      gl.bindVertexArray(piezas.polvo.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.polvo.instancias);

      if (nucleo.alfa > 0.01) {
        gl.uniformMatrix4fv(p.u.uModelo, false, mRed);
        gl.uniform1f(p.u.uAlfa, nucleo.alfa);
        gl.uniform2f(p.u.uNiebla, 60, 90);
        gl.uniform1i(p.u.uModo, 0);
        gl.bindVertexArray(piezas.nodos.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.nodos.instancias);
        gl.uniform1i(p.u.uModo, 1);
        gl.bindVertexArray(piezas.pulsos.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, piezas.pulsos.instancias);
      }

      /* y la óptica */
      pos.aplicar({
        ancho: ancho, alto: alto, tiempo: t,
        umbral: pos.hdr ? 0.85 : 0.55, rodilla: pos.hdr ? 0.5 : 0.3,
        intensidad: es[2] * (1 + q * 1.5) * (1 - blanco * 0.8),
        exposicion: es[3] * atenuarSuave,
        aberracion: es[4] + q * 0.05,
        grano: NAVE.calma ? 0.02 : 0.05,
        vineta: opciones.vineta === undefined ? 0.55 : opciones.vineta,
        curvatura: opciones.curvatura === undefined ? 0.035 : opciones.curvatura,
        fallo: fallo,
        destello: destello,
        blanco: blanco,
        velo: [velo.suave, velo.alcance],
        tinte: [1, 1, 1]
      });
    }

    /* ---------- el bucle -------------------------------------------------- */

    function bucle(ahora) {
      cuadro = null;
      if (destruido || perdido) return;
      if (!visible || (!andando && cortesia <= 0)) { anterior = 0; return; }
      if (!anterior) anterior = ahora - 16;
      var ms = ahora - anterior;
      anterior = ahora;
      var dt = Math.min(0.1, ms / 1000);
      if (cortesia > 0) cortesia--;
      // con la página desplazada (los paneles tapan casi todo) basta la mitad de cuadros
      var aMedias = scrollSuave > 0.55 && !salto;
      if (aMedias && (bucle.cuenta & 1)) {
        bucle.cuenta++; anterior = ahora - ms;
        cuadro = requestAnimationFrame(bucle);
        return;
      }
      mover(dt);
      dibujar();
      if (andando) vigilarRitmo(aMedias ? ms / 2 : ms);
      if (++bucle.cuenta % 30 === 0) medir();
      cuadro = requestAnimationFrame(bucle);
    }
    bucle.cuenta = 0;

    function despertar(cuadros) {
      if (cuadros) cortesia = Math.max(cortesia, cuadros);
      if (!cuadro && !destruido && !perdido && visible && (andando || cortesia > 0)) {
        cuadro = requestAnimationFrame(bucle);
      }
    }

    /* ---------- tocar ------------------------------------------------------ */

    function enLienzo(evento) {
      var caja = lienzo.getBoundingClientRect();
      return {
        x: evento.clientX - caja.left, y: evento.clientY - caja.top,
        nx: (evento.clientX - caja.left) / caja.width * 2 - 1,
        ny: -((evento.clientY - caja.top) / caja.height * 2 - 1),
        dentro: evento.clientX >= caja.left && evento.clientX <= caja.right && evento.clientY >= caja.top && evento.clientY <= caja.bottom
      };
    }

    function soltarOnda(nx, ny, fuerza) {
      onda.x = nx; onda.y = ny; onda.t0 = t; onda.fuerza = fuerza === undefined ? 1 : fuerza;
      fallo = Math.max(fallo, 0.45);
      despertar(120);
    }
    function soltarRafaga() {
      rafaga = t;
      fallo = Math.max(fallo, 0.3);
      despertar(140);
    }

    function alPulsar(evento) {
      if (evento.button !== undefined && evento.button !== 0) return;
      var en = enLienzo(evento);
      // primero, el conejo
      var c = conejoEnPantalla();
      if (c && Math.abs(en.x - c.x) < Math.max(30, c.celda * 1.8) && Math.abs(en.y - c.y) < Math.max(34, c.celda * 2.4)) {
        conejo.activo = false;
        conejo.proximo = t + 90;
        soltarOnda(en.nx, en.ny, 1.6);
        NAVE.bus.emitir('conejo-cazado');
        return;
      }
      // después, el núcleo: se puede agarrar
      if (nucleo.alfa > 0.5 && Math.hypot(en.x - proyectado.x, en.y - proyectado.y) < proyectado.r * 1.05) {
        nucleo.arrastrando = true;
        nucleo.puntero = evento.pointerId;
        nucleo.ultimoX = evento.clientX; nucleo.ultimoY = evento.clientY; nucleo.movido = 0;
        try { lienzo.setPointerCapture(evento.pointerId); } catch (e) {}
        lienzo.classList.add('agarrando');
        despertar(60);
        return;
      }
      // y si no, el cristal
      soltarOnda(en.nx, en.ny, 1);
      if (NAVE.sonido) NAVE.sonido.onda();
    }

    function alMover(evento) {
      if (nucleo.arrastrando && evento.pointerId === nucleo.puntero) {
        var dx = evento.clientX - nucleo.ultimoX, dy = evento.clientY - nucleo.ultimoY;
        nucleo.ultimoX = evento.clientX; nucleo.ultimoY = evento.clientY;
        nucleo.movido += Math.abs(dx) + Math.abs(dy);
        nucleo.giroY += dx * 0.009;
        nucleo.giroX = NAVE.limitar(nucleo.giroX + dy * 0.007, -1.1, 1.1);
        nucleo.velY = NAVE.limitar(nucleo.velY * 0.6 + dx * 0.009 * 60 * 0.4, -7, 7);
        despertar(60);
      }
    }

    function alSoltar(evento) {
      if (!nucleo.arrastrando || evento.pointerId !== nucleo.puntero) return;
      nucleo.arrastrando = false;
      lienzo.classList.remove('agarrando');
      try { lienzo.releasePointerCapture(evento.pointerId); } catch (e) {}
      if (nucleo.movido < 6) {              // no lo ha arrastrado: lo ha tocado
        soltarRafaga();
        if (NAVE.sonido) NAVE.sonido.ok();
      }
    }

    // El paralaje sigue al ratón por toda la página, no solo sobre el visor.
    function alMoverVentana(evento) {
      if (evento.pointerType && evento.pointerType !== 'mouse') return;
      var en = enLienzo(evento);
      puntero.x = NAVE.limitar(en.nx, -1.4, 1.4);
      puntero.y = NAVE.limitar(en.ny, -1.4, 1.4);
      // la manita, solo encima del núcleo
      if (en.dentro && !nucleo.arrastrando) {
        var encima = nucleo.alfa > 0.5 && Math.hypot(en.x - proyectado.x, en.y - proyectado.y) < proyectado.r * 1.05;
        lienzo.classList.toggle('sobre-nucleo', encima);
      }
      if (NAVE.calma) despertar(20);
    }

    lienzo.addEventListener('pointerdown', alPulsar);
    lienzo.addEventListener('pointermove', alMover);
    lienzo.addEventListener('pointerup', alSoltar);
    lienzo.addEventListener('pointercancel', alSoltar);
    window.addEventListener('pointermove', alMoverVentana, { passive: true });

    /* ---------- vigilar: tamaño, pantalla, pestaña, contexto -------------- */

    function alCambiarTamano() { if (!perdido && medir()) despertar(4); }
    var vigiaTamano = null, vigiaPantalla = null;
    if (window.ResizeObserver) { vigiaTamano = new ResizeObserver(alCambiarTamano); vigiaTamano.observe(lienzo); }
    window.addEventListener('resize', alCambiarTamano);
    if (window.IntersectionObserver) {
      vigiaPantalla = new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting && !document.hidden;
        despertar();
      });
      vigiaPantalla.observe(lienzo);
    }
    function alCambiarPestana() {
      visible = !document.hidden;
      despertar();
    }
    document.addEventListener('visibilitychange', alCambiarPestana);

    lienzo.addEventListener('webglcontextlost', function (evento) {
      evento.preventDefault();
      perdido = true;
      if (cuadro) { cancelAnimationFrame(cuadro); cuadro = null; }
    });
    lienzo.addEventListener('webglcontextrestored', function () {
      try { construir(); perdido = false; anterior = 0; despertar(4); }
      catch (e) { if (window.console) console.warn('El visor 3D no ha podido reconstruirse:', e); }
    });

    function alCambiarTema(nombre) {
      if (destruido) return;
      if (nombre === 'sala-blanca') { blancoObjetivo = 1; }
      else { blancoObjetivo = 0; paletaObjetivo = PALETAS[nombre === 'codigo' ? 'codigo' : 'puente']; }
      fallo = Math.max(fallo, 0.8);
      despertar(120);
    }
    NAVE.bus.oir('tema', alCambiarTema);

    /* ---------- arrancar --------------------------------------------------- */

    try {
      construir();
    } catch (e) {
      if (window.console) console.warn('El visor 3D no arranca; se usará la lluvia plana.\n' + e.message);
      destruido = true;
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      return null;
    }

    /* ---------- los mandos -------------------------------------------------- */

    var mandos = {
      tresD: true,
      seguir: function () {
        if (NAVE.calma) { andando = false; despertar(3); return; }    // una imagen quieta
        andando = true; despertar();
      },
      parar: function () { andando = false; },
      get andando() { return andando; },
      intensidad: function (valor) { densidadMinima = valor; },
      tema: alCambiarTema,
      soltarConejo: function () { conejo.proximo = 0; },
      // enseñar u ocultar el holograma (crece al aparecer)
      nucleo: function (si) { nucleo.visible = !!si; despertar(150); },
      // llevar la cámara a otra vista; sin número, a la siguiente
      vista: function (n) {
        var i = n === undefined ? (VISTAS.indexOf(vistaObjetivo) + 1) % VISTAS.length : ((n % VISTAS.length) + VISTAS.length) % VISTAS.length;
        vistaObjetivo = VISTAS[i];
        despertar(200);
        return i;
      },
      // cuánto se ha desplazado la página (0 arriba, 1 una pantalla entera)
      desplazar: function (valor) { scroll = NAVE.limitar(valor, 0, 1.2); if (NAVE.calma || !andando) despertar(30); },
      // bajar la luz de la escena (1 plena, 0 a oscuras): para que no compita con lo de delante
      atenuar: function (valor) { atenuar = NAVE.limitar(valor, 0, 1.5); despertar(60); },
      // oscurecer la parte izquierda de la imagen, donde va el texto de la portada
      velo: function (fuerza, alcance) {
        velo.fuerza = NAVE.limitar(fuerza || 0, 0, 1);
        if (alcance) velo.alcance = alcance;
        despertar(60);
      },
      // pintar unos cuadros aunque esté parado (una imagen quieta de fondo)
      fotograma: function (cuadros) { despertar(cuadros || 3); },
      onda: function (nx, ny, fuerza) { soltarOnda(nx === undefined ? proyectado.nx : nx, ny === undefined ? proyectado.ny : ny, fuerza); },
      rafaga: soltarRafaga,
      fallo: function (valor) { fallo = Math.max(fallo, valor === undefined ? 1 : valor); despertar(60); },
      // el salto: medio segundo largo de rayas y un fogonazo; luego llama a alAcabar
      salto: function (alAcabar, dura) {
        if (NAVE.calma || !visible || !andando) { if (alAcabar) alAcabar(); return false; }
        salto = { t0: performance.now(), dura: dura || 750, alAcabar: alAcabar, hecho: false };
        return true;
      },
      get enPantalla() { return visible; },
      info: function () {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          calidad: nombreCalidad + (adaptar ? ' (automática)' : ''),
          tarjeta: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocida',
          lienzo: ancho + ' × ' + alto,
          escena: pos.escena.ancho + ' × ' + pos.escena.alto + (pos.hdr ? ' HDR' : ''),
          fps: Math.round(fps),
          columnas: cal.columnas, glifos: piezas.lluvia.instancias,
          neuronas: piezas.neuronas, conexiones: piezas.conexiones
        };
      },
      destruir: function () {
        destruido = true; andando = false;
        if (cuadro) cancelAnimationFrame(cuadro);
        if (vigiaTamano) vigiaTamano.disconnect();
        if (vigiaPantalla) vigiaPantalla.disconnect();
        window.removeEventListener('resize', alCambiarTamano);
        window.removeEventListener('pointermove', alMoverVentana);
        document.removeEventListener('visibilitychange', alCambiarPestana);
        lienzo.removeEventListener('pointerdown', alPulsar);
        lienzo.removeEventListener('pointermove', alMover);
        lienzo.removeEventListener('pointerup', alSoltar);
        lienzo.removeEventListener('pointercancel', alSoltar);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
    return mandos;
  }

  NAVE.visor3d = {
    crear: crear,
    calidades: Object.keys(CALIDADES),
    // ¿Puede este navegador con el visor? (sin crear nada en la página)
    disponible: function () {
      try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
    }
  };
})();
