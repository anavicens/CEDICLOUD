/* Servicio Almacenamiento: data lake en capas, subida de ficheros, clases de almacenamiento y responsabilidad compartida. */
(function (C) {
  const S = C.stage, I = C.icon, esc = C.esc;
  const BUCKET = 'gs://curso-bigdata-ventas';

  /* ---------- Utilidades ---------- */
  function fmt(bytes) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = bytes;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toLocaleString('es-ES', { maximumFractionDigits: v >= 100 || i === 0 ? 0 : 1 }) + ' ' + u[i];
  }
  const GB = 1024 * 1024 * 1024, MB = 1024 * 1024;

  /* Ficheros subidos por la persona: se guardan en el navegador para que «se queden» */
  const LK = 'cedi-cloud-v1-lake';
  let uploads = [];
  try { uploads = JSON.parse(localStorage.getItem(LK) || '[]'); } catch (e) { uploads = []; }
  function saveUploads() { try { localStorage.setItem(LK, JSON.stringify(uploads)); } catch (e) { /* sin almacenamiento: queda en memoria */ } }

  /* ---------- Componentes de escenario ---------- */
  function lakeView(ctx, lanes, parent) {
    const root = ctx.el('div', 'lake', parent);
    const out = { root: root, lanes: {} };
    lanes.forEach(function (l) {
      const el = ctx.el('div', 'lane', root,
        '<div class="lane-h"><b>' + esc(l.title) + '</b><small>' + esc(l.sub) + '</small><span class="lane-k">' + esc(l.prefix) + '</span></div><div class="objs"></div>');
      el.style.setProperty('--lane', l.color);
      out.lanes[l.id] = { el: el, body: el.querySelector('.objs') };
    });
    return out;
  }
  const LANES = [
    { id: 'raw', title: 'Bruta', sub: 'Datos tal como llegan, sin tocar', prefix: 'raw/', color: '#b45309' },
    { id: 'clean', title: 'Depurada', sub: 'Validados, sin duplicados, en Parquet', prefix: 'clean/', color: '#64748b' },
    { id: 'curated', title: 'Negocio', sub: 'Tablas agregadas para informes', prefix: 'curated/', color: '#ca8a04' }
  ];
  /* Un objeto dentro de una capa o clase. o: { name, size (texto), badge: [texto, tipo] } */
  function objChip(ctx, body, o, animate) {
    const ext = (o.name.split('.').pop() || '').toLowerCase();
    const el = ctx.el('div', 'obj' + (animate ? ' pop' : ''), body,
      '<span class="fi ' + esc(ext) + '">' + esc(ext.slice(0, 4).toUpperCase()) + '</span>' +
      '<div><div class="obj-n">' + esc(o.name) + '</div><div class="obj-s">' + esc(o.size) + '</div></div>' +
      (o.badge ? '<span class="badge ' + (o.badge[1] || '') + '">' + esc(o.badge[0]) + '</span>' : ''));
    el.sizeEl = el.querySelector('.obj-s'); el.badgeEl = el.querySelector('.badge');
    return el;
  }

  /* ====================================================================
     1. Subir un fichero a la capa bruta
     ==================================================================== */
  let picked = null, lake1 = null;
  function renderLake1(ctx, animateName) {
    if (lake1) lake1.root.remove();
    lake1 = lakeView(ctx, LANES);
    const raw = lake1.lanes.raw.body;
    objChip(ctx, raw, { name: 'ventas_2026-10.csv', size: '1,2 GB', badge: ['Standard', 'info'] });
    objChip(ctx, raw, { name: 'clientes.json', size: '340 MB', badge: ['Standard', 'info'] });
    uploads.forEach(function (u) {
      const el = objChip(ctx, raw, { name: u.name, size: fmt(u.size), badge: ['Standard', 'info'] }, u.name === animateName);
      el.dataset.up = '1';
    });
  }

  const ex1 = {
    id: 'subir', label: 'Subir un fichero a la capa bruta',
    desc: 'Elige un fichero tuyo (o usa el de ejemplo) y comprueba que se queda guardado',
    code:
      '# Subir un fichero a la capa bruta del bucket\n' +
      'gcloud storage cp ventas_2026-11.csv \\\n' +
      '  gs://curso-bigdata-ventas/raw/\n\n' +
      '# Listar el contenido\n' +
      'gcloud storage ls gs://curso-bigdata-ventas/raw/',
    setup: function (ctx) {
      const pk = ctx.el('div', 'picker', null,
        '<label class="btn-file">Elegir fichero…<input type="file"></label>' +
        '<span class="pick-name"></span>' +
        '<button type="button" class="link-btn" data-clear>Vaciar mis ficheros</button>');
      const nameEl = pk.querySelector('.pick-name'), input = pk.querySelector('input');
      const src = ctx.el('div', 'src', null, '<span class="rico">' + I('server', 16) + '</span><div><b>Tu equipo</b><small class="src-n"></small></div>');
      const srcN = src.querySelector('.src-n');
      function label() {
        if (picked) { nameEl.textContent = 'Seleccionado: ' + picked.name + ' (' + fmt(picked.size) + ')'; srcN.textContent = picked.name + ' · ' + fmt(picked.size); }
        else { nameEl.textContent = 'Sin elegir: se usará ventas_2026-11.csv de ejemplo (2,6 GB).'; srcN.textContent = 'ventas_2026-11.csv · 2,6 GB'; }
      }
      label();
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) { picked = { name: input.files[0].name, size: input.files[0].size }; label(); }
      });
      pk.querySelector('[data-clear]').addEventListener('click', function () {
        uploads = []; saveUploads(); ctx.stage.innerHTML = ''; ex1.setup(ctx); ctx.log('Se han vaciado tus ficheros subidos.', 'dim');
      });
      lake1 = null;
      renderLake1(ctx);
    },
    run: async function (ctx) {
      const f = picked || { name: 'ventas_2026-11.csv', size: 2.6 * GB };
      const zonaBase = C.region().gcp;
      ctx.log('Fichero local: ' + f.name + ' (' + fmt(f.size) + ')');
      await ctx.sleep(500);
      ctx.log('Se sube a ' + BUCKET + '/raw/ en la región ' + C.region().city + '.');
      const n = 4, parts = [];
      for (let i = 1; i <= n; i++) parts.push(i);
      const raw = lake1.lanes.raw.body, src = C.$('.src', ctx.stage);
      const existing = C.$$('.obj', raw).filter(function (o) { return o.querySelector('.obj-n').textContent === f.name; })[0];
      if (existing) { ctx.log('Ya existía un objeto con ese nombre: se sustituye entero (los objetos no se editan a trozos).', 'warn'); existing.remove(); }
      const chip = objChip(ctx, raw, { name: f.name, size: fmt(f.size), badge: ['subiendo…', 'warn'] }, true);
      await ctx.sleep(300);
      ctx.log('El fichero se divide en ' + n + ' partes que viajan en paralelo.', 'dim');
      await Promise.all(parts.map(function (p) {
        return ctx.sleep((p - 1) * 170).then(function () { return S.fly(ctx, src, chip, 'parte ' + p + '/' + n); });
      }));
      ctx.log('Las ' + n + ' partes han llegado: se ensambla el objeto raw/' + f.name, 'ok');
      S.badge(chip.badgeEl, 'Standard', 'info');
      await ctx.sleep(500);
      const z = ctx.el('span', 'zdots', chip, '<i></i><i></i><i></i> zonas');
      ctx.log('El proveedor guarda varias copias en zonas distintas:', 'dim');
      const dots = C.$$('i', z);
      for (let i = 0; i < 3; i++) { await ctx.sleep(450); dots[i].classList.add('on'); ctx.log('copia en ' + zonaBase + '-' + 'abc'[i], 'ok'); }
      ctx.log('Durabilidad diseñada para «once nueves» (99,999999999 % anual).', 'ok');
      S.flash(chip, true);

      const prev = uploads.filter(function (u) { return u.name !== f.name; });
      prev.push({ name: f.name, size: f.size }); uploads = prev; saveUploads();
      await ctx.sleep(900);
      ctx.log('$ gcloud storage ls ' + BUCKET + '/raw/', 'dim');
      ['ventas_2026-10.csv', 'clientes.json'].concat(uploads.map(function (u) { return u.name; })).forEach(function (n2) { ctx.log(BUCKET + '/raw/' + n2); });
      await ctx.sleep(900);
      ctx.log('Recargas la consola… el fichero sigue ahí: es un objeto guardado, no una vista temporal.', 'dim');
      lake1.root.classList.add('is-dim');
      await ctx.sleep(700);
      renderLake1(ctx, f.name);
      const again = C.$$('.obj', lake1.lanes.raw.body).filter(function (o) { return o.dataset.up && o.querySelector('.obj-n').textContent === f.name; })[0];
      if (again) S.flash(again, true, 2200);
      ctx.log('Tus ficheros subidos se guardan en este navegador: también sobreviven si cierras la pestaña.', 'ok');
    }
  };

  /* ====================================================================
     2. Promover bruta → depurada → negocio
     ==================================================================== */
  let lake2 = null;
  const ex2 = {
    id: 'capas', lang: 'python', label: 'Promover bruta → depurada → negocio',
    desc: 'Un CSV de 20 GB se convierte en Parquet y luego en una tabla pequeña para informes',
    code:
      '# Capa bruta → depurada\n' +
      'df = spark.read.csv("gs://curso-bigdata-ventas/raw/ventas_2026-10.csv", header=True)\n' +
      'limpio = df.dropDuplicates().filter("importe > 0")\n' +
      'limpio.write.parquet("gs://curso-bigdata-ventas/clean/ventas_2026-10/")\n\n' +
      '# Capa depurada → negocio\n' +
      'tabla = (spark.read.parquet("gs://curso-bigdata-ventas/clean/ventas_2026-10/")\n' +
      '              .groupBy("ciudad", "mes").sum("importe"))\n' +
      'tabla.write.parquet("gs://curso-bigdata-ventas/curated/ventas_por_ciudad/")',
    setup: function (ctx) {
      lake2 = lakeView(ctx, LANES);
      objChip(ctx, lake2.lanes.raw.body, { name: 'ventas_2026-10.csv', size: '20 GB · 100 M de filas', badge: ['sin tocar', 'warn'] });
      const job = ctx.el('div', 'job', null, '<b>' + I('zap', 14) + ' Trabajo Spark</b><div class="job-bar"><i></i></div><small>en reposo</small>');
      lake2.job = job; lake2.bar = job.querySelector('i'); lake2.state = job.querySelector('small');
      const cmp = ctx.el('div', 'cmp', null,
        '<div class="policy-title">Qué lee el informe de dirección</div>' +
        '<div class="cmp-row"><span>Desde la capa bruta</span><div class="meter-bar"><i class="hi" style="width:100%"></i></div><span>20 GB</span></div>' +
        '<div class="cmp-row"><span>Desde la capa negocio</span><div class="meter-bar"><i style="width:0%" data-n></i></div><span data-v>—</span></div>');
      cmp.style.visibility = 'hidden'; lake2.cmp = cmp;
    },
    run: async function (ctx) {
      const L = lake2, rawChip = C.$('.obj', L.lanes.raw.body);
      async function job(label, secs) {
        L.state.textContent = label; L.bar.style.width = '0%'; await ctx.sleep(60);
        L.bar.style.width = '100%'; await ctx.sleep(secs);
      }
      ctx.log('La capa bruta guarda el CSV tal como llegó. No se modifica nunca.');
      await ctx.sleep(800);
      ctx.log('Trabajo 1 — depurar: lee 20 GB de CSV, descarta duplicados y filas con importe ≤ 0, y escribe en Parquet.');
      await S.fly(ctx, rawChip, L.job, 'CSV 20 GB');
      await job('depurando…', 1500);
      ctx.log('Descartadas 2,4 M de filas duplicadas o inválidas (cifras de ejemplo).', 'dim');
      await S.fly(ctx, L.job, L.lanes.clean.body, 'Parquet');
      const c1 = objChip(ctx, L.lanes.clean.body, { name: 'ventas_2026-10.parquet', size: '3 GB · 97,6 M de filas', badge: ['−85 % de tamaño', 'ok'] }, true);
      L.state.textContent = 'listo'; S.flash(c1, true);
      ctx.log('Parquet es columnar y comprime mucho: 20 GB → 3 GB (entre 5 y 10 veces menos).', 'ok');
      ctx.log('La capa bruta se conserva: si hay un error en la depurada, se recalcula desde ella.', 'dim');
      await ctx.sleep(900);
      ctx.log('Trabajo 2 — agregar: suma el importe por ciudad y mes.');
      await S.fly(ctx, c1, L.job, 'Parquet 3 GB');
      await job('agregando…', 1300);
      await S.fly(ctx, L.job, L.lanes.curated.body, 'tabla');
      const c2 = objChip(ctx, L.lanes.curated.body, { name: 'ventas_por_ciudad.parquet', size: '48 MB · 1.200 filas', badge: ['lista para informes', 'ok'] }, true);
      L.state.textContent = 'listo'; S.flash(c2, true);
      await ctx.sleep(900);
      ctx.log('El informe de dirección lee solo la capa negocio:', 'dim');
      L.cmp.style.visibility = 'visible'; L.cmp.classList.add('pop');
      await ctx.sleep(300);
      const bar = C.$('[data-n]', L.cmp); bar.style.width = '3%'; C.$('[data-v]', L.cmp).textContent = '48 MB';
      ctx.log('48 MB en lugar de 20 GB: más rápido y, en servicios que cobran por bytes leídos, mucho más barato.', 'ok');
      ctx.log('Cada capa tiene un propósito. Sin esta organización, el lago se convierte en un «pantano de datos».', 'warn');
    }
  };

  /* ====================================================================
     3. Mover datos a Nearline, Coldline y Archive
     ==================================================================== */
  const TIERS = [
    { id: 'STANDARD', name: 'Standard', use: 'a diario', store: 4, read: 0, color: '#2f6df6' },
    { id: 'NEARLINE', name: 'Nearline', use: '≈ 1 vez al mes', store: 3, read: 1, color: '#0d9488' },
    { id: 'COLDLINE', name: 'Coldline', use: '≈ 1 vez al trimestre', store: 2, read: 2, color: '#7c3aed' },
    { id: 'ARCHIVE', name: 'Archive', use: '< 1 vez al año', store: 1, read: 3, color: '#475569' }
  ];
  const dots = function (n, max) { return '●'.repeat(n) + '○'.repeat(max - n); };
  function classFor(age) { return age >= 365 ? 3 : age >= 90 ? 2 : age >= 30 ? 1 : 0; }

  let tiers3 = null;
  const ex3 = {
    id: 'clases', label: 'Mover datos a Nearline, Coldline y Archive',
    desc: 'Una regla de ciclo de vida enfría los datos con la edad; guardar sale más barato, leer más caro',
    code:
      '# lifecycle.json: mover por antigüedad en lugar de borrar\n' +
      '{\n' +
      '  "rule": [\n' +
      '    {"action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},\n' +
      '     "condition": {"age": 30}},\n' +
      '    {"action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},\n' +
      '     "condition": {"age": 90}},\n' +
      '    {"action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},\n' +
      '     "condition": {"age": 365}}\n' +
      '  ]\n' +
      '}\n\n' +
      'gcloud storage buckets update gs://curso-bigdata-ventas \\\n' +
      '  --lifecycle-file=lifecycle.json',
    setup: function (ctx) {
      const clock = ctx.el('div', 'clock', null, '<span>Hoy</span><b class="clk">día +0</b><span class="rule">&gt;30 d → Nearline · &gt;90 d → Coldline · &gt;365 d → Archive</span>');
      const row = ctx.el('div', 'tiers', null);
      tiers3 = { clock: clock, clk: clock.querySelector('.clk'), rule: clock.querySelector('.rule'), t: [], objs: [] };
      TIERS.forEach(function (t) {
        const el = ctx.el('div', 'tier', row,
          '<div class="tier-h"><b>' + t.name + '</b><small>datos que se usan ' + t.use + '</small></div>' +
          '<div class="tier-c"><span>Guardar <span class="dots">' + dots(t.store, 4) + '</span></span><span>Leer <span class="dots">' + dots(t.read, 4) + '</span></span></div><div class="objs"></div>');
        el.style.setProperty('--tier', t.color);
        tiers3.t.push({ el: el, body: el.querySelector('.objs') });
      });
      const meter = ctx.el('div', 'meter', null,
        '<div class="meter-h"><span>Coste de guardar (índice relativo, ilustrativo)</span><span class="meter-v">100 %</span></div><div class="meter-bar"><i></i></div>');
      meter.style.marginTop = '12px'; tiers3.meter = meter;
      [['nov_2026.parquet', 12, 5], ['sep_2026.parquet', 40, 45], ['mar_2026.parquet', 35, 120], ['2024_anual.parquet', 500, 400]].forEach(function (d) {
        const o = { name: d[0], gb: d[1], age: d[2], cls: 0 };
        o.el = objChip(ctx, tiers3.t[0].body, { name: o.name, size: d[1] + ' GB · ', badge: null });
        o.el.sizeEl.innerHTML = d[1] + ' GB · <span class="age">' + d[2] + ' días</span>';
        tiers3.objs.push(o);
      });
      meterUpdate();
    },
    run: async function (ctx) {
      const T = tiers3;
      ctx.log('Cuatro ficheros de distinta edad, todos en Standard (la clase por defecto, la más cara de almacenar).');
      await ctx.sleep(900);
      ctx.log('Se aplica la regla de ciclo de vida: mover por antigüedad en lugar de borrar.');
      T.rule.classList.add('on');
      await ctx.sleep(700);
      await applyRule(ctx);
      const jumps = [60, 120, 240];
      for (let j = 0; j < jumps.length; j++) {
        await ctx.sleep(800);
        const d = jumps[j];
        T.total = (T.total || 0) + d;
        T.clk.textContent = 'día +' + T.total;
        ctx.log('Pasan ' + d + ' días (acumulado: ' + T.total + ').', 'dim');
        T.objs.forEach(function (o) { o.age += d; o.el.sizeEl.innerHTML = o.gb + ' GB · <span class="age">' + o.age + ' días</span>'; });
        await applyRule(ctx);
      }
      await ctx.sleep(900);
      const arch = T.objs[3];
      ctx.log('Un analista necesita de pronto 2024_anual.parquet, guardado en Archive.', 'warn');
      S.flash(arch.el, false, 2600);
      if (arch.el.badgeEl) arch.el.badgeEl.remove();
      const bd = document.createElement('span'); bd.className = 'badge err'; bd.textContent = 'lectura cara'; arch.el.appendChild(bd);
      ctx.log('Guardar fue baratísimo, pero leer cuesta mucho más y tiene recuperación lenta: por eso Archive es para datos que casi no se leen.', 'warn');
      ctx.log('Además, las clases frías tienen una duración mínima de almacenamiento: borrar antes se cobra igual.', 'dim');
    }
  };
  function meterUpdate() {
    const T = tiers3; let tot = 0, cost = 0;
    T.objs.forEach(function (o) { tot += o.gb; cost += o.gb * TIERS[o.cls].store; });
    const v = cost / (tot * 4);
    S.setMeter(T.meter, v, Math.round(v * 100) + ' %');
  }
  async function applyRule(ctx) {
    const T = tiers3;
    for (let i = 0; i < T.objs.length; i++) {
      const o = T.objs[i], target = classFor(o.age);
      if (target === o.cls) continue;
      ctx.log(o.name + ': ' + o.age + ' días → ' + TIERS[target].name, 'ok');
      await S.fly(ctx, o.el, T.t[target].body, o.name.split('.')[0].slice(-12));
      T.t[target].body.appendChild(o.el); o.el.classList.remove('pop'); void o.el.offsetWidth; o.el.classList.add('pop');
      o.cls = target; meterUpdate();
    }
  }

  /* ====================================================================
     4. Bucket público por error (responsabilidad compartida)
     ==================================================================== */
  let sc4 = null, pol4 = null;
  const ex4 = {
    id: 'publico', label: 'Bucket público por error',
    desc: 'El proveedor protege el centro de datos; la visibilidad del bucket es del cliente',
    code:
      '# Error típico: abrir el bucket «para ir rápido»\n' +
      'gcloud storage buckets add-iam-policy-binding gs://curso-bigdata-ventas \\\n' +
      '  --member=allUsers \\\n' +
      '  --role=roles/storage.objectViewer\n\n' +
      '# Corrección: quitar el acceso público y bloquearlo\n' +
      'gcloud storage buckets remove-iam-policy-binding gs://curso-bigdata-ventas \\\n' +
      '  --member=allUsers \\\n' +
      '  --role=roles/storage.objectViewer\n' +
      'gcloud storage buckets update gs://curso-bigdata-ventas \\\n' +
      '  --public-access-prevention',
    setup: function (ctx) {
      pol4 = C.iam.newPolicy();
      sc4 = C.iam.scene(ctx, {
        resources: [{ id: 'ventas', label: BUCKET, sub: 'contiene clientes.csv (datos personales)' }],
        principals: [{ id: 'anon', kind: 'anon', label: 'allUsers', sub: 'cualquier persona en Internet', badge: ['sin iniciar sesión', ''], member: 'allUsers' }]
      });
      sc4.stateBadge = ctx.el('span', 'badge ok', sc4.r.ventas, 'privado');
    },
    run: async function (ctx) {
      ctx.log('Un compañero pide acceso a clientes.csv. Para ir rápido, alguien abre el bucket a todo el mundo.');
      await ctx.sleep(800);
      ctx.log('Un desconocido intenta leer el fichero con el bucket privado:', 'dim');
      await C.iam.request(ctx, sc4, pol4, 'anon', 'ventas', 'storage.objects.get');
      await ctx.sleep(500);
      ctx.log('Se ejecuta add-iam-policy-binding con --member=allUsers (cualquiera, sin cuenta).', 'warn');
      C.iam.addBinding(ctx, sc4, pol4, { member: 'allUsers', role: 'roles/storage.objectViewer', scope: 'ventas' });
      S.badge(sc4.stateBadge, 'público', 'warn');
      await ctx.sleep(900);
      await C.iam.request(ctx, sc4, pol4, 'anon', 'ventas', 'storage.objects.get');
      S.badge(sc4.stateBadge, 'EXPUESTO', 'err'); S.flash(sc4.r.ventas, false, 2200);
      ctx.log('Datos personales al alcance de cualquiera (y con consecuencias de RGPD).', 'err');
      ctx.log('El proveedor protege el centro de datos y el hardware; quién puede ver el bucket lo decide el cliente.', 'warn');
      await ctx.sleep(1200);
      ctx.log('Corrección: se elimina el enlace allUsers y se activa la prevención de acceso público.');
      pol4.bindings = []; pol4.blockPublic = true;
      C.$$('.bind', sc4.policy).forEach(function (b) { b.remove(); });
      sc4.policy.appendChild(Object.assign(document.createElement('div'), { className: 'bind pop', innerHTML: '<b>prevención de acceso público</b><br><i>activada en el bucket</i>' }));
      S.badge(sc4.stateBadge, 'privado', 'ok');
      await ctx.sleep(900);
      await C.iam.request(ctx, sc4, pol4, 'anon', 'ventas', 'storage.objects.get');
      ctx.log('Cerrado de nuevo. Un bucket público por error es responsabilidad del cliente, no del proveedor.', 'ok');
    }
  };

  C.registerConsole('almacenamiento', { lang: 'bash', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
