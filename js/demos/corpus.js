/* ==========================================================================
   CORPUS.JS · lo único que han «leído» los aparatos del laboratorio
   --------------------------------------------------------------------------
   Unas ciento cincuenta frases escritas para esta web. De aquí aprenden el
   troceador (qué letras van juntas a menudo) y el adivinador de la palabra
   siguiente (qué palabra suele venir detrás de cuáles).

   Están escritas A PROPÓSITO con muletillas que se repiten —«la máquina
   aprende», «el gato duerme», «la nave viaja»— porque un modelo tan pequeño
   solo puede aprender lo que ve muchas veces. Un modelo de verdad ha leído
   miles de millones de frases; este, las de este archivo. Esa diferencia es
   justo lo que se enseña con él.

   Si se añaden frases, los aparatos aprenden de ellas sin tocar nada más.
   ========================================================================== */
(function () {
  'use strict';
  window.NAVE.corpus = [
    // --- la máquina ---
    'La máquina aprende de los datos.',
    'La máquina aprende de los ejemplos que le damos.',
    'La máquina aprende despacio al principio y deprisa al final.',
    'La máquina no entiende las palabras, calcula probabilidades.',
    'La máquina no piensa como una persona.',
    'La máquina no sabe nada, pero adivina muy bien.',
    'La máquina adivina la palabra siguiente.',
    'La máquina adivina la palabra siguiente una y otra vez.',
    'La máquina lee trozos de palabras y no palabras enteras.',
    'La máquina lee millones de frases antes de escribir una.',
    'La máquina escribe una palabra y luego otra palabra.',
    'La máquina escribe deprisa, pero no siempre dice la verdad.',
    'La máquina se equivoca cuando no ha visto ejemplos.',
    'La máquina se equivoca con mucha seguridad.',
    'La máquina repite lo que ha visto muchas veces.',
    'La máquina necesita muchos datos para aprender.',
    'La máquina necesita muchos ejemplos y mucha energía.',
    'La máquina responde a la pregunta que le hacemos.',
    'La máquina responde mejor cuando la pregunta es clara.',
    'Una máquina que aprende no es una máquina que piensa.',

    // --- la inteligencia artificial ---
    'La inteligencia artificial aprende de los datos.',
    'La inteligencia artificial aprende de los ejemplos y no de las reglas.',
    'La inteligencia artificial no es magia, es estadística.',
    'La inteligencia artificial no es magia, es mucha estadística y muchos datos.',
    'La inteligencia artificial escribe textos, dibuja imágenes y traduce frases.',
    'La inteligencia artificial puede ayudar a las personas.',
    'La inteligencia artificial puede equivocarse y hay que comprobar lo que dice.',
    'La inteligencia artificial es una herramienta y no una persona.',
    'La inteligencia artificial es una herramienta que hay que aprender a usar.',
    'La inteligencia artificial está en el teléfono, en el coche y en la clase.',
    'La inteligencia artificial repite los errores de los datos.',
    'La inteligencia artificial calcula qué palabra viene después.',

    // --- la red neuronal ---
    'Una red neuronal aprende de los ejemplos.',
    'Una red neuronal aprende poco a poco.',
    'Una red neuronal es una fila de números que se ajustan.',
    'Una red neuronal tiene capas y cada capa tiene neuronas.',
    'Una red neuronal se equivoca, mide el error y se corrige.',
    'Una red neuronal no tiene reglas escritas por una persona.',
    'La red neuronal ajusta los pesos para reducir el error.',
    'La red neuronal mide el error y ajusta los pesos.',
    'La red neuronal ve muchos ejemplos y encuentra un patrón.',
    'La red neuronal encuentra un patrón en los datos.',
    'Cada neurona suma lo que recibe y decide si se enciende.',
    'Cada neurona hace una cuenta muy sencilla.',
    'Cada capa de la red aprende una cosa distinta.',
    'Los pesos de la red son números que se ajustan poco a poco.',
    'El error de la red baja cuando la red aprende.',
    'El error baja despacio al principio y deprisa al final.',

    // --- los datos y las palabras ---
    'Los datos son los ejemplos de los que aprende la máquina.',
    'Los datos son textos, imágenes y números.',
    'Los datos tienen errores y la máquina aprende los errores.',
    'Los datos vienen de las personas.',
    'Los ejemplos enseñan a la máquina lo que las reglas no pueden.',
    'Un modelo de lenguaje adivina la palabra siguiente.',
    'Un modelo de lenguaje ha leído millones de frases.',
    'Un modelo de lenguaje no sabe si lo que dice es verdad.',
    'Un modelo de lenguaje calcula la probabilidad de cada palabra.',
    'El modelo escribe la palabra más probable.',
    'El modelo escribe una palabra, la lee y escribe la siguiente.',
    'El modelo no copia, calcula.',
    'La palabra siguiente depende de las palabras de antes.',
    'La palabra más probable no siempre es la mejor palabra.',
    'Las palabras se parten en trozos antes de entrar en la máquina.',
    'Los trozos de palabras se llaman tokens.',
    'Un token es un trozo de palabra.',
    'Un token puede ser una palabra entera o solo una letra.',
    'La temperatura decide si el modelo arriesga o va a lo seguro.',
    'Con poca temperatura el modelo repite siempre lo mismo.',
    'Con mucha temperatura el modelo dice cosas raras.',

    // --- la pregunta ---
    'Una buena pregunta da una buena respuesta.',
    'Una pregunta clara da una respuesta clara.',
    'Una pregunta corta da una respuesta corta.',
    'La pregunta que le hacemos a la máquina se llama prompt.',
    'Un buen prompt dice qué queremos y para quién es.',
    'Un buen prompt da ejemplos de lo que queremos.',
    'La respuesta depende de la pregunta.',
    'La respuesta de la máquina hay que leerla con cuidado.',
    'Hay que comprobar lo que dice la máquina.',
    'Hay que comprobar los datos antes de fiarse de la respuesta.',
    'Hay que aprender a preguntar.',

    // --- la nave ---
    'La nave viaja entre las estrellas.',
    'La nave viaja despacio y en silencio.',
    'La nave viaja de noche y nadie mira por la ventana.',
    'La nave lleva la carga a casa.',
    'La nave lleva siete personas y un gato.',
    'La nave tiene un ordenador que habla con la tripulación.',
    'La nave está en silencio y la tripulación duerme.',
    'La nave se despierta cuando llega una señal.',
    'El ordenador de la nave responde a la tripulación.',
    'El ordenador de la nave no duerme nunca.',
    'El ordenador de la nave lee los datos y calcula el rumbo.',
    'El ordenador calcula el rumbo de la nave.',
    'El ordenador no sabe nada del gato.',
    'La tripulación duerme mientras la nave viaja.',
    'La tripulación se despierta y pregunta dónde está.',
    'La tripulación pregunta al ordenador y el ordenador responde.',
    'La tripulación no sabe de dónde viene la señal.',
    'La señal viene de un planeta que nadie conoce.',
    'La señal se repite una y otra vez.',
    'En el puente de mando hay pantallas verdes.',
    'En el puente de mando nadie habla.',
    'En la pantalla llueve código verde.',
    'El código cae por la pantalla como la lluvia.',
    'El código verde cae despacio y en silencio.',

    // --- el gato ---
    'El gato duerme en la nave.',
    'El gato duerme en el puente de mando.',
    'El gato duerme encima del ordenador porque está caliente.',
    'El gato duerme mientras la tripulación trabaja.',
    'El gato mira la pantalla y no entiende nada.',
    'El gato mira la lluvia de código y quiere cazarla.',
    'El gato se esconde cuando oye un ruido.',
    'El gato se esconde en la bodega de la nave.',
    'El gato no sabe nada de la inteligencia artificial.',
    'El gato no necesita datos para saber dónde está la comida.',
    'El gato aprende deprisa dónde está la comida.',
    'El gato persigue al conejo blanco por la nave.',
    'El conejo blanco corre y el gato lo persigue.',
    'El conejo blanco se esconde en la lluvia de código.',
    'Nadie sabe dónde está el gato.',
    'Nadie sabe de dónde viene el conejo blanco.',

    // --- la clase ---
    'En la clase aprendemos qué es la inteligencia artificial.',
    'En la clase aprendemos a preguntar a la máquina.',
    'En la clase aprendemos a comprobar lo que dice la máquina.',
    'En la clase hay un ordenador y muchas preguntas.',
    'La clase empieza cuando la nave se despierta.',
    'La clase empieza con una pregunta.',
    'La clase termina con otra pregunta.',
    'Las personas aprenden de los ejemplos y de los errores.',
    'Las personas aprenden despacio, pero entienden lo que aprenden.',
    'Las personas entienden las palabras y la máquina las cuenta.',
    'Una persona aprende de pocos ejemplos.',
    'Una persona se equivoca y aprende del error.',
    'Aprender es equivocarse y corregir el error.',
    'Aprender es ver muchos ejemplos y encontrar el patrón.',
    'Preguntar bien es saber qué queremos.',
    'Saber preguntar es más difícil que saber responder.',
    'Hoy la máquina escribe y mañana tenemos que leer con cuidado.',
    'Hoy aprendemos cómo aprende una máquina.',
    'Mañana la nave llega a casa.',
    'Mañana la clase empieza con otra pregunta.'
  ];
})();
