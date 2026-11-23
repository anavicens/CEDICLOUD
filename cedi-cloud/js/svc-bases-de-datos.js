/* Servicio Bases de datos: replicación líder-seguidor, caída y elección de líder, writeConcern, réplica frente a copia de seguridad. */
(function (C) {
  const S = C.stage, esc = C.esc;

  /* ---------- Componentes ---------- */
  function dbn(ctx, parent, name, sub) {
    const box = ctx.el('div', 'dbn', parent, '<h5><span>' + esc(name) + '</span><span class="badge"></span></h5><small>' + (sub || '') + '</small><div class="recs"></div>');
    return { box: box, b: box.querySelector('.badge'), sub: box.querySelector('small'), recs: box.querySelector('.recs') };
  }
  const ROLES = { leader: ['líder', 'info'], follower: ['seguidor', ''], down: ['caído', 'err'], cand: ['candidato', 'warn'] };
  function role(o, r) {
    o.box.classList.remove('leader', 'down', 'cand');
    if (r !== 'follower') o.box.classList.add(r);
    S.badge(o.b, ROLES[r][0], ROLES[r][1]); o.role = r;
  }
  function rec(ctx, o, txt, cls) { return ctx.el('span', 'rec' + (cls ? ' ' + cls : ''), o.recs, txt); }
  function client(ctx, text) {
    const el = ctx.el('div', 'cli', null, '<b>Aplicación</b><span>' + esc(text) + '</span><span class="ans">—</span>');
    el.ans = el.querySelector('.ans'); return el;
  }
  function cluster(ctx, n, subs) {
    const row = ctx.el('div', 'dbs', null), nodes = [];
    for (let i = 0; i < n; i++) nodes.push(dbn(ctx, row, 'Nodo ' + (i + 1), subs ? subs[i] : ''));
    return nodes;
  }
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  const leaderOf = function (nodes) { return nodes.filter(function (n) { return n.role === 'leader'; })[0]; };

  /* ====================================================================
     1. Replicación líder-seguidor
     ==================================================================== */
  const JS1 =
    "// Conjunto de réplicas de 3 nodos: 1 primario (líder) y 2 secundarios\n" +
    "db.pedidos.insertOne({ _id: 1, cliente: 'Ana', total: 40 })\n" +
    "db.pedidos.insertOne({ _id: 2, cliente: 'Luis', total: 25 })\n" +
    "db.pedidos.insertOne({ _id: 3, cliente: 'Eva', total: 70 })\n\n" +
    "// Lectura en un secundario (puede ir con un pequeño retraso)\n" +
    "db.getMongo().setReadPref('secondary')\n" +
    "db.pedidos.find()";
  let s1 = null;
  const ex1 = {
    id: 'replicacion', label: 'Replicación líder-seguidor', lang: 'js',
    desc: 'Todas las escrituras entran por el líder, que las copia a los seguidores',
    code: JS1,
    setup: function (ctx) {
      s1 = {};
      s1.cli = client(ctx, 'envía escrituras y lecturas');
      s1.n = cluster(ctx, 3, ['', '', '']);
      role(s1.n[0], 'leader'); role(s1.n[1], 'follower'); role(s1.n[2], 'follower');
      s1.n[0].sub.textContent = 'recibe las escrituras'; s1.n[1].sub.textContent = 'copia del líder'; s1.n[2].sub.textContent = 'copia del líder';
    },
    run: async function (ctx) {
      const n = s1.n;
      ctx.log('Tres nodos: un líder (primario) y dos seguidores (secundarios). Cada uno guarda una copia completa de los datos.');
      await ctx.sleep(700);
      const orders = ['#1 Ana', '#2 Luis', '#3 Eva'];
      for (let i = 0; i < 3; i++) {
        ctx.log('Escritura ' + orders[i] + ': la aplicación solo habla con el líder.');
        await S.fly(ctx, s1.cli, n[0].box, 'INSERT ' + orders[i].slice(0, 2), '');
        rec(ctx, n[0], orders[i].slice(0, 2));
        ctx.log('El líder la anota y la añade a su registro de cambios.', 'dim');
        await ctx.sleep(300);
        const fl = [S.fly(ctx, n[0].box, n[1].box, orders[i].slice(0, 2), 'ok').then(function () { rec(ctx, n[1], orders[i].slice(0, 2)); })];
        if (i < 2) fl.push(S.fly(ctx, n[0].box, n[2].box, orders[i].slice(0, 2), 'ok').then(function () { rec(ctx, n[2], orders[i].slice(0, 2)); }));
        await Promise.all(fl);
        if (i < 2) { s1.cli.ans.textContent = 'OK ' + orders[i].slice(0, 2); ctx.log('Los seguidores aplican el mismo cambio, en el mismo orden.', 'ok'); }
        else {
          s1.cli.ans.textContent = 'OK #3';
          ctx.log('El seguidor del nodo 3 va con retraso: el #3 aún no le ha llegado (replicación asíncrona).', 'warn');
        }
        await ctx.sleep(500);
      }
      ctx.log('Lectura en el nodo 3 mientras tanto:', 'dim');
      await S.fly(ctx, s1.cli, n[2].box, 'SELECT', '');
      s1.cli.ans.textContent = 'devuelve #1, #2 (falta #3)'; S.flash(n[2].box, false);
      ctx.log('Lectura desactualizada: el seguidor devuelve datos viejos. Leer de seguidores reparte la carga, pero admite este retraso.', 'warn');
      await ctx.sleep(900);
      await S.fly(ctx, n[0].box, n[2].box, '#3', 'ok'); rec(ctx, n[2], '#3');
      S.flash(n[2].box, true);
      ctx.log('El #3 llega al nodo 3: las tres copias vuelven a ser iguales.', 'ok');
      ctx.log('Ventajas: más lecturas en paralelo y varias copias si un nodo falla. Cuesta: copiar datos por la red y un posible retraso.', 'info');
    }
  };

  /* ====================================================================
     2. Cae el primario: elección de un nuevo líder
     ==================================================================== */
  const JS2 =
    "// Estado inicial: nodo 1 = primario (término 1)\n" +
    "rs.status()\n\n" +
    "// El nodo 1 se apaga: no hay latidos\n" +
    "// Los otros dos nodos deciden por mayoría\n" +
    "rs.status()      // nodo 2 = primario (término 2)\n\n" +
    "db.pedidos.insertOne({ _id: 4, cliente: 'Pau', total: 55 })";
  let s2 = null;
  const ex2 = {
    id: 'eleccion', label: 'Cae el primario: elección de un nuevo líder', lang: 'js',
    desc: 'Los seguidores detectan que no hay latidos y votan por un nuevo líder',
    code: JS2,
    setup: function (ctx) {
      s2 = {};
      s2.cli = client(ctx, 'escribe pedidos');
      s2.n = cluster(ctx, 3, ['', '', '']);
      role(s2.n[0], 'leader'); role(s2.n[1], 'follower'); role(s2.n[2], 'follower');
      s2.n.forEach(function (o) { o.sub.innerHTML = '<i class="hb"></i> latido'; ['#1', '#2', '#3'].forEach(function (t) { rec(ctx, o, t); }); });
      s2.stats = ctx.el('div', 'stats', null);
      s2.ld = stat(ctx, s2.stats, 'líder actual', 'Nodo 1');
      s2.tm = stat(ctx, s2.stats, 'término (época)', '1');
      s2.dt = stat(ctx, s2.stats, 'tiempo sin líder', '0 s');
    },
    run: async function (ctx) {
      const n = s2.n;
      ctx.log('Funcionamiento normal: el líder envía latidos (heartbeats) a los seguidores cada pocos segundos.');
      await Promise.all([S.fly(ctx, n[0].box, n[1].box, 'latido', 'ok'), S.fly(ctx, n[0].box, n[2].box, 'latido', 'ok')]);
      await ctx.sleep(500);
      ctx.log('El nodo 1 (líder) falla: fallo de hardware, no vuelve a enviar latidos.', 'err');
      role(n[0], 'down'); n[0].sub.textContent = 'sin respuesta'; S.flash(n[0].box, false, 1800);
      s2.ld.v.textContent = '—'; s2.ld.classList.add('hi');
      await ctx.sleep(900);
      ctx.log('Mientras no hay líder nadie acepta escrituras. Si la aplicación escribe ahora, fallará:', 'warn');
      s2.cli.ans.textContent = 'error: sin primario'; S.flash(s2.cli, false);
      await ctx.sleep(900);
      for (let t = 1; t <= 4; t++) { s2.dt.v.textContent = (t * 2.5) + ' s'; await ctx.sleep(260); }
      ctx.log('Pasado el tiempo de espera, los seguidores dan por muerto al líder (se detecta la ausencia de latidos).', 'dim');
      ctx.log('El nodo 2 se propone como candidato y sube el término a 2.');
      role(n[1], 'cand'); s2.tm.v.textContent = '2';
      await ctx.sleep(700);
      ctx.log('Pide el voto al nodo 3 (tiene los mismos datos que él: #1, #2, #3).', 'dim');
      await S.fly(ctx, n[1].box, n[2].box, '¿voto?', ''); S.flash(n[2].box, true);
      await S.fly(ctx, n[2].box, n[1].box, 'sí', 'ok');
      ctx.log('2 votos de 3 = mayoría. El nodo 2 es el nuevo líder.', 'ok');
      role(n[1], 'leader'); role(n[2], 'follower'); s2.ld.v.textContent = 'Nodo 2'; s2.ld.classList.remove('hi'); s2.ld.classList.add('ok');
      s2.dt.v.textContent = '≈ 10 s';
      ctx.log('Para ganar hace falta mayoría de todos los nodos, no solo de los vivos. Por eso se usan 3 nodos (o un número impar): con 3 se tolera la caída de 1.', 'info');
      await ctx.sleep(900);
      s2.cli.ans.textContent = '—';
      ctx.log('La aplicación se reconecta al nuevo líder y escribe el pedido #4.');
      await S.fly(ctx, s2.cli, n[1].box, 'INSERT #4', ''); rec(ctx, n[1], '#4');
      await S.fly(ctx, n[1].box, n[2].box, '#4', 'ok'); rec(ctx, n[2], '#4');
      s2.cli.ans.textContent = 'OK #4';
      await ctx.sleep(900);
      ctx.log('El nodo 1 se repara y vuelve, ahora como seguidor (término 2).');
      role(n[0], 'follower'); n[0].sub.innerHTML = '<i class="hb"></i> latido';
      await ctx.sleep(500);
      await S.fly(ctx, n[1].box, n[0].box, '#4', 'ok'); rec(ctx, n[0], '#4'); S.flash(n[0].box, true);
      ctx.log('Se pone al día copiando lo que se perdió: #4. El clúster vuelve a tener 3 copias.', 'ok');
      ctx.log('Cifras de tiempo de ejemplo: en un servicio gestionado la conmutación suele tardar entre segundos y un par de minutos.', 'dim');
    }
  };

  /* ====================================================================
     3. writeConcern: w:1 frente a majority
     ==================================================================== */
  const JS3 =
    "// w:1 → confirma en cuanto escribe el líder (rápido, arriesgado)\n" +
    "db.pedidos.insertOne({ _id: 42, total: 90 },\n" +
    "  { writeConcern: { w: 1 } })\n\n" +
    "// w:'majority' → confirma cuando la mayoría tiene el dato\n" +
    "db.pedidos.insertOne({ _id: 43, total: 90 },\n" +
    "  { writeConcern: { w: 'majority' } })";
  let s3 = null;
  function resetCluster3(ctx) {
    s3.n.forEach(function (o) { o.recs.innerHTML = ''; rec(ctx, o, '#41'); });
    role(s3.n[0], 'leader'); role(s3.n[1], 'follower'); role(s3.n[2], 'follower');
    s3.n.forEach(function (o) { o.sub.textContent = ''; });
    s3.cli.ans.textContent = '—';
  }
  const ex3 = {
    id: 'writeconcern', label: 'writeConcern: w:1 frente a majority', lang: 'js',
    desc: 'Cuándo confirma la base de datos que un pedido «está guardado»',
    code: JS3,
    setup: function (ctx) {
      s3 = {};
      s3.cli = client(ctx, 'guarda un pedido');
      s3.n = cluster(ctx, 3, ['', '', '']);
      resetCluster3(ctx);
      s3.stats = ctx.el('div', 'stats', null);
      s3.l = stat(ctx, s3.stats, 'latencia de la confirmación', '—');
      s3.r = stat(ctx, s3.stats, 'pedido tras la caída', '—');
      s3.m = stat(ctx, s3.stats, 'modo', '—');
    },
    run: async function (ctx) {
      const n = s3.n;
      ctx.log('Tres nodos con el pedido #41 ya replicado. Vamos a guardar un pedido nuevo con dos niveles de garantía y tirar el líder justo después.');
      await ctx.sleep(900);

      /* --- w:1 --- */
      s3.m.v.textContent = 'w: 1';
      ctx.log('Caso A — writeConcern w:1: el líder confirma en cuanto escribe él.');
      await S.fly(ctx, s3.cli, n[0].box, 'INSERT #42', ''); rec(ctx, n[0], '#42', 'pend');
      s3.cli.ans.textContent = 'OK #42 ✔'; s3.l.v.textContent = '≈ 2 ms';
      ctx.log('Confirmación inmediata (≈ 2 ms): la aplicación cree que el pedido está guardado.', 'ok');
      await ctx.sleep(500);
      ctx.log('El líder cae antes de copiar el pedido a los seguidores.', 'err');
      role(n[0], 'down'); S.flash(n[0].box, false, 1600);
      await ctx.sleep(900);
      role(n[1], 'leader');
      ctx.log('Nuevo líder: el nodo 2, que no tiene el #42.', 'warn');
      await ctx.sleep(700);
      ctx.log('Cuando el nodo 1 vuelve, su #42 no está en la mayoría: se descarta para igualar con el líder (rollback).', 'err');
      n[0].recs.lastChild.className = 'rec lost'; role(n[0], 'follower');
      s3.r.v.textContent = 'PERDIDO'; s3.r.classList.add('hi');
      ctx.log('Pedido perdido aunque se «confirmó»: el cliente pagó y el sistema no lo tiene.', 'err');
      await ctx.sleep(1800);

      /* --- majority --- */
      resetCluster3(ctx); s3.r.v.textContent = '—'; s3.r.classList.remove('hi'); s3.l.v.textContent = '—';
      s3.m.v.textContent = "w: 'majority'";
      ctx.log("Caso B — writeConcern w:'majority': el líder espera a que la mayoría (2 de 3) tenga el dato.");
      await S.fly(ctx, s3.cli, n[0].box, 'INSERT #42', ''); rec(ctx, n[0], '#42', 'pend');
      await S.fly(ctx, n[0].box, n[1].box, '#42', 'ok'); rec(ctx, n[1], '#42');
      ctx.log('El nodo 2 ya lo tiene: con el líder son 2 de 3. Ahora sí se confirma.', 'dim');
      await S.fly(ctx, n[1].box, n[0].box, 'ack', 'ok');
      n[0].recs.lastChild.className = 'rec';
      s3.cli.ans.textContent = 'OK #42 ✔'; s3.l.v.textContent = '≈ 14 ms';
      ctx.log('Confirmación más lenta (≈ 14 ms, cifras de ejemplo): hubo que esperar a la red y al seguidor.', 'warn');
      await ctx.sleep(600);
      ctx.log('El líder cae justo después.', 'err');
      role(n[0], 'down'); S.flash(n[0].box, false, 1600);
      await ctx.sleep(900);
      role(n[1], 'leader');
      s3.r.v.textContent = 'CONSERVADO'; s3.r.classList.add('ok');
      ctx.log('El nodo 2 es el nuevo líder y tiene el #42: no se pierde nada.', 'ok');
      ctx.log('Regla: w:1 = rápido pero se puede perder lo «confirmado»; majority = algo más lento pero seguro ante la caída de un nodo. Para pedidos y pagos, majority.', 'info');
    }
  };

  /* ====================================================================
     4. Réplica frente a copia de seguridad
     ==================================================================== */
  const SQL4 =
    "-- 02:00  copia de seguridad diaria (instantánea)\n" +
    "-- 09:00  entra el pedido P5 (replicado al instante)\n\n" +
    "-- 10:30  error humano: falta el WHERE\n" +
    "DELETE FROM pedidos;\n\n" +
    "-- La réplica copia el borrado. Solución: restaurar la copia\n" +
    "RESTORE DATABASE pedidos FROM backup_02h00;";
  let s4 = null;
  const ex4 = {
    id: 'copia', label: 'Réplica frente a copia de seguridad', lang: 'sql',
    desc: 'Una réplica copia también los errores; solo una copia de seguridad permite volver atrás',
    code: SQL4,
    setup: function (ctx) {
      s4 = {};
      s4.row = ctx.el('div', 'dbs', null);
      s4.p = dbn(ctx, s4.row, 'Primario', 'base de datos en uso');
      s4.r = dbn(ctx, s4.row, 'Réplica', 'copia en tiempo real');
      s4.b = dbn(ctx, s4.row, 'Copia de seguridad', 'instantánea diaria, en otro lugar');
      role(s4.p, 'leader'); role(s4.r, 'follower'); S.badge(s4.b.b, 'vacía', '');
      ['P1', 'P2', 'P3', 'P4'].forEach(function (t) { rec(ctx, s4.p, t); rec(ctx, s4.r, t); });
      s4.stats = ctx.el('div', 'stats', null);
      s4.rpo = stat(ctx, s4.stats, 'datos perdidos (RPO)', '—');
      s4.rto = stat(ctx, s4.stats, 'tiempo de recuperación (RTO)', '—');
      s4.st = stat(ctx, s4.stats, 'estado', 'normal');
    },
    run: async function (ctx) {
      const p = s4.p, r = s4.r, b = s4.b;
      ctx.log('La base de datos tiene 4 pedidos (P1–P4), con una réplica en tiempo real y una copia de seguridad diaria.');
      await ctx.sleep(800);
      ctx.log('02:00 — copia de seguridad: se guarda una instantánea del estado actual en otro lugar.');
      await S.fly(ctx, p.box, b.box, 'P1–P4', 'ok');
      ['P1', 'P2', 'P3', 'P4'].forEach(function (t) { rec(ctx, b, t); });
      S.badge(b.b, 'copia 02:00', 'ok');
      await ctx.sleep(700);
      ctx.log('09:00 — entra el pedido P5: el primario lo guarda y la réplica lo copia al instante. La copia de las 02:00 no lo tiene.');
      rec(ctx, p, 'P5'); await S.fly(ctx, p.box, r.box, 'P5', 'ok'); rec(ctx, r, 'P5');
      await ctx.sleep(900);
      ctx.log('10:30 — alguien ejecuta DELETE FROM pedidos; sin WHERE.', 'err');
      s4.st.v.textContent = 'desastre'; s4.st.classList.add('hi');
      Array.from(p.recs.children).forEach(function (e) { e.classList.add('gone'); }); S.flash(p.box, false, 1500);
      await ctx.sleep(500);
      await S.fly(ctx, p.box, r.box, 'DELETE', 'err');
      Array.from(r.recs.children).forEach(function (e) { e.classList.add('gone'); }); S.flash(r.box, false, 1500);
      await ctx.sleep(700);
      p.recs.innerHTML = ''; r.recs.innerHTML = '';
      ctx.log('La réplica ha copiado el borrado: ahora las dos están vacías. Una réplica copia todo, también los errores y los ataques.', 'err');
      await ctx.sleep(1000);
      ctx.log('Lo que no ha cambiado: la copia de seguridad conserva P1–P4. Se restaura.');
      await S.fly(ctx, b.box, p.box, 'P1–P4', 'ok');
      ['P1', 'P2', 'P3', 'P4'].forEach(function (t) { rec(ctx, p, t); });
      rec(ctx, p, 'P5', 'lost'); S.flash(p.box, true);
      await S.fly(ctx, p.box, r.box, 'P1–P4', 'ok');
      ['P1', 'P2', 'P3', 'P4'].forEach(function (t) { rec(ctx, r, t); });
      s4.st.classList.remove('hi'); s4.st.v.textContent = 'recuperado'; s4.st.classList.add('ok');
      s4.rpo.v.textContent = '8,5 h'; s4.rpo.classList.add('hi'); s4.rto.v.textContent = '≈ 40 min';
      ctx.log('Recuperado: P1–P4 vuelven. El pedido P5 se ha perdido, porque se hizo después de la copia (RPO ≈ 8,5 h entre las 02:00 y las 10:30).', 'warn');
      ctx.log('Tardar en restaurar también cuenta: es el RTO (≈ 40 min, cifra de ejemplo).', 'dim');
      await ctx.sleep(800);
      ctx.log('Réplica → disponibilidad: si cae un nodo, el servicio sigue. Copia de seguridad → recuperación: borrados, errores, ataques, corrupción.', 'info');
      ctx.log('No son alternativas: se necesitan las dos. Para perder menos, copias más frecuentes o recuperación a un instante exacto (PITR).', 'info');
    }
  };

  C.registerConsole('bases-de-datos', { lang: 'js', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
