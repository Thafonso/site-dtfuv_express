/* ============================================================================
   Xpress · DTF UV — comportamento próprio da página.
   O motor (scrollcraft.js) não é tocado. Tudo aqui lê posição de scroll e
   escreve apenas custom properties, transform e opacity.
   ========================================================================= */
(function () {
  'use strict';

  ScrollCraft.mount(document.body);

  var body    = document.body;
  var cap     = document.getElementById('cap');
  var peelEl  = document.getElementById('peel');
  var panel   = peelEl && peelEl.querySelector('.peel__panel');
  var hint    = document.getElementById('peel-hint');
  var acts    = Array.prototype.slice.call(document.querySelectorAll('.act'));
  var links   = Array.prototype.slice.call(document.querySelectorAll('[data-stop-link]'));
  var peakAct = document.getElementById('aplicacao');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow  = window.matchMedia('(max-width: 860px)');

  /* ---- 1 · a divisória: posição de base por parada --------------------- */

  var BASE_WIDE   = 31;   /* % — mesmo valor de body[data-stop="4"] em site.css */
  var BASE_NARROW = 34;

  function baseSplit() { return narrow.matches ? BASE_NARROW : BASE_WIDE; }

  /* ---- 2 · o cap acompanha a linha, sem sair da tela ------------------- */

  function placeCap(splitPercent) {
    if (!cap || narrow.matches) return;
    var vw   = document.documentElement.clientWidth;
    var half = cap.offsetWidth / 2;
    var x    = (splitPercent / 100) * vw;
    var min  = half + 16;
    var max  = vw - half - 16;
    cap.style.setProperty('--cap-x', Math.max(min, Math.min(max, x)).toFixed(1) + 'px');
  }

  /* ---- 3 · parada corrente -------------------------------------------- */

  var stop = 0;

  function currentStop() {
    var line = window.innerHeight * 0.5;
    var n = 1;
    for (var i = 0; i < acts.length; i++) {
      if (acts[i].getBoundingClientRect().top <= line) n = i + 1;
    }
    return n;
  }

  function applyStop(n) {
    if (n === stop) return;
    stop = n;
    body.setAttribute('data-stop', String(n));
    if (n >= 6) body.setAttribute('data-resolved', '');
    else        body.removeAttribute('data-resolved');

    var active = Math.min(n, 7);
    for (var i = 0; i < links.length; i++) {
      var on = Number(links[i].getAttribute('data-stop-link')) === active;
      if (on) links[i].setAttribute('aria-current', 'true');
      else    links[i].removeAttribute('aria-current');
    }

    if (n === 5) return;                 /* o ato 5 dirige a divisória sozinho */
    body.style.removeProperty('--split');
    var map = { 1: 50, 2: 44, 3: 38, 4: baseSplit(), 6: 0, 7: 0, 8: 0 };
    placeCap(narrow.matches ? 0 : (map[n] !== undefined ? map[n] : 0));
  }

  /* ---- 4 · o pico: scroll e dedo dirigem o destaque -------------------- */

  var dragOffset = 0;
  var dragging   = false;
  var dragFrom   = 0;
  var dragBase   = 0;
  var scrollPeel = 0;

  function smooth(v, a, b) {
    var t = (v - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  function actProgress(el) {
    var travel = el.offsetHeight - window.innerHeight;
    if (travel <= 1) return 0;
    var p = -el.getBoundingClientRect().top / travel;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function drivePeak() {
    if (!peakAct || !peelEl) return;

    var p = actProgress(peakAct);
    var inside = p > 0 && p < 1;

    if (inside) body.setAttribute('data-peak', '');
    else        body.removeAttribute('data-peak');

    /* O scroll leva até 0.68. O resto é prêmio de quem arrasta: a aba dobrada
       passa da borda da peça, que é o que acontece de verdade. */
    scrollPeel = reduced.matches ? 0.5 : smooth(p, 0.30, 0.78) * 0.56;

    var peel = scrollPeel + dragOffset;
    peel = peel < 0 ? 0 : peel > 0.78 ? 0.78 : peel;
    peelEl.style.setProperty('--peel', peel.toFixed(4));

    if (stop === 5) {
      var collapse = smooth(p, 0.56, 0.94);
      var split = baseSplit() * (1 - collapse);
      body.style.setProperty('--split', split.toFixed(2) + '%');
      placeCap(narrow.matches ? 0 : split);
    }

    if (!dragging && dragOffset !== 0) {
      dragOffset *= 0.86;
      if (Math.abs(dragOffset) < 0.002) dragOffset = 0;
    }
  }

  if (panel && !reduced.matches) {
    panel.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      dragFrom = e.clientX;
      dragBase = dragOffset;
      body.setAttribute('data-dragged', '');
      panel.setPointerCapture(e.pointerId);
    });

    panel.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var w = panel.offsetWidth || 1;
      dragOffset = dragBase + (dragFrom - e.clientX) / w;
      if (dragOffset > 0.9) dragOffset = 0.9;
      if (dragOffset < -0.9) dragOffset = -0.9;
      schedule();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { panel.releasePointerCapture(e.pointerId); } catch (err) {}
      schedule();
    }
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  } else if (hint) {
    hint.hidden = true;
  }

  /* ---- 5 · um laço só -------------------------------------------------- */

  var queued = false;
  var settling = false;

  function frame() {
    queued = false;
    applyStop(currentStop());
    drivePeak();
    if (dragging || dragOffset !== 0) schedule();   /* mola de volta */
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () {
    placeCap(parseFloat(getComputedStyle(body).getPropertyValue('--split')) || 50);
    schedule();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  stop = 0;
  applyStop(currentStop());
  schedule();

  /* ---- 6 · menu do telefone ------------------------------------------- */

  var menuBtn = document.querySelector('.cap__menu');
  var stopsNav = document.getElementById('stops');

  function setMenu(open) {
    body.setAttribute('data-menu', open ? 'open' : 'closed');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(body.getAttribute('data-menu') !== 'open');
    });
  }
  /* rolagem suave só nos links internos; o scroll programático do motor e do
     harness continua instantâneo */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    });
  });

  if (stopsNav) {
    stopsNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.getAttribute('data-menu') === 'open') {
      setMenu(false);
      if (menuBtn) menuBtn.focus();
    }
  });
  setMenu(false);
})();
