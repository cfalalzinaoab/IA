/* IA-S1 · peces comunes (v4). Es carrega al final de cada animació, després de boot().
   - Posa el número de la peça (A1…A8) a la capçalera.
   - Crea el fons (#fons): si la peça defineix window.fonsIA(capa), hi dibuixa el seu fons temàtic.
     El fons es desplaça una mica a cada pas (variable --p), com si la càmera avancés.
   - v4 · Llum: crea la capa #llum (resplendor de dalt a l'esquerra, raigs i pols lluminosa) entre el fons
     i el contingut, i marca la direcció del pas a body[data-dir] («fwd» o «back») perquè les encesas
     ([data-encen], [data-reflex]) només es vegin en avançar. La barra de la frase s'encén a cada pas nou.
   - Dibuixa els punts de progrés i els actualitza quan canvia el comptador.
   - 13-10-2026: la barra de la frase només s'encén si la frase és nova (a l'índex no canvia mai).
   El ritme (més lent) no és aquí: és a IA-S1-ritme.js, que les peces carreguen al <head>.
   No canvia la navegació: ← → Espai Av Pàg Re Pàg Inici i F funcionen igual. */
(function () {
  var PECES = {tokens: 'A1', vectors: 'A2', prediccio: 'A3', atencio: 'A4', entrenament: 'A5', origens: 'A6', errors: 'A7', atractors: 'A8'};
  var nom = document.body.dataset.animation;
  var course = document.getElementById('course');
  if (course && PECES[nom]) course.setAttribute('data-piece', PECES[nom]);

  var stage = document.getElementById('stage');
  var fons = null;
  if (stage && typeof window.fonsIA === 'function') {
    fons = document.createElement('div');
    fons.id = 'fons';
    fons.setAttribute('aria-hidden', 'true');
    var capa = document.createElement('div');
    capa.className = 'capa';
    fons.appendChild(capa);
    stage.insertBefore(fons, stage.firstChild);
    window.fonsIA(capa);
  }

  /* La llum: sempre darrere del contingut i fora de les zones de text (capçalera, títol, frase de baix).
     Pols: [x, y, mida, desenfocament, opacitat, desplaçament màxim en px al llarg de la peça] */
  var llum = null;
  if (stage) {
    llum = document.createElement('div');
    llum.id = 'llum';
    llum.setAttribute('aria-hidden', 'true');
    var RAIGS = [[22, 150, .55, 26], [31, 230, .38, 34], [40, 110, .46, 22]];
    var POLS = [[1180, 150, 18, 1.5, .55, -60], [1300, 118, 10, 1, .7, -90], [1420, 172, 34, 6, .34, -40],
      [1560, 132, 14, 1.5, .6, -80], [1700, 182, 24, 4, .44, -50], [1832, 126, 12, 1, .7, -100],
      [1888, 300, 28, 5, .4, -36], [1892, 520, 12, 1, .6, -70], [1880, 760, 20, 3, .45, -54],
      [30, 330, 16, 2, .5, 48], [44, 600, 30, 6, .32, 30], [24, 820, 10, 1, .6, 60],
      [420, 1042, 22, 4, .38, 36], [760, 1060, 12, 1.5, .55, 60], [1100, 1034, 26, 5, .34, 24]];
    var h = '<i class="sol"></i>';
    RAIGS.forEach(function (r) { h += '<i class="raig" style="--a:' + r[0] + 'deg;--h:' + r[1] + 'px;--o:' + r[2] + ';--b:' + r[3] + 'px"></i>'; });
    h += '<div class="pols">';
    POLS.forEach(function (p) { h += '<i style="left:' + p[0] + 'px;top:' + p[1] + 'px;--s:' + p[2] + 'px;--b:' + p[3] + 'px;--o:' + p[4] + ';--k:' + p[5] + '"></i>'; });
    llum.innerHTML = h + '</div>';
    stage.insertBefore(llum, fons ? fons.nextSibling : stage.firstChild);
  }

  var counter = document.getElementById('counter');
  if (!counter || !window.presentation) return;
  var dots = null;
  if (window.presentation.total >= 2) {
    dots = document.createElement('div');
    dots.id = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < window.presentation.total; i++) dots.appendChild(document.createElement('i'));
    counter.parentNode.insertBefore(dots, document.getElementById('prev'));
  }

  var caption = document.getElementById('caption');
  var reduced = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var ultim = window.presentation.step;
  var frase = null;
  document.body.dataset.dir = 'fwd';

  function pinta(inici) {
    var pas = window.presentation.step, total = window.presentation.total;
    var dir = inici || pas >= ultim ? 'fwd' : 'back';
    ultim = pas;
    var nova = !!caption && caption.textContent !== frase;
    if (caption) frase = caption.textContent;
    document.body.dataset.dir = dir;
    if (fons) fons.style.setProperty('--p', String(pas - 1));
    if (llum) llum.style.setProperty('--q', String(total > 1 ? (pas - 1) / (total - 1) : 0));
    if (dots) Array.prototype.forEach.call(dots.children, function (d, k) {
      d.className = k + 1 === pas ? 'on' : (k + 1 < pas ? 'done' : '');
    });
    /* La barra de la frase s'encén un instant quan arriba una frase nova (només en avançar).
       Si la frase no canvia (a l'índex, en triar una altra targeta), no s'encén. */
    if (caption && caption.textContent && nova && dir === 'fwd' && !reduced() && caption.animate) {
      var rgb = getComputedStyle(document.body).getPropertyValue('--acc-rgb').trim() || '47,85,212';
      try {
        caption.animate([
          {boxShadow: '0 0 0 0 rgba(' + rgb + ',0),0 0 0 0 rgba(' + rgb + ',0),inset 0 1px 0 rgba(255,255,255,.6)', filter: 'brightness(1)'},
          {boxShadow: '0 0 22px 4px rgba(' + rgb + ',.85),0 0 70px 16px rgba(' + rgb + ',.38),inset 0 1px 0 rgba(255,255,255,.6)', filter: 'brightness(1.35)', offset: .3},
          {boxShadow: '0 0 12px 1px rgba(' + rgb + ',.55),0 0 34px 6px rgba(' + rgb + ',.24),inset 0 1px 0 rgba(255,255,255,.6)', filter: 'brightness(1)'}
        ], {duration: 1100, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::before'});
      } catch (e) { /* sense pseudoElement: la barra queda amb el brill fix */ }
    }
  }
  new MutationObserver(function () { pinta(false); }).observe(counter, {childList: true, characterData: true, subtree: true});
  pinta(true);
})();
