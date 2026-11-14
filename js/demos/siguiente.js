/* ==========================================================================
   DEMOS/SIGUIENTE.JS · adivinar la palabra siguiente
   --------------------------------------------------------------------------
   Lo que hace un modelo de lenguaje, reducido a lo que cabe en una pizarra:
   mirar las últimas palabras, calcular qué probabilidad tiene cada palabra
   de venir después, elegir una, añadirla y volver a empezar.

   Este modelo es de los más simples que existen (un «trigrama»): solo mira
   LAS DOS ÚLTIMAS palabras y solo sabe lo que ha contado en corpus.js.
   Para cada pareja de palabras ha apuntado cuáles vinieron detrás y cuántas
   veces. Si la pareja no la ha visto nunca, mira solo la última palabra; si
   tampoco, tira de las palabras más frecuentes.

   Un modelo de verdad cambia dos cosas, y son las que importan: no mira dos
   palabras sino miles, y en vez de una tabla de cuentas tiene una red
   neuronal que generaliza a frases que nunca vio. El bucle —predecir,
   elegir, añadir— es exactamente este.

   LA TEMPERATURA reparte la suerte. A 0 se elige siempre la más probable;
   al subirla, las improbables ganan opciones. Se aplica como en los modelos
   reales: cada probabilidad se eleva a 1/T y se vuelve a repartir.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;
  NAVE.demos = NAVE.demos || {};

  var INICIO = '<i>';
  var modelo = null;

  /* ---------- contar ------------------------------------------------------ */

  function partir(texto) {
    return String(texto).toLowerCase()
      .replace(/[¿¡«»"()]/g, ' ')
      .replace(/([.,;:?!])/g, ' $1 ')
      .split(/\s+/).filter(Boolean);
  }

  function sumar(tabla, clave, palabra) {
    var fila = tabla[clave] || (tabla[clave] = { total: 0, sigue: {} });
    fila.total++;
    fila.sigue[palabra] = (fila.sigue[palabra] || 0) + 1;
  }

  function contar() {
    if (modelo) return modelo;
    var uno = { total: 0, sigue: {} }, dos = {}, tres = {};
    NAVE.corpus.forEach(function (frase) {
      var palabras = [INICIO, INICIO].concat(partir(frase));
      for (var i = 2; i < palabras.length; i++) {
        var p = palabras[i];
        uno.total++; uno.sigue[p] = (uno.sigue[p] || 0) + 1;
        sumar(dos, palabras[i - 1], p);
        sumar(tres, palabras[i - 2] + ' ' + palabras[i - 1], p);
      }
    });
    modelo = { uno: uno, dos: dos, tres: tres };
    return modelo;
  }

  // Devuelve {lista: [{palabra, p}], nivel: 3 | 2 | 1}
  // nivel dice cuánto contexto ha podido usar: las dos últimas, la última o ninguna.
  function predecir(contexto) {
    var m = contar();
    var penultima = contexto.length > 1 ? contexto[contexto.length - 2] : INICIO;
    var ultima = contexto.length > 0 ? contexto[contexto.length - 1] : INICIO;
    // tras un punto empieza frase nueva
    if (/^[.?!]$/.test(ultima)) { penultima = INICIO; ultima = INICIO; }
    else if (/^[.?!]$/.test(penultima)) { penultima = INICIO; }

    var filaTres = m.tres[penultima + ' ' + ultima];
    var filaDos = m.dos[ultima];
    var pesos = {}, nivel = 1;

    function mezclar(fila, peso) {
      Object.keys(fila.sigue).forEach(function (palabra) {
        pesos[palabra] = (pesos[palabra] || 0) + peso * fila.sigue[palabra] / fila.total;
      });
    }
    if (filaTres) { nivel = 3; mezclar(filaTres, 0.7); if (filaDos) mezclar(filaDos, 0.25); mezclar(m.uno, 0.05); }
    else if (filaDos) { nivel = 2; mezclar(filaDos, 0.9); mezclar(m.uno, 0.1); }
    else { mezclar(m.uno, 1); }

    var lista = Object.keys(pesos).map(function (palabra) { return { palabra: palabra, p: pesos[palabra] }; });
    lista.sort(function (a, b) { return b.p - a.p || (a.palabra < b.palabra ? -1 : 1); });
    return { lista: lista, nivel: nivel, mira: [penultima, ultima] };
  }

  // Reparte de nuevo las probabilidades según la temperatura.
  function templar(lista, temperatura) {
    if (temperatura <= 0.02) {
      return lista.map(function (c, i) { return { palabra: c.palabra, p: i === 0 ? 1 : 0 }; });
    }
    var suma = 0;
    var nuevas = lista.map(function (c) {
      var p = Math.pow(c.p, 1 / temperatura);
      suma += p;
      return { palabra: c.palabra, p: p };
    });
    nuevas.forEach(function (c) { c.p /= suma; });
    return nuevas;
  }

  function sortear(lista) {
    var tirada = Math.random(), acumulado = 0;
    for (var i = 0; i < lista.length; i++) {
      acumulado += lista[i].p;
      if (tirada <= acumulado) return lista[i].palabra;
    }
    return lista[0].palabra;
  }

  // ['la', 'máquina', '.', 'el'] → «La máquina. El»
  function redactar(palabras) {
    var texto = '', mayuscula = true;
    palabras.forEach(function (palabra) {
      var esSigno = /^[.,;:?!]$/.test(palabra);
      var puesta = mayuscula && !esSigno ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra;
      texto += (esSigno || !texto ? '' : ' ') + puesta;
      if (!esSigno) mayuscula = false;
      if (/^[.?!]$/.test(palabra)) mayuscula = true;
    });
    return texto;
  }

  /* ---------- montar ------------------------------------------------------ */

  function montar(contenedor, opciones) {
    opciones = opciones || {};
    var palabras = partir(opciones.inicio || 'La máquina');
    var temperatura = 0.7;
    var temporizador = null;
    var vivo = true;
    var VISIBLES = 8;

    var frase = el('p', { class: 'siguiente__frase', 'aria-live': 'polite' });
    var mira = el('p', { class: 'siguiente__mira' });
    var candidatas = el('ol', { class: 'siguiente__candidatas' });
    var lecturaTemperatura = el('span', { class: 'crt tokens__cuenta' }, '0,7');
    var entrada = el('input', {
      class: 'campo', type: 'text', value: redactar(palabras), spellcheck: 'false',
      'aria-label': 'Con qué palabras empieza la frase'
    });
    var botonSola = el('button', { class: 'boton boton--ambar siguiente__sola', type: 'button', onclick: escribirSola }, 'Que escriba sola');

    var deslizador = el('input', {
      type: 'range', min: '0', max: '200', value: '70', 'aria-label': 'Temperatura',
      oninput: function () {
        temperatura = this.value / 100;
        lecturaTemperatura.textContent = temperatura.toFixed(1).replace('.', ',');
        pintar();
      }
    });

    var raiz = el('div', { class: 'demo siguiente' }, [
      el('div', { class: 'siguiente__izquierda' }, [
        el('span', { class: 'mando__titulo micro' }, 'La frase hasta ahora'),
        frase,
        mira,
        el('div', { class: 'mando__fila mando__fila--acciones' }, [
          el('button', { class: 'boton', type: 'button', onclick: function () { parar(); elegir(); } }, 'Una palabra'),
          botonSola,
          el('button', { class: 'boton', type: 'button', onclick: function () { parar(); palabras.pop(); pintar(); NAVE.sonido.atras(); } }, 'Deshacer')
        ]),
        el('div', { class: 'mando' }, [
          el('span', { class: 'mando__titulo micro' }, ['Temperatura: ', lecturaTemperatura]),
          deslizador,
          el('div', { class: 'siguiente__escala micro', 'aria-hidden': 'true' }, [el('span', null, 'a lo seguro'), el('span', null, 'arriesga')])
        ]),
        el('div', { class: 'mando' }, [
          el('span', { class: 'mando__titulo micro' }, 'Empezar con otras palabras'),
          el('div', { class: 'mando__fila' }, [
            entrada,
            el('button', { class: 'boton boton--mini', type: 'button', onclick: empezar }, 'Empezar')
          ])
        ])
      ]),
      el('div', { class: 'siguiente__derecha' }, [
        el('span', { class: 'mando__titulo micro' }, '¿Qué viene después? Toca una para elegirla'),
        candidatas
      ])
    ]);
    contenedor.appendChild(raiz);

    function pintar() {
      // la frase, con las dos palabras que el modelo «ve» resaltadas
      frase.textContent = '';
      var desde = Math.max(0, palabras.length - 2);
      if (desde > 0) frase.appendChild(el('span', { class: 'siguiente__antes' }, redactar(palabras.slice(0, desde)) + ' '));
      var cola = redactar(palabras).slice(redactar(palabras.slice(0, desde)).length).trim();
      frase.appendChild(el('span', { class: 'siguiente__vista' }, cola));
      frase.appendChild(el('span', { class: 'cursor', 'aria-hidden': 'true' }));

      var prediccion = predecir(palabras);
      var explicacion = prediccion.nivel === 3 ? 'Ha visto estas dos palabras juntas: usa las dos.'
        : prediccion.nivel === 2 ? 'Nunca vio estas dos juntas: se fía solo de la última.'
        : 'No conoce estas palabras: tira de las más frecuentes.';
      if (prediccion.mira[1] === INICIO) explicacion = 'Empieza frase: elige una de las palabras con las que suele empezar.';
      mira.textContent = explicacion;
      mira.className = 'siguiente__mira' + (prediccion.nivel < 3 ? ' ambar' : '');

      var templadas = templar(prediccion.lista, temperatura);
      candidatas.textContent = '';
      templadas.slice(0, VISIBLES).forEach(function (candidata) {
        var porciento = candidata.p * 100;
        var boton = el('button', {
          class: 'candidata', type: 'button',
          onclick: function () { parar(); poner(candidata.palabra); }
        }, [
          el('span', { class: 'candidata__palabra' }, candidata.palabra),
          el('span', { class: 'candidata__barra', 'aria-hidden': 'true' }, el('span', { style: 'width:' + Math.max(0.5, porciento).toFixed(1) + '%' })),
          el('span', { class: 'candidata__p' }, (porciento < 1 && porciento > 0 ? '<1' : Math.round(porciento)) + ' %')
        ]);
        candidatas.appendChild(el('li', null, boton));
      });
      var resto = templadas.length - VISIBLES;
      if (resto > 0) {
        var pResto = templadas.slice(VISIBLES).reduce(function (s, c) { return s + c.p; }, 0) * 100;
        candidatas.appendChild(el('li', { class: 'siguiente__resto tenue' },
          '…y ' + resto + ' palabras más, que entre todas suman ' + (pResto < 1 ? 'menos del 1' : Math.round(pResto)) + ' %'));
      }
    }

    function poner(palabra) {
      palabras.push(palabra);
      NAVE.sonido.tecla();
      pintar();
    }
    function elegir() {
      var prediccion = predecir(palabras);
      poner(sortear(templar(prediccion.lista, temperatura)));
    }
    function parar() {
      if (temporizador) { clearInterval(temporizador); temporizador = null; }
      botonSola.textContent = 'Que escriba sola';
    }
    function escribirSola() {
      if (temporizador) { parar(); return; }
      botonSola.textContent = 'Parar';
      var puestas = 0;
      temporizador = setInterval(function () {
        if (!vivo || !raiz.isConnected) { parar(); return; }
        elegir(); puestas++;
        var puntos = palabras.filter(function (p) { return /^[.?!]$/.test(p); }).length;
        if (puestas >= 45 || (puestas > 6 && puntos >= 2 && /^[.?!]$/.test(palabras[palabras.length - 1]))) parar();
      }, NAVE.calma ? 60 : 330);
    }
    function empezar() {
      parar();
      var nuevas = partir(entrada.value);
      palabras = nuevas.length ? nuevas : [];
      NAVE.sonido.rele();
      pintar();
    }
    entrada.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') { evento.preventDefault(); empezar(); }
    });

    pintar();
    return {
      desmontar: function () {
        vivo = false; parar();
        if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
      }
    };
  }

  NAVE.demos.siguiente = {
    titulo: 'La palabra siguiente',
    icono: 'palabra',
    entrada: 'Un modelo de lenguaje hace una sola cosa: calcular qué palabra es más probable que venga después. La añade, y vuelve a calcular. Frase a frase, así escribe todo lo que escribe.',
    notas: [
      'Las barras son **probabilidades**, no certezas. El modelo no «sabe» la respuesta: reparte apuestas.',
      'Con la temperatura a **0** escribe siempre lo mismo. Súbela y empezará a decir cosas raras: es el mismo mando que hace a un chatbot más «creativo» o más formal.',
      'Este modelo solo mira las *dos últimas palabras*, por eso pierde el hilo enseguida. Los de verdad miran miles a la vez.',
      'Todo lo que dice suena a las frases que leyó. Si los datos tienen un error, lo repetirá con la misma seguridad.'
    ],
    montar: montar,
    predecir: predecir,
    partir: partir
  };
})();
