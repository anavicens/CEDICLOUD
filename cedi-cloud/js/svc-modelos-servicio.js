/* Sección 7 · Modelos de servicio: IaaS, PaaS, SaaS, serverless y responsabilidad compartida. */
(function (C) {
  const S = C.stage, esc = C.esc;
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('iaas', 'IaaS (infraestructura como servicio)', 'nube',
      'El proveedor te da máquinas, red y almacenamiento virtuales. Tú instalas y mantienes el sistema operativo, el entorno de ejecución y la aplicación.',
      'Compute Engine', 'Amazon EC2', 'Azure Virtual Machines', { alias: ['infrastructure as a service', 'máquinas virtuales', 'vm'] }),
    C.concept('paas', 'PaaS (plataforma como servicio)', 'nube',
      'El proveedor gestiona también el sistema operativo y el entorno de ejecución. Tú solo despliegas tu código y tus datos.',
      'App Engine / Cloud Run', 'Elastic Beanstalk / App Runner', 'App Service', { alias: ['platform as a service', 'plataforma'] }),
    C.concept('saas', 'SaaS (software como servicio)', 'nube',
      'Usas una aplicación terminada a través de internet; el proveedor gestiona todo salvo tus datos y la configuración de acceso.',
      'Google Workspace, Looker', 'Amazon WorkDocs, QuickSight', 'Microsoft 365, Power BI', { alias: ['software as a service', 'aplicación como servicio'] }),
    C.concept('serverless', 'Serverless (funciones bajo demanda)', 'nube',
      'No gestionas servidores: subes una función y el proveedor la ejecuta cuando ocurre un evento (por ejemplo, subir un fichero), escalando solo y cobrando por ejecución.',
      'Cloud Functions / Cloud Run', 'AWS Lambda', 'Azure Functions', { alias: ['faas', 'función', 'lambda', 'evento', 'trigger'] }),
    C.concept('resp-compartida', 'Modelo de responsabilidad compartida', 'seg',
      'La seguridad se reparte: el proveedor protege la nube (centros de datos, hardware, virtualización) y tú proteges lo que pones en ella. Cuanto más gestionado el servicio, más asume el proveedor.',
      'Responsabilidad compartida en Google Cloud', 'Modelo de responsabilidad compartida de AWS', 'Responsabilidad compartida de Azure', { alias: ['shared responsibility', 'quién gestiona', 'parches'] })
  ]);
  C.addService({
    id: 'modelos-servicio', cat: 'Fundamentos', name: 'Modelos de servicio', sub: 'IaaS, PaaS, SaaS, serverless', icon: 'layers', part: 14,
    lead: 'Compara IaaS, PaaS, SaaS y serverless según quién gestiona cada capa, y prueba una función que se dispara al subir un fichero.',
    def: 'Los modelos de servicio describen cuánto gestiona el proveedor y cuánto tú: desde alquilar infraestructura (IaaS) hasta usar una aplicación terminada (SaaS) o solo funciones (serverless).',
    gcp: 'Compute Engine, App Engine, Workspace, Cloud Functions', aws: 'EC2, Elastic Beanstalk, WorkDocs, Lambda', azure: 'VMs, App Service, Microsoft 365, Functions',
    sla: '99,9 %',
    concepts: ['iaas', 'paas', 'saas', 'serverless', 'resp-compartida'],
    planned: ['Responsabilidad compartida', 'Serverless: función por subida de fichero', 'Publicar una web con cada modelo', 'Un parche de seguridad: ¿quién lo aplica?'],
    kw: ['iaas', 'paas', 'saas', 'serverless', 'lambda', 'cloud functions', 'responsabilidad compartida', 'modelos de servicio', 'función', 'evento']
  });
  C.addEquivalences([{ need: 'Funciones serverless', gcp: 'Cloud Functions', aws: 'AWS Lambda', azure: 'Azure Functions', src: 'extra' }]);

  const LAYERS = ['Aplicación', 'Datos', 'Entorno de ejecución', 'Sistema operativo', 'Virtualización', 'Servidores y red', 'Centro de datos'];
  // quién gestiona: 1 = cliente, 0 = proveedor
  const MODELS = [
    { n: 'IaaS', c: [1, 1, 1, 1, 0, 0, 0] }, { n: 'PaaS', c: [1, 1, 0, 0, 0, 0, 0] },
    { n: 'SaaS', c: [0, 1, 0, 0, 0, 0, 0] }, { n: 'Serverless', c: [1, 0, 0, 0, 0, 0, 0] }
  ];
  function matrix(ctx) {
    const w = ctx.el('div', 'tbl-wrap', null, '<table class="tbl mini resp"><thead><tr><th></th>' + MODELS.map(function (m) { return '<th>' + m.n + '</th>'; }).join('') + '</tr></thead><tbody></tbody></table>');
    const tb = w.querySelector('tbody'), rows = [];
    LAYERS.forEach(function (l, r) {
      const tr = document.createElement('tr'); tr.innerHTML = '<td class="lay">' + esc(l) + '</td>' + MODELS.map(function () { return '<td class="cell">·</td>'; }).join(''); tb.appendChild(tr); rows.push(tr);
    });
    return { w: w, rows: rows, th: w.querySelectorAll('thead th') };
  }
  function paint(m, mi) {
    m.rows.forEach(function (tr, r) { const td = tr.children[mi + 1]; const you = MODELS[mi].c[r]; td.className = 'cell ' + (you ? 'you' : 'prov'); td.textContent = you ? 'tú' : 'proveedor'; });
    m.th.forEach(function (t, i) { t.classList.toggle('sel', i === mi + 1); });
  }
  function ratio(mi) { return MODELS[mi].c.reduce(function (a, b) { return a + b; }, 0); }

  /* ---------- 1. Responsabilidad compartida ---------- */
  const SH1 =
    "# Responsabilidad compartida (de más a menos gestión por tu parte)\n" +
    "IaaS       -> gcloud compute instances create ...      # tú gestionas SO, runtime y app\n" +
    "PaaS       -> gcloud app deploy                         # tú subes código y datos\n" +
    "SaaS       -> (usas la aplicación en el navegador)     # tú gestionas datos y accesos\n" +
    "Serverless -> gcloud functions deploy ...               # tú subes una función";
  let s1 = null;
  const ex1 = {
    id: 'responsabilidad', label: 'Responsabilidad compartida', desc: 'Quién gestiona cada capa en IaaS, PaaS, SaaS y serverless',
    code: SH1,
    quiz: [
      { q: 'En IaaS, ¿quién instala los parches del sistema operativo?', o: ["El proveedor","Nadie","El cliente"], x: "GEcFSxdRQE0QRhcQcw1FLQhMMEwKGURdQFkVAAENQhFMCxREQVMWDqbFGFgKAg5VEkRAQhYECFINBgBPBg1eRlMOBEQGXQYeDgENW10WBhZEHVgaA0FXGQ==" },
      { q: 'En SaaS, ¿qué sigue siendo siempre responsabilidad del cliente?', o: ["Sus datos y los accesos de sus usuarios","El hardware","El centro de datos"], x: "GEcFSxdTQE0QRhcQdxYLFRxIQwkDVRRfXUAGAAAGX0MLCgYQRF1YBkUHCF4KTBsaAEIeFg8KF0lJAhgABkRUEkcWDKfAQ0MJAQEWTBJFCgIRDENDHwYQCkldFhcQHQZeTU4S" }
    ],
    setup: function (ctx) {
      s1 = { m: matrix(ctx) }; ctx.stage.appendChild(s1.m.w);
      s1.bar = ctx.el('div', 'rbar', null, '<i style="width:0"></i>'); s1.i = s1.bar.querySelector('i');
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'capas que gestionas tú', '—'); s1.b = stat(ctx, s1.stats, 'modelo', '—');
    },
    run: async function (ctx) {
      ctx.log('Siete capas, de la aplicación al centro de datos. Veamos quién gestiona cada una según el modelo.'); await ctx.sleep(900);
      const notes = [
        'IaaS: el proveedor pone hardware, red y virtualización. Tú gestionas SO, entorno de ejecución, datos y aplicación.',
        'PaaS: el proveedor también lleva el SO y el entorno de ejecución. Tú solo despliegas aplicación y datos.',
        'SaaS: la aplicación ya viene hecha. Tú gestionas tus datos (y quién accede).',
        'Serverless: subes solo una función; el proveedor ejecuta, escala y mantiene todo lo demás.'
      ];
      for (let i = 0; i < MODELS.length; i++) {
        paint(s1.m, i); const n = ratio(i);
        s1.i.style.width = (n / LAYERS.length * 100) + '%'; s1.a.v.textContent = n + ' de 7'; s1.b.v.textContent = MODELS[i].n;
        ctx.log(notes[i], 'info'); await ctx.sleep(1500);
      }
      s1.a.classList.add('hi');
      ctx.log('Cuanto más gestionado es el servicio, menos control tienes pero menos trabajo y menos riesgo operativo asumes.', 'ok');
    }
  };

  /* ---------- 2. Serverless: función al subir un fichero ---------- */
  const SH2 =
    "# Función que se ejecuta cuando llega un fichero al bucket\n" +
    "def procesar(evento, contexto):\n" +
    "    nombre = evento['name']\n" +
    "    print('Nuevo fichero:', nombre)\n" +
    "    # ...limpiar, validar y cargar en BigQuery...\n\n" +
    "gcloud functions deploy procesar --runtime=python312 \\\n" +
    "  --trigger-bucket=datos-entrada";
  let s2 = null;
  const FILES = ['ventas_01.csv', 'ventas_02.csv', 'ventas_03.csv', 'ventas_04.csv', 'ventas_05.csv'];
  const ex2 = {
    id: 'serverless', label: 'Serverless: función al subir un fichero', desc: 'Cada subida dispara una ejecución; sin ficheros no hay función ni coste',
    code: SH2,
    quiz: [
      { q: 'No se sube ningún fichero durante la noche. ¿Cuánto cuesta la función?', o: ["Prácticamente nada: solo se paga por ejecución","El doble","Lo mismo que de día"], x: "GEcFSxdTQE0QRhcQcw1FFwxfFQkdGQFeQRYNCkQBTBpMHBAWW1tSDBdEDEMACQERDUldFgYWFAxfAgILGl4NQV8NRQEfSA0YAAZEQ10WCwQdSUgJCQwAB0TxhQ1FCgANBQ0MARFfU1UKptcHA0ER" },
      { q: 'Llegan 5 ficheros a la vez. ¿Qué hace el proveedor?', o: ["Los pone en cola infinita","Los rechaza","Lanza varias instancias de la función en paralelo"], x: "GEcFSxdRQE0QRhcQcxAGBQVMQw0aAQtA8ZcXDAcIQAYCGxBEXldRoN8KSUgPTAG23kBXRAxFAAwNBhoKGxBCQRhBGA==" }
    ],
    setup: function (ctx) {
      s2 = {};
      const g = ctx.el('div', 'net n2', null);
      s2.bk = node(ctx, g, 'Bucket', 'datos-entrada'); s2.fn = node(ctx, g, 'Función', 'procesar'); s2.out = node(ctx, g, 'Resultado', 'tabla de ventas');
      s2.bkT = ctx.el('div', 'vm', s2.bk, '<span>vacío</span><small>0 ficheros</small>');
      s2.fnT = ctx.el('div', 'vm', s2.fn, '<span>sin instancias</span><small>0 en ejecución</small>');
      s2.outT = ctx.el('div', 'vm', s2.out, '<span>filas</span><small>0</small>');
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'ejecuciones', '0'); s2.b = stat(ctx, s2.stats, 'instancias a la vez', '0'); s2.c = stat(ctx, s2.stats, 'servidores gestionados por ti', '0');
    },
    run: async function (ctx) {
      let ex = 0, rows = 0;
      ctx.log('La función «procesar» está desplegada y asociada al bucket. Ahora mismo no hay nada ejecutándose ni encendido.'); await ctx.sleep(900);
      ctx.log('Se sube un primer fichero…'); await S.fly(ctx, s2.bk, s2.bkT, FILES[0], ''); s2.bkT.querySelector('small').textContent = '1 fichero';
      ctx.log('El bucket emite un evento «fichero creado» que dispara la función.', 'info'); await S.fly(ctx, s2.bkT, s2.fnT, 'evento', 'ok');
      s2.fnT.querySelector('span').textContent = 'ejecutando'; s2.fnT.querySelector('small').textContent = '1 en ejecución'; s2.b.v.textContent = 1; ex++; s2.a.v.textContent = ex; await ctx.sleep(700);
      await S.fly(ctx, s2.fnT, s2.outT, '+120 filas', 'ok'); rows += 120; s2.outT.querySelector('small').textContent = rows; S.flash(s2.outT, true);
      s2.fnT.querySelector('span').textContent = 'sin instancias'; s2.fnT.querySelector('small').textContent = '0 en ejecución'; s2.b.v.textContent = 0;
      ctx.log('Fichero procesado en 0,4 s; la instancia desaparece.', 'ok'); await ctx.sleep(900);
      ctx.log('Ahora llegan 4 ficheros casi a la vez.', 'warn');
      for (let i = 1; i < 5; i++) { s2.bkT.querySelector('small').textContent = (i + 1) + ' ficheros'; ex++; s2.a.v.textContent = ex; s2.b.v.textContent = i; s2.fnT.querySelector('small').textContent = i + ' en ejecución'; s2.fnT.querySelector('span').textContent = 'ejecutando'; await S.fly(ctx, s2.bkT, s2.fnT, FILES[i], 'ok'); }
      ctx.log('El proveedor lanza 4 instancias en paralelo, sin que configures nada.', 'ok'); await ctx.sleep(800);
      rows += 4 * 120; s2.outT.querySelector('small').textContent = rows; S.flash(s2.outT, true);
      s2.b.v.textContent = 0; s2.fnT.querySelector('small').textContent = '0 en ejecución'; s2.fnT.querySelector('span').textContent = 'sin instancias'; s2.b.classList.add('hi');
      ctx.log('Todo procesado: ' + rows + ' filas. Sin ficheros la función no corre y no se paga; tú no has gestionado ningún servidor.', 'info');
    }
  };

  /* ---------- 3. Publicar una web con cada modelo ---------- */
  const SH3 =
    "# Publicar una web: ¿qué haces en cada modelo?\n" +
    "IaaS:       crear VM > instalar SO y parches > instalar Python > desplegar app\n" +
    "PaaS:       gcloud app deploy\n" +
    "SaaS:       elegir una plantilla y editarla en el navegador\n" +
    "Serverless: gcloud functions deploy pagina --trigger-http";
  const TASKS3 = [
    ['IaaS', ['Crear la VM', 'Instalar y parchear el SO', 'Instalar el entorno de ejecución', 'Desplegar la aplicación', 'Configurar red y escalado']],
    ['PaaS', ['Subir el código']], ['SaaS', ['Elegir plantilla y editar contenido']], ['Serverless', ['Subir la función']]
  ];
  let s3 = null;
  const ex3 = {
    id: 'publicar-web', label: 'Publicar una web con cada modelo', desc: 'Cuántos pasos te tocan según el modelo',
    code: SH3,
    quiz: [
      { q: 'Quieres máximo control sobre el sistema operativo. ¿Qué modelo eliges?', o: ["Serverless","IaaS","SaaS"], x: "GEcFSxdSQE0QRhcQcw1FLQhMMEwKGUReW0UXAAkIDQwcCgcFWVtADEUBGg0XGRYaSA1RWQ1FCAgNDwUNEBZZU1JDTR1JSA9MGwcFT1NcDExEGFgGTAoGCw1bWxMJDQpMTU4S" },
      { q: 'Quieres publicar una página sin ocuparte de nada técnico. ¿Cuál encaja?', o: ["SaaS","IaaS","Ninguno"], x: "GEcFSxdTQE0QRhcQcw1FNwhMMEwaBgVeEloCRQUZQQoPDhYN7oFYQxwFSUUGDwcURFQSRQwJC0lKBh8bHAtDU0VDERFJTgwCGxAKRFZZTUcZ" }
    ],
    setup: function (ctx) {
      s3 = { rows: [] };
      TASKS3.forEach(function (t) {
        const c = node(ctx, ctx.stage, t[0], t[1].length + (t[1].length === 1 ? ' paso' : ' pasos') + ' para ti'); c.style.marginTop = '8px'; c.classList.add('off');
        const row = { c: c, items: t[1].map(function (x) { return ctx.el('div', 'vm', c, '<span>' + esc(x) + '</span><small>pendiente</small>'); }) };
        s3.rows.push(row);
      });
      s3.stats = ctx.el('div', 'stats', null); s3.a = stat(ctx, s3.stats, 'pasos hechos', '0'); s3.b = stat(ctx, s3.stats, 'control sobre el sistema', '—');
    },
    run: async function (ctx) {
      let n = 0; const ctl = ['máximo', 'medio', 'mínimo', 'solo el código'];
      ctx.log('Mismo objetivo en los cuatro modelos: tener una web publicada.'); await ctx.sleep(700);
      for (let i = 0; i < s3.rows.length; i++) {
        const r = s3.rows[i]; r.c.classList.remove('off'); r.c.classList.add('active');
        ctx.log(TASKS3[i][0] + ': ' + TASKS3[i][1].length + (TASKS3[i][1].length === 1 ? ' paso a cargo tuyo.' : ' pasos a cargo tuyo.'), 'info');
        for (let j = 0; j < r.items.length; j++) { await ctx.sleep(550); r.items[j].classList.add('sick'); r.items[j].querySelector('small').textContent = 'hecho'; r.items[j].style.borderColor = '#10b981'; n++; s3.a.v.textContent = n; }
        s3.b.v.textContent = ctl[i]; await ctx.sleep(500); r.c.classList.remove('active');
      }
      ctx.log('IaaS exige más pasos y conocimientos, a cambio de control total; SaaS y serverless te ahorran trabajo a cambio de libertad.', 'ok');
    }
  };

  /* ---------- 4. Un parche de seguridad ---------- */
  const SH4 =
    "# Se publica un fallo grave en el sistema operativo (CVE ficticio)\n" +
    "# ¿Quién aplica el parche en cada modelo?\n" +
    "sudo apt-get update && sudo apt-get upgrade -y     # IaaS: lo haces tú";
  let s4 = null;
  const ex4 = {
    id: 'parche', label: 'Un parche de seguridad: ¿quién lo aplica?', desc: 'Aparece un fallo en el sistema operativo y se ve a quién le toca',
    code: SH4,
    quiz: [
      { q: 'Sale un parche crítico del sistema operativo y usas IaaS. ¿Quién debe aplicarlo?', o: ["El proveedor","Tú","Nadie"], x: "GEcFSxdSQE0QRhcQcw9FFwBeFwkCFERCQlMRBBAAWwxMCxBEWUdFQzMpSUgQTBsARF9XRRMKChpMAQUDHABMVhhBGA==" },
      { q: '¿Y si usas PaaS?', o: ["El usuario final","Tú","El proveedor"], x: "GEcFSxdRQE0QRhcQcw1FNAhMMEwKGURdQFkVAAENQhFMCBAXWVtZDQREOmJDFU8QClldRA0KRA1IQwkFEAdYUV+g1gpHDx4=" }
    ],
    setup: function (ctx) {
      s4 = { m: matrix(ctx) }; ctx.stage.appendChild(s4.m.w);
      MODELS.forEach(function (_, i) { s4.m.rows.forEach(function (tr, r) { const td = tr.children[i + 1]; const you = MODELS[i].c[r]; td.className = 'cell ' + (you ? 'you' : 'prov'); td.textContent = you ? 'tú' : 'proveedor'; }); });
      s4.stats = ctx.el('div', 'stats', null); s4.a = stat(ctx, s4.stats, 'te toca parchear', '—'); s4.b = stat(ctx, s4.stats, 'lo hace el proveedor', '—');
    },
    run: async function (ctx) {
      ctx.log('Se anuncia una vulnerabilidad grave en el sistema operativo. Veamos a quién le toca en cada modelo.', 'warn');
      s4.m.rows[3].classList.add('hi'); await ctx.sleep(1100);
      const yours = [], theirs = [];
      for (let i = 0; i < MODELS.length; i++) {
        s4.m.th.forEach(function (t, k) { t.classList.toggle('sel', k === i + 1); });
        const mine = MODELS[i].c[3] === 1;
        if (mine) { yours.push(MODELS[i].n); ctx.log(MODELS[i].n + ': el sistema operativo es tuyo, tienes que aplicar el parche.', 'err'); S.flash(s4.m.rows[3].children[i + 1], false); }
        else { theirs.push(MODELS[i].n); ctx.log(MODELS[i].n + ': lo aplica el proveedor; tú no haces nada.', 'ok'); S.flash(s4.m.rows[3].children[i + 1], true); }
        s4.a.v.textContent = yours.join(', ') || '—'; s4.b.v.textContent = theirs.join(', ') || '—'; await ctx.sleep(900);
      }
      s4.m.th.forEach(function (t) { t.classList.remove('sel'); });
      ctx.log('Pero ojo: en PaaS, SaaS y serverless el parche del SO es del proveedor, aunque tus contraseñas, tus datos y tu código siguen siendo tu responsabilidad.', 'info');
    }
  };

  C.registerConsole('modelos-servicio', { lang: 'bash', examples: [ex1, ex2, ex4] });
})(window.CEDI);
