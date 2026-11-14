/* ==========================================================================
   GL/MATEMATICA.JS · vectores y matrices para el visor 3D
   --------------------------------------------------------------------------
   Lo mínimo para mover una cámara y unos objetos en tres dimensiones, sin
   bibliotecas. Las matrices son de 4 × 4 y se guardan como las espera WebGL:
   en un Float32Array de 16, POR COLUMNAS (el elemento de la fila f y la
   columna c está en m[c * 4 + f]).

   Convenio de la escena: x a la derecha, y hacia arriba, z hacia quien mira.
   La cámara mira hacia −z.

   Todas las funciones aceptan un último argumento `salida` para escribir el
   resultado en una matriz ya creada: el visor las llama sesenta veces por
   segundo y así no fabrica basura que luego haya que recoger.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  function nueva() { return new Float32Array(16); }

  var m4 = {
    nueva: nueva,

    identidad: function (salida) {
      var m = salida || nueva();
      m.fill(0);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },

    // Proyección en perspectiva. `desplX` y `desplY` corren el punto de fuga
    // por la pantalla (en unidades de −1 a 1): es el «descentrado» de las
    // cámaras de banco óptico. Con él, el núcleo puede quedar a la derecha
    // del encuadre sin torcer la cámara, y el horizonte sigue recto.
    perspectiva: function (fovY, aspecto, cerca, lejos, desplX, desplY, salida) {
      var m = salida || nueva();
      var f = 1 / Math.tan(fovY / 2);
      var nf = 1 / (cerca - lejos);
      m.fill(0);
      m[0] = f / aspecto;
      m[5] = f;
      m[8] = -(desplX || 0);
      m[9] = -(desplY || 0);
      m[10] = (lejos + cerca) * nf;
      m[11] = -1;
      m[14] = 2 * lejos * cerca * nf;
      return m;
    },

    // La matriz de vista: la cámara está en `ojo` y mira a `punto`.
    mirar: function (ojo, punto, arriba, salida) {
      var m = salida || nueva();
      var zx = ojo[0] - punto[0], zy = ojo[1] - punto[1], zz = ojo[2] - punto[2];
      var lz = Math.hypot(zx, zy, zz) || 1;
      zx /= lz; zy /= lz; zz /= lz;
      var xx = arriba[1] * zz - arriba[2] * zy;
      var xy = arriba[2] * zx - arriba[0] * zz;
      var xz = arriba[0] * zy - arriba[1] * zx;
      var lx = Math.hypot(xx, xy, xz) || 1;
      xx /= lx; xy /= lx; xz /= lx;
      var yx = zy * xz - zz * xy;
      var yy = zz * xx - zx * xz;
      var yz = zx * xy - zy * xx;
      m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
      m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
      m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
      m[12] = -(xx * ojo[0] + xy * ojo[1] + xz * ojo[2]);
      m[13] = -(yx * ojo[0] + yy * ojo[1] + yz * ojo[2]);
      m[14] = -(zx * ojo[0] + zy * ojo[1] + zz * ojo[2]);
      m[15] = 1;
      return m;
    },

    // salida = a · b (primero se aplica b, luego a)
    multiplicar: function (a, b, salida) {
      var m = salida || nueva();
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (var c = 0; c < 4; c++) {
        var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        m[c * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        m[c * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        m[c * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        m[c * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
      }
      return m;
    },

    trasladar: function (x, y, z, salida) {
      var m = m4.identidad(salida);
      m[12] = x; m[13] = y; m[14] = z;
      return m;
    },

    escalar: function (s, salida) {
      var m = m4.identidad(salida);
      m[0] = m[5] = m[10] = s;
      return m;
    },

    rotarX: function (angulo, salida) {
      var m = m4.identidad(salida), c = Math.cos(angulo), s = Math.sin(angulo);
      m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
      return m;
    },
    rotarY: function (angulo, salida) {
      var m = m4.identidad(salida), c = Math.cos(angulo), s = Math.sin(angulo);
      m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
      return m;
    },
    rotarZ: function (angulo, salida) {
      var m = m4.identidad(salida), c = Math.cos(angulo), s = Math.sin(angulo);
      m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
      return m;
    },

    // Traslación · giro en y · giro en x · giro en z · escala, en una sola
    // matriz: lo que necesita cada pieza del núcleo para colocarse.
    componer: function (x, y, z, giroY, giroX, giroZ, escala, salida) {
      var cy = Math.cos(giroY), sy = Math.sin(giroY);
      var cx = Math.cos(giroX), sx = Math.sin(giroX);
      var cz = Math.cos(giroZ), sz = Math.sin(giroZ);
      var m = salida || nueva();
      // R = Ry · Rx · Rz
      var r00 = cy * cz + sy * sx * sz, r01 = cx * sz, r02 = -sy * cz + cy * sx * sz;
      var r10 = -cy * sz + sy * sx * cz, r11 = cx * cz, r12 = sy * sz + cy * sx * cz;
      var r20 = sy * cx, r21 = -sx, r22 = cy * cx;
      var e = escala === undefined ? 1 : escala;
      m[0] = r00 * e; m[1] = r01 * e; m[2] = r02 * e; m[3] = 0;
      m[4] = r10 * e; m[5] = r11 * e; m[6] = r12 * e; m[7] = 0;
      m[8] = r20 * e; m[9] = r21 * e; m[10] = r22 * e; m[11] = 0;
      m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
      return m;
    },

    // m · (x, y, z, 1) → [x, y, z, w] en coordenadas de recorte
    transformar: function (m, x, y, z, salida) {
      var v = salida || [0, 0, 0, 0];
      v[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
      v[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      v[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      v[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
      return v;
    }
  };

  var v3 = {
    restar: function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    sumar: function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    escalar: function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; },
    punto: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cruz: function (a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    },
    largo: function (a) { return Math.hypot(a[0], a[1], a[2]); },
    normalizar: function (a) {
      var l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    mezclar: function (a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
  };

  // Acercarse a un objetivo con un muelle amortiguado, independiente de los
  // cuadros por segundo: a 30 o a 144 fps la cámara se mueve igual.
  // `rapidez` ≈ cuántas veces por segundo recorre el 63 % de lo que falta.
  function acercar(actual, objetivo, rapidez, dt) {
    return objetivo + (actual - objetivo) * Math.exp(-rapidez * dt);
  }

  // De '#5dff9b' a [r, g, b] entre 0 y 1, en espacio lineal (la luz se suma
  // bien en lineal; el sRGB de la pantalla se lo devuelve el tono final).
  function color(hex, intensidad) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var k = intensidad === undefined ? 1 : intensidad;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) {
      var s = c / 255;
      var lineal = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      return lineal * k;
    });
  }

  NAVE.m3d = { m4: m4, v3: v3, acercar: acercar, color: color };
})();
