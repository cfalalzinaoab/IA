/* ==========================================================================
   CONSOLA.JS · la línea de órdenes del puente
   --------------------------------------------------------------------------
   Una consola de verdad, pequeña: historial con las flechas, tabulador para
   completar, y un registro de órdenes al que cualquier otra pieza puede
   añadir las suyas con consola.registrar().

   Las órdenes se comparan sin tildes ni mayúsculas («Cárgame» = «cargame»),
   y cada una puede tener alias. Las que llevan `oculta: true` no salen en
   «ayuda»: son los huevos de pascua.

       consola.registrar('cargar', {
         alias: ['abrir'],
         ayuda: 'cargar 03 — abre la clase 03',
         hacer: function (argumentos, consola) { ... }
       });
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;
  var el = NAVE.el;

  function crear(contenedor, opciones) {
    opciones = opciones || {};
    var ordenes = {};          // nombre llano → definición
    var alias = {};            // alias llano → nombre
    var frases = [];           // órdenes que son una frase entera («sigue al conejo blanco»)
    var historial = NAVE.sesion.leer('consola-historial', []);
    var puntero = historial.length;
    var cola = Promise.resolve();

    var registro = el('div', { class: 'consola__registro', role: 'log', 'aria-live': 'polite', tabindex: '0', 'aria-label': 'Salida de la consola' });
    var entrada = el('input', {
      class: 'consola__entrada', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Orden para la nave',
      placeholder: opciones.pista || 'escribe «ayuda»'
    });
    var formulario = el('form', { class: 'consola__linea' }, [
      el('span', { class: 'consola__indicador', 'aria-hidden': 'true' }, opciones.indicador || '>'),
      entrada,
      el('button', { class: 'boton boton--mini consola__enviar', type: 'submit' }, 'Enviar')
    ]);
    contenedor.appendChild(registro);
    contenedor.appendChild(formulario);

    /* ---------- escribir en el registro --------------------------------- */

    function alFondo() { registro.scrollTop = registro.scrollHeight; }

    // Pone una línea de golpe. `clase`: 'eco', 'ok', 'error', 'ambar', 'tenue'.
    function decir(texto, clase) {
      var linea = el('div', { class: 'consola__salida' + (clase ? ' consola__salida--' + clase : '') }, texto);
      registro.appendChild(linea);
      // el registro no crece sin fin: se quedan las últimas 200 líneas
      while (registro.childNodes.length > 200) registro.removeChild(registro.firstChild);
      alFondo();
      return linea;
    }

    // Pone varias líneas una tras otra, con un respiro entre ellas.
    function recitar(lineas, clase, pausa) {
      cola = cola.then(function () {
        return lineas.reduce(function (antes, texto) {
          return antes.then(function () {
            decir(texto, clase);
            return NAVE.calma ? null : NAVE.espera(pausa === undefined ? 45 : pausa);
          });
        }, Promise.resolve());
      });
      return cola;
    }

    // Teclea una línea despacio, como quien responde.
    function escribir(texto, clase, porSegundo) {
      cola = cola.then(function () {
        var linea = decir('', clase);
        return NAVE.teclear(linea, texto, { porSegundo: porSegundo || 55, sonido: true, alEscribir: alFondo });
      });
      return cola;
    }

    function limpiar() { registro.textContent = ''; }

    /* ---------- registrar y ejecutar ------------------------------------ */

    function registrar(nombre, definicion) {
      var llano = NAVE.llano(nombre);
      definicion.nombre = nombre;
      if (llano.indexOf(' ') >= 0) frases.push({ frase: llano, definicion: definicion });
      else ordenes[llano] = definicion;
      (definicion.alias || []).forEach(function (a) {
        var aLlano = NAVE.llano(a);
        if (aLlano.indexOf(' ') >= 0) frases.push({ frase: aLlano, definicion: definicion });
        else alias[aLlano] = llano;
      });
    }

    function buscar(lineaLlana) {
      // primero las frases enteras, de la más larga a la más corta
      var mejores = frases.filter(function (f) {
        return lineaLlana === f.frase || lineaLlana.indexOf(f.frase + ' ') === 0;
      }).sort(function (a, b) { return b.frase.length - a.frase.length; });
      if (mejores.length) {
        return { definicion: mejores[0].definicion, resto: lineaLlana.slice(mejores[0].frase.length).trim() };
      }
      var trozos = lineaLlana.split(/\s+/);
      var primera = trozos[0];
      var nombre = ordenes[primera] ? primera : alias[primera];
      if (!nombre) return null;
      return { definicion: ordenes[nombre], resto: trozos.slice(1).join(' ') };
    }

    function ejecutar(linea, sinEco) {
      // quien viene de otros chats escribe «/ayuda»: la barra se perdona
      linea = String(linea).trim().replace(/^[\/>\s]+/, '');
      if (!linea) return;
      if (!sinEco) decir((opciones.indicador || '>') + ' ' + linea, 'eco');
      var llana = NAVE.llano(linea).replace(/[¿?¡!.,;]/g, '').replace(/\s+/g, ' ').trim();
      var hallada = buscar(llana);
      if (!hallada) {
        NAVE.sonido.error();
        decir('ORDEN NO RECONOCIDA: «' + linea + '». Escribe «ayuda».', 'error');
        return;
      }
      try {
        var argumentos = hallada.resto ? hallada.resto.split(' ') : [];
        hallada.definicion.hacer(argumentos, api, hallada.resto);
      } catch (e) {
        NAVE.sonido.error();
        decir('FALLO DEL SISTEMA: ' + e.message, 'error');
      }
    }

    function ayuda() {
      var nombres = Object.keys(ordenes).filter(function (n) { return !ordenes[n].oculta; }).sort();
      var lineas = ['ÓRDENES DISPONIBLES'];
      nombres.forEach(function (n) {
        lineas.push('  ' + (ordenes[n].ayuda || ordenes[n].nombre));
      });
      lineas.push('Flechas ↑ ↓: historial · Tabulador: completar');
      return lineas;
    }

    /* ---------- teclado -------------------------------------------------- */

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var linea = entrada.value.trim();
      entrada.value = '';
      if (!linea) return;
      if (historial[historial.length - 1] !== linea) historial.push(linea);
      if (historial.length > 50) historial.shift();
      puntero = historial.length;
      NAVE.sesion.guardar('consola-historial', historial);
      NAVE.sonido.rele();
      ejecutar(linea);
    });

    entrada.addEventListener('keydown', function (evento) {
      if (evento.key === 'ArrowUp') {
        if (puntero > 0) { puntero--; entrada.value = historial[puntero]; }
        evento.preventDefault();
      } else if (evento.key === 'ArrowDown') {
        if (puntero < historial.length - 1) { puntero++; entrada.value = historial[puntero]; }
        else { puntero = historial.length; entrada.value = ''; }
        evento.preventDefault();
      } else if (evento.key === 'Tab') {
        var parcial = NAVE.llano(entrada.value);
        if (!parcial || parcial.indexOf(' ') >= 0) return;
        var candidatas = Object.keys(ordenes).filter(function (n) {
          return !ordenes[n].oculta && n.indexOf(parcial) === 0;
        });
        if (candidatas.length === 1) {
          entrada.value = ordenes[candidatas[0]].nombre + ' ';
          evento.preventDefault();
        } else if (candidatas.length > 1) {
          decir(candidatas.join('   '), 'tenue');
          evento.preventDefault();
        }
      } else if (evento.key === 'Escape') {
        entrada.blur();
      } else if (evento.key.length === 1) {
        NAVE.sonido.tecla();
      }
    });

    var api = {
      decir: decir,
      recitar: recitar,
      escribir: escribir,
      limpiar: limpiar,
      registrar: registrar,
      ejecutar: ejecutar,
      ayuda: ayuda,
      enfocar: function () { entrada.focus(); },
      get entrada() { return entrada; },
      get registro() { return registro; }
    };
    return api;
  }

  NAVE.consola = { crear: crear };
})();
