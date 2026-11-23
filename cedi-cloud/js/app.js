/* Arranque: menú lateral, buscador, selectores de proyecto y región, y enrutado por hash. */
(function (C) {
  const $ = C.$, $$ = C.$$, esc = C.esc, I = C.icon;

  /* ---------- Iconos estáticos del HTML ---------- */
  $$('[data-icon]').forEach(function (el) {
    const tmp = document.createElement('span');
    tmp.innerHTML = I(el.getAttribute('data-icon'), +el.getAttribute('data-size') || 20);
    const svg = tmp.firstChild; if (el.className) svg.setAttribute('class', 'ic ' + el.className);
    el.replaceWith(svg);
  });

  /* ---------- Menú lateral ---------- */
  function buildNav() {
    let h = '<div class="nav-group"><a class="nav-link" href="#/inicio" data-route="inicio" title="Panel">' + I('home') + '<span class="t">Panel</span></a></div>';
    C.navCategories.forEach(function (cat) {
      h += '<div class="nav-group"><p class="nav-cat"><span>' + esc(cat.label) + '</span></p>';
      cat.services.forEach(function (id) {
        const s = C.serviceById[id];
        h += '<a class="nav-link" href="#/' + id + '" data-route="' + id + '" title="' + esc(s.name + ' · ' + s.sub) + '">' + I(s.icon) +
          '<span class="t">' + esc(s.name) + '<small>' + esc(s.sub) + '</small></span></a>';
      });
      h += '</div>';
    });
    h += '<div class="nav-group"><p class="nav-cat"><span>Referencia</span></p>' +
      '<a class="nav-link" href="#/glosario" data-route="glosario" title="Glosario de conceptos">' + I('book') + '<span class="t">Glosario</span></a>' +
      '<a class="nav-link" href="#/equivalencias" data-route="equivalencias" title="Equivalencias entre nubes">' + I('table') + '<span class="t">Equivalencias entre nubes</span></a></div>';
    $('#nav').innerHTML = h;
  }

  const isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };
  function setCollapsed(v) {
    C.state.collapsed = v; document.body.classList.toggle('side-collapsed', v); C.saveState();
    $('#btn-menu').setAttribute('aria-expanded', String(!v));
  }
  function setOpen(v) {
    document.body.classList.toggle('side-open', v);
    $('#btn-menu').setAttribute('aria-expanded', String(v));
  }
  $('#btn-menu').addEventListener('click', function () {
    if (isMobile()) setOpen(!document.body.classList.contains('side-open'));
    else setCollapsed(!document.body.classList.contains('side-collapsed'));
  });
  $('#backdrop').addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('side-open')) setOpen(false); });

  /* ---------- Selectores de proyecto y región ---------- */
  function refreshPickers() {
    const p = C.project(), r = C.region();
    $('#project-label').textContent = p.id;
    $('#region-label').textContent = r.city;
  }
  $('#pick-project').addEventListener('click', function (e) {
    C.openMenu(e.currentTarget, {
      title: 'Seleccionar proyecto', width: 320,
      items: C.projects.map(function (p) {
        return { id: p.id, active: p.id === C.state.project, html: '<span class="mi-main">' + esc(p.name) + '</span><span class="mi-sub mono">' + esc(p.id) + '</span>' };
      }),
      onPick: function (it) {
        if (it.id === C.state.project) return;
        C.state.project = it.id; C.saveState(); refreshPickers(); route(true);
        C.toast('Proyecto activo: ' + it.id);
      }
    });
  });
  $('#pick-region').addEventListener('click', function (e) {
    C.openMenu(e.currentTarget, {
      title: 'Seleccionar región', width: 380,
      items: C.regions.map(function (r) {
        return {
          id: r.id, group: r.area, active: r.id === C.state.region,
          html: '<span class="mi-main">' + esc(r.city) + '</span><span class="mi-sub mono">' + esc(r.gcp) + '</span>' +
            '<span class="mi-ids mono"><i class="dot aws"></i>' + esc(r.aws) + ' <i class="dot azure"></i>' + esc(r.azure) + '</span>'
        };
      }),
      onPick: function (it) {
        if (it.id === C.state.region) return;
        C.state.region = it.id; C.saveState(); refreshPickers(); route(true);
        C.toast('Región activa: ' + C.region().city);
      }
    });
  });

  /* ---------- Buscador ---------- */
  const qEl = $('#q'), resEl = $('#search-results');
  let hits = [], active = -1;
  const index = C.services.map(function (s) {
    return { type: 'svc', id: s.id, title: s.name, sub: s.cat + ' · ' + s.sub, icon: s.icon,
      hay: C.norm([s.name, s.sub, s.cat, s.gcp, s.aws, s.azure, (s.kw || []).join(' ')].join(' ')) };
  }).concat(C.concepts.map(function (k) {
    return { type: 'con', id: k.id, title: k.term, sub: C.conceptCats[k.cat], icon: 'book',
      hay: C.norm([k.term, (k.alias || []).join(' '), k.gcp, k.aws, k.azure].join(' ')) };
  }));

  function search(q) {
    const n = C.norm(q.trim());
    if (!n) return C.services.map(function (s) { return index.find(function (x) { return x.type === 'svc' && x.id === s.id; }); });
    const toks = n.split(/\s+/);
    const scored = [];
    index.forEach(function (it) {
      if (!toks.every(function (t) { return it.hay.indexOf(t) >= 0; })) return;
      const tn = C.norm(it.title);
      const score = tn === n ? 0 : tn.indexOf(n) === 0 ? 1 : tn.indexOf(n) > 0 ? 2 : 3;
      scored.push({ it: it, score: score + (it.type === 'svc' ? 0 : 10) });
    });
    scored.sort(function (a, b) { return a.score - b.score || a.it.title.localeCompare(b.it.title, 'es'); });
    return scored.map(function (s) { return s.it; }).slice(0, 12);
  }
  function renderResults() {
    const q = qEl.value;
    hits = search(q); active = hits.length ? 0 : -1;
    if (!hits.length) {
      resEl.innerHTML = '<div class="res-empty">Sin resultados para «' + esc(q) + '». Prueba con un servicio (BigQuery, S3) o un concepto (réplica, shuffle).</div>';
    } else {
      let h = '', last = '';
      hits.forEach(function (it, i) {
        const g = it.type === 'svc' ? 'Servicios' : 'Conceptos';
        if (g !== last) { h += '<div class="res-group">' + (q.trim() || it.type !== 'svc' ? g : 'Servicios') + '</div>'; last = g; }
        h += '<button type="button" role="option" class="res-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" id="res-' + i + '">' +
          '<span class="res-ico">' + I(it.icon, 18) + '</span><span class="res-txt"><b>' + C.mark(it.title, q.trim()) + '</b><small>' + esc(it.sub) + '</small></span></button>';
      });
      resEl.innerHTML = h;
    }
    resEl.hidden = false; qEl.setAttribute('aria-expanded', 'true');
  }
  function closeResults() { resEl.hidden = true; qEl.setAttribute('aria-expanded', 'false'); qEl.removeAttribute('aria-activedescendant'); }
  function setActive(i) {
    if (!hits.length) return;
    active = (i + hits.length) % hits.length;
    $$('.res-item', resEl).forEach(function (b, j) { b.classList.toggle('active', j === active); });
    const a = $('#res-' + active); if (a) { a.scrollIntoView({ block: 'nearest' }); qEl.setAttribute('aria-activedescendant', 'res-' + active); }
  }
  function go(it) {
    closeResults(); qEl.blur();
    location.hash = it.type === 'svc' ? '#/' + it.id : '#/glosario/' + it.id;
  }
  qEl.addEventListener('focus', renderResults);
  qEl.addEventListener('input', renderResults);
  qEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (resEl.hidden) renderResults(); else setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hits[active]) go(hits[active]); }
    else if (e.key === 'Escape') { if (!resEl.hidden) { closeResults(); } else { qEl.value = ''; qEl.blur(); } }
  });
  resEl.addEventListener('mousedown', function (e) { e.preventDefault(); });
  resEl.addEventListener('click', function (e) { const b = e.target.closest('.res-item'); if (b) go(hits[+b.getAttribute('data-i')]); });
  document.addEventListener('mousedown', function (e) { if (!e.target.closest('.search')) closeResults(); });
  document.addEventListener('keydown', function (e) {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); qEl.focus(); qEl.select(); }
  });

  /* ---------- Enrutado ---------- */
  const main = $('#main');
  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/');
    return { page: parts[0] || 'inicio', arg: parts[1] || '' };
  }
  function crumbsHTML(list) {
    if (!list.length) return '';
    return '<nav class="crumbs" aria-label="Ruta"><a href="#/inicio">Inicio</a>' +
      list.map(function (c) { return '<span class="sep">' + I('chevron-right', 14) + '</span><span>' + esc(c.label) + '</span>'; }).join('') + '</nav>';
  }
  let lastKey = '';
  function route(keepScroll) {
    const r = parse();
    let page;
    if (C.serviceById[r.page]) page = C.pages.service(r.page);
    else if (r.page === 'glosario') page = C.pages.glossary(r.arg);
    else if (r.page === 'equivalencias') page = C.pages.equivalences();
    else { page = C.pages.home(); r.page = 'inicio'; }

    C.disposeConsole(); C.hideTip(); C.closeMenu();
    main.innerHTML = '<div class="page">' + crumbsHTML(page.crumbs) + page.html + '</div>';
    document.title = (page.title === 'Panel' ? '' : page.title + ' · ') + 'CEDI CLOUD';
    $$('.nav-link').forEach(function (a) {
      const on = a.getAttribute('data-route') === r.page;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (page.after) page.after();
    const key = r.page + '/' + r.arg;
    if (!keepScroll || key !== lastKey) { if (!(r.page === 'glosario' && r.arg)) window.scrollTo(0, 0); }
    lastKey = key;
    if (isMobile()) setOpen(false);
  }
  window.addEventListener('hashchange', function () { route(false); });

  /* ---------- Inicio ---------- */
  buildNav();
  refreshPickers();
  setCollapsed(!isMobile() && C.state.collapsed);
  if (isMobile()) $('#btn-menu').setAttribute('aria-expanded', 'false');
  route(false);
  C.route = route;
})(window.CEDI);
