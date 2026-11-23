/* Escenas B: zonas y regiones, DAG, cola de mensajes, HDFS */
(function (C) {
  const kit = C._kit, reg = C._reg, S = C._S, K = C._col;

  function pulse(k, d, c, ms) {
    const e = S('circle', { r: 5, fill: c || K.BLUE, filter: 'url(#glow)' }, k.svg);
    e.style.offsetPath = "path('" + d + "')"; e.style.offsetRotate = '0deg';
    const a = e.animate([{ offsetDistance: '0%', opacity: .3 }, { opacity: 1, offset: .15 }, { offsetDistance: '100%', opacity: 1 }], { duration: Math.max(80, k.ms(ms || 700)), easing: 'ease-in-out', fill: 'forwards' });
    return a.finished.then(function () { e.remove(); }, function () { e.remove(); });
  }

  /* ---------- Apagar una zona: qué sigue y qué se cae ---------- */
  reg('regiones-zonas', 'quesecae', (function () {
    let k, R, kp, zoneRect, ovZ, ovR;
    function res(name, sub, x, y, w, h) {
      const g = k.g(x, y), c = k.card(0, 0, w, h, g); k.T(8, 15, name, 't-b', 'start', g).style.fontSize = '10.5px'; k.T(8, 29, sub, 't-sm', 'start', g);
      const b = S('circle', { cx: w - 12, cy: 12, r: 8, fill: K.GREEN, 'class': 'state' }, g), bt = k.T(w - 12, 16, '✓', 't-w', 'middle', g);
      return { g: g, card: c, set: function (ok) { b.setAttribute('fill', ok ? K.GREEN : K.RED); bt.textContent = ok ? '✓' : '✗'; c.setAttribute('stroke', ok ? '#d5deeb' : K.RED); g.style.opacity = ok ? 1 : .55; if (!ok) k.shake(g); } };
    }
    function count() { const n = Object.keys(R).filter(function (i) { return R[i].ok; }).length; kp[0].set(n + ' / 7', n === 7 ? 'ok' : n >= 5 ? 'warn' : 'bad'); }
    function mark(name, ok) { R[name].ok = ok; R[name].set(ok); }
    return {
      setup: function (ctx) {
        k = kit(ctx, 300); R = {};
        k.T(14, 18, 'Región europe-west1', 't-b').style.fontSize = '11.5px'; S('rect', { x: 10, y: 26, width: 392, height: 252, rx: 12, 'class': 'zone' }, k.svg);
        ['a', 'b', 'c'].forEach(function (z, i) { S('rect', { x: 22, y: 42 + i * 56, width: 368, height: 50, rx: 8, fill: '#fff', stroke: '#e2e8f0' }, k.svg); k.T(30, 56 + i * 56, 'zona ' + z, 't-sm'); });
        zoneRect = { x: 22, y: 42, w: 368, h: 50 };
        R.vm = res('VM única', 'solo zona a', 100, 50, 92, 36); R.disco = res('Disco zonal', 'zona a', 200, 50, 88, 36);
        R.g0 = res('VM · grupo', 'zona a', 300, 50, 84, 36); R.g1 = res('VM · grupo', 'zona b', 300, 106, 84, 36); R.g2 = res('VM · grupo', 'zona c', 300, 162, 84, 36);
        R.bucket = res('Bucket regional', 'copias en las 3 zonas', 22, 212, 368, 44);
        k.T(520, 18, 'Global / varias regiones', 't-b', 'middle').style.fontSize = '11.5px'; S('rect', { x: 414, y: 26, width: 216, height: 252, rx: 12, 'class': 'zone' }, k.svg);
        R.multi = res('Bucket multirregión', 'copias en varias regiones', 426, 44, 192, 54); R.lb = res('Balanceador global', 'servicio global', 426, 112, 192, 54); R.dns = res('DNS', 'servicio global', 426, 180, 192, 54);
        Object.keys(R).forEach(function (i) { R[i].ok = true; });
        ovZ = S('g', { opacity: 0 }, k.svg); S('rect', { x: 22, y: 42, width: 368, height: 50, rx: 8, fill: 'rgba(239,68,68,.16)', stroke: K.RED, 'stroke-dasharray': '6 4' }, ovZ); k.T(206, 72, '⚡ zona a apagada', 't-b', 'middle', ovZ).style.fill = K.RED;
        ovZ.style.transition = 'opacity .4s'; ovR = S('g', { opacity: 0 }, k.svg); S('rect', { x: 10, y: 26, width: 392, height: 252, rx: 12, fill: 'rgba(15,23,42,.55)' }, ovR); k.T(206, 156, '⚡ región completa caída', 't-b', 'middle', ovR).style.fill = '#fff'; ovR.style.transition = 'opacity .4s';
        kp = k.kpis([['recursos operativos', '7 / 7'], ['zona a', 'ok'], ['región', 'ok']]); kp[1].set('en marcha', 'ok'); kp[2].set('en marcha', 'ok');
      },
      run: async function (ctx) {
        ctx.log('Siete recursos típicos de un proyecto. Veamos cuáles dependen de una zona, cuáles de la región y cuáles de ninguna.'); await ctx.sleep(1500);
        ctx.log('Se apaga la zona a.', 'err'); ovZ.setAttribute('opacity', 1); kp[1].set('apagada', 'bad'); await ctx.sleep(900);
        mark('vm', false); mark('disco', false); mark('g0', false); count(); await ctx.sleep(900);
        ctx.log('Se cae lo que está solo en esa zona: la VM única y el disco zonal. El grupo de VMs sigue con las de las zonas b y c, el bucket regional se sirve desde las otras zonas y el multirregión ni se entera.', 'warn'); await ctx.sleep(2200);
        ctx.log('Ahora se pierde toda la región (un desastre mucho menos frecuente).', 'err'); ovZ.setAttribute('opacity', 0); ovR.setAttribute('opacity', 1); kp[2].set('caída', 'bad'); await ctx.sleep(900);
        mark('g1', false); mark('g2', false); mark('bucket', false); count(); await ctx.sleep(1500);
        ctx.log('Solo sobreviven los recursos repartidos entre regiones: el bucket multirregión y los servicios globales (balanceador, DNS).', 'ok');
        ['multi', 'lb', 'dns'].forEach(function (n) { k.ring(R[n].g.transform.baseVal.getItem(0).matrix.e + 96, R[n].g.transform.baseVal.getItem(0).matrix.f + 27, K.GREEN, 20); }); await ctx.sleep(1500);
        ctx.log('Resumen: una sola zona no resiste ni la caída de su centro de datos; varias zonas resisten la caída de uno; varias regiones resisten un desastre regional. Cada nivel de protección cuesta más.', 'ok');
      }
    };
  })());

  /* ---------- DAG ---------- */
  function dagBuild(ctx, kpiList) {
    const k = kit(ctx, 252), N = {}, W = 132, H = 48;
    const DEF = [['extraer_ventas', 14, 38], ['extraer_clientes', 14, 150], ['unir_tablas', 176, 94], ['validar_calidad', 338, 38], ['cargar_bigquery', 338, 150], ['enviar_informe', 494, 94]];
    const EDGES = [['extraer_ventas', 'unir_tablas'], ['extraer_clientes', 'unir_tablas'], ['unir_tablas', 'validar_calidad'], ['unir_tablas', 'cargar_bigquery'], ['validar_calidad', 'enviar_informe'], ['cargar_bigquery', 'enviar_informe']];
    function path(a, b) { const x1 = N[a].x + W, y1 = N[a].y + H / 2, x2 = N[b].x, y2 = N[b].y + H / 2, mx = (x1 + x2) / 2; return 'M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2; }
    DEF.forEach(function (d) { N[d[0]] = { x: d[1], y: d[2] }; });
    k.edges = EDGES.map(function (e) { const p = S('path', { d: path(e[0], e[1]), 'class': 'pipe' }, k.svg); p.style.strokeWidth = 2.5; return { a: e[0], b: e[1], p: p, d: path(e[0], e[1]) }; });
    DEF.forEach(function (d) {
      const n = N[d[0]]; n.g = k.g(n.x, n.y); n.card = k.card(0, 0, W, H, n.g); n.card.style.transition = 'stroke .3s, fill .3s';
      n.ic = S('circle', { cx: 16, cy: 24, r: 9, fill: '#e2e8f0', 'class': 'state' }, n.g); n.sym = k.T(16, 28, '', 't-w', 'middle', n.g);
      n.sp = S('circle', { cx: 16, cy: 24, r: 13, fill: 'none', stroke: K.BLUE, 'stroke-width': 2, 'stroke-dasharray': '8 6', opacity: 0, 'class': 'spin' }, n.g);
      n.nm = k.T(32, 21, d[0], 't-b', 'start', n.g); n.nm.style.fontSize = '9.5px'; n.sub = k.T(32, 36, 'pendiente', 't-sm', 'start', n.g);
    });
    k.set = function (name, st, sub) {
      const n = N[name], cfg = { pending: ['#e2e8f0', '', '#d5deeb', '#fff', 0], run: [K.BLUE, '', K.BLUE, '#eff6ff', 1], done: [K.GREEN, '✓', K.GREEN, '#ecfdf5', 0], fail: [K.RED, '✗', K.RED, '#fef2f2', 0], retry: [K.AMBER, '↻', K.AMBER, '#fffbeb', 0], skip: ['#cbd5e1', '–', '#cbd5e1', '#f8fafc', 0] }[st];
      n.ic.setAttribute('fill', cfg[0]); n.sym.textContent = cfg[1]; n.card.setAttribute('stroke', cfg[2]); n.card.setAttribute('fill', cfg[3]); n.sp.setAttribute('opacity', cfg[4]);
      n.sp.setAttribute('stroke', st === 'retry' ? K.AMBER : K.BLUE); n.sub.textContent = sub || ({ pending: 'pendiente', run: 'ejecutando', done: 'ok', fail: 'falló', retry: 'reintentando', skip: 'no se ejecuta' }[st]);
      n.g.style.opacity = st === 'skip' ? .6 : 1; if (st === 'done') k.pop(n.ic, 400); if (st === 'fail') k.shake(n.g);
    };
    k.flow = function (a, b, c) { const e = k.edges.find(function (x) { return x.a === a && x.b === b; }); e.p.setAttribute('stroke', c || K.BLUE); return pulse(k, e.d, c || K.BLUE, 650); };
    k.kp = k.kpis(kpiList); return k;
  }

  reg('ingesta-orquestacion', 'dag', (function () {
    let k;
    return {
      setup: function (ctx) { k = dagBuild(ctx, [['reloj del DAG (con paralelismo)', '0 min'], ['si fuera en secuencia', '14 min'], ['tareas terminadas', '0 / 6']]); },
      run: async function (ctx) {
        let done = 0; const fin = function () { done++; k.kp[2].set(done + ' / 6', 'ok'); };
        ctx.log('DAG «ventas_diarias»: 6 tareas. Las dos extracciones son independientes; validar y cargar también.'); await ctx.sleep(1200);
        ctx.log('Nivel 1: extraer_ventas y extraer_clientes arrancan a la vez.'); k.set('extraer_ventas', 'run'); k.set('extraer_clientes', 'run'); await ctx.sleep(1100);
        k.set('extraer_clientes', 'done', 'ok · 3 min'); fin(); await ctx.sleep(500); k.set('extraer_ventas', 'done', 'ok · 4 min'); fin(); k.kp[0].set('4 min', 'ok');
        ctx.log('Ambas terminan (4 y 3 min): como corrieron juntas, se tarda 4 min y no 7.', 'ok'); k.flow('extraer_ventas', 'unir_tablas'); k.flow('extraer_clientes', 'unir_tablas'); await ctx.sleep(1200);
        ctx.log('Nivel 2: unir_tablas espera a las dos extracciones y ahora corre.'); k.set('unir_tablas', 'run'); await ctx.sleep(1000); k.set('unir_tablas', 'done', 'ok · 2 min'); fin(); k.kp[0].set('6 min', 'ok');
        ctx.log('Nivel 3: validar_calidad y cargar_bigquery solo dependen de unir_tablas: van en paralelo.'); k.flow('unir_tablas', 'validar_calidad'); k.flow('unir_tablas', 'cargar_bigquery'); await ctx.sleep(700);
        k.set('validar_calidad', 'run'); k.set('cargar_bigquery', 'run'); await ctx.sleep(900); k.set('validar_calidad', 'done', 'ok · 1 min'); fin(); await ctx.sleep(1000); k.set('cargar_bigquery', 'done', 'ok · 3 min'); fin(); k.kp[0].set('9 min', 'ok'); await ctx.sleep(300);
        ctx.log('Nivel 4: enviar_informe necesita las dos anteriores, y arranca cuando acaba la más lenta.'); k.flow('validar_calidad', 'enviar_informe'); k.flow('cargar_bigquery', 'enviar_informe'); await ctx.sleep(1000);
        k.set('enviar_informe', 'run'); await ctx.sleep(900); k.set('enviar_informe', 'done', 'ok · 1 min'); fin(); k.kp[0].set('10 min', 'ok');
        ctx.log('En paralelo: 4 + 2 + 3 + 1 = 10 min. En secuencia habrían sido 14 min.', 'ok');
      }
    };
  })());

  reg('ingesta-orquestacion', 'reintento', (function () {
    let k;
    return {
      setup: function (ctx) { k = dagBuild(ctx, [['intentos de cargar_bigquery', '0'], ['estado del DAG', 'listo'], ['reintentos permitidos', '2']]); ['extraer_ventas', 'extraer_clientes', 'unir_tablas'].forEach(function (n) { k.set(n, 'done'); }); },
      run: async function (ctx) {
        ctx.log('Mismo DAG. Esta vez cargar_bigquery va a tener un problema. Configuración: 2 reintentos.'); k.kp[1].set('en curso', 'warn'); await ctx.sleep(1100);
        k.set('validar_calidad', 'run'); k.set('cargar_bigquery', 'run', 'intento 1'); k.kp[0].set('1'); await ctx.sleep(1000); k.set('validar_calidad', 'done');
        await ctx.sleep(500); ctx.log('cargar_bigquery falla (timeout de red). validar_calidad terminó bien.', 'err'); k.set('cargar_bigquery', 'fail', 'timeout de red'); await ctx.sleep(1200);
        ctx.log('El orquestador espera 5 minutos y reintenta (1 de 2).', 'warn'); k.set('cargar_bigquery', 'retry', 'espera 5 min…'); await ctx.sleep(1400);
        k.set('cargar_bigquery', 'run', 'intento 2'); k.kp[0].set('2', 'warn'); await ctx.sleep(1000); k.set('cargar_bigquery', 'done', 'ok · intento 2');
        ctx.log('El segundo intento funciona: era un fallo transitorio, nadie ha tenido que intervenir.', 'ok'); await ctx.sleep(900);
        k.flow('validar_calidad', 'enviar_informe'); k.flow('cargar_bigquery', 'enviar_informe'); await ctx.sleep(900); k.set('enviar_informe', 'run'); await ctx.sleep(700); k.set('enviar_informe', 'done');
        ctx.log('El DAG termina bien. El orquestador registró el fallo en el historial para poder revisarlo.', 'ok'); k.kp[1].set('correcto', 'ok'); await ctx.sleep(1800);
        ctx.log('¿Y si el fallo fuera permanente (los datos de origen no existen)? Simulamos la siguiente ejecución…', 'info');
        ['validar_calidad', 'cargar_bigquery', 'enviar_informe'].forEach(function (n) { k.set(n, 'pending'); }); k.kp[0].set('0'); k.kp[1].set('en curso', 'warn'); await ctx.sleep(1200);
        k.set('validar_calidad', 'done'); for (let i = 1; i <= 3; i++) {
          k.set('cargar_bigquery', 'run', 'intento ' + i); k.kp[0].set(String(i), 'warn'); await ctx.sleep(900);
          k.set('cargar_bigquery', 'fail', 'falló · intento ' + i); await ctx.sleep(700);
          if (i < 3) { k.set('cargar_bigquery', 'retry', 'espera 5 min…'); await ctx.sleep(800); }
        }
        k.set('enviar_informe', 'skip'); k.kp[1].set('fallido', 'bad'); k.ring(404, 174, K.RED, 24);
        ctx.log('Tras 3 intentos fallidos, cargar_bigquery queda fallida y enviar_informe no se ejecuta. Salta una alerta para que una persona lo revise.', 'err');
      }
    };
  })());

  /* ---------- Cola de mensajes ---------- */
  function queueBuild(ctx, nProd, nCons) {
    const k = kit(ctx, 230), q = { k: k, msgs: [], pub: 0, done: 0, cons: [], prod: [] };
    const SX = function (i) { return 436 - i * 27; }, QY = 96;
    k.T(310, 78, 'Cola de mensajes', 't-b', 'middle').style.fontSize = '11.5px';
    S('rect', { x: 166, y: QY - 6, width: 296, height: 44, rx: 22, fill: '#f1f5f9', stroke: '#d5deeb', 'stroke-width': 1.5 }, k.svg);
    for (let i = 0; i < 10; i++) S('rect', { x: SX(i) - 1, y: QY + 4, width: 24, height: 24, rx: 5, fill: 'none', stroke: '#dbe4f0', 'stroke-dasharray': '3 3' }, k.svg);
    for (let i = 0; i < nProd; i++) {
      const y = nProd === 1 ? 82 : 34 + i * 100, g = k.g(14, y); k.card(0, 0, 124, 52, g); k.T(10, 20, nProd === 1 ? 'productor' : 'sensor-' + (i + 1), 't-b', 'start', g).style.fontSize = '11px'; const t = k.T(10, 38, 'publica', 't-sm', 'start', g);
      q.prod.push({ y: y + 26, g: g, t: t, col: i ? K.ORANGE : K.BLUE });
    }
    for (let i = 0; i < nCons; i++) {
      const y = nCons === 1 ? 82 : 34 + i * 100, s = k.server(488, y, 140, 52, nCons === 1 ? 'consumidor' : 'consumidor ' + 'AB'[i], { cpu: false, state: 'on' }); s.text('procesados: 0'); s.n = 0; s.y = y + 26; q.cons.push(s);
    }
    k.line(138, QY + 16, 166, QY + 16, 'flowl'); k.line(462, QY + 16, 498, QY + 16, 'flowl');
    q.kp = k.kpis([['publicados', '0'], ['esperando en la cola', '0'], ['procesados', '0']]);
    q.kpi = function () { q.kp[0].set(String(q.pub)); q.kp[1].set(String(q.msgs.length), q.msgs.length > 3 ? 'warn' : 'ok'); q.kp[2].set(String(q.done)); };
    q.place = function () { q.msgs.forEach(function (m, i) { m.style.transform = 'translate(' + SX(i) + 'px,' + (QY + 6) + 'px)'; }); };
    q.publish = function (pi) {
      const p = q.prod[pi % q.prod.length], g = S('g', { 'class': 'msg' }, k.svg); S('rect', { width: 22, height: 20, rx: 4, fill: p.col, filter: 'url(#glow)' }, g); S('path', { d: 'M2 3 L11 11 L20 3', fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }, g);
      g.style.transform = 'translate(140px,' + (p.y - 10) + 'px)'; g.style.opacity = 0; void g.getBoundingClientRect();
      g.style.opacity = 1; q.msgs.push(g); q.pub++; q.place(); q.kpi(); k.ring(138, p.y, p.col, 6);
    };
    q.consume = function (ci) {
      const m = q.msgs.shift(); if (!m) return Promise.resolve(); const c = q.cons[ci % q.cons.length];
      m.style.transform = 'translate(500px,' + (c.y - 10) + 'px)'; q.place(); q.kpi();
      return new Promise(function (res) { setTimeout(function () { m.style.opacity = 0; setTimeout(function () { m.remove(); }, k.ms(400)); c.n++; q.done++; c.text('procesados: ' + c.n); k.ring(c.cx - 40, c.cy, K.GREEN, 8); q.kpi(); res(); }, k.ms(550)); });
    };
    return q;
  }

  reg('ingesta-orquestacion', 'cola', (function () {
    let q;
    return {
      setup: function (ctx) { q = queueBuild(ctx, 2, 2); },
      run: async function (ctx) {
        ctx.log('Dos sensores publican lecturas sin parar. Dos consumidores del mismo grupo las procesan.'); await ctx.sleep(1000);
        for (let i = 0; i < 10; i++) {
          q.publish(i); await ctx.sleep(450); q.consume(i); if (i === 1) ctx.log('Cada mensaje lo recibe un solo consumidor del grupo: se reparten el trabajo.', 'info'); await ctx.sleep(550);
        }
        await ctx.sleep(500);
        ctx.log('Publicados 10, procesados 10 repartidos entre A y B (' + q.cons[0].n + ' y ' + q.cons[1].n + '). Si hicieran falta más, se añaden consumidores al grupo.', 'ok');
      }
    };
  })());

  reg('ingesta-orquestacion', 'pico-cola', (function () {
    let q;
    return {
      setup: function (ctx) { q = queueBuild(ctx, 1, 1); },
      run: async function (ctx) {
        ctx.log('Funcionamiento normal: llegan mensajes y se procesan enseguida.'); await ctx.sleep(900);
        for (let i = 0; i < 2; i++) { q.publish(0); await ctx.sleep(500); q.consume(0); await ctx.sleep(800); }
        ctx.log('El consumidor se cae (despliegue fallido).', 'err'); q.cons[0].state('dead'); q.cons[0].text('¡caído!'); k0(q).shake(q.cons[0].g); await ctx.sleep(1100);
        ctx.log('El productor sigue enviando: la cola retiene los mensajes.', 'warn');
        for (let i = 0; i < 7; i++) { q.publish(0); await ctx.sleep(420); }
        ctx.log('7 mensajes esperan en la cola. Sin la cola, el productor habría fallado o los datos se habrían perdido.', 'warn'); await ctx.sleep(1600);
        ctx.log('El consumidor vuelve a arrancar.', 'ok'); q.cons[0].state('on'); q.cons[0].text('procesados: ' + q.cons[0].n); await ctx.sleep(900);
        while (q.msgs.length) { q.consume(0); await ctx.sleep(560); }
        await ctx.sleep(500);
        ctx.log('Todo procesado, sin pérdidas: 9 mensajes. La cola absorbió el pico y desacopló los dos lados.', 'ok');
      }
    };
    function k0(qq) { return qq.k; }
  })());

  /* ---------- HDFS ---------- */
  function hdfsBuild(ctx, withFile) {
    const k = kit(ctx, 268), h = { k: k, dn: [], slots: [0, 0, 0, 0, 0], blk: [] };
    const COL = [K.BLUE, K.ORANGE, K.GREEN, K.VIOLET, '#ec4899'], PL = [[0, 1, 3], [1, 2, 4], [2, 3, 0], [3, 4, 1], [4, 0, 2]];
    h.COL = COL; h.PL = PL;
    h.nn = k.g(214, 6); k.card(0, 0, 212, 98, h.nn); k.T(10, 17, 'NameNode · mapa de bloques', 't-b', 'start', h.nn).style.fontSize = '10px';
    h.map = [0, 1, 2, 3, 4].map(function (i) { return k.T(10, 33 + i * 12, '', 't-sm', 'start', h.nn); });
    if (withFile) {
      k.T(14, 22, 'ventas.csv · 520 MB', 't-b').style.fontSize = '11px';
      h.seg = [0, 1, 2, 3, 4].map(function (i) { const w = i < 4 ? 32 : 8, x = 14 + (i < 4 ? i * 34 : 136); const r = S('rect', { x: x, y: 34, width: w, height: 26, rx: 4, fill: COL[i] }, k.svg); if (i < 4) k.T(x + 16, 51, 'B' + (i + 1), 't-w', 'middle'); return { x: x + w / 2, y: 47 }; });
      k.T(14, 78, '4 × 128 MB + 8 MB = 5 bloques', 't-sm');
    }
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 126, d = k.server(x, 150, 118, 108, 'DataNode ' + (i + 1), { cpu: false, state: 'on' }); d.text(''); d.slotsG = []; h.dn.push(d);
      for (let s = 0; s < 6; s++) S('rect', { x: x + 9 + (s % 3) * 35, y: 150 + 34 + Math.floor(s / 3) * 33, width: 30, height: 28, rx: 5, fill: 'none', stroke: '#dbe4f0', 'stroke-dasharray': '3 3' }, k.svg);
    }
    h.drop = function (b, d, from) {
      const s = h.slots[d]++, x = h.dn[d].x + 9 + (s % 3) * 35 + 15, y = 150 + 34 + Math.floor(s / 3) * 33 + 14, g = k.g(x - 15, y - 14), r = S('rect', { width: 30, height: 28, rx: 5, fill: COL[b], 'class': 'state' }, g); k.T(15, 18, 'B' + (b + 1), 't-w', 'middle', g);
      g.style.opacity = 0; h.blk.push({ b: b, d: d, g: g });
      const p = from ? k.fly(from, [x, y], { c: COL[b], ms: 700, r: 5 }) : Promise.resolve(); return p.then(function () { g.style.opacity = 1; k.pop(g, 350); });
    };
    h.mapTxt = function (b) { h.map[b].textContent = 'B' + (b + 1) + ' → DN ' + PL[b].map(function (x) { return x + 1; }).join(', '); k.pop(h.map[b], 300); };
    return h;
  }

  reg('hadoop', 'bloques', (function () {
    let h;
    return {
      setup: function (ctx) { h = hdfsBuild(ctx, true); },
      run: async function (ctx) {
        const k = h.k;
        ctx.log('El fichero ventas.csv pesa 520 MB. HDFS no lo guarda entero: lo divide en bloques de 128 MB.'); await ctx.sleep(1400);
        ctx.log('520 MB = 4 × 128 MB + 8 MB → 5 bloques (B1…B5). El último es más pequeño.'); h.seg.forEach(function (s, i) { k.ring(s.x, s.y, h.COL[i], 8); }); await ctx.sleep(1400);
        ctx.log('El NameNode decide dónde va cada bloque: 3 réplicas en 3 DataNodes distintos.', 'info'); await ctx.sleep(1200);
        for (let b = 0; b < 5; b++) {
          const pl = h.PL[b]; ctx.log('B' + (b + 1) + ' → DataNode ' + pl.map(function (x) { return x + 1; }).join(', ') + (b === 0 ? ' (el cliente lo envía al primero y los DataNodes se lo pasan en cadena)' : ''));
          h.mapTxt(b); pl.forEach(function (d, j) { setTimeout(function () { h.drop(b, d, [h.seg[b].x, h.seg[b].y]); }, k.ms(j * 220)); }); await ctx.sleep(1500);
        }
        ctx.log('El NameNode guarda el mapa (solo metadatos, ocupa muy poco). Los datos están en los DataNodes.', 'info'); k.ring(320, 52, K.BLUE, 20); await ctx.sleep(1500);
        ctx.log('Espacio real: 520 MB × 3 réplicas = 1.560 MB. La seguridad cuesta espacio.', 'warn'); await ctx.sleep(1500);
        ctx.log('Los bloques grandes (128 MB) permiten leer en secuencia y que el NameNode lleve pocos metadatos.', 'ok');
      }
    };
  })());

  reg('hadoop', 'rereplicacion', (function () {
    let h;
    function beats(upTo) { h.dn.forEach(function (d, i) { if (h.alive[i]) h.k.fly([d.cx, 150], [320, 104], { c: K.GREEN, ms: 700, r: 3.5 }); }); }
    return {
      setup: function (ctx) {
        h = hdfsBuild(ctx, false); h.alive = [1, 1, 1, 1, 1];
        for (let b = 0; b < 5; b++) { h.mapTxt(b); h.PL[b].forEach(function (d) { h.drop(b, d, null); }); }
      },
      run: async function (ctx) {
        const k = h.k;
        ctx.log('Estado inicial: cada bloque tiene 3 réplicas repartidas por los 5 DataNodes.'); await ctx.sleep(1200);
        ctx.log('Los DataNodes envían latidos (heartbeats) al NameNode cada pocos segundos.', 'info'); beats(); await ctx.sleep(1100); beats(); await ctx.sleep(1200);
        ctx.log('Se apaga el DataNode 3 (fallo de disco o de la máquina).', 'err'); h.alive[2] = 0; h.dn[2].state('dead'); h.dn[2].text('¡sin respuesta!'); k.shake(h.dn[2].g);
        h.blk.filter(function (x) { return x.d === 2; }).forEach(function (x) { x.g.style.opacity = .15; }); await ctx.sleep(1100); beats(); await ctx.sleep(900);
        ctx.log('El NameNode deja de recibir sus latidos. Tras el tiempo de espera (≈ 10 minutos por defecto) lo da por muerto.', 'warn'); await ctx.sleep(1700);
        ctx.log('Los bloques B2, B3 y B5 se quedan con 2 réplicas: están «sub-replicados». Los datos siguen disponibles, pero con menos margen.', 'warn');
        [1, 2, 4].forEach(function (b) { h.blk.filter(function (x) { return x.b === b && x.d !== 2; }).forEach(function (x) { x.g.firstChild.setAttribute('stroke', K.AMBER); x.g.firstChild.setAttribute('stroke-width', 3); }); h.map[b].textContent = 'B' + (b + 1) + ' → ¡solo 2 réplicas!'; h.map[b].style.fill = K.AMBER; }); await ctx.sleep(2000);
        ctx.log('El NameNode ordena re-replicar: copiar cada bloque desde una réplica viva a un DataNode que no lo tenga.', 'info'); await ctx.sleep(1100);
        const fix = [[1, 1, 0], [2, 3, 1], [4, 4, 3]];   // [bloque, origen, destino]
        for (let i = 0; i < fix.length; i++) {
          const f = fix[i], src = h.blk.find(function (x) { return x.b === f[0] && x.d === f[1]; });
          ctx.log('B' + (f[0] + 1) + ': DataNode ' + (f[1] + 1) + ' → DataNode ' + (f[2] + 1), 'info');
          await h.drop(f[0], f[2], [h.dn[f[1]].cx, 150 + 60]); h.map[f[0]].textContent = 'B' + (f[0] + 1) + ' → 3 réplicas ✓'; h.map[f[0]].style.fill = K.GREEN; await ctx.sleep(500);
        }
        ctx.log('Todos los bloques vuelven a tener 3 réplicas, sin intervención humana y sin perder datos.', 'ok'); await ctx.sleep(1500);
        ctx.log('Si el DataNode 3 volviera, sus bloques sobrantes se borrarían. Solo se perdería un bloque si caen sus 3 réplicas antes de re-replicar.', 'info');
      }
    };
  })());
})(window.CEDI);
