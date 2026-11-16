/* ==========================================================================
   INDICE.JS · qué clases hay a bordo
   --------------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA COLGAR UNA CLASE NUEVA
   (además de la clase misma, claro). Hay dos maneras:

   A. UNA CLASE HECHA PARA LA NAVE (clases/clase-NN.js)
     1. se deja el archivo en esta carpeta con el nombre  clase-NN.js
     2. se añade su número a la lista «clases», entre comillas
     El título, el resumen, la fecha y el número de diapositivas los saca la
     portada de dentro de cada clase: aquí no se repiten.

   B. UNA SESIÓN QUE YA TIENE SU PROPIA PRESENTACIÓN (un HTML hecho aparte)
     1. se deja la carpeta entera en  sesiones/NN/ , tal cual
     2. se añade a la lista «sesiones» con sus datos y el «enlace» al HTML
        que abre la presentación. La bahía la abre sin cambiarle nada.
     Campos: id, titulo, resumen, fecha, duracion, enlace, y el número de
     piezas: «diapos» (diapositivas) o «animaciones».

   Sesiones y clases comparten la numeración: no se repite ningún número.

   «muestras» son clases que siguen a bordo pero salen en pequeño, en una
   franja al final del archivo (como la 00, que enseña lo que sabe hacer el
   pase).

   «proximas» es para anunciar las que aún no están: salen en la portada
   como bahías «en preparación», sin enlace.
       proximas: [ { id: '05', titulo: 'Redes neuronales', fecha: '2026-12-02' } ]
   ========================================================================== */
NAVE.indice({
  curso: 'Inteligencia artificial',
  ante: 'Curso 26-27',
  lema: 'Qué es, cómo aprende y cómo se le habla. Las clases, diapositiva a diapositiva, y un laboratorio para tocarlo todo.',
  centro: '',

  sesiones: [
    {
      id: '01',
      titulo: 'Entendre com funciona la IA',
      resumen: 'Vuit animacions per veure què passa per dins: tokens, vectors, predicció, atenció, entrenament i per què una resposta que sona bé pot ser falsa.',
      fecha: '2026-10-16',
      duracion: '90 min',
      animaciones: 8,
      enlace: 'sesiones/01/IA-S1-00-index.html'
    },
    {
      id: '02',
      titulo: 'Conversar i dirigir el treball',
      resumen: 'Com es porta una conversa amb la IA: resultat, context, aclariments, pla, producció i comprovació, amb casos ficticis per practicar.',
      fecha: '2026-10-30',
      duracion: '90 min',
      diapos: 38,
      enlace: 'sesiones/02/IA-S2-diapositives.html'
    },
    {
      id: '03',
      titulo: 'Fins on arriba Gemini Notebook',
      resumen: 'Un quadern amb fonts pròpies: què en treu Gemini Notebook (xat, àudio, vídeo, mapa) i on s’atura, al costat de Claude i ChatGPT.',
      fecha: '2026-11-13',
      duracion: '90 min',
      diapos: 40,
      enlace: 'sesiones/03/IA-S3-diapositives.html'
    },
    {
      id: '04',
      titulo: 'Investigar i construir un dossier útil',
      resumen: 'Buscar amb el cercador, amb la IA i amb la recerca profunda, comprovar d’on surt cada dada i acabar fent una pàgina HTML pròpia.',
      fecha: '2026-11-27',
      duracion: '90 min',
      diapos: 80,
      enlace: 'sesiones/04/IA-S4-diapositives.html'
    }
  ],

  clases: ['00'],
  muestras: ['00'],

  proximas: []
});
