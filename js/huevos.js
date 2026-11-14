/* ==========================================================================
   HUEVOS.JS · lo que no sale en «ayuda»
   --------------------------------------------------------------------------
   Guiños a las dos películas de las que sale esta nave. Ninguno estorba:
   todos hay que buscarlos, y todos se deshacen solos o con otra orden.

     · el conejo blanco    cae de vez en cuando en la lluvia; se caza con el dedo
     · orden especial 937  la prioridad uno, que aquí es otra
     · Jones               el gato de a bordo cruza la pantalla
     · las dos pastillas   la roja lo pone todo en código; la azul lo devuelve
     · y alguna frase suelta que la consola sabe contestar

   Quien quiera la lista entera sin buscarla: «huevos» en la consola.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;

  /* ---------- Jones ------------------------------------------------------- */
  // Dieciocho por diez píxeles, dos posturas. '#' pelo, 'o' ojo.

  var JONES = [
    [
      '...............#.#',
      '..............####',
      '#.............#o##',
      '#............#####',
      '.################.',
      '..##############..',
      '..##############..',
      '..#############...',
      '..##.##...##.##...',
      '..#..#....#..#....'
    ],
    [
      '...............#.#',
      '..............####',
      '.#............#o##',
      '#............#####',
      '.################.',
      '..##############..',
      '..##############..',
      '..#############...',
      '...##.#...##.#....',
      '...#...#...#..#...'
    ]
  ];

  var gatoSuelto = false;

  function soltarGato() {
    if (gatoSuelto) return Promise.resolve();
    gatoSuelto = true;
    var punto = 5;
    var lienzo = el('canvas', { class: 'jones', width: 18 * punto, height: 10 * punto, 'aria-hidden': 'true' });
    var ctx = lienzo.getContext('2d');
    var estilo = window.getComputedStyle(document.documentElement);
    var pelo = estilo.getPropertyValue('--ambar').trim() || '#ffb224';
    var ojo = estilo.getPropertyValue('--negro').trim() || '#030806';

    function pintar(postura) {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      JONES[postura].forEach(function (fila, y) {
        for (var x = 0; x < fila.length; x++) {
          if (fila[x] === '.') continue;
          ctx.fillStyle = fila[x] === 'o' ? ojo : pelo;
          ctx.fillRect(x * punto, y * punto, punto, punto);
        }
      });
    }
    pintar(0);
    document.body.appendChild(lienzo);

    return new Promise(function (resolver) {
      if (NAVE.calma) {
        // sin paseo: aparece, se queda un momento y se va
        lienzo.style.left = '50%';
        setTimeout(function () { lienzo.remove(); gatoSuelto = false; resolver(); }, 3500);
        return;
      }
      var inicio = null, duracion = 9000, postura = 0, ultimoCambio = 0, maullado = false;
      function cuadro(ahora) {
        if (inicio === null) inicio = ahora;
        var avance = (ahora - inicio) / duracion;
        if (ahora - ultimoCambio > 170) { postura = 1 - postura; pintar(postura); ultimoCambio = ahora; }
        lienzo.style.transform = 'translateX(' + (avance * (window.innerWidth + 200) - 100) + 'px)';
        if (!maullado && avance > 0.5) { maullado = true; NAVE.sonido.miau(); }
        if (avance < 1) requestAnimationFrame(cuadro);
        else { lienzo.remove(); gatoSuelto = false; resolver(); }
      }
      requestAnimationFrame(cuadro);
    });
  }

  /* ---------- instalar ---------------------------------------------------- */

  function instalar(piezas) {
    var consola = piezas.consola;
    var lluvia = piezas.lluvia;
    var hallados = NAVE.memoria.leer('huevos', {});

    function apuntar(nombre) {
      if (hallados[nombre]) return;
      hallados[nombre] = true;
      NAVE.memoria.guardar('huevos', hallados);
      NAVE.bus.emitir('huevo', nombre);
    }

    /* --- el conejo blanco --- */
    NAVE.bus.oir('conejo-cazado', function () {
      apuntar('conejo');
      NAVE.sonido.telefono();
      NAVE.avisar('Toc, toc.', 'ambar', 6000);
      NAVE.modo.salaBlanca(9000);
      consola.recitar([
        'CONEJO BLANCO CAZADO.',
        'Esto es la sala de carga: aquí no hay nada todavía.',
        'Todo lo que una IA sabe hubo que cargárselo antes.'
      ], 'ambar', 500);
    });
    consola.registrar('conejo', {
      oculta: true,
      alias: ['sigue al conejo blanco', 'conejo blanco', 'seguir al conejo'],
      hacer: function () {
        if (lluvia) lluvia.soltarConejo();
        consola.recitar([
          'El conejo no está aquí: está en la lluvia.',
          'Mira el visor. Cuando caiga, cázalo con el dedo.'
        ], 'ambar', 350);
      }
    });

    /* --- orden especial 937 --- */
    consola.registrar('937', {
      oculta: true,
      alias: ['orden 937', 'orden especial 937', 'orden especial'],
      hacer: function () {
        apuntar('937');
        NAVE.sonido.alarma();
        consola.recitar([
          '▲ ORDEN ESPECIAL 937 ▲',
          'ACCESO RESTRINGIDO: SOLO PROFESORADO.'
        ], 'error', 450);
        consola.escribir('PRIORIDAD UNO: DEVOLVER AL ALUMNADO A CASA SABIENDO MÁS QUE AL LLEGAR.', 'error', 34);
        consola.escribir('TODAS LAS DEMÁS CONSIDERACIONES, SECUNDARIAS.', 'error', 34);
        consola.escribir('LA TRIPULACIÓN NO ES PRESCINDIBLE.', 'ambar', 34);
      }
    });

    /* --- Jones --- */
    function jones() {
      apuntar('jones');
      var distancias = ['12 m', '7 m', '3 m'];
      var cadena = Promise.resolve();
      distancias.forEach(function (d) {
        cadena = cadena.then(function () {
          NAVE.sonido.rastreador();
          consola.decir('RASTREADOR: MOVIMIENTO A ' + d + '…', 'ambar');
          return NAVE.espera(NAVE.calma ? 0 : 650);
        });
      });
      return cadena.then(soltarGato).then(function () {
        consola.decir('Falsa alarma. Era Jones.', 'ok');
      });
    }
    consola.registrar('jones', {
      oculta: true,
      alias: ['gato', 'aqui gatito', 'miau', 'rastreador'],
      hacer: function () { jones(); }
    });

    // Si nadie toca nada en cuatro minutos, Jones se da una vuelta. Una vez.
    var reposo = null;
    function reiniciarReposo() {
      clearTimeout(reposo);
      if (NAVE.sesion.leer('jones-paseo', false)) return;
      reposo = setTimeout(function () {
        NAVE.sesion.guardar('jones-paseo', true);
        if (!document.hidden) soltarGato();
      }, 240000);
    }
    ['pointerdown', 'keydown', 'scroll'].forEach(function (tipo) {
      window.addEventListener(tipo, reiniciarReposo, { passive: true });
    });
    reiniciarReposo();

    /* --- las pastillas --- */
    consola.registrar('pastilla', {
      oculta: true,
      alias: ['pastillas'],
      hacer: function () {
        consola.recitar([
          '¿Roja o azul?',
          '  pastilla roja — ves hasta dónde llega el código',
          '  pastilla azul — todo vuelve a su sitio'
        ], 'ambar');
      }
    });
    consola.registrar('pastilla roja', {
      oculta: true,
      alias: ['roja'],
      hacer: function () {
        apuntar('pastilla');
        NAVE.modo.codigo(true);
        if (lluvia) lluvia.intensidad(1);
        NAVE.sonido.acierto();
        consola.recitar([
          'PASTILLA ROJA.',
          'Ahora lo ves como lo ve la máquina: todo es código.',
          '(«pastilla azul» lo deshace.)'
        ], 'ok', 400);
      }
    });
    consola.registrar('pastilla azul', {
      oculta: true,
      alias: ['azul'],
      hacer: function () {
        NAVE.modo.codigo(false);
        NAVE.sonido.ok();
        consola.recitar([
          'PASTILLA AZUL.',
          'La historia acaba aquí. El puente vuelve a ser el puente.'
        ], 'ambar', 400);
      }
    });

    /* --- frases sueltas --- */
    consola.registrar('despierta', {
      oculta: true,
      alias: ['despertar'],
      hacer: function () {
        apuntar('despierta');
        NAVE.sonido.telefono();
        consola.escribir('Despierta…', 'ok', 9);
        consola.escribir('La clase te tiene.', 'ok', 16);
        consola.escribir('Sigue al conejo blanco.', 'ok', 16);
      }
    });
    consola.registrar('cuchara', {
      oculta: true,
      alias: ['no hay cuchara', 'no existe la cuchara'],
      hacer: function () {
        apuntar('cuchara');
        consola.recitar([
          'Exacto: no hay cuchara.',
          'Tampoco hay nadie dentro del chat. Hay un modelo calculando qué palabra viene después.'
        ], 'ambar', 500);
      }
    });
    consola.registrar('compuertas', {
      oculta: true,
      alias: ['abre las compuertas', 'abrir compuertas', 'abre la compuerta'],
      hacer: function () {
        apuntar('compuertas');
        NAVE.sonido.fallo();
        consola.escribir('Lo siento. Me temo que no puedo hacer eso.', 'error', 22);
      }
    });
    consola.registrar('autodestruccion', {
      oculta: true,
      alias: ['autodestruir', 'destruir nave'],
      hacer: function () {
        apuntar('autodestruccion');
        NAVE.sonido.alarma();
        consola.recitar([
          '▲ SECUENCIA DE AUTODESTRUCCIÓN ACTIVADA ▲',
          'LA NAVE SE DESTRUIRÁ EN T MENOS 10 MINUTOS.',
          '…',
          'Secuencia anulada: mañana hay clase.'
        ], 'error', 800);
      }
    });

    consola.registrar('huevos', {
      oculta: true,
      alias: ['secretos', 'easter eggs'],
      hacer: function () {
        var todos = [
          ['conejo', 'el conejo blanco — cázalo en la lluvia (o escribe «conejo»)'],
          ['937', 'orden especial 937'],
          ['jones', 'jones'],
          ['pastilla', 'pastilla roja / pastilla azul'],
          ['despierta', 'despierta'],
          ['cuchara', 'no hay cuchara'],
          ['compuertas', 'abre las compuertas'],
          ['autodestruccion', 'autodestruccion'],
          ['konami', '↑ ↑ ↓ ↓ ← → ← → B A']
        ];
        var cuantos = todos.filter(function (h) { return hallados[h[0]]; }).length;
        var lineas = ['HUEVOS DE PASCUA · ' + cuantos + ' de ' + todos.length + ' hallados'];
        todos.forEach(function (h) { lineas.push('  ' + (hallados[h[0]] ? '[x] ' : '[ ] ') + h[1]); });
        consola.recitar(lineas, 'ambar');
      }
    });

    /* --- el código de siempre: ↑ ↑ ↓ ↓ ← → ← → B A --- */
    var SECUENCIA = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var avance = 0;
    document.addEventListener('keydown', function (evento) {
      var tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
      avance = (tecla === SECUENCIA[avance]) ? avance + 1 : (tecla === SECUENCIA[0] ? 1 : 0);
      if (avance === SECUENCIA.length) {
        avance = 0;
        apuntar('konami');
        NAVE.sonido.acierto();
        NAVE.avisar('Treinta vidas. Y un gato.', 'ambar');
        soltarGato();
      }
    });
  }

  NAVE.huevos = { instalar: instalar, soltarGato: soltarGato };
})();
