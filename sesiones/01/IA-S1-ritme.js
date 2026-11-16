/* IA-S1 · ritme (13-10-2026). Es carrega al <head> de cada animació (A1–A8), abans que cap altre script.
   Fa que tot el moviment d'una peça vagi LENT vegades més a poc a poc, i tot pel mateix factor, perquè el que
   està coordinat (una fitxa que aterra i s'encén, la bola d'A8 i la fitxa que arriba alhora) continuï coordinat:
   - Animacions de JS (el.animate): durada, retard i retard final × LENT.
   - Animacions i transicions de CSS: es reprodueixen a 1/LENT de velocitat, retard inclòs. Es frenen just després
     de cada canvi al document, abans de pintar-se. Les que arrenca només el ratolí (passar per sobre d'un botó)
     normalment no: els botons responen igual que abans.
   - Rellotges de JS (setTimeout, setInterval, performance.now i el temps de requestAnimationFrame): hi passa el temps
     LENT vegades més a poc a poc, perquè els comptadors i la física d'A8 segueixin el mateix ritme.
   No toca la navegació, els textos ni l'estat final de cada pas. L'índex no el carrega: el menú respon a l'instant.
   Per canviar el ritme de totes les animacions, canvieu només LENT (1 = la velocitat original del 13-10-2026). */
(function () {
  var LENT = 1.5;
  if (!(LENT > 0) || LENT === 1) return;
  window.IA_RITME = LENT;

  /* 1 · el.animate(): s'allarguen la durada i els retards */
  var animate0 = Element.prototype.animate;
  if (animate0) Element.prototype.animate = function (frames, opts) {
    if (typeof opts === 'number') opts *= LENT;
    else if (opts && typeof opts === 'object') {
      var o = {};
      for (var k in opts) o[k] = opts[k];
      if (typeof o.duration === 'number') o.duration *= LENT;
      if (typeof o.delay === 'number') o.delay *= LENT;
      if (typeof o.endDelay === 'number') o.endDelay *= LENT;
      opts = o;
    }
    return animate0.call(this, frames, opts);
  };

  /* 2 · Rellotges: el temps de la peça passa LENT vegades més a poc a poc */
  var ara0 = performance.now.bind(performance);
  performance.now = function () { return ara0() / LENT; };
  var raf0 = window.requestAnimationFrame;
  if (raf0) window.requestAnimationFrame = function (cb) {
    return raf0.call(window, function (t) { cb(t / LENT); });
  };
  var st0 = window.setTimeout, si0 = window.setInterval;
  window.setTimeout = function (fn, ms) {
    var a = Array.prototype.slice.call(arguments); a[1] = (Number(ms) || 0) * LENT; return st0.apply(window, a);
  };
  window.setInterval = function (fn, ms) {
    var a = Array.prototype.slice.call(arguments); a[1] = (Number(ms) || 0) * LENT; return si0.apply(window, a);
  };

  /* 3 · CSS: cada animació o transició nova, a 1/LENT de velocitat (una sola vegada per animació) */
  if (typeof WeakSet !== 'function' || !document.getAnimations) return;
  var vistes = new WeakSet();
  function frena() {
    var as = document.getAnimations();
    for (var i = 0; i < as.length; i++) {
      var a = as[i];
      if (vistes.has(a)) continue;
      vistes.add(a);
      if ((window.CSSAnimation && a instanceof CSSAnimation) || (window.CSSTransition && a instanceof CSSTransition)) a.playbackRate = 1 / LENT;
    }
  }
  new MutationObserver(frena).observe(document.documentElement, {subtree: true, childList: true, attributes: true});
  document.addEventListener('DOMContentLoaded', frena);
  window.addEventListener('load', frena);
})();
