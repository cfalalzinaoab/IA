/* ==========================================================================
   ARRANQUE.JS · la comprobación de sistemas al entrar
   --------------------------------------------------------------------------
   Una vez por sesión del navegador (no en cada visita a la portada: sería
   insufrible volver de una clase y tragársela otra vez). Se salta con
   cualquier tecla, con un toque o con el botón, y quien tiene pedido
   «reducir movimiento» no la ve nunca. La orden «reiniciar» la repite.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;

  function sistemas(registros) {
    return [
      { nombre: 'MEMORIA PRINCIPAL', estado: 'OK' },
      { nombre: 'NÚCLEO DE INFERENCIA', estado: 'OK' },
      { nombre: 'RED NEURONAL · 3 CAPAS', estado: 'OK' },
      { nombre: 'ARCHIVO DE CLASES · ' + registros + (registros === 1 ? ' REGISTRO' : ' REGISTROS'), estado: 'OK' },
      { nombre: 'SOPORTE VITAL DEL AULA', estado: 'OK' },
      { nombre: 'CAFETERA DE CUBIERTA', estado: 'SIN RESPUESTA', tipo: 'ambar' },
      { nombre: 'ENLACE CON EL PUENTE', estado: 'OK' }
    ];
  }

  function saludo() {
    var hora = new Date().getHours();
    if (hora < 6) return 'BUENAS NOCHES, TRIPULACIÓN.';
    if (hora < 14) return 'BUENOS DÍAS, TRIPULACIÓN.';
    if (hora < 21) return 'BUENAS TARDES, TRIPULACIÓN.';
    return 'BUENAS NOCHES, TRIPULACIÓN.';
  }

  function lanzar(opciones) {
    opciones = opciones || {};
    if (NAVE.calma) return Promise.resolve(false);
    if (!opciones.forzar && NAVE.sesion.leer('arrancado', false)) return Promise.resolve(false);
    NAVE.sesion.guardar('arrancado', true);

    var saltado = false;
    var lista = el('ol', { class: 'arranque__lista' });
    var barra = el('div', { class: 'arranque__barra-relleno' });
    var final = el('p', { class: 'arranque__final rotulo rotulo--fosforo' });
    var capa = el('div', { class: 'arranque', role: 'dialog', 'aria-label': 'Arranque de la nave' }, [
      el('div', { class: 'arranque__caja' }, [
        el('div', { class: 'arranque__cabecera' }, [
          el('span', { html: NAVE.emblema() }),
          el('div', null, [
            el('p', { class: 'rotulo rotulo--fosforo arranque__nombre' }, NAVE.nombre + ' 7000'),
            el('p', { class: 'micro' }, 'Interfaz de a bordo · versión ' + NAVE.version)
          ])
        ]),
        el('div', { class: 'franja-aviso' }),
        lista,
        el('div', { class: 'arranque__barra', 'aria-hidden': 'true' }, barra),
        final,
        el('button', { class: 'boton boton--mini boton--ambar arranque__saltar', type: 'button', onclick: saltar }, 'Saltar · cualquier tecla')
      ])
    ]);

    function saltar() { saltado = true; }
    function alTeclear() { saltado = true; }
    document.addEventListener('keydown', alTeclear);
    capa.addEventListener('pointerdown', alTeclear);

    document.body.appendChild(capa);
    document.body.classList.add('arrancando');
    NAVE.sonido.arranque();

    var todos = sistemas(opciones.registros || 0);

    function pausa(ms) { return saltado ? Promise.resolve() : NAVE.espera(ms); }

    function comprobar(sistema, indice) {
      var nombre = el('span', { class: 'arranque__sistema' });
      var puntos = el('span', { class: 'arranque__puntos', 'aria-hidden': 'true' });
      var estado = el('span', { class: 'arranque__estado' + (sistema.tipo ? ' arranque__estado--' + sistema.tipo : '') });
      lista.appendChild(el('li', { class: 'arranque__fila' }, [nombre, puntos, estado]));
      var tecleo = NAVE.teclear(nombre, sistema.nombre, { porSegundo: 95, directo: saltado });
      return tecleo
        .then(function () { return pausa(sistema.tipo ? 520 : 130 + Math.random() * 160); })
        .then(function () {
          estado.textContent = sistema.estado;
          if (!saltado) { if (sistema.tipo) NAVE.sonido.error(); else NAVE.sonido.pitido(740 + indice * 60, 0.05); }
          barra.style.width = Math.round((indice + 1) / todos.length * 100) + '%';
          return pausa(70);
        });
    }

    return todos.reduce(function (antes, sistema, indice) {
      return antes.then(function () { return comprobar(sistema, indice); });
    }, pausa(350))
      .then(function () {
        if (!saltado) NAVE.sonido.ok();
        return NAVE.descifrar(final, 'INTERFAZ LISTA. ' + saludo(), { directo: saltado });
      })
      .then(function () { return pausa(900); })
      .then(function () {
        document.removeEventListener('keydown', alTeclear);
        capa.classList.add('arranque--fuera');
        document.body.classList.remove('arrancando');
        return NAVE.espera(saltado ? 150 : 500);
      })
      .then(function () {
        if (capa.parentNode) capa.parentNode.removeChild(capa);
        return true;
      });
  }

  NAVE.arranque = { lanzar: lanzar };
})();
