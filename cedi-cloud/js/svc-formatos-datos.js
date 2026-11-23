/* Sección 12 · Formatos de datos y ETL/ELT: CSV, JSON, Avro, Parquet, evolución del esquema. */
(function (C) {
  const S = C.stage, esc = C.esc;
  const nf = function (n, d) { return n.toLocaleString('es-ES', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }); };
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('formato-datos', 'Formatos de datos (CSV, JSON, Avro, Parquet)', 'datos',
      'Cómo se guardan los datos en un fichero. CSV y JSON son texto legible; Avro (por filas) y Parquet (por columnas) son binarios, llevan el esquema y comprimen mucho: ocupan menos y se leen más rápido.',
      'Parquet / Avro en Cloud Storage y BigQuery', 'Parquet / Avro en S3 con Athena y Glue', 'Parquet / Avro en ADLS con Synapse', { alias: ['csv', 'json', 'avro', 'parquet', 'orc', 'esquema', 'compresión', 'snappy'] }),
    C.concept('etl-elt', 'ETL y ELT', 'datos',
      'ETL transforma los datos antes de cargarlos en el almacén. ELT los carga primero tal cual y los transforma dentro del almacén con SQL, aprovechando su potencia; es lo habitual en la nube.',
      'Dataflow / Dataform / BigQuery', 'Glue / dbt sobre Redshift', 'Data Factory / dbt sobre Synapse', { alias: ['extract transform load', 'transformación', 'carga', 'pipeline de datos', 'dbt'] })
  ]);
  C.addService({
    id: 'formatos-datos', cat: 'Almacenamiento', name: 'Formatos y ETL', sub: 'CSV, Parquet, ETL y ELT', icon: 'layers', part: 18,
    lead: 'Compara cómo ocupan y se leen los mismos datos en CSV, JSON, Avro y Parquet, y cómo se cargan y transforman con ETL o ELT.',
    def: 'El formato de un fichero decide su tamaño, su velocidad de lectura y su coste. ETL y ELT son las dos formas de preparar los datos antes de analizarlos.',
    gcp: 'Cloud Storage + BigQuery (Parquet, Avro, ORC)', aws: 'S3 + Glue / Athena', azure: 'ADLS + Data Factory / Synapse',
    sla: '99,9 %',
    concepts: ['formato-datos', 'etl-elt', 'dag'],
    planned: ['Misma tabla en cuatro formatos', 'Leer pocas columnas', 'ETL frente a ELT', 'Evolución del esquema'],
    kw: ['csv', 'json', 'avro', 'parquet', 'orc', 'formato', 'etl', 'elt', 'esquema', 'compresión', 'columnas', 'dbt', 'glue', 'data factory']
  });
  C.addEquivalences([{ need: 'Preparación de datos (ETL/ELT)', gcp: 'Dataflow / Dataform', aws: 'Glue / dbt', azure: 'Data Factory / dbt', src: 'extra' }]);

  /* ---------- 1. Misma tabla, cuatro formatos ---------- */
  const SH1 =
    "# La misma tabla de 100 millones de filas en distintos formatos (tamaños de ejemplo)\n" +
    "gsutil du -h gs://cedi-datos/ventas.csv       # 18 GB\n" +
    "gsutil du -h gs://cedi-datos/ventas.json      # 31 GB\n" +
    "gsutil du -h gs://cedi-datos/ventas.avro      # 7 GB\n" +
    "gsutil du -h gs://cedi-datos/ventas.parquet   # 3 GB";
  const FM = [['CSV', 18, 'texto · por filas', ''], ['JSON', 31, 'texto · por filas, nombres repetidos', ''], ['Avro', 7, 'binario · por filas · esquema incluido', ''], ['Parquet', 3, 'binario · por columnas · comprimido', '']];
  let s1 = null;
  const ex1 = {
    id: 'cuatro-formatos', lang: 'bash', label: 'Misma tabla, cuatro formatos', desc: 'Tamaño de los mismos datos en CSV, JSON, Avro y Parquet (cifras de ejemplo)',
    code: SH1,
    quiz: [
      { q: '¿Por qué JSON suele ocupar más que CSV?', o: ["Repite los nombres de los campos en cada registro","Porque es binario","Porque está comprimido"], x: "GEcFSxdTQE0QRhcQcw1FLjpiLUwMFABMEkQGAg0aWREDTxkISERXQxYRGg0NAwIXFkhBFgcARApMDhwATkRIXBYgNjJJWwICTwAKTBJFDAkFSVsGFk8QCg1eV0MGBQtIAAkdFEoPTw==" },
      { q: '¿Qué formato suele ocupar menos en análisis de datos?', o: ["Parquet","JSON","CSV"], x: "GEcFSxdTQE0QRhcQZgIXFRxIF0wKBkRPW1gCFw0GAUMPABkRQFxXEUUdSU4MAR8HDUBXFg4QHUlPCgkBWURdXUQSEAFJQQwfTwMFQV1EBhZEDUhDGQEUREBbRQ4ERApCDxkCGwUNQVNDFQUbSAAJAVtGUA==" }
    ],
    setup: function (ctx) {
      s1 = { r: [] };
      FM.forEach(function (f) { const e = ctx.el('div', 'hrow', null, '<span class="hl">' + f[0] + '</span><div class="hbar"><i></i></div><span class="hv">—</span>'); e.style.gridTemplateColumns = '70px minmax(0,1fr) 70px'; s1.r.push({ bar: e.querySelector('i'), v: e.querySelector('.hv') }); });
      s1.stats = ctx.el('div', 'stats', null); s1.a = stat(ctx, s1.stats, 'formato más pequeño', '—'); s1.b = stat(ctx, s1.stats, 'ahorro frente a CSV', '—'); s1.c = stat(ctx, s1.stats, 'coste de almacenar (0,02 $/GB·mes)', '—');
    },
    run: async function (ctx) {
      ctx.log('La misma tabla de 100 millones de filas guardada en cuatro formatos. Medimos su tamaño.'); await ctx.sleep(900);
      for (let i = 0; i < FM.length; i++) {
        const f = FM[i]; s1.r[i].bar.style.width = (f[1] / 31 * 100) + '%'; s1.r[i].v.textContent = f[1] + ' GB'; if (f[0] === 'JSON') s1.r[i].bar.className = 'hot';
        ctx.log(f[0] + ': ' + f[1] + ' GB (' + f[2] + ').', f[0] === 'Parquet' ? 'ok' : ''); await ctx.sleep(900);
      }
      s1.a.v.textContent = 'Parquet'; s1.b.v.textContent = nf((1 - 3 / 18) * 100, 0) + ' %'; s1.c.v.textContent = '0,06 $ frente a 0,36 $'; s1.a.classList.add('hi');
      ctx.log('Parquet ocupa seis veces menos que CSV. Menos tamaño = menos coste de almacenamiento y menos datos que mover por la red.', 'info');
      ctx.log('Contrapartida: CSV y JSON se abren con cualquier editor; Avro y Parquet necesitan herramientas.', 'warn');
    }
  };

  /* ---------- 2. Leer pocas columnas ---------- */
  const SH2 =
    "-- Tabla de ventas: 50 columnas. Solo necesitamos 2.\n" +
    "SELECT region, SUM(importe) AS total\n" +
    "FROM `proyecto.tienda.ventas`\n" +
    "GROUP BY region;";
  let s2 = null;
  const ex2 = {
    id: 'columnas', label: 'Leer solo dos columnas', desc: 'Una consulta con 2 de 50 columnas: qué lee cada formato',
    code: SH2,
    quiz: [
      { q: 'Tu consulta usa 2 de 50 columnas. ¿Qué formato evita leer las otras 48?', o: ["Parquet (por columnas)","CSV","JSON"], x: "GEcFSxdTQE0QRhcQcw1FAgZfDg0bGkROXVoWCAoIX0MPDhEFDVFZDxAJB0xDHwpVA1hTRAcERBlCEUwcEBRMQFcHCkQQDRAJTxkBSBJFDAkLSUECTAEQB0hBVxEMBUcPHg==" },
      { q: 'En CSV, ¿qué hay que leer para sumar una sola columna?', o: ["Solo esa columna","Todas las filas completas","Nada"], x: "GEcFSxdSQE0QRhcQcw1FEQcNBQMdGAVZXRYTChZJSwoADgZEQV1FQxMFBUIRCRxVAEgSQw0ERApCDxkCGwUNV0UXpsUHDQ4JFRYITFZZEEUHBkNDAAAGRElXFg8EF0lJBgGs1BcDEEs=" }
    ],
    setup: function (ctx) {
      s2 = { g: ctx.el('div', 'g3', null) };
      s2.csv = node(ctx, s2.g, 'CSV (filas)', 'lee todo'); s2.pq = node(ctx, s2.g, 'Parquet (columnas)', 'lee 2 columnas'); s2.out = node(ctx, s2.g, 'Resultado', 'región · total');
      s2.cc = []; s2.pc = [];
      for (let i = 0; i < 10; i++) { s2.cc.push(ctx.el('div', 'vm', s2.csv, '<span>fila ' + (i + 1) + '</span><small>50 col.</small>')); }
      for (let i = 0; i < 10; i++) { const n = i === 2 ? 'región' : i === 6 ? 'importe' : 'col. ' + (i + 1); s2.pc.push(ctx.el('div', 'vm', s2.pq, '<span>' + n + '</span><small>columna</small>')); }
      s2.stats = ctx.el('div', 'stats', null); s2.a = stat(ctx, s2.stats, 'CSV lee', '—'); s2.b = stat(ctx, s2.stats, 'Parquet lee', '—'); s2.c = stat(ctx, s2.stats, 'diferencia', '—');
    },
    run: async function (ctx) {
      ctx.log('Misma consulta sobre la misma tabla (100 millones de filas, 50 columnas) guardada en CSV y en Parquet.'); await ctx.sleep(900);
      ctx.log('CSV: los datos están por filas; para leer dos columnas hay que recorrer todas las filas enteras.', 'warn');
      for (const e of s2.cc) { e.style.borderColor = '#d97706'; await ctx.sleep(120); } s2.a.v.textContent = '18 GB (100 %)'; await ctx.sleep(500);
      ctx.log('Parquet: cada columna se guarda aparte; solo se leen «región» e «importe».', 'ok');
      s2.pc.forEach(function (e, i) { if (i !== 2 && i !== 6) e.classList.add('down'); }); await ctx.sleep(500);
      for (const i of [2, 6]) { s2.pc[i].style.borderColor = '#10b981'; S.flash(s2.pc[i], true); await ctx.sleep(300); }
      s2.b.v.textContent = '≈ 0,12 GB (0,7 %)'; await S.fly(ctx, s2.pq, s2.out, 'resultado', 'ok'); s2.out.classList.add('active');
      s2.c.v.textContent = '150 veces menos'; s2.c.classList.add('hi');
      ctx.log('Mismo resultado leyendo unas 150 veces menos datos (cifras de ejemplo). En un almacén que factura por bytes leídos, es también unas 150 veces menos coste.', 'info');
    }
  };

  /* ---------- 3. ETL frente a ELT ---------- */
  const SH3 =
    "-- ELT: primero se carga el dato en bruto, luego se transforma dentro del almacén\n" +
    "bq load --source_format=PARQUET bruto.ventas gs://cedi-datos/ventas/*.parquet\n" +
    "CREATE OR REPLACE TABLE limpio.ventas AS\n" +
    "SELECT id, UPPER(region) AS region, importe FROM bruto.ventas WHERE importe IS NOT NULL;";
  let s3 = null;
  const ex3 = {
    id: 'etl-elt', label: 'ETL frente a ELT', desc: 'Dónde ocurre la transformación: antes o después de cargar',
    code: SH3,
    quiz: [
      { q: 'En ELT, ¿dónde se transforman los datos?', o: ["En el origen, antes de enviarlos","Dentro del almacén, después de cargarlos","No se transforman"], x: "GEcFSxdSQE0QRhcQcy8xRApMEQsOVRRfW1sGFwtJSA9MCxQQQhJTDUUGG1gXA08MREFdFhcXBQdeBQMdGAUNUVkNRTc4YUMIChsQX10WBwAISUwPAQ4Wp4RcGEEY" },
      { q: '¿Qué ventaja tiene ELT en la nube?', o: ["Usa menos SQL","No necesita almacenamiento","Conserva los datos originales y aprovecha la potencia del almacén"], x: "GEcFSxdRQE0QRhcQZQZFFBxIBwlPBwFdV0IKF0QGDQANAhcNTEAWDwREHV8CAhwTC19fVwAMp9pDQx8GG0RbXVoVABZJTEMJFwEWTFdEQwkLGg0HDRsaFwMQSw==" }
    ],
    setup: function (ctx) {
      s3 = {};
      const g = ctx.el('div', 'net n2', null);
      s3.o = node(ctx, g, 'Origen', 'ficheros y bases'); s3.t = node(ctx, g, 'Transformar', ''); s3.d = node(ctx, g, 'Almacén', 'BigQuery');
      s3.oT = ctx.el('div', 'vm', s3.o, '<span>datos en bruto</span><small>1 TB</small>'); s3.tT = ctx.el('div', 'vm', s3.t, '<span>servidor ETL</span><small>libre</small>');
      s3.dT = ctx.el('div', 'vm', s3.d, '<span>tablas</span><small>vacío</small>');
      s3.stats = ctx.el('div', 'stats', null); s3.a = stat(ctx, s3.stats, 'esquema', '—'); s3.b = stat(ctx, s3.stats, 'se guarda el dato original', '—'); s3.c = stat(ctx, s3.stats, 'si cambia la regla', '—');
    },
    run: async function (ctx) {
      ctx.log('ETL: Extraer → Transformar (en un servidor aparte) → Cargar en el almacén.', 'info');
      await S.fly(ctx, s3.oT, s3.tT, 'extraer', ''); s3.tT.querySelector('small').textContent = 'limpiando…'; await ctx.sleep(800);
      await S.fly(ctx, s3.tT, s3.dT, 'cargar', 'ok'); s3.dT.querySelector('span').textContent = 'tabla limpia'; s3.dT.querySelector('small').textContent = '700 GB';
      s3.a.v.textContent = 'ETL: definido antes'; s3.b.v.textContent = 'ETL: no'; s3.c.v.textContent = 'ETL: volver a extraer'; await ctx.sleep(900);
      ctx.log('El almacén solo recibe el dato ya limpio; si mañana hace falta otra columna, hay que volver al origen.', 'warn'); await ctx.sleep(1100);
      s3.tT.querySelector('small').textContent = 'libre'; s3.dT.querySelector('span').textContent = 'tablas'; s3.dT.querySelector('small').textContent = 'vacío';
      ctx.log('ELT: Extraer → Cargar tal cual → Transformar dentro del almacén con SQL.', 'info'); s3.t.querySelector('h5').firstChild.textContent = 'Transformar (en el almacén)'; s3.tT.querySelector('span').textContent = 'SQL en BigQuery';
      await S.fly(ctx, s3.oT, s3.dT, 'cargar', 'ok'); s3.dT.querySelector('span').textContent = 'bruto + limpio'; s3.dT.querySelector('small').textContent = '1 TB + 0,7 TB'; await ctx.sleep(600);
      s3.tT.querySelector('small').textContent = 'transformando…'; await S.fly(ctx, s3.dT, s3.tT, 'SQL', ''); await ctx.sleep(800); s3.tT.querySelector('small').textContent = 'listo';
      s3.a.v.textContent = 'ELT: al leer / en SQL'; s3.b.v.textContent = 'ELT: sí'; s3.c.v.textContent = 'ELT: otra consulta'; s3.c.classList.add('hi');
      ctx.log('En la nube el almacenamiento es barato y el almacén es potente: se guarda el dato original y se transforma con SQL cuando hace falta.', 'ok');
    }
  };

  /* ---------- 4. Evolución del esquema ---------- */
  const SH4 =
    "# El esquema cambia: llega una columna nueva «canal»\n" +
    "# CSV: cada fila tiene un valor más, y los lectores antiguos se desplazan\n" +
    "# Avro / Parquet: el esquema va en el fichero y la columna nueva tiene un valor por defecto";
  let s4 = null;
  const ex4 = {
    id: 'esquema', lang: 'bash', label: 'Evolución del esquema', desc: 'Llega una columna nueva: qué le pasa a un lector antiguo según el formato',
    code: SH4,
    quiz: [
      { q: 'Se añade una columna a mitad del fichero CSV. ¿Qué le pasa a un programa antiguo?', o: ["Se actualiza solo","Nada, ignora la nueva","Lee columnas desplazadas y puede dar datos erróneos"], x: "GEcFSxdRQE0QRhcQcw1FJzp7QwAOVRRCQV8ADKfaQ0MIClUHTFZXQwYLBVgOAg5VAV4SXw4VCKqAAAUbFF4NUVcOBw0IXw8NTwcLQEJTQwREBUIQTAMQB1ldRAYWRAhDFwUIAAteHBQe" },
      { q: '¿Por qué Avro y Parquet toleran mejor los cambios de esquema?', o: ["Porque son más lentos","Porque son de texto","Llevan el esquema dentro del fichero"], x: "GEcFSxdRQE0QRhcQcw9FCAxOFwMdVRdMUFNDFBGqhEMPABkRQFxXEEUMCFRDFU8FEUhWU0MXAQVBBgIOB0ROXVhDEwUFQhEJHFUUQkAWBwACDE4XA08ZBV4SRxYARA9MDxgOG0oPTw==" }
    ],
    setup: function (ctx) {
      s4 = { rows: [] };
      s4.w = ctx.el('div', 'tbl-wrap', null, '<table class="tbl mini"><thead><tr><th>Formato</th><th>Lector antiguo lee…</th><th>Resultado</th></tr></thead><tbody></tbody></table>'); s4.tb = s4.w.querySelector('tbody');
      s4.hdr = ctx.el('div', 'cli', null, '<b>Esquema</b><span>v1: id, region, importe</span><span class="ans">v2: id, region, <u>canal</u>, importe</span>');
      s4.stats = ctx.el('div', 'stats', null); s4.a = stat(ctx, s4.stats, 'lectores rotos', '0'); s4.b = stat(ctx, s4.stats, 'lectores que siguen bien', '0');
    },
    run: async function (ctx) {
      ctx.log('Los ficheros pasan de la versión 1 (id, región, importe) a la 2 (id, región, canal, importe). Un lector antiguo espera la versión 1.'); await ctx.sleep(1000);
      const rows = [['CSV', '1001, Norte, web, 120,5 → importe = «web»', 'ROTO: columnas desplazadas', 'err'], ['JSON', '{id, region, canal, importe} → ignora «canal»', 'Funciona (ignora la nueva)', 'ok'], ['Avro', 'esquema v1 + v2 dentro del fichero → resuelve las diferencias', 'Funciona', 'ok'], ['Parquet', 'lee las columnas por nombre → ignora «canal»', 'Funciona', 'ok']];
      let bad = 0, good = 0;
      for (const r of rows) {
        s4.tb.insertAdjacentHTML('beforeend', '<tr><td><b>' + r[0] + '</b></td><td>' + esc(r[1]) + '</td><td><span class="badge ' + r[3] + '">' + esc(r[2]) + '</span></td></tr>');
        if (r[3] === 'err') { bad++; ctx.log('CSV: el lector antiguo toma «web» como importe: dato incorrecto sin ningún aviso.', 'err'); } else { good++; ctx.log(r[0] + ': ' + r[2].toLowerCase() + '.', 'ok'); }
        s4.a.v.textContent = bad; s4.b.v.textContent = good; await ctx.sleep(1000);
      }
      s4.a.classList.add('hi');
      ctx.log('Moraleja: en CSV, cambiar el esquema es peligroso. Los formatos con esquema (Avro, Parquet) permiten añadir columnas con valor por defecto sin romper a nadie.', 'info');
    }
  };

  C.registerConsole('formatos-datos', { lang: 'sql', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
