/* ==========================================================================
   PORTAL.JS · la portada cobra vida
   --------------------------------------------------------------------------
   Orden de las cosas:
     1. se enciende el visor: en tres dimensiones si el navegador tiene
        WebGL2 (visor3d.js), y si no, la lluvia plana de siempre (lluvia.js);
     2. se leen clases/indice.js (ya cargado) y, una a una, las clases que
        nombra; la que falle se apunta como avería y no tumba a las demás;
     3. se pintan las bahías, el laboratorio y el estado de la nave;
     4. se monta la consola con sus órdenes;
     5. arranque (una vez por sesión) y, al acabar, el título se descifra y
        el núcleo aparece en el visor.

   EL VISOR, DE FONDO. En pantallas grandes con ratón, el lienzo del visor se
   suelta de su sección y pasa a ser el fondo fijo de la página entera
   (html.visor-fondo): los paneles son cristal y la escena se ve detrás. Al
   desplazar la página, la escena sube más despacio que el contenido y baja
   la luz. En móvil el visor se queda en su marco: es más barato.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;
  var raiz = document.documentElement;

  var catalogo = NAVE.catalogo || { curso: 'Inteligencia artificial', clases: [], proximas: [] };
  var ids = (catalogo.clases || []).map(String);
  // las sesiones que ya traen su propia presentación: no hay que cargarlas
  var sesiones = (catalogo.sesiones || []).map(function (s) { s.id = String(s.id); return s; });
  var muestras = (catalogo.muestras || []).map(String);
  var averiadas = [];
  var lluvia = null;       // los mandos del visor, sea el de 3D o el plano
  var visor3d = null;      // lo mismo, pero solo si es el de 3D
  var consola = null;

  var APARATOS = [
    { id: 'red',       icono: 'red',     nombre: 'Una red que aprende', texto: 'Pon puntos de dos colores y mira cómo una red neuronal aprende a separarlos.' },
    { id: 'tokens',    icono: 'tokens',  nombre: 'Troceador de texto',  texto: 'La máquina no lee palabras: lee trozos. Escribe algo y mira cómo lo parte.' },
    { id: 'siguiente', icono: 'palabra', nombre: 'La palabra siguiente', texto: 'Adivinar qué viene después, una y otra vez. Así escribe un modelo de lenguaje.' }
  ];

  function dos(n) { return (n < 10 ? '0' : '') + n; }

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

  /* ---------- el visor ---------------------------------------------------- */

  var seccionVisor = document.getElementById('visor');
  var lienzo = document.getElementById('lluvia');
  var preferencia = NAVE.memoria.leer('visor', 'auto');     // auto | alta | media | baja | plano
  var llueve = NAVE.memoria.leer('lluvia', true);

  if (preferencia !== 'plano' && NAVE.visor3d) {
    visor3d = NAVE.visor3d.crear(lienzo, {
      conejo: true,
      nucleo: false,                      // aparece al acabar el arranque
      escalaNucleo: 0.76,
      encuadreX: 0.5,
      calidad: preferencia,
      alProyectar: pintarHud,
      // si ni a media resolución llega, se le quita el cristal a los paneles
      alAgobio: function () { raiz.classList.add('sin-cristal'); }
    });
    if (!visor3d) {
      // un lienzo que ya ha probado WebGL no sirve para pintar en 2D: se cambia por otro
      var repuesto = lienzo.cloneNode(false);
      lienzo.parentNode.replaceChild(repuesto, lienzo);
      lienzo = repuesto;
    }
  }
  lluvia = visor3d || NAVE.lluvia.crear(lienzo, { celda: 20, conejo: true });
  raiz.classList.toggle('visor-3d', !!visor3d);

  // ¿Cabe el visor de fondo? Pantalla ancha, ratón y una máquina que pueda.
  var consultaFondo = window.matchMedia ? window.matchMedia('(min-width: 1081px) and (hover: hover) and (pointer: fine)') : { matches: false };
  function ponerFondo() {
    var si = !!visor3d && llueve && consultaFondo.matches && preferencia !== 'baja';
    raiz.classList.toggle('visor-fondo', si);
    if (visor3d) visor3d.velo(si ? 0.88 : 0, 0.7);
    alDesplazar();
  }
  if (consultaFondo.addEventListener) consultaFondo.addEventListener('change', ponerFondo);

  function ponerLluvia(valor) {
    llueve = !!valor;
    NAVE.memoria.guardar('lluvia', llueve);
    lienzo.classList.toggle('apagada', !llueve);
    if (llueve) lluvia.seguir(); else lluvia.parar();
    mandoLluvia.setAttribute('aria-pressed', llueve ? 'true' : 'false');
    mandoLluvia.innerHTML = NAVE.icono('lluvia') +
      '<span class="solo-lector">Visor ' + (llueve ? 'encendido' : 'apagado') + '</span>';
    ponerFondo();
    pintarLecturas();
  }
  mandoLluvia.addEventListener('click', function () { ponerLluvia(!llueve); NAVE.sonido.rele(); });

  /* ---------- lo que el visor superpone a la imagen ---------------------- */

  var hud = {
    mira: document.getElementById('hud-mira'),
    cinta: document.getElementById('hud-cinta'),
    dato: document.getElementById('hud-dato'),
    capas: document.getElementById('hud-capas').getElementsByTagName('i'),
    capa: document.getElementById('hud-capa'),
    coordenadas: document.getElementById('visor-coordenadas'),
    lectura: document.getElementById('visor-lectura'),
    lado: 0, capaViva: -1, cuenta: 0, datoPuesto: false
  };
  // Con el lienzo de fondo, sus coordenadas son las de la ventana y las de
  // la mira son las de la sección: este es el desfase entre unas y otras.
  var desfase = { x: 0, y: 0 };

  function alDesplazar() {
    var a = lienzo.getBoundingClientRect(), b = seccionVisor.getBoundingClientRect();
    desfase.x = a.left - b.left;
    desfase.y = a.top - b.top;
    if (visor3d) {
      // de fondo, la escena acompaña al desplazamiento; encajado, se va con su sección
      visor3d.desplazar(raiz.classList.contains('visor-fondo') ? window.scrollY / Math.max(1, window.innerHeight) : 0);
    }
  }
  window.addEventListener('scroll', alDesplazar, { passive: true });
  window.addEventListener('resize', alDesplazar);

  function grados(radianes) { return radianes * 180 / Math.PI; }

  // Lo llama el visor 3D en cada cuadro, con dónde ha caído el núcleo.
  function pintarHud(d) {
    hud.mira.style.transform = 'translate(' + (d.x + desfase.x).toFixed(1) + 'px,' + (d.y + desfase.y).toFixed(1) + 'px)';
    var lado = Math.round(d.r * 2.14);
    if (Math.abs(lado - hud.lado) > 1) {
      hud.lado = lado;
      hud.mira.style.width = hud.mira.style.height = lado + 'px';
      hud.mira.style.margin = (-lado / 2) + 'px 0 0 ' + (-lado / 2) + 'px';
    }
    hud.mira.style.opacity = Math.max(0, d.alfa * d.alfa * (1 - Math.min(1, d.desplazado * 2.6))).toFixed(2);

    // la capa por la que va la señal (0,2 de ola por capa; al final, un respiro)
    var capa = d.ola < 0.8 ? Math.floor(d.ola * 5) : -1;
    if (capa !== hud.capaViva) {
      hud.capaViva = capa;
      for (var i = 0; i < hud.capas.length; i++) hud.capas[i].classList.toggle('viva', i === capa || i === capa + 1);
      hud.capa.textContent = capa < 0 ? 'en reposo' : 'capa ' + (capa + 1) + ' › ' + (capa + 2);
    }
    if (!hud.datoPuesto) {
      hud.datoPuesto = true;
      hud.dato.textContent = d.neuronas + ' neuronas · ' + d.conexiones + ' conexiones';
    }

    var rumbo = ((137 + grados(d.rumbo)) % 360 + 360) % 360;
    hud.cinta.style.backgroundPositionX = (-(rumbo * 5) % 50).toFixed(1) + 'px';
    if (++hud.cuenta % 8 === 0) {
      hud.coordenadas.textContent = 'RUMBO ' + ('00' + Math.round(rumbo)).slice(-3) + '° · CABECEO ' +
        grados(d.cabeceo).toFixed(1).replace('.', ',') + '°';
      hud.lectura.textContent = 'ALTURA ' + d.altura.toFixed(1).replace('.', ',') + ' · ' + Math.round(d.fps) + ' CUADROS/S';
    }
  }

  // Sin 3D, las esquinas llevan unos números que no miden nada: son el latido.
  if (!visor3d) {
    var latir = function () {
      var t = Date.now() / 1000;
      hud.coordenadas.textContent = 'RUMBO ' + ('00' + Math.round(137 + Math.sin(t / 7) * 9)).slice(-3) +
        '° · DERIVA ' + (Math.sin(t / 3) * 0.4).toFixed(2);
      hud.lectura.textContent = 'FLUJO ' + (1180 + Math.round(Math.sin(t / 2) * 60 + Math.random() * 14)) + ' GLIFOS/S';
    };
    latir();
    if (!NAVE.calma) setInterval(latir, 900);
  }

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

  function rutaPase(id) { return 'clase.html?c=' + encodeURIComponent(id); }

  // Una clase de la nave trae sus diapositivas; una sesión, solo su número.
  function numeroDiapos(pieza) {
    return Array.isArray(pieza.diapos) ? pieza.diapos.length : (+pieza.diapos || 0);
  }

  function datosDe(pieza) {
    var trozos = [];
    var diapos = numeroDiapos(pieza);
    if (pieza.fecha) trozos.push(NAVE.fechaCorta(pieza.fecha));
    if (pieza.animaciones) trozos.push(pieza.animaciones + (pieza.animaciones === 1 ? ' animación' : ' animaciones'));
    else if (diapos) trozos.push(diapos + (diapos === 1 ? ' diapositiva' : ' diapositivas'));
    if (pieza.duracion) trozos.push(pieza.duracion);
    return trozos.join(' · ');
  }

  function bahiaLista(pieza, href, abrir) {
    return el('a', { class: 'modulo', href: href }, [
      el('div', { class: 'modulo__cabeza' }, [
        el('span', { class: 'modulo__num' }, pieza.id),
        el('span', { class: 'ficha' }, [el('span', { class: 'piloto' }), 'Disponible'])
      ]),
      el('h3', { class: 'modulo__titulo' }, pieza.titulo),
      pieza.resumen ? el('p', { class: 'modulo__resumen' }, pieza.resumen) : null,
      el('p', { class: 'modulo__datos micro' }, datosDe(pieza)),
      el('span', { class: 'modulo__abrir', html: '<span>' + abrir + '</span>' + NAVE.icono('flecha-der') })
    ]);
  }

  // La de muestra sigue a bordo, pero en una franja baja al final del archivo.
  function bahiaMuestra(clase) {
    return el('a', { class: 'modulo modulo--muestra', href: rutaPase(clase.id) }, [
      el('span', { class: 'modulo__num' }, clase.id),
      el('div', { class: 'modulo__cuerpo' }, [
        el('h3', { class: 'modulo__titulo' }, clase.titulo),
        el('p', { class: 'modulo__datos micro' }, 'Muestra del pase · ' + datosDe(clase))
      ]),
      el('span', { class: 'modulo__abrir', html: '<span>Ver muestra</span>' + NAVE.icono('flecha-der') })
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

  function esMuestra(id) { return muestras.indexOf(id) >= 0 && !!NAVE.clases[id]; }

  function pintarBahias() {
    var caja = document.getElementById('bahias');
    caja.textContent = '';
    var cuenta = 0;
    sesiones.forEach(function (sesion) {
      caja.appendChild(bahiaLista(sesion, sesion.enlace, 'Abrir sesión'));
      cuenta++;
    });
    ids.forEach(function (id) {
      if (esMuestra(id)) return;               // va al final, en pequeño
      caja.appendChild(NAVE.clases[id] ? bahiaLista(NAVE.clases[id], rutaPase(id), 'Abrir clase') : bahiaAveriada(id));
      cuenta++;
    });
    (catalogo.proximas || []).forEach(function (proxima) {
      caja.appendChild(bahiaEnEspera(proxima));
      cuenta++;
    });
    // siempre queda alguna bahía libre a la vista: la nave tiene sitio.
    // Lleva el número que toca después del más alto que haya a bordo.
    var siguiente = sesiones.map(function (s) { return s.id; })
      .concat(ids, (catalogo.proximas || []).map(function (p) { return String(p.id); }))
      .reduce(function (mayor, id) {
        var n = parseInt(id, 10);
        return isNaN(n) ? mayor : Math.max(mayor, n);
      }, -1) + 1;
    var libres = Math.max(1, 3 - cuenta);
    for (var i = 0; i < libres; i++) caja.appendChild(bahiaVacia(dos(siguiente + i)));
    ids.forEach(function (id) { if (esMuestra(id)) caja.appendChild(bahiaMuestra(NAVE.clases[id])); });
    NAVE.relieve.todos('a.modulo:not(.modulo--muestra)', caja);

    var listas = piezasListas(true).length;
    document.getElementById('archivo-codigo').textContent =
      'SEC·A / ' + dos(listas) + (listas === 1 ? ' REGISTRO' : ' REGISTROS');

    var ultima = ultimaPieza();
    var accion = document.getElementById('accion-ultima');
    if (ultima) {
      accion.textContent = (ultima.sesion ? 'Abrir la sesión ' : 'Abrir la clase ') + ultima.pieza.id;
      accion.href = ultima.href;
    }
  }

  // Todo lo que se puede abrir, en el orden del archivo. Las muestras solo
  // cuentan si se piden (o si no hay nada más).
  function piezasListas(conMuestras) {
    var lista = sesiones.map(function (s) { return { pieza: s, href: s.enlace, sesion: true }; });
    ids.forEach(function (id) {
      if (!NAVE.clases[id]) return;
      if (esMuestra(id) && !conMuestras) return;
      lista.push({ pieza: NAVE.clases[id], href: rutaPase(id), sesion: false });
    });
    return lista;
  }

  // La que abre el botón grande: la última que ya se ha dado (fecha de hoy o
  // anterior); si todas están por dar, la primera.
  function ultimaPieza() {
    var lista = piezasListas(false);
    if (!lista.length) lista = piezasListas(true);
    if (!lista.length) return null;
    var ahora = new Date();
    var hoy = ahora.getFullYear() + '-' + dos(ahora.getMonth() + 1) + '-' + dos(ahora.getDate());
    var dadas = lista.filter(function (p) { return !p.pieza.fecha || p.pieza.fecha <= hoy; });
    return dadas.length ? dadas[dadas.length - 1] : lista[0];
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
    NAVE.relieve.todos('.aparato', caja, { inclinacion: 6, giro: 7 });
  })();

  /* ---------- el estado de la nave --------------------------------------- */

  function nombreVisor() {
    if (!llueve) return 'APAGADO';
    if (!visor3d) return 'PLANO';
    return '3D · ' + visor3d.info().calidad.split(' ')[0].toUpperCase();
  }

  function pintarLecturas() {
    var caja = document.getElementById('lecturas');
    if (!caja || !lluvia) return;
    var listas = piezasListas(true);
    var diapos = listas.reduce(function (suma, p) { return suma + numeroDiapos(p.pieza); }, 0);
    var ultima = ultimaPieza();
    var modo = NAVE.modo.actual();
    var filas = [
      ['Clases a bordo', dos(listas.length)],
      ['Diapositivas', String(diapos)],
      ['Última carga', ultima && ultima.pieza.fecha ? NAVE.fechaCorta(ultima.pieza.fecha) : '—'],
      ['Visor', nombreVisor(), !llueve || !visor3d],
      ['Sonido', NAVE.sonido.encendido ? 'SÍ' : 'NO', !NAVE.sonido.encendido],
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
    for (var i = 0; i < 30; i++) {
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
    NAVE.bus.emitir('salida', ruta);
    setTimeout(function () { NAVE.ir(ruta); }, 260);
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
      sesiones.forEach(function (s) {
        lineas.push('  ' + s.id + '  ' + String(s.titulo || '').toUpperCase());
      });
      ids.forEach(function (id) {
        var clase = NAVE.clases[id];
        lineas.push('  ' + id + '  ' + (clase ? clase.titulo.toUpperCase() : '— AVERÍA —') +
          (esMuestra(id) ? '  (muestra)' : ''));
      });
      (catalogo.proximas || []).forEach(function (p) {
        lineas.push('  ' + p.id + '  ' + (p.titulo || 'por anunciar').toUpperCase() + '  (en preparación)');
      });
      if (lineas.length === 1) lineas.push('  (vacío)');
      lineas.push('Para abrir una: cargar ' + (sesiones.length ? sesiones[sesiones.length - 1].id : '00'));
      consola.recitar(lineas, null, 35);
    }
  });

  consola.registrar('cargar', {
    alias: ['abrir', 'clase', 'cd', 'open'],
    ayuda: 'cargar 03 — abre esa sesión o clase',
    hacer: function (argumentos) {
      var pedido = (argumentos.join('').match(/\d+/) || [''])[0];
      if (!pedido) { consola.decir('¿Cuál? Por ejemplo: cargar 00', 'ambar'); return; }
      var sesion = sesiones.filter(function (s) { return parseInt(s.id, 10) === parseInt(pedido, 10); })[0];
      if (sesion) {
        consola.decir('CARGANDO SESIÓN ' + sesion.id + ' · ' + String(sesion.titulo || '').toUpperCase() + '…', 'ok');
        irA(sesion.enlace);
        return;
      }
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

  var CALIDADES = ['auto', 'alta', 'media', 'baja', 'plano'];
  consola.registrar('visor', {
    alias: ['lluvia', 'calidad', 'grafica', 'graficos'],
    ayuda: 'visor si | no | alta | media | baja | auto | plano — el visor y su calidad',
    hacer: function (argumentos) {
      var pedido = argumentos[0] || '';
      if (pedido === '2d') pedido = 'plano';
      if (pedido === '3d') pedido = 'auto';
      if (CALIDADES.indexOf(pedido) >= 0) {
        NAVE.memoria.guardar('visor', pedido);
        consola.decir('VISOR EN «' + pedido.toUpperCase() + '». Reiniciando la interfaz…', 'ok');
        setTimeout(function () { window.location.reload(); }, 700);
        return;
      }
      if (pedido) {
        ponerLluvia(siNo(argumentos, llueve));
        consola.decir('VISOR ' + (llueve ? 'ENCENDIDO' : 'APAGADO'), 'ok');
        return;
      }
      if (!visor3d) {
        consola.recitar([
          'VISOR: lluvia plana, en dos dimensiones.',
          NAVE.visor3d && NAVE.visor3d.disponible()
            ? 'Para el visor en 3D: visor auto'
            : 'Este navegador no tiene WebGL2: no puede con el visor en 3D.'
        ], 'ambar', 60);
        return;
      }
      var i = visor3d.info();
      consola.recitar([
        'VISOR EN TRES DIMENSIONES',
        '  calidad ....... ' + i.calidad,
        '  tarjeta ....... ' + i.tarjeta,
        '  lienzo ........ ' + i.lienzo + ' px',
        '  escena ........ ' + i.escena,
        '  ritmo ......... ' + i.fps + ' cuadros/s',
        '  lluvia ........ ' + i.columnas + ' columnas, ' + i.glifos + ' glifos',
        '  núcleo ........ ' + i.neuronas + ' neuronas, ' + i.conexiones + ' conexiones',
        'Para cambiar: visor alta | media | baja | auto | plano'
      ], null, 30);
    }
  });

  consola.registrar('estado', {
    alias: ['status', 'informe'],
    ayuda: 'estado — informe de sistemas',
    hacer: function () {
      var listas = piezasListas(true).length;
      consola.recitar([
        'INFORME DE SISTEMAS · ' + NAVE.fecha() + ' ' + NAVE.hora(),
        '  ARCHIVO ......... ' + listas + ' clase' + (listas === 1 ? '' : 's') + ' a bordo',
        '  AVERÍAS ......... ' + (averiadas.length ? averiadas.join(', ') : 'ninguna'),
        '  VISOR ........... ' + nombreVisor().toLowerCase(),
        '  SONIDO .......... ' + (NAVE.sonido.encendido ? 'sí' : 'no'),
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
        'HTML, CSS, JavaScript y WebGL escritos a mano. Sin servidor, sin rastreadores.',
        'Las fuentes (Saira, IBM Plex y VT323) son libres y van a bordo.'
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
      if (visor3d) visor3d.nucleo(false);
      NAVE.arranque.lanzar({ forzar: true, registros: sesiones.length + ids.length }).then(presentar);
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

  // Al salir hacia otra página, el visor da el salto mientras el tubo se apaga.
  NAVE.bus.oir('salida', function () {
    if (visor3d) visor3d.salto(null, 520);
  });

  /* ---------- puesta en marcha ------------------------------------------- */

  // El título se resuelve y el núcleo se materializa con una onda.
  function presentar() {
    NAVE.descifrar(tituloUno, lineaUno, { duracion: 900 });
    if (lineaDos) NAVE.descifrar(tituloDos, lineaDos, { duracion: 1300 });
    if (visor3d) {
      visor3d.nucleo(true);
      setTimeout(function () { visor3d.onda(undefined, undefined, 1.2); }, 650);
    }
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

  var arrancado = NAVE.arranque.lanzar({ registros: sesiones.length + ids.length });

  cargarClases().then(function () {
    pintarBahias();
    pintarLecturas();
    return arrancado;
  }).then(function (huboArranque) {
    presentar();
    NAVE.sonido.zumbido(true);
    var listas = sesiones.length + ids.length - averiadas.length;
    consola.recitar([
      NAVE.nombre + ' 7000 LISTA.',
      listas + (listas === 1 ? ' clase' : ' clases') + ' en el archivo.' +
        (averiadas.length ? ' Averías: ' + averiadas.join(', ') + '.' : ''),
      'Escribe «ayuda» para ver las órdenes.'
    ], huboArranque ? 'ok' : null, 120);
  });
})();
