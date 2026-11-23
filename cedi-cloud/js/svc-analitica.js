/* Servicio Analítica (tipo BigQuery): fases y trabajadores, poda de particiones, filas frente a columnas y shuffle. */
(function (C) {
  const S = C.stage, I = C.icon, esc = C.esc;
  const nf = function (n, d) { return n.toLocaleString('es-ES', { maximumFractionDigits: d == null ? 0 : d }); };
  const usd = function (gb) { return nf(gb / 1024 * 6.25, 2) + ' $'; };   // 6,25 $ por TiB leído

  /* Cuenta de 0 a v (animada) escribiendo en un elemento */
  async function count(ctx, el, v, fmtFn, steps) {
    steps = steps || 10;
    for (let i = 1; i <= steps; i++) { el.textContent = fmtFn(v * i / steps); await ctx.sleep(60); }
  }
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function workers(ctx, phase, n) {
    const row = phase.querySelector('.wrk-row'); row.innerHTML = '';
    const list = [];
    for (let i = 0; i < n; i++) list.push(ctx.el('span', 'wrk', row, String(i + 1)));
    return list;
  }
  function phaseRow(ctx, parent, title, sub, n) {
    const p = ctx.el('div', 'phase', parent, '<div class="phase-h"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></div><div class="wrk-row"></div>');
    p.w = workers(ctx, p, n); return p;
  }
  async function runPhase(ctx, p, ms) {
    p.classList.add('active');
    p.w.forEach(function (w) { w.classList.add('run'); });
    await ctx.sleep(ms);
    p.w.forEach(function (w) { w.classList.remove('run'); w.classList.add('done'); });
    p.classList.remove('active');
  }

  /* ====================================================================
     1. Consulta repartida en fases y trabajadores
     ==================================================================== */
  const SQL1 =
    "SELECT ciudad, SUM(importe) AS total\n" +
    "FROM `mi_proyecto.tienda.ventas`\n" +
    "WHERE fecha >= '2026-01-01'\n" +
    "GROUP BY ciudad\n" +
    "ORDER BY total DESC\n" +
    "LIMIT 5;";
  let s1 = null;
  const ex1 = {
    id: 'fases', label: 'Consulta repartida en fases y trabajadores',
    desc: 'Una sola consulta SQL se divide en fases y cada fase en muchos trabajadores',
    code: SQL1,
    setup: function (ctx) {
      s1 = {};
      s1.q = ctx.el('div', 'qbox', null, esc(SQL1).replace(/\n/g, '<br>'));
      s1.stats = ctx.el('div', 'stats', null);
      s1.read = stat(ctx, s1.stats, 'datos leídos', '0 GB');
      s1.wk = stat(ctx, s1.stats, 'trabajadores usados', '0');
      s1.t = stat(ctx, s1.stats, 'tiempo', '—');
      s1.p1 = phaseRow(ctx, null, 'Fase 1 · leer', 'Filtrar por fecha y sumar por ciudad (suma parcial)', 12);
      s1.n1 = ctx.el('div', 'flow-note', null, '↓ solo viajan las sumas parciales, no las filas');
      s1.p2 = phaseRow(ctx, null, 'Fase 2 · agregar', 'Cada trabajador junta las ciudades que le tocan', 4);
      s1.n2 = ctx.el('div', 'flow-note', null, '↓ resultados por ciudad');
      s1.p3 = phaseRow(ctx, null, 'Fase 3 · ordenar', 'Ordenar de mayor a menor y quedarse con 5', 1);
    },
    run: async function (ctx) {
      ctx.log('El planificador recibe la consulta y la convierte en un plan de fases.');
      await ctx.sleep(700);
      ctx.log('Poda: la tabla está particionada por fecha. fecha >= 2026-01-01 → solo 320 de 1.095 particiones (≈ 860 GB de 3 TB).', 'ok');
      await count(ctx, s1.read.v, 860, function (v) { return nf(v) + ' GB'; });
      await ctx.sleep(400);
      ctx.log('Fase 1: 12 trabajadores leen cada uno su trozo, filtran y suman por ciudad en local.');
      s1.wk.v.textContent = '12';
      await runPhase(ctx, s1.p1, 1500);
      ctx.log('Cada trabajador envía unas pocas sumas parciales (una por ciudad) en lugar de millones de filas.', 'dim');
      await ctx.sleep(600);
      ctx.log('Fase 2: 4 trabajadores reciben todas las sumas de «sus» ciudades y las suman (reparto por clave).');
      s1.wk.v.textContent = '16';
      await runPhase(ctx, s1.p2, 1200);
      await ctx.sleep(400);
      ctx.log('Fase 3: un único trabajador ordena el resultado y se queda con las 5 primeras.');
      s1.wk.v.textContent = '17';
      await runPhase(ctx, s1.p3, 900);
      s1.t.v.textContent = '≈ 3 s'; s1.t.classList.add('ok');
      const tbl = ctx.el('div', 'tbl-wrap', null,
        '<table class="tbl mini"><thead><tr><th>ciudad</th><th>total</th></tr></thead><tbody>' +
        [['Madrid', '12.480.300'], ['Barcelona', '9.912.750'], ['Valencia', '5.230.110'], ['Sevilla', '4.871.020'], ['Bilbao', '3.402.880']]
          .map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + ' €</td></tr>'; }).join('') +
        '</tbody></table>');
      ctx.log('Resultado (cifras de ejemplo).', 'ok');
      await ctx.sleep(700);
      ctx.log('Si un único disco leyera esos 860 GB a unos 200 MB/s tardaría ≈ 73 minutos. Con cientos o miles de trabajadores leyendo a la vez, segundos.', 'warn');
      ctx.log('Coste: 860 GB ≈ ' + usd(860) + ' (6,25 $ por TiB leído; el primer TiB del mes es gratis).', 'info');
      ctx.log('Se paga por bytes leídos, no por filas devueltas: añadir LIMIT 5 no habría abaratado nada.', 'warn');
    }
  };

  /* ====================================================================
     2. Poda de particiones por fecha
     ==================================================================== */
  const SQL2 =
    "-- Tabla ventas: 3 años = 1.095 particiones diarias (3 TB)\n" +
    "SELECT SUM(importe) FROM ventas WHERE fecha = '2026-11-16';\n" +
    "SELECT SUM(importe) FROM ventas WHERE fecha BETWEEN '2026-11-10' AND '2026-11-16';\n" +
    "SELECT SUM(importe) FROM ventas WHERE fecha >= '2026-01-01';\n" +
    "SELECT SUM(importe) FROM ventas WHERE ciudad = 'Madrid';  -- sin filtro de fecha\n\n" +
    "-- Evitar el error caro:\n" +
    "ALTER TABLE ventas SET OPTIONS (require_partition_filter = TRUE);";
  const Q2 = [
    { sql: "WHERE fecha = '2026-11-16'", n: 1, gb: 2.7, txt: '1 partición' },
    { sql: "WHERE fecha BETWEEN '2026-11-10' AND '2026-11-16'", n: 7, gb: 19, txt: '7 particiones' },
    { sql: "WHERE fecha >= '2026-01-01'", n: 320, gb: 860, txt: '≈ 320 particiones' },
    { sql: "WHERE ciudad = 'Madrid'   -- sin filtro de fecha", n: 1095, gb: 3072, txt: '1.095 particiones' }
  ];
  let s2 = null;
  const ex2 = {
    id: 'poda', label: 'Poda de particiones por fecha',
    desc: 'Cuantas menos particiones se leen, menos tiempo y menos dinero',
    code: SQL2,
    setup: function (ctx) {
      s2 = {};
      s2.q = ctx.el('div', 'qbox', null, '<em>SELECT</em> SUM(importe) <em>FROM</em> ventas <span class="w">…</span>');
      s2.w = s2.q.querySelector('.w');
      s2.cells = ctx.el('div', 'cells', null);
      s2.cells.style.gridTemplateColumns = 'repeat(61, minmax(0, 1fr))';
      s2.c = [];
      for (let i = 0; i < 1095; i++) s2.c.push(ctx.el('i', 'cell', s2.cells));
      ctx.el('div', 'cells-legend', null, '<span>cada cuadrito = 1 día (1 partición) · hace 3 años</span><span>hoy</span>');
      s2.stats = ctx.el('div', 'stats', null);
      s2.np = stat(ctx, s2.stats, 'particiones leídas', '0');
      s2.gb = stat(ctx, s2.stats, 'datos leídos', '0 GB');
      s2.cost = stat(ctx, s2.stats, 'coste de la consulta', '0 $');
      s2.tw = ctx.el('div', 'tbl-wrap', null,
        '<table class="tbl mini"><thead><tr><th>filtro</th><th>particiones</th><th>leído</th><th>coste</th></tr></thead><tbody></tbody></table>');
      s2.tb = s2.tw.querySelector('tbody');
    },
    run: async function (ctx) {
      ctx.log('La tabla ventas tiene 3 años de datos: 1.095 particiones diarias, ≈ 2,7 GB cada una, 3 TB en total.');
      await ctx.sleep(500);
      for (let q = 0; q < Q2.length; q++) {
        const Q = Q2[q];
        s2.w.textContent = Q.sql;
        s2.c.forEach(function (c) { c.className = 'cell'; });
        s2.np.v.textContent = '0'; s2.gb.v.textContent = '0 GB'; s2.cost.v.textContent = '0 $';
        s2.gb.classList.remove('hi'); s2.cost.classList.remove('hi');
        ctx.log('Consulta ' + (q + 1) + ': ' + Q.sql.replace(/\s+--.*$/, ''));
        await ctx.sleep(500);
        // las particiones leídas son las últimas n (las más recientes); la 3.ª y 4.ª ocupan desde el final
        const start = 1095 - Q.n;
        const step = Math.max(1, Math.round(Q.n / 24));
        for (let i = 0; i < Q.n; i += step) {
          const top = Math.min(Q.n, i + step);
          for (let j = i; j < top; j++) s2.c[start + j].classList.add('on');
          const frac = top / Q.n;
          s2.np.v.textContent = nf(Q.n * frac);
          s2.gb.v.textContent = Q.gb * frac < 1024 ? nf(Q.gb * frac, 1) + ' GB' : nf(Q.gb * frac / 1024, 2) + ' TB';
          s2.cost.v.textContent = usd(Q.gb * frac);
          await ctx.sleep(70);
        }
        if (q >= 2) { s2.gb.classList.add('hi'); s2.cost.classList.add('hi'); }
        const bytes = Q.gb < 1024 ? nf(Q.gb, 1) + ' GB' : '3 TB';
        s2.tb.insertAdjacentHTML('beforeend', '<tr><td><code>' + esc(Q.sql.replace(/\s+--.*$/, '')) + '</code></td><td class="num">' + String(Q.n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '</td><td class="num">' + bytes + '</td><td class="num">' + usd(Q.gb) + '</td></tr>');
        if (q === 0) ctx.log('Poda: el motor ignora 1.094 particiones y lee solo 1 (2,7 GB).', 'ok');
        if (q === 1) ctx.log('Siete días = 7 particiones, 19 GB: la factura crece, pero sigue siendo pequeña.', 'ok');
        if (q === 2) ctx.log('Todo 2026: ≈ 320 particiones, 860 GB. Leer 860 GB con un solo disco serían ≈ 73 minutos; aquí lo reparten muchos trabajadores.', 'warn');
        if (q === 3) {
          ctx.log('Sin filtro por fecha el motor no puede podar: lee las 1.095 particiones, 3 TB (≈ ' + usd(3072) + ' por consulta).', 'err');
          ctx.log('Un analista despistado que lance esto cada día convierte una tabla barata en una factura enorme.', 'warn');
        }
        await ctx.sleep(900);
      }
      ctx.log('Cobro: 6,25 $ por TiB leído (el primer TiB del mes es gratis) y se paga por bytes leídos, no por filas devueltas.', 'info');
      await ctx.sleep(600);
      ctx.log('Defensa: ALTER TABLE ventas SET OPTIONS (require_partition_filter = TRUE).');
      await ctx.sleep(700);
      s2.w.textContent = "WHERE ciudad = 'Madrid'   -- con require_partition_filter";
      s2.c.forEach(function (c) { c.className = 'cell'; });
      s2.np.v.textContent = '0'; s2.gb.v.textContent = '0 GB'; s2.cost.v.textContent = '0 $';
      s2.gb.classList.remove('hi'); s2.cost.classList.remove('hi');
      await ctx.sleep(500);
      const err = ctx.el('div', 'errbox', null,
        'Error: no se puede consultar la tabla ventas sin un filtro sobre la columna de partición «fecha».');
      S.flash(err, false, 1600);
      ctx.log('La consulta se rechaza antes de leer nada: coste 0 $. La poda deja de ser opcional.', 'ok');
    }
  };

  /* ====================================================================
     3. Almacenamiento por filas frente a columnas
     ==================================================================== */
  const COLS = ['id', 'fch', 'ciu', 'prod', 'cant', 'prec', 'IMP', 'cli', 'can', 'est'];
  const HOT = 6;                                       // columna «importe»
  const ROWS = 8;
  let s3 = null;
  function miniGrid(ctx, parent, title, sub) {
    const box = ctx.el('div', 'tgrid', parent, '<h5>' + esc(title) + '<small>' + esc(sub) + '</small></h5><div class="tg"></div><div class="readout">—</div>');
    const g = box.querySelector('.tg'), cells = [];
    COLS.forEach(function (n, j) { ctx.el('div', 'th' + (j === HOT ? ' hot' : ''), g, esc(n)); });
    for (let r = 0; r < ROWS; r++) { cells.push([]); for (let j = 0; j < COLS.length; j++) cells[r].push(ctx.el('div', 'c' + (j === HOT ? ' hotcol' : ''), g)); }
    return { box: box, cells: cells, out: box.querySelector('.readout') };
  }
  function clearGrid(g) { g.cells.forEach(function (r) { r.forEach(function (c) { c.classList.remove('on'); }); }); }
  const SQL3 =
    "-- Tabla ventas: 50 columnas, 200 M de filas\n" +
    "-- Consulta analítica: solo necesita 1 columna\n" +
    "SELECT SUM(importe) FROM ventas;\n\n" +
    "-- Consulta de aplicación: necesita 1 fila entera\n" +
    "SELECT * FROM ventas WHERE id = 42;";
  const ex3 = {
    id: 'columnas', label: 'Almacenamiento por filas frente a columnas',
    desc: 'La misma tabla guardada de dos formas: cada una gana en un tipo de consulta',
    code: SQL3,
    setup: function (ctx) {
      s3 = {};
      s3.q = ctx.el('div', 'qbox', null, '<em>SELECT</em> …');
      s3.two = ctx.el('div', 'two', null);
      s3.row = miniGrid(ctx, s3.two, 'Por filas', 'CSV, MySQL, MongoDB, Avro');
      s3.col = miniGrid(ctx, s3.two, 'Por columnas', 'Parquet, ORC, BigQuery');
      s3.cmp = ctx.el('div', 'stats', null);
      s3.a = stat(ctx, s3.cmp, 'CSV (filas)', '20 GB');
      s3.b = stat(ctx, s3.cmp, 'Parquet (columnas)', '3 GB');
      s3.c = stat(ctx, s3.cmp, 'SUM(importe) leyendo 1 de 50 columnas', '—');
    },
    run: async function (ctx) {
      ctx.log('La tabla de 50 columnas aquí se dibuja con 10 (cada fila es una venta). La columna importe (IMP) está resaltada.');
      await ctx.sleep(700);
      ctx.log('Consulta analítica: SELECT SUM(importe) FROM ventas;');
      s3.q.innerHTML = '<em>SELECT</em> SUM(importe) <em>FROM</em> ventas';
      await ctx.sleep(600);
      ctx.log('Por filas: los datos de una venta están juntos en disco, así que hay que leer cada fila entera para llegar al importe.', 'dim');
      for (let r = 0; r < ROWS; r++) {
        s3.row.cells[r].forEach(function (c) { c.classList.add('on'); });
        s3.row.out.textContent = 'leído: ' + nf((r + 1) / ROWS * 100) + ' % de la tabla';
        await ctx.sleep(180);
      }
      ctx.log('Resultado: se lee el 100 % (≈ 20 GB) para usar solo una columna.', 'warn');
      await ctx.sleep(500);
      ctx.log('Por columnas: cada columna está guardada aparte; solo se abre la de importe.', 'dim');
      for (let r = 0; r < ROWS; r++) { s3.col.cells[r][HOT].classList.add('on'); s3.col.out.textContent = 'leído: ' + nf((r + 1) / ROWS * 10) + ' % de la tabla'; await ctx.sleep(120); }
      s3.col.out.textContent = 'leído: ≈ 2 % (1 de 50 columnas)';
      S.flash(s3.col.box, true);
      s3.c.v.textContent = '≈ 100 MB';
      ctx.log('Resultado: ≈ 100 MB, un cincuentavo. Además las columnas se comprimen mucho mejor: el mismo CSV de 20 GB queda en ≈ 3 GB en Parquet.', 'ok');
      ctx.log('Resultado: decenas de veces más rápido y más barato.', 'ok');
      await ctx.sleep(1400);

      clearGrid(s3.row); clearGrid(s3.col);
      s3.row.out.textContent = '—'; s3.col.out.textContent = '—';
      s3.q.innerHTML = '<em>SELECT</em> * <em>FROM</em> ventas <em>WHERE</em> id = 42';
      ctx.log('Consulta de aplicación: SELECT * FROM ventas WHERE id = 42; necesita una venta completa.');
      await ctx.sleep(600);
      s3.row.cells[3].forEach(function (c) { c.classList.add('on'); });
      s3.row.out.textContent = 'leído: 1 fila';
      S.flash(s3.row.box, true);
      ctx.log('Por filas: una única lectura contigua. Ideal para aplicaciones y transacciones.', 'ok');
      await ctx.sleep(700);
      for (let j = 0; j < COLS.length; j++) { for (let r = 0; r < ROWS; r++) if (r === 3) s3.col.cells[r][j].classList.add('on'); s3.col.out.textContent = 'columnas abiertas: ' + (j + 1) + ' de ' + COLS.length; await ctx.sleep(200); }
      ctx.log('Por columnas: hay que abrir las 50 columnas y recomponer la fila. Es lo que peor se le da.', 'warn');
      await ctx.sleep(600);
      ctx.log('Regla: aplicaciones y transacciones → filas (MySQL, MongoDB). Análisis de muchas filas y pocas columnas → columnas (Parquet, BigQuery).', 'info');
    }
  };

  /* ====================================================================
     4. GROUP BY con shuffle
     ==================================================================== */
  const SQL4 =
    "SELECT ciudad, SUM(importe) AS total\n" +
    "FROM ventas\n" +
    "GROUP BY ciudad;\n\n" +
    "-- Fase 1: cada worker suma lo suyo (agregación parcial)\n" +
    "-- Fase 2: SHUFFLE → hash(ciudad) mod 3 decide el reducer\n" +
    "-- Fase 3: cada reducer suma los parciales de sus ciudades";
  const CK = { M: ['Madrid', 'kM'], S: ['Sevilla', 'kS'], B: ['Bilbao', 'kB'] };
  const DATA4 = [
    ['M12', 'S5', 'M8', 'B3', 'S7', 'M4'],
    ['B6', 'M9', 'S2', 'M11', 'B4', 'S8'],
    ['S10', 'B7', 'M5', 'B2', 'S6', 'M3']
  ];
  const REDUCER = { M: 0, S: 1, B: 2 };           // hash(ciudad) mod 3 (ejemplo)
  let s4 = null;
  function chip(ctx, parent, key, val, extra) {
    return ctx.el('span', 'kc k' + key + (extra ? ' ' + extra : ''), parent, key + ' ' + val);
  }
  const ex4 = {
    id: 'shuffle', label: 'GROUP BY con shuffle',
    desc: 'Los datos de la misma ciudad deben juntarse en un mismo trabajador: eso es el shuffle',
    code: SQL4,
    setup: function (ctx) {
      s4 = { w: [], r: [] };
      s4.info = ctx.el('div', 'shuffle-info', null,
        '<div class="row"><span class="kc kM">M Madrid</span><span class="kc kS">S Sevilla</span><span class="kc kB">B Bilbao</span><span>· las cifras son de ejemplo</span></div>');
      ctx.el('div', 'flow-note', null, 'Trabajadores que leen (cada uno tiene su trozo de la tabla)');
      for (let i = 0; i < 3; i++) {
        const box = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Worker ' + (i + 1) + '</b><small>datos locales</small></div><div class="chips"></div>');
        s4.w.push({ box: box, chips: box.querySelector('.chips') });
        DATA4[i].forEach(function (d) { chip(ctx, box.querySelector('.chips'), d[0], d.slice(1)); });
      }
      ctx.el('div', 'flow-note', null, 'Trabajadores que suman (uno por grupo de ciudades)');
      for (let i = 0; i < 3; i++) {
        const nm = ['Madrid', 'Sevilla', 'Bilbao'][i];
        const box = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Reducer ' + (i + 1) + '</b><small>le tocan: ' + nm + '</small></div><div class="chips"></div>');
        s4.r.push({ box: box, chips: box.querySelector('.chips') });
      }
    },
    run: async function (ctx) {
      ctx.log('Los datos están repartidos por fecha en 3 trabajadores; en cada uno hay ventas de todas las ciudades mezcladas.');
      await ctx.sleep(800);
      ctx.log('Problema: para sumar todas las ventas de Madrid, hay que juntar los trozos de Madrid de los 3 trabajadores. Un GROUP BY no es del todo «embarazosamente paralelo».', 'warn');
      await ctx.sleep(900);

      ctx.log('Paso 1 — agregación parcial: cada trabajador suma por ciudad lo que tiene, antes de mover nada.');
      const partial = [];
      for (let i = 0; i < 3; i++) {
        const sums = { M: 0, S: 0, B: 0 };
        DATA4[i].forEach(function (d) { sums[d[0]] += +d.slice(1); });
        partial.push(sums);
        s4.w[i].box.classList.add('active');
      }
      await ctx.sleep(500);
      for (let i = 0; i < 3; i++) {
        Array.from(s4.w[i].chips.children).forEach(function (c) { c.classList.add('fade'); });
      }
      await ctx.sleep(500);
      for (let i = 0; i < 3; i++) {
        s4.w[i].chips.innerHTML = '';
        ['M', 'S', 'B'].forEach(function (k) { chip(ctx, s4.w[i].chips, k, partial[i][k]); });
        s4.w[i].box.classList.remove('active');
      }
      ctx.log('18 filas se han reducido a 9 sumas parciales. Mover 9 datos en lugar de 18 (en la realidad, millones menos).', 'ok');
      await ctx.sleep(900);

      ctx.log('Paso 2 — shuffle: cada suma parcial viaja por la red al trabajador que le toca según hash(ciudad) mod 3.');
      const inbox = [[], [], []];
      for (let i = 0; i < 3; i++) {
        const own = Array.from(s4.w[i].chips.children);
        ['M', 'S', 'B'].forEach(function (k, idx) {
          const dest = REDUCER[k];
          inbox[dest].push({ key: k, val: partial[i][k] });
          s4.shuffleJobs = s4.shuffleJobs || [];
          s4.shuffleJobs.push({ el: own[idx], to: s4.r[dest], key: k, val: partial[i][k] });
        });
      }
      const jobs = s4.shuffleJobs; s4.shuffleJobs = null;
      // cada tanda: los 3 trabajadores envían su suma de la misma ciudad a la vez
      for (let t = 0; t < 3; t++) {
        const batch = jobs.filter(function (_, idx) { return idx % 3 === t; });
        await Promise.all(batch.map(function (j) {
          return S.fly(ctx, j.el, j.to.box, j.key + ' ' + j.val, 'k' + j.key).then(function () {
            chip(ctx, j.to.chips, j.key, j.val); j.el.classList.add('fade');
          });
        }));
      }
      ctx.log('Todas las sumas de Madrid están ahora en el mismo sitio, igual que las de Sevilla y Bilbao.', 'ok');
      ctx.log('El shuffle es la fase más cara: usa la red, escribe en disco y obliga a esperar al trabajador más lento.', 'warn');
      await ctx.sleep(900);

      ctx.log('Paso 3 — agregación final: cada reducer suma los parciales que le han llegado.');
      const total = { M: 0, S: 0, B: 0 };
      inbox.forEach(function (list, r) { list.forEach(function (x) { total[x.key] += x.val; }); });
      for (let r = 0; r < 3; r++) {
        const k = ['M', 'S', 'B'][r];
        s4.r[r].box.classList.add('active');
        await ctx.sleep(500);
        s4.r[r].chips.innerHTML = '';
        chip(ctx, s4.r[r].chips, k, total[k], 'total');
        s4.r[r].box.classList.remove('active');
        S.flash(s4.r[r].box, true);
      }
      ctx.log('Madrid ' + total.M + ' · Sevilla ' + total.S + ' · Bilbao ' + total.B + ' (cifras de ejemplo).', 'ok');
      ctx.log('Con claves muy desiguales (datos sesgados) un reducer recibiría mucho más y el resto esperaría: lo verás en Computación.', 'dim');
    }
  };

  C.registerConsole('analitica', { lang: 'sql', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
