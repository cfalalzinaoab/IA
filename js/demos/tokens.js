/* ==========================================================================
   DEMOS/TOKENS.JS · el troceador de texto
   --------------------------------------------------------------------------
   Un modelo de lenguaje no lee letras ni palabras: lee TROZOS (tokens).
   Este aparato enseña de dónde salen, con el mismo método que usan los
   modelos de verdad (se llama BPE, «codificación por pares de bytes»):

     1. se empieza con el texto partido letra a letra;
     2. se busca la pareja de trozos vecinos que más se repite;
     3. esa pareja se funde en un trozo nuevo;
     4. se vuelve al paso 2.

   Cada fusión es una cosa que el troceador «ha aprendido». Con cero
   fusiones todo son letras sueltas; con trescientas, las palabras
   frecuentes ya son un solo trozo y las raras se parten en pedazos.

   LO QUE ESTE APARATO NO ES: el troceador de ningún modelo real. Aquellos
   aprenden de bibliotecas enteras y tienen decenas de miles de trozos; este
   aprende de las frases de corpus.js y no pasa de unos cientos. El método
   es el mismo, el tamaño no.

   El espacio de delante de cada palabra forma parte del trozo (se pinta
   como «·»): así «la» al empezar una palabra y «la» en medio de «hablar»
   son trozos distintos, igual que en los modelos de verdad.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;
  NAVE.demos = NAVE.demos || {};

  var ESPACIO = '▁';      // ▁ marca «aquí empieza una palabra»
  var MAXIMO = 320;            // fusiones que se aprenden como mucho
  var aprendido = null;        // se calcula una vez y vale para todas las veces

  /* ---------- aprender las fusiones -------------------------------------- */

  function aprender() {
    if (aprendido) return aprendido;
    // cada palabra distinta, con cuántas veces sale, partida en letras
    var cuentas = {};
    NAVE.corpus.forEach(function (frase) {
      piezas(frase).forEach(function (pieza) {
        cuentas[pieza] = (cuentas[pieza] || 0) + 1;
      });
    });
    var palabras = Object.keys(cuentas).map(function (clave) {
      return { trozos: Array.from(clave), veces: cuentas[clave] };
    });

    var letras = {};
    palabras.forEach(function (p) { p.trozos.forEach(function (t) { letras[t] = true; }); });
    var vocabulario = Object.keys(letras).sort();

    var fusiones = [];
    for (var f = 0; f < MAXIMO; f++) {
      // contar todas las parejas vecinas
      var parejas = {};
      palabras.forEach(function (p) {
        for (var i = 0; i < p.trozos.length - 1; i++) {
          var clave = p.trozos[i] + '\u0000' + p.trozos[i + 1];
          parejas[clave] = (parejas[clave] || 0) + p.veces;
        }
      });
      // la más repetida (a igualdad, la primera por orden alfabético: así sale siempre igual)
      var mejor = null, mejorVeces = 1;
      Object.keys(parejas).sort().forEach(function (clave) {
        if (parejas[clave] > mejorVeces) { mejor = clave; mejorVeces = parejas[clave]; }
      });
      if (!mejor) break;       // ya no hay ninguna pareja que salga dos veces
      var par = mejor.split('\u0000');
      fusiones.push({ a: par[0], b: par[1], veces: mejorVeces });
      vocabulario.push(par[0] + par[1]);
      palabras.forEach(function (p) { p.trozos = fundir(p.trozos, par[0], par[1]); });
    }
    var numero = {};
    vocabulario.forEach(function (trozo, i) { numero[trozo] = i; });
    aprendido = { fusiones: fusiones, vocabulario: vocabulario, numero: numero };
    return aprendido;
  }

  // Antes de trocear se separan los signos de las palabras, como hacen los
  // troceadores de verdad: «trozos.» son dos piezas, «·trozos» y «.».
  // Solo la primera pieza de cada palabra lleva la marca del espacio.
  function piezas(texto) {
    var salida = [];
    String(texto).split(/\s+/).forEach(function (palabra) {
      if (!palabra) return;
      var partes = palabra.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]/gu) || [];
      partes.forEach(function (parte, i) { salida.push((i === 0 ? ESPACIO : '') + parte); });
    });
    return salida;
  }

  function fundir(trozos, a, b) {
    var salida = [];
    for (var i = 0; i < trozos.length; i++) {
      if (i < trozos.length - 1 && trozos[i] === a && trozos[i + 1] === b) { salida.push(a + b); i++; }
      else salida.push(trozos[i]);
    }
    return salida;
  }

  // Parte un texto usando solo las primeras `cuantas` fusiones.
  function trocear(texto, cuantas) {
    var saber = aprender();
    var salida = [];
    piezas(texto).forEach(function (pieza) {
      var trozos = Array.from(pieza);
      for (var f = 0; f < cuantas && f < saber.fusiones.length && trozos.length > 1; f++) {
        trozos = fundir(trozos, saber.fusiones[f].a, saber.fusiones[f].b);
      }
      trozos.forEach(function (t) { salida.push(t); });
    });
    return salida;
  }

  function visible(trozo) { return trozo.replace(new RegExp(ESPACIO, 'g'), '·'); }

  /* ---------- montar ------------------------------------------------------ */

  function montar(contenedor, opciones) {
    opciones = opciones || {};
    var saber = aprender();
    var tope = saber.fusiones.length;
    var cuantas = Math.min(tope, 140);
    var conNumeros = false;
    var temporizador = null;
    var vivo = true;

    var texto = el('textarea', {
      class: 'campo tokens__texto', rows: '3', spellcheck: 'false',
      'aria-label': 'Texto que se va a trocear'
    });
    texto.value = opciones.texto || 'La inteligencia artificial no lee palabras: lee trozos. ¿Y una palabra rarísima?';

    var salida = el('div', { class: 'tokens__salida', 'aria-live': 'polite' });
    var lecturaLetras = el('dd', null, '0');
    var lecturaTrozos = el('dd', null, '0');
    var lecturaMedia = el('dd', null, '—');
    var lecturaFusiones = el('span', { class: 'tokens__cuenta crt' }, String(cuantas));
    var ultimas = el('ol', { class: 'tokens__fusiones' });

    var deslizador = el('input', {
      type: 'range', min: '0', max: String(tope), value: String(cuantas),
      'aria-label': 'Fusiones aprendidas',
      oninput: function () { pararAnimacion(); cuantas = parseInt(this.value, 10); pintar(); }
    });
    var botonAnimar = el('button', { class: 'boton boton--ambar', type: 'button', onclick: animar }, 'Aprender desde cero');
    var botonNumeros = el('button', {
      class: 'boton', type: 'button', 'aria-pressed': 'false',
      onclick: function () {
        conNumeros = !conNumeros;
        this.setAttribute('aria-pressed', String(conNumeros));
        NAVE.sonido.rele();
        pintar();
      }
    }, 'Ver los números');

    var raiz = el('div', { class: 'demo tokens' }, [
      el('div', { class: 'tokens__arriba' }, [
        el('label', { class: 'mando' }, [el('span', { class: 'mando__titulo micro' }, 'Escribe lo que quieras'), texto])
      ]),
      el('div', { class: 'tokens__medio' }, [
        el('div', { class: 'mando' }, [
          el('span', { class: 'mando__titulo micro' }, ['Fusiones aprendidas: ', lecturaFusiones, ' de ' + tope]),
          deslizador
        ]),
        el('div', { class: 'mando__fila mando__fila--acciones' }, [botonAnimar, botonNumeros])
      ]),
      salida,
      el('div', { class: 'tokens__abajo' }, [
        el('dl', { class: 'demo__lecturas' }, [
          el('dt', null, 'Letras'), lecturaLetras,
          el('dt', null, 'Trozos'), lecturaTrozos,
          el('dt', null, 'Letras por trozo'), lecturaMedia
        ]),
        el('div', { class: 'tokens__ultimas' }, [
          el('span', { class: 'mando__titulo micro' }, 'Lo último que ha aprendido'),
          ultimas
        ])
      ])
    ]);
    contenedor.appendChild(raiz);

    function pintar() {
      var trozos = trocear(texto.value, cuantas);
      salida.textContent = '';
      trozos.forEach(function (trozo, i) {
        var numero = saber.numero[trozo];
        var ficha = el('span', {
          class: 'trozo trozo--' + (i % 4) + (numero === undefined ? ' trozo--raro' : ''),
          title: numero === undefined ? 'Letra que no había visto nunca' : 'Trozo n.º ' + numero
        }, [
          el('span', { class: 'trozo__texto' }, visible(trozo)),
          conNumeros ? el('span', { class: 'trozo__numero' }, numero === undefined ? '?' : String(numero)) : null
        ]);
        salida.appendChild(ficha);
      });
      var letras = texto.value.replace(/\s+/g, ' ').trim().length;
      lecturaLetras.textContent = String(letras);
      lecturaTrozos.textContent = String(trozos.length);
      lecturaMedia.textContent = trozos.length ? (letras / trozos.length).toFixed(1).replace('.', ',') : '—';
      lecturaFusiones.textContent = String(cuantas);
      deslizador.value = String(cuantas);

      ultimas.textContent = '';
      if (cuantas === 0) {
        ultimas.appendChild(el('li', { class: 'tenue' }, 'Nada todavía: solo conoce letras sueltas.'));
      }
      for (var f = cuantas - 1; f >= Math.max(0, cuantas - 5); f--) {
        var fusion = saber.fusiones[f];
        ultimas.appendChild(el('li', null, [
          el('span', { class: 'tokens__par' }, visible(fusion.a)),
          ' + ',
          el('span', { class: 'tokens__par' }, visible(fusion.b)),
          ' → ',
          el('span', { class: 'tokens__par tokens__par--nuevo' }, visible(fusion.a + fusion.b)),
          el('span', { class: 'tenue' }, '  (' + fusion.veces + ' veces)')
        ]));
      }
    }

    function pararAnimacion() {
      if (temporizador) { clearInterval(temporizador); temporizador = null; }
      botonAnimar.textContent = 'Aprender desde cero';
    }
    function animar() {
      if (temporizador) { pararAnimacion(); return; }
      if (NAVE.calma) { cuantas = tope; pintar(); return; }
      cuantas = 0; pintar();
      botonAnimar.textContent = 'Parar';
      temporizador = setInterval(function () {
        if (!vivo || !raiz.isConnected) { pararAnimacion(); return; }
        cuantas += cuantas < 30 ? 1 : 3;          // despacio al principio, que es donde se ve
        if (cuantas >= tope) { cuantas = tope; pintar(); pararAnimacion(); NAVE.sonido.acierto(); return; }
        if (cuantas % 2 === 0) NAVE.sonido.tecla();
        pintar();
      }, 110);
    }

    texto.addEventListener('input', pintar);
    pintar();

    return {
      desmontar: function () {
        vivo = false; pararAnimacion();
        if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
      }
    };
  }

  NAVE.demos.tokens = {
    titulo: 'Troceador de texto',
    icono: 'tokens',
    entrada: 'Antes de que la máquina «lea» nada, el texto se parte en trozos, y cada trozo se cambia por un número. Los trozos no se eligen a mano: se aprenden mirando qué letras aparecen juntas una y otra vez.',
    notas: [
      'Baja las fusiones a **0**: todo son letras sueltas. Súbelas: las parejas más repetidas se van soldando.',
      'El punto «·» es el **espacio** de delante de la palabra. Forma parte del trozo.',
      'Las palabras frecuentes acaban siendo *un* trozo; las raras se rompen en muchos. Por eso a un modelo le «cuestan» más los nombres propios y las palabras inventadas.',
      'Este troceador solo ha leído las frases de esta web. Los de verdad han leído bibliotecas enteras, pero trabajan igual.'
    ],
    montar: montar,
    trocear: trocear,
    aprender: aprender
  };
})();
