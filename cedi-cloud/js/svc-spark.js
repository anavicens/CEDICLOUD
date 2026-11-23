/* Sección 11 · Spark: driver, executors, particiones, evaluación perezosa, memoria y linaje. */
(function (C) {
  const S = C.stage, esc = C.esc;
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('spark', 'Apache Spark', 'analitica',
      'Motor de procesamiento distribuido que reparte los datos en particiones y las procesa en paralelo en los nodos de un clúster, manteniendo los resultados intermedios en memoria siempre que puede.',
      'Dataproc (Spark gestionado)', 'Amazon EMR', 'HDInsight / Synapse Spark', { alias: ['pyspark', 'dataframe', 'rdd', 'executor', 'driver', 'clúster spark'] }),
    C.concept('lazy', 'Evaluación perezosa y linaje', 'analitica',
      'Las transformaciones (filter, map, groupBy) solo construyen un plan; no se ejecuta nada hasta que una acción (count, show, write) lo pide. El linaje es la receta que permite recalcular una partición perdida.',
      'Plan de ejecución de Spark en Dataproc', 'Plan de ejecución de Spark en EMR', 'Plan de ejecución de Spark en Synapse', { alias: ['transformación', 'acción', 'lazy evaluation', 'linaje', 'lineage', 'cache', 'persist'] })
  ]);
  C.addService({
    id: 'spark', cat: 'Analítica de datos', name: 'Spark', sub: 'Clúster en memoria', icon: 'zap', part: 17,
    lead: 'Mira cómo Spark reparte un trabajo entre executors, espera a que se pida un resultado para ejecutarlo, aprovecha la memoria y se recupera de un fallo sin copias.',
    def: 'Motor de procesamiento distribuido en memoria: un driver coordina y varios executors procesan particiones de los datos en paralelo. Es el sucesor habitual de MapReduce.',
    gcp: 'Dataproc (Spark gestionado)', aws: 'Amazon EMR', azure: 'HDInsight / Synapse Spark',
    sla: '99,9 %',
    concepts: ['spark', 'lazy', 'dag', 'serverless'],
    planned: ['Driver, executors y particiones', 'Transformaciones y acciones', 'Memoria frente a disco', 'Fallo de un executor y linaje'],
    kw: ['spark', 'pyspark', 'dataframe', 'rdd', 'executor', 'driver', 'dataproc', 'emr', 'hdinsight', 'memoria', 'cache', 'linaje', 'lazy', 'transformación', 'acción']
  });
  C.addEquivalences([{ need: 'Clúster Spark gestionado', gcp: 'Dataproc', aws: 'EMR', azure: 'HDInsight / Synapse Spark', src: 'extra' }]);

  /* ---------- 1. Driver, executors y particiones ---------- */
  const SH1 =
    "from pyspark.sql import SparkSession\n" +
    "spark = SparkSession.builder.appName('ventas').getOrCreate()\n\n" +
    "df = spark.read.parquet('gs://cedi-datos/ventas/')   # 9 particiones\n" +
    "total = df.groupBy('region').sum('importe')\n" +
    "total.show()";
  let s1 = null;
  const ex1 = {
    id: 'driver-executors', label: 'Driver, executors y particiones', desc: 'El driver reparte tareas; cada executor procesa sus particiones en paralelo',
    code: SH1,
    quiz: [
      { q: 'En Spark, ¿qué papel tiene el driver?', o: ["Guarda todos los datos","Coordina el trabajo y reparte las tareas","Es un tipo de disco"], x: "GEcFSxdSQE0QRhcQcw9FABtEFQkdVRRBU1gKAw0KTEMJA1UQX1NUAg8LRQ0AHgoUREFTRUMRBRtIAh9PDERBU0VDFwEZTBEYClUBQ0ZEBkUIBl5DCRcQB1hGWREWSktQ" },
      { q: 'Un fichero se divide en 9 particiones y hay 3 executors. ¿Cómo se reparte?', o: ["Cada executor procesa unas 3 particiones a la vez que los demás","Un executor procesa las 9","Se descartan 6"], x: "GEcFSxdTQE0QRhcQegwWRAxVBg8aAQtfQRYXFwULTAkNAVUBQxJGAhcFBUgPA1RVB0xWV0MQCgYNEx4AFgFeUxYQEBdJXQIeGxwHRF1YBhZEGUIRTB0aCklTRU1HGQ==" }
    ],
    setup: function (ctx) {
      s1 = { ex: [] };
      const g = ctx.el('div', 'net', null);
      s1.dr = node(ctx, g, 'Driver', 'tu programa'); s1.cl = node(ctx, g, 'Executors', 'trabajadores del clúster'); s1.out = node(ctx, g, 'Resultado', 'tabla final');
      s1.drT = ctx.el('div', 'vm', s1.dr, '<span>driver</span><small>planifica</small>');
      for (let i = 0; i < 3; i++) s1.ex.push({ vm: ctx.el('div', 'vm', s1.cl, '<span>executor-' + (i + 1) + '</span><small>libre</small>'), q: ctx.el('div', 'mq', s1.cl) });
      s1.outT = ctx.el('div', 'vm', s1.out, '<span>sum por región</span><small>vacío</small>');
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'particiones procesadas', '0 / 9'); s1.b = stat(ctx, s1.stats, 'tareas en paralelo', '0'); s1.c = stat(ctx, s1.stats, 'tiempo (relativo)', '—');
    },
    run: async function (ctx) {
      ctx.log('El driver lee los metadatos de los datos: 9 particiones en Cloud Storage.'); await ctx.sleep(800);
      ctx.log('Crea 9 tareas (una por partición) y las reparte entre 3 executors.', 'info');
      let done = 0;
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 3; i++) { const p = r * 3 + i + 1; await S.fly(ctx, s1.drT, s1.ex[i].vm, 'p' + p, ''); ctx.el('span', '', s1.ex[i].q, 'p' + p); s1.ex[i].vm.querySelector('small').textContent = 'procesa p' + p; }
        s1.b.v.textContent = 3; await ctx.sleep(600);
        for (let i = 0; i < 3; i++) { s1.ex[i].q.firstChild && s1.ex[i].q.firstChild.classList.add('old'); done++; S.flash(s1.ex[i].vm, true); }
        s1.a.v.textContent = done + ' / 9'; await ctx.sleep(400);
        ctx.log('Ronda ' + (r + 1) + ': 3 particiones procesadas a la vez.', 'ok');
        for (let i = 0; i < 3; i++) s1.ex[i].q.innerHTML = '';
      }
      ctx.log('Cada executor devuelve sumas parciales por región; Spark las combina (shuffle) en el resultado final.');
      for (let i = 0; i < 3; i++) await S.fly(ctx, s1.ex[i].vm, s1.outT, 'parcial', 'ok');
      s1.outT.querySelector('small').textContent = '3 regiones'; s1.b.v.textContent = 0; s1.c.v.textContent = '≈ 1/3 del secuencial'; s1.c.classList.add('hi');
      ctx.log('Con 3 executors el trabajo ha tardado aproximadamente un tercio. Más executors, más particiones a la vez.', 'info');
    }
  };

  /* ---------- 2. Transformaciones y acciones ---------- */
  const SH2 =
    "df = spark.read.parquet('gs://cedi-datos/ventas/')   # no lee nada todavía\n" +
    "caras = df.filter(df.importe > 100)                  # transformación\n" +
    "por_region = caras.groupBy('region').count()         # transformación\n" +
    "por_region.show()                                    # ACCIÓN: ahora se ejecuta todo";
  let s2 = null;
  const PLAN = [['read.parquet', 'transformación', 'estrecha'], ['filter(importe > 100)', 'transformación', 'estrecha'], ['groupBy(region).count()', 'transformación', 'ancha (shuffle)'], ['show()', 'ACCIÓN', 'dispara el trabajo']];
  const ex2 = {
    id: 'perezosa', label: 'Transformaciones y acciones', desc: 'Spark solo construye el plan hasta que una acción pide el resultado',
    code: SH2,
    quiz: [
      { q: 'Escribes df.filter(...) y no pasa nada visible. ¿Por qué?', o: ["Ha fallado","Es una transformación: solo añade un paso al plan","Spark está apagado"], x: "GEcFSxdSQE0QRhcQegIWRB1fAgIcEwtfX1cADAsHSBBMHBoKDUJTEQAeBl4CH1VVF0gSVw0KEAhDQwkBVQFBEkYPBApJVEMfClUBR1dVFhEFBw0AGQ4bAEISWg8AAwgNFgIOVQVOUV+g1gpHDx4=" },
      { q: '¿Qué dispara de verdad la ejecución?', o: ["Una acción como show(), count() o write()","Crear la sesión","Importar la librería"], x: "GEcFSxdTQE0QRhcQegIWRAhOAAUAGwFeEkYKAQEHDRYCTwcBXkdaFwQABg0aTB8aFg1XRQxFAABeEw0dFAoNXldDAA4MThYPBrbXQxJSBkUQBkkMTAoZRF1eVw1LRhQ=" }
    ],
    setup: function (ctx) {
      s2 = { t: [] };
      PLAN.forEach(function (p) { const e = ctx.el('div', 'phase pstep', null, '<div class="phase-h"><b>' + esc(p[0]) + '</b><small>' + esc(p[1] + ' · ' + p[2]) + '</small></div><div class="wrk-row"><span class="badge">en el plan</span></div>'); s2.t.push({ box: e, b: e.querySelector('.badge') }); s2.t[s2.t.length - 1].b.textContent = 'pendiente'; });
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'pasos en el plan', '0'); s2.b = stat(ctx, s2.stats, 'datos leídos', '0 GB'); s2.c = stat(ctx, s2.stats, 'etapas (stages)', '—');
    },
    run: async function (ctx) {
      ctx.log('Ejecutamos las líneas una a una. Spark es perezoso: anota lo que le pides y espera.'); await ctx.sleep(900);
      for (let i = 0; i < 3; i++) {
        s2.t[i].box.classList.add('active'); await ctx.sleep(700); s2.t[i].box.classList.remove('active'); S.badge(s2.t[i].b, 'anotado en el plan', 'warn'); s2.a.v.textContent = i + 1;
        ctx.log('«' + PLAN[i][0] + '» es una ' + PLAN[i][1] + ': se añade al plan, pero no se lee ni se calcula nada. Datos leídos: 0 GB.', i === 2 ? 'warn' : 'dim');
        await ctx.sleep(400);
      }
      ctx.log('Ahora llega show(): es una acción y Spark necesita el resultado.', 'info'); s2.t[3].box.classList.add('active'); S.badge(s2.t[3].b, 'acción', 'warn'); await ctx.sleep(900);
      ctx.log('Spark optimiza el plan completo: aplica el filtro al leer y lee solo lo necesario.'); s2.b.v.textContent = '1,8 GB'; await ctx.sleep(800);
      ctx.log('Etapa 1: leer + filtrar (operaciones estrechas, sin mover datos entre nodos).', 'ok'); for (let i = 0; i < 2; i++) S.badge(s2.t[i].b, 'etapa 1', 'ok'); await ctx.sleep(900);
      ctx.log('Etapa 2: agrupar por región. Es una operación ancha: obliga a un shuffle (mover datos por la red).', 'warn'); S.badge(s2.t[2].b, 'etapa 2 · shuffle', 'warn'); s2.c.v.textContent = 2; await ctx.sleep(1000);
      S.badge(s2.t[2].b, 'hecho', 'ok'); S.badge(s2.t[3].b, 'hecho', 'ok'); s2.t[3].box.classList.remove('active'); s2.c.classList.add('hi');
      ctx.log('Esperar permite optimizar el conjunto: el plan se divide en etapas y solo hay shuffle donde hace falta.', 'info');
    }
  };

  /* ---------- 3. Memoria frente a disco ---------- */
  const SH3 =
    "datos = spark.read.parquet('gs://cedi-datos/puntos/').cache()   # se queda en memoria\n" +
    "for i in range(5):                                              # algoritmo iterativo\n" +
    "    modelo = entrenar(datos, modelo)\n\n" +
    "# MapReduce escribiría en disco el resultado de CADA iteración";
  let s3 = null;
  const ex3 = {
    id: 'memoria', label: 'En memoria frente a disco', desc: 'Un algoritmo iterativo con MapReduce y con Spark: tiempos de ejemplo',
    code: SH3,
    quiz: [
      { q: '¿Por qué Spark suele ser más rápido que MapReduce en algoritmos iterativos?', o: ["Mantiene los datos en memoria entre iteraciones","Tiene más discos","Usa menos datos"], x: "GEcFSxdTQE0QRhcQdQwLRApMAAQKXU0NXlkQRQAIWQwfTwYBDV5TBgtEDUgPTAscF05dFhYLBUlbBhZPDERBU0VDDBAMXwIPBhoKSEEWEAwDHEQGAhsQFw1eWRBFEAZAAgJPEQENX1MOChYATE1OEg==" },
      { q: '¿Para qué sirve cache() en Spark?', o: ["Guardar un conjunto en memoria para reutilizarlo sin releerlo","Cifrar los datos","Borrar los datos"], x: "GEcFSxdTQE0QRhcQVQIGDAwFSkwIAAVfVldDAAhJTgwCBQAKWV0WBgtEBEgOAx0cBQ1CVxEERAdCQx4KGQFIQFoMRQoADREJDBQITkdaAhcIBg0GAk8WBUlTFhYWC0cPHg==" }
    ],
    setup: function (ctx) {
      s3 = {};
      s3.rows = [['MapReduce', 'escribe y lee disco en cada iteración'], ['Spark (cache)', 'lee una vez y reutiliza memoria']].map(function (r) {
        const e = ctx.el('div', 'hrow', null, '<span class="hl">' + esc(r[0]) + '</span><div class="hbar"><i></i></div><span class="hv">0 s</span>'); e.style.gridTemplateColumns = '110px minmax(0,1fr) 70px';
        return { bar: e.querySelector('i'), v: e.querySelector('.hv') };
      });
      s3.stats = ctx.el('div', 'stats', null); s3.a = stat(ctx, s3.stats, 'iteración', '0 / 5'); s3.b = stat(ctx, s3.stats, 'veces que se vuelve a leer del disco', '—');
    },
    run: async function (ctx) {
      let mr = 0, sp = 0;
      ctx.log('Algoritmo iterativo de 5 pasadas sobre los mismos datos. Cada pasada tarda unos 20 s si hay que leer disco y unos 3 s si el dato está en memoria (cifras de ejemplo).'); await ctx.sleep(1000);
      for (let i = 1; i <= 5; i++) {
        s3.a.v.textContent = i + ' / 5'; mr += 20; sp += (i === 1 ? 20 : 3);
        s3.rows[0].bar.style.width = (mr / 100 * 100) + '%'; s3.rows[0].v.textContent = mr + ' s';
        s3.rows[1].bar.style.width = (sp / 100 * 100) + '%'; s3.rows[1].v.textContent = sp + ' s';
        ctx.log('Iteración ' + i + ': MapReduce lee y escribe disco (' + mr + ' s). Spark ' + (i === 1 ? 'lee del disco y deja los datos en memoria' : 'reutiliza la memoria') + ' (' + sp + ' s).', i === 1 ? 'info' : '');
        await ctx.sleep(800);
      }
      s3.b.v.textContent = 'MR: 5 · Spark: 1'; s3.b.classList.add('hi');
      ctx.log('Resultado: ' + mr + ' s frente a ' + sp + ' s. La ventaja crece con el número de iteraciones (aprendizaje automático, grafos).', 'ok');
      ctx.log('Contrapartida: la memoria es más cara y limitada; si los datos no caben, Spark los derrama a disco.', 'warn');
    }
  };

  /* ---------- 4. Fallo de un executor y linaje ---------- */
  const SH4 =
    "# Spark no replica las particiones en memoria: guarda la receta (linaje)\n" +
    "df.rdd.toDebugString()\n" +
    "# Si un executor cae, solo se recalculan sus particiones a partir del linaje";
  let s4 = null;
  const ex4 = {
    id: 'linaje', label: 'Un executor cae: se recalcula con el linaje', desc: 'Se pierden 3 particiones en memoria y se reconstruyen sin copias',
    code: SH4,
    quiz: [
      { q: 'Cae un executor con particiones en memoria. ¿Qué hace Spark?', o: ["Recalcula solo esas particiones a partir del linaje","Da el resultado incompleto","Reinicia todo el trabajo"], x: "GEcFSxdTQE0QRhcQZRMEFgINAAMBBgFfRFdDAAhJQQoCDh8BDUsWEQAHCEEAGQMURO6IWAoGBQRIDRgKVQhCEkYGFwAASQxATwYNQxJEBhUBHUQRTBsaAEISUw9FEBtMAQ0FGkoPTw==" },
      { q: '¿Qué es el linaje?', o: ["Un permiso","Una copia de seguridad","La secuencia de transformaciones que produjo cada partición"], x: "GEcFSxdRQE0QRhcQcw9FCABDAgYKVQFeEloCRRYMTgYYDlUASBJCEQQKGksMHgIUB0RdWAYWRBhYBkwfEBZAW0IGRRYMTgwCHAEWWFtEQxAKCA0TDR0BDU5b9dALSktQ" }
    ],
    setup: function (ctx) {
      s4 = { ex: [] };
      const g = ctx.el('div', 'net n2', null);
      s4.l = node(ctx, g, 'Linaje', 'la receta'); s4.c = node(ctx, g, 'Executors', 'memoria'); s4.r = node(ctx, g, 'Resultado', '');
      ['leer', 'filtrar', 'agrupar'].forEach(function (x, i) { ctx.el('div', 'vm', s4.l, '<span>' + (i + 1) + '. ' + x + '</span><small>paso</small>'); });
      for (let i = 0; i < 3; i++) s4.ex.push({ vm: ctx.el('div', 'vm', s4.c, '<span>executor-' + (i + 1) + '</span><small>p' + (i * 2 + 1) + ', p' + (i * 2 + 2) + '</small>') });
      s4.rT = ctx.el('div', 'vm', s4.r, '<span>resultado</span><small>en curso</small>');
      s4.stats = ctx.el('div', 'stats', null); s4.a = stat(ctx, s4.stats, 'particiones perdidas', '0'); s4.b = stat(ctx, s4.stats, 'particiones recalculadas', '0'); s4.cc = stat(ctx, s4.stats, 'trabajo repetido', '0 %');
    },
    run: async function (ctx) {
      ctx.log('6 particiones repartidas en 3 executors. El trabajo va por la mitad.'); await ctx.sleep(900);
      ctx.log('El executor-2 se cae (nodo preemptible retirado por el proveedor).', 'err'); s4.ex[1].vm.classList.add('down'); s4.ex[1].vm.querySelector('small').textContent = 'perdido'; s4.a.v.textContent = 2; await ctx.sleep(900);
      ctx.log('El driver lo detecta (sin latidos) y consulta el linaje: sabe cómo se obtuvo p3 y p4.', 'warn'); await ctx.sleep(900);
      ctx.log('No hay copias de las particiones: se repiten solo los pasos leer → filtrar → agrupar para esas dos.', 'info');
      for (const p of ['p3', 'p4']) { await S.fly(ctx, s4.l, s4.ex[0].vm, p, 'ok'); s4.b.v.textContent = (+s4.b.v.textContent) + 1; }
      s4.cc.v.textContent = '33 %'; s4.ex[0].vm.querySelector('small').textContent = 'p1, p2, p3, p4'; await ctx.sleep(700);
      s4.ex[1].vm.classList.remove('down'); s4.ex[1].vm.querySelector('small').textContent = 'reemplazado (nuevo)';
      await S.fly(ctx, s4.ex[2].vm, s4.rT, 'parcial', 'ok'); await S.fly(ctx, s4.ex[0].vm, s4.rT, 'parcial', 'ok'); s4.rT.querySelector('small').textContent = 'correcto'; S.flash(s4.rT, true);
      ctx.log('El trabajo termina con el resultado correcto: solo se repitió lo perdido (2 de 6 particiones).', 'ok');
      ctx.log('Frente a HDFS, que replica cada bloque ×3 en disco, Spark ahorra espacio y confía en poder recalcular.', 'info');
    }
  };

  C.registerConsole('spark', { lang: 'python', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
