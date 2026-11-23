/* Sección 8 · Ingesta y orquestación: colas de mensajes (Pub/Sub, Kafka) y flujos tipo Airflow. */
(function (C) {
  const S = C.stage, esc = C.esc;
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('cola-mensajes', 'Cola o bus de mensajes', 'analitica',
      'Servicio que recibe mensajes de quien los produce y los guarda hasta que alguien los consume. Desacopla emisores y receptores y absorbe los picos de tráfico.',
      'Pub/Sub', 'Amazon SQS / SNS / Kinesis (y Kafka gestionado en MSK)', 'Event Hubs / Service Bus', { alias: ['pubsub', 'kafka', 'mensajería', 'streaming', 'productor', 'consumidor', 'tiempo real'] }),
    C.concept('dag', 'DAG y orquestación', 'analitica',
      'Un DAG es un grafo de tareas con dependencias y sin ciclos. El orquestador lo ejecuta en orden, lanza en paralelo lo independiente y reintenta lo que falla.',
      'Cloud Composer (Apache Airflow)', 'Amazon MWAA (Airflow) / Step Functions', 'Azure Data Factory', { alias: ['airflow', 'orquestador', 'workflow', 'pipeline', 'reintento', 'dependencias'] })
  ]);
  C.addService({
    id: 'ingesta-orquestacion', cat: 'Analítica de datos', name: 'Ingesta y orquestación', sub: 'Colas y flujos tipo Airflow', icon: 'zap', part: 15,
    lead: 'Recibe datos en tiempo real a través de una cola con varios consumidores y ejecuta flujos de tareas con dependencias, paralelismo y reintentos.',
    def: 'La ingesta incorpora datos que llegan sin parar (mensajes, eventos) a través de colas; la orquestación coordina tareas con dependencias, en orden, en paralelo y con reintentos.',
    gcp: 'Pub/Sub y Cloud Composer', aws: 'SQS/Kinesis y MWAA (Airflow)', azure: 'Event Hubs y Data Factory',
    sla: '99,95 %',
    concepts: ['cola-mensajes', 'dag', 'serverless'],
    planned: ['Mensajes en una cola con consumidores', 'Un consumidor lento: la cola absorbe el pico', 'DAG con pasos en paralelo', 'Un paso falla y se reintenta'],
    kw: ['pubsub', 'kafka', 'cola', 'mensajes', 'streaming', 'tiempo real', 'ingesta', 'airflow', 'dag', 'composer', 'orquestación', 'reintento', 'event hubs']
  });
  C.addEquivalences([
    { need: 'Mensajería / ingesta en tiempo real', gcp: 'Pub/Sub', aws: 'SQS / Kinesis', azure: 'Event Hubs', src: 'extra' },
    { need: 'Orquestación (Airflow)', gcp: 'Cloud Composer', aws: 'MWAA', azure: 'Data Factory', src: 'extra' }
  ]);

  /* ---------- 1. Cola con consumidores ---------- */
  const SH1 =
    "gcloud pubsub topics create sensores\n" +
    "gcloud pubsub subscriptions create lectores --topic=sensores\n" +
    "gcloud pubsub topics publish sensores --message='{\"sensor\":\"s1\",\"temp\":21.4}'\n" +
    "gcloud pubsub subscriptions pull lectores --auto-ack --limit=5";
  let s1 = null;
  function cons(ctx, parent, name) { return ctx.el('div', 'vm', parent, '<span>' + name + '</span><small>libre</small>'); }
  const ex1 = {
    id: 'cola', label: 'Mensajes en tiempo real: cola y consumidores', desc: 'Productores publican; consumidores del mismo grupo se reparten los mensajes',
    code: SH1,
    quiz: [
      { q: '¿Qué ventaja da una cola entre quien envía y quien procesa?', o: ["Desacoplarlos: cada uno va a su ritmo","Que los datos sean más bonitos","Que no haga falta red"], x: "GEcFSxdTQE0QRhcQcw9FFBtCBxkMAQtfElgMRQEaXQYeDlUFQRJVDAsXHEAKCAAHXw1eV0MGCwVMQwsaFBZJUxYPChdJQAYCHBQOSEEWCwQXHUxDHRoQRF5XFhMXCwpIEA0BW0ZQ" },
      { q: 'Varios consumidores del mismo grupo leen la misma cola. ¿Qué pasa?', o: ["Solo lee el primero","Todos reciben todos","Se reparten los mensajes"], x: "GEcFSxdRQE0QRhcQdxCmyUleBkwKBgdMXldDAAhJXREDDBAXTF9fBgsQBhdDAazUFw1RWQ0WEQREBwMdEBcBElugxBdJQAYCHBQOSEEWEwoWSV4GCxobAEIcFB4=" }
    ],
    setup: function (ctx) {
      s1 = { c: [] };
      const g = ctx.el('div', 'net', null);
      s1.pr = node(ctx, g, 'Productores', 'sensores'); s1.q = node(ctx, g, 'Tema / cola', 'sensores'); s1.cs = node(ctx, g, 'Consumidores', 'grupo «lectores»');
      s1.prT = [ctx.el('div', 'vm', s1.pr, '<span>sensor-1</span><small>↑</small>'), ctx.el('div', 'vm', s1.pr, '<span>sensor-2</span><small>↑</small>')];
      s1.qq = ctx.el('div', 'mq', s1.q);
      ['consumidor-A', 'consumidor-B'].forEach(function (n) { s1.c.push(cons(ctx, s1.cs, n)); });
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'mensajes publicados', '0'); s1.b = stat(ctx, s1.stats, 'en cola', '0'); s1.c2 = stat(ctx, s1.stats, 'procesados', '0');
    },
    run: async function (ctx) {
      let pub = 0, inq = 0, done = 0; const chips = [];
      ctx.log('Dos sensores publican lecturas sin parar. Dos consumidores del mismo grupo las procesan.'); await ctx.sleep(800);
      function upd() { s1.a.v.textContent = pub; s1.b.v.textContent = inq; s1.c2.v.textContent = done; }
      for (let i = 0; i < 10; i++) {
        const p = s1.prT[i % 2]; pub++; inq++; await S.fly(ctx, p, s1.qq, 'm' + pub, '');
        chips.push(ctx.el('span', '', s1.qq, 'm' + pub)); upd();
        if (i % 2 === 1) {
          for (let k = 0; k < 2 && chips.length; k++) {
            const m = chips.shift(), c = s1.c[k]; await S.fly(ctx, s1.qq, c, m.textContent, 'ok'); m.remove(); inq--; done++;
            c.querySelector('small').textContent = 'procesó ' + m.textContent; c.style.borderColor = '#10b981'; upd();
          }
          if (i === 1) ctx.log('Cada mensaje lo recibe un solo consumidor del grupo: se reparten el trabajo.', 'info');
        }
      }
      ctx.log('Publicados 10, procesados ' + done + ' repartidos entre A y B. Si hicieran falta más, se añaden consumidores al grupo.', 'ok');
    }
  };

  /* ---------- 2. Consumidor lento / caído ---------- */
  const SH2 =
    "# Si el consumidor no confirma (ack) un mensaje, la cola lo reentrega\n" +
    "gcloud pubsub subscriptions create lectores --topic=sensores --ack-deadline=30\n" +
    "gcloud pubsub subscriptions describe lectores";
  let s2 = null;
  const ex2 = {
    id: 'pico-cola', label: 'Consumidor caído: la cola absorbe el pico', desc: 'Los mensajes se acumulan sin perderse y se procesan al volver',
    code: SH2,
    quiz: [
      { q: 'El consumidor se cae 5 minutos. ¿Qué ocurre con los mensajes?', o: ["Se procesan dos veces siempre","Se acumulan en la cola y se procesan al volver","Se pierden"], x: "GEcFSxdSQE0QRhcQegJFBwZBAkwdEBBEV1gGRQgGXkMBChsXTFhTEEVMAUwQGA5VF1gSRgYXDQZJDEwLEERfV0IGCwcA7tACRlUMTEFCAkUVHEhDDQMSEURXWEMJCxoNAAMBEw1fX1dNRxk=" },
      { q: 'Un mensaje se entrega pero no se confirma (ack). ¿Qué hace la cola?', o: ["Lo ignora para siempre","Lo borra","Lo vuelve a entregar"], x: "GEcFSxdRQE0QRhcQcxBFCAgNBgIbBwFKUxahzgUFDQ4JARoXDUdYAkUSDFeh11VVFEJAFgYWC0lID0wfBwtOV0UCCA0MQxcDTxEBT1cWFwoIDF8CHk8REV1eXwAEAAZeTU4S" }
    ],
    setup: function (ctx) {
      s2 = {};
      const g = ctx.el('div', 'net', null);
      s2.pr = node(ctx, g, 'Productor', 'app web'); s2.q = node(ctx, g, 'Cola', 'retiene mensajes'); s2.cs = node(ctx, g, 'Consumidor', 'procesa');
      s2.prT = ctx.el('div', 'vm', s2.pr, '<span>app</span><small>enviando</small>'); s2.qq = ctx.el('div', 'mq', s2.q); s2.cT = ctx.el('div', 'vm', s2.cs, '<span>consumidor</span><small>activo</small>');
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'en cola', '0'); s2.b = stat(ctx, s2.stats, 'procesados', '0'); s2.c = stat(ctx, s2.stats, 'perdidos', '0');
    },
    run: async function (ctx) {
      let inq = 0, done = 0; const chips = [];
      function upd() { s2.a.v.textContent = inq; s2.b.v.textContent = done; }
      async function send(n) { for (let i = 0; i < n; i++) { await S.fly(ctx, s2.prT, s2.qq, 'm', ''); chips.push(ctx.el('span', chips.length > 3 ? 'old' : '', s2.qq, 'm')); inq++; upd(); } }
      async function drain(n) { for (let i = 0; i < n && chips.length; i++) { const m = chips.shift(); await S.fly(ctx, s2.qq, s2.cT, 'ack', 'ok'); m.remove(); inq--; done++; upd(); } }
      ctx.log('Funcionamiento normal: llegan mensajes y se procesan enseguida.'); await ctx.sleep(600);
      await send(2); await drain(2);
      ctx.log('El consumidor se cae (despliegue fallido).', 'err'); s2.cT.classList.add('down'); s2.cT.querySelector('small').textContent = 'caído'; await ctx.sleep(700);
      ctx.log('El productor sigue enviando: la cola retiene los mensajes.', 'warn'); await send(7);
      ctx.log('7 mensajes esperan en la cola. Sin la cola, el productor habría fallado o los datos se habrían perdido.', 'info'); await ctx.sleep(800);
      ctx.log('El consumidor vuelve a arrancar.', 'ok'); s2.cT.classList.remove('down'); s2.cT.querySelector('small').textContent = 'activo'; await ctx.sleep(500);
      await drain(7); S.flash(s2.cT, true); s2.c.v.textContent = 0; s2.c.classList.add('ok');
      ctx.log('Todo procesado, sin pérdidas: ' + done + ' mensajes. La cola absorbió el pico y desacopló los dos lados.', 'ok');
    }
  };

  /* ---------- DAG helper ---------- */
  const TASKS = {
    ext_ventas: { n: 'extraer_ventas', col: 0 }, ext_clientes: { n: 'extraer_clientes', col: 0 },
    unir: { n: 'unir_tablas', col: 1 }, validar: { n: 'validar_calidad', col: 2 }, cargar: { n: 'cargar_bigquery', col: 2 }, informe: { n: 'enviar_informe', col: 3 }
  };
  const DEPS = { ext_ventas: [], ext_clientes: [], unir: ['ext_ventas', 'ext_clientes'], validar: ['unir'], cargar: ['unir'], informe: ['validar', 'cargar'] };
  function dagScene(ctx) {
    const d = ctx.el('div', 'dag', null), cols = [0, 1, 2, 3].map(function () { return ctx.el('div', 'col', d); }), t = {};
    Object.keys(TASKS).forEach(function (k) { t[k] = ctx.el('div', 'task', cols[TASKS[k].col], '<span>' + TASKS[k].n + '</span><small>pendiente</small>'); });
    return t;
  }
  function setT(t, k, cls, txt) { t[k].className = 'task ' + cls; t[k].querySelector('small').textContent = txt; }

  /* ---------- 3. DAG con paralelismo ---------- */
  const SH3 =
    "with DAG('ventas_diarias', schedule='@daily') as dag:\n" +
    "    ext_ventas, ext_clientes = Extraer('ventas'), Extraer('clientes')\n" +
    "    unir = Unir()\n" +
    "    validar, cargar = Validar(), CargarBQ()\n" +
    "    informe = Informe()\n" +
    "    [ext_ventas, ext_clientes] >> unir >> [validar, cargar] >> informe";
  let s3 = null;
  const ex3 = {
    id: 'dag', label: 'DAG con pasos en paralelo', desc: 'Lo independiente corre a la vez; lo dependiente espera',
    code: SH3,
    quiz: [
      { q: 'Dos tareas no dependen una de otra. ¿Cómo las ejecuta el orquestador?', o: ["Nunca","En paralelo","Una detrás de otra siempre"], x: "GEcFSxdSQE0QRhcQcw9FAxtMBQNPEQENVlMTAAoNSA0PBhQXDVtYBwwHCA0SGazcRF1HUwcARABfQw1PGQUNRFMZSUQIRQweHRQKSV0WFwwBBF0MTBsaEExeGEEY" },
      { q: '¿Por qué un DAG no puede tener ciclos?', o: ["Por el coste","Porque una tarea acabaría esperándose a sí misma","Por estética"], x: "GEcFSxdSQE0QRhcQZQoLRApEAAAABkReW1MOFRYMDQYUBgYQSBJDDUULG0kGAk8Dp4xeXwcKRA1IQwkFEAdYUV+g1gpHDx4=" }
    ],
    setup: function (ctx) {
      s3 = { t: dagScene(ctx) }; s3.stats = ctx.el('div', 'stats', null);
      s3.a = stat(ctx, s3.stats, 'tiempo en paralelo', '—'); s3.b = stat(ctx, s3.stats, 'tiempo en secuencia', '—');
    },
    run: async function (ctx) {
      const t = s3.t; ctx.log('DAG «ventas_diarias»: 6 tareas. Las dos extracciones son independientes; validar y cargar también.'); await ctx.sleep(900);
      ctx.log('Nivel 1: extraer_ventas y extraer_clientes arrancan a la vez.', 'info');
      setT(t, 'ext_ventas', 'run', 'ejecutando'); setT(t, 'ext_clientes', 'run', 'ejecutando'); await ctx.sleep(1300);
      setT(t, 'ext_ventas', 'done', 'ok · 4 min'); setT(t, 'ext_clientes', 'done', 'ok · 3 min');
      ctx.log('Ambas terminan (4 y 3 min): como corrieron juntas, se tarda 4 min y no 7.', 'ok'); await ctx.sleep(700);
      ctx.log('Nivel 2: unir_tablas espera a las dos extracciones y ahora corre.'); setT(t, 'unir', 'run', 'ejecutando'); await ctx.sleep(1100); setT(t, 'unir', 'done', 'ok · 2 min');
      ctx.log('Nivel 3: validar_calidad y cargar_bigquery solo dependen de unir_tablas: van en paralelo.', 'info');
      setT(t, 'validar', 'run', 'ejecutando'); setT(t, 'cargar', 'run', 'ejecutando'); await ctx.sleep(1300);
      setT(t, 'validar', 'done', 'ok · 1 min'); setT(t, 'cargar', 'done', 'ok · 3 min'); await ctx.sleep(600);
      ctx.log('Nivel 4: enviar_informe necesita las dos anteriores, y arranca cuando acaba la más lenta.'); setT(t, 'informe', 'run', 'ejecutando'); await ctx.sleep(900); setT(t, 'informe', 'done', 'ok · 1 min');
      s3.a.v.textContent = '10 min'; s3.b.v.textContent = '14 min'; s3.a.classList.add('hi');
      ctx.log('En paralelo: 4 + 2 + 3 + 1 = 10 min. En secuencia habrían sido 14 min.', 'ok');
    }
  };

  /* ---------- 4. Fallo y reintento ---------- */
  const SH4 =
    "default_args = {\n" +
    "    'retries': 2,                      # reintenta hasta 2 veces\n" +
    "    'retry_delay': timedelta(minutes=5)\n" +
    "}\n" +
    "# Si agota los reintentos, las tareas posteriores no se ejecutan (upstream_failed)";
  let s4 = null;
  const ex4 = {
    id: 'reintento', label: 'Un paso falla y se reintenta', desc: 'Fallo transitorio y reintento; y qué pasa si el fallo persiste',
    code: SH4,
    quiz: [
      { q: 'Una tarea falla por un corte momentáneo de red. ¿Qué conviene?', o: ["Ignorar el fallo","Borrar el DAG","Reintentar tras una espera"], x: "GEcFSxdRQE0QRhcQexYGDAZeQwoOGQhCQRYQCgpJWRENAQYNWV1ECgoXUg0PAxxVFkhbWBcACh1CEEwOABBCX/XCEQ0KQhBMAxoXDVNUEAoWC0gNQk0I" },
      { q: 'Una tarea agota sus reintentos. ¿Qué pasa con las tareas que dependen de ella?', o: ["Se ejecutan dos veces","Se ejecutan igual","No se ejecutan"], x: "GEcFSxdRQE0QRhcQcgYVAQdJBgJPEQENQUNDFwEaWA8YDhELARJXEKbJSVwWCU8GAQ1fVxEGBQcNAAMCGkRDXRYGDwEKWBcNCxQXDUsWEABECFsKHw5VFEJAFgIJARtZAkJNCA==" }
    ],
    setup: function (ctx) { s4 = { t: dagScene(ctx) }; s4.stats = ctx.el('div', 'stats', null); s4.a = stat(ctx, s4.stats, 'intentos de cargar_bigquery', '0'); s4.b = stat(ctx, s4.stats, 'estado del DAG', 'en curso'); },
    run: async function (ctx) {
      const t = s4.t; ctx.log('Mismo DAG. Esta vez cargar_bigquery va a tener un problema. Configuración: 2 reintentos.'); await ctx.sleep(800);
      setT(t, 'ext_ventas', 'run', 'ejecutando'); setT(t, 'ext_clientes', 'run', 'ejecutando'); await ctx.sleep(900);
      setT(t, 'ext_ventas', 'done', 'ok'); setT(t, 'ext_clientes', 'done', 'ok'); setT(t, 'unir', 'run', 'ejecutando'); await ctx.sleep(800); setT(t, 'unir', 'done', 'ok');
      setT(t, 'validar', 'run', 'ejecutando'); setT(t, 'cargar', 'run', 'intento 1'); s4.a.v.textContent = 1; await ctx.sleep(900);
      setT(t, 'validar', 'done', 'ok'); setT(t, 'cargar', 'fail', 'falló: timeout'); ctx.log('cargar_bigquery falla (timeout de red). validar_calidad terminó bien.', 'err'); await ctx.sleep(800);
      setT(t, 'cargar', 'retry', 'reintento en 5 min'); ctx.log('El orquestador espera 5 minutos y reintenta (1 de 2).', 'warn'); await ctx.sleep(1200);
      setT(t, 'cargar', 'run', 'intento 2'); s4.a.v.textContent = 2; await ctx.sleep(900);
      setT(t, 'cargar', 'done', 'ok · intento 2'); ctx.log('El segundo intento funciona: era un fallo transitorio, nadie ha tenido que intervenir.', 'ok'); await ctx.sleep(700);
      setT(t, 'informe', 'run', 'ejecutando'); await ctx.sleep(800); setT(t, 'informe', 'done', 'ok'); s4.b.v.textContent = 'correcto'; s4.b.classList.add('ok');
      ctx.log('El DAG termina bien. El orquestador registró el fallo en el historial para poder revisarlo.', 'info'); await ctx.sleep(1000);
      ctx.log('¿Y si el fallo fuera permanente (los datos de origen no existen)? Simulamos la siguiente ejecución…', 'warn'); await ctx.sleep(900);
      ['ext_ventas', 'ext_clientes', 'unir', 'validar', 'cargar', 'informe'].forEach(function (k) { setT(t, k, '', 'pendiente'); });
      setT(t, 'ext_ventas', 'done', 'ok'); setT(t, 'ext_clientes', 'done', 'ok'); setT(t, 'unir', 'done', 'ok'); setT(t, 'validar', 'done', 'ok'); s4.b.v.textContent = 'en curso'; s4.b.classList.remove('ok');
      for (let i = 1; i <= 3; i++) { setT(t, 'cargar', 'run', 'intento ' + i); s4.a.v.textContent = i; await ctx.sleep(700); setT(t, 'cargar', 'fail', 'falló (' + i + ')'); await ctx.sleep(500); }
      setT(t, 'informe', 'skip', 'no se ejecuta'); s4.b.v.textContent = 'fallido'; s4.b.classList.add('hi');
      ctx.log('Tras 3 intentos fallidos, cargar_bigquery queda fallida y enviar_informe no se ejecuta. Salta una alerta para que una persona lo revise.', 'err');
    }
  };

  C.registerConsole('ingesta-orquestacion', { lang: 'bash', examples: [ex1, ex2, ex3, ex4] });
})(window.CEDI);
