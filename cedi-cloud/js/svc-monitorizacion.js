/* Sección 4 · Monitorización: latidos, alertas, disponibilidad del mes y comparación con el SLA. */
(function (C) {
  const S = C.stage, esc = C.esc;
  const nf = function (n, d) { return n.toLocaleString('es-ES', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }); };

  C.addConcepts([
    C.concept('alerta-monitor', 'Alerta', 'fiab',
      'Regla que vigila una métrica (por ejemplo, latidos perdidos) y avisa a las personas adecuadas cuando se cumple una condición durante cierto tiempo.',
      'Políticas de alertas de Cloud Monitoring', 'Alarmas de CloudWatch', 'Alertas de Azure Monitor', { alias: ['alarma', 'alert', 'notificación', 'guardia'] }),
    C.concept('metrica', 'Métrica y panel', 'fiab',
      'Medida numérica de un recurso a lo largo del tiempo (CPU, latencia, latidos…) que se dibuja en paneles para ver su estado de un vistazo.',
      'Métricas y paneles de Cloud Monitoring', 'Métricas y paneles de CloudWatch', 'Métricas y libros de Azure Monitor', { alias: ['dashboard', 'metric', 'observabilidad'] }),
    C.concept('slo', 'SLO y presupuesto de errores', 'fiab',
      'El SLO es el objetivo interno de disponibilidad (más exigente que el SLA contractual). El presupuesto de errores son los minutos de caída que aún puedes permitirte en el periodo.',
      'SLO monitoring en Cloud Monitoring', 'Objetivos de servicio con CloudWatch (Application Signals)', 'Objetivos de servicio en Azure Monitor', { alias: ['error budget', 'objetivo', 'sli'] })
  ]);
  C.addService({
    id: 'monitorizacion', cat: 'Gestión y costes', name: 'Monitorización', sub: 'Latidos, alertas y SLA', icon: 'clock', part: 11,
    lead: 'Observa el estado de tus recursos: los latidos de cada nodo, alertas cuando uno deja de responder y la disponibilidad del mes comparada con el SLA contratado.',
    def: 'Recoge métricas y latidos de los recursos, muestra paneles, lanza alertas cuando algo falla y permite medir la disponibilidad frente al SLA (99 %, 99,9 %, 99,99 %).',
    gcp: 'Cloud Monitoring', aws: 'CloudWatch', azure: 'Azure Monitor',
    sla: '99,9 %',
    concepts: ['heartbeat', 'alerta-monitor', 'metrica', 'sla', 'slo', 'disponibilidad', 'rpo', 'rto'],
    planned: ['Latidos de cada nodo', 'Alerta cuando un nodo no responde', 'Disponibilidad del mes frente al SLA', 'Los nueves y las dependencias en serie'],
    kw: ['monitorización', 'latidos', 'heartbeat', 'alertas', 'métricas', 'sla', 'disponibilidad', 'uptime', 'cloudwatch', 'monitor', 'paneles']
  });
  C.addEquivalences([{ need: 'Monitorización', gcp: 'Cloud Monitoring', aws: 'CloudWatch', azure: 'Azure Monitor', src: 'extra' }]);

  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }

  /* ====================================================================
     1. Latidos de cada nodo
     ==================================================================== */
  const SH1 =
    "# Cada nodo envía un latido cada 10 s a la monitorización\n" +
    "gcloud monitoring metrics list --filter='metric.type:agent'\n\n" +
    "# Regla: 3 latidos seguidos sin llegar = nodo sin respuesta\n" +
    "gcloud monitoring policies list";
  const NODES = ['nodo-1', 'nodo-2', 'nodo-3', 'nodo-4', 'nodo-5', 'nodo-6'];
  let s1 = null;
  const ex1 = {
    id: 'latidos', label: 'Latidos de cada nodo',
    desc: 'Seis nodos latiendo cada 10 s: un fallo suelto no es lo mismo que un nodo caído',
    code: SH1,
    quiz: [
      { q: 'Un nodo falla un solo latido y vuelve a latir. ¿Debe saltar la alerta?', o: ["No: la regla pide varios seguidos","Solo por la noche","Sí, siempre"], x: "GEcFSxdTQE0QRhcQYw1FCAhZCggAVRdYV1oXCkQZWAYIClUXSEAWFgtEG0gXHg4GCw1WU0MXAQ0WQx8KVQFVW1EGC0QfTBEFAAZEXldRFgwABl5DHA4HBQ1XQAoRBRsNBQ0DBgVeElcPBBYETBBCTQg=" },
      { q: '¿Qué indica que un nodo ha dejado de latir varias veces seguidas?', o: ["Probablemente está caído o aislado","Que va más rápido","Que tiene más memoria"], x: "GEcFSxdTQE0QRhcQegJFBRxeBgIMHAUNUVkNEQ0HWAIIDlUASBJaAhENDUIQTAoGREFTFhAAp9hMD0wMGaeMQV8ABEQNSEMZAVUKQlZZQwYFqoAHA0FXGQ==" }
    ],
    setup: function (ctx) {
      s1 = { rows: [], miss: NODES.map(function () { return 0; }), alerts: 0 };
      ctx.el('div', 'flow-note', null, 'Cada cuadrito es un latido esperado (cada 10 s): verde = recibido, rojo = perdido');
      NODES.forEach(function (n) {
        const r = ctx.el('div', 'brow', null, '<span class="bl">' + n + '</span><div class="beats"></div><span class="badge ok">latiendo</span>');
        const cells = []; const bt = r.querySelector('.beats'); for (let i = 0; i < 24; i++) cells.push(ctx.el('i', '', bt));
        s1.rows.push({ box: r, cells: cells, b: r.querySelector('.badge') });
      });
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'nodos que responden', '6 de 6'); s1.b = stat(ctx, s1.stats, 'latidos perdidos', '0'); s1.c = stat(ctx, s1.stats, 'alertas abiertas', '0');
      s1.al = ctx.el('div', 'alerts', null);
    },
    run: async function (ctx) {
      let lost = 0, open = 0;
      ctx.log('El panel muestra los latidos de 6 nodos. Un latido es un mensaje corto que dice «sigo vivo».');
      await ctx.sleep(800);
      for (let t = 0; t < 24; t++) {
        for (let i = 0; i < 6; i++) {
          const dead = (i === 3 && t >= 8 && t < 20), jitter = (i === 1 && t === 5);
          const R = s1.rows[i], ok = !(dead || jitter);
          R.cells[t].className = ok ? 'ok' : 'miss';
          if (!ok) { lost++; s1.miss[i]++; } else s1.miss[i] = 0;
          if (jitter) { S.badge(R.b, 'latido perdido', 'warn'); }
          else if (ok && R.b.textContent === 'latido perdido') S.badge(R.b, 'latiendo', 'ok');
          if (s1.miss[i] === 3) { S.badge(R.b, 'sin respuesta', 'err'); R.box.classList.add('bad'); open++; ctx.el('div', 'alertbox hot', s1.al, '<b>Alerta · </b>' + NODES[i] + ' lleva 3 latidos seguidos sin responder (30 s).'); ctx.log(NODES[i] + ' lleva 3 latidos perdidos seguidos: se abre una alerta.', 'err'); }
          if (ok && R.box.classList.contains('bad')) { R.box.classList.remove('bad'); S.badge(R.b, 'recuperado', 'ok'); open--; ctx.log(NODES[i] + ' vuelve a latir: la alerta se resuelve sola.', 'ok'); }
        }
        if (t === 5) ctx.log('nodo-2 pierde un único latido y recupera enseguida: es ruido, no se alerta.', 'dim');
        if (t === 8) ctx.log('nodo-4 deja de enviar latidos.', 'warn');
        s1.a.v.textContent = (6 - s1.miss.filter(function (m) { return m >= 3; }).length) + ' de 6'; s1.b.v.textContent = lost; s1.c.v.textContent = open;
        s1.a.classList.toggle('hi', open > 0); s1.c.classList.toggle('hi', open > 0);
        await ctx.sleep(260);
      }
      ctx.log('Tolerar uno o dos latidos perdidos evita falsas alarmas; exigir demasiados retrasa la detección. Es un equilibrio.', 'info');
    }
  };

  /* ====================================================================
     2. Alerta cuando un nodo deja de responder
     ==================================================================== */
  const SH2 =
    "# Política de alerta: sin latidos durante 30 s\n" +
    "gcloud alpha monitoring policies create \\\n" +
    "  --display-name='nodo sin respuesta' \\\n" +
    "  --condition-filter='metric.type=\"agent.googleapis.com/heartbeat\"' \\\n" +
    "  --condition-absent-duration=30s \\\n" +
    "  --notification-channels=correo,chat,guardia";
  const STEPS2 = [
    ['1 · El nodo deja de latir', 'Fallo en el nodo-4'],
    ['2 · Se evalúa la regla', '3 latidos seguidos perdidos = 30 s'],
    ['3 · Se abre la alerta', 'Gravedad crítica'],
    ['4 · Se notifica', 'Correo, chat y persona de guardia'],
    ['5 · Alguien lo reconoce', 'Si nadie responde, se escala'],
    ['6 · Se resuelve', 'El nodo vuelve a latir']
  ];
  let s2 = null;
  const ex2 = {
    id: 'alerta', label: 'Alerta cuando un nodo no responde',
    desc: 'Del fallo al aviso y a la resolución: cuánto se tarda en cada paso',
    code: SH2,
    quiz: [
      { q: 'Nadie reconoce la alerta en 5 minutos. ¿Qué debería pasar?', o: ["El nodo se repara solo","Se borra la alerta","Se escala a otra persona"], x: "GEcFSxdRQE0QRhcQegwWRAhbCh8ABkReVxYGFgcIQQICTwUFX1MWEhABSUwPCxocAUMSRQoACRlfBkwdEAdEUFdDHEQIWQoJAREFDV5XQwQIDF8XDUFXGQ==" },
      { q: 'Una alerta, ¿arregla el fallo por sí misma?', o: ["Sí, siempre","No, avisa para que alguien actúe (o dispare una automatización)","Solo si es de noche"], x: "GEcFSxdSQE0QRhcQegJFBQVIERgOVQ1DVFkRCAVSDQ8NTwcBXVNEAgYNqp4NTAMUREVTVQZFEQdMQxwKBxdCXFdDCkQcQwJMDhYHRPGFDUUFHFkMAazUEERRV0MEFwZOCg0LFEoPTw==" }
    ],
    setup: function (ctx) {
      s2 = { st: [] };
      STEPS2.forEach(function (s) {
        const p = ctx.el('div', 'phase pstep', null, '<div class="phase-h"><b>' + esc(s[0]) + '</b><small>' + esc(s[1]) + '</small></div><div class="wrk-row"><span class="badge">pendiente</span><span class="rd" style="font:600 11.5px var(--mono);color:var(--ink-2)"></span></div>');
        s2.st.push({ box: p, b: p.querySelector('.badge'), rd: p.querySelector('.rd') });
      });
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'tiempo de detección', '—'); s2.b = stat(ctx, s2.stats, 'tiempo hasta reconocer', '—'); s2.c = stat(ctx, s2.stats, 'tiempo total de caída', '—');
    },
    run: async function (ctx) {
      const st = s2.st;
      async function step(i, rd, kind, ms) {
        st[i].box.classList.add('active'); S.badge(st[i].b, 'en curso', 'warn'); st[i].rd.textContent = rd;
        await ctx.sleep(ms || 800); st[i].box.classList.remove('active'); S.badge(st[i].b, kind === 'err' ? 'fallo' : 'hecho', kind === 'err' ? 'err' : 'ok');
      }
      ctx.log('El nodo-4 de un clúster va a fallar. La regla de alerta está configurada: «sin latidos durante 30 s».');
      await ctx.sleep(700);
      ctx.log('T+0 s: el nodo-4 deja de enviar latidos.', 'err'); await step(0, 'T+0 s', 'err');
      await S.fly(ctx, st[0].box, st[1].box, 'sin latido', 'err');
      ctx.log('La monitorización cuenta los latidos perdidos: 1… 2… 3.');
      await step(1, 'T+30 s', 'ok', 1100); s2.a.v.textContent = '30 s';
      await S.fly(ctx, st[1].box, st[2].box, 'regla cumplida', '');
      ctx.log('T+30 s: se abre una alerta crítica «nodo-4 sin respuesta».', 'warn'); await step(2, 'T+30 s', 'ok');
      await S.fly(ctx, st[2].box, st[3].box, 'aviso', 'ok');
      ctx.log('T+31 s: aviso por correo, mensaje al chat del equipo y llamada a la persona de guardia.');
      await step(3, 'T+31 s', 'ok');
      ctx.log('Pasan 5 minutos y nadie reconoce la alerta (la persona de guardia está en el metro).', 'warn');
      st[4].box.classList.add('active'); S.badge(st[4].b, 'sin respuesta', 'warn'); st[4].rd.textContent = 'T+5 min'; await ctx.sleep(1300);
      ctx.log('Se escala a la segunda persona de guardia, que sí responde.', 'info');
      st[4].box.classList.remove('active'); S.badge(st[4].b, 'reconocida', 'ok'); st[4].rd.textContent = 'T+6 min'; s2.b.v.textContent = '6 min';
      await S.fly(ctx, st[4].box, st[5].box, 'reinicio', 'ok');
      ctx.log('Reinicia el nodo; el clúster ya había re-repartido su trabajo.');
      await step(5, 'T+14 min', 'ok', 1100); s2.c.v.textContent = '14 min'; s2.c.classList.add('hi');
      ctx.log('El nodo vuelve a latir y la alerta se cierra. Cada minuto de este recorrido cuenta para el SLA.', 'ok');
      ctx.log('Detectar rápido (monitorización) y avisar a alguien que responda (escalado) reduce la caída: el fallo en sí no se puede evitar.', 'info');
    }
  };

  /* ====================================================================
     3. Disponibilidad del mes frente al SLA
     ==================================================================== */
  const SH3 =
    "# Disponibilidad = (minutos del mes − minutos de caída) / minutos del mes\n" +
    "# Mes de 30 días = 43.200 minutos\n\n" +
    "gcloud monitoring uptime list-configs\n" +
    "gcloud monitoring dashboards list";
  const SLAS = [{ n: '99 %', min: 432 }, { n: '99,9 %', min: 43.2 }, { n: '99,99 %', min: 4.32 }];
  const INC = { 5: 7, 13: 22, 22: 12, 27: 10 };   // día (0-based) → minutos de caída
  let s3 = null;
  const ex3 = {
    id: 'disponibilidad', label: 'Disponibilidad del mes frente al SLA',
    desc: 'Un mes con varias caídas: ¿qué SLA se cumple y cuál no?',
    code: SH3,
    quiz: [
      { q: 'Un mes de 30 días con 41 minutos de caída, ¿cumple un SLA del 99,9 %?', o: ["Depende del color","No, solo permite 10","Sí, permite 43,2 minutos"], x: "GEcFSxdRQE0QRhcQcw9FXVABWkxKVQBIEgJQS1ZZHUMBBhsRWV1FQwEBA0xDWFxZVg1fXw0QEAZeQwgKVQdM8ZsHBEQZSBEBBgENSV1FTUcZ" },
      { q: '¿Cuántos minutos de caída al mes tolera un SLA del 99,99 %?', o: ["Unos 4,3","Unos 43","Unos 432"], x: "GEcFSxdTQE0QRhcQcw9FVEUdUkxKVQBIEgJQS1ZZHUMBBhsRWV1FQxYLBw1XQFxHREBbWBYRCxoDQRE=" }
    ],
    setup: function (ctx) {
      s3 = { bars: [], rows: [] };
      s3.stats = ctx.el('div', 'stats', null);
      s3.a = stat(ctx, s3.stats, 'minutos de caída', '0'); s3.b = stat(ctx, s3.stats, 'disponibilidad del mes', '100 %'); s3.c = stat(ctx, s3.stats, 'día', '0 / 30');
      s3.cols = ctx.el('div', 'dcols', null);
      for (let i = 0; i < 30; i++) { const b = ctx.el('i', '', s3.cols); b.style.height = '0%'; b.title = 'día ' + (i + 1); s3.bars.push(b); }
      ctx.el('div', 'flow-note', null, 'Cada barra es un día; su altura es el tiempo caído ese día');
      SLAS.forEach(function (s) {
        const r = ctx.el('div', 'hrow', null, '<span class="hl">SLA ' + s.n + '</span><div class="hbar"><i></i></div><span class="hv">0 / ' + nf(s.min, 1) + ' min</span>');
        r.style.gridTemplateColumns = '82px minmax(0, 1fr) 132px';
        s3.rows.push({ bar: r.querySelector('i'), v: r.querySelector('.hv'), s: s, broken: false });
      });
    },
    run: async function (ctx) {
      ctx.log('Mes de 30 días = 43.200 minutos. Cada SLA permite un máximo de minutos de caída: 99 % → 432, 99,9 % → 43,2, 99,99 % → 4,32.');
      await ctx.sleep(900);
      let down = 0;
      for (let d = 0; d < 30; d++) {
        const m = INC[d] || 0; down += m;
        s3.c.v.textContent = (d + 1) + ' / 30';
        if (m) {
          s3.bars[d].style.height = Math.min(100, m / 25 * 100) + '%'; s3.bars[d].classList.add('spike');
          ctx.log('Día ' + (d + 1) + ': caída de ' + m + ' minutos (acumulado ' + down + ').', m >= 10 && d === 27 ? 'err' : 'warn');
        }
        s3.a.v.textContent = down; s3.b.v.textContent = nf((43200 - down) / 43200 * 100, 3) + ' %';
        s3.rows.forEach(function (r) {
          const ratio = down / r.s.min; r.bar.style.width = Math.min(100, ratio * 100) + '%';
          r.v.textContent = nf(down, 0) + ' / ' + nf(r.s.min, 1) + ' min';
          if (ratio > 1) { r.bar.className = 'hot'; if (!r.broken) { r.broken = true; ctx.log('SLA ' + r.s.n + ' incumplido: ' + nf(down, 0) + ' min superan los ' + nf(r.s.min, 1) + ' permitidos.', 'err'); } }
          else r.bar.className = ratio > 0.8 ? 'wait' : '';
        });
        if (d === 13) ctx.log('Con 29 minutos acumulados, el 99,9 % va bien (permite 43,2) y el 99,99 % ya se ha roto desde el primer incidente.', 'info');
        await ctx.sleep(m ? 600 : 130);
      }
      s3.b.classList.add('hi');
      ctx.log('Resumen del mes: ' + down + ' min de caída = ' + nf((43200 - down) / 43200 * 100, 3) + ' % disponible. Cumple el 99 %, pero no el 99,9 % ni el 99,99 %.', 'warn');
      ctx.log('Sin el último incidente (10 min) habrían sido 41 min y el 99,9 % se habría cumplido por muy poco.', 'info');
      ctx.log('Cuanto más exigente el SLA, menos margen: por eso cada minuto de detección y reparación importa.', 'dim');
    }
  };

  /* ====================================================================
     4. Los nueves y las dependencias en serie
     ==================================================================== */
  const SH4 =
    "# Minutos de caída permitidos\n" +
    "# 99     % → 432 min/mes   (≈ 7,2 h)\n" +
    "# 99,9   % →  43 min/mes\n" +
    "# 99,99  % →  4,3 min/mes\n" +
    "# 99,999 % →  26 s/mes\n\n" +
    "# Servicios en serie: se multiplican las disponibilidades\n" +
    "disponibilidad_total = 0.999 * 0.999 * 0.999";
  const NINES = [['99 %', 0.99], ['99,9 %', 0.999], ['99,99 %', 0.9999], ['99,999 %', 0.99999]];
  let s4 = null;
  const ex4 = {
    id: 'nueves', label: 'Los nueves y las dependencias en serie',
    desc: 'Cuánta caída permite cada SLA y qué pasa al depender de varios servicios',
    code: SH4,
    quiz: [
      { q: 'Tu aplicación depende en serie de tres servicios de 99,9 % cada uno. ¿Qué disponibilidad esperas?', o: ["Algo menos del 99,9 % (≈ 99,7 %)","Exactamente 99,9 %","Más del 99,9 %"], x: "GEcFSxdTQE0QRhcQegIWRA1EEBwAGw1PW1oKAQUNSBBMChtEXldECgBEGkhDARoZEERCWgoGBQcXQ1xDTF0U8IVDh+3hDVNAVkxTAxBL" },
      { q: '¿Cómo se puede mejorar la disponibilidad de un componente?', o: ["Añadiendo más dependencias en serie","Duplicándolo en paralelo (redundancia)","Quitando la monitorización"], x: "GEcFSxdSQE0QRhcQcgwWRApCEwUOBkREXFIGFQEHSQoJAQEBXhJTDUUUCF8CAAoZCw1BWQ8KRA9MDwAOG0ReWxYFBAgFTA1MAxQXDVZZEEUFSUECTBkQHgMQSw==" }
    ],
    setup: function (ctx) {
      s4 = { rows: [] };
      s4.tw = ctx.el('div', 'tbl-wrap', null, '<table class="tbl mini"><thead><tr><th>SLA</th><th>al año</th><th>al mes</th><th>al día</th></tr></thead><tbody></tbody></table>');
      s4.tb = s4.tw.querySelector('tbody');
      s4.chain = ctx.el('div', 'cli', null, '<b>Cadena</b><span>app → base de datos → almacenamiento</span><span class="ans">—</span>');
      s4.ans = s4.chain.querySelector('.ans');
      s4.stats = ctx.el('div', 'stats', null);
      s4.a = stat(ctx, s4.stats, 'un servicio', '99,9 %'); s4.b = stat(ctx, s4.stats, 'tres en serie', '—'); s4.c = stat(ctx, s4.stats, 'dos copias en paralelo', '—');
    },
    run: async function (ctx) {
      ctx.log('Un año tiene 525.600 minutos. Veamos cuánta caída permite cada «nueve» del SLA.');
      await ctx.sleep(700);
      NINES.forEach(function (n) { });
      for (let i = 0; i < NINES.length; i++) {
        const loss = 1 - NINES[i][1], y = loss * 525600, m = loss * 43200, d = loss * 1440;
        const fmt = function (min) { return min >= 120 ? nf(min / 60, 1) + ' h' : min >= 1 ? nf(min, 1) + ' min' : nf(min * 60, 0) + ' s'; };
        s4.tb.insertAdjacentHTML('beforeend', '<tr><td><b>' + NINES[i][0] + '</b></td><td class="num">' + fmt(y) + '</td><td class="num">' + fmt(m) + '</td><td class="num">' + fmt(d) + '</td></tr>');
        await ctx.sleep(700);
      }
      ctx.log('Cada nueve extra divide la caída permitida entre diez: 99 % ≈ 3,7 días al año; 99,999 % ≈ 5 minutos.', 'info');
      await ctx.sleep(900);
      ctx.log('Ahora una aplicación que necesita que funcionen a la vez la app, la base de datos y el almacenamiento (cada uno de 99,9 %).');
      await ctx.sleep(500);
      const serie = Math.pow(0.999, 3);
      s4.ans.textContent = '0,999 × 0,999 × 0,999'; await ctx.sleep(900);
      s4.b.v.textContent = nf(serie * 100, 2) + ' %'; s4.b.classList.add('hi'); s4.ans.textContent = '= ' + nf(serie * 100, 2) + ' %';
      ctx.log('En serie se multiplican: 99,9 % × 99,9 % × 99,9 % ≈ ' + nf(serie * 100, 2) + ' %. La cadena es menos fiable que cada eslabón.', 'warn');
      ctx.log('Son unos ' + nf((1 - serie) * 43200, 0) + ' minutos de caída al mes en vez de 43.', 'dim');
      await ctx.sleep(1100);
      ctx.log('Contramedida: duplicar un componente en paralelo (dos copias independientes). Solo falla si fallan las dos a la vez: 1 − 0,001².');
      const par = 1 - Math.pow(0.001, 2);
      s4.c.v.textContent = nf(par * 100, 4) + ' %'; s4.c.classList.add('ok');
      ctx.log('Dos copias de 99,9 % en paralelo dan ≈ ' + nf(par * 100, 4) + ' %. Por eso la alta disponibilidad se basa en redundancia (varias zonas, réplicas).', 'ok');
      ctx.log('El SLA del proveedor se aplica a cada servicio por separado: el de tu aplicación completa te toca calcularlo a ti.', 'info');
    }
  };

  C.registerConsole('monitorizacion', { lang: 'bash', examples: [ex2, ex3, ex4] });
})(window.CEDI);
