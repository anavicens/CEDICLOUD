/* Servicio Computación: un nodo con núcleos (secuencial/paralelo, aceleración y eficiencia) y un clúster (particiones, shuffle, sesgo). */
(function (C) {
  const S = C.stage, esc = C.esc;
  const nf = function (n, d) { return n.toLocaleString('es-ES', { maximumFractionDigits: d == null ? 0 : d }); };

  function nodeBox(ctx, parent, title, sub, nCores, nBlocks) {
    const box = ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub) + '</small></h5><div class="cores"></div><div class="queue"></div><div class="readout">—</div>');
    const o = { box: box, cores: [], blocks: [], out: box.querySelector('.readout') };
    const cg = box.querySelector('.cores'), q = box.querySelector('.queue');
    for (let i = 0; i < nCores; i++) o.cores.push(ctx.el('div', 'core', cg, 'N' + (i + 1)));
    for (let i = 0; i < nBlocks; i++) o.blocks.push(ctx.el('i', 'blk', q));
    return o;
  }
  /* Procesa los bloques con `use` núcleos a la vez; cada ronda = 1 minuto de trabajo simulado */
  async function process(ctx, o, use) {
    let done = 0, minutes = 0;
    o.cores.forEach(function (c, i) { if (i >= use) c.classList.add('idle'); });
    o.box.classList.add('active');
    while (done < o.blocks.length) {
      const n = Math.min(use, o.blocks.length - done);
      for (let i = 0; i < n; i++) o.cores[i].classList.add('run');
      await ctx.sleep(380);
      for (let i = 0; i < n; i++) { o.cores[i].classList.remove('run'); o.blocks[done + i].classList.add('done'); }
      done += n; minutes++;
      o.out.textContent = minutes + ' min · ' + done + ' de ' + o.blocks.length + ' lotes';
    }
    o.box.classList.remove('active');
    return minutes;
  }

  /* ====================================================================
     1. Secuencial frente a paralelo en un nodo
     ==================================================================== */
  const PY1 =
    "from multiprocessing import Pool\n\n" +
    "def corregir(lote):\n" +
    "    return sum(nota(e) for e in lote)   # 1 lote = 1 minuto\n\n" +
    "lotes = dividir(examenes, 16)\n\n" +
    "# Secuencial: un núcleo, lote a lote\n" +
    "resultado = [corregir(l) for l in lotes]\n\n" +
    "# Paralelo: los 8 núcleos del nodo a la vez\n" +
    "with Pool(processes=8) as pool:\n" +
    "    resultado = pool.map(corregir, lotes)";
  let s1 = null;
  const ex1 = {
    id: 'nodo', label: 'Secuencial frente a paralelo en un nodo',
    desc: 'La misma tarea en un nodo de 8 núcleos: usar uno o usar todos',
    code: PY1,
    setup: function (ctx) {
      s1 = {};
      s1.two = ctx.el('div', 'two', null);
      s1.a = nodeBox(ctx, s1.two, 'Secuencial', 'un solo núcleo hace todo el trabajo', 8, 16);
      s1.b = nodeBox(ctx, s1.two, 'Paralelo', 'los 8 núcleos reparten los lotes', 8, 16);
      s1.stats = ctx.el('div', 'stats', null);
      s1.ta = ctx.el('div', 'stat', s1.stats, '<b>—</b><small>tiempo secuencial</small>'); s1.ta.v = s1.ta.querySelector('b');
      s1.tb = ctx.el('div', 'stat', s1.stats, '<b>—</b><small>tiempo paralelo</small>'); s1.tb.v = s1.tb.querySelector('b');
      s1.sp = ctx.el('div', 'stat', s1.stats, '<b>—</b><small>aceleración</small>'); s1.sp.v = s1.sp.querySelector('b');
    },
    run: async function (ctx) {
      ctx.log('Un nodo (máquina virtual) con 8 núcleos y 16 lotes de trabajo independientes (1 lote = 1 minuto de cálculo).');
      await ctx.sleep(700);
      ctx.log('Izquierda: el programa es secuencial, usa un solo núcleo y los otros 7 no hacen nada.', 'dim');
      ctx.log('Derecha: el programa divide los lotes y los reparte entre los 8 núcleos (Pool de 8 procesos).', 'dim');
      const r = await Promise.all([process(ctx, s1.a, 1), process(ctx, s1.b, 8)]);
      s1.ta.v.textContent = r[0] + ' min'; s1.tb.v.textContent = r[1] + ' min';
      s1.sp.v.textContent = nf(r[0] / r[1], 1) + '×'; s1.sp.classList.add('ok');
      ctx.log('En paralelo: 16 lotes / 8 núcleos = 2 rondas → ' + r[1] + ' min frente a ' + r[0] + ' min.', 'ok');
      await ctx.sleep(700);
      ctx.log('Aquí el reparto es perfecto porque los lotes no dependen unos de otros (paralelismo «embarazoso»).', 'info');
      ctx.log('En un caso real aparecen costes: coordinar procesos, repartir y juntar resultados, y partes que no se pueden paralelizar. Lo ves en el siguiente ejemplo.', 'warn');
    }
  };

  /* ====================================================================
     2. Aceleración y eficiencia
     ==================================================================== */
  const PY2 =
    "# Informe que en 1 núcleo tarda 120 min\n" +
    "T1 = 120\n\n" +
    "for p in (1, 4, 8, 16):\n" +
    "    Tp = medir_tiempo(informe, nucleos=p)\n" +
    "    aceleracion = T1 / Tp            # S = T1 / Tp\n" +
    "    eficiencia  = aceleracion / p    # E = S / p\n" +
    "    print(p, Tp, aceleracion, eficiencia)";
  const RUNS = [{ p: 1, t: 120 }, { p: 4, t: 32 }, { p: 8, t: 20 }, { p: 16, t: 12 }];
  let s2 = null;
  const ex2 = {
    id: 'aceleracion', label: 'Aceleración y eficiencia',
    desc: 'Más núcleos no significa proporcionalmente más rápido: la eficiencia cae',
    code: PY2,
    setup: function (ctx) {
      s2 = { rows: [] };
      ctx.el('div', 'flow-note', null, 'Tiempo del informe según núcleos (la raya negra marca el tiempo ideal 120 / p)');
      RUNS.forEach(function (r) {
        const row = ctx.el('div', 'hrow', null,
          '<span class="hl">' + r.p + (r.p === 1 ? ' núcleo' : ' núcleos') + '</span><div class="hbar"><i></i><b style="left:' + (100 / r.p) + '%"></b></div><span class="hv">—</span>');
        s2.rows.push({ bar: row.querySelector('i'), v: row.querySelector('.hv') });
      });
      s2.stats = ctx.el('div', 'stats', null);
      s2.s = ctx.el('div', 'stat', s2.stats, '<b>—</b><small>aceleración S = T1 / Tp</small>'); s2.s.v = s2.s.querySelector('b');
      s2.e = ctx.el('div', 'stat', s2.stats, '<b>—</b><small>eficiencia E = S / p</small>'); s2.e.v = s2.e.querySelector('b');
      s2.t = ctx.el('div', 'stat', s2.stats, '<b>—</b><small>tiempo</small>'); s2.t.v = s2.t.querySelector('b');
      s2.tw = ctx.el('div', 'tbl-wrap', null,
        '<table class="tbl mini"><thead><tr><th>núcleos</th><th>tiempo</th><th>aceleración</th><th>eficiencia</th></tr></thead><tbody></tbody></table>');
      s2.tb = s2.tw.querySelector('tbody');
    },
    run: async function (ctx) {
      ctx.log('El mismo informe se ejecuta con 1, 4, 8 y 16 núcleos. Con 1 núcleo tarda 120 minutos.');
      await ctx.sleep(600);
      for (let i = 0; i < RUNS.length; i++) {
        const r = RUNS[i], S_ = 120 / r.t, E = S_ / r.p;
        s2.rows[i].bar.style.width = (r.t / 120 * 100) + '%';
        s2.rows[i].v.textContent = r.t + ' min';
        s2.s.v.textContent = nf(S_, 2) + '×'; s2.e.v.textContent = nf(E * 100) + ' %'; s2.t.v.textContent = r.t + ' min';
        s2.tb.insertAdjacentHTML('beforeend', '<tr><td class="num">' + r.p + '</td><td class="num">' + r.t + ' min</td><td class="num">' + nf(S_, 2) + '×</td><td class="num">' + nf(E * 100) + ' %</td></tr>');
        if (i === 0) ctx.log('1 núcleo: 120 min. Aceleración 1, eficiencia 100 % (es la referencia).');
        if (i === 1) ctx.log('4 núcleos: 32 min → aceleración 3,75× (ideal 4×), eficiencia 94 %.', 'ok');
        if (i === 2) ctx.log('8 núcleos: 20 min → aceleración 6×, eficiencia 75 %: ya se pierde un cuarto.', 'warn');
        if (i === 3) { s2.rows[i].bar.classList.add('hot'); ctx.log('16 núcleos: 12 min → aceleración 10× (ideal 16×), eficiencia 63 %.', 'warn'); }
        await ctx.sleep(1400);
      }
      ctx.log('Cada núcleo extra rinde menos que el anterior: 16 núcleos son 4 veces más recursos que 4 y solo 2,7 veces más rápido.', 'info');
      ctx.log('Causas: hay una parte del trabajo que no se puede paralelizar, repartir y juntar resultados cuesta tiempo, y los núcleos compiten por memoria y disco.', 'dim');
      ctx.log('Cifras de ejemplo. Si el tiempo importa mucho, más núcleos compensan; si importa el coste, hay que mirar la eficiencia.', 'dim');
    }
  };

  /* ====================================================================
     3. Clúster: particiones, shuffle y reducción
     ==================================================================== */
  const PY3 =
    "# Spark en un clúster de 3 nodos de trabajo\n" +
    "ventas = spark.read.parquet('gs://curso/ventas/')   # 6 particiones\n\n" +
    "total = (ventas\n" +
    "    .groupBy('ciudad')        # shuffle: junta cada ciudad en un nodo\n" +
    "    .sum('importe')           # reducción\n" +
    "    .collect())";
  const PARTS = [
    { n: 'P1', d: { M: 5, S: 3 } }, { n: 'P2', d: { B: 2, M: 4 } },
    { n: 'P3', d: { S: 6, M: 2 } }, { n: 'P4', d: { B: 3, S: 1 } },
    { n: 'P5', d: { M: 7, B: 4 } }, { n: 'P6', d: { S: 2, B: 5 } }
  ];
  const KEYS = ['M', 'S', 'B'], NAMES = { M: 'Madrid', S: 'Sevilla', B: 'Bilbao' };
  let s3 = null;
  function kchip(ctx, parent, key, val, extra) { return ctx.el('span', 'kc k' + key + (extra ? ' ' + extra : ''), parent, key + ' ' + val); }
  const ex3 = {
    id: 'cluster', label: 'Clúster: particiones, shuffle y reducción',
    desc: 'El maestro reparte particiones a los nodos de trabajo; para agrupar hay que mover datos',
    code: PY3,
    setup: function (ctx) {
      s3 = { w: [], r: [] };
      s3.m = ctx.el('div', 'phase master', null, '<div class="phase-h"><b>Maestro</b><small>planifica y reparte particiones</small></div><div class="chips"></div>');
      s3.mc = s3.m.querySelector('.chips');
      PARTS.forEach(function (p) { ctx.el('span', 'kc kP', s3.mc, p.n); });
      ctx.el('div', 'flow-note', null, 'Nodos de trabajo (cada uno procesa sus particiones)');
      for (let i = 0; i < 3; i++) {
        const b = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Nodo ' + (i + 1) + '</b><small>sin datos</small></div><div class="chips"></div>');
        s3.w.push({ box: b, sub: b.querySelector('small'), chips: b.querySelector('.chips') });
      }
      ctx.el('div', 'flow-note', null, 'Reducción (cada nodo suma una ciudad)');
      for (let i = 0; i < 3; i++) {
        const b = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Nodo ' + (i + 1) + ' · suma</b><small>' + NAMES[KEYS[i]] + '</small></div><div class="chips"></div>');
        s3.r.push({ box: b, chips: b.querySelector('.chips') });
      }
    },
    run: async function (ctx) {
      ctx.log('La tabla de ventas está dividida en 6 particiones. Un clúster tiene un maestro y varios nodos de trabajo.');
      await ctx.sleep(700);
      ctx.log('Paso 1 — el maestro reparte las particiones: 2 por nodo.');
      const targets = [];
      for (let i = 0; i < PARTS.length; i++) {
        const w = s3.w[Math.floor(i / 2)];
        await S.fly(ctx, s3.mc.children[i], w.box, PARTS[i].n, 'kP');
        s3.mc.children[i].classList.add('fade');
        ctx.el('span', 'kc kP', w.chips, PARTS[i].n);
        w.sub.textContent = 'tiene ' + w.chips.children.length + ' particiones'; targets.push(w);
      }
      ctx.log('Cada nodo trabaja sobre sus datos locales. Mover el cálculo a donde están los datos es mejor que mover los datos.', 'dim');
      await ctx.sleep(800);

      ctx.log('Paso 2 — suma parcial local: cada nodo suma por ciudad lo que tiene (sin hablar con los demás).');
      const partial = [{ M: 0, S: 0, B: 0 }, { M: 0, S: 0, B: 0 }, { M: 0, S: 0, B: 0 }];
      PARTS.forEach(function (p, i) { KEYS.forEach(function (k) { partial[Math.floor(i / 2)][k] += (p.d[k] || 0); }); });
      for (let i = 0; i < 3; i++) s3.w[i].box.classList.add('active');
      await ctx.sleep(700);
      for (let i = 0; i < 3; i++) {
        s3.w[i].chips.innerHTML = '';
        KEYS.forEach(function (k) { kchip(ctx, s3.w[i].chips, k, partial[i][k]); });
        s3.w[i].box.classList.remove('active'); s3.w[i].sub.textContent = 'sumas parciales';
      }
      ctx.log('Ningún nodo tiene aún el total de ninguna ciudad.', 'warn');
      await ctx.sleep(800);

      ctx.log('Paso 3 — shuffle: cada suma parcial viaja por la red al nodo que se encarga de esa ciudad.');
      for (let t = 0; t < 3; t++) {
        await Promise.all([0, 1, 2].map(function (i) {
          const el = s3.w[i].chips.children[t], k = KEYS[t];
          return S.fly(ctx, el, s3.r[t].box, k + ' ' + partial[i][k], 'k' + k).then(function () {
            kchip(ctx, s3.r[t].chips, k, partial[i][k]); el.classList.add('fade');
          });
        }));
      }
      ctx.log('El shuffle es lo más caro: red, disco y espera al nodo más lento.', 'warn');
      await ctx.sleep(800);

      ctx.log('Paso 4 — reducción: cada nodo suma los tres parciales de su ciudad.');
      for (let r = 0; r < 3; r++) {
        const k = KEYS[r], tot = partial[0][k] + partial[1][k] + partial[2][k];
        s3.r[r].box.classList.add('active'); await ctx.sleep(450);
        s3.r[r].chips.innerHTML = ''; kchip(ctx, s3.r[r].chips, k, tot, 'total');
        s3.r[r].box.classList.remove('active'); S.flash(s3.r[r].box, true);
      }
      ctx.log('Madrid 18 · Sevilla 12 · Bilbao 14 (cifras de ejemplo).', 'ok');
      ctx.log('Si un nodo cae, el maestro vuelve a ejecutar solo sus particiones en otro nodo. Por eso el clúster tolera fallos.', 'dim');
    }
  };

  /* ====================================================================
     4. Datos sesgados
     ==================================================================== */
  const PY4 =
    "# Particionar por país: España concentra casi todo\n" +
    "ventas.groupBy('pais').sum('importe')\n\n" +
    "# Solución: repartir la clave caliente (salting)\n" +
    "ventas = ventas.withColumn('sal', floor(rand() * 4))\n" +
    "parcial = ventas.groupBy('pais', 'sal').sum('importe')\n" +
    "total = parcial.groupBy('pais').sum('sum(importe)')";
  const SKEW = [{ n: 'España', v: 80 }, { n: 'Portugal', v: 8 }, { n: 'Francia', v: 7 }, { n: 'Islandia', v: 5 }];
  const BAL = [25, 25, 25, 25];
  let s4 = null;
  async function work(ctx, rows, loads, label) {
    const max = Math.max.apply(null, loads), done = loads.map(function () { return 0; });
    rows.forEach(function (r, i) { r.bar.className = ''; r.bar.style.width = '0%'; r.v.textContent = '0 / ' + loads[i] + ' M'; });
    let t = 0;
    while (done.some(function (d, i) { return d < loads[i]; })) {
      t++;
      loads.forEach(function (L, i) {
        if (done[i] < L) { done[i] = Math.min(L, done[i] + 5); rows[i].bar.style.width = (done[i] / max * 100) + '%'; rows[i].v.textContent = done[i] + ' / ' + L + ' M'; }
        else if (rows[i].bar.className !== 'wait') { rows[i].bar.className = 'wait'; rows[i].v.textContent = 'esperando…'; }
      });
      await ctx.sleep(110);
    }
    return t;
  }
  const ex4 = {
    id: 'sesgo', label: 'Datos sesgados',
    desc: 'Si una clave concentra casi todos los datos, un nodo trabaja y los demás esperan',
    code: PY4,
    setup: function (ctx) {
      s4 = { rows: [] };
      ctx.el('div', 'flow-note', null, 'Carga de cada nodo (millones de filas; 5 M por paso)');
      SKEW.forEach(function (d, i) {
        const row = ctx.el('div', 'hrow', null, '<span class="hl">Nodo ' + (i + 1) + '</span><div class="hbar"><i></i></div><span class="hv">—</span>');
        s4.rows.push({ bar: row.querySelector('i'), v: row.querySelector('.hv'), label: row.querySelector('.hl') });
      });
      s4.stats = ctx.el('div', 'stats', null);
      s4.t = ctx.el('div', 'stat', s4.stats, '<b>—</b><small>tiempo total (pasos)</small>'); s4.t.v = s4.t.querySelector('b');
      s4.s = ctx.el('div', 'stat', s4.stats, '<b>—</b><small>aceleración (ideal 4×)</small>'); s4.s.v = s4.s.querySelector('b');
      s4.e = ctx.el('div', 'stat', s4.stats, '<b>—</b><small>eficiencia</small>'); s4.e.v = s4.e.querySelector('b');
    },
    run: async function (ctx) {
      ctx.log('100 M de filas, clúster de 4 nodos, tabla particionada por país: España 80 M, Portugal 8 M, Francia 7 M, Islandia 5 M.');
      SKEW.forEach(function (d, i) { s4.rows[i].label.textContent = d.n; });
      await ctx.sleep(900);
      ctx.log('Todas las filas de un país van al mismo nodo, así que el nodo de España recibe el 80 % del trabajo.', 'warn');
      const loads = SKEW.map(function (d) { return d.v; });
      const t1 = await work(ctx, s4.rows, loads);
      s4.rows[0].bar.className = 'hot';
      s4.t.v.textContent = t1; s4.s.v.textContent = nf(100 / 80, 2) + '×'; s4.e.v.textContent = nf(100 / (4 * 80) * 100) + ' %';
      s4.s.classList.add('hi'); s4.e.classList.add('hi');
      ctx.log('El trabajo acaba cuando acaba el nodo más lento: los otros tres terminaron pronto y se quedaron parados.', 'err');
      ctx.log('Tenías 4 nodos pero el resultado se parece a tener 1,25: aceleración 1,25× y eficiencia 31 %.', 'warn');
      await ctx.sleep(1600);

      ctx.log('Solución: repartir la clave caliente (salting). A España se le añade un número 0–3 al azar y sus filas se reparten por los 4 nodos.');
      SKEW.forEach(function (d, i) { s4.rows[i].label.textContent = 'Nodo ' + (i + 1); });
      s4.s.classList.remove('hi'); s4.e.classList.remove('hi');
      await ctx.sleep(600);
      const t2 = await work(ctx, s4.rows, BAL);
      s4.rows.forEach(function (r) { r.bar.className = 'ok'; });
      s4.t.v.textContent = t2; s4.s.v.textContent = '4×'; s4.e.v.textContent = '100 %'; s4.s.classList.add('ok'); s4.e.classList.add('ok');
      ctx.log('Ahora cada nodo recibe 25 M y todos terminan a la vez: ' + t2 + ' pasos en lugar de ' + t1 + '.', 'ok');
      ctx.log('Coste: hay que hacer una segunda agregación para juntar los trozos de España, pero es muy pequeña.', 'dim');
      ctx.log('Pasa con cualquier clave desigual: un país, un cliente enorme, un valor nulo. Mirar cómo se reparte la clave es parte de diseñar el trabajo.', 'info');
    }
  };

  C.registerConsole('computacion', { lang: 'python', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
