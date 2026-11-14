/* ==========================================================================
   GL/SOMBREADORES.JS · los programas que corren en la tarjeta gráfica
   --------------------------------------------------------------------------
   Todo lo que se ve en el visor 3D lo pintan estos sombreadores (GLSL ES
   3.00, el de WebGL2). Cada pieza de la escena tiene el suyo:

     FONDO       el cielo, la bruma del horizonte, auroras, estrellas y el
                 halo del holograma: un triángulo que cubre la pantalla
     LLUVIA      los glifos que caen. Miles de cuadraditos, y cada uno se
                 calcula SOLO en la tarjeta: en qué fila está la cabeza de
                 su columna, cuánto brilla, qué letra le toca. La CPU no
                 toca ni uno por cuadro.
     TERRENO     el paisaje alámbrico de abajo, que avanza hacia la cámara.
                 Dos pasadas: un relleno oscuro que escribe profundidad (y así
                 los montes de delante tapan a los de detrás, como en los
                 monitores de 1979) y luego las líneas encima.
     TRAZOS      líneas con grosor de verdad (WebGL solo sabe hacerlas de un
                 píxel): cada segmento es un rectángulo que se abre en la
                 pantalla y se difumina por los bordes. Red, anillos, cascarón.
     CHISPAS     puntos de luz siempre de cara a la cámara: neuronas, pulsos
                 que viajan por las conexiones y el polvo del aire, que
                 fuera de foco se vuelve un disco (bokeh).
     POSPROCESO  resplandor en cadena (bajar y subir resolución, como hacen
                 los juegos), aberración cromática, grano, viñeta, curvatura
                 de tubo, interferencias y fallos de señal.

   Los trazos y las chispas no guardan un color sino un REPARTO entre tres
   papeles (verde, ámbar, blanco). Qué color es cada papel lo dice la paleta
   del momento: por eso la pastilla roja puede volverlo todo verde sin tocar
   ni un vértice.

   La escena trabaja en luz lineal y, si la tarjeta puede, en coma flotante:
   una cabeza de glifo vale 2,6 y un pulso 4. Lo que pasa de 1 es lo que
   «se quema» y alimenta el resplandor; al final se comprime con la curva
   ACES y se pasa a sRGB.
   ========================================================================== */
