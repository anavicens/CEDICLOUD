/* Efectos "wow": destellos al cambiar de estado, sacudida en los fallos, confeti al terminar.
   Todo es decorativo (no afecta a la lógica) y se desactiva con prefers-reduced-motion. */
(function (C) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OK = /^(ok|done|good|allow|on|hi|up|alive|new)$/, BAD = /^(fail|err|down|bad|lost|deny|dead)$/, WARN = /^(warn|hot|retry)$/;
  const FRASES = ['¡Misión cumplida!', '¡Lo has visto en acción!', '¡Así funciona la nube!', '¡Concepto desbloqueado!', '¡Esto ya es tuyo!', '¡Boom! Entendido'];
  const COL = ['#2f6df6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  let last = 0;

  function layer(pane) {
    let l = pane.querySelector(':scope > .wow-layer');
    if (!l) { l = document.createElement('div'); l.className = 'wow-layer'; l.setAttribute('aria-hidden', 'true'); pane.appendChild(l); }
    return l;
  }
  function piece(l, x, y, o) {
    const p = document.createElement('i'); p.className = 'wow-p' + (o.emoji ? ' emo' : '');
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.setProperty('--dx', o.dx + 'px'); p.style.setProperty('--dy', o.dy + 'px'); p.style.setProperty('--r', o.r + 'deg');
    p.style.animationDuration = o.t + 's';
    if (o.emoji) p.textContent = o.emoji; else { p.style.background = o.c; p.style.width = o.w + 'px'; p.style.height = o.h + 'px'; }
    l.appendChild(p); setTimeout(function () { p.remove(); }, o.t * 1000 + 100);
  }
  function burst(pane, x, y, n, spread, cols, emoji) {
    const l = layer(pane);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = spread * (0.4 + Math.random() * 0.6);
      piece(l, x, y, { dx: Math.cos(a) * d, dy: Math.sin(a) * d - spread * 0.3, r: Math.random() * 540 - 270, t: 0.7 + Math.random() * 0.5,
        c: cols[i % cols.length], w: 5 + Math.random() * 5, h: 4 + Math.random() * 5, emoji: emoji && i % 4 === 0 ? emoji : null });
    }
  }
  function ring(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 900); }

  C.wow = {
    attach: function (stage) {
      if (reduce || !window.MutationObserver) return;
      const pane = stage.parentNode; pane.classList.add('wow-host');
      new MutationObserver(function (list) {
        const now = performance.now();
        list.forEach(function (m) {
          if (m.type === 'childList') {   // lo que aparece entra con un fundido suave
            Array.prototype.forEach.call(m.addedNodes, function (n) { if (n instanceof HTMLElement && !n.classList.contains('wow-in') && n.getBoundingClientRect().width * n.getBoundingClientRect().height > 700) { n.classList.add('wow-in'); setTimeout(function () { n.classList.remove('wow-in'); }, 700); } });
            return;
          }
          const el = m.target; if (!(el instanceof HTMLElement) || el === stage) return;
          const before = (m.oldValue || '').split(/\s+/), add = Array.prototype.filter.call(el.classList, function (c) { return before.indexOf(c) < 0; });
          if (!add.length) return;
          const r = el.getBoundingClientRect(); if (r.width * r.height < 700) return;   // ignora celdas pequeñas
          const good = add.some(function (c) { return OK.test(c); }), bad = add.some(function (c) { return BAD.test(c); }), warn = add.some(function (c) { return WARN.test(c); });
          if (!good && !bad && !warn) return;
          ring(el, bad ? 'wow-ring-bad' : warn ? 'wow-ring-warn' : 'wow-ring-ok');
          if (bad) C.wow.shake(stage);
        });
      }).observe(stage, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true, childList: true });
    },
    shake: function (stage) {
      if (reduce) return; stage.classList.remove('wow-shake'); void stage.offsetWidth; stage.classList.add('wow-shake');
      setTimeout(function () { stage.classList.remove('wow-shake'); }, 500);
    },
    live: function (stage, on) { stage.classList.toggle('wow-live', !!on && !reduce); },
    celebrate: function (stage) {
      if (reduce) return; stage.classList.remove('wow-done'); void stage.offsetWidth; stage.classList.add('wow-done');
      setTimeout(function () { stage.classList.remove('wow-done'); }, 1400);
    }
  };
})(window.CEDI);
