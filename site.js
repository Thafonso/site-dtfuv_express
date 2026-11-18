/* ============================================================================
   Xpress · DTF têxtil + DTF UV — comportamento próprio da página.
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
  /* os dois únicos elementos que consomem a divisória; ver --seam em site.css */
  var splitEls = [document.querySelector('.world__uv'), document.querySelector('.rail')]
    .filter(Boolean);

  /* A página tem 6 atos. O pico (a aplicação) é o 3º: é ele que dirige a
     divisória sozinho, e é a partir do 4º que os dois mundos se fundem. */
  var PEAK_STOP = 3;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow  = window.matchMedia('(max-width: 860px)');

  /* ---- 0 · a altura de referência -------------------------------------- */

  /* No telefone a barra de endereço some e volta durante a rolagem: a largura
     não muda, a altura sim, uns 90px. Quem lê `innerHeight` a cada quadro vê
     esse número mudar sozinho e reage como se o leitor tivesse rolado — a
     parada corrente troca, o destaque do filme salta, a divisória atravessa a
     tela. O motor já ignora essas mudanças de propósito (scrollcraft.js,
     "Ignore URL-bar-only height changes on phones"); esta camada tem que
     seguir a mesma regra.

     A altura que vale é a do viewport grande, com a barra escondida: é dela
     que o CSS parte para dimensionar os atos em `vh`, então é com ela que o
     progresso tem que ser medido. `lvh` dá esse número e, por definição, não
     oscila com a barra. Sem suporte a `lvh`, sobra `innerHeight`, e aí o
     guarda de largura no resize evita o pior. */
  var vh = 0;
  var lastW = 0;

  function measureVh() {
    lastW = window.innerWidth;
    var probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    var h = probe.offsetHeight;
    probe.parentNode.removeChild(probe);
    vh = h > 0 ? h : window.innerHeight;
  }

  measureVh();

  /* ---- 1 · a divisória: posição de base por parada --------------------- */

  /* a posição de onde o pico começa a fechar a divisória: a mesma do ato 2,
     que é o ato imediatamente anterior */
  var BASE_WIDE   = 42;   /* % — mesmo valor de body[data-stop="2"] em site.css */
  var BASE_NARROW = 46;

  function baseSplit() { return narrow.matches ? BASE_NARROW : BASE_WIDE; }

  /* No telefone os dois lados viram duas faixas empilhadas. A divisória só faz
     sentido na costura entre elas, que depende da altura real do texto, então
     ela é medida, não arbitrada. */
  function seamOf(actEl) {
    var b = actEl && actEl.querySelector('.side--b');
    if (!b) return null;
    var top = b.getBoundingClientRect().top;
    if (top <= 0 || top >= vh) return null;
    return (top / vh) * 100;
  }

  var lastSeam = -1;

  function applySeam(n) {
    if (!narrow.matches) return false;
    var seam = seamOf(acts[n - 1]);
    if (seam === null) return false;
    /* direto nos dois elementos, não no <body>: --split herda e mexer nele no
       body recalcularia o estilo do documento inteiro a cada quadro */
    if (Math.abs(seam - lastSeam) > 0.4) {
      lastSeam = seam;
      var v = seam.toFixed(2) + '%';
      for (var i = 0; i < splitEls.length; i++) splitEls[i].style.setProperty('--seam', v);
    }
    return true;
  }

  function clearSeam() {
    lastSeam = -1;
    for (var i = 0; i < splitEls.length; i++) splitEls[i].style.removeProperty('--seam');
  }

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
    var line = vh * 0.5;
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
    if (n >= PEAK_STOP + 1) body.setAttribute('data-resolved', '');
    else                    body.removeAttribute('data-resolved');

    var active = Math.min(n, 5);
    for (var i = 0; i < links.length; i++) {
      var on = Number(links[i].getAttribute('data-stop-link')) === active;
      if (on) links[i].setAttribute('aria-current', 'true');
      else    links[i].removeAttribute('aria-current');
    }

    if (n === PEAK_STOP) return;         /* o pico dirige a divisória sozinho */
    body.style.removeProperty('--split');
    if ((n === 1 || n === 2) && applySeam(n)) { placeCap(0); return; }
    var map = { 1: 50, 2: baseSplit(), 4: 0, 5: 0, 6: 0 };
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
    var travel = el.offsetHeight - vh;
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

    if (stop === PEAK_STOP) {
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

  var seaming = false;

  function frame() {
    queued = false;
    applyStop(currentStop());

    /* Nos dois primeiros atos do telefone a divisória mora na costura entre as
       duas faixas, e esses atos rolam: medir uma vez por parada deixava a
       divisória até 59 pontos percentuais fora do lugar (lab/_seam), com a
       ficha do têxtil caindo sobre o chão azul do UV. Aqui ela é medida a cada
       quadro — barato porque `data-seam` desliga a transição de 720ms, que era
       o que custava caro. */
    var wantSeam = narrow.matches && (stop === 1 || stop === 2);
    if (wantSeam !== seaming) {
      seaming = wantSeam;
      if (wantSeam) body.setAttribute('data-seam', '');
      else        { body.removeAttribute('data-seam'); clearSeam(); }
    }
    if (wantSeam) applySeam(stop);

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
    /* Largura igual no telefone: foi só a barra de endereço. Nada a refazer. */
    if (narrow.matches && window.innerWidth === lastW) { schedule(); return; }
    measureVh();
    placeCap(parseFloat(getComputedStyle(body).getPropertyValue('--split')) || 50);
    if (stop === 1 || stop === 2) applySeam(stop);
    schedule();
  }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (stop === 1 || stop === 2) applySeam(stop); });
  }
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
