/* ==========================================================================
   GL/POSPROCESO.JS · lo que le pasa a la imagen después de dibujarla
   --------------------------------------------------------------------------
   La escena no se pinta directamente en la pantalla sino en un marco aparte
   (con su búfer de profundidad). Luego esa imagen pasa por aquí:

     1. PREFILTRO    se queda con lo más brillante y baja a media resolución
     2. BAJAR × n    cada nivel, la mitad que el anterior (1/4, 1/8, 1/16…)
     3. SUBIR × n    de vuelta hacia arriba, sumando: los niveles pequeños
                     dan el halo ancho y los grandes el brillo ceñido
     4. COMPONER     escena + resplandor, y encima la óptica del tubo:
                     aberración cromática, curvatura, grano, viñeta,
                     interferencias, fallos de señal, destello y sala blanca

   Bajar y subir en cadena es como hacen el resplandor los videojuegos desde
   hace unos años: sale ancho y suave sin un desenfoque gigantesco, porque
   cada pasada trabaja sobre una imagen cuatro veces más pequeña.

   crear(gl, { hdr, niveles }) devuelve:
     escena                      el marco donde hay que dibujar la escena
     redimensionar(ancho, alto)  al cambiar el tamaño del dibujo
     aplicar(p)                  pasa la cadena y pinta en el lienzo
     destruir()
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  function crear(gl, opciones) {
    var G = NAVE.gl, S = NAVE.glsl;
    var hdr = !!opciones.hdr;
    var maximoNiveles = opciones.niveles || 6;

    var prefiltro = G.programa(gl, 'prefiltro', S.prefiltro[0], S.prefiltro[1]);
    var bajar = G.programa(gl, 'bajar', S.bajar[0], S.bajar[1]);
    var subir = G.programa(gl, 'subir', S.subir[0], S.subir[1]);
    var componer = G.programa(gl, 'componer', S.componer[0], S.componer[1]);

    var sinAtributos = gl.createVertexArray();      // el triángulo de pantalla sale de gl_VertexID
    var escena = G.marco(gl, 4, 4, { hdr: hdr, profundidad: true });
    var niveles = [];
    var enUso = 0;

    function redimensionar(ancho, alto) {
      G.redimensionar(gl, escena, ancho, alto);
      var w = escena.ancho, h = escena.alto;
      enUso = 0;
      for (var i = 0; i < maximoNiveles; i++) {
        w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
        if (Math.min(w, h) < 6) break;             // más pequeño ya no aporta nada
        if (!niveles[i]) niveles[i] = G.marco(gl, w, h, { hdr: hdr });
        else G.redimensionar(gl, niveles[i], w, h);
        enUso = i + 1;
      }
    }

    function hacia(marco) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, marco ? marco.fbo : null);
      if (marco) gl.viewport(0, 0, marco.ancho, marco.alto);
    }
    function leer(marco, unidad) {
      gl.activeTexture(gl.TEXTURE0 + (unidad || 0));
      gl.bindTexture(gl.TEXTURE_2D, marco.tex);
    }
    function triangulo() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

    function aplicar(p) {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(sinAtributos);

      if (enUso > 0) {
        // 1. lo brillante, a media resolución
        gl.useProgram(prefiltro.p);
        hacia(niveles[0]);
        leer(escena);
        gl.uniform1i(prefiltro.u.uFuente, 0);
        gl.uniform2f(prefiltro.u.uTexel, 1 / escena.ancho, 1 / escena.alto);
        gl.uniform2f(prefiltro.u.uUmbral, p.umbral, p.rodilla);
        triangulo();

        // 2. hacia abajo
        gl.useProgram(bajar.p);
        gl.uniform1i(bajar.u.uFuente, 0);
        for (var i = 1; i < enUso; i++) {
          hacia(niveles[i]);
          leer(niveles[i - 1]);
          gl.uniform2f(bajar.u.uTexel, 1 / niveles[i - 1].ancho, 1 / niveles[i - 1].alto);
          triangulo();
        }

        // 3. y de vuelta, sumando
        gl.useProgram(subir.p);
        gl.uniform1i(subir.u.uFuente, 0);
        gl.uniform1f(subir.u.uRadio, 1);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (var k = enUso - 1; k > 0; k--) {
          hacia(niveles[k - 1]);
          leer(niveles[k]);
          gl.uniform2f(subir.u.uTexel, 1 / niveles[k].ancho, 1 / niveles[k].alto);
          triangulo();
        }
        gl.disable(gl.BLEND);
      }

      // 4. al lienzo
      hacia(null);
      gl.viewport(0, 0, p.ancho, p.alto);
      gl.useProgram(componer.p);
      leer(escena, 0);
      leer(enUso > 0 ? niveles[0] : escena, 1);
      var u = componer.u;
      gl.uniform1i(u.uEscena, 0);
      gl.uniform1i(u.uResplandor, 1);
      gl.uniform2f(u.uResolucion, p.ancho, p.alto);
      gl.uniform1f(u.uTiempo, p.tiempo);
      // sumadas las subidas, el nivel 0 acumula todos: se reparte entre ellos
      gl.uniform1f(u.uIntensidad, enUso > 0 ? p.intensidad / Math.max(1, enUso * 0.55) : 0);
      gl.uniform1f(u.uExposicion, p.exposicion);
      gl.uniform1f(u.uAberracion, p.aberracion);
      gl.uniform1f(u.uGrano, p.grano);
      gl.uniform1f(u.uVineta, p.vineta);
      gl.uniform1f(u.uCurvatura, p.curvatura);
      gl.uniform1f(u.uFallo, p.fallo);
      gl.uniform1f(u.uDestello, p.destello);
      gl.uniform1f(u.uBlanco, p.blanco);
      gl.uniform2f(u.uVelo, p.velo ? p.velo[0] : 0, p.velo ? p.velo[1] : 0.6);
      gl.uniform3fv(u.uTinte, p.tinte);
      triangulo();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
    }

    function destruir() {
      G.borrarMarco(gl, escena);
      niveles.forEach(function (n) { G.borrarMarco(gl, n); });
      [prefiltro, bajar, subir, componer].forEach(function (pr) { gl.deleteProgram(pr.p); });
      gl.deleteVertexArray(sinAtributos);
    }

    return {
      escena: escena,
      hdr: hdr,
      redimensionar: redimensionar,
      aplicar: aplicar,
      destruir: destruir
    };
  }

  NAVE.posproceso = { crear: crear };
})();
