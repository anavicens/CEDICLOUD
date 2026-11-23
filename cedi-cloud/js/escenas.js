/* Escenas dibujadas con SVG para los ejemplos clave. Sustituyen el dibujo (setup/run) del ejemplo
   manteniendo su código, su cuestionario y su narración. Se carga antes de los servicios. */
(function (C) {
  const NS = 'http://www.w3.org/2000/svg', SC = C.scenes = {};
  const GREEN = '#10b981', AMBER = '#f59e0b', RED = '#ef4444', BLUE = '#2f6df6', GREY = '#cbd5e1', ORANGE = '#f97316', VIOLET = '#8b5cf6';
  function S(tag, a, p, txt) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; if (p) p.appendChild(e); return e; }
  const nf = function (n, d) { return Number(n).toLocaleString('es-ES', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  /* ---------- caja de herramientas ---------- */
  function kit(ctx, h) {
    const wrap = ctx.el('div', 'sc', null), svg = S('svg', { viewBox: '0 0 640 ' + h, role: 'img', 'aria-label': 'Esquema animado' }, wrap);
    const d = S('defs', {}, svg);
    S('filter', { id: 'glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, d).innerHTML = '<feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';
    S('filter', { id: 'sh', x: '-20%', y: '-20%', width: '140%', height: '150%' }, d).innerHTML = '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity=".13"/>';
    const k = { svg: svg, wrap: wrap, ctx: ctx };
    k.ms = function (ms) { return ms / ctx.speed; };
    k.g = function (x, y, p, cls) { return S('g', { transform: 'translate(' + x + ',' + y + ')', 'class': cls || '' }, p || svg); };
    k.T = function (x, y, t, cls, anchor, p) { return S('text', { x: x, y: y, 'class': cls || '', 'text-anchor': anchor || 'start' }, p || svg, t); };
    k.card = function (x, y, w, h2, p, cls) { return S('rect', { x: x, y: y, width: w, height: h2, rx: 10, 'class': 'card ' + (cls || '') }, p || svg); };
    k.fly = function (a, b, o) {
      o = o || {};
      const e = S(o.rect ? 'rect' : 'circle', o.rect ? { width: o.rect[0], height: o.rect[1], rx: 3, x: -o.rect[0] / 2, y: -o.rect[1] / 2 } : { r: o.r || 4.5, cx: 0, cy: 0 }, o.parent || svg);
      e.setAttribute('fill', o.c || BLUE); if (!o.noglow) e.setAttribute('filter', 'url(#glow)');
      const an = e.animate([{ transform: 'translate(' + a[0] + 'px,' + a[1] + 'px) scale(.5)', opacity: .2 }, { transform: 'translate(' + (a[0] + (b[0] - a[0]) * 0.15) + 'px,' + (a[1] + (b[1] - a[1]) * 0.15) + 'px) scale(1)', opacity: 1, offset: .15 }, { transform: 'translate(' + b[0] + 'px,' + b[1] + 'px) scale(1)', opacity: 1 }],
        { duration: Math.max(60, k.ms(o.ms || 600)), easing: 'ease-in-out', fill: 'forwards' });
      return an.finished.then(function () { if (!o.keep) e.remove(); return e; }, function () { e.remove(); });
    };
    k.pop = function (el, ms) {
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
      return el.animate([{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], { duration: k.ms(ms || 500), easing: 'ease-out' });
    };
    k.shake = function (el) { return el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: k.ms(450) }); };
    k.ring = function (x, y, c, r0) {
      const e = S('circle', { cx: x, cy: y, r: r0 || 10, fill: 'none', stroke: c || BLUE, 'stroke-width': 2.5 }, svg); e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center';
      e.animate([{ transform: 'scale(.6)', opacity: .9 }, { transform: 'scale(3)', opacity: 0 }], { duration: k.ms(900), easing: 'ease-out' }).finished.then(function () { e.remove(); }, function () { e.remove(); });
    };
    k.kpis = function (items) {
      const w = ctx.el('div', 'sc-kpis', null); w.style.gridTemplateColumns = 'repeat(' + items.length + ', minmax(0, 1fr))';
      return items.map(function (it) {
        const c = document.createElement('div'); c.innerHTML = '<b>' + it[1] + '</b><span>' + it[0] + '</span>'; w.appendChild(c);
        const b = c.firstChild; return { set: function (v, cls) { b.textContent = v; b.className = cls ? 'k-' + cls : ''; } };
      });
    };
    /* servidor dibujado: luces, nombre, barra de CPU */
    k.server = function (x, y, w, h2, label, o) {
      o = o || {};
      const g = k.g(x, y, o.parent), r = k.card(0, 0, w, h2, g);
      const leds = [0, 1, 2].map(function (i) { return S('circle', { cx: w - 12 - i * 10, cy: 11, r: 3, fill: GREY, 'class': 'led' }, g); });
      k.T(9, 15, label, 't-b', 'start', g).setAttribute('style', 'font-size:11.5px');
      const cp = k.T(9, 33, o.cpu === false ? '' : (o.unit || 'CPU') + ' 0 %', 't-sm', 'start', g);
      let bar = null;
      if (o.cpu !== false) { S('rect', { x: 9, y: h2 - 16, width: w - 18, height: 7, rx: 3.5, fill: '#e8eef7' }, g); bar = S('rect', { x: 9, y: h2 - 16, width: 0, height: 7, rx: 3.5, fill: GREEN, 'class': 'bar' }, g); }
      const o2 = {
        g: g, card: r, x: x, y: y, w: w, h: h2, cx: x + w / 2, cy: y + h2 / 2,
        state: function (s) {
          const col = s === 'on' ? GREEN : s === 'warn' || s === 'boot' ? AMBER : s === 'hot' || s === 'dead' ? RED : GREY;
          leds.forEach(function (l, i) { l.setAttribute('fill', s === 'on' ? (i === 0 ? col : '#a7f3d0') : s === 'off' ? GREY : col); l.classList.toggle('blink', s === 'boot'); });
          r.setAttribute('stroke', s === 'dead' ? RED : s === 'hot' ? RED : s === 'warn' ? AMBER : '#d5deeb');
        },
        cpu: function (p) { if (!bar) return; cp.textContent = (o.unit || 'CPU') + ' ' + Math.round(p) + ' %'; bar.style.width = (Math.min(100, p) / 100 * (w - 18)) + 'px'; bar.setAttribute('fill', p >= 85 ? RED : p >= 65 ? AMBER : GREEN); },
        text: function (t) { cp.textContent = t; }
      };
      o2.state(o.state || 'off'); return o2;
    };
    k.person = function (x, y, c, p) { const g = k.g(x, y, p); S('circle', { cx: 0, cy: -9, r: 6, fill: c || '#94a3b8' }, g); S('path', { d: 'M-10 8 Q-10 -2 0 -2 Q10 -2 10 8 Z', fill: c || '#94a3b8' }, g); return g; };
    k.line = function (x1, y1, x2, y2, cls, p) { return S('path', { d: 'M' + x1 + ' ' + y1 + ' C ' + ((x1 + x2) / 2) + ' ' + y1 + ', ' + ((x1 + x2) / 2) + ' ' + y2 + ', ' + x2 + ' ' + y2, 'class': cls || 'pipe' }, p || svg); };
    return k;
  }
  function reg(svc, ex, def) { SC[svc + '/' + ex] = def; }
  /* aplica las escenas a los ejemplos cuando cada servicio se registra */
  const orig = C.registerConsole;
  C.registerConsole = function (id, def) {
    (def.examples || []).forEach(function (ex) { const s = SC[id + '/' + ex.id]; if (s) { ex.setup = s.setup; ex.run = s.run; } });
    return orig.apply(this, arguments);
  };
  C._kit = kit; C._reg = reg; C._S = S; C._col = { GREEN: GREEN, AMBER: AMBER, RED: RED, BLUE: BLUE, GREY: GREY, ORANGE: ORANGE, VIOLET: VIOLET }; C._nf = nf;
})(window.CEDI);
