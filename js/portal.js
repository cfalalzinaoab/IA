/* ==========================================================================
   PORTAL.JS · la portada cobra vida
   --------------------------------------------------------------------------
   Orden de las cosas:
     1. se leen clases/indice.js (ya cargado) y, una a una, las clases que
        nombra; la que falle se apunta como avería y no tumba a las demás;
     2. se pintan las bahías, el laboratorio y el estado de la nave;
     3. se monta la consola con sus órdenes;
     4. arranque (una vez por sesión) y, al acabar, el título se descifra.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;

  var catalogo = NAVE.catalogo || { curso: 'Inteligencia artificial', clases: [], proximas: [] };
  var ids = (catalogo.clases || []).map(String);
  var averiadas = [];
  var lluvia = null;
  var consola = null;

  var APARATOS = [
    { id: 'red',       icono: 'red',     nombre: 'Una red que aprende', texto: 'Pon puntos de dos colores y mira cómo una red neuronal aprende a separarlos.' },
    { id: 'tokens',    icono: 'tokens',  nombre: 'Troceador de texto',  texto: 'La máquina no lee palabras: lee trozos. Escribe algo y mira cómo lo parte.' },
    { id: 'siguiente', icono: 'palabra', nombre: 'La palabra siguiente', texto: 'Adivinar qué viene después, una y otra vez. Así escribe un modelo de lenguaje.' }
  ];

  /* ---------- barra superior --------------------------------------------- */

  document.getElementById('emblema').innerHTML = NAVE.emblema();
  NAVE.reloj(document.getElementById('reloj'));

  var mandoSonido = document.getElementById('mando-sonido');
  var mandoLluvia = document.getElementById('mando-lluvia');

  function pintarMandoSonido() {
    var si = NAVE.sonido.encendido;
    mandoSonido.innerHTML = NAVE.icono(si ? 'sonido' : 'silencio') +
      '<span class="solo-lector">Sonido ' + (si ? 'encendido' : 'apagado') + '</span>';
    mandoSonido.setAttribute('aria-pressed', si ? 'true' : 'false');
  }
  function ponerSonido(valor) {
    NAVE.sonido.poner(valor);
    NAVE.sonido.zumbido(true);
    pintarMandoSonido();
    pintarLecturas();
  }
  mandoSonido.addEventListener('click', function () { ponerSonido(!NAVE.sonido.encendido); });
  pintarMandoSonido();

  /* ---------- la lluvia --------------------------------------------------- */

  var lienzo = document.getElementById('lluvia');
  var llueve = NAVE.memoria.leer('lluvia', true);

  function ponerLluvia(valor) {
    llueve = !!valor;
    NAVE.memoria.guardar('lluvia', llueve);
    lienzo.classList.toggle('apagada', !llueve);
    if (llueve) lluvia.seguir(); else lluvia.parar();
    mandoLluvia.setAttribute('aria-pressed', llueve ? 'true' : 'false');
    mandoLluvia.innerHTML = NAVE.icono('lluvia') +
      '<span class="solo-lector">Lluvia de código ' + (llueve ? 'encendida' : 'apagada') + '</span>';
    pintarLecturas();
  }
  lluvia = NAVE.lluvia.crear(lienzo, { celda: 20, conejo: true });
  mandoLluvia.addEventListener('click', function () { ponerLluvia(!llueve); NAVE.sonido.rele(); });

  /* ---------- las lecturas del visor ------------------------------------- */
  // Números que se mueven en las esquinas. No miden nada: son el latido.

  var coordenadas = document.getElementById('visor-coordenadas');
  var lectura = document.getElementById('visor-lectura');
  function tresCifras(n) { return ('00' + n).slice(-3); }
  function latir() {
    var t = Date.now() / 1000;
    coordenadas.textContent = 'RUMBO ' + tresCifras(Math.round(137 + Math.sin(t / 7) * 9)) +
      '° · DERIVA ' + (Math.sin(t / 3) * 0.4).toFixed(2);
    lectura.textContent = 'FLUJO ' + (1180 + Math.round(Math.sin(t / 2) * 60 + Math.random() * 14)) + ' GLIFOS/S';
  }
  latir();
  if (!NAVE.calma) setInterval(latir, 900);

  /* ---------- textos del curso ------------------------------------------- */

  var palabras = String(catalogo.curso || 'Inteligencia artificial').split(' ');
  var lineaUno = palabras.length > 1 ? palabras.slice(0, Math.ceil(palabras.length / 2)).join(' ') : palabras[0];
  var lineaDos = palabras.length > 1 ? palabras.slice(Math.ceil(palabras.length / 2)).join(' ') : '';
  var tituloUno = document.getElementById('titulo-1');
  var tituloDos = document.getElementById('titulo-2');
  tituloUno.textContent = lineaUno;
  tituloDos.textContent = lineaDos;
  document.getElementById('visor-ante').textContent = catalogo.ante || 'Curso';
  document.getElementById('visor-lema').textContent = catalogo.lema || '';
  document.getElementById('pie-curso').textContent = (catalogo.curso || '') + (catalogo.centro ? ' · ' + catalogo.centro : '');
  document.title = 'Puente de mando · ' + (catalogo.curso || 'IA');

  /* ---------- las bahías -------------------------------------------------- */

  function datosDe(clase) {
    var trozos = [];
    if (clase.fecha) trozos.push(NAVE.fechaCorta(clase.fecha));
    trozos.push(clase.diapos.length + (clase.diapos.length === 1 ? ' diapositiva' : ' diapositivas'));
    if (clase.duracion) trozos.push(clase.duracion);
    return trozos.join(' · ');
  }

  function bahiaLista(clase) {
    return el('a', { class: 'modulo', href: 'clase.html?c=' + encodeURIComponent(clase.id) }, [
      el('div', { class: 'modulo__cabeza' }, [
        el('span', { class: 'modulo__num' }, clase.id),
        el('span', { class: 'ficha' }, [el('span', { class: 'piloto' }), 'Disponible'])
      ]),
      el('h3', { class: 'modulo__titulo' }, clase.titulo),
      clase.resumen ? el('p', { class: 'modulo__resumen' }, clase.resumen) : null,
      el('p', { class: 'modulo__datos micro' }, datosDe(clase)),
      el('span', { class: 'modulo__abrir', html: '<span>Abrir clase</span>' + NAVE.icono('flecha-der') })
    ]);
  }

  function bahiaEnEspera(proxima) {
    return el('div', { class: 'modulo modulo--espera' }, [
      el('div', { class: 'modulo__cabeza' }, [
        el('span', { class: 'modulo__num' }, proxima.id),
        el('span', { class: 'ficha' }, [el('span', { class: 'piloto piloto--ambar piloto--late' }), 'En preparación'])
      ]),
      el('h3', { class: 'modulo__titulo' }, proxima.titulo || 'Por anunciar'),
      proxima.resumen ? el('p', { class: 'modulo__resumen' }, proxima.resumen) : null,
      el('p', { class: 'modulo__datos micro' }, proxima.fecha ? NAVE.fechaCorta(proxima.fecha) : 'Fecha por fijar'),
      el('span', { class: 'modulo__abrir' }, 'Aún no está a bordo')
    ]);
  }

  function bahiaAveriada(id) {
    return el('div', { class: 'modulo modulo--espera' }, [
      el('div', { class: 'modulo__cabeza' }, [
        el('span', { class: 'modulo__num' }, id),
        el('span', { class: 'ficha' }, [el('span', { class: 'piloto piloto--rojo' }), 'Avería'])
      ]),
      el('h3', { class: 'modulo__titulo' }, 'No se pudo leer'),
      el('p', { class: 'modulo__resumen' }, 'Falta el archivo clases/clase-' + id + '.js o tiene un error de escritura.')
    ]);
  }

  function bahiaVacia(numero) {
    return el('div', { class: 'modulo modulo--vacia', 'aria-hidden': 'true' }, [
      el('span', { class: 'modulo__num' }, numero),
      el('span', { class: 'micro' }, 'Bahía libre')
    ]);
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  function pintarBahias() {
    var caja = document.getElementById('bahias');
    caja.textContent = '';
    var cuenta = 0;
    ids.forEach(function (id) {
      caja.appendChild(NAVE.clases[id] ? bahiaLista(NAVE.clases[id]) : bahiaAveriada(id));
      cuenta++;
    });
    (catalogo.proximas || []).forEach(function (proxima) {
      caja.appendChild(bahiaEnEspera(proxima));
      cuenta++;
    });
    // siempre queda alguna bahía libre a la vista: la nave tiene sitio
    var libres = Math.max(1, 3 - cuenta);
    for (var i = 0; i < libres; i++) caja.appendChild(bahiaVacia(dos(cuenta + i)));

    var listas = ids.filter(function (id) { return NAVE.clases[id]; }).length;
    document.getElementById('archivo-codigo').textContent =
      'SEC·A / ' + dos(listas) + (listas === 1 ? ' REGISTRO' : ' REGISTROS');

    var ultima = ultimaClase();
    var accion = document.getElementById('accion-ultima');
    if (ultima) {
      accion.textContent = 'Abrir la clase ' + ultima.id;
      accion.href = 'clase.html?c=' + encodeURIComponent(ultima.id);
    }
  }

  function ultimaClase() {
    for (var i = ids.length - 1; i >= 0; i--) if (NAVE.clases[ids[i]]) return NAVE.clases[ids[i]];
    return null;
  }

  /* ---------- el laboratorio --------------------------------------------- */

  (function pintarBancos() {
    var caja = document.getElementById('bancos');
    APARATOS.forEach(function (aparato) {
      caja.appendChild(el('a', { class: 'aparato', href: 'laboratorio.html#' + aparato.id }, [
        el('span', { html: NAVE.icono(aparato.icono, { marco: true }) }),
        el('span', { class: 'aparato__nombre' }, aparato.nombre),
        el('span', { class: 'aparato__texto' }, aparato.texto)
      ]));
    });
  })();

  /* ---------- el estado de la nave --------------------------------------- */

  function pintarLecturas() {
    var caja = document.getElementById('lecturas');
    if (!caja) return;
    var listas = ids.filter(function (id) { return NAVE.clases[id]; });
    var diapos = listas.reduce(function (suma, id) { return suma + NAVE.clases[id].diapos.length; }, 0);
    var ultima = ultimaClase();
    var modo = NAVE.modo.actual();
    var filas = [
      ['Clases a bordo', dos(listas.length)],
      ['Diapositivas', String(diapos)],
      ['Última carga', ultima && ultima.fecha ? NAVE.fechaCorta(ultima.fecha) : '—'],
      ['Sonido', NAVE.sonido.encendido ? 'SÍ' : 'NO', !NAVE.sonido.encendido],
      ['Lluvia', llueve ? 'SÍ' : 'NO', !llueve],
      ['Modo', modo === 'codigo' ? 'CÓDIGO' : modo === 'sala-blanca' ? 'SALA BLANCA' : 'PUENTE', modo !== 'puente']
    ];
    if (averiadas.length) filas.push(['Averías', String(averiadas.length), true]);
    caja.textContent = '';
    filas.forEach(function (fila) {
      caja.appendChild(el('dt', null, fila[0]));
      caja.appendChild(el('dd', { class: fila[2] ? 'ambar' : null }, fila[1]));
    });
  }
  NAVE.bus.oir('tema', pintarLecturas);

  (function pintarSenal() {
    var caja = document.getElementById('senal');
    var tirar = NAVE.azar(42);
    for (var i = 0; i < 28; i++) {
      var barra = el('span');
      barra.style.animationDelay = (-tirar() * 1.8).toFixed(2) + 's';
      barra.style.animationDuration = (1.1 + tirar() * 1.6).toFixed(2) + 's';
      caja.appendChild(barra);
    }
  })();

  /* ---------- la consola -------------------------------------------------- */

  consola = NAVE.consola.crear(document.getElementById('consola-cuerpo'));

  function irA(ruta) {
    NAVE.sonido.ok();
    setTimeout(function () { window.location.href = ruta; }, 320);
  }

  consola.registrar('ayuda', {
    alias: ['help', '?', 'ordenes', 'comandos'],
    ayuda: 'ayuda — esta lista',
    hacer: function () { consola.recitar(consola.ayuda(), 'tenue', 25); }
  });

  consola.registrar('clases', {
    alias: ['archivo', 'lista', 'ls', 'dir'],
    ayuda: 'clases — lo que hay en el archivo',
    hacer: function () {
      var lineas = ['ARCHIVO DE CLASES'];
      ids.forEach(function (id) {
        var clase = NAVE.clases[id];
        lineas.push('  ' + id + '  ' + (clase ? clase.titulo.toUpperCase() : '— AVERÍA —'));
      });
      (catalogo.proximas || []).forEach(function (p) {
        lineas.push('  ' + p.id + '  ' + (p.titulo || 'por anunciar').toUpperCase() + '  (en preparación)');
      });
      if (lineas.length === 1) lineas.push('  (vacío)');
      lineas.push('Para abrir una: cargar 00');
      consola.recitar(lineas, null, 35);
    }
  });

  consola.registrar('cargar', {
    alias: ['abrir', 'clase', 'cd', 'open'],
    ayuda: 'cargar 00 — abre esa clase',
    hacer: function (argumentos) {
      var pedido = (argumentos.join('').match(/\d+/) || [''])[0];
      if (!pedido) { consola.decir('¿Cuál? Por ejemplo: cargar 00', 'ambar'); return; }
      var id = ids.filter(function (i) { return parseInt(i, 10) === parseInt(pedido, 10); })[0];
      if (!id || !NAVE.clases[id]) {
        NAVE.sonido.error();
        consola.decir('NO HAY CLASE ' + pedido + ' EN EL ARCHIVO. Escribe «clases».', 'error');
        return;
      }
      consola.decir('CARGANDO CLASE ' + id + ' · ' + NAVE.clases[id].titulo.toUpperCase() + '…', 'ok');
      irA('clase.html?c=' + encodeURIComponent(id));
    }
  });

  consola.registrar('demo', {
    alias: ['laboratorio', 'lab', 'aparato'],
    ayuda: 'demo red | tokens | palabra — abre un aparato del laboratorio',
    hacer: function (argumentos) {
      var pedido = argumentos.join(' ');
      var destino = /red|neuron/.test(pedido) ? 'red'
        : /token|troc/.test(pedido) ? 'tokens'
        : /palabra|siguiente|predic/.test(pedido) ? 'siguiente' : '';
      consola.decir('ABRIENDO LABORATORIO' + (destino ? ' · ' + destino.toUpperCase() : '') + '…', 'ok');
      irA('laboratorio.html' + (destino ? '#' + destino : ''));
    }
  });

  function siNo(argumentos, actual) {
    var pedido = argumentos.join(' ');
    if (/^(si|on|1|encend|activ)/.test(pedido)) return true;
    if (/^(no|off|0|apag|desactiv|quita)/.test(pedido)) return false;
    return !actual;
  }
  consola.registrar('sonido', {
    alias: ['audio'],
    ayuda: 'sonido si | no — los ruidos de la nave',
    hacer: function (argumentos) {
      ponerSonido(siNo(argumentos, NAVE.sonido.encendido));
      consola.decir('SONIDO ' + (NAVE.sonido.encendido ? 'ENCENDIDO' : 'APAGADO'), 'ok');
    }
  });
  consola.registrar('lluvia', {
    ayuda: 'lluvia si | no — el código del visor',
    hacer: function (argumentos) {
      ponerLluvia(siNo(argumentos, llueve));
      consola.decir('LLUVIA ' + (llueve ? 'ENCENDIDA' : 'APAGADA'), 'ok');
    }
  });

  consola.registrar('estado', {
    alias: ['status', 'informe'],
    ayuda: 'estado — informe de sistemas',
    hacer: function () {
      var listas = ids.filter(function (id) { return NAVE.clases[id]; }).length;
      consola.recitar([
        'INFORME DE SISTEMAS · ' + NAVE.fecha() + ' ' + NAVE.hora(),
        '  ARCHIVO ......... ' + listas + ' clase' + (listas === 1 ? '' : 's') + ' a bordo',
        '  AVERÍAS ......... ' + (averiadas.length ? averiadas.join(', ') : 'ninguna'),
        '  SONIDO .......... ' + (NAVE.sonido.encendido ? 'sí' : 'no'),
        '  LLUVIA .......... ' + (llueve ? 'sí' : 'no'),
        '  MODO ............ ' + NAVE.modo.actual(),
        '  CAFETERA ........ sin respuesta'
      ], null, 40);
    }
  });

  consola.registrar('hora', {
    alias: ['fecha', 'reloj'],
    ayuda: 'hora — fecha y hora de a bordo',
    hacer: function () { consola.decir(NAVE.fecha() + ' // ' + NAVE.hora(), 'ok'); }
  });

  consola.registrar('acerca', {
    alias: ['quien', 'info', 'creditos'],
    ayuda: 'acerca — qué es esto',
    hacer: function () {
      consola.recitar([
        NAVE.nombre + ' 7000 · interfaz de a bordo v' + NAVE.version,
        'Las clases de ' + (catalogo.curso || 'IA') + ', diapositiva a diapositiva.',
        'HTML, CSS y JavaScript escritos a mano. Sin servidor, sin rastreadores.',
        'Las fuentes (Michroma, IBM Plex Mono, VT323) son libres y van a bordo.'
      ], null, 60);
    }
  });

  consola.registrar('limpiar', {
    alias: ['cls', 'clear', 'borrar'],
    ayuda: 'limpiar — vacía la consola',
    hacer: function () { consola.limpiar(); }
  });

  consola.registrar('reiniciar', {
    alias: ['arranque', 'reboot'],
    ayuda: 'reiniciar — repite el arranque',
    hacer: function () {
      consola.decir('REINICIANDO…', 'ambar');
      NAVE.arranque.lanzar({ forzar: true, registros: ids.length }).then(presentarTitulo);
    }
  });

  NAVE.huevos.instalar({ consola: consola, lluvia: lluvia });

  // «/» lleva a la consola desde cualquier parte (si no se está ya escribiendo)
  document.addEventListener('keydown', function (evento) {
    if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    var en = document.activeElement;
    if (en && (en.tagName === 'INPUT' || en.tagName === 'TEXTAREA')) return;
    evento.preventDefault();
    consola.enfocar();
    document.getElementById('consola').scrollIntoView({ block: 'nearest', behavior: NAVE.calma ? 'auto' : 'smooth' });
  });

  /* ---------- puesta en marcha ------------------------------------------- */

  function presentarTitulo() {
    NAVE.descifrar(tituloUno, lineaUno, { duracion: 900 });
    if (lineaDos) NAVE.descifrar(tituloDos, lineaDos, { duracion: 1300 });
  }

  function cargarClases() {
    return Promise.all(ids.map(function (id) {
      return NAVE.cargarGuion(NAVE.rutaClase(id)).then(function () {
        if (!NAVE.clases[id]) averiadas.push(id);
      }, function () { averiadas.push(id); });
    }));
  }

  ponerLluvia(llueve);
  pintarLecturas();

  var arrancado = NAVE.arranque.lanzar({ registros: ids.length });

  cargarClases().then(function () {
    pintarBahias();
    pintarLecturas();
    return arrancado;
  }).then(function (huboArranque) {
    presentarTitulo();
    NAVE.sonido.zumbido(true);
    var listas = ids.length - averiadas.length;
    consola.recitar([
      NAVE.nombre + ' 7000 LISTA.',
      listas + (listas === 1 ? ' clase' : ' clases') + ' en el archivo.' +
        (averiadas.length ? ' Averías: ' + averiadas.join(', ') + '.' : ''),
      'Escribe «ayuda» para ver las órdenes.'
    ], huboArranque ? 'ok' : null, 120);
  });
})();
