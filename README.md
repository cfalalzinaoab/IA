# Puente de mando · las clases de inteligencia artificial

La web donde se cuelgan las clases de IA: cada clase es un pase de
diapositivas que se ve en el navegador, y al lado hay un laboratorio con tres
aparatos para tocar. El diseño es un puente de mando de carguero espacial por
el que llueve código.

Es HTML, CSS y JavaScript escritos a mano. No hay servidor, ni compilación, ni
bibliotecas, ni nada que llame a otra web: se abre `index.html` y funciona,
también desde el disco.

## Qué hay

| ruta | qué es |
|---|---|
| `index.html` | la portada: el visor, el archivo de clases, el laboratorio y la consola |
| `clase.html?c=00` | el pase de una clase (también en modo lectura y con ventana de presentador) |
| `laboratorio.html` | los tres aparatos: la red que aprende, el troceador y la palabra siguiente |
| `clases/indice.js` | **la lista de clases que hay colgadas** |
| `clases/clase-NN.js` | una clase: solo datos, sin diseño |
| `img/clase-NN/` | las imágenes de esa clase |
| `js/pase.js` | el motor de las diapositivas y los catorce tipos que sabe pintar |
| `js/demos/` | los aparatos y `corpus.js`, las frases de las que aprenden |
| `js/` (el resto) | núcleo, sonido, lluvia, consola, arranque, iconos y huevos de pascua |
| `css/nave.css` | el sistema de diseño: colores, fuentes, paneles, botones |
| `fuentes/` | Michroma, IBM Plex Mono y VT323, con sus licencias (las tres son libres) |
| `herramientas/pptx_a_clase.py` | convierte un PowerPoint en un borrador de clase |

## Colgar una clase nueva

**Desde un PowerPoint**

```
python3 herramientas/pptx_a_clase.py  mi-clase.pptx  01  --fecha 2026-11-25 --duracion "50 min"
```

Escribe `clases/clase-01.js` y deja sus imágenes en `img/clase-01/`. Pasan el
texto, los niveles de las listas, las tablas, las imágenes y las notas del
orador; no pasan los colores ni la maqueta, porque la clase se viste con el
diseño de la nave. Lo que sale es un borrador que conviene repasar.

**A mano**

Se copia `clases/clase-00.js`, que es una clase de verdad y a la vez el
muestrario comentado de todos los tipos de diapositiva.

**En los dos casos**, el último paso es añadir el número a la lista de
`clases/indice.js`:

```js
clases: ['00', '01'],
```

El título, el resumen, la fecha y el número de diapositivas de la portada
salen de dentro de cada clase; no se repiten en ningún otro sitio. Para
anunciar una clase que aún no está, se apunta en `proximas`.

## Los tipos de diapositiva

| `tipo` | para qué | campos |
|---|---|---|
| `portada` | abrir la clase | `titulo`, `subtitulo`, `ante`, `pie` |
| `seccion` | abrir un bloque | `numero`, `titulo`, `texto` |
| `puntos` | una lista que se desvela punto a punto | `titulo`, `puntos`, `entrada`, `revelar` |
| `texto` | párrafos y una frase en caja | `titulo`, `parrafos`, `destacado` |
| `columnas` | dos cosas frente a frente | `titulo`, `izquierda`, `derecha`, `frente`, `revelar` |
| `cita` | una frase de alguien | `cita`, `autor`, `fuente` |
| `cifra` | un dato solo, enorme | `cifra`, `unidad`, `texto` |
| `terminal` | una conversación que se teclea sola | `titulo`, `lineas` (`quien`: `usuario`, `ia`, `sistema`) |
| `imagen` | una imagen, sola o con texto al lado | `titulo`, `src`, `alt`, `pie`, `puntos` |
| `tabla` | una tabla | `titulo`, `cabecera`, `filas` |
| `cronologia` | hasta seis fechas en línea | `titulo`, `hitos` (`fecha`, `texto`) |
| `pregunta` | una pregunta con opciones que se pueden tocar | `pregunta`, `opciones`, `correcta`, `explicacion` |
| `demo` | un aparato del laboratorio, funcionando | `demo`: `red`, `tokens` o `siguiente` |
| `cierre` | despedida y tareas | `titulo`, `texto`, `tareas` |

Cualquiera admite `notas` (solo las ve quien da la clase) y casi todas
`aviso` (una nota al pie en ámbar). Dentro de los textos valen tres marcas:
`*énfasis*`, `**fuerte**` y `` `código` ``. No se puede escribir HTML.

Si un texto no cabe, el pase le baja la letra solo hasta que quepa; cuando ni
así, lo que toca es partir la diapositiva en dos.

## Dar la clase

| tecla | hace |
|---|---|
| `→` `Espacio` `AvPág` | avanzar (un paso o una diapositiva) |
| `←` `RePág` | retroceder |
| `Inicio` `Fin` | primera y última |
| `1` `2` `Intro` | ir a la diapositiva 12 |
| `I` | índice |
| `F` | pantalla completa |
| `N` | ventana del presentador: lo de ahora, lo que viene, las notas y un cronómetro |
| `L` | modo lectura: todo seguido, para leer en el móvil o imprimir |
| `B` | pantalla en negro |
| `S` | sonido |
| `?` | ayuda |

Un mando de presentaciones funciona sin más, porque envía `AvPág` y `RePág`.
En un móvil de pie la clase se abre directamente en modo lectura. El sonido
empieza siempre apagado.

## La consola

En la portada, la tecla `/` lleva a la consola. `ayuda` lista las órdenes:
`clases`, `cargar 00`, `demo red`, `sonido si`, `lluvia no`, `estado`,
`reiniciar`…

<details>
<summary>Huevos de pascua (destripa la gracia)</summary>

`huevos` en la consola enseña la lista y cuáles se han encontrado ya: el
conejo blanco que cae de vez en cuando por la lluvia y se caza con el dedo,
`orden especial 937`, `jones`, `pastilla roja` y `pastilla azul`, `despierta`,
`no hay cuchara`, `abre las compuertas`, `autodestruccion` y el código de
siempre (↑ ↑ ↓ ↓ ← → ← → B A). Si nadie toca nada en cuatro minutos, el gato
se da una vuelta por su cuenta.

</details>

## Publicarla

Con GitHub Pages: en el repositorio, *Settings → Pages → Deploy from a branch*,
rama `main`, carpeta `/ (root)`. A partir de ahí, cada cambio que llega a
`main` se publica solo.

## Lo que conviene saber

- **Los aparatos del laboratorio son de juguete, y lo dicen.** La red neuronal
  es de verdad pero diminuta; el troceador y el adivinador solo han leído las
  frases de `js/demos/corpus.js`. Enseñan el mecanismo, no imitan a ningún
  modelo real.
- **La clase 00 es una muestra.** Su contenido está escrito para estrenar la
  web; se puede dar tal cual, cambiar o quitar de `indice.js`.
- **Nada sale del navegador.** Lo que se escribe en la consola o en los
  aparatos se calcula ahí mismo. Lo único que se guarda, y en el propio
  navegador, son las preferencias (sonido, lluvia) y los huevos encontrados.
