/* Páginas: panel de inicio, servicio, glosario y equivalencias. Cada función devuelve { title, crumbs, html, after }. */
window.CEDI = window.CEDI || {};
(function (C) {
  const esc = C.esc, I = C.icon, P = C.providers;

  function provChip(p, text) {
    return '<span class="prov"><i class="dot ' + p + '"></i><span class="prov-n">' + esc(P[p]) + '</span><span class="prov-v">' + esc(text) + '</span></span>';
  }
  function firstSentence(t) {
    const m = t.match(/^.*?[.](\s|$)/);
    return m ? m[0].trim() : t;
  }
  function servicesUsing(conceptId) {
    return C.services.filter(function (s) { return s.concepts.indexOf(conceptId) >= 0; });
  }

  /* ======================= INICIO ======================= */
  function zonesHTML() {
    const r = C.region();
    return '<div class="zones" role="img" aria-label="Región ' + esc(r.city) + ' con tres zonas independientes">' +
      ['a', 'b', 'c'].map(function (z) {
        return '<div class="zone"><div class="zone-rack"><i></i><i></i><i></i></div>' +
          '<b>zona ' + z + '</b><small>CPD independiente</small>' +
          '<span class="zone-tags"><em>energía propia</em><em>red propia</em></span></div>';
      }).join('') + '</div>';
  }

  function home() {
    const pr = C.project(), rg = C.region();
    const cards = C.services.map(function (s) {
      return '<article class="svc-card has-info">' + C.infoIcon('svc:' + s.id, 'corner') +
        '<div class="svc-card-ico">' + I(s.icon, 22) + '</div>' +
        '<p class="eyebrow">' + esc(s.cat) + '</p>' +
        '<h3><a class="stretch" href="#/' + s.id + '">' + esc(s.name) + '</a></h3>' +
        '<p class="svc-card-sub">' + esc(s.sub) + '</p>' +
        '<div class="prov-list">' + provChip('gcp', s.gcp) + provChip('aws', s.aws) + provChip('azure', s.azure) + '</div>' +
        '<span class="svc-card-go">Abrir consola ' + I('arrow-right', 16) + '</span></article>';
    }).join('');

    const status = C.services.map(function (s) {
      return '<tr><td><a href="#/' + s.id + '">' + esc(s.name) + '</a></td><td><span class="status ok"><i></i>Operativo</span></td>' +
        '<td class="mono">' + esc(s.sla) + '</td><td>' + esc(rg.city) + ' · 3 de 3 zonas</td></tr>';
    }).join('');

    return {
      title: 'Panel',
      crumbs: [],
      html:
        '<section class="hero">' +
          '<div class="hero-main">' +
            '<p class="eyebrow">Panel</p>' +
            '<h1>CEDI CLOUD</h1>' +
            '<p class="lead">Una consola de nube genérica para ver, con animaciones, qué pasa por detrás de IAM, el almacenamiento, la analítica, la computación, las bases de datos y la IA. Todo es simulado: no hay servidores reales.</p>' +
            '<ul class="hero-points">' +
              '<li><span>1</span><p>Elige un servicio en el menú lateral.</p></li>' +
              '<li><span>2</span><p>Pulsa un ejemplo, mira el código y lánzalo.</p></li>' +
              '<li><span>3</span><p>Pasa el ratón (o toca) en <b class="info-inline">i</b> para ver la definición y cómo se llama en Google Cloud, AWS y Azure.</p></li>' +
            '</ul>' +
          '</div>' +
          '<aside class="env-card has-info" aria-label="Entorno activo">' +
            C.infoIcon('region', 'corner') +
            '<p class="eyebrow">Entorno activo</p>' +
            '<dl class="env-dl">' +
              '<div><dt>' + C.term('proyecto', 'Proyecto') + '</dt><dd>' + esc(pr.name) + ' <span class="mono muted">' + esc(pr.id) + '</span></dd></div>' +
              '<div><dt>' + C.term('region', 'Región') + '</dt><dd>' + esc(rg.city) + ' <span class="mono muted">' + esc(rg.gcp) + '</span></dd></div>' +
            '</dl>' +
            zonesHTML() +
            '<p class="env-note">Cada ' + C.term('zona', 'zona') + ' es un centro de datos independiente de la región.</p>' +
          '</aside>' +
        '</section>' +

        '<section class="block"><div class="block-head"><h2>Servicios</h2><p>Los mismos servicios existen en las tres grandes nubes con distinto nombre.</p></div>' +
          '<div class="svc-grid">' + cards + '</div></section>' +

        '<section class="block"><div class="block-head"><h2>Estado de los servicios</h2><p>Valores de ejemplo para practicar con el ' + C.term('sla', 'SLA') + '.</p></div>' +
          '<div class="table-wrap"><table class="tbl"><thead><tr><th>Servicio</th><th>Estado</th><th>SLA objetivo (simulado)</th><th>Disponibilidad</th></tr></thead><tbody>' + status + '</tbody></table></div></section>'
    };
  }

  /* ======================= SERVICIO ======================= */
  function service(id) {
    const s = C.serviceById[id];
    const concepts = s.concepts.map(function (cid) {
      const k = C.conceptById[cid];
      return '<article class="concept has-info">' + C.infoIcon(cid, 'corner') +
        '<span class="concept-cat">' + esc(C.conceptCats[k.cat]) + '</span>' +
        '<h3>' + esc(k.term) + '</h3><p>' + esc(firstSentence(k.def)) + '</p></article>';
    }).join('');

    return {
      title: s.name,
      crumbs: s.cat === s.name ? [{ label: s.name }] : [{ label: s.cat }, { label: s.name }],
      html:
        '<header class="svc-head has-info">' + C.infoIcon('svc:' + s.id, 'corner') +
          '<div class="svc-ico">' + I(s.icon, 28) + '</div>' +
          '<div class="svc-head-txt"><p class="eyebrow">' + esc(s.cat) + '</p><h1>' + esc(s.name) + '</h1><p class="lead">' + esc(s.lead) + '</p>' +
          '<div class="prov-list inline">' + provChip('gcp', s.gcp) + provChip('aws', s.aws) + provChip('azure', s.azure) + '</div></div>' +
        '</header>' +
        '<div id="console-host"></div>' +
        '<section class="block"><div class="block-head"><h2>Conceptos clave</h2><p>Pasa el ratón (o toca) en <b class="info-inline">i</b> para ver la definición completa y las equivalencias.</p></div>' +
          '<div class="concept-grid">' + concepts + '</div></section>',
      after: function () { C.mountConsole(C.$('#console-host'), s); }
    };
  }

  /* ======================= GLOSARIO ======================= */
  function glossary(arg) {
    const cats = Object.keys(C.conceptCats);
    const items = C.concepts.slice().sort(function (a, b) { return a.term.localeCompare(b.term, 'es'); });
    const cards = items.map(function (k) {
      const used = servicesUsing(k.id);
      return '<article class="gl-card" id="gl-' + esc(k.id) + '" data-cat="' + k.cat + '" data-hay="' + esc(C.norm([k.term, (k.alias || []).join(' '), k.def, k.gcp, k.aws, k.azure].join(' '))) + '">' +
        '<div class="gl-top"><h3>' + esc(k.term) + '</h3><span class="concept-cat">' + esc(C.conceptCats[k.cat]) + '</span></div>' +
        '<p class="gl-def">' + esc(k.def) + '</p>' +
        (k.note ? '<p class="tip-note-light">' + esc(k.note) + '</p>' : '') +
        '<div class="prov-list">' + provChip('gcp', k.gcp) + provChip('aws', k.aws) + provChip('azure', k.azure) + '</div>' +
        (used.length ? '<p class="gl-used">Aparece en: ' + used.map(function (s) { return '<a href="#/' + s.id + '">' + esc(s.name) + '</a>'; }).join(' · ') + '</p>' : '') +
        '</article>';
    }).join('');

    return {
      title: 'Glosario',
      crumbs: [{ label: 'Referencia' }, { label: 'Glosario' }],
      html:
        '<header class="page-head"><p class="eyebrow">Referencia</p><h1>Glosario de conceptos</h1>' +
        '<p class="lead">Todos los conceptos clave con su definición corta y el nombre equivalente en Google Cloud, AWS y Azure.</p></header>' +
        '<div class="gl-tools"><label class="gl-search">' + I('search', 18) + '<input id="gl-q" type="search" placeholder="Filtrar el glosario…" aria-label="Filtrar el glosario" autocomplete="off"></label>' +
        '<div class="chips" id="gl-chips" role="group" aria-label="Filtrar por categoría"><button type="button" class="chip on" data-cat="">Todos</button>' +
        cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + c + '">' + esc(C.conceptCats[c]) + '</button>'; }).join('') + '</div></div>' +
        '<p class="gl-count" id="gl-count" aria-live="polite"></p>' +
        '<div class="gl-grid" id="gl-grid">' + cards + '</div>' +
        '<p class="gl-empty" id="gl-empty" hidden>Ningún concepto coincide con el filtro.</p>',
      after: function () {
        const q = C.$('#gl-q'), grid = C.$('#gl-grid'), chips = C.$('#gl-chips');
        let cat = '';
        function apply() {
          const n = C.norm(q.value.trim()); let shown = 0;
          C.$$('.gl-card', grid).forEach(function (el) {
            const ok = (!cat || el.getAttribute('data-cat') === cat) && (!n || el.getAttribute('data-hay').indexOf(n) >= 0);
            el.hidden = !ok; if (ok) shown++;
          });
          C.$('#gl-count').textContent = shown + ' de ' + items.length + ' conceptos';
          C.$('#gl-empty').hidden = shown !== 0;
        }
        q.addEventListener('input', apply);
        chips.addEventListener('click', function (e) {
          const b = e.target.closest('.chip'); if (!b) return;
          cat = b.getAttribute('data-cat');
          C.$$('.chip', chips).forEach(function (x) { x.classList.toggle('on', x === b); });
          apply();
        });
        apply();
        if (arg && C.conceptById[arg]) {
          const el = document.getElementById('gl-' + arg);
          if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 2200); }
        }
      }
    };
  }

  /* ======================= EQUIVALENCIAS ======================= */
  function equivalences() {
    const rows = C.equivalences.map(function (r) {
      return '<tr><th scope="row">' + esc(r.need) + (r.src === 'extra' ? ' <span class="tag-extra" title="No figura en la tabla del temario">ampliación</span>' : '') + '</th>' +
        '<td>' + esc(r.gcp) + '</td><td>' + esc(r.aws) + '</td><td>' + esc(r.azure) + '</td></tr>';
    }).join('');
    const regs = C.regions.map(function (r) {
      return '<tr><th scope="row">' + esc(r.city) + '</th><td class="mono">' + esc(r.gcp) + '</td><td class="mono">' + esc(r.aws) + '</td><td class="mono">' + esc(r.azure) + '</td></tr>';
    }).join('');
    const head = '<thead><tr><th></th><th><i class="dot gcp"></i>Google Cloud</th><th><i class="dot aws"></i>AWS</th><th><i class="dot azure"></i>Azure</th></tr></thead>';
    return {
      title: 'Equivalencias entre nubes',
      crumbs: [{ label: 'Referencia' }, { label: 'Equivalencias entre nubes' }],
      html:
        '<header class="page-head"><p class="eyebrow">Referencia</p><h1>Equivalencias entre nubes</h1>' +
        '<p class="lead">Qué servicio cubre cada necesidad en Google Cloud, AWS y Azure. Las filas sin marca vienen del temario.</p></header>' +
        '<section class="block"><div class="table-wrap"><table class="tbl eq">' + head + '<tbody>' + rows + '</tbody></table></div></section>' +
        '<section class="block"><div class="block-head"><h2>Regiones del selector</h2><p>La misma ciudad tiene un identificador distinto en cada proveedor.</p></div>' +
        '<div class="table-wrap"><table class="tbl eq">' + head.replace('<th></th>', '<th>Ciudad</th>') + '<tbody>' + regs + '</tbody></table></div></section>'
    };
  }

  C.pages = {
    home: home,
    service: service,
    glossary: glossary,
    equivalences: equivalences
  };
})(window.CEDI);
