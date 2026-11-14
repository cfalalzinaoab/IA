/* ==========================================================================
   NUCLEO.JS · lo que comparten todas las páginas del puente
   --------------------------------------------------------------------------
   Todo cuelga de un único objeto global, NAVE. No hay módulos ni compilación:
   las páginas cargan estos archivos con <script> normales, en orden, y por
   eso el sitio funciona igual abierto desde el disco (file://) que colgado.

     NAVE.memoria / NAVE.sesion   preferencias que sobreviven (o no) a cerrar
     NAVE.el()                    fabricar nodos sin innerHTML
     NAVE.marcas()                *énfasis*, **fuerte** y `código` → HTML
     NAVE.descifrar()             un texto que se resuelve glifo a glifo
     NAVE.teclear()               un texto que se escribe solo
     NAVE.bus                     avisos entre piezas que no se conocen
     NAVE.clase() / NAVE.indice() donde se apuntan las clases al cargarse
   ========================================================================== */
(function () {
  'use strict';

  var NAVE = window.NAVE = window.NAVE || {};
  NAVE.version = '1.0';
  NAVE.nombre = 'NODRIZA';

  /* ---------- memoria ---------------------------------------------------- */
  // localStorage y sessionStorage pueden no existir o lanzar (modo privado,
  // cookies bloqueadas). Aquí nunca rompen nada: si fallan, se olvida y ya.

  function almacen(nombre) {
    var caja = null;
    try { caja = window[nombre]; caja.getItem('nave.prueba'); } catch (e) { caja = null; }
    var respaldo = {};
    return {
      leer: function (clave, porDefecto) {
        try {
          var crudo = caja ? caja.getItem('nave.' + clave) : respaldo[clave];
          if (crudo === null || crudo === undefined) return porDefecto;
          return JSON.parse(crudo);
        } catch (e) { return porDefecto; }
      },
      guardar: function (clave, valor) {
        var crudo = JSON.stringify(valor);
        try { if (caja) caja.setItem('nave.' + clave, crudo); else respaldo[clave] = crudo; }
        catch (e) { respaldo[clave] = crudo; }
      }
    };
  }
  NAVE.memoria = almacen('localStorage');
  NAVE.sesion = almacen('sessionStorage');

  /* ---------- calma ------------------------------------------------------ */
  // Quien tiene pedido «reducir movimiento» en su sistema no ve tecleos ni
  // descifrados: el texto aparece puesto y la lluvia no arranca.

  var consultaCalma = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  NAVE.calma = !!(consultaCalma && consultaCalma.matches);
  if (consultaCalma && consultaCalma.addEventListener) {
    consultaCalma.addEventListener('change', function (e) { NAVE.calma = e.matches; });
  }

  /* ---------- utilidades ------------------------------------------------- */

  NAVE.limitar = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  NAVE.espera = function (ms) {
    return new Promise(function (resolver) { setTimeout(resolver, ms); });
  };

  // Generador con semilla (mulberry32): mismo número, misma tirada. Lo usan
  // la lluvia para dibujar siempre el mismo alfabeto y las demos para que
  // «reiniciar» devuelva algo reproducible.
  NAVE.azar = function (semilla) {
    var a = semilla >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // Quita tildes y pasa a minúsculas: «Cárgame» y «cargame» son la misma orden.
  NAVE.llano = function (texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  };

  NAVE.escapar = function (texto) {
    return String(texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // Las tres marcas que entienden los textos de las clases. Primero se
  // escapa todo, luego se marcan: nunca entra HTML escrito en una clase.
  NAVE.marcas = function (texto) {
    return NAVE.escapar(texto)
      .replace(/`([^`]+)`/g, '<code class="m-cod">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="m-fue">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="m-enf">$1</em>');
  };

  // el('div', {class:'x', onclick: f, dataset:{a:1}}, [hijos | texto])
  NAVE.el = function (etiqueta, atributos, hijos) {
    var nodo = document.createElement(etiqueta);
    if (atributos) {
      Object.keys(atributos).forEach(function (clave) {
        var valor = atributos[clave];
        if (valor === null || valor === undefined || valor === false) return;
        if (clave === 'class') nodo.className = valor;
        else if (clave === 'html') nodo.innerHTML = valor;
        else if (clave === 'texto') nodo.textContent = valor;
        else if (clave === 'dataset') Object.keys(valor).forEach(function (d) { nodo.dataset[d] = valor[d]; });
        else if (clave.slice(0, 2) === 'on' && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
        else nodo.setAttribute(clave, valor === true ? '' : valor);
      });
    }
    if (hijos !== undefined && hijos !== null) {
      (Array.isArray(hijos) ? hijos : [hijos]).forEach(function (hijo) {
        if (hijo === null || hijo === undefined || hijo === false) return;
        nodo.appendChild(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
      });
    }
    return nodo;
  };

  NAVE.cargarGuion = function (ruta) {
    return new Promise(function (resolver, rechazar) {
      var guion = document.createElement('script');
      guion.src = ruta;
      guion.onload = function () { resolver(ruta); };
      guion.onerror = function () { rechazar(new Error('No se pudo cargar ' + ruta)); };
      document.head.appendChild(guion);
    });
  };

  NAVE.parametro = function (nombre) {
    try { return new URLSearchParams(window.location.search).get(nombre); }
    catch (e) { return null; }
  };

  /* ---------- bus -------------------------------------------------------- */

  var oyentes = {};
  NAVE.bus = {
    oir: function (asunto, funcion) {
      (oyentes[asunto] = oyentes[asunto] || []).push(funcion);
    },
    emitir: function (asunto, dato) {
      (oyentes[asunto] || []).slice().forEach(function (funcion) {
        try { funcion(dato); } catch (e) { if (window.console) console.error(e); }
      });
    }
  };

  /* ---------- registro de clases ---------------------------------------- */
  // clases/indice.js llama a NAVE.indice({...}) y cada clases/clase-NN.js
  // llama a NAVE.clase({...}). Aquí solo se apuntan.

  NAVE.catalogo = null;
  NAVE.clases = {};

  NAVE.indice = function (catalogo) {
    NAVE.catalogo = catalogo;
  };
  NAVE.clase = function (clase) {
    if (!clase || !clase.id) throw new Error('Una clase necesita «id».');
    clase.diapos = clase.diapos || [];
    NAVE.clases[String(clase.id)] = clase;
    NAVE.bus.emitir('clase-cargada', clase);
  };
  NAVE.rutaClase = function (id) { return 'clases/clase-' + id + '.js'; };

  /* ---------- descifrar -------------------------------------------------- */
  // El texto empieza siendo ruido y se va asentando de izquierda a derecha.
  // Devuelve una promesa que se cumple cuando ha terminado.

  var RUIDO = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/<>+=*:;';

  NAVE.descifrar = function (nodo, texto, opciones) {
    opciones = opciones || {};
    texto = String(texto);
    nodo.setAttribute('aria-label', texto);
    if (NAVE.calma || opciones.directo) {
      nodo.textContent = texto;
      return Promise.resolve();
    }
    var duracion = opciones.duracion || Math.min(1400, 350 + texto.length * 28);
    var inicio = null;
    var vivo = (nodo.__descifrado = (nodo.__descifrado || 0) + 1);
    return new Promise(function (resolver) {
      function cuadro(ahora) {
        if (nodo.__descifrado !== vivo) { resolver(); return; }   // otro descifrado lo ha pisado
        if (inicio === null) inicio = ahora;
        var avance = Math.min(1, (ahora - inicio) / duracion);
        var asentadas = Math.floor(avance * texto.length);
        var salida = texto.slice(0, asentadas);
        for (var i = asentadas; i < texto.length; i++) {
          var letra = texto[i];
          salida += (letra === ' ' || letra === '\n') ? letra
            : RUIDO[(Math.random() * RUIDO.length) | 0];
        }
        nodo.textContent = salida;
        if (avance < 1) requestAnimationFrame(cuadro);
        else { nodo.textContent = texto; resolver(); }
      }
      requestAnimationFrame(cuadro);
    });
  };

  /* ---------- teclear ---------------------------------------------------- */
  // Escribe el texto carácter a carácter. La promesa trae un .cortar() que
  // lo deja escrito de golpe (lo usa el pase cuando se avanza con prisa).

  NAVE.teclear = function (nodo, texto, opciones) {
    opciones = opciones || {};
    texto = String(texto);
    var porSegundo = opciones.porSegundo || 60;
    var cortado = false;
    var promesa;
    if (NAVE.calma || opciones.directo) {
      nodo.textContent = texto;
      promesa = Promise.resolve();
      promesa.cortar = function () {};
      return promesa;
    }
    nodo.textContent = '';
    promesa = new Promise(function (resolver) {
      var puesto = 0, anterior = null, resto = 0;
      function cuadro(ahora) {
        if (cortado) { nodo.textContent = texto; resolver(); return; }
        if (anterior === null) anterior = ahora;
        resto += (ahora - anterior) * porSegundo / 1000;
        anterior = ahora;
        var nuevas = Math.floor(resto);
        if (nuevas > 0) {
          resto -= nuevas;
          puesto = Math.min(texto.length, puesto + nuevas);
          nodo.textContent = texto.slice(0, puesto);
          if (opciones.sonido && NAVE.sonido) NAVE.sonido.tecla();
          if (opciones.alEscribir) opciones.alEscribir();
        }
        if (puesto < texto.length) requestAnimationFrame(cuadro);
        else resolver();
      }
      requestAnimationFrame(cuadro);
    });
    promesa.cortar = function () { cortado = true; };
    return promesa;
  };

  /* ---------- reloj de a bordo ------------------------------------------ */

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  NAVE.hora = function (fecha) {
    fecha = fecha || new Date();
    return dos(fecha.getHours()) + ':' + dos(fecha.getMinutes()) + ':' + dos(fecha.getSeconds());
  };
  NAVE.fecha = function (fecha) {
    fecha = fecha || new Date();
    return dos(fecha.getDate()) + '·' + dos(fecha.getMonth() + 1) + '·' + fecha.getFullYear();
  };

  // Pone en `nodo` la fecha y la hora y las mantiene al segundo.
  NAVE.reloj = function (nodo, soloHora) {
    function pintar() {
      nodo.textContent = soloHora ? NAVE.hora() : NAVE.fecha() + ' // ' + NAVE.hora();
    }
    pintar();
    return setInterval(pintar, 1000);
  };

  // «2026-11-18» → «18 NOV 2026». Si no es una fecha, la devuelve tal cual.
  var MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  NAVE.fechaCorta = function (iso) {
    var partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!partes) return iso || '';
    return partes[3] + ' ' + MESES[parseInt(partes[2], 10) - 1] + ' ' + partes[1];
  };

  /* ---------- avisos flotantes ------------------------------------------ */

  var cajaAvisos = null;
  NAVE.avisar = function (texto, tipo, duracion) {
    if (!cajaAvisos) {
      cajaAvisos = NAVE.el('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(cajaAvisos);
    }
    var aviso = NAVE.el('div', { class: 'aviso' + (tipo ? ' aviso--' + tipo : '') }, texto);
    cajaAvisos.appendChild(aviso);
    setTimeout(function () {
      aviso.classList.add('aviso--sale');
      setTimeout(function () { if (aviso.parentNode) aviso.parentNode.removeChild(aviso); }, 350);
    }, duracion || 4200);
    return aviso;
  };

  /* ---------- modos de la nave ------------------------------------------ */
  // «modo-codigo» (la pastilla roja) se recuerda entre visitas; la sala
  // blanca es pasajera y no se guarda.

  NAVE.modo = {
    codigo: function (encendido) {
      document.documentElement.classList.toggle('modo-codigo', !!encendido);
      NAVE.memoria.guardar('modo-codigo', !!encendido);
      NAVE.bus.emitir('tema', NAVE.modo.actual());
    },
    salaBlanca: function (ms) {
      var raiz = document.documentElement;
      raiz.classList.add('sala-blanca');
      NAVE.bus.emitir('tema', 'sala-blanca');
      setTimeout(function () {
        raiz.classList.remove('sala-blanca');
        NAVE.bus.emitir('tema', NAVE.modo.actual());
      }, ms || 9000);
    },
    actual: function () {
      var clases = document.documentElement.classList;
      if (clases.contains('sala-blanca')) return 'sala-blanca';
      if (clases.contains('modo-codigo')) return 'codigo';
      return 'puente';
    }
  };
  if (NAVE.memoria.leer('modo-codigo', false)) {
    document.documentElement.classList.add('modo-codigo');
  }
})();
