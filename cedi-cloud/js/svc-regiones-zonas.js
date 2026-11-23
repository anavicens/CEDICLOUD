/* Sección 1 · Regiones y zonas: dónde se despliega un servicio, una zona o varias, y qué se cae al apagar una zona. */
(function (C) {
  const S = C.stage, esc = C.esc;

  /* ---------- Alta del servicio, conceptos y equivalencias ---------- */
  C.addConcepts([
    C.concept('latencia', 'Latencia', 'nube',
      'Tiempo que tarda un mensaje en ir y volver entre el usuario y el servidor. Crece con la distancia, por eso se elige una región cercana a los usuarios.',
      'Network Intelligence Center (Performance Dashboard)', 'CloudWatch Internet Monitor', 'Network Watcher (Connection Monitor)', { alias: ['ping', 'retardo', 'rtt'] }),
    C.concept('soberania', 'Residencia de datos', 'nube',
      'Obligación o decisión de mantener los datos en un país o zona legal concreta (por ejemplo, dentro de la UE por el RGPD). Se controla eligiendo la región y limitando las permitidas.',
      'Restricción de ubicación de recursos (política de organización)', 'Control Tower: denegar regiones', 'Azure Policy: ubicaciones permitidas', { alias: ['rgpd', 'soberanía', 'data residency'] }),
    C.concept('multizona', 'Despliegue multizona', 'fiab',
      'Repartir las instancias de un servicio entre varias zonas de una misma región para que la caída de una zona no tumbe el servicio.',
      'Grupo de instancias gestionado regional', 'Auto Scaling en varias zonas de disponibilidad', 'Zonas de disponibilidad en un Virtual Machine Scale Set', { alias: ['multi-az', 'varias zonas', 'alta disponibilidad'] })
  ]);
  C.addService({
    id: 'regiones-zonas', cat: 'Infraestructura global', name: 'Regiones y zonas', sub: 'Dónde desplegar y qué resiste', icon: 'globe', part: 8,
    lead: 'La nube está repartida por el mundo en regiones, y cada región en varias zonas independientes. Aquí eliges dónde desplegar, pruebas una zona o varias y apagas una zona para ver qué sigue y qué se cae.',
    def: 'Una región es una ubicación geográfica con varios centros de datos; una zona es uno de esos centros con energía y red propias. Desplegar en varias zonas evita que un fallo local tumbe el servicio.',
    gcp: 'Regions & Zones', aws: 'Regions & Availability Zones', azure: 'Regions & Availability Zones',
    sla: '99,99 %',
    concepts: ['region', 'zona', 'latencia', 'soberania', 'multizona', 'disponibilidad', 'sla'],
    planned: ['Elegir la región de un servicio', 'Desplegar en una sola zona', 'Desplegar en varias zonas', 'Apagar una zona: qué sigue y qué se cae'],
    kw: ['región', 'zona', 'mapa', 'latencia', 'rgpd', 'alta disponibilidad', 'multizona', 'availability zone']
  });
  C.addEquivalences([{ need: 'Regiones y zonas', gcp: 'Regions & Zones', aws: 'Regions & Availability Zones', azure: 'Regions & Availability Zones', src: 'extra' }]);

  /* ---------- Utilidades ---------- */
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function zoneBox(ctx, parent, name, chips) {
    const box = ctx.el('div', 'dbn zone-live', parent, '<h5><span>' + esc(name) + '</span><span class="badge ok">activa</span></h5><small>centro de datos independiente</small><div class="recs"></div>');
    const o = { box: box, b: box.querySelector('.badge'), recs: box.querySelector('.recs'), up: true, chips: [] };
    (chips || []).forEach(function (t) { o.chips.push(ctx.el('span', 'rec', o.recs, t)); });
    return o;
  }
  function zoneDown(z, down) {
    z.up = !down;
    z.box.classList.toggle('down', down);
    S.badge(z.b, down ? 'apagada' : 'activa', down ? 'err' : 'ok');
    z.chips.forEach(function (c) { c.classList.toggle('lost', down); });
  }
  /* Una petición viaja del cliente a una zona; si la zona está apagada, rebota */
  async function request(ctx, cli, z, label, tally) {
    if (z.up) { await S.fly(ctx, cli, z.box, label, 'ok'); S.flash(z.box, true, 600); tally.ok++; }
    else { await S.fly(ctx, cli, z.box, label, 'err'); S.flash(z.box, false, 900); tally.fail++; }
    tally.render();
  }
  function tallyBar(ctx) {
    const st = ctx.el('div', 'stats', null), t = { ok: 0, fail: 0 };
    t.a = stat(ctx, st, 'peticiones atendidas', '0'); t.b = stat(ctx, st, 'peticiones fallidas', '0'); t.c = stat(ctx, st, 'capacidad disponible', '100 %');
    t.render = function () { t.a.v.textContent = t.ok; t.b.v.textContent = t.fail; t.b.classList.toggle('hi', t.fail > 0); };
    return t;
  }
  function clientBar(ctx, txt) {
    const el = ctx.el('div', 'cli', null, '<b>Usuarios</b><span>' + esc(txt) + '</span>'); return el;
  }

  /* ====================================================================
     1. Elegir la región de un servicio
     ==================================================================== */
  const LL = { madrid: [-3.7, 40.4], paris: [2.35, 48.9], frankfurt: [8.7, 50.1], londres: [-0.1, 51.5], virginia: [-77.5, 38.9], 'sao-paulo': [-46.6, -23.5], tokio: [139.7, 35.7] };
  const LAT = { madrid: 5, paris: 22, frankfurt: 32, londres: 30, virginia: 85, 'sao-paulo': 190, tokio: 230 };   // ms desde Madrid (ejemplo)
  const LEGAL = { madrid: 'UE', paris: 'UE', frankfurt: 'UE', londres: 'RU', virginia: 'fuera', 'sao-paulo': 'fuera', tokio: 'fuera' };
  /* Posición en el mapa (%): esquemática, con Europa algo separada para que las etiquetas no se pisen */
  const POS = { madrid: [41, 36], paris: [47, 25], frankfurt: [54, 18], londres: [42, 14], virginia: [15, 38], 'sao-paulo': [28, 76], tokio: [92, 36] };
  const OFF = { madrid: [10, 0], paris: [10, -4], frankfurt: [10, -4], londres: [-74, -5], virginia: [10, -4], 'sao-paulo': [10, -4], tokio: [-66, -22] };
  const LANDS = [[-100, 45, 58, 40], [-60, -15, 26, 40], [12, 50, 40, 18], [20, 5, 34, 44], [95, 45, 96, 36]];
  let chosen = null, s1 = null;
  function proj(ll) { return [(ll[0] + 110) / 260 * 100, (62 - ll[1]) / 97 * 100]; }

  const SH1 =
    "# Ver las regiones disponibles y elegir una al desplegar\n" +
    "gcloud compute regions list --filter='name~europe'\n\n" +
    "# Criterios: latencia, ley (RGPD) y precio\n" +
    "gcloud run deploy tienda --region=europe-southwest1   # Madrid\n" +
    "# Para impedir otras regiones (política de organización):\n" +
    "gcloud resource-manager org-policies set-policy limites.yaml";
  const ex1 = {
    id: 'region', label: 'Elegir la región de un servicio',
    desc: 'Tus usuarios están en Madrid: mide la latencia a cada región y comprueba la ley',
    code: SH1,
    quiz: [
      { q: '¿Por qué suele elegirse una región cercana a los usuarios?', o: ["Porque es siempre más barata","Para reducir la latencia","Para tener más zonas"], x: "GEcFSxdSQE0QRhcQegJFAABeFw0BFg1MElcWCAEHWQJMChlEWVtTDhULSUkGTAYRBQ1LFhUQAQVZAkwLEEROU1ICRRQMWQoPBrbXQxwUHg==" },
      { q: 'Si guardas datos personales de ciudadanos de la UE, ¿qué región es la opción más sencilla?', o: ["Una dentro de la UE","Cualquiera, da igual","La más lejana"], x: "GEcFSxdTQE0QRhcQYw0ERBtIBAWsxgoNVlMNERYGDQcJTxkFDWdzQwASAFkCTAwaCV1eXwAEBwBCDQkcVQBIXhYxIjQtDQADAVUITEEWFxcFB14FCR0QCk5bVxBFDQdZBh4BFAdEXVgCCQEaA0ER" }
    ],
    setup: function (ctx) {
      s1 = {};
      if (!chosen) chosen = C.state.region;
      s1.map = ctx.el('div', 'wmap', null); s1.dots = {}; s1.labs = {};
      LANDS.forEach(function (l) { const p = proj([l[0], l[1]]); const d = ctx.el('div', 'land', s1.map); d.style.cssText = 'left:' + p[0] + '%;top:' + p[1] + '%;width:' + (l[2] / 260 * 100) + '%;height:' + (l[3] / 97 * 100) + '%'; });
      C.regions.forEach(function (r) {
        const p = POS[r.id];
        const dot = ctx.el('button', 'rdot', s1.map); dot.type = 'button'; dot.title = r.city; dot.setAttribute('aria-label', 'Elegir ' + r.city);
        dot.style.left = p[0] + '%'; dot.style.top = p[1] + '%';
        const lab = ctx.el('div', 'rlab', s1.map, esc(r.city) + '<span class="zs"><i></i><i></i><i></i></span><span class="lt"></span>');
        lab.style.left = 'calc(' + p[0] + '% + ' + OFF[r.id][0] + 'px)'; lab.style.top = 'calc(' + p[1] + '% + ' + OFF[r.id][1] + 'px)';
        s1.dots[r.id] = dot; s1.labs[r.id] = lab.querySelector('.lt');
        dot.addEventListener('click', function () { pick(r.id); });
      });
      s1.user = ctx.el('div', 'udot', s1.map); s1.user.style.left = '41%'; s1.user.style.top = '52%';
      ctx.el('div', 'rlab', s1.map, 'tus usuarios (Madrid)').style.cssText = 'left:calc(41% + 10px);top:calc(52% - 6px);color:#a5b4fc';
      s1.chips = ctx.el('div', 'rchips', null); s1.cb = {};
      C.regions.forEach(function (r) {
        const b = ctx.el('button', 'rchip', s1.chips, esc(r.city) + '<small>' + esc(r.gcp) + '</small>'); b.type = 'button';
        b.addEventListener('click', function () { pick(r.id); }); s1.cb[r.id] = b;
      });
      s1.stats = ctx.el('div', 'stats', null);
      s1.r = stat(ctx, s1.stats, 'región elegida', '—'); s1.l = stat(ctx, s1.stats, 'latencia desde Madrid', '—'); s1.u = stat(ctx, s1.stats, 'ley aplicable', '—');
      pick(chosen);
    },
    run: async function (ctx) {
      const regs = C.regions;
      ctx.log('Tus usuarios están en Madrid. El servicio se desplegará en una región; lo elegimos con tres criterios: latencia, ley y precio.');
      ctx.log('Cada región (en la lista y en el mapa) tiene tres zonas, los puntitos azules junto al nombre.', 'dim');
      await ctx.sleep(900);
      ctx.log('Medimos la latencia desde Madrid a cada región (cifras de ejemplo).');
      await Promise.all(regs.map(function (r) {
        return S.fly(ctx, s1.user, s1.dots[r.id], LAT[r.id] + ' ms', '').then(function () { s1.labs[r.id].textContent = LAT[r.id] + ' ms'; s1.cb[r.id].querySelector('small').textContent = LAT[r.id] + ' ms'; });
      }));
      ctx.log('A más distancia, más latencia: Madrid 5 ms, Virginia ≈ 85 ms, São Paulo ≈ 190 ms, Tokio ≈ 230 ms.', 'info');
      await ctx.sleep(900);
      const r = regs.filter(function (x) { return x.id === chosen; })[0];
      ctx.log('Región elegida: ' + r.city + ' (' + r.gcp + ' en Google Cloud, ' + r.aws + ' en AWS, ' + r.azure + ' en Azure).');
      if (LAT[chosen] > 100) ctx.log('Latencia alta (' + LAT[chosen] + ' ms): cada petición tarda más de un décimo de segundo solo en viajar.', 'warn');
      else ctx.log('Latencia baja (' + LAT[chosen] + ' ms): buena elección para usuarios en Madrid.', 'ok');
      if (LEGAL[chosen] === 'fuera') ctx.log('Fuera de la UE: guardar datos personales de ciudadanos europeos aquí exige garantías legales adicionales (RGPD).', 'warn');
      else if (LEGAL[chosen] === 'RU') ctx.log('Reino Unido: fuera de la UE, pero con decisión de adecuación para transferir datos personales.', 'info');
      else ctx.log('Dentro de la UE: los datos personales se quedan bajo el RGPD sin pasos extra.', 'ok');
      s1.dots[chosen].classList.add('best'); S.flash(s1.cb[chosen], true);
      await ctx.sleep(700);
      ctx.log('También cuenta el precio (cambia según la región) y qué servicios hay disponibles en ella. Pulsa otra región y vuelve a lanzar para comparar.', 'dim');
    }
  };
  function pick(id) {
    chosen = id;
    C.regions.forEach(function (r) { s1.dots[r.id].classList.toggle('sel', r.id === id); s1.dots[r.id].classList.remove('best'); s1.cb[r.id].classList.toggle('sel', r.id === id); });
    const r = C.regions.filter(function (x) { return x.id === id; })[0];
    s1.r.v.textContent = r.city; s1.l.v.textContent = '≈ ' + LAT[id] + ' ms';
    s1.u.v.textContent = LEGAL[id] === 'UE' ? 'UE (RGPD)' : LEGAL[id] === 'RU' ? 'Reino Unido' : 'fuera de la UE';
    s1.l.classList.toggle('hi', LAT[id] > 100); s1.u.classList.toggle('hi', LEGAL[id] === 'fuera');
  }

  /* ====================================================================
     2. Desplegar en una sola zona
     ==================================================================== */
  const SH2 =
    "# Todo el servicio en una única zona\n" +
    "gcloud compute instances create web-1 \\\n" +
    "  --zone=europe-southwest1-a\n\n" +
    "# La zona a se queda sin energía y todo cae con ella\n" +
    "gcloud compute instances list";
  let s2 = null;
  const ex2 = {
    id: 'unazona', label: 'Desplegar en una sola zona',
    desc: 'Todo vive en la zona a: ¿qué pasa si esa zona se apaga?',
    code: SH2,
    quiz: [
      { q: 'Tu servicio está solo en la zona a y se apaga esa zona. ¿Qué ocurre?', o: ["El servicio deja de funcionar","Solo va más lento","Pasa automáticamente a la zona b"], x: "GEcFSxdTQE0QRhcQYw0ERBpCDw1PDwtDUxYGFkQcQ0Ov1RsNTl0WExAKHUJDCApVAkxeWgxfRAdCQwQODEROXUYKBEQMQ0MDGwcFAxBL" },
      { q: '¿Aunque la región tenga tres zonas, un servicio en una zona queda protegido?', o: ["Sí, la región lo protege","Solo si es gratis","No, hay que desplegarlo en varias"], x: "GEcFSxdRQE0QRhcQegIWRBNCDQ0cVQFVW0UXAApFDRMJHRpESF4WBwAXGUEKCQgAAQ1XWEMTBRtEAh9PGQVeElIGBg0NSBBMG7beAxBL" }
    ],
    setup: function (ctx) {
      s2 = {};
      s2.cli = clientBar(ctx, 'visitan la tienda web');
      const row = ctx.el('div', 'dbs', null);
      s2.z = [zoneBox(ctx, row, 'Zona a', ['VM web-1', 'Disco', 'BD']), zoneBox(ctx, row, 'Zona b', []), zoneBox(ctx, row, 'Zona c', [])];
      s2.z[1].box.querySelector('small').textContent = 'sin recursos de este servicio'; s2.z[2].box.querySelector('small').textContent = 'sin recursos de este servicio';
      s2.t = tallyBar(ctx);
    },
    run: async function (ctx) {
      const z = s2.z, t = s2.t;
      ctx.log('La región Madrid tiene tres zonas. Aquí el servicio (una máquina, su disco y su base de datos) está solo en la zona a.');
      await ctx.sleep(800);
      ctx.log('Funcionamiento normal: las peticiones llegan a la zona a.');
      for (let i = 0; i < 3; i++) await request(ctx, s2.cli, z[0], 'GET /', t);
      t.c.v.textContent = '100 %';
      await ctx.sleep(700);
      ctx.log('Fallo de energía en el centro de datos de la zona a: se apaga la zona.', 'err');
      zoneDown(z[0], true); t.c.v.textContent = '0 %'; t.c.classList.add('hi');
      await ctx.sleep(900);
      ctx.log('Los usuarios siguen pidiendo la web, pero no hay nadie que responda:', 'warn');
      for (let i = 0; i < 4; i++) await request(ctx, s2.cli, z[0], 'GET /', t);
      ctx.log('La zona b y la zona c funcionan, pero el servicio no está en ellas. La región entera está bien y aun así tu web está caída.', 'err');
      ctx.log('Una sola zona es un único punto de fallo. La disponibilidad se consigue repitiendo el servicio en otra zona (siguiente ejemplo).', 'info');
      await ctx.sleep(700);
      ctx.log('Cuando la zona vuelve, el servicio vuelve: pero entre medias hubo caída.', 'dim');
      zoneDown(z[0], false); t.c.v.textContent = '100 %'; t.c.classList.remove('hi');
    }
  };

  /* ====================================================================
     3. Desplegar en varias zonas
     ==================================================================== */
  const SH3 =
    "# El mismo servicio repartido entre las tres zonas\n" +
    "gcloud compute instance-groups managed create web \\\n" +
    "  --region=europe-southwest1 --size=3 \\\n" +
    "  --zones=europe-southwest1-a,europe-southwest1-b,europe-southwest1-c\n\n" +
    "# Se apaga la zona b: el balanceador usa las demás";
  let s3 = null;
  const ex3 = {
    id: 'variaszonas', label: 'Desplegar en varias zonas',
    desc: 'Una copia por zona detrás de un balanceador: apaga zonas y comprueba que sigue funcionando',
    code: SH3,
    quiz: [
      { q: 'Con el servicio en las tres zonas, se apaga la zona b. ¿Qué pasa?', o: ["El servicio sigue con menos capacidad","Las peticiones esperan a que vuelva b","El servicio se cae por completo"], x: "GEcFSxdTQE0QRhcQcw9FBghBAgIMEAVJXURDAQEDTEMIClUBQ0RfAhdEHV+gzQkcB0ISV0MJBUlXDAIOVQdM8ZsHBEQQDRYfDlUITEEWBwAJqowQQk0I" },
      { q: '¿Qué cambia al perder zonas aunque el servicio siga?', o: ["Se pierde la región","Nada","Queda menos capacidad"], x: "GEcFSxdRQE0QRhcQdQIBBUlXDAIOVQVdXUQXBEQKTBMNDBwATFYMQwYLBw0WAg5VF0JeV0MUEQxJAh6s2AUNR1hDEQEbTgoDTwxEXV1SEabJCA0QDRsAFkxARQZLRhQ=" }
    ],
    setup: function (ctx) {
      s3 = { rr: 0 };
      s3.cli = clientBar(ctx, 'visitan la tienda web');
      s3.lb = ctx.el('div', 'cn', null, '<h5>Balanceador regional<small>reparte entre las zonas que responden</small></h5>');
      const row = ctx.el('div', 'dbs', null);
      s3.z = [zoneBox(ctx, row, 'Zona a', ['VM web-1']), zoneBox(ctx, row, 'Zona b', ['VM web-2']), zoneBox(ctx, row, 'Zona c', ['VM web-3'])];
      s3.t = tallyBar(ctx);
      ctx.el('div', 'flow-note', null, 'Prueba tú: al terminar, haz clic en una zona para apagarla o encenderla.');
    },
    run: async function (ctx) {
      const z = s3.z, t = s3.t;
      function capacity() { const n = z.filter(function (x) { return x.up; }).length; t.c.v.textContent = nf(n / 3 * 100) + ' %'; t.c.classList.toggle('hi', n < 3); return n; }
      function nf(n) { return String(Math.round(n)); }
      async function burst(n) {
        for (let i = 0; i < n; i++) {
          const alive = z.filter(function (x) { return x.up; });
          if (!alive.length) { await S.fly(ctx, s3.cli, s3.lb, 'GET /', 'err'); t.fail++; t.render(); continue; }
          await S.fly(ctx, s3.cli, s3.lb, 'GET /', '');
          const tgt = alive[s3.rr++ % alive.length];
          await request(ctx, s3.lb, tgt, 'GET /', t);
        }
      }
      ctx.log('El servicio tiene una copia en cada zona de la región, y un balanceador por delante.');
      await ctx.sleep(700);
      ctx.log('Con todo en marcha, el balanceador reparte las peticiones por turnos.');
      await burst(3);
      await ctx.sleep(500);
      ctx.log('Se apaga la zona b.', 'err');
      zoneDown(z[1], true); capacity(); await ctx.sleep(800);
      ctx.log('El balanceador comprueba qué zonas responden y deja de enviar tráfico a la b: el servicio no se nota caído.', 'ok');
      await burst(4);
      ctx.log('Capacidad al 67 %: quedan dos zonas atendiendo lo que antes atendían tres.', 'warn');
      await ctx.sleep(700);
      ctx.log('Se apaga también la zona a.', 'err');
      zoneDown(z[0], true); capacity(); await ctx.sleep(800);
      await burst(3);
      ctx.log('Con una sola zona el servicio sigue, pero al 33 % de capacidad: si hay mucha carga puede saturarse.', 'warn');
      await ctx.sleep(700);
      ctx.log('Las zonas recuperan la energía y vuelven al reparto.', 'dim');
      zoneDown(z[0], false); zoneDown(z[1], false); capacity();
      ctx.log('Una zona es un fallo local; varias zonas dan alta disponibilidad dentro de la región. El coste: pagas más instancias.', 'info');
      z.forEach(function (zz) {
        zz.box.addEventListener('click', async function () {
          zoneDown(zz, zz.up); capacity();
          ctx.log((zz.up ? 'Enciendes' : 'Apagas') + ' ' + zz.box.querySelector('h5 span').textContent.toLowerCase() + '.', zz.up ? 'ok' : 'warn');
          try { await burst(2); } catch (e) { /* ejecución cancelada */ }
        });
      });
    }
  };

  /* ====================================================================
     4. Apagar una zona: qué sigue y qué se cae
     ==================================================================== */
  const SH4 =
    "# ¿Qué recursos dependen de una zona y cuáles de la región?\n" +
    "gcloud compute disks list         # discos zonales\n" +
    "gcloud sql instances list         # alta disponibilidad: principal + espera\n" +
    "gcloud storage buckets list --format='value(name,location)'\n\n" +
    "# Se apaga la zona a y, después, la región entera";
  const ROWS4 = [
    ['VM única (zona a)', 'cae', 'cae'],
    ['VMs en varias zonas', 'ok', 'cae'],
    ['Disco persistente zonal', 'cae', 'cae'],
    ['Base de datos con alta disponibilidad (principal + espera)', 'warn', 'cae'],
    ['Bucket regional (réplicas en varias zonas)', 'ok', 'cae'],
    ['Bucket multirregión', 'ok', 'ok'],
    ['Balanceador y DNS globales', 'ok', 'ok']
  ];
  const TXT4 = { ok: ['sigue', 'ok'], cae: ['se cae', 'err'], warn: ['conmuta (unos segundos)', 'warn'] };
  let s4 = null;
  const ex4 = {
    id: 'quesecae', label: 'Apagar una zona: qué sigue y qué se cae',
    desc: 'Primero falla una zona y luego toda la región: mira qué recursos resisten',
    code: SH4,
    quiz: [
      { q: 'Se apaga una zona. ¿Qué recurso sigue funcionando sin hacer nada más?', o: ["Un bucket regional","Un disco zonal de esa zona","Una VM única de esa zona"], x: "GEcFSxdTQE0QRhcQcw9FBQVAAg8KGwVAW1MNEQtJSQZMABcOSEZZEEUXDA0RCR8ZDU5TFgYLEBtIQxYAGwVeElIGRQgIDREJCBynnlwNQwkFSXsuTBZVAUESUgoWBwYNGQMBFAgNVlMTAAoNSA1MCxBEXkcWGQoKCANBEQ==" },
      { q: 'Se cae la región entera. ¿Qué sobrevive?', o: ["Solo los discos","Lo que está multirregión","Todo lo de la región"], x: "GEcFSxdSQE0QRhcQZQwJC0lBDEwdEBRMQEIKAQtJSA0YHRBEW1NECgQXSV8GCwYaCkhBFhAKBhtIFQUZEERMEloCRRSqhBEIBhEFDVZTQxELDUxDGQEURF9XUQqm1wcDQRE=" }
    ],
    setup: function (ctx) {
      s4 = {};
      s4.tw = ctx.el('div', 'tbl-wrap', null, '<table class="tbl mini mtx"><thead><tr><th>Recurso</th><th>Se apaga la zona a</th><th>Se apaga la región</th></tr></thead><tbody></tbody></table>');
      const tb = s4.tw.querySelector('tbody'); s4.c = [];
      ROWS4.forEach(function (r) {
        tb.insertAdjacentHTML('beforeend', '<tr><td>' + esc(r[0]) + '</td><td><span class="badge">en marcha</span></td><td><span class="badge">en marcha</span></td></tr>');
        const tr = tb.lastChild; s4.c.push([tr.children[1].firstChild, tr.children[2].firstChild]);
        s4.c[s4.c.length - 1].forEach(function (b) { S.badge(b, 'en marcha', 'ok'); });
      });
      s4.stats = ctx.el('div', 'stats', null);
      s4.a = stat(ctx, s4.stats, 'siguen tras caer la zona a', '—'); s4.b = stat(ctx, s4.stats, 'siguen tras caer la región', '—'); s4.c3 = stat(ctx, s4.stats, 'regla', 'más repartido = más resistente');
    },
    run: async function (ctx) {
      ctx.log('Siete recursos típicos de un proyecto. Veamos cuáles dependen de una zona, cuáles de la región y cuáles de ninguna.');
      await ctx.sleep(900);
      ctx.log('Se apaga la zona a.', 'err');
      let up = 0;
      for (let i = 0; i < ROWS4.length; i++) {
        const k = ROWS4[i][1]; S.badge(s4.c[i][0], TXT4[k][0], TXT4[k][1]); if (k !== 'cae') up++; await ctx.sleep(380);
      }
      s4.a.v.textContent = up + ' de ' + ROWS4.length;
      ctx.log('Se cae lo que está solo en esa zona: la VM única y el disco zonal. El balanceador sigue con las VMs de otras zonas, el bucket regional se sirve desde las demás zonas y la base de datos conmuta a su réplica en espera.', 'warn');
      await ctx.sleep(1200);
      ctx.log('Ahora se pierde toda la región (un desastre mucho menos frecuente).', 'err');
      up = 0;
      for (let i = 0; i < ROWS4.length; i++) {
        const k = ROWS4[i][2]; S.badge(s4.c[i][1], TXT4[k][0], TXT4[k][1]); if (k !== 'cae') up++; await ctx.sleep(380);
      }
      s4.b.v.textContent = up + ' de ' + ROWS4.length; s4.b.classList.add('hi');
      ctx.log('Solo sobreviven los recursos repartidos entre regiones: el bucket multirregión y los servicios globales (balanceador, DNS).', 'warn');
      ctx.log('Resumen: una zona protege de fallos de un centro de datos; varias zonas, de la caída de uno; varias regiones, de un desastre regional. Cada nivel cuesta más.', 'info');
    }
  };

  C.registerConsole('regiones-zonas', { lang: 'bash', examples: [ex1, ex4] });
})(window.CEDI);
