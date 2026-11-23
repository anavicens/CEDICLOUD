/* Sección 9 · Terminal simulado (tipo Cloud Shell) con respuestas predefinidas. */
(function (C) {
  const esc = C.esc;

  C.addConcepts([
    C.concept('cloud-shell', 'Terminal en la nube (Cloud Shell)', 'nube',
      'Línea de comandos que se abre en el navegador con las herramientas de la nube ya instaladas y con tu sesión iniciada. Sirve para explorar y administrar recursos escribiendo comandos.',
      'Cloud Shell', 'AWS CloudShell', 'Azure Cloud Shell', { alias: ['terminal', 'consola de comandos', 'cli', 'gsutil', 'bq', 'gcloud', 'hadoop fs'] })
  ]);
  C.addService({
    id: 'terminal', cat: 'Herramientas', name: 'Terminal', sub: 'Cloud Shell simulado', icon: 'terminal', part: 16,
    lead: 'Un terminal tipo Cloud Shell con respuestas de ejemplo: escribe comandos o pulsa las sugerencias para explorar almacenamiento, Hadoop y consultas SQL.',
    def: 'Línea de comandos en el navegador, con la CLI de la nube ya configurada. Aquí es una simulación: los comandos conocidos devuelven respuestas de ejemplo y no tocan nada real.',
    gcp: 'Cloud Shell', aws: 'AWS CloudShell', azure: 'Azure Cloud Shell',
    sla: '—',
    concepts: ['cloud-shell'],
    planned: ['Almacenamiento: gsutil', 'Hadoop: hadoop fs', 'BigQuery: bq query', 'Libre: escribe tus comandos'],
    kw: ['terminal', 'shell', 'cloud shell', 'comandos', 'cli', 'gsutil', 'gcloud', 'bq', 'hadoop fs', 'ls', 'línea de comandos']
  });
  C.addEquivalences([{ need: 'Terminal en el navegador', gcp: 'Cloud Shell', aws: 'CloudShell', azure: 'Cloud Shell', src: 'extra' }]);

  const PROMPT = 'ana@cedi-cloud:~$ ';
  const FS = { 'datos': ['ventas_2026.csv', 'clientes.parquet', 'logs/'], 'informes': ['mensual.pdf'] };
  function t(s) { return s; }
  const RULES = [
    [/^help$/, function () { return 'Comandos de ejemplo:\n  ls · pwd · whoami\n  gsutil ls · gsutil ls gs://cedi-datos · gsutil du -s gs://cedi-datos\n  hadoop fs -ls / · hadoop fs -ls /datos · hadoop fs -du -h /datos\n  bq ls · bq query "SELECT region, SUM(importe) FROM ventas.pedidos GROUP BY region"\n  gcloud config list · gcloud compute instances list\n  clear'; }],
    [/^pwd$/, function () { return '/home/ana'; }],
    [/^whoami$/, function () { return 'ana'; }],
    [/^ls( -l)?$/, function (m) { return m[1] ? 'drwxr-xr-x 2 ana ana 4096 nov 19 10:02 datos\ndrwxr-xr-x 2 ana ana 4096 nov 19 10:02 informes\n-rw-r--r-- 1 ana ana  812 nov 19 09:40 notas.txt' : 'datos  informes  notas.txt'; }],
    [/^ls (datos|informes)\/?$/, function (m) { return FS[m[1]].join('  '); }],
    [/^gsutil ls$/, function () { return 'gs://cedi-datos/\ngs://cedi-informes/\ngs://cedi-copias/'; }],
    [/^gsutil ls gs:\/\/cedi-datos\/?$/, function () { return 'gs://cedi-datos/ventas_2026.csv\ngs://cedi-datos/clientes.parquet\ngs://cedi-datos/logs/'; }],
    [/^gsutil ls gs:\/\/cedi-informes\/?$/, function () { return 'gs://cedi-informes/mensual.pdf'; }],
    [/^gsutil du -s gs:\/\/cedi-datos\/?$/, function () { return '2147483648  gs://cedi-datos'; }],
    [/^hadoop fs -ls \/?$/, function () { return 'Found 3 items\ndrwxr-xr-x   - ana supergroup          0 2026-11-19 10:05 /datos\ndrwxr-xr-x   - ana supergroup          0 2026-11-19 10:06 /tmp\ndrwxr-xr-x   - ana supergroup          0 2026-11-19 10:07 /user'; }],
    [/^(hadoop fs|hdfs dfs) -ls \/datos\/?$/, function () { return 'Found 2 items\n-rw-r--r--   3 ana supergroup  268435456 2026-11-19 10:05 /datos/ventas_2026.csv\n-rw-r--r--   3 ana supergroup  134217728 2026-11-19 10:06 /datos/clientes.parquet'; }],
    [/^hadoop fs -du -h \/datos\/?$/, function () { return '256 M  768 M  /datos/ventas_2026.csv\n128 M  384 M  /datos/clientes.parquet'; }],
    [/^bq ls$/, function () { return '  datasetId\n -----------\n  ventas\n  clientes\n  logs'; }],
    [/^bq query\b.*group by/i, function () { return 'Waiting on bqjob_r1a2b3c_000 ... (0s) Current status: DONE\n+--------+-------------+\n| region |   total     |\n+--------+-------------+\n| Norte  |  1.204.330  |\n| Centro |    987.210  |\n| Sur    |    864.075  |\n+--------+-------------+\n(ejemplo: 3 filas · 2,1 MB procesados)'; }],
    [/^bq query\b.*count\(\*\)/i, function () { return 'Waiting on bqjob_r4d5e6f_000 ... (0s) Current status: DONE\n+---------+\n|   f0_   |\n+---------+\n| 1048576 |\n+---------+\n(ejemplo: 1 fila · 1,0 MB procesados)'; }],
    [/^bq query\b.*select/i, function () { return 'Waiting on bqjob_r7a8b9c_000 ... (0s) Current status: DONE\n+------------+--------+---------+\n| pedido_id  | region | importe |\n+------------+--------+---------+\n| 1001       | Norte  |  120,50 |\n| 1002       | Sur    |   87,00 |\n| 1003       | Centro |  310,20 |\n+------------+--------+---------+\n(ejemplo: 3 filas)'; }],
    [/^gcloud config list$/, function () { return '[core]\naccount = ana@universidad.example\nproject = curso-bigdata-2026\n[compute]\nregion = europe-southwest1'; }],
    [/^gcloud compute instances list$/, function () { return 'NAME        ZONE              MACHINE_TYPE   STATUS\nanalisis-1  europe-west1-b    e2-standard-4  RUNNING\nweb-1       europe-west1-b    e2-small       RUNNING\nweb-2       europe-west1-c    e2-small       TERMINATED'; }]
  ];
  function answer(cmd) {
    cmd = cmd.trim().replace(/\s+/g, ' ');
    if (!cmd) return null;
    for (let i = 0; i < RULES.length; i++) { const m = cmd.match(RULES[i][0]); if (m) return { ok: true, text: RULES[i][1](m) }; }
    const first = cmd.split(' ')[0];
    return { ok: false, text: first + ': comando no reconocido en este simulador. Escribe «help» para ver los disponibles.' };
  }

  function makeTerm(ctx, chips) {
    const term = ctx.el('div', 'shell', null);
    const out = ctx.el('div', 'tout', term);
    const form = ctx.el('form', '', term, '<span>' + esc(PROMPT) + '</span><input type="text" autocomplete="off" spellcheck="false" aria-label="Comando" placeholder="escribe un comando…">');
    const input = form.querySelector('input');
    const chipBox = ctx.el('div', 'tchips', null);
    function print(html) { out.insertAdjacentHTML('beforeend', html + '\n'); term.scrollTop = term.scrollHeight; }
    function exec(cmd) {
      print('<span class="p">' + esc(PROMPT) + '</span><span class="c">' + esc(cmd) + '</span>');
      if (cmd.trim() === 'clear') { out.innerHTML = ''; return; }
      const r = answer(cmd); if (!r) return;
      print(r.ok ? esc(r.text) : '<span class="e">' + esc(r.text) + '</span>');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
    chips.forEach(function (c) { const b = ctx.el('button', '', chipBox, esc(c)); b.type = 'button'; b.addEventListener('click', function () { input.value = ''; exec(c); }); });
    print('<span class="d">Terminal simulado · escribe «help» o pulsa una sugerencia. Nada de lo que ejecutes aquí es real.</span>');
    return { exec: exec, input: input, print: print };
  }
  async function typeCmd(ctx, T, cmd) {
    T.input.value = '';
    for (let i = 0; i < cmd.length; i++) { T.input.value += cmd[i]; await ctx.sleep(35); }
    await ctx.sleep(250); T.input.value = ''; T.exec(cmd); await ctx.sleep(900);
  }
  let T = null;
  function example(id, label, desc, cmds, chips, intro, outro, quiz) {
    return {
      id: id, label: label, desc: desc, quiz: quiz, code: cmds.join('\n'),
      setup: function (ctx) { T = makeTerm(ctx, chips); },
      run: async function (ctx) {
        ctx.log(intro);
        for (let i = 0; i < cmds.length; i++) { await typeCmd(ctx, T, cmds[i]); }
        ctx.log(outro, 'ok'); ctx.log('Ahora puedes escribir tus propios comandos en el terminal o pulsar las sugerencias.', 'info');
        T.input.focus && T.input.focus({ preventScroll: true });
      }
    };
  }

  const ex1 = example('gsutil', 'Almacenamiento: gsutil', 'Listar buckets, ver su contenido y su tamaño',
    ['gsutil ls', 'gsutil ls gs://cedi-datos', 'gsutil du -s gs://cedi-datos'],
    ['gsutil ls', 'gsutil ls gs://cedi-informes', 'help'],
    'Exploramos el almacenamiento de objetos desde la línea de comandos.', 'Hemos listado los buckets, su contenido y su tamaño (2 GB) sin abrir la consola gráfica.',
    [{ q: '¿Qué hace «gsutil ls»?', o: ["Lista buckets y objetos","Borra el proyecto","Crea una VM"], x: "GEcFSxdTQE0QRhcQWhBFCABeFw1UVQdCXBYWCwVJXxYYDlUDXggZTIfkzw0OGQoGEF9TFgYJRApCDRgKGw1JXRYHAEQMXgZMDQAHRldCTUcZ" }, { q: '¿Qué ventaja tiene la línea de comandos?', o: ["Es siempre más bonita","No necesita permisos","Se puede repetir y automatizar en scripts"], x: "GEcFSxdRQE0QRhcQegwWRApCDg0BEQteEkUGRQMcTBEIDhtIDUBTEwwQDENDFU8UEVldWwIRDRNMDUJNCA==" }]);
  const ex2 = example('hadoop', 'Hadoop: hadoop fs -ls', 'Ver el sistema de ficheros distribuido HDFS',
    ['hadoop fs -ls /', 'hadoop fs -ls /datos', 'hadoop fs -du -h /datos'],
    ['hadoop fs -ls /', 'hdfs dfs -ls /datos', 'hadoop fs -du -h /datos'],
    'Ahora el sistema de ficheros de un clúster Hadoop (HDFS).', 'En la segunda columna del «du» se ve el espacio real: 3 réplicas de cada fichero.',
    [{ q: '¿Qué muestra la cifra «3» en «hadoop fs -ls»?', o: ["El número de usuarios","Los discos","El factor de replicación"], x: "GEcFSxdRQE0QRhcQdQIBBUlPDwMeAAENV0UXpsVJTgwcBhQAQhJTDUVXSUMMCAAGRElbRRcMCh1CEEJNCA==" }, { q: '¿Por qué el espacio real es el triple del tamaño del fichero?', o: ["Por las 3 réplicas","Por compresión","Es un error"], x: "GEcFSxdTQE0QRhcQZAYVCABOAh5PEQUNRlkPABYIQwAFDlUFDVRXDwkLGg0CTAwaF1lTFgcARAxeEw0MHAsDEEs=" }]);
  const ex3 = example('bq', 'BigQuery: bq query', 'Lanzar una consulta SQL desde el terminal',
    ['bq ls', 'bq query "SELECT region, SUM(importe) FROM ventas.pedidos GROUP BY region"'],
    ['bq ls', 'bq query "SELECT COUNT(*) FROM ventas.pedidos"', 'bq query "SELECT * FROM ventas.pedidos LIMIT 3"'],
    'Consultamos el almacén de datos con SQL desde la línea de comandos.', 'La consulta devuelve un resumen por región y los megabytes procesados, que es lo que se factura.',
    [{ q: '¿Qué se factura al lanzar «bq query»?', o: ["El número de letras","Nada","Normalmente los datos procesados"], x: "GEcFSxdRQE0QRhcQZgwXRAxeDEwMGgpbW1MNAEQaSA8JDBYNQlxXEUUXBkEMTAMUFw1RWQ8QCQdMEEwWVRRMQEIKBg0GQwYfTxsBTldFAhcNCF5NThI=" }, { q: '¿Para qué sirve «bq ls»?', o: ["Para borrar tablas","Para crear usuarios","Para listar datasets"], x: "GEcFSxdRQE0QRhcQexYAFx1fAkwDGhcNUVkNDxEHWQwfTxEBDVZXFwoXSUkGAE8FFkJLUwARC0cPHg==" }]);
  const ex4 = example('libre', 'Libre: escribe tus comandos', 'Terminal listo para que pruebes; «help» lista los disponibles',
    ['help', 'gcloud config list'],
    ['help', 'ls', 'pwd', 'gcloud compute instances list', 'gsutil ls', 'hadoop fs -ls /', 'clear'],
    'Un terminal para explorar libremente.', 'Prueba los comandos sugeridos o escribe el que quieras; los desconocidos te lo dirán.',
    [{ q: 'Escribes un comando que el simulador no conoce. ¿Qué ocurre?', o: ["Borra algo","Lo ejecuta de verdad","Te avisa de que no lo reconoce"], x: "GEcFSxdRQE0QRhcQcxBFEQdMQx8GGBFBU1UKptcHF0MfABkLDUBTEBULB0kGTA5VB0JfVw0BCxoNBwlPEA5IX0YPCkpLUA==" }, { q: '¿Qué es Cloud Shell?', o: ["Un terminal en el navegador con la CLI ya configurada","Una región","Un tipo de disco"], x: "GEcFSxdTQE0QRhcQcxUMEAgNCgIcAQVBU0RDHEQKQg0KBhIRX1NEQwsFDUxDCQFVEFgSUxIQDRlCTU4S" }]);

  C.registerConsole('terminal', { lang: 'bash', examples: [ex1, ex3] });
})(window.CEDI);
