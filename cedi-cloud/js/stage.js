/* Ayudas de escenario reutilizables por todos los servicios. */
window.CEDI = window.CEDI || {};
(function (C) {
  const S = C.stage = {};

  /* Un «paquete» (etiqueta) viaja desde un elemento hasta otro dentro del escenario.
     Respeta la velocidad y la cancelación porque espera con ctx.sleep. */
  S.fly = async function (ctx, from, to, label, kind) {
    const st = ctx.stage, sr = st.getBoundingClientRect();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const pkt = document.createElement('div');
    pkt.className = 'pkt ' + (kind || '');
    pkt.textContent = label;
    st.appendChild(pkt);
    const w = pkt.offsetWidth, h = pkt.offsetHeight;
    const x0 = a.left - sr.left + a.width / 2 - w / 2, y0 = a.top - sr.top + a.height / 2 - h / 2;
    const x1 = b.left - sr.left + b.width / 2 - w / 2, y1 = b.top - sr.top + b.height / 2 - h / 2;
    pkt.style.left = x0 + 'px'; pkt.style.top = y0 + 'px';
    pkt.getBoundingClientRect();                                    // fuerza el reflujo antes de animar
    pkt.style.transform = 'translate(' + (x1 - x0) + 'px,' + (y1 - y0) + 'px)';
    try { await ctx.sleep(760); } finally { pkt.remove(); }
  };

  /* Destello verde o rojo sobre un elemento */
  S.flash = function (el, ok, ms) {
    const cls = ok ? 'flash-ok' : 'flash-err';
    el.classList.remove('flash-ok', 'flash-err'); void el.offsetWidth; el.classList.add(cls);
    const k = parseFloat(getComputedStyle(el).getPropertyValue('--k')) || 1;
    setTimeout(function () { el.classList.remove(cls); }, (ms || 1400) * k);
  };

  S.badge = function (el, text, kind) { el.className = 'badge ' + (kind || ''); el.textContent = text; };

  /* Medidor 0..1 con color según el nivel */
  S.setMeter = function (meter, value, label) {
    const bar = meter.querySelector('i');
    bar.style.width = Math.round(value * 100) + '%';
    bar.className = value > 0.6 ? 'hi' : value > 0.2 ? 'mid' : '';
    if (label != null) meter.querySelector('.meter-v').textContent = label;
  };
})(window.CEDI);
