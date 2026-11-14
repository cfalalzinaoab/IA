/* ==========================================================================
   CLASE 00 · Primer contacto
   --------------------------------------------------------------------------
   Es una clase de verdad y, a la vez, EL MUESTRARIO: usa los catorce tipos
   de diapositiva que sabe pintar el pase. Para escribir una clase nueva lo
   más rápido es copiar este archivo, cambiarle el «id» y vaciarlo.

   LO QUE VALE PARA CUALQUIER DIAPOSITIVA
     tipo    cuál de los catorce (ver más abajo cada uno)
     notas   lo que solo ve quien da la clase, en la ventana del presentador
             (tecla N). Un texto o una lista de párrafos.
     aviso   una nota al pie en ámbar (no la tienen portada, sección ni cita)

   LAS TRES MARCAS DENTRO DE CUALQUIER TEXTO
     *así*     énfasis, en ámbar
     **así**   fuerte, en verde
     `así`     código o palabra técnica, en su cajita
   No se puede escribir HTML: se pinta tal cual, con sus ángulos.
   ========================================================================== */
NAVE.clase({
  id: '00',
  titulo: 'Primer contacto',
  resumen: 'Qué es una inteligencia artificial, qué no lo es, de dónde viene y cómo se le habla.',
  fecha: '2026-11-18',
  duracion: '50 min',

  diapos: [

    /* portada — titulo, subtitulo, ante (la línea pequeña de arriba), pie */
    {
      tipo: 'portada',
      titulo: 'Primer contacto',
      subtitulo: 'Qué es una inteligencia artificial… y qué no lo es.',
      notas: [
        'Antes de empezar: tecla **F** para pantalla completa, **N** para esta ventana de notas.',
        'Preguntar quién ha usado ya un chatbot y para qué. Apuntar dos o tres usos en la pizarra: se vuelve a ellos al final.'
      ]
    },

    /* puntos — titulo, puntos (cada uno se desvela con un avance), entrada.
       Un punto puede ser {t: 'texto', sub: ['detalle', 'detalle']}.
       Con revelar: false salen todos de golpe. */
    {
      tipo: 'puntos',
      titulo: 'Plan de vuelo',
      puntos: [
        'Qué hace *de verdad* una IA cuando contesta',
        'En qué se diferencia de un programa de toda la vida',
        'De dónde ha salido todo esto',
        { t: 'Cómo se le pregunta para que sirva de algo', sub: ['y por qué hay que comprobar lo que dice'] }
      ],
      notas: 'Cuatro paradas. La tercera es la más corta; la segunda y la cuarta son las que importan.'
    },

    /* seccion — numero, titulo, texto. Abre un bloque y da nombre a las
       diapositivas que vienen detrás (sale en la cabecera). */
    {
      tipo: 'seccion',
      numero: '01',
      titulo: 'Qué hace',
      texto: 'Menos de lo que parece. Y por eso mismo, más sorprendente.'
    },

    /* pregunta — pregunta, opciones, correcta (se cuenta desde 0), explicacion.
       Se puede tocar una opción; avanzar desvela la buena. */
    {
      tipo: 'pregunta',
      pregunta: 'Cuando un chatbot te contesta, ¿qué está haciendo en realidad?',
      opciones: [
        'Busca la respuesta en una enorme base de datos',
        'Calcula, trozo a trozo, qué texto es más probable que venga después',
        'Copia lo que encuentra en internet en ese momento',
        'Razona como una persona, solo que más deprisa'
      ],
      correcta: 1,
      explicacion: 'No busca ni copia: **predice**. Ha visto tanto texto que su predicción suele sonar a respuesta. Que *suene* bien no garantiza que *sea* verdad.',
      notas: [
        'Dejar que voten a mano alzada antes de tocar nada. Lo normal es que gane la A o la D.',
        'La C merece un matiz: algunos chatbots **sí** pueden buscar en internet, pero es una herramienta añadida. El modelo, por sí solo, no consulta nada.'
      ]
    },

    /* cifra — cifra, unidad, texto. Un dato solo, enorme. */
    {
      tipo: 'cifra',
      cifra: '1',
      unidad: 'palabra cada vez',
      texto: 'Un modelo de lenguaje no escribe frases: escribe la palabra siguiente. Y luego otra. Y otra.',
      aviso: 'En rigor no son palabras sino *trozos* de palabra (se llaman `tokens`). Lo veremos en el laboratorio.',
      notas: 'Insistir: no hay un plan de la frase entera guardado en ningún sitio. Cada palabra se decide cuando le toca, mirando las anteriores.'
    },

    /* imagen — src, alt, pie. Con «puntos» o «texto» la imagen va a la
       izquierda y el texto a la derecha. Las imágenes viven en img/. */
    {
      tipo: 'imagen',
      titulo: 'El bucle',
      src: 'img/clase-00/bucle.svg',
      alt: 'Esquema: el texto se parte en trozos, el modelo calcula probabilidades, se elige una palabra, se añade al texto y se vuelve a empezar.',
      pie: 'Predecir, elegir, añadir. Y vuelta a empezar, hasta que toca parar.',
      notas: 'Recorrer el dibujo con el dedo, de izquierda a derecha, y luego la flecha de vuelta. Es lo mismo que van a ver moverse en la diapositiva siguiente.'
    },

    /* demo — demo: 'siguiente' | 'tokens' | 'red'. Monta el aparato del
       laboratorio dentro de la diapositiva, funcionando. */
    {
      tipo: 'demo',
      demo: 'siguiente',
      titulo: 'Pruébalo: la palabra siguiente',
      notas: [
        'Pulsar «Una palabra» varias veces, despacio, leyendo las barras en voz alta.',
        'Luego bajar la temperatura a 0 y pulsar «Que escriba sola»: sale siempre lo mismo. Subirla a 2: disparates. Ese mando existe en los chatbots de verdad.',
        'Este modelo solo ha leído 150 frases y solo mira dos palabras. Los de verdad: bibliotecas enteras y miles de palabras. El bucle es el mismo.'
      ]
    },

    /* columnas — izquierda y derecha, cada una con titulo y puntos (o texto).
       «frente» es lo que va en medio. Con revelar: true la derecha espera. */
    {
      tipo: 'columnas',
      titulo: 'Programar frente a entrenar',
      frente: 'VS',
      revelar: true,
      izquierda: {
        titulo: 'Un programa de siempre',
        puntos: [
          'Una persona escribe las **reglas**',
          'Hace exactamente lo que le dijeron',
          'Si falla, se corrige la regla'
        ]
      },
      derecha: {
        titulo: 'Una IA que aprende',
        puntos: [
          'Se le dan **ejemplos**, no reglas',
          'Encuentra el patrón por su cuenta',
          'Si falla, hacen falta más ejemplos, o mejores'
        ]
      },
      notas: 'Ejemplo de pizarra: el filtro de correo basura. Con reglas («si pone PREMIO, a la basura») se queda corto enseguida. Con ejemplos (miles de correos ya marcados) aprende solo.'
    },

    {
      tipo: 'demo',
      demo: 'red',
      titulo: 'Aprender es equivocarse cada vez menos',
      notas: [
        'Pulsar «Entrenar» con «Dos grupos»: lo resuelve en un segundo.',
        'Cambiar a «Espiral» con 2 neuronas: no puede. Subir a 8: puede. Una red pequeña no aprende una forma difícil.',
        'Nadie le ha dicho dónde está la frontera. La ha encontrado midiendo su propio error.'
      ]
    },

    {
      tipo: 'seccion',
      numero: '02',
      titulo: 'De dónde viene',
      texto: 'No es de ayer. Lleva setenta años cociéndose.'
    },

    /* cronologia — hitos: [{fecha, texto}], hasta seis. Cada uno es un paso. */
    {
      tipo: 'cronologia',
      titulo: 'Setenta años en seis fechas',
      hitos: [
        { fecha: '1950', texto: 'Alan Turing se pregunta si una máquina puede pensar y propone una prueba: el *juego de imitación*.' },
        { fecha: '1956', texto: 'En un taller de verano en Dartmouth se estrena el nombre: «inteligencia artificial».' },
        { fecha: '1997', texto: 'Deep Blue, un ordenador de IBM, gana al campeón del mundo de ajedrez, Garri Kaspárov.' },
        { fecha: '2012', texto: 'Una red neuronal, AlexNet, arrasa en un concurso de reconocer imágenes. Empieza la fiebre.' },
        { fecha: '2017', texto: 'Se publica el *transformer*, la arquitectura en la que se basan los modelos de lenguaje de hoy.' },
        { fecha: '2022', texto: 'ChatGPT se abre al público y la IA pasa de los laboratorios a la conversación de la calle.' }
      ],
      notas: 'No hace falta que se aprendan las fechas. La idea: entre 1956 y 2012 hubo décadas enteras de decepción («inviernos»). Lo que cambió no fue una idea genial sino tener datos y ordenadores suficientes.'
    },

    /* cita — cita, autor, fuente */
    {
      tipo: 'cita',
      cita: 'Solo alcanzamos a ver un poco más allá, pero ahí vemos ya mucho por hacer.',
      autor: 'Alan Turing, 1950',
      fuente: 'Última frase de «Computing Machinery and Intelligence». Traducción propia.',
      notas: 'Setenta y tantos años después sigue valiendo, palabra por palabra.'
    },

    {
      tipo: 'seccion',
      numero: '03',
      titulo: 'Cómo se le habla',
      texto: 'La calidad de la respuesta empieza en la pregunta.'
    },

    /* terminal — lineas: [{quien: 'usuario' | 'ia' | 'sistema', texto}].
       Cada línea es un paso y se teclea sola al desvelarse. */
    {
      tipo: 'terminal',
      titulo: 'La misma duda, dos preguntas',
      rotulo: 'ejemplo',
      lineas: [
        { quien: 'usuario', texto: 'Háblame de las redes neuronales.' },
        { quien: 'ia', texto: 'Las redes neuronales artificiales son modelos computacionales inspirados en… (y siguen cuatro párrafos que nadie pidió).' },
        { quien: 'sistema', texto: 'Segundo intento: decir para quién es y cuánto queremos.' },
        { quien: 'usuario', texto: 'Explícame qué es una red neuronal en tres frases, para alguien que no sabe informática. Pon un ejemplo de la vida diaria.' },
        { quien: 'ia', texto: 'Es un programa que aprende de ejemplos en vez de seguir reglas escritas. Como quien aprende a distinguir setas mirando muchas, acaba reconociendo patrones. Tu móvil usa una para saber qué fotos son de tu gato.' }
      ],
      aviso: 'Las respuestas son de muestra, escritas para esta clase. Un chatbot de verdad contestaría algo parecido, nunca idéntico.',
      notas: 'Preguntar qué ha cambiado entre la primera pregunta y la segunda antes de pasar a la tabla.'
    },

    /* tabla — cabecera: [...], filas: [[...], [...]]. La primera columna va resaltada. */
    {
      tipo: 'tabla',
      titulo: 'Los tres mandos de una buena pregunta',
      cabecera: ['Mando', 'Qué le dices', 'Por ejemplo'],
      filas: [
        ['Contexto', 'Quién eres y para quién es la respuesta', '«Doy clase a personas adultas que empiezan con el ordenador»'],
        ['Tarea', 'Qué quieres exactamente, con un verbo claro', '«Resume este texto», «corrige las faltas», «dame tres ideas»'],
        ['Formato', 'Cómo lo quieres: largo, tono, forma', '«En cinco líneas», «en una tabla», «sin tecnicismos»']
      ],
      notas: 'A esto se le llama *prompt*. No hay fórmulas mágicas: es explicarse bien, igual que con una persona que no sabe nada de tu caso.'
    },

    /* texto — parrafos: [...] y, si se quiere, destacado (la frase en caja). */
    {
      tipo: 'texto',
      titulo: 'Lo que no hay que olvidar',
      parrafos: [
        'Una IA **suena igual de segura** cuando acierta que cuando se lo inventa. No tiene un piloto rojo que se encienda al equivocarse.',
        'Así que lo que importa —un dato, una fecha, una dosis, una ley— se comprueba en otro sitio.'
      ],
      destacado: 'Sirve para empezar un trabajo. No para darlo por terminado.',
      notas: 'Volver a los usos apuntados en la pizarra al principio: ¿en cuáles importa que se equivoque?, ¿en cuáles da igual?'
    },

    /* cierre — titulo, texto, tareas: [...] */
    {
      tipo: 'cierre',
      titulo: 'Hasta la próxima',
      texto: 'Para casa, sin prisa:',
      tareas: [
        'Entra en el **laboratorio** y haz que la red aprenda la espiral.',
        'Hazle a un chatbot la misma pregunta dos veces, mal y bien. Compara.',
        'Trae una respuesta de una IA que te haya parecido *sospechosa*.'
      ],
      notas: 'Recordar que la web se queda abierta: las diapositivas y el laboratorio están en la misma dirección.'
    }
  ]
});
