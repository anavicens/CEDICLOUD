/* Sección 3 · Hadoop gestionado: HDFS (bloques y réplicas), re-replicación, MapReduce y hdfs:// frente a gs://. */
(function (C) {
  const S = C.stage, esc = C.esc;

  C.addConcepts([
    C.concept('hdfs', 'HDFS', 'datos',
      'Sistema de ficheros distribuido de Hadoop: divide cada fichero en bloques grandes y guarda varias réplicas en máquinas distintas. Vive en los discos del clúster.',
      'HDFS en Dataproc', 'HDFS en EMR', 'HDFS en HDInsight', { alias: ['hadoop', 'hdfs://', 'sistema de ficheros distribuido'] }),
    C.concept('bloque', 'Bloque (128 MB)', 'datos',
      'Trozo de tamaño fijo en que HDFS divide los ficheros (128 MB por defecto). Cada bloque se replica, normalmente 3 veces, en DataNodes distintos.',
      'Bloque de HDFS en Dataproc', 'Bloque de HDFS en EMR', 'Bloque de HDFS en HDInsight', { alias: ['block', 'replicación hdfs', 'factor de replicación'] }),
    C.concept('namenode', 'NameNode y DataNode', 'datos',
      'El NameNode guarda el mapa de qué bloques tiene cada fichero y dónde; los DataNodes guardan los bloques y envían latidos. Si un DataNode deja de latir, el NameNode manda re-replicar.',
      'Nodo maestro y nodos de trabajo de Dataproc', 'Nodo principal y nodos core de EMR', 'Nodos principales y de trabajo de HDInsight', { alias: ['datanode', 'nodo maestro', 're-replicación'] }),
    C.concept('mapreduce', 'MapReduce', 'computo',
      'Modelo de programación en tres fases: map (procesar cada trozo y emitir pares clave-valor), shuffle (agrupar por clave) y reduce (combinar cada grupo).',
      'MapReduce en Dataproc', 'MapReduce en EMR', 'MapReduce en HDInsight', { alias: ['map reduce', 'wordcount', 'contar palabras'] }),
    C.concept('desacoplado', 'Cómputo y almacenamiento separados', 'datos',
      'Guardar los datos en almacenamiento de objetos (gs://, s3://, abfs://) en lugar de en HDFS permite borrar el clúster sin perder nada y pagar el cómputo solo mientras se usa.',
      'Cloud Storage (gs://) con Dataproc', 'S3 (s3://) con EMR', 'ADLS Gen2 / Blob (abfs://) con HDInsight', { alias: ['gs://', 'clúster efímero', 'hdfs vs gs'] })
  ]);
  C.addService({
    id: 'hadoop', cat: 'Analítica de datos', name: 'Hadoop gestionado', sub: 'HDFS y MapReduce', icon: 'layers', part: 10,
    lead: 'Un clúster Hadoop gestionado: HDFS reparte los ficheros en bloques con réplicas y MapReduce procesa los datos en paralelo. Aquí ves cómo se parte un fichero, qué pasa si cae un DataNode y por qué conviene guardar en gs://.',
    def: 'Clúster Hadoop/Spark gestionado por el proveedor: HDFS guarda ficheros en bloques de 128 MB con 3 réplicas y MapReduce los procesa en paralelo (map, shuffle y reduce).',
    gcp: 'Dataproc', aws: 'EMR', azure: 'HDInsight',
    sla: '99,9 %',
    concepts: ['hdfs', 'bloque', 'namenode', 'mapreduce', 'shuffle', 'desacoplado', 'replica', 'heartbeat'],
    planned: ['Subir un fichero: bloques y réplicas', 'Apagar un DataNode: re-replicación', 'MapReduce: contar palabras', 'hdfs:// frente a gs://: borrar el clúster'],
    kw: ['hadoop', 'hdfs', 'mapreduce', 'bloques', 'datanode', 'namenode', 'dataproc', 'emr', 'hdinsight', 'spark', 'wordcount']
  });

  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  /* ---------- Escena común de HDFS: un NameNode y cinco DataNodes ---------- */
  const PLACE = [[0, 1, 3], [1, 2, 4], [2, 3, 0], [3, 4, 1], [4, 0, 2]];   // bloque i → DataNodes (3 distintos)
  function hdfsScene(ctx) {
    const o = { dn: [], blocks: [] };
    o.nn = ctx.el('div', 'cn', null, '<h5><span>NameNode</span><span class="badge info">maestro</span></h5><small style="color:var(--muted);font-size:11px">mapa: qué bloques tiene el fichero y en qué DataNodes</small><div class="meta"></div>');
    o.meta = o.nn.querySelector('.meta');
    o.row = ctx.el('div', 'g5', null);
    for (let i = 0; i < 5; i++) {
      const box = ctx.el('div', 'dbn', o.row, '<h5><span>DataNode ' + (i + 1) + '</span><span class="badge ok">activo</span></h5><div class="recs"></div>');
      o.dn.push({ box: box, b: box.querySelector('.badge'), recs: box.querySelector('.recs'), up: true, has: {} });
    }
    return o;
  }
  function blockChip(ctx, dn, bi, isNew) {
    const c = ctx.el('span', 'rec b' + (bi + 1) + (isNew ? ' new' : ''), dn.recs, 'B' + (bi + 1)); dn.has[bi] = c; return c;
  }
  function metaLine(ctx, o, bi) {
    let el = o.meta.querySelector('[data-b="' + bi + '"]');
    if (!el) { el = ctx.el('span', 'rec', o.meta); el.dataset.b = bi; }
    const where = []; o.dn.forEach(function (d, i) { if (d.has[bi] && d.up) where.push('DN' + (i + 1)); });
    el.textContent = 'B' + (bi + 1) + ' → ' + where.join(' · '); el.classList.toggle('warn', where.length < 3);
    return where.length;
  }
  function fullScene(ctx, o) {   // estado final del ejemplo 1, sin animación
    for (let b = 0; b < 5; b++) { PLACE[b].forEach(function (d) { blockChip(ctx, o.dn[d], b); }); metaLine(ctx, o, b); }
  }
  function health(o) {
    let ok = 0, min = 9; for (let b = 0; b < 5; b++) { let n = 0; o.dn.forEach(function (d) { if (d.has[b] && d.up) n++; }); if (n === 3) ok++; min = Math.min(min, n); }
    return { ok: ok, min: min };
  }

  /* ====================================================================
     1. Subir un fichero: bloques y réplicas
     ==================================================================== */
  const SH1 =
    "# Subir ventas.csv (520 MB) a HDFS\n" +
    "hdfs dfs -put ventas.csv /datos/\n\n" +
    "# Ver cómo se ha partido y dónde está cada réplica\n" +
    "hdfs fsck /datos/ventas.csv -files -blocks -locations\n\n" +
    "# Factor de replicación por defecto: 3\n" +
    "hdfs dfs -stat %r /datos/ventas.csv";
  let s1 = null;
  const ex1 = {
    id: 'bloques', label: 'Subir un fichero: bloques y réplicas',
    desc: 'ventas.csv de 520 MB se parte en bloques de 128 MB con 3 réplicas en DataNodes distintos',
    code: SH1,
    quiz: [
      { q: '¿De qué tamaño es un bloque de HDFS por defecto?', o: ["128 MB","1 GB","4 KB"], x: "GEcFSxdTQE0QRhcQficjN0lYEA1PFwhCQ0MGFkQOXwICCxAXDRoHUV1EJG9KTB8UFkwSWgYAFklIDUwcEAdYV1gADAVJVEMAAxASTEAWEwoHBl5DAQoBBUlTQgwWSktQ" },
      { q: '¿Por qué se guardan 3 réplicas de cada bloque en máquinas distintas?', o: ["Para que el fichero ocupe menos","Para cifrarlo","Para no perder datos si cae una máquina"], x: "GEcFSxdRQE0QRhcQZQpFBwhIQxkBVSBMRlctCgAMAUMdGhAATFwWAAoUAEwQTAsQCA1QWgwUEQwNBgJPGhBfXUVNRxk=" }
    ],
    setup: function (ctx) {
      s1 = {};
      s1.src = ctx.el('div', 'cli', null, '<b>ventas.csv</b><span>520 MB · en tu equipo</span><span class="ans"></span>');
      s1.src.ans = s1.src.querySelector('.ans');
      s1.sc = hdfsScene(ctx);
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'bloques', '0'); s1.b = stat(ctx, s1.stats, 'réplicas por bloque', '3'); s1.c = stat(ctx, s1.stats, 'espacio ocupado', '0 MB');
    },
    run: async function (ctx) {
      const o = s1.sc;
      ctx.log('El fichero ventas.csv pesa 520 MB. HDFS no lo guarda entero: lo divide en bloques de 128 MB.');
      await ctx.sleep(800);
      s1.a.v.textContent = '5'; s1.src.ans.textContent = '4 bloques de 128 MB + 1 de 8 MB';
      ctx.log('520 MB = 4 × 128 MB + 8 MB → 5 bloques (B1…B5). El último es más pequeño.', 'ok');
      await ctx.sleep(900);
      ctx.log('El NameNode decide dónde va cada bloque: 3 réplicas en 3 DataNodes distintos.');
      let used = 0;
      for (let b = 0; b < 5; b++) {
        const d = PLACE[b], size = b < 4 ? 128 : 8;
        ctx.log('B' + (b + 1) + ' → DataNode ' + d.map(function (x) { return x + 1; }).join(', ') + (b === 0 ? ' (el cliente lo envía al primero y los DataNodes se lo pasan en cadena)' : ''), 'dim');
        await S.fly(ctx, s1.src, o.dn[d[0]].box, 'B' + (b + 1), '');
        blockChip(ctx, o.dn[d[0]], b);
        await S.fly(ctx, o.dn[d[0]].box, o.dn[d[1]].box, 'B' + (b + 1), 'ok'); blockChip(ctx, o.dn[d[1]], b);
        await S.fly(ctx, o.dn[d[1]].box, o.dn[d[2]].box, 'B' + (b + 1), 'ok'); blockChip(ctx, o.dn[d[2]], b);
        metaLine(ctx, o, b); used += size * 3; s1.c.v.textContent = used + ' MB';
      }
      S.flash(o.nn, true);
      ctx.log('El NameNode guarda el mapa (solo metadatos, ocupa muy poco). Los datos están en los DataNodes.', 'info');
      ctx.log('Espacio real: 520 MB × 3 réplicas = 1.560 MB. La seguridad cuesta espacio.', 'warn');
      ctx.log('Los bloques grandes (128 MB) permiten leer en secuencia y que el NameNode lleve pocos metadatos.', 'dim');
    }
  };

  /* ====================================================================
     2. Apagar un DataNode: re-replicación
     ==================================================================== */
  const SH2 =
    "# Se apaga el DataNode 3. Tras unos minutos sin latidos:\n" +
    "hdfs dfsadmin -report\n\n" +
    "# Bloques con menos réplicas de las deseadas\n" +
    "hdfs fsck / -list-corruptfileblocks\n" +
    "hdfs fsck /datos/ventas.csv -blocks -locations";
  let s2 = null;
  const ex2 = {
    id: 'rereplicacion', label: 'Apagar un DataNode: re-replicación',
    desc: 'Cae el DataNode 3: el NameNode lo detecta y vuelve a crear las réplicas que faltan',
    code: SH2,
    quiz: [
      { q: 'Cae un DataNode. ¿Cómo lo detecta el NameNode?', o: ["Por el tamaño del fichero","Porque se lo dice el usuario","Porque dejan de llegar sus latidos"], x: "GEcFSxdRQE0QRhcQdQIBBUlpAhgOOwtJVxYGCxKqgAJMAxQQRFZZEF5EGkRDCg4ZEExcFgcQFghDFwlPAAoNRl8GCBQGDRAJTxEFDUJZEUUJHEgRGABbRlA=" },
      { q: 'Tras la caída, ¿cuándo se pierde un bloque?', o: ["Cada vez que cae un nodo","Si caen todas sus réplicas antes de re-replicar","Nunca"], x: "GEcFSxdSQE0QRhcQdQwLRFoNEa/GBQhEUVcQSUQBTBpMHgABDUJTEQEBGw0PDRxVEF9XRUMECh1IEEwLEERcR1NDFgFJXwZBHRAUQVtHFgBKS1A=" }
    ],
    setup: function (ctx) {
      s2 = {}; s2.sc = hdfsScene(ctx); fullScene(ctx, s2.sc);
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'bloques con 3 réplicas', '5 de 5'); s2.b = stat(ctx, s2.stats, 'mínimo de réplicas', '3'); s2.c = stat(ctx, s2.stats, 'datos perdidos', '0');
    },
    run: async function (ctx) {
      const o = s2.sc;
      function refresh() { const h = health(o); s2.a.v.textContent = h.ok + ' de 5'; s2.b.v.textContent = h.min; s2.a.classList.toggle('hi', h.ok < 5); s2.b.classList.toggle('hi', h.min < 3); }
      ctx.log('Estado inicial: cada bloque tiene 3 réplicas repartidas por los 5 DataNodes.');
      ctx.log('Los DataNodes envían latidos (heartbeats) al NameNode cada pocos segundos.', 'dim');
      await Promise.all(o.dn.map(function (d) { return S.fly(ctx, d.box, o.nn, 'latido', 'ok'); }));
      await ctx.sleep(500);
      ctx.log('Se apaga el DataNode 3 (fallo de disco o de la máquina).', 'err');
      const dead = o.dn[2]; dead.up = false; dead.box.classList.add('down'); S.badge(dead.b, 'caído', 'err');
      Object.keys(dead.has).forEach(function (k) { dead.has[k].classList.add('lost'); });
      await ctx.sleep(1000);
      ctx.log('El NameNode deja de recibir sus latidos. Tras el tiempo de espera (≈ 10 minutos por defecto) lo da por muerto.', 'warn');
      for (let b = 0; b < 5; b++) metaLine(ctx, o, b);
      refresh();
      ctx.log('Los bloques B2, B3 y B5 se quedan con 2 réplicas: están «sub-replicados». Los datos siguen disponibles, pero con menos margen.', 'warn');
      await ctx.sleep(1100);
      ctx.log('El NameNode ordena re-replicar: copiar cada bloque desde una réplica viva a un DataNode que no lo tenga.');

      const todo = [{ b: 1, from: 1, to: 0 }, { b: 2, from: 3, to: 1 }, { b: 4, from: 4, to: 3 }];
      for (let i = 0; i < todo.length; i++) {
        const t = todo[i];
        ctx.log('B' + (t.b + 1) + ': DataNode ' + (t.from + 1) + ' → DataNode ' + (t.to + 1), 'dim');
        await S.fly(ctx, o.dn[t.from].box, o.dn[t.to].box, 'B' + (t.b + 1), 'ok');
        blockChip(ctx, o.dn[t.to], t.b, true); metaLine(ctx, o, t.b); refresh();
      }
      S.flash(o.nn, true);
      Object.keys(dead.has).forEach(function (k) { dead.has[k].remove(); }); dead.has = {};
      refresh();
      ctx.log('Todos los bloques vuelven a tener 3 réplicas, sin intervención humana y sin perder datos.', 'ok');
      ctx.log('Si el DataNode 3 volviera, sus bloques sobrantes se borrarían. Solo se perdería un bloque si caen sus 3 réplicas antes de re-replicar.', 'info');
    }
  };

  /* ====================================================================
     3. MapReduce: contar palabras
     ==================================================================== */
  const PY3 =
    "# Contar palabras con MapReduce\n" +
    "def map(linea):\n" +
    "    for palabra in linea.split():\n" +
    "        emitir(palabra, 1)          # (palabra, 1)\n\n" +
    "# Entre map y reduce: shuffle, agrupa por palabra\n\n" +
    "def reduce(palabra, unos):\n" +
    "    emitir(palabra, sum(unos))      # suma de los 1";
  const LINES3 = ['el gato come pescado', 'el perro come carne', 'el gato duerme'];
  const RED3 = { el: 0, pescado: 0, duerme: 0, gato: 1, perro: 1, come: 2, carne: 2 };   // reducer destino de cada palabra
  const REDK = ['kM', 'kS', 'kB'];
  let s3 = null;
  const ex3 = {
    id: 'mapreduce', label: 'MapReduce: contar palabras', lang: 'python',
    desc: 'Tres líneas de texto: map emite (palabra, 1), el shuffle las agrupa y reduce las suma',
    code: PY3,
    quiz: [
      { q: '¿Qué hace la fase shuffle?', o: ["Suma todos los datos en un único nodo","Lee el fichero de HDFS","Agrupa los pares por clave y los envía al reducer correspondiente"], x: "GEcFSxdRQE0QRhcQcw9FFwFYBQoDEERfV0YCFxAMDQ8DHFUUTEBTEEUUCF8CTB4AAQ1GWQcKF0lBDB9PEQENXldDCA0aQAJMHxQITFBEAkUIBUgEGQobRExeFg4MFwRCQx4KERFOV0RNRxk=" },
      { q: 'En el wordcount, ¿qué emite cada mapper?', o: ["La línea entera","El total final","Un par (palabra, 1) por cada palabra"], x: "GEcFSxdRQE0QRhcQcw9FCQhdQwIAVRdYX1dYRQEERBcJTwAKDQMWEwoWSU4CCA5VBV1TRAoGDaqeDUwWVQhMEkUWCAVJXgZMBxQHSBJTDUUWDEkWDwpbRlA=" }
    ],
    setup: function (ctx) {
      s3 = { m: [], r: [] };
      ctx.el('div', 'flow-note', null, 'MAP · cada mapper procesa un bloque del fichero');
      LINES3.forEach(function (l, i) {
        const b = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Mapper ' + (i + 1) + '</b><small>«' + esc(l) + '»</small></div><div class="chips"></div>');
        s3.m.push({ box: b, chips: b.querySelector('.chips') });
      });
      ctx.el('div', 'flow-note', null, 'REDUCE · cada reducer recibe todas las apariciones de sus palabras');
      for (let i = 0; i < 3; i++) {
        const b = ctx.el('div', 'phase', null, '<div class="phase-h"><b>Reducer ' + (i + 1) + '</b><small>sin datos</small></div><div class="chips"></div>');
        s3.r.push({ box: b, chips: b.querySelector('.chips'), sub: b.querySelector('small') });
      }
    },
    run: async function (ctx) {
      ctx.log('El texto está repartido en 3 bloques; cada bloque lo procesa un mapper (en el nodo donde está el dato).');
      await ctx.sleep(800);
      ctx.log('Fase MAP: cada mapper recorre sus palabras y emite el par (palabra, 1).');
      const emitted = [];
      for (let i = 0; i < 3; i++) {
        s3.m[i].box.classList.add('active');
        LINES3[i].split(' ').forEach(function (w) { const c = ctx.el('span', 'kc kP', s3.m[i].chips, w + ',1'); emitted.push({ w: w, el: c }); });
        await ctx.sleep(500); s3.m[i].box.classList.remove('active');
      }
      ctx.log('11 pares en total. Todavía no se ha sumado nada: «el» aparece en los tres mappers.', 'dim');
      await ctx.sleep(800);
      ctx.log('Fase SHUFFLE: cada par viaja al reducer que se encarga de esa palabra (hash de la palabra).');
      const store = [{}, {}, {}];
      for (let i = 0; i < emitted.length; i += 4) {
        const batch = emitted.slice(i, i + 4);
        await Promise.all(batch.map(function (e) {
          const r = RED3[e.w];
          return S.fly(ctx, e.el, s3.r[r].box, e.w + ',1', REDK[r]).then(function () {
            e.el.classList.add('fade'); ctx.el('span', 'kc ' + REDK[r], s3.r[r].chips, e.w + ',1');
            store[r][e.w] = (store[r][e.w] || 0) + 1;
          });
        }));
      }
      ctx.log('Todos los (el,1) están ahora en el mismo reducer; igual con gato, come…', 'ok');
      ctx.log('El shuffle es la fase más cara: mueve datos por la red entre nodos.', 'warn');
      await ctx.sleep(900);
      ctx.log('Fase REDUCE: cada reducer suma los 1 de cada palabra.');
      for (let r = 0; r < 3; r++) {
        s3.r[r].box.classList.add('active'); await ctx.sleep(500);
        s3.r[r].chips.innerHTML = '';
        Object.keys(store[r]).forEach(function (w) { ctx.el('span', 'kc ' + REDK[r] + ' total', s3.r[r].chips, w + ' = ' + store[r][w]); });
        s3.r[r].sub.textContent = 'resultado'; s3.r[r].box.classList.remove('active'); S.flash(s3.r[r].box, true);
      }
      ctx.log('Resultado: el = 3, gato = 2, come = 2, pescado = 1, perro = 1, carne = 1, duerme = 1.', 'ok');
      ctx.log('El mismo patrón sirve para sumar ventas por ciudad: solo cambia qué emite el map. Spark mantiene la idea pero en memoria, más rápido.', 'info');
    }
  };

  /* ====================================================================
     4. hdfs:// frente a gs://: borrar el clúster
     ==================================================================== */
  const SH4 =
    "# El trabajo guarda el resultado en dos sitios\n" +
    "hadoop fs -put resultado.csv hdfs:///salida/\n" +
    "hadoop fs -put resultado.csv gs://curso-datos/salida/\n\n" +
    "# Para ahorrar, se borra el clúster\n" +
    "gcloud dataproc clusters delete mi-cluster --region=europe-southwest1\n\n" +
    "# Se crea otro clúster y se mira qué queda\n" +
    "hadoop fs -ls hdfs:///salida/     # ¿?\n" +
    "hadoop fs -ls gs://curso-datos/salida/";
  let s4 = null;
  const ex4 = {
    id: 'hdfsgs', label: 'hdfs:// frente a gs://: borrar el clúster',
    desc: 'Guarda en los dos sitios, borra el clúster y comprueba qué datos se conservan',
    code: SH4,
    quiz: [
      { q: 'Borras el clúster. ¿Qué datos se conservan?', o: ["Los de gs:// (el bucket)","Ninguno","Los de hdfs://"], x: "GEcFSxdTQE0QRhcQficjN0lbChoKVQFDEloMFkQNRBAPAAZESVdaQwYIqpcQGAoHXw1XWkMHEQpGBhhPEBcNW1gHABQMQwcFChsQSBwUHg==" },
      { q: '¿Qué ventaja tiene separar almacenamiento y cómputo?', o: ["Pagar el clúster solo mientras se usa","Que HDFS sea más rápido","Que no haga falta SQL"], x: "GEcFSxdTQE0QRhcQdQwLRAVCEEwLFBBCQRYGC0QcQ0MOGhYPSEYaQwAISU4Pr9UGEEhAFhMQAQ1IQw8dEAVfQVNDFQUbTEMJA1UQX1NUAg8LSVRDDgAHFkxARQZFAAxeExms3BcDEEs=" }
    ],
    setup: function (ctx) {
      s4 = {};
      s4.two = ctx.el('div', 'two', null);
      s4.cl = ctx.el('div', 'dbn', s4.two, '<h5><span>Clúster mi-cluster</span><span class="badge ok">activo</span></h5><small>hdfs:// (discos de las máquinas)</small><div class="recs"></div>');
      s4.cb = s4.cl.querySelector('.badge'); s4.cr = s4.cl.querySelector('.recs');
      s4.bk = ctx.el('div', 'dbn', s4.two, '<h5><span>Bucket curso-datos</span><span class="badge info">independiente</span></h5><small>gs:// (almacenamiento de objetos)</small><div class="recs"></div>');
      s4.br = s4.bk.querySelector('.recs');
      s4.stats = ctx.el('div', 'stats', null);
      s4.a = stat(ctx, s4.stats, 'datos en hdfs://', '—'); s4.b = stat(ctx, s4.stats, 'datos en gs://', '—'); s4.c = stat(ctx, s4.stats, 'clúster', 'encendido');
      s4.st = [];
    },
    run: async function (ctx) {
      ctx.log('Un clúster Hadoop gestionado (Dataproc, EMR, HDInsight) tiene discos propios donde vive HDFS. Aparte existe el almacenamiento de objetos del proveedor.');
      await ctx.sleep(800);
      ctx.log('El trabajo termina y guarda ventas_resumen.csv en los dos sitios.');
      const h = ctx.el('span', 'rec', s4.cr, 'ventas_resumen.csv');
      await S.fly(ctx, s4.cl, s4.bk, 'copia', 'ok'); const g = ctx.el('span', 'rec', s4.br, 'ventas_resumen.csv');
      s4.a.v.textContent = '1 fichero'; s4.b.v.textContent = '1 fichero';
      ctx.log('Ruta hdfs:///salida/ventas_resumen.csv y ruta gs://curso-datos/salida/ventas_resumen.csv.', 'dim');
      await ctx.sleep(900);
      ctx.log('El clúster cuesta dinero cada hora encendido y ya no hace falta: se borra.', 'warn');
      s4.cl.classList.add('down'); S.badge(s4.cb, 'borrado', 'err'); s4.c.v.textContent = 'borrado'; s4.c.classList.add('hi');
      h.classList.add('lost'); await ctx.sleep(900);
      ctx.log('Los discos del clúster desaparecen con él, y con ellos HDFS.', 'err');
      s4.a.v.textContent = '0 (perdido)'; s4.a.classList.add('hi'); h.classList.add('gone');
      await ctx.sleep(900);
      ctx.log('El bucket no formaba parte del clúster, así que el fichero sigue ahí.', 'ok');
      s4.b.classList.add('ok'); S.flash(s4.bk, true);
      await ctx.sleep(900);
      ctx.log('Se crea un clúster nuevo para otro trabajo: hdfs:// está vacío, pero gs:// ofrece el dato al instante.');
      s4.cl.classList.remove('down'); S.badge(s4.cb, 'nuevo', 'ok'); s4.c.v.textContent = 'nuevo'; s4.c.classList.remove('hi'); s4.cr.innerHTML = '';
      await S.fly(ctx, s4.bk, s4.cl, 'lee gs://', 'ok'); S.flash(s4.cl, true);
      ctx.log('Regla: HDFS sirve para datos temporales entre fases del trabajo (rápido y local). Lo que importa se guarda en el bucket.', 'info');
      ctx.log('Así el cómputo y el almacenamiento se separan: clústeres efímeros que se crean, trabajan y se borran, y datos que perduran.', 'info');
    }
  };

  C.registerConsole('hadoop', { lang: 'bash', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
