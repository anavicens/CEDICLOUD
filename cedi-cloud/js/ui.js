/* Utilidades de interfaz: escape, iconos «i» con tooltip, menús desplegables y avisos. */
window.CEDI = window.CEDI || {};
(function (C) {
  const $ = function (s, r) { return (r || document).querySelector(s); };
  C.$ = $;
  C.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  C.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  /* Minúsculas y sin acentos, para buscar */
  C.norm = function (s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  };
  C.mark = function (text, q) {
    const t = String(text), n = C.norm(t), i = q ? n.indexOf(C.norm(q)) : -1;
    if (i < 0) return C.esc(t);
    return C.esc(t.slice(0, i)) + '<mark>' + C.esc(t.slice(i, i + q.length)) + '</mark>' + C.esc(t.slice(i + q.length));
  };

  /* ============ Iconos «i» con definición y nombres en las tres nubes ============ */
  function getInfo(id) {
    if (id.indexOf('svc:') === 0) {
      const s = C.serviceById[id.slice(4)];
      if (!s) return null;
      return { term: s.name, catLabel: 'Servicio · ' + s.cat, def: s.def, gcp: s.gcp, aws: s.aws, azure: s.azure, id: null };
    }
    const k = C.conceptById[id];
    if (!k) return null;
    return { term: k.term, catLabel: C.conceptCats[k.cat], def: k.def, gcp: k.gcp, aws: k.aws, azure: k.azure, note: k.note, id: k.id };
  }

  /* HTML del botón «i». Colócalo dentro de un contenedor .has-info para que quede arriba a la derecha. */
  C.infoIcon = function (id, cls) {
    const info = getInfo(id);
    if (!info) { if (window.console) console.warn('Concepto sin definir:', id); return ''; }
    return '<button type="button" class="info ' + (cls || '') + '" data-info="' + C.esc(id) + '" aria-label="Qué es: ' + C.esc(info.term) + '">i</button>';
  };
  /* Término suelto dentro de un texto, con subrayado punteado y tooltip */
  C.term = function (id, label) {
    const info = getInfo(id);
    if (!info) return C.esc(label || id);
    return '<span class="term" tabindex="0" data-info="' + C.esc(id) + '">' + C.esc(label || info.term) + '</span>';
  };

  const tip = function () { return $('#tip'); };
  let hideT = null, showT = null, current = null, pinned = false;

  function tipHTML(info) {
    const rows = ['gcp', 'aws', 'azure'].map(function (p) {
      return '<div><dt><i class="dot ' + p + '"></i>' + C.providers[p] + '</dt><dd>' + C.esc(info[p]) + '</dd></div>';
    }).join('');
    return '<div class="tip-h"><strong>' + C.esc(info.term) + '</strong><span class="tip-cat">' + C.esc(info.catLabel) + '</span></div>' +
      '<p class="tip-def">' + C.esc(info.def) + '</p>' +
      (info.note ? '<p class="tip-note">' + C.esc(info.note) + '</p>' : '') +
      '<p class="tip-sub">En cada nube se llama:</p><dl class="tip-prov">' + rows + '</dl>' +
      (info.id ? '<a class="tip-more" href="#/glosario/' + C.esc(info.id) + '">Ver en el glosario →</a>' : '');
  }

  function place(anchor) {
    const t = tip(), r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = t.offsetWidth, h = t.offsetHeight;
    let left = r.right - w;                       // alineado a la derecha del icono (suelen estar arriba a la derecha)
    if (left < 10) left = Math.min(r.left, vw - w - 10);
    left = Math.max(10, Math.min(left, vw - w - 10));
    let top = r.bottom + 8;
    if (top + h > vh - 10 && r.top - h - 8 > 10) top = r.top - h - 8;   // si no cabe debajo, va encima
    t.style.left = left + 'px';
    t.style.top = Math.max(10, top) + 'px';
  }

  function show(anchor) {
    clearTimeout(hideT); clearTimeout(showT);
    const info = getInfo(anchor.getAttribute('data-info'));
    if (!info) return;
    const t = tip();
    if (current && current !== anchor) current.removeAttribute('aria-describedby');
    current = anchor;
    t.innerHTML = tipHTML(info);
    t.hidden = false;
    t.classList.remove('on');
    anchor.setAttribute('aria-describedby', 'tip');
    place(anchor);
    requestAnimationFrame(function () { t.classList.add('on'); });
  }
  function hide() {
    clearTimeout(showT); clearTimeout(hideT);
    const t = tip();
    t.classList.remove('on'); t.hidden = true; pinned = false;
    if (current) { current.removeAttribute('aria-describedby'); current = null; }
  }
  function hideSoon() { clearTimeout(showT); clearTimeout(hideT); hideT = setTimeout(function () { if (!pinned) hide(); }, 220); }
  C.hideTip = hide;

  document.addEventListener('mouseover', function (e) {
    const a = e.target.closest && e.target.closest('[data-info]');
    if (a) { clearTimeout(hideT); clearTimeout(showT); showT = setTimeout(function () { show(a); }, 90); return; }
    if (e.target.closest && e.target.closest('#tip')) clearTimeout(hideT);
  });
  document.addEventListener('mouseout', function (e) {
    const a = e.target.closest && e.target.closest('[data-info]');
    const to = e.relatedTarget;
    if (a && !(to && to.closest && to.closest('#tip'))) hideSoon();
    else if (e.target.closest && e.target.closest('#tip') && !(to && to.closest && (to.closest('#tip') || to.closest('[data-info]')))) hideSoon();
  });
  document.addEventListener('focusin', function (e) { const a = e.target.closest && e.target.closest('[data-info]'); if (a) show(a); });
  document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('[data-info]') && !pinned) hideSoon(); });
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('[data-info]');
    if (a) { e.preventDefault(); e.stopPropagation(); if (current === a && pinned) { hide(); } else { show(a); pinned = true; } return; }
    if (!(e.target.closest && e.target.closest('#tip'))) hide();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', function () { if (current && !tip().hidden) place(current); }, true);
  window.addEventListener('resize', function () { if (current && !tip().hidden) place(current); });

  /* ============ Menú desplegable genérico (proyecto, región) ============ */
  let openMenuEl = null, openAnchor = null;
  C.closeMenu = function () {
    if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
    if (openAnchor) { openAnchor.setAttribute('aria-expanded', 'false'); openAnchor = null; }
  };
  C.openMenu = function (anchor, o) {
    const was = openAnchor === anchor;
    C.closeMenu();
    if (was) return;
    const m = document.createElement('div');
    m.className = 'menu'; m.setAttribute('role', 'listbox');
    if (o.width) m.style.width = o.width + 'px';
    let html = o.title ? '<div class="menu-title">' + o.title + '</div>' : '';
    let lastGroup = null;
    o.items.forEach(function (it, i) {
      if (it.group && it.group !== lastGroup) { html += '<div class="menu-group">' + C.esc(it.group) + '</div>'; lastGroup = it.group; }
      html += '<button type="button" role="option" class="menu-item' + (it.active ? ' active' : '') + '" data-i="' + i + '" aria-selected="' + (!!it.active) + '">' + it.html + '</button>';
    });
    m.innerHTML = html;
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = (r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(r.left, document.documentElement.clientWidth - m.offsetWidth - 8)) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    openMenuEl = m; openAnchor = anchor;
    const items = C.$$('.menu-item', m);
    const act = items.find(function (b) { return b.classList.contains('active'); }) || items[0];
    if (act) act.focus();
    m.addEventListener('click', function (e) {
      const b = e.target.closest('.menu-item'); if (!b) return;
      const it = o.items[+b.getAttribute('data-i')];
      C.closeMenu(); anchor.focus(); if (o.onPick) o.onPick(it);
    });
    m.addEventListener('keydown', function (e) {
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { C.closeMenu(); anchor.focus(); }
    });
  };
  document.addEventListener('mousedown', function (e) {
    if (openMenuEl && !openMenuEl.contains(e.target) && !(openAnchor && openAnchor.contains(e.target))) C.closeMenu();
  });
  window.addEventListener('resize', C.closeMenu);

  /* ============ Avisos ============ */
  C.toast = function (msg) {
    const host = $('#toasts'), el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 250); }, 2800);
  };
})(window.CEDI);
