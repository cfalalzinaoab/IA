/* ==========================================================================
   LAB.JS · la página del laboratorio
   --------------------------------------------------------------------------
   Monta UN aparato cada vez (el de la pestaña elegida) y desmonta el
   anterior: así la red no sigue entrenando a escondidas mientras se mira el
   troceador. La pestaña va en la dirección (#red, #tokens, #siguiente) para
   poder enlazar a cada aparato desde la portada, la consola o una clase.

   DE FONDO va la misma escena 3D de la portada, pero QUIETA: se pinta, se
   asienta un segundo y se queda como una fotografía. Aquí la máquina es
   para los aparatos (la red entrena sin parar) y no se le quita. Quien
   toque el fondo la verá moverse un par de segundos: es la onda de siempre.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;

  var ORDEN = ['red', 'tokens', 'siguiente'];
  var montado = null;
  var actual = null;

  document.getElementById('emblema').innerHTML = NAVE.emblema();
  NAVE.reloj(document.getElementById('reloj'));

  var mandoSonido = document.getElementById('mando-sonido');
  function pintarSonido() {
    var si = NAVE.sonido.encendido;
    mandoSonido.innerHTML = NAVE.icono(si ? 'sonido' : 'silencio') +
      '<span class="solo-lector">Sonido ' + (si ? 'encendido' : 'apagado') + '</span>';
    mandoSonido.setAttribute('aria-pressed', si ? 'true' : 'false');
  }
  mandoSonido.addEventListener('click', function () { NAVE.sonido.alternar(); pintarSonido(); });
  pintarSonido();

  (function ponerFondo() {
    var lienzo = document.getElementById('fondo');
    var preferencia = NAVE.memoria.leer('visor', 'auto');
    var grande = window.matchMedia && window.matchMedia('(min-width: 1081px) and (hover: hover) and (pointer: fine)').matches;
    if (!lienzo || !NAVE.visor3d || !grande) return;
    if (preferencia === 'plano' || preferencia === 'baja' || !NAVE.memoria.leer('lluvia', true)) return;
    var fondo = NAVE.visor3d.crear(lienzo, {
      calidad: preferencia, nucleo: false, encuadre: 'centro', vineta: 0.7,
      alAgobio: function () { document.documentElement.classList.add('sin-cristal'); }
    });
    if (!fondo) return;
    document.documentElement.classList.add('visor-fondo');
    fondo.vista(3);            // adentrándose en el valle
    fondo.atenuar(0.62);       // a media luz: aquí manda lo de delante
    fondo.fotograma(45);       // se asienta un momento y se queda quieta
  })();

  var pestanas = document.getElementById('pestanas');
  var botones = {};
  ORDEN.forEach(function (id, i) {
    var demo = NAVE.demos[id];
    var boton = el('button', {
      class: 'pestana', type: 'button', role: 'tab', id: 'pestana-' + id,
      'aria-selected': 'false', 'aria-controls': 'banco',
      onclick: function () { elegir(id, true); }
    }, [
      el('span', { html: NAVE.icono(demo.icono, { marco: true }) }),
      el('span', { class: 'pestana__nombre' }, [
        el('span', { class: 'pestana__numero' }, 'Banco 0' + (i + 1)),
        demo.titulo
      ])
    ]);
    botones[id] = boton;
    pestanas.appendChild(boton);
    NAVE.relieve.activar(boton, { inclinacion: 5, giro: 5 });
  });

  // flechas entre pestañas, como manda el teclado
  pestanas.addEventListener('keydown', function (evento) {
    var salto = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
    if (!salto) return;
    var destino = ORDEN[(ORDEN.indexOf(actual) + salto + ORDEN.length) % ORDEN.length];
    elegir(destino, true);
    botones[destino].focus();
    evento.preventDefault();
  });

  function elegir(id, conSonido) {
    if (!NAVE.demos[id]) id = ORDEN[0];
    if (id === actual) return;
    actual = id;
    var demo = NAVE.demos[id];
    if (montado) montado.desmontar();

    ORDEN.forEach(function (otro) {
      botones[otro].setAttribute('aria-selected', String(otro === id));
      botones[otro].tabIndex = otro === id ? 0 : -1;
    });
    document.getElementById('banco').setAttribute('aria-labelledby', 'pestana-' + id);
    document.getElementById('banco-codigo').textContent = 'BANCO 0' + (ORDEN.indexOf(id) + 1);
    document.getElementById('banco-entrada').textContent = demo.entrada;
    NAVE.descifrar(document.getElementById('banco-titulo'), demo.titulo, { duracion: 500 });

    var notas = document.getElementById('notas');
    notas.textContent = '';
    demo.notas.forEach(function (nota) { notas.appendChild(el('li', { html: NAVE.marcas(nota) })); });

    var aparato = document.getElementById('aparato');
    aparato.textContent = '';
    montado = demo.montar(aparato);

    document.title = demo.titulo + ' · Laboratorio';
    if (conSonido) NAVE.sonido.rele();
    try { history.replaceState(null, '', '#' + id); } catch (e) { window.location.hash = id; }
  }

  window.addEventListener('hashchange', function () {
    elegir(window.location.hash.replace('#', ''), false);
  });
  elegir(window.location.hash.replace('#', '') || ORDEN[0], false);
})();
