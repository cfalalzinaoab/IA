/* ==========================================================================
   GL/GL.JS · las herramientas de WebGL2 que usa el visor
   --------------------------------------------------------------------------
   WebGL a pelo es muy hablador: para dibujar un triángulo hay que crear,
   enlazar, rellenar y describir media docena de cosas. Aquí se esconde esa
   ceremonia detrás de unas pocas funciones con nombre de lo que hacen:

     NAVE.gl.contexto(lienzo)          pedir WebGL2, o null si no lo hay
     NAVE.gl.programa(gl, nombre, vs, fs)
                                       compilar y enlazar dos sombreadores;
                                       si fallan, el error dice cuál y en qué
                                       línea, con el código alrededor
     NAVE.gl.vao(gl, atributos, indices)
                                       describir de dónde sale cada atributo
     NAVE.gl.marco(gl, ancho, alto, opciones)
                                       una «diana» donde dibujar fuera de la
                                       pantalla (para el posproceso)

   Los atributos de los sombreadores llevan su número escrito en el propio
   GLSL (layout(location = N)), así que aquí no hay que preguntarlo.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  function contexto(lienzo) {
    var opciones = {
      alpha: false,                 // el visor es opaco: más barato de componer
      antialias: false,             // los trazos ya se suavizan solos
      depth: false,                 // la profundidad vive en el marco de la escena
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    };
    try { return lienzo.getContext('webgl2', opciones); } catch (e) { return null; }
  }

  // Con el número de línea del error, enseña esa línea y sus vecinas.
  function explicar(fuente, registro) {
    var lineas = fuente.split('\n');
    var hallado = /ERROR:\s*\d+:(\d+)/.exec(registro || '');
    if (!hallado) return registro;
    var n = parseInt(hallado[1], 10);
    var desde = Math.max(0, n - 3), hasta = Math.min(lineas.length, n + 2);
    var trozo = [];
    for (var i = desde; i < hasta; i++) trozo.push((i + 1 === n ? '>> ' : '   ') + (i + 1) + ': ' + lineas[i]);
    return registro + '\n' + trozo.join('\n');
  }

  function compilar(gl, tipo, fuente, nombre) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      var registro = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Sombreador «' + nombre + '» (' + (tipo === gl.VERTEX_SHADER ? 'vértices' : 'fragmentos') + '):\n' + explicar(fuente, registro));
    }
    return s;
  }

  // Devuelve { p: el programa, u: { nombreDelUniforme: ubicación } }
  function programa(gl, nombre, fuenteV, fuenteF) {
    var v = compilar(gl, gl.VERTEX_SHADER, fuenteV, nombre);
    var f = compilar(gl, gl.FRAGMENT_SHADER, fuenteF, nombre);
    var p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error('Programa «' + nombre + '» no enlaza: ' + gl.getProgramInfoLog(p));
    }
    var u = {};
    var cuantos = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
    for (var i = 0; i < cuantos; i++) {
      var info = gl.getActiveUniform(p, i);
      u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
    }
    return { p: p, u: u, nombre: nombre };
  }

  function bufer(gl, datos, uso, tipo) {
    var b = gl.createBuffer();
    var destino = tipo || gl.ARRAY_BUFFER;
    gl.bindBuffer(destino, b);
    gl.bufferData(destino, datos, uso || gl.STATIC_DRAW);
    return b;
  }

  // atributos: [{ bufer, ubicacion, tamano, salto, desplazamiento, divisor, entero }]
  // `salto` y `desplazamiento` van en NÚMEROS (de 4 bytes), no en bytes.
  function vao(gl, atributos, indices) {
    var v = gl.createVertexArray();
    gl.bindVertexArray(v);
    atributos.forEach(function (a) {
      gl.bindBuffer(gl.ARRAY_BUFFER, a.bufer);
      gl.enableVertexAttribArray(a.ubicacion);
      if (a.entero) {
        gl.vertexAttribIPointer(a.ubicacion, a.tamano, gl.INT, (a.salto || 0) * 4, (a.desplazamiento || 0) * 4);
      } else {
        gl.vertexAttribPointer(a.ubicacion, a.tamano, gl.FLOAT, false, (a.salto || 0) * 4, (a.desplazamiento || 0) * 4);
      }
      if (a.divisor) gl.vertexAttribDivisor(a.ubicacion, a.divisor);
    });
    if (indices) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bindVertexArray(null);
    return v;
  }

  // Una textura desde un lienzo 2D (el atlas de glifos), con sus mipmaps:
  // los glifos lejanos o desenfocados leen de los niveles pequeños.
  function texturaDeLienzo(gl, lienzo) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lienzo);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  // ¿Se puede dibujar en coma flotante? Si sí, la escena guarda luces por
  // encima de 1 (HDR) y el resplandor sale mucho más limpio.
  function puedeHdr(gl) {
    return !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  }

  // Un marco de dibujo fuera de pantalla: { fbo, tex, prof, ancho, alto }.
  // opciones.hdr: color en coma flotante de 16 bits.
  // opciones.profundidad: con búfer de profundidad (la escena lo necesita;
  // el posproceso, no).
  function marco(gl, ancho, alto, opciones) {
    opciones = opciones || {};
    var m = { fbo: gl.createFramebuffer(), tex: gl.createTexture(), prof: null, ancho: 0, alto: 0, opciones: opciones };
    redimensionar(gl, m, ancho, alto);
    return m;
  }

  function redimensionar(gl, m, ancho, alto) {
    ancho = Math.max(1, Math.round(ancho));
    alto = Math.max(1, Math.round(alto));
    if (m.ancho === ancho && m.alto === alto) return m;
    m.ancho = ancho; m.alto = alto;
    gl.bindTexture(gl.TEXTURE_2D, m.tex);
    if (m.opciones.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, ancho, alto, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ancho, alto, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, m.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, m.tex, 0);
    if (m.opciones.profundidad) {
      if (!m.prof) m.prof = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, m.prof);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, ancho, alto);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, m.prof);
    }
    var estado = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (estado !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
      throw new Error('El marco de ' + ancho + ' × ' + alto + ' no está completo (0x' + estado.toString(16) + ').');
    }
    return m;
  }

  function borrarMarco(gl, m) {
    if (!m) return;
    gl.deleteFramebuffer(m.fbo);
    gl.deleteTexture(m.tex);
    if (m.prof) gl.deleteRenderbuffer(m.prof);
  }

  // Un cuadrado de −0,5 a 0,5 en dos triángulos (seis vértices): la forma que
  // repiten miles de veces los glifos, los trazos y las chispas.
  function cuadrado(gl) {
    return bufer(gl, new Float32Array([
      -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5
    ]));
  }

  NAVE.gl = {
    contexto: contexto,
    programa: programa,
    bufer: bufer,
    vao: vao,
    texturaDeLienzo: texturaDeLienzo,
    puedeHdr: puedeHdr,
    marco: marco,
    redimensionar: redimensionar,
    borrarMarco: borrarMarco,
    cuadrado: cuadrado
  };
})();