(function () {
  'use strict';
  var NAVE = window.NAVE;

  var CABECERA = '#version 300 es\nprecision highp float;\nprecision highp int;\n';

  /* ---------- trozos comunes ---------------------------------------------- */

  var COMUN = `
#define PI 3.14159265
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
// ruido de valor: suave, barato y suficiente para montañas
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  float a = hash21(i), b = hash21(i + vec2(1., 0.));
  float c = hash21(i + vec2(0., 1.)), d = hash21(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++) { v += a * ruido(p); p = p * 2.03 + 17.1; a *= .5; }
  return v;
}
// crestas: el ruido doblado sobre sí mismo hace aristas afiladas
float crestas(vec2 p) {
  float v = 0., a = .55;
  for (int i = 0; i < 5; i++) {
    float n = 1. - abs(ruido(p) * 2. - 1.);
    v += a * n * n;
    p = p * 2.07 + vec2(9.2, 3.7);
    a *= .5;
  }
  return v;
}
// para mandar fuera de la pantalla lo que no hay que pintar
#define DESCARTAR { gl_Position = vec4(2., 2., 2., 1.); return; }
`;

  // Un triángulo que tapa toda la pantalla, sin atributos: sale de gl_VertexID.
  var PANTALLA_V = `
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}
`;

  /* ---------- FONDO -------------------------------------------------------- */

  var FONDO_F = `
in vec2 vUv;
uniform vec2 uResolucion;
uniform float uAspecto;
uniform float uTiempo;
uniform float uHorizonte;      // altura del horizonte en la pantalla (−1 a 1)
uniform vec2 uNucleo;          // dónde está el holograma en la pantalla
uniform float uNucleoBrillo;
uniform vec2 uAngulo;          // giro de la cámara, para que las estrellas no se peguen al cristal
uniform vec3 uCielo, uBruma, uSuelo, uHalo;
out vec4 salida;
void main() {
  vec2 ndc = vUv * 2. - 1.;
  float y = ndc.y - uHorizonte;
  vec3 c = mix(uBruma * .55, uCielo, smoothstep(0., .85, y));
  c = mix(c, uSuelo, smoothstep(0., -.18, y));
  // la bruma se pega al horizonte: un poco ancha y un hilo muy fino
  c += uBruma * (exp(-abs(y) * 7.) * .7 + exp(-abs(y) * 60.) * .45);

  // auroras: tela de ruido que se mueve muy despacio, solo arriba
  vec2 q = vec2(ndc.x * uAspecto * .55 - uAngulo.x * 1.4, y * 1.6 + uAngulo.y);
  float tela = fbm(q * 1.4 + vec2(uTiempo * .011, -uTiempo * .004));
  float vetas = fbm(q * vec2(3.5, 9.) + vec2(uTiempo * .02, 0.));
  c += uCielo * 3.2 * smoothstep(.48, .92, tela) * smoothstep(.05, .7, y) * (.45 + .55 * vetas);

  // estrellas: una por celda como mucho, cada una en su sitio y titilando
  vec2 p = (vUv * uResolucion + uAngulo * vec2(-1400., 900.)) / 4.;
  vec2 id = floor(p);
  vec2 dentro = fract(p) - (hash22(id) * .6 + .2);
  float h = hash21(id);
  float estrella = step(.992, h) * smoothstep(.45, 0., length(dentro));
  estrella *= .55 + .45 * sin(uTiempo * (1. + h * 5.) + h * 80.);
  c += vec3(.75, 1., .85) * estrella * smoothstep(.02, .3, y) * (.6 + 2.5 * step(.9985, h));

  // el halo que echa el holograma sobre el cristal
  vec2 dn = (ndc - uNucleo) * vec2(uAspecto, 1.);
  float r2 = dot(dn, dn);
  c += uHalo * uNucleoBrillo * (exp(-r2 * 1.6) * .28 + exp(-r2 * 7.) * .22);
  salida = vec4(c, 1.);
}
`;

  /* ---------- LLUVIA ------------------------------------------------------- */

  var LLUVIA_V = `
layout(location = 0) in vec2 aEsquina;   // el cuadradito, de −0,5 a 0,5
layout(location = 1) in vec4 aColumna;   // x, z, y de la fila de arriba, alto de celda
layout(location = 2) in vec4 aMarcha;    // velocidad (celdas/s), fase, id, filas de esta columna
uniform mat4 uVista;
uniform vec3 uOjo;
uniform float uTiempo;
uniform float uFilas;          // filas reservadas por columna (el reparto de instancias)
uniform float uEstela;
uniform float uDensidad;
uniform float uGlifos;
uniform vec2 uRejilla;
uniform vec4 uConejo;          // id de columna, velocidad, instante de salida, activo
uniform vec4 uOnda;            // centro (−1 a 1), instante, fuerza
uniform float uAspecto;
uniform float uFoco, uDesenfoque;
uniform vec2 uNiebla;
uniform float uEstirar;        // el salto: alarga los glifos hasta hacerlos rayas
uniform float uBrilloLluvia;
out vec2 vUv;
out float vBrillo;
out float vCabeza;
out float vLod;
void main() {
  float fila = float(gl_InstanceID % int(uFilas));
  float id = aMarcha.z;
  float filas = aMarcha.w;
  if (fila >= filas) DESCARTAR
  float celda = aColumna.w;
  float semilla = hash21(vec2(id * .913, fila * 1.71));
  bool conejo = uConejo.w > .5 && abs(id - uConejo.x) < .5;

  // dónde va la cabeza de esta columna (en filas, contando desde arriba)
  float ciclo = filas + uEstela + 4. + mod(id * 7.13, 13.);
  float cabeza = conejo ? (uTiempo - uConejo.z) * uConejo.y
                        : mod(uTiempo * aMarcha.x + aMarcha.y, ciclo);
  float d = cabeza - fila;                         // filas que han pasado desde la cabeza
  float activa = conejo ? 1. : step(hash11(id * 1.37 + .5), uDensidad);
  float esCabeza = step(0., d) * (1. - step(1., d));
  float estela = step(1., d) * (1. - step(uEstela, d)) * pow(max(0., 1. - d / uEstela), 1.45);
  float brillo = activa * (esCabeza * 2.6 + estela * .95) * uBrilloLluvia;

  // qué letra: la cabeza cambia en cada paso; la estela, de vez en cuando
  float ritmo = mix(.25, 2.4, hash11(semilla * 91.7));
  float glifo = floor(hash21(vec2(id * 1.7 + fila * .31, floor(uTiempo * ritmo + semilla * 13.))) * uGlifos);
  if (esCabeza > .5) glifo = floor(hash21(vec2(id + .5, floor(cabeza))) * uGlifos);
  if (conejo && esCabeza > .5) glifo = uGlifos;    // el conejo vive justo detrás de los glifos

  vec3 centro = vec3(aColumna.x, aColumna.z - fila * celda, aColumna.y);
  float estirar = 1. + uEstirar * (.4 + semilla * 1.2);
  vec3 p = centro + vec3(aEsquina.x * celda * .78, aEsquina.y * celda * estirar, 0.);
  vec4 clip = uVista * vec4(p, 1.);
  if (clip.w < .05) DESCARTAR

  // la onda: un anillo que corre por la pantalla y enciende TODAS las celdas,
  // también las de las columnas que no llueven: se ve la rejilla escondida
  vec2 ndc = clip.xy / clip.w;
  float edad = uTiempo - uOnda.z;
  float r = length((ndc - uOnda.xy) * vec2(uAspecto, 1.));
  float anillo = exp(-pow((r - edad * 1.9) * 6.5, 2.)) * uOnda.w * exp(-edad * 1.3) * step(0., edad);
  brillo += anillo * (1.1 + semilla * .8);

  float dist = length(p - uOjo);
  brillo *= 1. - smoothstep(uNiebla.x, uNiebla.y, dist);   // niebla al fondo
  brillo *= smoothstep(3.2, 6.5, dist);                     // y nada pegado al cristal
  if (brillo < .004) DESCARTAR

  vCabeza = conejo ? 1. : esCabeza;
  vLod = clamp(abs(dist - uFoco) * uDesenfoque, 0., 3.);   // profundidad de campo
  float col = mod(glifo, uRejilla.x);
  float filaAtlas = floor(glifo / uRejilla.x);
  vUv = (vec2(col, filaAtlas) + vec2(aEsquina.x + .5, .5 - aEsquina.y)) / uRejilla;
  vBrillo = brillo;
  gl_Position = clip;
}
`;

  var LLUVIA_F = `
in vec2 vUv;
in float vBrillo;
in float vCabeza;
in float vLod;
uniform sampler2D uAtlas;
uniform vec3 uCuerpo, uCabeza;
out vec4 salida;
void main() {
  float a = textureLod(uAtlas, vUv, vLod).r;
  a *= 1. + vLod * .55;             // al desenfocar se reparte: se compensa un poco
  vec3 c = mix(uCuerpo, uCabeza, vCabeza) * vBrillo * a;
  salida = vec4(c, 1.);
}
`;

  /* ---------- TERRENO ------------------------------------------------------ */

  // La altura del paisaje y dónde cae cada nudo de la rejilla. La comparten
  // el relleno y las líneas, así que encajan al píxel.
  var TERRENO_COMUN = `
uniform float uAvance;     // filas recorridas (con decimales)
uniform float uPaso;       // lado de una casilla, en el mundo
uniform float uNX, uNZ;    // casillas a lo ancho y a lo hondo
uniform float uSuelo;      // altura del fondo del valle
uniform float uZ0;         // z de la fila 0 (la más cercana)
uniform float uAltura;     // altura de los montes
uniform float uValle;      // medio ancho del valle llano
float altura(float x, float filaMundo) {
  vec2 q = vec2(x, filaMundo * uPaso);
  float monte = crestas(q * .075);
  float lados = smoothstep(uValle, uValle + 12., abs(x));
  return monte * monte * lados * uAltura + fbm(q * .28) * .45 * (.35 + lados);
}
vec3 nudo(vec2 g) {
  float x = (g.x - uNX * .5) * uPaso;
  float filaMundo = g.y + floor(uAvance);
  float z = uZ0 - (g.y - fract(uAvance)) * uPaso;
  return vec3(x, uSuelo + altura(x, filaMundo), z);
}
`;

  var RELLENO_V = `
layout(location = 0) in vec2 aRejilla;
uniform mat4 uVista;
uniform vec3 uOjo;
uniform vec2 uNiebla;
out float vNiebla;
out float vLuz;
void main() {
  vec3 p = nudo(aRejilla);
  // la normal, con dos vecinos: para un poco de relieve en las laderas
  vec3 px = nudo(aRejilla + vec2(.5, 0.));
  vec3 pz = nudo(aRejilla + vec2(0., .5));
  vec3 n = normalize(cross(pz - p, px - p));
  vLuz = max(0., dot(n, normalize(vec3(-.3, .55, -1.))));
  vNiebla = smoothstep(uNiebla.x, uNiebla.y, length(p - uOjo));
  gl_Position = uVista * vec4(p, 1.);
}
`;

  var RELLENO_F = `
in float vNiebla;
in float vLuz;
uniform vec3 uRelleno, uRellenoLuz, uBruma;
out vec4 salida;
void main() {
  vec3 c = uRelleno + uRellenoLuz * vLuz * vLuz;
  c = mix(c, uBruma * .6, vNiebla);
  salida = vec4(c, 1.);
}
`;

  var MALLA_V = `
layout(location = 0) in vec2 aEsquina;
layout(location = 1) in vec4 aTramo;    // de (gx, gz) a (gx, gz) en la rejilla
uniform mat4 uVista;
uniform vec3 uOjo;
uniform vec2 uResolucion;
uniform vec2 uNiebla;
uniform float uGrosor;
uniform vec3 uColor, uColorCresta;
uniform vec2 uBarrido;      // z del barrido de radar, fuerza
out vec3 vColor;
out float vPx;
out float vAncho;
void main() {
  vec3 a = nudo(aTramo.xy), b = nudo(aTramo.zw);
  vec4 ca = uVista * vec4(a, 1.), cb = uVista * vec4(b, 1.);
  if (ca.w < .05 || cb.w < .05) DESCARTAR
  vec2 sa = ca.xy / ca.w * uResolucion * .5;
  vec2 sb = cb.xy / cb.w * uResolucion * .5;
  vec2 dir = sb - sa;
  float largo = length(dir);
  dir = largo > 1e-4 ? dir / largo : vec2(1., 0.);
  float t = aEsquina.x + .5;
  vec3 p = mix(a, b, t);
  float ancho = uGrosor + 2.;
  vec4 c = mix(ca, cb, t);
  c.xy += vec2(-dir.y, dir.x) * aEsquina.y * ancho / uResolucion * 2. * c.w;

  float g = mix(aTramo.y, aTramo.w, t) - fract(uAvance);   // filas desde la cámara
  float brillo = smoothstep(0., 3., g) * smoothstep(uNZ, uNZ - 10., g);
  brillo *= 1. - smoothstep(uNiebla.x, uNiebla.y, length(p - uOjo));
  float cresta = smoothstep(uAltura * .25, uAltura * .85, p.y - uSuelo);
  brillo *= .55 + cresta * .9;
  brillo += exp(-pow((p.z - uBarrido.x) * .6, 2.)) * uBarrido.y * (.35 + cresta);
  if (brillo < .004) DESCARTAR
  vColor = mix(uColor, uColorCresta, cresta) * brillo;
  vPx = aEsquina.y * ancho;
  vAncho = uGrosor;
  gl_Position = c;
}
`;

  /* ---------- TRAZOS ------------------------------------------------------- */

  var TRAZOS_V = `
layout(location = 0) in vec2 aEsquina;
layout(location = 1) in vec4 aA;        // xyz + grosor en píxeles (a 1080 de alto)
layout(location = 2) in vec4 aB;        // xyz + brillo
layout(location = 3) in vec4 aColor;    // papeles (verde, ámbar, blanco) + capa de la red (−1: no es de la red)
layout(location = 4) in vec4 aExtra;    // semilla, guiones por tramo, velocidad de los guiones, -
uniform mat4 uVista, uModelo;
uniform vec3 uOjo;
uniform vec2 uResolucion;
uniform float uEscalaPx;    // los grosores se escriben a 1080 px de alto
uniform float uTiempo;
uniform float uOla;         // ritmo de la propagación por la red
uniform float uRafaga;      // instante del último disparo
uniform float uAlfa;
uniform vec2 uNiebla;
uniform vec3 uTinteA, uTinteB;   // qué color es hoy «verde» y cuál «ámbar»
out vec3 vColor;
out float vPx;
out float vAncho;
void main() {
  vec4 wa = uModelo * vec4(aA.xyz, 1.);
  vec4 wb = uModelo * vec4(aB.xyz, 1.);
  vec4 ca = uVista * wa, cb = uVista * wb;
  if (ca.w < .05 && cb.w < .05) DESCARTAR
  // recortar contra el plano cercano para que el tramo no se dé la vuelta
  if (ca.w < .05) ca = mix(ca, cb, (.05 - ca.w) / (cb.w - ca.w));
  if (cb.w < .05) cb = mix(cb, ca, (.05 - cb.w) / (ca.w - cb.w));
  vec2 sa = ca.xy / ca.w * uResolucion * .5;
  vec2 sb = cb.xy / cb.w * uResolucion * .5;
  vec2 dir = sb - sa;
  float largo = length(dir);
  dir = largo > 1e-4 ? dir / largo : vec2(1., 0.);
  float t = aEsquina.x + .5;
  float grosor = aA.w * uEscalaPx;
  float ancho = max(grosor, 1.) + 2.;
  vec4 c = mix(ca, cb, t);
  c.xy += vec2(-dir.y, dir.x) * aEsquina.y * ancho / uResolucion * 2. * c.w;

  float brillo = aB.w * min(grosor, 1.);   // más fino que un píxel: se apaga en vez de temblar
  float capa = aColor.w;
  if (capa > -.5) {
    // la señal pasa por la red capa a capa; cada conexión se enciende al paso
    float u = fract(uTiempo * uOla + aExtra.x * .05);
    float local = (u - capa * .2) / .2;
    float paso = step(0., local) * step(local, 1.);
    brillo *= 1. + paso * (.9 + 2.2 * exp(-pow((t - local) * 5., 2.)));
    float r = (uTiempo - uRafaga) * 3.2 - capa * .55;
    brillo *= 1. + 4. * exp(-pow((r - t) * 3., 2.)) * step(0., uTiempo - uRafaga) * exp(-(uTiempo - uRafaga) * .9);
  }
  if (aExtra.y > 0.) {
    // guiones que corren a lo largo del tramo
    brillo *= .3 + .7 * step(.5, fract(t * aExtra.y - uTiempo * aExtra.z));
  }
  vec3 p = mix(wa.xyz, wb.xyz, t);
  brillo *= (1. - smoothstep(uNiebla.x, uNiebla.y, length(p - uOjo))) * uAlfa;
  if (brillo < .004) DESCARTAR
  vColor = (uTinteA * aColor.r + uTinteB * aColor.g + vec3(aColor.b)) * brillo;
  vPx = aEsquina.y * ancho;
  vAncho = max(grosor, 1.);
  gl_Position = c;
}
`;

  // El mismo fragmento para los trazos y para la malla del terreno.
  var TRAZOS_F = `
in vec3 vColor;
in float vPx;
in float vAncho;
out vec4 salida;
void main() {
  float d = abs(vPx);
  float a = 1. - smoothstep(vAncho * .5 - .6, vAncho * .5 + .9, d);
  salida = vec4(vColor * a, 1.);
}
`;

  /* ---------- CHISPAS ------------------------------------------------------ */

  var CHISPAS_V = `
layout(location = 0) in vec2 aEsquina;
layout(location = 1) in vec4 aA;        // xyz + tamaño
layout(location = 2) in vec4 aB;        // pulsos: destino · polvo: deriva por segundo
layout(location = 3) in vec4 aColor;    // papeles (verde, ámbar, blanco) + brillo
layout(location = 4) in vec4 aDatos;    // capa, semilla, forma (0 luz, 1 disco), -
uniform int uModo;                      // 0 neuronas, 1 pulsos, 2 polvo
uniform mat4 uVista, uModelo;
uniform vec3 uOjo, uDerecha, uArriba;
uniform float uTiempo, uOla, uRafaga, uAlfa;
uniform vec2 uNiebla;
uniform float uFoco, uDesenfoque;
uniform vec3 uCaja, uCentroCaja;
uniform float uDeriva;                  // polvo: cuánto ha avanzado la nave
uniform vec3 uTinteA, uTinteB;
out vec2 vUv;
out vec3 vColor;
out float vForma;
out float vSuave;
void main() {
  vec3 centro;
  float brillo = aColor.w;
  float tam = aA.w;
  float capa = aDatos.x;
  float u = fract(uTiempo * uOla + aDatos.y * .05);
  if (uModo == 1) {
    // un pulso recorre su conexión mientras la señal cruza su capa…
    float t = (u - capa * .2) / .2;
    float visible = step(0., t) * step(t, 1.);
    // …y otro, más fuerte, cuando alguien toca el núcleo
    float edad = uTiempo - uRafaga;
    float t2 = edad * 3.2 - capa * .55;
    float visible2 = step(0., t2) * step(t2, 1.) * step(0., edad) * exp(-edad * .6);
    if (visible2 > visible * .5) { t = t2; visible = visible2 * 2.; }
    if (visible < .01) DESCARTAR
    centro = (uModelo * vec4(mix(aA.xyz, aB.xyz, t), 1.)).xyz;
    brillo *= visible * sin(t * PI) * 1.4;
  } else if (uModo == 0) {
    centro = (uModelo * vec4(aA.xyz, 1.)).xyz;
    // la neurona se enciende cuando le llega la señal
    float llegada = exp(-pow((u - capa * .2) * 16., 2.));
    float edad = uTiempo - uRafaga;
    float rafaga = exp(-pow((edad * 3.2 - capa * .55) * 3., 2.)) * step(0., edad) * exp(-edad * .5);
    brillo *= .5 + 1.8 * llegada + 3. * rafaga;
    tam *= 1. + .7 * llegada + rafaga;
  } else {
    // el polvo deriva, viene hacia la cámara con la nave y da la vuelta a la caja
    vec3 p = aA.xyz + aB.xyz * uTiempo;
    p.z += uDeriva;
    centro = uCentroCaja + mod(p - uCentroCaja + uCaja * .5, uCaja) - uCaja * .5;
  }
  float dist = length(centro - uOjo);
  float desenfoque = clamp(abs(dist - uFoco) * uDesenfoque, 0., 1.);
  if (uModo == 2) {
    tam *= 1. + desenfoque * 5.;
    brillo /= 1. + desenfoque * 9.;
    brillo *= smoothstep(1.5, 4., dist);
  }
  brillo *= (1. - smoothstep(uNiebla.x, uNiebla.y, dist)) * uAlfa;
  if (brillo < .003) DESCARTAR
  vec3 p = centro + (uDerecha * aEsquina.x + uArriba * aEsquina.y) * tam * 2.;
  gl_Position = uVista * vec4(p, 1.);
  vUv = aEsquina * 2.;
  vColor = (uTinteA * aColor.r + uTinteB * aColor.g + vec3(aColor.b)) * brillo;
  vForma = aDatos.z;
  vSuave = desenfoque;
}
`;

  var CHISPAS_F = `
in vec2 vUv;
in vec3 vColor;
in float vForma;
in float vSuave;
out vec4 salida;
void main() {
  float d = length(vUv);
  if (d > 1.) discard;
  float a;
  if (vForma < .5) a = exp(-d * d * 6.) + exp(-d * d * 60.) * 1.6;    // luz con corazón
  else a = smoothstep(1., .78 - vSuave * .5, d) * (.5 + .5 * smoothstep(.15, .95, d)); // disco de bokeh
  salida = vec4(vColor * a, 1.);
}
`;

  /* ---------- POSPROCESO --------------------------------------------------- */

  // Primer paso del resplandor: quedarse con lo que pasa del umbral (con
  // rodilla suave, para que no haya un corte) y bajar a media resolución.
  var PREFILTRO_F = `
in vec2 vUv;
uniform sampler2D uFuente;
uniform vec2 uTexel;
uniform vec2 uUmbral;     // umbral, rodilla
out vec4 salida;
vec3 umbral(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - uUmbral.x + uUmbral.y, 0., 2. * uUmbral.y);
  rq = rq * rq / (4. * uUmbral.y + 1e-4);
  return c * max(rq, br - uUmbral.x) / max(br, 1e-4);
}
void main() {
  vec3 c = texture(uFuente, vUv + uTexel * vec2(-1., -1.)).rgb
         + texture(uFuente, vUv + uTexel * vec2( 1., -1.)).rgb
         + texture(uFuente, vUv + uTexel * vec2(-1.,  1.)).rgb
         + texture(uFuente, vUv + uTexel * vec2( 1.,  1.)).rgb;
  salida = vec4(min(umbral(c * .25), vec3(40.)), 1.);
}
`;

  // Bajar: el filtro «dual» de Kawase (centro × 4 + cuatro esquinas).
  var BAJAR_F = `
in vec2 vUv;
uniform sampler2D uFuente;
uniform vec2 uTexel;
out vec4 salida;
void main() {
  vec3 s = texture(uFuente, vUv).rgb * 4.;
  s += texture(uFuente, vUv + uTexel * vec2(-1., -1.)).rgb;
  s += texture(uFuente, vUv + uTexel * vec2( 1., -1.)).rgb;
  s += texture(uFuente, vUv + uTexel * vec2(-1.,  1.)).rgb;
  s += texture(uFuente, vUv + uTexel * vec2( 1.,  1.)).rgb;
  salida = vec4(s / 8., 1.);
}
`;

  // Subir: tienda de ocho muestras; se SUMA al nivel de arriba.
  var SUBIR_F = `
in vec2 vUv;
uniform sampler2D uFuente;
uniform vec2 uTexel;
uniform float uRadio;
out vec4 salida;
void main() {
  vec2 o = uTexel * uRadio;
  vec3 s = texture(uFuente, vUv + vec2(-o.x * 2., 0.)).rgb;
  s += texture(uFuente, vUv + vec2( o.x * 2., 0.)).rgb;
  s += texture(uFuente, vUv + vec2(0., -o.y * 2.)).rgb;
  s += texture(uFuente, vUv + vec2(0.,  o.y * 2.)).rgb;
  s += texture(uFuente, vUv + vec2(-o.x,  o.y)).rgb * 2.;
  s += texture(uFuente, vUv + vec2( o.x,  o.y)).rgb * 2.;
  s += texture(uFuente, vUv + vec2( o.x, -o.y)).rgb * 2.;
  s += texture(uFuente, vUv + vec2(-o.x, -o.y)).rgb * 2.;
  salida = vec4(s / 12., 1.);
}
`;

  var COMPONER_F = `
in vec2 vUv;
uniform sampler2D uEscena, uResplandor;
uniform vec2 uResolucion;
uniform float uTiempo;
uniform float uIntensidad;    // del resplandor
uniform float uExposicion;
uniform float uAberracion;
uniform float uGrano;
uniform float uVineta;
uniform float uCurvatura;
uniform float uFallo;         // 0 limpio · 1 la señal se rompe
uniform float uDestello;      // un fogonazo blanco (el salto)
uniform float uBlanco;        // la sala blanca
uniform vec2 uVelo;           // oscurecer la izquierda: fuerza, hasta dónde llega (0–1)
uniform vec3 uTinte;
out vec4 salida;
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.);
}
void main() {
  // la curvatura del tubo. Se normaliza para que el centro de cada lado
  // siga tocando el borde: solo las esquinas se quedan fuera, redondeadas.
  vec2 cc = vUv * 2. - 1.;
  cc *= (1. + uCurvatura * dot(cc, cc)) / (1. + uCurvatura);
  vec2 uv = cc * .5 + .5;
  vec2 borde = smoothstep(vec2(0.), vec2(.004, .008), uv) * smoothstep(vec2(0.), vec2(.004, .008), 1. - uv);
  float dentro = borde.x * borde.y;

  // fallos: bandas que se desplazan a saltos
  float banda = floor(uv.y * 28.);
  float tic = floor(uTiempo * 16.);
  float salta = step(1. - uFallo * .45, hash21(vec2(banda * .71, tic)));
  uv.x += (hash21(vec2(banda, tic * 1.3)) - .5) * .09 * salta * uFallo;
  // y la franja de interferencia, que rueda despacio y siempre
  float franja = exp(-pow((fract(uv.y * .55 - uTiempo * .045) - .5) * 26., 2.));
  uv.x += franja * .0012 * sin(uv.y * 420. + uTiempo * 31.);

  // aberración cromática: más hacia los bordes, y mucha cuando falla la señal
  vec2 dir = uv - .5;
  float ab = uAberracion * (dot(dir, dir) * 1.6 + .1) + uFallo * .012;
  vec3 c;
  c.r = texture(uEscena, uv + dir * ab).r;
  c.g = texture(uEscena, uv).g;
  c.b = texture(uEscena, uv - dir * ab).b;
  vec3 b;
  b.r = texture(uResplandor, uv + dir * ab * 1.6).r;
  b.g = texture(uResplandor, uv).g;
  b.b = texture(uResplandor, uv - dir * ab * 1.6).b;
  c += b * uIntensidad;
  c *= uExposicion * (1. + franja * .05) * (1. + sin(uTiempo * 58.) * .004);
  c += vec3(uDestello);
  c = aces(c) * uTinte;
  c = pow(c, vec3(1. / 2.2));     // de luz lineal a la pantalla

  // el velo: cuando la escena hace de fondo de la portada, el título va a
  // la izquierda y hay que apagarle la luz de detrás para que se lea
  float alcance = max(uVelo.y, .05);
  float tapa = 1. - smoothstep(alcance * .28, alcance, vUv.x);
  c *= 1. - uVelo.x * tapa;

  // viñeta y grano
  vec2 v = (vUv - .5) * vec2(1.05, 1.25);
  c *= mix(1., smoothstep(.95, .25, length(v)), uVineta);
  float g = hash21(vUv * uResolucion + fract(uTiempo * 7.31) * vec2(113., 71.)) - .5;
  c += g * uGrano * (1.1 - dot(c, vec3(.33)));

  // la sala blanca: la escena se revela como tinta sobre blanco
  c = mix(c, (vec3(.95, .965, .945) - c * vec3(.62, .48, .58)) * mix(1., dentro, .0), uBlanco);

  c *= dentro;
  c += (hash21(gl_FragCoord.xy + fract(uTiempo) * 17.) - .5) / 255.;   // contra el bandeado
  salida = vec4(c, 1.);
}
`;

  function v(cuerpo) { return CABECERA + COMUN + cuerpo; }

  NAVE.glsl = {
    fondo:     [v(PANTALLA_V), v(FONDO_F)],
    lluvia:    [v(LLUVIA_V), v(LLUVIA_F)],
    relleno:   [v(TERRENO_COMUN + RELLENO_V), v(RELLENO_F)],
    malla:     [v(TERRENO_COMUN + MALLA_V), v(TRAZOS_F)],
    trazos:    [v(TRAZOS_V), v(TRAZOS_F)],
    chispas:   [v(CHISPAS_V), v(CHISPAS_F)],
    prefiltro: [v(PANTALLA_V), v(PREFILTRO_F)],
    bajar:     [v(PANTALLA_V), v(BAJAR_F)],
    subir:     [v(PANTALLA_V), v(SUBIR_F)],
    componer:  [v(PANTALLA_V), v(COMPONER_F)]
  };
})();
