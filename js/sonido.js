/* ==========================================================================
   SONIDO.JS · los ruidos de la nave, sintetizados
   --------------------------------------------------------------------------
   No hay ni un archivo de audio: cada pitido es un oscilador de WebAudio y
   el zumbido de fondo son dos osciladores graves más ruido filtrado.

   EMPIEZA APAGADO. Un aula no agradece que una web suene sola, y los
   navegadores tampoco dejan: el contexto de audio solo se crea tras un gesto
   de quien usa la página, al encenderlo con el botón o con «sonido si».
   La elección se recuerda entre visitas.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  var contexto = null;
  var maestro = null;
  var encendido = !!NAVE.memoria.leer('sonido', false);
  var zumbido = null;         // nodos del fondo, cuando suena
  var quiereZumbido = false;  // si la página lo ha pedido (aunque esté en silencio)
  var ultimaTecla = 0;

  function listo() {
    if (!encendido) return null;
    if (!contexto) {
      var Clase = window.AudioContext || window.webkitAudioContext;
      if (!Clase) return null;
      try {
        contexto = new Clase();
        maestro = contexto.createGain();
        maestro.gain.value = 0.55;
        maestro.connect(contexto.destination);
      } catch (e) { contexto = null; return null; }
    }
    if (contexto.state === 'suspended') { try { contexto.resume(); } catch (e) {} }
    return contexto;
  }

  // Un tono con ataque y caída rápidos. `hasta` desliza la frecuencia.
  function tono(frecuencia, duracion, opciones) {
    var ctx = listo();
    if (!ctx) return;
    opciones = opciones || {};
    var cuando = ctx.currentTime + (opciones.espera || 0);
    var oscilador = ctx.createOscillator();
    var ganancia = ctx.createGain();
    var volumen = opciones.volumen === undefined ? 0.07 : opciones.volumen;
    oscilador.type = opciones.onda || 'square';
    oscilador.frequency.setValueAtTime(frecuencia, cuando);
    if (opciones.hasta) oscilador.frequency.exponentialRampToValueAtTime(opciones.hasta, cuando + duracion);
    ganancia.gain.setValueAtTime(0.0001, cuando);
    ganancia.gain.exponentialRampToValueAtTime(volumen, cuando + 0.008);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion);
    oscilador.connect(ganancia);
    ganancia.connect(maestro);
    oscilador.start(cuando);
    oscilador.stop(cuando + duracion + 0.03);
  }

  function bufferRuido(ctx, segundos) {
    var largo = Math.floor(ctx.sampleRate * segundos);
    var buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    var datos = buffer.getChannelData(0);
    for (var i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Un golpe de ruido filtrado: la tecla, el relé.
  function chasquido(duracion, volumen, corte) {
    var ctx = listo();
    if (!ctx) return;
    var fuente = ctx.createBufferSource();
    fuente.buffer = bufferRuido(ctx, duracion);
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = corte || 2400;
    filtro.Q.value = 0.8;
    var ganancia = ctx.createGain();
    var ahora = ctx.currentTime;
    ganancia.gain.setValueAtTime(volumen || 0.05, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);
    fuente.connect(filtro); filtro.connect(ganancia); ganancia.connect(maestro);
    fuente.start(ahora);
  }

  function arrancarZumbido() {
    var ctx = listo();
    if (!ctx || zumbido) return;
    var salida = ctx.createGain();
    salida.gain.setValueAtTime(0.0001, ctx.currentTime);
    salida.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5);
    salida.connect(maestro);

    var grave = ctx.createOscillator();
    grave.type = 'sine'; grave.frequency.value = 54;
    var gGrave = ctx.createGain(); gGrave.gain.value = 0.11;
    grave.connect(gGrave); gGrave.connect(salida);

    var medio = ctx.createOscillator();
    medio.type = 'sawtooth'; medio.frequency.value = 108.4;
    var filtroMedio = ctx.createBiquadFilter();
    filtroMedio.type = 'lowpass'; filtroMedio.frequency.value = 220;
    var gMedio = ctx.createGain(); gMedio.gain.value = 0.035;
    medio.connect(filtroMedio); filtroMedio.connect(gMedio); gMedio.connect(salida);

    var aire = ctx.createBufferSource();
    aire.buffer = bufferRuido(ctx, 3);
    aire.loop = true;
    var filtroAire = ctx.createBiquadFilter();
    filtroAire.type = 'lowpass'; filtroAire.frequency.value = 420;
    var gAire = ctx.createGain(); gAire.gain.value = 0.04;
    aire.connect(filtroAire); filtroAire.connect(gAire); gAire.connect(salida);

    // una respiración lentísima sobre el volumen, para que no sea un tono muerto
    var vaiven = ctx.createOscillator();
    vaiven.frequency.value = 0.07;
    var gVaiven = ctx.createGain(); gVaiven.gain.value = 0.08;
    vaiven.connect(gVaiven); gVaiven.connect(salida.gain);

    [grave, medio, aire, vaiven].forEach(function (nodo) { nodo.start(); });
    zumbido = { salida: salida, nodos: [grave, medio, aire, vaiven] };
  }

  function pararZumbido() {
    if (!zumbido || !contexto) return;
    var viejo = zumbido;
    zumbido = null;
    try {
      viejo.salida.gain.cancelScheduledValues(contexto.currentTime);
      viejo.salida.gain.setValueAtTime(viejo.salida.gain.value, contexto.currentTime);
      viejo.salida.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + 0.6);
    } catch (e) {}
    setTimeout(function () {
      viejo.nodos.forEach(function (nodo) { try { nodo.stop(); } catch (e) {} });
      try { viejo.salida.disconnect(); } catch (e) {}
    }, 700);
  }

  NAVE.sonido = {
    get encendido() { return encendido; },

    poner: function (valor) {
      encendido = !!valor;
      NAVE.memoria.guardar('sonido', encendido);
      if (encendido) {
        listo();
        if (quiereZumbido) arrancarZumbido();
        NAVE.sonido.ok();
      } else {
        pararZumbido();
      }
      NAVE.bus.emitir('sonido', encendido);
      return encendido;
    },
    alternar: function () { return NAVE.sonido.poner(!encendido); },

    // La página dice si quiere fondo; solo suena si además hay sonido.
    zumbido: function (quiere) {
      quiereZumbido = !!quiere;
      if (quiereZumbido && encendido) arrancarZumbido(); else pararZumbido();
    },

    // --- el repertorio ---
    tecla: function () {
      var ahora = Date.now();
      if (ahora - ultimaTecla < 28) return;     // no ametrallar al teclear deprisa
      ultimaTecla = ahora;
      chasquido(0.03, 0.035, 1800 + Math.random() * 1400);
    },
    pitido: function (frecuencia, duracion) { tono(frecuencia || 880, duracion || 0.09); },
    paso:   function () { tono(660, 0.05, { volumen: 0.045 }); },
    atras:  function () { tono(440, 0.05, { volumen: 0.045 }); },
    ok: function () {
      tono(660, 0.07);
      tono(990, 0.11, { espera: 0.075 });
    },
    error: function () {
      tono(180, 0.16, { onda: 'sawtooth', volumen: 0.08 });
      tono(140, 0.22, { onda: 'sawtooth', volumen: 0.08, espera: 0.14 });
    },
    rele: function () { chasquido(0.06, 0.07, 900); },
    acierto: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tono(f, 0.12, { espera: i * 0.08, onda: 'triangle', volumen: 0.09 }); });
    },
    fallo: function () { tono(220, 0.3, { onda: 'triangle', hasta: 110, volumen: 0.09 }); },
    arranque: function () {
      tono(110, 1.3, { onda: 'sawtooth', hasta: 440, volumen: 0.05 });
      tono(880, 0.08, { espera: 1.25 });
      tono(1320, 0.14, { espera: 1.36 });
    },
    alarma: function () {
      for (var i = 0; i < 3; i++) {
        tono(740, 0.18, { espera: i * 0.36, onda: 'square', volumen: 0.06 });
        tono(555, 0.18, { espera: i * 0.36 + 0.18, onda: 'square', volumen: 0.06 });
      }
    },
    // el rastreador de movimiento: un «blip» que sube
    rastreador: function () {
      tono(1200, 0.07, { onda: 'sine', volumen: 0.1 });
      tono(1500, 0.05, { onda: 'sine', volumen: 0.06, espera: 0.09 });
    },
    miau: function () {
      tono(620, 0.34, { onda: 'triangle', hasta: 880, volumen: 0.09 });
      tono(880, 0.3, { onda: 'triangle', hasta: 520, volumen: 0.08, espera: 0.3 });
    },
    telefono: function () {
      for (var i = 0; i < 2; i++) {
        tono(480, 0.4, { onda: 'sine', volumen: 0.07, espera: i * 0.9 });
        tono(440, 0.4, { onda: 'sine', volumen: 0.07, espera: i * 0.9 });
      }
    }
  };

  // Si la pestaña se esconde, la nave calla.
  document.addEventListener('visibilitychange', function () {
    if (!contexto) return;
    try { if (document.hidden) contexto.suspend(); else if (encendido) contexto.resume(); } catch (e) {}
  });
})();
