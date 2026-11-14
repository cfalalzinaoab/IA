/* ==========================================================================
   RELIEVE.JS · lo que se inclina bajo el ratón
   --------------------------------------------------------------------------
   Una tarjeta con relieve gira un poco hacia donde está el puntero, como una
   placa que se ladea en la mano, y lleva encima una mancha de luz que lo
   sigue. Lo de dentro puede ir a distintas alturas (translateZ en el CSS):
   al inclinarse la placa, el número se despega del fondo.

   Aquí solo se calculan cuatro números y se dejan en la propia tarjeta como
   variables de CSS; el dibujo lo hace nave.css (.relieve):
       --rx, --ry    cuánto gira, en grados
       --gx, --gy    dónde cae la luz, en tanto por ciento

   Solo con ratón: en una pantalla táctil no hay puntero que seguir. Y nunca
   con «reducir movimiento».

       NAVE.relieve.activar(nodo, { inclinacion: 7, giro: 9 })
       NAVE.relieve.todos('.modulo')
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var conRaton = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };

  function activar(nodo, opciones) {
    if (!nodo || nodo.__relieve) return;
    nodo.__relieve = true;
    opciones = opciones || {};
    var inclinacion = opciones.inclinacion === undefined ? 7 : opciones.inclinacion;
    var giro = opciones.giro === undefined ? 9 : opciones.giro;

    nodo.classList.add('relieve');
    nodo.appendChild(NAVE.el('span', { class: 'relieve__luz', 'aria-hidden': 'true' }));

    var caja = null, pendiente = false, px = 0, py = 0;

    function pintar() {
      pendiente = false;
      if (!caja) return;
      var x = NAVE.limitar((px - caja.left) / caja.width, 0, 1);
      var y = NAVE.limitar((py - caja.top) / caja.height, 0, 1);
      nodo.style.setProperty('--ry', ((x - 0.5) * 2 * giro).toFixed(2) + 'deg');
      nodo.style.setProperty('--rx', ((0.5 - y) * 2 * inclinacion).toFixed(2) + 'deg');
      nodo.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      nodo.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    }

    nodo.addEventListener('pointerenter', function (evento) {
      if (NAVE.calma || !conRaton.matches || evento.pointerType !== 'mouse') return;
      caja = nodo.getBoundingClientRect();      // se mide una vez, antes de inclinarse
      nodo.classList.add('relieve--vivo');
    });
    nodo.addEventListener('pointermove', function (evento) {
      if (!caja) return;
      px = evento.clientX; py = evento.clientY;
      if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); }
    });
    nodo.addEventListener('pointerleave', function () {
      caja = null;
      nodo.classList.remove('relieve--vivo');
      nodo.style.setProperty('--rx', '0deg');
      nodo.style.setProperty('--ry', '0deg');
    });
  }

  NAVE.relieve = {
    activar: activar,
    todos: function (selector, raiz, opciones) {
      var nodos = (raiz || document).querySelectorAll(selector);
      for (var i = 0; i < nodos.length; i++) activar(nodos[i], opciones);
    }
  };
})();
