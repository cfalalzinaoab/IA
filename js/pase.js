/* ==========================================================================
   PASE.JS · el motor de las diapositivas
   --------------------------------------------------------------------------
   clase.html?c=03 carga clases/clase-03.js y la pasa. Una clase es solo
   DATOS (título, lista de diapositivas, cada una con su «tipo»); cómo se
   pinta cada tipo está aquí, en PINTORES. Para inventar un tipo nuevo basta
   añadirle un pintor y su CSS: nada más lo necesita saber.

   LA MISMA CLASE SE VE DE TRES MANERAS
     · pase         el escenario de 1600 × 900 que se escala entero a la
                    pantalla, sea un proyector o un portátil: lo que cabe en
                    uno cabe en todos, porque es siempre el mismo dibujo;
     · lectura      todas las diapositivas seguidas, en vertical y con letra
                    de leer. Es lo que ve un móvil de pie, y lo que se imprime;
     · presentador  otra ventana con la diapositiva de ahora, la que viene,
                    las notas y un cronómetro (clase.html?c=03&presentador=1).

   LOS PASOS. Una diapositiva puede desvelarse por partes: cada trozo lleva
   data-paso="n" y «avanzar» sube el paso antes de cambiar de diapositiva.
   Al volver hacia atrás se llega a la anterior con todo ya desvelado.

   TECLAS: → espacio AvPág  avanzar · ← RePág  retroceder · Inicio/Fin
           F pantalla completa · I índice · N presentador · L lectura
           B pantalla en negro · S sonido · ? ayuda · número + Intro  ir a
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;
  var M = NAVE.marcas;
  var E = NAVE.escapar;

  var ANCHO = 1600, ALTO = 900;

  /* ======================================================================
     1. LOS PINTORES: un tipo de diapositiva, una función
     ====================================================================== */

  function titulo(d) {
    return d.titulo ? '<h2 class="d-titulo">' + M(d.titulo) + '</h2>' : '';
  }
  function aviso(d) {
    return d.aviso ? '<p class="d-aviso">' + NAVE.icono('aviso') + '<span>' + M(d.aviso) + '</span></p>' : '';
  }
  function dos(n) { return (n < 10 ? '0' : '') + n; }

  // Una lista de puntos. Cada punto es un texto o {t: 'texto', sub: ['…']}.
  // Si `desde` es un número, cada punto es un paso (desde, desde+1, …).
  function listaPuntos(puntos, desde, clase) {
    var html = '<ul class="d-puntos' + (clase ? ' ' + clase : '') + '">';
    (puntos || []).forEach(function (punto, i) {
      var texto = typeof punto === 'string' ? punto : punto.t;
      var sub = typeof punto === 'string' ? null : punto.sub;
      html += '<li' + (desde ? ' data-paso="' + (desde + i) + '"' : '') + '>' +
        '<span class="d-puntos__marca" aria-hidden="true">' + dos(i + 1) + '</span>' +
        '<div>' + M(texto);
      if (sub && sub.length) {
        html += '<ul class="d-subpuntos">' + sub.map(function (s) { return '<li>' + M(s) + '</li>'; }).join('') + '</ul>';
      }
      html += '</div></li>';
    });
    return html + '</ul>';
  }

  function parrafos(lista) {
    return (lista || []).map(function (p) { return '<p>' + M(p) + '</p>'; }).join('');
  }

  // El contenido de una columna: puede traer título, puntos y/o texto.
  function columna(c, clase, paso) {
    c = c || {};
    return '<div class="d-columna ' + clase + '"' + (paso ? ' data-paso="' + paso + '"' : '') + '>' +
      (c.titulo ? '<h3 class="d-columna__titulo">' + M(c.titulo) + '</h3>' : '') +
      (c.puntos ? listaPuntos(c.puntos, 0, 'd-puntos--prietos') : '') +
      (c.texto ? '<div class="d-prosa">' + parrafos([].concat(c.texto)) + '</div>' : '') +
      '</div>';
  }

  var QUIENES = { usuario: 'TÚ', ia: 'IA', sistema: '::' };
  var LETRAS = 'ABCDEFGH';

  var PINTORES = {

    portada: {
      pintar: function (d, ctx) {
        var clase = ctx.clase;
        return '<div class="d-portada">' +
          '<p class="d-ante">' + E(d.ante || ('Clase ' + clase.id + (clase.fecha ? ' · ' + NAVE.fechaCorta(clase.fecha) : ''))) + '</p>' +
          '<h1 class="d-titulo-xl" data-descifrar>' + E(d.titulo || clase.titulo) + '</h1>' +
          (d.subtitulo ? '<p class="d-sub">' + M(d.subtitulo) + '</p>' : '') +
          '<div class="franja-aviso d-portada__franja"></div>' +
          '<p class="d-portada__pie">' + E(d.pie || (NAVE.catalogo && NAVE.catalogo.curso) || '') + '</p>' +
          '</div>';
      }
    },

    seccion: {
      pintar: function (d) {
        return '<div class="d-seccion">' +
          (d.numero ? '<span class="d-seccion__num" aria-hidden="true">' + E(d.numero) + '</span>' : '') +
          '<div><p class="d-ante">' + E(d.ante || 'Sección') + '</p>' +
          '<h2 class="d-titulo-xl" data-descifrar>' + E(d.titulo || '') + '</h2>' +
          (d.texto ? '<p class="d-sub">' + M(d.texto) + '</p>' : '') + '</div></div>';
      }
    },

    puntos: {
      pasos: function (d) { return d.revelar === false ? 0 : (d.puntos || []).length; },
      pintar: function (d) {
        var cuantos = (d.puntos || []).length;
        var talla = cuantos > 6 ? 'd-puntos--muchos' : cuantos > 4 ? 'd-puntos--medios' : '';
        return titulo(d) + (d.entrada ? '<p class="d-entrada">' + M(d.entrada) + '</p>' : '') +
          listaPuntos(d.puntos, d.revelar === false ? 0 : 1, talla) + aviso(d);
      }
    },

    texto: {
      pintar: function (d) {
        return titulo(d) + '<div class="d-prosa">' + parrafos(d.parrafos || [].concat(d.texto || [])) + '</div>' +
          (d.destacado ? '<p class="d-destacado">' + M(d.destacado) + '</p>' : '') + aviso(d);
      }
    },

    columnas: {
      pasos: function (d) { return d.revelar ? 1 : 0; },
      pintar: function (d) {
        return titulo(d) + '<div class="d-columnas">' +
          columna(d.izquierda, 'd-columna--izq', 0) +
          '<span class="d-columnas__frente" aria-hidden="true">' + E(d.frente || '/') + '</span>' +
          columna(d.derecha, 'd-columna--der', d.revelar ? 1 : 0) +
          '</div>' + aviso(d);
      }
    },

    cita: {
      pintar: function (d) {
        return '<figure class="d-cita"><blockquote><p>' + M(d.cita || '') + '</p></blockquote>' +
          (d.autor ? '<figcaption>' + M(d.autor) + (d.fuente ? '<span class="d-cita__fuente">' + M(d.fuente) + '</span>' : '') + '</figcaption>' : '') +
          '</figure>';
      }
    },

    cifra: {
      pasos: function (d) { return d.texto && d.revelar ? 1 : 0; },
      pintar: function (d) {
        return titulo(d) + '<div class="d-cifra">' +
          '<p class="d-cifra__numero"><span data-descifrar>' + E(d.cifra || '') + '</span>' +
          (d.unidad ? '<span class="d-cifra__unidad">' + E(d.unidad) + '</span>' : '') + '</p>' +
          (d.texto ? '<p class="d-cifra__texto"' + (d.revelar ? ' data-paso="1"' : '') + '>' + M(d.texto) + '</p>' : '') +
          '</div>' + aviso(d);
      }
    },

    terminal: {
      pasos: function (d) { return (d.lineas || []).length; },
      pintar: function (d) {
        var html = titulo(d) + '<div class="d-term"><div class="d-term__barra"><span></span><span></span><span></span>' +
          '<em>' + E(d.rotulo || 'conversación') + '</em></div><div class="d-term__cuerpo">';
        (d.lineas || []).forEach(function (linea, i) {
          var quien = QUIENES[linea.quien] ? linea.quien : 'sistema';
          html += '<div class="d-term__linea d-term__linea--' + quien + '" data-paso="' + (i + 1) + '">' +
            '<span class="d-term__quien">' + QUIENES[quien] + '</span>' +
            '<span class="d-term__texto">' + E(linea.texto || '') + '</span></div>';
        });
        return html + '</div></div>' + aviso(d);
      },
      // al desvelar una línea, se teclea
      alPaso: function (nodo, n, directo, d) {
        var linea = nodo.querySelector('.d-term__linea[data-paso="' + n + '"] .d-term__texto');
        var datos = (d.lineas || [])[n - 1];
        if (!linea || !datos) return null;
        if (directo) { linea.textContent = datos.texto || ''; return null; }
        return NAVE.teclear(linea, datos.texto || '', {
          porSegundo: datos.quien === 'usuario' ? 38 : 110,
          sonido: datos.quien === 'usuario'
        });
      }
    },

    imagen: {
      pintar: function (d) {
        var figura = '<figure class="d-imagen' + (d.marco === false ? '' : ' d-imagen--marco') + '">' +
          '<img src="' + E(d.src || '') + '" alt="' + E(d.alt || d.pie || d.titulo || '') + '" loading="lazy">' +
          (d.pie ? '<figcaption>' + M(d.pie) + '</figcaption>' : '') + '</figure>';
        if (d.puntos || d.texto) {
          return titulo(d) + '<div class="d-imagen-lado">' + figura +
            '<div>' + (d.puntos ? listaPuntos(d.puntos, 0, 'd-puntos--prietos') : '') +
            (d.texto ? '<div class="d-prosa">' + parrafos([].concat(d.texto)) + '</div>' : '') + '</div></div>';
        }
        return titulo(d) + figura;
      }
    },

    tabla: {
      pintar: function (d) {
        var html = titulo(d) + '<div class="d-tabla"><table>';
        if (d.cabecera) {
          html += '<thead><tr>' + d.cabecera.map(function (c) { return '<th scope="col">' + M(c) + '</th>'; }).join('') + '</tr></thead>';
        }
        html += '<tbody>' + (d.filas || []).map(function (fila) {
          return '<tr>' + fila.map(function (celda, i) {
            return i === 0 ? '<th scope="row">' + M(celda) + '</th>' : '<td>' + M(celda) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
        return html + aviso(d);
      }
    },

    cronologia: {
      pasos: function (d) { return d.revelar === false ? 0 : (d.hitos || []).length; },
      pintar: function (d) {
        var conPasos = d.revelar !== false;
        return titulo(d) + '<ol class="d-crono" style="--hitos:' + (d.hitos || []).length + '">' +
          (d.hitos || []).map(function (hito, i) {
            return '<li' + (conPasos ? ' data-paso="' + (i + 1) + '"' : '') + '>' +
              '<span class="d-crono__fecha">' + E(hito.fecha || '') + '</span>' +
              '<span class="d-crono__nudo" aria-hidden="true"></span>' +
              '<p class="d-crono__texto">' + M(hito.texto || '') + '</p></li>';
          }).join('') + '</ol>' + aviso(d);
      }
    },

    pregunta: {
      pasos: function () { return 1; },
      pintar: function (d) {
        return '<p class="d-ante">' + E(d.ante || 'Pregunta') + '</p>' +
          '<h2 class="d-pregunta">' + M(d.pregunta || d.titulo || '') + '</h2>' +
          '<div class="d-opciones">' + (d.opciones || []).map(function (opcion, i) {
            return '<button type="button" class="d-opcion" data-i="' + i + '">' +
              '<span class="d-opcion__letra" aria-hidden="true">' + LETRAS[i] + '</span>' +
              '<span>' + M(opcion) + '</span></button>';
          }).join('') + '</div>' +
          '<div class="d-solucion" aria-live="polite">' +
          (d.explicacion ? '<p>' + M(d.explicacion) + '</p>' : '') + '</div>' +
          '<button type="button" class="boton boton--mini d-ver-respuesta">Ver la respuesta</button>';
      },
      alMontar: function (nodo, d) {
        function resolver() {
          nodo.classList.add('resuelta');
          var buena = nodo.querySelector('.d-opcion[data-i="' + d.correcta + '"]');
          if (buena) buena.classList.add('d-opcion--buena');
        }
        nodo.__resolver = resolver;
        nodo.querySelectorAll('.d-opcion').forEach(function (boton) {
          boton.addEventListener('click', function () {
            var elegida = parseInt(boton.dataset.i, 10);
            nodo.querySelectorAll('.d-opcion').forEach(function (b) { b.classList.remove('d-opcion--mala'); });
            if (elegida === d.correcta) { NAVE.sonido.acierto(); }
            else { boton.classList.add('d-opcion--mala'); NAVE.sonido.fallo(); }
            resolver();
          });
        });
        nodo.querySelector('.d-ver-respuesta').addEventListener('click', resolver);
      },
      alPaso: function (nodo, n) {
        if (n >= 1 && nodo.__resolver) nodo.__resolver();
        else {
          nodo.classList.remove('resuelta');
          nodo.querySelectorAll('.d-opcion').forEach(function (b) { b.classList.remove('d-opcion--buena', 'd-opcion--mala'); });
        }
        return null;
      }
    },

    demo: {
      pintar: function (d) {
        var demo = NAVE.demos && NAVE.demos[d.demo];
        return titulo(d.titulo ? d : { titulo: demo ? demo.titulo : 'Aparato' }) +
          '<div class="d-demo" data-demo="' + E(d.demo || '') + '">' +
          '<div class="d-demo__espera">' + NAVE.icono(demo ? demo.icono : 'matraz', { marco: true }) +
          '<p>' + E(demo ? demo.entrada : 'No existe el aparato «' + d.demo + '».') + '</p>' +
          '<a class="boton boton--ambar" href="laboratorio.html#' + E(d.demo || '') + '">Abrir en el laboratorio</a></div></div>';
      },
      alMontar: function (nodo, d, ctx) {
        var demo = NAVE.demos && NAVE.demos[d.demo];
        if (!demo || !ctx.vivo) return;          // en lectura y en las miniaturas queda el cartel
        var caja = nodo.querySelector('.d-demo');
        caja.textContent = '';
        nodo.__demo = demo.montar(caja, d.opciones || {});
      },
      alSalir: function (nodo) {
        if (nodo.__demo) { nodo.__demo.desmontar(); nodo.__demo = null; }
      }
    },

    cierre: {
      pasos: function (d) { return d.revelar ? (d.tareas || []).length : 0; },
      pintar: function (d) {
        return '<div class="d-cierre">' +
          '<p class="d-ante">' + E(d.ante || 'Fin de la transmisión') + '</p>' +
          '<h2 class="d-titulo-xl" data-descifrar>' + E(d.titulo || 'Hasta la próxima') + '</h2>' +
          (d.texto ? '<p class="d-sub">' + M(d.texto) + '</p>' : '') +
          (d.tareas && d.tareas.length ? '<ul class="d-tareas">' + d.tareas.map(function (t, i) {
            return '<li' + (d.revelar ? ' data-paso="' + (i + 1) + '"' : '') + '><span class="d-tareas__caja" aria-hidden="true"></span><span>' + M(t) + '</span></li>';
          }).join('') + '</ul>' : '') +
          '</div>';
      }
    }
  };

  // Un tipo que no existe no rompe la clase: se pinta lo que se pueda y se avisa.
  function pintorDe(d) {
    return PINTORES[d.tipo] || {
      pintar: function (dd) {
        return titulo(dd) + '<div class="d-prosa">' + parrafos([].concat(dd.texto || dd.parrafos || [])) + '</div>' +
          '<p class="d-aviso">' + NAVE.icono('aviso') + '<span>Tipo de diapositiva desconocido: «' + E(dd.tipo) + '».</span></p>';
      }
    };
  }
  function pasosDe(d) {
    var pintor = pintorDe(d);
    return pintor.pasos ? pintor.pasos(d) : 0;
  }
  // Con qué nombre sale una diapositiva en el índice.
  function nombreDe(d, clase) {
    var crudo = d.titulo || d.pregunta || d.cita || d.cifra || (d.tipo === 'portada' ? clase.titulo : '') || d.tipo;
    return String(crudo).replace(/[*`]/g, '');
  }
  function seccionDe(clase, i) {
    for (var k = i; k >= 0; k--) if (clase.diapos[k].tipo === 'seccion') return clase.diapos[k].titulo || '';
    return '';
  }

  /* ======================================================================
     2. EL ESCENARIO: pinta UNA diapositiva en un marco de 1600 × 900
     ====================================================================== */

  // opciones.vivo: es el escenario de verdad (monta aparatos, teclea, suena);
  //                las miniaturas del presentador no lo son.
  function crearEscenario(contenedor, clase, opciones) {
    opciones = opciones || {};
    var vivo = !!opciones.vivo;
    var total = clase.diapos.length;

    var lienzo = opciones.lluvia ? el('canvas', { class: 'escenario__lluvia', 'aria-hidden': 'true' }) : null;
    var cabIcono = el('span', { class: 'esc-cab__icono' });
    var cabSeccion = el('span', { class: 'esc-cab__seccion' });
    var cuerpo = el('div', { class: 'esc-cuerpo' });
    var progreso = el('div', { class: 'esc-pie__progreso', 'aria-hidden': 'true' });
    var cuenta = el('span', { class: 'esc-pie__cuenta' });
    var reloj = el('span', { class: 'esc-pie__reloj', 'aria-hidden': 'true' });
    var mandos = el('div', { class: 'esc-pie__mandos' });

    var segmentos = clase.diapos.map(function (d) {
      var segmento = el('span', { class: d.tipo === 'seccion' ? 'es-seccion' : null });
      progreso.appendChild(segmento);
      return segmento;
    });

    var raiz = el('div', { class: 'escenario' + (vivo ? '' : ' escenario--mini') }, [
      lienzo,
      el('div', { class: 'escenario__fondo', 'aria-hidden': 'true' }),
      el('header', { class: 'esc-cab' }, [
        cabIcono,
        el('span', { class: 'esc-cab__clase' }, 'IA·' + clase.id + ' // ' + clase.titulo),
        cabSeccion,
        el('span', { class: 'esc-cab__nave' }, [el('span', { class: 'piloto piloto--late' }), ' ' + NAVE.nombre + ' 7000'])
      ]),
      cuerpo,
      el('footer', { class: 'esc-pie' }, [progreso, cuenta, reloj, mandos])
    ]);
    contenedor.appendChild(raiz);
    if (vivo) NAVE.reloj(reloj, true);

    var lluvia = null;
    if (lienzo) {
      lluvia = NAVE.lluvia.crear(lienzo, { celda: 26, velo: 0.07 });
    }

    var actual = null;      // {i, d, pintor, nodo, paso}
    var tecleo = null;      // el tecleo en marcha, si lo hay

    function ajustar() {
      var w = contenedor.clientWidth, h = contenedor.clientHeight;
      if (!w || !h) return;
      var k = Math.min(w / ANCHO, h / ALTO);
      raiz.style.transform = 'translate(' + ((w - ANCHO * k) / 2).toFixed(2) + 'px,' +
        ((h - ALTO * k) / 2).toFixed(2) + 'px) scale(' + k.toFixed(5) + ')';
    }
    ajustar();
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(contenedor);
    window.addEventListener('resize', ajustar);

    function salir() {
      if (!actual) return;
      if (tecleo) { tecleo.cortar(); tecleo = null; }
      if (actual.pintor.alSalir) actual.pintor.alSalir(actual.nodo, actual.d);
      if (actual.nodo.parentNode) actual.nodo.parentNode.removeChild(actual.nodo);
      actual = null;
    }

    // Si lo escrito no cabe en el escenario, se le baja la letra de dos en dos
    // píxeles hasta que quepa (con un suelo: por debajo de 20 ya no se lee
    // desde el fondo del aula, y ahí lo que toca es partir la diapositiva).
    // Lo que aún no se ha desvelado también cuenta: ocupa su sitio.
    function encajar(nodo, d) {
      if (d.tipo === 'demo') return;
      function desborda() {
        if (nodo.scrollHeight > nodo.clientHeight + 2 || nodo.scrollWidth > nodo.clientWidth + 2) return true;
        var cajas = nodo.querySelectorAll('.d-term__cuerpo, .d-columna, .d-imagen-lado > div');
        for (var c = 0; c < cajas.length; c++) {
          if (cajas[c].scrollHeight > cajas[c].clientHeight + 2) return true;
        }
        return false;
      }
      var talla = 34;
      while (talla > 20 && desborda()) { talla -= 2; nodo.style.fontSize = talla + 'px'; }
      if (talla < 34) nodo.dataset.encajada = String(talla);
    }

    function entrar(i, haciaAtras) {
      var d = clase.diapos[i];
      var pintor = pintorDe(d);
      var ctx = { clase: clase, indice: i, vivo: vivo };
      var nodo = el('section', {
        class: 'diapo diapo--' + d.tipo + (haciaAtras ? ' diapo--vuelve' : ''),
        html: pintor.pintar(d, ctx),
        'aria-label': 'Diapositiva ' + (i + 1) + ' de ' + total
      });
      cuerpo.appendChild(nodo);
      actual = { i: i, d: d, pintor: pintor, nodo: nodo, paso: -1 };
      if (pintor.alMontar) pintor.alMontar(nodo, d, ctx);
      encajar(nodo, d);

      // los grandes rótulos entran descifrándose (solo en el escenario de verdad)
      if (vivo && !haciaAtras) {
        nodo.querySelectorAll('[data-descifrar]').forEach(function (rotulo) {
          NAVE.descifrar(rotulo, rotulo.textContent, { duracion: 700 });
        });
      }

      // cabecera, lluvia y barra
      cabIcono.innerHTML = NAVE.icono(PINTORES[d.tipo] ? d.tipo : 'aviso', { marco: true });
      cabSeccion.textContent = d.tipo === 'seccion' ? '' : seccionDe(clase, i);
      var conLluvia = d.tipo === 'portada' || d.tipo === 'seccion' || d.tipo === 'cierre' || d.tipo === 'cita';
      raiz.classList.toggle('con-lluvia', conLluvia);
      if (lluvia) { if (conLluvia && NAVE.memoria.leer('lluvia', true)) lluvia.seguir(); else lluvia.parar(); }
      segmentos.forEach(function (segmento, k) {
        segmento.classList.toggle('hecho', k < i);
        segmento.classList.toggle('ahora', k === i);
      });
      cuenta.textContent = dos(i + 1) + ' / ' + dos(total);
    }

    function ponerPaso(paso, directo) {
      var anterior = actual.paso;
      actual.paso = paso;
      actual.nodo.querySelectorAll('[data-paso]').forEach(function (trozo) {
        var n = parseInt(trozo.dataset.paso, 10);
        trozo.classList.toggle('visto', n <= paso);
        trozo.classList.toggle('ahora', n === paso);
      });
      if (tecleo) { tecleo.cortar(); tecleo = null; }
      if (actual.pintor.alPaso) {
        // avanzar un solo paso se anima; cualquier otro salto se pone de golpe
        var animar = vivo && !directo && paso === anterior + 1 && paso > 0;
        tecleo = actual.pintor.alPaso(actual.nodo, paso, !animar, actual.d);
      }
    }

    return {
      mostrar: function (i, paso, directo) {
        var haciaAtras = !!actual && i < actual.i;
        if (!actual || actual.i !== i) { salir(); entrar(i, haciaAtras); directo = directo || paso > 0; }
        ponerPaso(paso, directo);
      },
      ajustar: ajustar,
      get mandos() { return mandos; },
      get raiz() { return raiz; },
      // si hay un tecleo a medias, lo termina y dice que sí lo había
      rematar: function () {
        if (!tecleo) return false;
        var habia = tecleo; tecleo = null; habia.cortar();
        return true;
      }
    };
  }

  /* ======================================================================
     3. LA LECTURA: todas seguidas, en vertical
     ====================================================================== */

  function pintarLectura(contenedor, clase, alVolver) {
    contenedor.textContent = '';
    contenedor.appendChild(el('header', { class: 'lectura__cab' }, [
      el('p', { class: 'micro' }, 'Clase ' + clase.id + (clase.fecha ? ' · ' + NAVE.fechaCorta(clase.fecha) : '') + ' · ' + clase.diapos.length + ' diapositivas'),
      el('h1', { class: 'lectura__titulo rotulo rotulo--fosforo' }, clase.titulo),
      clase.resumen ? el('p', { class: 'lectura__resumen' }, clase.resumen) : null,
      el('div', { class: 'lectura__mandos' }, [
        el('button', { class: 'boton boton--ambar', type: 'button', onclick: alVolver }, 'Ver como diapositivas'),
        el('button', { class: 'boton', type: 'button', onclick: function () { window.print(); } }, 'Imprimir'),
        el('a', { class: 'boton', href: 'index.html' }, 'Puente')
      ])
    ]));
    clase.diapos.forEach(function (d, i) {
      var pintor = pintorDe(d);
      var ctx = { clase: clase, indice: i, vivo: false, lectura: true };
      var nodo = el('div', { class: 'diapo diapo--' + d.tipo, html: pintor.pintar(d, ctx) });
      contenedor.appendChild(el('article', { class: 'hoja', id: 'hoja-' + (i + 1) }, [
        el('header', { class: 'hoja__cab' }, [
          el('span', { class: 'hoja__num' }, dos(i + 1)),
          el('span', { html: NAVE.icono(PINTORES[d.tipo] ? d.tipo : 'aviso') }),
          el('span', { class: 'micro' }, d.tipo)
        ]),
        nodo
      ]));
      if (pintor.alMontar) pintor.alMontar(nodo, d, ctx);
    });
    contenedor.appendChild(el('p', { class: 'lectura__fin micro' }, '— fin de la clase ' + clase.id + ' —'));
  }

  /* ======================================================================
     4. EL PASE: teclado, índice, ayuda, pantalla completa
     ====================================================================== */

  function iniciarPase(clase) {
    var total = clase.diapos.length;
    var estado = { i: 0, paso: 0 };
    var sala = document.getElementById('sala');
    var cajaLectura = document.getElementById('lectura');
    var escenario = crearEscenario(sala, clase, { vivo: true, lluvia: true });
    var ventanaNotas = null;
    var lecturaPintada = false;
    var marcando = '';        // dígitos tecleados para «ir a»

    document.title = clase.titulo + ' · Clase ' + clase.id;

    /* ---------- moverse -------------------------------------------------- */

    function limitar(i) { return NAVE.limitar(i, 0, total - 1); }

    function pintar(directo) {
      escenario.mostrar(estado.i, estado.paso, directo);
      try { history.replaceState(null, '', '#' + (estado.i + 1)); } catch (e) {}
      contarAlPresentador();
    }
    function ir(i, paso, directo) {
      estado.i = limitar(i);
      estado.paso = NAVE.limitar(paso === undefined ? 0 : paso, 0, pasosDe(clase.diapos[estado.i]));
      pintar(directo);
    }
    function avanzar() {
      if (escenario.rematar()) return;                 // primero se termina lo que se está tecleando
      if (estado.paso < pasosDe(clase.diapos[estado.i])) { estado.paso++; NAVE.sonido.paso(); pintar(false); }
      else if (estado.i < total - 1) { estado.i++; estado.paso = 0; NAVE.sonido.paso(); pintar(false); }
    }
    function retroceder() {
      if (estado.paso > 0) { estado.paso--; NAVE.sonido.atras(); pintar(true); }
      else if (estado.i > 0) {
        estado.i--; estado.paso = pasosDe(clase.diapos[estado.i]);
        NAVE.sonido.atras(); pintar(true);
      }
    }

    /* ---------- capas: índice, ayuda, negro ------------------------------ */

    var capaIndice = document.getElementById('capa-indice');
    var capaAyuda = document.getElementById('capa-ayuda');
    var negro = document.getElementById('negro');

    function abrirCapa(capa) {
      [capaIndice, capaAyuda].forEach(function (c) { c.hidden = c !== capa; });
      var primero = capa.querySelector('[aria-current="true"]') || capa.querySelector('button, a');
      if (primero) primero.focus();
    }
    function cerrarCapas() { capaIndice.hidden = true; capaAyuda.hidden = true; }
    function hayCapa() { return !capaIndice.hidden || !capaAyuda.hidden; }

    function pintarIndice() {
      var rejilla = capaIndice.querySelector('.capa__rejilla');
      rejilla.textContent = '';
      clase.diapos.forEach(function (d, i) {
        rejilla.appendChild(el('button', {
          class: 'tarjeta' + (d.tipo === 'seccion' ? ' tarjeta--seccion' : ''), type: 'button',
          'aria-current': i === estado.i ? 'true' : null,
          onclick: function () { cerrarCapas(); ir(i, 0, true); NAVE.sonido.ok(); }
        }, [
          el('span', { class: 'tarjeta__num' }, dos(i + 1)),
          el('span', { html: NAVE.icono(PINTORES[d.tipo] ? d.tipo : 'aviso') }),
          el('span', { class: 'tarjeta__nombre' }, nombreDe(d, clase))
        ]));
      });
    }
    function alternarIndice() {
      if (!capaIndice.hidden) { cerrarCapas(); return; }
      pintarIndice(); abrirCapa(capaIndice);
    }
    function alternarAyuda() {
      if (!capaAyuda.hidden) { cerrarCapas(); return; }
      abrirCapa(capaAyuda);
    }
    document.querySelectorAll('[data-cerrar]').forEach(function (boton) {
      boton.addEventListener('click', cerrarCapas);
    });

    function pantallaCompleta() {
      var raiz = document.documentElement;
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (raiz.requestFullscreen) raiz.requestFullscreen();
      } catch (e) {}
    }

    /* ---------- lectura -------------------------------------------------- */

    function ponerLectura(si) {
      cerrarCapas();
      if (si && !lecturaPintada) {
        pintarLectura(cajaLectura, clase, function () { ponerLectura(false); });
        lecturaPintada = true;
      }
      document.body.classList.toggle('modo-lectura', si);
      document.body.classList.toggle('modo-pase', !si);
      if (si) {
        var hoja = document.getElementById('hoja-' + (estado.i + 1));
        if (hoja && estado.i > 0) hoja.scrollIntoView();
      } else {
        escenario.ajustar();
      }
    }
    // Antes de imprimir se asegura de que la lectura existe: es lo que se imprime.
    window.addEventListener('beforeprint', function () {
      if (!lecturaPintada) {
        pintarLectura(cajaLectura, clase, function () { ponerLectura(false); });
        lecturaPintada = true;
      }
    });

    /* ---------- presentador --------------------------------------------- */

    function contarAlPresentador() {
      if (!ventanaNotas || ventanaNotas.closed) { ventanaNotas = null; return; }
      try { ventanaNotas.postMessage({ nave: 'pase', tipo: 'estado', i: estado.i, paso: estado.paso }, '*'); } catch (e) {}
    }
    function abrirPresentador() {
      if (ventanaNotas && !ventanaNotas.closed) { ventanaNotas.focus(); return; }
      ventanaNotas = window.open(
        'clase.html?c=' + encodeURIComponent(clase.id) + '&presentador=1',
        'nave-presentador', 'width=1180,height=760');
      if (!ventanaNotas) NAVE.avisar('El navegador ha bloqueado la ventana de notas. Permite las ventanas emergentes para esta página.', 'ambar', 7000);
    }
    window.addEventListener('message', function (evento) {
      var dato = evento.data;
      if (!dato || dato.nave !== 'pase') return;
      if (dato.tipo === 'hola') { ventanaNotas = evento.source; contarAlPresentador(); }
      else if (dato.tipo === 'orden') {
        if (dato.orden === 'avanzar') avanzar();
        else if (dato.orden === 'retroceder') retroceder();
        else if (dato.orden === 'ir') ir(dato.i, 0, true);
      }
    });

    /* ---------- los botones del pie ------------------------------------- */

    function mando(icono, nombre, accion) {
      return el('button', {
        class: 'esc-mando', type: 'button', title: nombre, 'aria-label': nombre,
        html: NAVE.icono(icono), onclick: function () { accion(); this.blur(); }
      });
    }
    function pintarMandoSonido() {
      mandoSonido.innerHTML = NAVE.icono(NAVE.sonido.encendido ? 'sonido' : 'silencio');
      mandoSonido.setAttribute('aria-pressed', String(NAVE.sonido.encendido));
    }
    var mandoSonido = mando('silencio', 'Sonido (S)', function () { NAVE.sonido.alternar(); pintarMandoSonido(); });
    [
      mando('flecha-izq', 'Anterior (←)', retroceder),
      mando('flecha-der', 'Siguiente (→)', avanzar),
      mando('rejilla', 'Índice (I)', alternarIndice),
      mando('texto', 'Modo lectura (L)', function () { ponerLectura(true); }),
      mando('notas', 'Ventana del presentador (N)', abrirPresentador),
      mandoSonido,
      mando('pantalla', 'Pantalla completa (F)', pantallaCompleta),
      mando('ayuda', 'Ayuda (?)', alternarAyuda),
      mando('salir', 'Volver al puente', function () { window.location.href = 'index.html'; })
    ].forEach(function (boton) { escenario.mandos.appendChild(boton); });
    pintarMandoSonido();

    /* ---------- teclado -------------------------------------------------- */

    document.addEventListener('keydown', function (evento) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (document.body.classList.contains('modo-lectura')) {
        if (evento.key === 'Escape' || evento.key.toLowerCase() === 'l') ponerLectura(false);
        return;
      }
      var en = evento.target;
      var escribiendo = en && (en.tagName === 'INPUT' || en.tagName === 'TEXTAREA' || en.isContentEditable);
      if (escribiendo) { if (evento.key === 'Escape') en.blur(); return; }

      var tecla = evento.key;
      if (tecla === 'Escape') {
        if (hayCapa()) cerrarCapas();
        else if (!negro.hidden) negro.hidden = true;
        marcando = '';
        return;
      }
      if (hayCapa()) return;                       // con el índice abierto mandan sus botones
      // «1 2 Intro» lleva a la 12 aunque el foco esté en un botón de un aparato
      if (/^\d$/.test(tecla)) { marcando = (marcando + tecla).slice(-3); return; }
      if (tecla === 'Enter' && marcando) {
        ir(parseInt(marcando, 10) - 1, 0, true); marcando = '';
        evento.preventDefault(); return;
      }
      marcando = '';

      // en un botón o un deslizador, espacio e Intro son suyos
      var enMando = en && (en.tagName === 'BUTTON' || en.tagName === 'A' || en.tagName === 'SELECT');
      if (enMando && (tecla === ' ' || tecla === 'Enter')) return;
      if (en && en.type === 'range' && /^Arrow/.test(tecla)) return;

      switch (tecla) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter':
          avanzar(); evento.preventDefault(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          retroceder(); evento.preventDefault(); break;
        case 'Home': ir(0, 0, true); evento.preventDefault(); break;
        case 'End': ir(total - 1, 0, true); evento.preventDefault(); break;
        case 'f': case 'F': pantallaCompleta(); break;
        case 'i': case 'I': case 'g': case 'G': alternarIndice(); break;
        case 'n': case 'N': abrirPresentador(); break;
        case 'l': case 'L': ponerLectura(true); break;
        case 's': case 'S': NAVE.sonido.alternar(); pintarMandoSonido(); break;
        case 'b': case 'B': case '.': negro.hidden = !negro.hidden; break;
        case '?': case 'h': case 'H': alternarAyuda(); break;
      }
    });
    negro.addEventListener('click', function () { negro.hidden = true; });

    /* ---------- dedo: deslizar ------------------------------------------- */

    var toque = null;
    sala.addEventListener('touchstart', function (evento) {
      var en = evento.target;
      if (en.closest && en.closest('button, a, input, textarea, canvas, .d-demo')) { toque = null; return; }
      toque = { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
    }, { passive: true });
    sala.addEventListener('touchend', function (evento) {
      if (!toque) return;
      var dx = evento.changedTouches[0].clientX - toque.x;
      var dy = evento.changedTouches[0].clientY - toque.y;
      toque = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) avanzar(); else retroceder();
    }, { passive: true });

    /* ---------- arrancar ------------------------------------------------- */

    var desde = parseInt((window.location.hash || '').replace('#', ''), 10);
    ir(isNaN(desde) ? 0 : desde - 1, 0, true);

    // un móvil de pie no puede leer un escenario de 1600: empieza en lectura
    var dePie = window.matchMedia && window.matchMedia('(max-width: 720px) and (orientation: portrait)').matches;
    ponerLectura(!!dePie || NAVE.parametro('lectura') === '1');
  }

  /* ======================================================================
     5. EL PRESENTADOR: la otra ventana
     ====================================================================== */

  function iniciarPresentador(clase) {
    var total = clase.diapos.length;
    var estado = { i: 0, paso: 0 };
    var hayPase = !!window.opener;
    var inicio = null;

    document.body.classList.add('modo-presentador');
    document.title = 'Notas · ' + clase.titulo;

    var cajaAhora = el('div', { class: 'pres__marco' });
    var cajaLuego = el('div', { class: 'pres__marco' });
    var notas = el('div', { class: 'pres__texto' });
    var cuenta = el('span', { class: 'pres__cuenta crt' });
    var crono = el('button', { class: 'pres__crono crt', type: 'button', title: 'Pulsa para poner a cero' }, '00:00');
    var reloj = el('span', { class: 'pres__reloj crt' });
    var enlace = el('span', { class: 'ficha' }, [
      el('span', { class: 'piloto' + (hayPase ? '' : ' piloto--ambar') }),
      hayPase ? 'Enlazado con el pase' : 'Sin pase: va por libre'
    ]);

    document.getElementById('presentador').appendChild(el('div', { class: 'pres' }, [
      el('header', { class: 'pres__barra' }, [
        el('span', { class: 'rotulo rotulo--fosforo pres__titulo' }, 'IA·' + clase.id + ' // ' + clase.titulo),
        enlace, cuenta, crono, reloj
      ]),
      el('section', { class: 'pres__ahora' }, [el('h2', { class: 'micro' }, 'Ahora'), cajaAhora]),
      el('section', { class: 'pres__luego' }, [el('h2', { class: 'micro' }, 'Después'), cajaLuego]),
      el('section', { class: 'pres__notas panel' }, [
        el('div', { class: 'panel__cabecera' }, [el('h2', { class: 'panel__titulo' }, 'Notas')]),
        notas
      ]),
      el('footer', { class: 'pres__mandos' }, [
        el('button', { class: 'boton', type: 'button', onclick: function () { orden('retroceder'); } }, '← Anterior'),
        el('button', { class: 'boton boton--ambar', type: 'button', onclick: function () { orden('avanzar'); } }, 'Siguiente →')
      ])
    ]));

    var ahora = crearEscenario(cajaAhora, clase, {});
    var luego = crearEscenario(cajaLuego, clase, {});
    NAVE.reloj(reloj, true);

    function pintar() {
      var d = clase.diapos[estado.i];
      ahora.mostrar(estado.i, estado.paso, true);
      // lo que viene: el paso siguiente de esta, o la siguiente diapositiva
      if (estado.paso < pasosDe(d)) luego.mostrar(estado.i, estado.paso + 1, true);
      else if (estado.i < total - 1) luego.mostrar(estado.i + 1, 0, true);
      else luego.mostrar(estado.i, estado.paso, true);
      cajaLuego.classList.toggle('pres__marco--fin', estado.i === total - 1 && estado.paso >= pasosDe(d));

      cuenta.textContent = dos(estado.i + 1) + ' / ' + dos(total);
      notas.textContent = '';
      var texto = d.notas ? [].concat(d.notas) : [];
      if (!texto.length) notas.appendChild(el('p', { class: 'tenue' }, 'Esta diapositiva no tiene notas.'));
      texto.forEach(function (parrafo) { notas.appendChild(el('p', { html: M(parrafo) })); });
    }

    function local(cual) {
      if (cual === 'avanzar') {
        if (estado.paso < pasosDe(clase.diapos[estado.i])) estado.paso++;
        else if (estado.i < total - 1) { estado.i++; estado.paso = 0; }
      } else {
        if (estado.paso > 0) estado.paso--;
        else if (estado.i > 0) { estado.i--; estado.paso = pasosDe(clase.diapos[estado.i]); }
      }
      pintar();
    }
    function orden(cual) {
      if (inicio === null) inicio = Date.now();
      if (hayPase && window.opener && !window.opener.closed) {
        try { window.opener.postMessage({ nave: 'pase', tipo: 'orden', orden: cual }, '*'); return; } catch (e) {}
      }
      local(cual);
    }

    window.addEventListener('message', function (evento) {
      var dato = evento.data;
      if (!dato || dato.nave !== 'pase' || dato.tipo !== 'estado') return;
      if (inicio === null && (dato.i !== 0 || dato.paso !== 0)) inicio = Date.now();
      estado.i = NAVE.limitar(dato.i, 0, total - 1);
      estado.paso = dato.paso;
      pintar();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      switch (evento.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter':
          if (evento.target.tagName === 'BUTTON' && (evento.key === ' ' || evento.key === 'Enter')) return;
          orden('avanzar'); evento.preventDefault(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          orden('retroceder'); evento.preventDefault(); break;
      }
    });

    crono.addEventListener('click', function () { inicio = Date.now(); pintarCrono(); });
    function pintarCrono() {
      var segundos = inicio === null ? 0 : Math.floor((Date.now() - inicio) / 1000);
      crono.textContent = dos(Math.floor(segundos / 60)) + ':' + dos(segundos % 60);
    }
    setInterval(pintarCrono, 500);

    pintar();
    if (hayPase) {
      try { window.opener.postMessage({ nave: 'pase', tipo: 'hola' }, '*'); } catch (e) {}
    }
  }

  /* ======================================================================
     6. CARGAR LA CLASE
     ====================================================================== */

  function averia(texto) {
    document.body.classList.add('modo-averia');
    document.getElementById('averia').appendChild(el('div', { class: 'averia panel panel--ambar' }, [
      el('div', { class: 'franja-aviso' }),
      el('div', { class: 'averia__cuerpo' }, [
        el('p', { class: 'rotulo rotulo--ambar' }, 'Clase no encontrada'),
        el('p', null, texto),
        el('a', { class: 'boton', href: 'index.html' }, 'Volver al puente')
      ])
    ]));
  }

  var id = NAVE.parametro('c');
  if (!id || !/^[\w-]{1,24}$/.test(id)) {
    averia('La dirección no dice qué clase abrir. Tiene que acabar en algo como clase.html?c=00.');
    return;
  }
  NAVE.cargarGuion(NAVE.rutaClase(id)).then(function () {
    var clase = NAVE.clases[id];
    if (!clase || !clase.diapos.length) {
      averia('El archivo clases/clase-' + id + '.js se ha cargado, pero dentro no hay ninguna diapositiva.');
      return;
    }
    if (NAVE.parametro('presentador') === '1') iniciarPresentador(clase);
    else iniciarPase(clase);
  }, function () {
    averia('No existe la clase «' + id + '» en el archivo (falta clases/clase-' + id + '.js).');
  });

  NAVE.pase = { PINTORES: PINTORES, pasosDe: pasosDe };
})();
