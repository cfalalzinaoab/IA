/* ==========================================================================
   ICONOS.JS · la señalética de a bordo
   --------------------------------------------------------------------------
   Pictogramas propios dibujados sobre una rejilla de 24 × 24, todos con el
   mismo trazo. NAVE.icono('red') devuelve el SVG como texto; con
   {marco:true} lo mete en la placa redondeada de las señales de la nave.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  var TRAZOS = {
    // --- navegación y mandos ---
    'flecha-der': '<path d="M5 12h13M13 6l6 6-6 6"/>',
    'flecha-izq': '<path d="M19 12H6M11 6l-6 6 6 6"/>',
    'rejilla':    '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    'pantalla':   '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    'notas':      '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
    'salir':      '<path d="M10 4H5v16h5M9 12h11M16 8l4 4-4 4"/>',
    'imprimir':   '<path d="M7 8V3h10v5M7 17H4V9h16v8h-3"/><rect x="7" y="14" width="10" height="7"/>',
    'ayuda':      '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/>',
    'cerrar':     '<path d="M6 6l12 12M18 6L6 18"/>',
    'reloj':      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',

    // --- sistemas ---
    'sonido':     '<path d="M4 9.5h4l5-4.5v14l-5-4.5H4z"/><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
    'silencio':   '<path d="M4 9.5h4l5-4.5v14l-5-4.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
    'lluvia':     '<path d="M6 3v7M6 13v2M12 5v9M12 17v3M18 3v4M18 10v8"/>',
    'consola':    '<rect x="3" y="4" width="18" height="16"/><path d="M7 9l3.5 3L7 15M12.5 15.5H17"/>',
    'aviso':      '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
    'nave':       '<path d="M12 2l4 7v7l3 4H5l3-4V9z"/><path d="M10 20v2M14 20v2M12 9v4"/>',
    'antena':     '<path d="M12 21V11"/><circle cx="12" cy="9" r="2"/><path d="M7.5 13.5a6.4 6.4 0 0 1 0-9M16.5 4.5a6.4 6.4 0 0 1 0 9M8 21h8"/>',

    // --- laboratorio ---
    'red':        '<circle cx="5" cy="7" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 7l3-1.5M7 7.6l3.3 3.4M7 17l3.2-4M7 17.5l3 1M14 5.6l3.4 5M14 12h3M14 18.4l3.4-5"/>',
    'tokens':     '<rect x="3" y="5" width="5" height="6"/><rect x="10" y="5" width="8" height="6"/><rect x="3" y="13" width="9" height="6"/><rect x="14" y="13" width="7" height="6"/>',
    'palabra':    '<path d="M3 8h8M3 12h11M3 16h6"/><path d="M17 5v14M15 5h4M15 19h4"/>',
    'matraz':     '<path d="M9 3h6M10 3v6l-5.5 9.5a1.5 1.5 0 0 0 1.3 2.5h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7.5 15h9"/>',

    // --- tipos de diapositiva ---
    'portada':    '<rect x="3" y="4" width="18" height="16"/><path d="M7 10h10M9 14h6"/>',
    'seccion':    '<path d="M4 6h16M4 18h16"/><path d="M8 12h8"/>',
    'puntos':     '<circle cx="5" cy="7" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="17" r="1.2"/><path d="M9 7h11M9 12h11M9 17h8"/>',
    'texto':      '<path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>',
    'columnas':   '<rect x="3" y="5" width="7.5" height="14"/><rect x="13.500" y="5" width="7.5" height="14"/>',
    'cita':       '<path d="M5 15V9h5v5l-2 4M14 15V9h5v5l-2 4"/>',
    'cifra':      '<path d="M8 4L6 20M16 4l-2 16M4 9h16M3.500 15h16"/>',
    'terminal':   '<rect x="3" y="4" width="18" height="16"/><path d="M7 9l3.5 3L7 15M12.5 15.5H17"/>',
    'imagen':     '<rect x="3" y="4" width="18" height="16"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.5"/>',
    'tabla':      '<rect x="3" y="4" width="18" height="16"/><path d="M3 9.5h18M3 14.5h18M9.5 4v16M15 4v16"/>',
    'cronologia': '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 10V6M12 14v4M18 10V6"/>',
    'pregunta':   '<path d="M8.5 9a3.5 3.5 0 1 1 5 3.100c-1 .6-1.500 1.400-1.500 2.400"/><circle cx="12" cy="18.200" r=".8" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
    'demo':       '<path d="M9 3h6M10 3v6l-5.5 9.5a1.5 1.5 0 0 0 1.3 2.5h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    'cierre':     '<path d="M5 21V4M5 5h13l-3 4 3 4H5"/>',

    // --- tripulación ---
    'gato':       '<path d="M5 20V9L4 4l4.500 3h7L20 4l-1 5v11z"/><path d="M9 12.500h.01M15 12.500h.01M11 16h2"/>',
    'conejo':     '<path d="M9 11V4.500a1.500 1.500 0 0 1 3 0V10M12 10V4.500a1.500 1.500 0 0 1 3 0V11"/><path d="M7 15a5 5 0 0 1 10 0v2a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z"/><path d="M10 15.500h.01M14 15.500h.01"/>'
  };

  NAVE.icono = function (nombre, opciones) {
    opciones = opciones || {};
    var trazo = TRAZOS[nombre] || TRAZOS.aviso;
    var marco = opciones.marco
      ? '<rect x="1" y="1" width="22" height="22" rx="5" fill="none" stroke-width="1.2"/>'
      : '';
    // con marco, el dibujo se encoge para dejar aire a la placa
    var cuerpo = opciones.marco
      ? '<g transform="translate(3.6 3.6) scale(.7)">' + trazo + '</g>'
      : trazo;
    return '<svg class="icono' + (opciones.clase ? ' ' + opciones.clase : '') +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      marco + cuerpo + '</svg>';
  };

  NAVE.iconos = Object.keys(TRAZOS);

  // El emblema de la nave: un hexágono con un ojo de sensor dentro.
  NAVE.emblema = function () {
    return '<svg class="barra__emblema" viewBox="0 0 40 40" fill="none" stroke="currentColor"' +
      ' stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M20 2.500l15 8.700v17.600l-15 8.700-15-8.700V11.200z"/>' +
      '<path d="M20 9l9.500 5.500v11L20 31l-9.500-5.500v-11z" opacity=".45"/>' +
      '<circle cx="20" cy="20" r="4.200" fill="currentColor" stroke="none"/>' +
      '<path d="M5 11.200L20 20l15-8.800M20 20v17.300" opacity=".45"/>' +
      '</svg>';
  };
})();
