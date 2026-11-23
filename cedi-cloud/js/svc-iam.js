/* Servicio IAM: usuarios, roles y permisos.
   El motor de decisión es real (aunque mínimo): una petición se permite solo si algún rol
   enlazado al principal, en un ámbito que cubre el recurso, incluye el permiso pedido. */
(function (C) {
  const S = C.stage, I = C.icon;

  /* ---------- Roles (extractos de roles de Google Cloud + uno personalizado) ---------- */
  const ADMIN_PERMS = [
    'storage.buckets.create', 'storage.buckets.delete', 'storage.buckets.get', 'storage.buckets.list',
    'storage.buckets.update', 'storage.buckets.setIamPolicy', 'storage.objects.create', 'storage.objects.delete',
    'storage.objects.get', 'storage.objects.list', 'storage.objects.update', 'storage.objects.setIamPolicy',
    'storage.hmacKeys.create', 'storage.hmacKeys.delete'
  ];
  const ROLES = {
    'roles/storage.objectViewer': { title: 'Lector de objetos', perms: ['storage.objects.get', 'storage.objects.list'] },
    'roles/storage.objectCreator': { title: 'Creador de objetos', perms: ['storage.objects.create'] },
    'roles/bigquery.dataViewer': { title: 'Lector de datos de BigQuery', perms: ['bigquery.tables.getData', 'bigquery.tables.list'] },
    'roles/storage.admin': { title: 'Administrador de Storage', perms: ADMIN_PERMS },
    'projects/curso-bigdata-2026/roles/lectorBruta': { title: 'Lector de la capa bruta', perms: ['storage.objects.get', 'storage.objects.list'] }
  };

  /* ---------- Motor de decisión ---------- */
  function newPolicy() { return { bindings: [] }; }
  function grant(policy, member, perm, resId) {
    if (policy.blockPublic && member === 'allUsers') return null;   // «prevención de acceso público»
    const b = policy.bindings.find(function (x) {
      return x.member === member && (x.scope === 'proyecto' || x.scope === resId) && ROLES[x.role].perms.indexOf(perm) >= 0;
    });
    return b ? b.role : null;
  }
  const short = function (member) { return member.indexOf(':') < 0 ? member : member.split(':')[1].split('@')[0]; };

  /* ---------- Escena de tres columnas: quién → IAM → qué ---------- */
  function scene(ctx, cfg) {
    const root = ctx.el('div', 'scene');
    const cp = ctx.el('div', 'col', root, '<h4 class="col-title">Quién <small>principal</small></h4>');
    const cg = ctx.el('div', 'col', root, '<h4 class="col-title">Decide <small>IAM</small></h4>');
    const cr = ctx.el('div', 'col', root, '<h4 class="col-title">Qué <small>recurso</small></h4>');
    const sc = { root: root, cp: cp, cr: cr, p: {}, r: {}, member: {}, resName: {} };
    sc.gate = ctx.el('div', 'gate-box', cg, '<b>IAM</b><small>¿Permitido?</small>');
    sc.policy = ctx.el('div', 'policy', cg, '<div class="policy-title">Política del proyecto</div><div class="policy-empty">Sin enlaces todavía</div>');
    (cfg.resources || []).forEach(function (r) { addResource(ctx, sc, r); });
    (cfg.principals || []).forEach(function (p) { addPrincipal(ctx, sc, p, false); });
    return sc;
  }
  function addResource(ctx, sc, r) {
    const el = ctx.el('div', 'res', sc.cr,
      '<div class="res-h"><span class="rico">' + I('storage', 16) + '</span><div><div class="res-n">' + C.esc(r.label) + '</div><div class="res-s">' + C.esc(r.sub) + '</div></div></div>');
    sc.r[r.id] = el; sc.resName[r.id] = r.label;
  }
  function addPrincipal(ctx, sc, p, animate) {
    const av = p.kind === 'anon' ? '<span class="avatar sa">' + I('globe', 16) + '</span>' : p.kind === 'job' ? '<span class="avatar sa">' + I('cpu', 16) + '</span>'
      : '<span class="avatar ' + (p.kind === 'sa' ? 'sa' : '') + '">' + C.esc(p.label.slice(0, 2).toUpperCase()) + '</span>';
    const el = ctx.el('div', 'actor' + (animate === false ? '' : ' pop'), sc.cp,
      '<div class="actor-h">' + av + '<div><div class="actor-n">' + C.esc(p.label) + '</div><div class="actor-s">' + C.esc(p.sub || '') + '</div></div></div>' +
      '<span class="badge ' + ((p.badge && p.badge[1]) || '') + '">' + C.esc((p.badge && p.badge[0]) || '') + '</span><div class="actor-perms"></div>');
    el.badge = el.querySelector('.badge'); el.perms = el.querySelector('.actor-perms');
    sc.p[p.id] = el; sc.member[p.id] = p.member || null;
    return el;
  }
  function addBinding(ctx, sc, policy, b, silent) {
    policy.bindings.push(b);
    const empty = sc.policy.querySelector('.policy-empty'); if (empty) empty.remove();
    const where = b.scope === 'proyecto' ? 'en todo el proyecto' : 'solo en ' + sc.resName[b.scope];
    ctx.el('div', 'bind' + (silent ? '' : ' pop'), sc.policy,
      '<b>' + C.esc(short(b.member)) + '</b> <i>→</i> ' + C.esc(b.role.split('/').pop()) + '<br><i>' + C.esc(where) + '</i>');
  }
  function showPerms(el, role, kind) {
    el.perms.innerHTML = '';
    ROLES[role].perms.forEach(function (p) { ctx2.el('span', 'perm pop ' + (kind || ''), el.perms, p); });
  }
  let ctx2 = null;   // referencia al ctx activo para showPerms

  /* Una petición viaja hasta IAM y, según la política, llega o no al recurso */
  async function request(ctx, sc, policy, pid, rid, perm) {
    const member = sc.member[pid], who = short(member), small = sc.gate.querySelector('small');
    ctx.log(who + ' → ' + perm + ' sobre ' + sc.resName[rid]);
    await S.fly(ctx, sc.p[pid], sc.gate, perm);
    sc.gate.classList.add('checking'); small.textContent = 'Comprobando…';
    ctx.log('IAM: ¿algún rol de ' + who + ' incluye ' + perm + ' en este ámbito?', 'dim');
    await ctx.sleep(700);
    sc.gate.classList.remove('checking');
    const role = grant(policy, member, perm, rid);
    if (role) {
      sc.gate.classList.add('ok'); small.textContent = '✓ Permitido';
      ctx.log('IAM: permitido por ' + role.split('/').pop(), 'ok');
      await S.fly(ctx, sc.gate, sc.r[rid], perm, 'ok');
      S.flash(sc.r[rid], true);
      ctx.log('✓ ' + perm + ' ejecutado', 'ok');
    } else {
      sc.gate.classList.add('err'); small.textContent = '✕ Denegado (403)';
      ctx.log('IAM: 403 — ' + who + ' no tiene ' + perm + ' sobre ' + sc.resName[rid], 'err');
      await S.fly(ctx, sc.gate, sc.p[pid], '403', 'err');
      S.flash(sc.p[pid], false);
    }
    await ctx.sleep(500);
    sc.gate.classList.remove('ok', 'err');
    return !!role;
  }

  /* ---------- Ejemplos ---------- */
  let sc, policy;

  const ex1 = {
    id: 'usuario-rol', label: 'Crear usuario y asignar rol',
    desc: 'Un usuario sin roles no puede nada; un rol le da un conjunto de permisos',
    code:
      '# Lucía necesita leer los datos del proyecto.\n' +
      '# Se le asigna un rol (un conjunto de permisos) a nivel de proyecto.\n' +
      'gcloud projects add-iam-policy-binding curso-bigdata-2026 \\\n' +
      '  --member="user:lucia@cedi.edu" \\\n' +
      '  --role="roles/storage.objectViewer"',
    setup: function (ctx) {
      ctx2 = ctx; policy = newPolicy();
      sc = scene(ctx, { resources: [{ id: 'ventas', label: 'gs://curso-bigdata-ventas', sub: 'bucket · capa bruta' }] });
    },
    run: async function (ctx) {
      ctx2 = ctx; const m = 'user:lucia@cedi.edu';
      ctx.log('Lucía se incorpora al curso y necesita consultar los ficheros de ventas.');
      await ctx.sleep(600);
      addPrincipal(ctx, sc, { id: 'lucia', label: 'lucia@cedi.edu', sub: 'usuario', badge: ['sin roles', 'warn'], member: m });
      ctx.log('Se da de alta la identidad lucia@cedi.edu. Todavía no tiene ningún rol.');
      await ctx.sleep(800);
      ctx.log('Primer intento, sin roles:', 'dim');
      await request(ctx, sc, policy, 'lucia', 'ventas', 'storage.objects.list');
      await ctx.sleep(500);
      ctx.log('El administrador ejecuta el comando: enlaza a Lucía con roles/storage.objectViewer.');
      addBinding(ctx, sc, policy, { member: m, role: 'roles/storage.objectViewer', scope: 'proyecto' });
      await ctx.sleep(700);
      ctx.log('El rol es un conjunto de permisos con nombre: ahora Lucía los hereda.');
      showPerms(sc.p.lucia, 'roles/storage.objectViewer');
      S.badge(sc.p.lucia.badge, '1 rol: objectViewer', 'info');
      await ctx.sleep(900);
      ctx.log('Segundo intento: leer y listar.', 'dim');
      await request(ctx, sc, policy, 'lucia', 'ventas', 'storage.objects.list');
      await request(ctx, sc, policy, 'lucia', 'ventas', 'storage.objects.get');
      ctx.log('Tercer intento: escribir un fichero.', 'dim');
      await request(ctx, sc, policy, 'lucia', 'ventas', 'storage.objects.create');
      ctx.log('Resultado: leer sí, escribir no. IAM solo concede lo que algún rol incluye.', 'ok');
    }
  };

  const ex2 = {
    id: 'denegado', label: 'Acceso denegado a un bucket',
    desc: 'El permiso correcto, en el ámbito correcto: un rol de BigQuery no sirve para Storage',
    code:
      '# 1) Marta intenta leer un fichero de ventas\n' +
      'gcloud storage cat gs://curso-bigdata-ventas/raw/ventas_2026.csv\n' +
      '# ERROR: 403 marta@cedi.edu does not have storage.objects.get access\n\n' +
      '# 2) El administrador le da acceso solo a ese bucket\n' +
      'gcloud storage buckets add-iam-policy-binding gs://curso-bigdata-ventas \\\n' +
      '  --member="user:marta@cedi.edu" \\\n' +
      '  --role="roles/storage.objectViewer"',
    setup: function (ctx) {
      ctx2 = ctx; policy = newPolicy();
      sc = scene(ctx, {
        resources: [
          { id: 'ventas', label: 'gs://curso-bigdata-ventas', sub: 'bucket · ventas' },
          { id: 'rrhh', label: 'gs://curso-bigdata-rrhh', sub: 'bucket · recursos humanos' }
        ],
        principals: [{ id: 'marta', label: 'marta@cedi.edu', sub: 'usuario', badge: ['rol: BigQuery Data Viewer', 'info'], member: 'user:marta@cedi.edu' }]
      });
      addBinding(ctx, sc, policy, { member: 'user:marta@cedi.edu', role: 'roles/bigquery.dataViewer', scope: 'proyecto' }, true);
      showPerms(sc.p.marta, 'roles/bigquery.dataViewer');
    },
    run: async function (ctx) {
      ctx2 = ctx; const m = 'user:marta@cedi.edu';
      ctx.log('Marta puede consultar tablas de BigQuery. Ahora intenta leer un CSV del bucket de ventas.');
      await ctx.sleep(600);
      await request(ctx, sc, policy, 'marta', 'ventas', 'storage.objects.get');
      ctx.log('ERROR: 403 marta@cedi.edu does not have storage.objects.get access', 'err');
      ctx.log('Tener un rol no basta: ese rol no incluye el permiso de Storage.', 'warn');
      await ctx.sleep(800);
      ctx.log('El administrador enlaza roles/storage.objectViewer SOLO sobre el bucket de ventas.');
      addBinding(ctx, sc, policy, { member: m, role: 'roles/storage.objectViewer', scope: 'ventas' });
      showPerms(sc.p.marta, 'roles/bigquery.dataViewer');
      ['storage.objects.get', 'storage.objects.list'].forEach(function (p) { ctx.el('span', 'perm pop good', sc.p.marta.perms, p); });
      S.badge(sc.p.marta.badge, '2 roles', 'info');
      await ctx.sleep(900);
      ctx.log('Reintento sobre el mismo bucket:', 'dim');
      await request(ctx, sc, policy, 'marta', 'ventas', 'storage.objects.get');
      ctx.log('Reintento sobre el bucket de RR. HH.:', 'dim');
      await request(ctx, sc, policy, 'marta', 'rrhh', 'storage.objects.get');
      ctx.log('El enlace era solo para un bucket: el otro sigue cerrado. Cuanto más estrecho el ámbito, menos riesgo.', 'ok');
    }
  };

  const ex3 = {
    id: 'rol-personalizado', label: 'Rol personalizado (mínimo privilegio)',
    desc: 'Del rol administrador (14 permisos) a un rol a medida (2 permisos)',
    code:
      '# Pablo solo necesita leer y listar la capa bruta.\n' +
      '# En vez de darle storage.admin, se crea un rol a medida:\n' +
      'gcloud iam roles create lectorBruta \\\n' +
      '  --project=curso-bigdata-2026 \\\n' +
      '  --title="Lector de la capa bruta" \\\n' +
      '  --permissions=storage.objects.get,storage.objects.list\n\n' +
      'gcloud projects add-iam-policy-binding curso-bigdata-2026 \\\n' +
      '  --member="user:pablo@cedi.edu" \\\n' +
      '  --role="projects/curso-bigdata-2026/roles/lectorBruta"',
    setup: function (ctx) {
      ctx2 = ctx;
      const top = ctx.el('div', 'scene', null);
      top.style.gridTemplateColumns = '1fr'; top.style.gap = '12px';
      const a = ctx.el('div', 'actor', top,
        '<div class="actor-h"><span class="avatar">PA</span><div><div class="actor-n">pablo@cedi.edu</div><div class="actor-s">necesita: leer y listar la capa bruta</div></div></div>');
      const row = ctx.el('div', 'roles-row', top);
      const cardA = ctx.el('div', 'rolecard', row, '<h5>roles/storage.admin <small>(extracto de permisos)</small></h5><div class="actor-perms"></div>');
      const cardB = ctx.el('div', 'rolecard', row, '<h5>Rol a medida: lectorBruta <small>projects/curso-bigdata-2026/roles/lectorBruta</small></h5><div class="actor-perms"></div>');
      cardA.style.visibility = 'hidden'; cardB.style.visibility = 'hidden';
      const meter = ctx.el('div', 'meter', top,
        '<div class="meter-h"><span>Superficie de acceso concedida</span><span class="meter-v">0 permisos</span></div><div class="meter-bar"><i></i></div>');
      const tests = ctx.el('div', 'tests', top);
      ex3.ui = { cardA: cardA, cardB: cardB, meter: meter, tests: tests };
    },
    run: async function (ctx) {
      ctx2 = ctx; const u = ex3.ui, total = ADMIN_PERMS.length;
      ctx.log('Pablo debe leer los ficheros de la capa bruta. Nada más.');
      await ctx.sleep(700);
      ctx.log('Opción rápida: asignarle roles/storage.admin.', 'warn');
      u.cardA.style.visibility = 'visible'; u.cardA.classList.add('pop');
      const boxA = u.cardA.querySelector('.actor-perms');
      for (let i = 0; i < ADMIN_PERMS.length; i++) {
        const p = ADMIN_PERMS[i], need = p === 'storage.objects.get' || p === 'storage.objects.list';
        ctx.el('span', 'perm pop ' + (need ? 'good' : 'risk'), boxA, p);
        S.setMeter(u.meter, (i + 1) / total, (i + 1) + ' permisos');
        await ctx.sleep(110);
      }
      ctx.log('14 permisos concedidos; solo 2 hacen falta. Pablo podría borrar buckets o cambiar políticas.', 'warn');
      await ctx.sleep(1200);
      ctx.log('Mínimo privilegio: se crea el rol lectorBruta con solo storage.objects.get y .list.');
      u.cardA.classList.add('revoked');
      C.$$('.perm', boxA).forEach(function (el) { el.classList.add('gone'); });
      setTimeout(function () { boxA.innerHTML = '<span class="res-s">Rol revocado</span>'; }, 550 / (ctx.speed || 1));
      u.cardB.style.visibility = 'visible'; u.cardB.classList.add('pop');
      const boxB = u.cardB.querySelector('.actor-perms');
      ROLES['projects/curso-bigdata-2026/roles/lectorBruta'].perms.forEach(function (p) { ctx.el('span', 'perm pop good', boxB, p); });
      S.setMeter(u.meter, 2 / total, '2 permisos');
      await ctx.sleep(1100);
      ctx.log('Se revoca storage.admin y se enlaza lectorBruta a Pablo. Pruebas:', 'dim');
      const mine = ROLES['projects/curso-bigdata-2026/roles/lectorBruta'].perms;
      const checks = ['storage.objects.list', 'storage.objects.get', 'storage.objects.delete', 'storage.buckets.setIamPolicy'];
      for (let i = 0; i < checks.length; i++) {
        const ok = mine.indexOf(checks[i]) >= 0;
        ctx.el('div', 'test pop ' + (ok ? 'ok' : 'err'), u.tests, '<span class="res-mark">' + (ok ? '✓' : '✕') + '</span><span class="mono">' + checks[i] + '</span><span class="badge ' + (ok ? 'ok' : 'err') + '">' + (ok ? 'permitido' : 'denegado') + '</span>');
        ctx.log('pablo → ' + checks[i] + ': ' + (ok ? 'permitido' : '403 denegado'), ok ? 'ok' : 'err');
        await ctx.sleep(650);
      }
      ctx.log('Mismo trabajo, 12 permisos menos. Si se filtra la cuenta de Pablo, el daño posible es mínimo.', 'ok');
    }
  };

  const ex4 = {
    id: 'cuenta-servicio', label: 'Cuenta de servicio para un trabajo',
    desc: 'Un trabajo automático usa su propia identidad, con permisos justos',
    code:
      '# Identidad propia para el trabajo diario (no una persona)\n' +
      'gcloud iam service-accounts create etl-ventas \\\n' +
      '  --display-name="ETL de ventas"\n\n' +
      '# Leer la capa bruta y escribir en la de negocio, nada más\n' +
      'gcloud storage buckets add-iam-policy-binding gs://curso-bigdata-bruta \\\n' +
      '  --member="serviceAccount:etl-ventas@curso-bigdata-2026.iam.gserviceaccount.com" \\\n' +
      '  --role="roles/storage.objectViewer"\n' +
      'gcloud storage buckets add-iam-policy-binding gs://curso-bigdata-negocio \\\n' +
      '  --member="serviceAccount:etl-ventas@curso-bigdata-2026.iam.gserviceaccount.com" \\\n' +
      '  --role="roles/storage.objectCreator"\n\n' +
      '# El clúster se ejecuta con esa identidad\n' +
      'gcloud dataproc clusters create etl-diario \\\n' +
      '  --region=europe-southwest1 \\\n' +
      '  --service-account=etl-ventas@curso-bigdata-2026.iam.gserviceaccount.com',
    setup: function (ctx) {
      ctx2 = ctx; policy = newPolicy();
      sc = scene(ctx, {
        resources: [
          { id: 'bruta', label: 'gs://curso-bigdata-bruta', sub: 'bucket · capa bruta' },
          { id: 'negocio', label: 'gs://curso-bigdata-negocio', sub: 'bucket · capa negocio' },
          { id: 'rrhh', label: 'gs://curso-bigdata-rrhh', sub: 'bucket · recursos humanos' }
        ],
        principals: [{ id: 'cluster', kind: 'job', label: 'clúster etl-diario', sub: 'trabajo Spark nocturno', badge: ['sin identidad propia', 'warn'], member: null }]
      });
    },
    run: async function (ctx) {
      ctx2 = ctx;
      const sa = 'serviceAccount:etl-ventas@curso-bigdata-2026.iam.gserviceaccount.com';
      ctx.log('Un trabajo diario debe leer la capa bruta y escribir en la de negocio, sin intervención humana.');
      await ctx.sleep(700);
      ctx.log('Si usara las credenciales de una persona, fallaría cuando esa persona se fuera y tendría demasiados permisos.', 'warn');
      await ctx.sleep(800);
      addPrincipal(ctx, sc, { id: 'sa', kind: 'sa', label: 'etl-ventas', sub: 'etl-ventas@curso-bigdata-2026.iam.gserviceaccount.com', badge: ['cuenta de servicio · sin roles', 'warn'], member: sa });
      ctx.log('Se crea la cuenta de servicio etl-ventas: una identidad para programas, no para personas.');
      await ctx.sleep(900);
      addBinding(ctx, sc, policy, { member: sa, role: 'roles/storage.objectViewer', scope: 'bruta' });
      ctx.log('Rol de lector, solo sobre el bucket de la capa bruta.');
      await ctx.sleep(700);
      addBinding(ctx, sc, policy, { member: sa, role: 'roles/storage.objectCreator', scope: 'negocio' });
      ctx.log('Rol de creador, solo sobre el bucket de la capa negocio.');
      S.badge(sc.p.sa.badge, 'cuenta de servicio · 2 roles', 'info');
      await ctx.sleep(900);
      ctx.log('El clúster arranca con --service-account: a partir de ahora actúa como etl-ventas.');
      await S.fly(ctx, sc.p.sa, sc.p.cluster, 'identidad');
      sc.member.cluster = sa;
      S.badge(sc.p.cluster.badge, 'ejecuta como etl-ventas', 'ok');
      S.flash(sc.p.cluster, true);
      await ctx.sleep(700);
      ctx.log('El trabajo se ejecuta:', 'dim');
      await request(ctx, sc, policy, 'cluster', 'bruta', 'storage.objects.get');
      await request(ctx, sc, policy, 'cluster', 'negocio', 'storage.objects.create');
      ctx.log('Un fallo de programación intenta salirse de su cometido:', 'dim');
      await request(ctx, sc, policy, 'cluster', 'rrhh', 'storage.objects.get');
      await request(ctx, sc, policy, 'cluster', 'bruta', 'storage.objects.delete');
      ctx.log('El trabajo hace lo suyo y nada más. Y no depende de ninguna persona.', 'ok');
    }
  };

  C.iam = { scene: scene, addBinding: addBinding, addPrincipal: addPrincipal, request: request, newPolicy: newPolicy };   // lo reutilizan otros servicios
  C.registerConsole('iam', { lang: 'bash', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
