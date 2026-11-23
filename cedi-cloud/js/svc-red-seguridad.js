/* Sección 5 · Red y seguridad: VPC, cortafuegos, WAF y balanceador con health checks. */
(function (C) {
  const S = C.stage, esc = C.esc;
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function box(ctx, parent, title, sub) {
    const c = ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>');
    return c;
  }
  function vm(ctx, parent, name, ip) { return ctx.el('div', 'vm', parent, '<span>' + esc(name) + '</span><small>' + esc(ip) + '</small>'); }

  C.addConcepts([
    C.concept('vpc', 'VPC (red virtual privada)', 'seg',
      'Red aislada y definida por software dentro de la nube, dividida en subredes. Decides qué máquinas son accesibles desde internet y cuáles quedan solo en la red interna.',
      'VPC', 'Amazon VPC', 'Virtual Network (VNet)', { alias: ['subred', 'subnet', 'red virtual', 'ip privada'] }),
    C.concept('firewall', 'Cortafuegos (reglas de firewall)', 'seg',
      'Lista de reglas ordenadas que permiten o bloquean el tráfico según puerto, protocolo e IP de origen. Lo que no encaja en ninguna regla de permiso se rechaza.',
      'Reglas de firewall de VPC', 'Security Groups y Network ACL', 'Network Security Groups (NSG)', { alias: ['puerto', 'ingress', 'ip origen', 'security group'] }),
    C.concept('waf', 'WAF y protección DDoS', 'seg',
      'Cortafuegos de aplicación web: inspecciona las peticiones HTTP y bloquea ataques como la inyección SQL, y absorbe inundaciones de tráfico (DDoS) antes de que lleguen a tus servidores.',
      'Cloud Armor', 'AWS WAF y Shield', 'Azure Web Application Firewall y DDoS Protection', { alias: ['inyección sql', 'sql injection', 'ddos', 'ataque'] }),
    C.concept('balanceador', 'Balanceador de carga y health check', 'seg',
      'Reparte las peticiones entre varios servidores y comprueba periódicamente si responden (health check); retira del reparto a los que fallan y los reincorpora al recuperarse.',
      'Cloud Load Balancing', 'Elastic Load Balancing', 'Azure Load Balancer / Application Gateway', { alias: ['load balancer', 'health check', 'reparto de carga', 'lb'] })
  ]);
  C.addService({
    id: 'red-seguridad', cat: 'Redes y seguridad', name: 'Red y seguridad', sub: 'VPC, firewall, WAF, balanceador', icon: 'shield', part: 12,
    lead: 'Diseña tu red privada, decide qué tráfico entra, protégela de ataques web y reparte la carga entre servidores sanos.',
    def: 'Conjunto de servicios para aislar tus recursos en redes virtuales, filtrar el tráfico con reglas, bloquear ataques web y repartir peticiones entre servidores comprobando su salud.',
    gcp: 'VPC, Firewall, Cloud Armor y Cloud Load Balancing', aws: 'VPC, Security Groups, WAF/Shield y ELB', azure: 'VNet, NSG, WAF/DDoS y Load Balancer',
    sla: '99,99 %',
    concepts: ['vpc', 'firewall', 'waf', 'balanceador', 'zona', 'rol'],
    planned: ['VPC con subredes y máquinas', 'Reglas de firewall', 'WAF contra SQL injection y DDoS', 'Balanceador con health checks'],
    kw: ['red', 'vpc', 'subred', 'firewall', 'cortafuegos', 'waf', 'cloud armor', 'ddos', 'sql injection', 'balanceador', 'load balancer', 'health check', 'seguridad']
  });
  C.addEquivalences([
    { need: 'Red privada virtual', gcp: 'VPC', aws: 'Amazon VPC', azure: 'Virtual Network', src: 'extra' },
    { need: 'Protección web (WAF/DDoS)', gcp: 'Cloud Armor', aws: 'AWS WAF / Shield', azure: 'Azure WAF / DDoS Protection', src: 'extra' },
    { need: 'Balanceador de carga', gcp: 'Cloud Load Balancing', aws: 'Elastic Load Balancing', azure: 'Azure Load Balancer', src: 'extra' }
  ]);

  /* ---------- 1. VPC ---------- */
  const SH1 =
    "gcloud compute networks create mi-vpc --subnet-mode=custom\n" +
    "gcloud compute networks subnets create publica  --network=mi-vpc --range=10.0.1.0/24\n" +
    "gcloud compute networks subnets create privada  --network=mi-vpc --range=10.0.2.0/24\n" +
    "gcloud compute instances create web-1 --subnet=publica            # con IP externa\n" +
    "gcloud compute instances create bd-1  --subnet=privada --no-address  # solo IP interna";
  let s1 = null;
  const ex1 = {
    id: 'vpc', label: 'VPC con subredes y máquinas', desc: 'Qué es accesible desde internet y qué queda dentro',
    code: SH1,
    quiz: [
      { q: 'La base de datos no debe ser accesible desde internet. ¿Dónde la pones?', o: ["En una subred privada, sin IP externa","En la subred pública","Da igual"], x: "GEcFSxdTQE0QRhcQZQoLRCB9QwkXAQFfXFdDCw1JXxYYDlUASEFSBkUNB1kGHgEQEAESRQwJC0lBAh9PGKeMQ0MKCwUaDQcJTxkFDUBTB0UNB1kGHgEURF1HUwcACklBDwkIFBYNUxYGCQgIA0ER" },
      { q: '¿Qué es una subred?', o: ["Un tipo de disco","Una región","Un trozo del rango de direcciones de la VPC"], x: "GEcFSxdRQE0QRhcQcgoTDQ1EEUwDFER7YnVDAApJXhYOHRAASEEWEwAWBEQXCU8UFEFbVQIXRBtIBAAOBkRJW0UXDAodTBBMDlUHTFZXQwIWHF0MTAsQREDxlxIQDQdMEEJNCA==" }
    ],
    setup: function (ctx) {
      s1 = {};
      const g = ctx.el('div', 'net', null);
      s1.net = box(ctx, g, 'Internet', 'usuarios');
      s1.net.appendChild(ctx.el('div', 'vm', null, '<span>usuario</span><small>203.0.113.7</small>'));
      s1.user = s1.net.querySelector('.vm');
      s1.pub = box(ctx, g, 'Subred pública', '10.0.1.0/24');
      s1.pri = box(ctx, g, 'Subred privada', '10.0.2.0/24');
      s1.pub.style.opacity = s1.pri.style.opacity = '.35';
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'conexiones permitidas', '0'); s1.b = stat(ctx, s1.stats, 'conexiones rechazadas', '0');
    },
    run: async function (ctx) {
      let okc = 0, no = 0;
      ctx.log('Creamos la VPC «mi-vpc» con dos subredes.'); await ctx.sleep(600);
      s1.pub.style.opacity = s1.pri.style.opacity = '1'; await ctx.sleep(500);
      const w1 = vm(ctx, s1.pub, 'web-1', '10.0.1.4'), w2 = vm(ctx, s1.pub, 'web-2', '10.0.1.5');
      ctx.log('Dos servidores web en la subred pública, con IP externa.', 'ok'); await ctx.sleep(600);
      const ap = vm(ctx, s1.pri, 'app-1', '10.0.2.4'), bd = vm(ctx, s1.pri, 'bd-1', '10.0.2.9');
      ctx.log('Aplicación y base de datos en la subred privada, sin IP externa.', 'ok'); await ctx.sleep(700);
      async function tryit(from, to, label, allowed, msg) {
        await S.fly(ctx, from, to, label, allowed ? 'ok' : 'err');
        S.flash(to, allowed); if (allowed) okc++; else no++;
        s1.a.v.textContent = okc; s1.b.v.textContent = no; ctx.log(msg, allowed ? 'ok' : 'err'); await ctx.sleep(400);
      }
      await tryit(s1.user, w1, 'HTTP', true, 'usuario → web-1: permitido, tiene IP externa.');
      await tryit(w1, ap, 'petición', true, 'web-1 → app-1: permitido, ambas están dentro de la VPC.');
      await tryit(ap, bd, 'consulta', true, 'app-1 → bd-1: permitido, tráfico interno.');
      await tryit(s1.user, bd, 'intento', false, 'usuario → bd-1: imposible, bd-1 no tiene IP externa ni ruta desde internet.');
      ctx.log('Las subredes privadas esconden lo sensible; lo único expuesto son los servidores web (y mejor aún detrás de un balanceador).', 'info');
    }
  };

  /* ---------- 2. Firewall ---------- */
  const SH2 =
    "gcloud compute firewall-rules create permitir-web --network=mi-vpc \\\n" +
    "  --allow=tcp:80,tcp:443 --source-ranges=0.0.0.0/0 --priority=100\n" +
    "gcloud compute firewall-rules create permitir-ssh-oficina --network=mi-vpc \\\n" +
    "  --allow=tcp:22 --source-ranges=198.51.100.0/24 --priority=200\n" +
    "# Por defecto, todo lo demás de entrada se deniega";
  const RULES = [
    ['permitir', 'tcp:443', 'desde cualquier IP'], ['permitir', 'tcp:80', 'desde cualquier IP'],
    ['permitir', 'tcp:22', 'solo 198.51.100.0/24'], ['denegar', 'todo', 'el resto (regla implícita)']
  ];
  const REQS = [
    { l: 'HTTPS 443 · 203.0.113.9', ok: 1, r: 0, why: 'encaja con permitir tcp:443' },
    { l: 'HTTP 80 · 192.0.2.44', ok: 1, r: 1, why: 'encaja con permitir tcp:80' },
    { l: 'SSH 22 · oficina 198.51.100.20', ok: 1, r: 2, why: 'puerto 22 desde la IP de la oficina' },
    { l: 'SSH 22 · 185.220.1.5', ok: 0, r: 3, why: 'puerto 22 desde una IP desconocida: no encaja, se rechaza' },
    { l: 'BD 3306 · 192.0.2.99', ok: 0, r: 3, why: 'puerto de base de datos expuesto: se rechaza' }
  ];
  let s2 = null;
  const ex2 = {
    id: 'firewall', label: 'Reglas de firewall', desc: 'Permitir o bloquear por puerto e IP: el tráfico pasa o rebota',
    code: SH2,
    quiz: [
      { q: 'Llega tráfico por un puerto que ninguna regla permite. ¿Qué ocurre?', o: ["Pasa igualmente","Se guarda para luego","Se rechaza por defecto"], x: "GEcFSxdRQE0QRhcQcw9FAQdLDB0aEEReV1EWFwtJSBBMCxAKSFVXEUUUBl9DCAoTAU5GWUMcRAhPEQUdVRdCXllDCQtJQwYPCgYFX1tZTUcZ" },
      { q: '¿Por qué limitar el SSH (puerto 22) a la IP de la oficina?', o: ["Para reducir la superficie de ataque","Porque lo exige la factura","Para ir más rápido"], x: "GEcFSxdTQE0QRhcQdRYECh1MEEwCEApCQRYqNUQZWAYIChtETF5VAgseCF9DGQFVFFhXRBcKRAhJDgUBHBdZQFcXDBIGAUMBChsLXhJfDREBB1kMH08RAQ1bWBcXERpEoN8BW0ZQ" }
    ],
    setup: function (ctx) {
      s2 = { r: [], q: [] };
      const w = ctx.el('div', 'fw-rules', null);
      RULES.forEach(function (r, i) {
        const el = ctx.el('div', 'fw-rule', w, '<span>' + (i + 1) + '</span><span class="' + (r[0] === 'permitir' ? 'allow' : 'deny') + '">' + r[0] + '</span><span>' + esc(r[1]) + ' · ' + esc(r[2]) + '</span><span class="badge"></span>');
        s2.r.push(el);
      });
      s2.list = ctx.el('div', 'reqlist', null);
      REQS.forEach(function (q) { s2.q.push(ctx.el('span', '', s2.list, esc(q.l))); });
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'pasan', '0'); s2.b = stat(ctx, s2.stats, 'rebotan', '0');
    },
    run: async function (ctx) {
      let p = 0, b = 0;
      ctx.log('El cortafuegos evalúa cada conexión contra las reglas, de la primera a la última.'); await ctx.sleep(800);
      for (let i = 0; i < REQS.length; i++) {
        const q = REQS[i], el = s2.q[i], rule = s2.r[q.r];
        el.style.outline = '2px solid #2f6df6'; ctx.log('Llega: ' + q.l + '.'); await ctx.sleep(500);
        await S.fly(ctx, el, rule, q.ok ? 'pasa' : 'no encaja', q.ok ? 'ok' : 'err');
        rule.classList.add('hit'); S.flash(rule, !!q.ok);
        el.style.outline = ''; el.className = q.ok ? 'ok' : 'bad';
        if (q.ok) { p++; ctx.log('Permitido: ' + q.why + '.', 'ok'); } else { b++; ctx.log('Bloqueado: ' + q.why + '.', 'err'); }
        s2.a.v.textContent = p; s2.b.v.textContent = b;
        await ctx.sleep(500); rule.classList.remove('hit');
      }
      ctx.log('Regla de oro: denegar por defecto y abrir solo lo imprescindible, con el origen más restringido posible.', 'info');
    }
  };

  /* ---------- 3. WAF ---------- */
  const SH3 =
    "gcloud compute security-policies create waf-web\n" +
    "gcloud compute security-policies rules create 1000 --security-policy=waf-web \\\n" +
    "  --expression=\"evaluatePreconfiguredExpr('sqli-stable')\" --action=deny-403\n" +
    "gcloud compute security-policies rules create 2000 --security-policy=waf-web \\\n" +
    "  --src-ip-ranges=\"0.0.0.0/0\" --action=rate-based-ban --rate-limit-threshold-count=100";
  const REQ3 = [
    ['GET /producto/12', 'ok'], ['POST /login', 'ok'], ["GET /?id=1' OR '1'='1", 'sqli'], ['GET /ofertas', 'ok'],
    ["POST /buscar ' ; DROP TABLE usuarios;--", 'sqli'], ['GET /carrito', 'ok'], ['GET / (×500 desde 1 IP)', 'ddos'], ['GET / (×500 desde 1 IP)', 'ddos'], ['GET /contacto', 'ok']
  ];
  let s3 = null;
  const ex3 = {
    id: 'waf', label: 'WAF: SQL injection y DDoS', desc: 'Peticiones legítimas y maliciosas atravesando el filtro',
    code: SH3,
    quiz: [
      { q: '¿Qué intenta una inyección SQL?', o: ["Saturar la red con tráfico","Colar código SQL en un campo para manipular la base de datos","Robar un disco físico"], x: "GEcFSxdSQE0QRhcQcw9FMyhrQwgKAQFORldDFQUdXwwCCgZETl1bDEVDSWIxTEhEQxAVB0MACklBAh9PBQFZW1UKCgoMXkMVTxkLXhJUDwoVHEgCQk0I" },
      { q: '¿Qué distingue un ataque DDoS?', o: ["Un volumen enorme de peticiones para saturar el servicio","Un disco lleno","Una contraseña débil"], x: "GEcFSxdTQE0QRhcQZQZFCQBZCgsOVQhEX18XBAoNQkMJA1UWREZbDEUUBl9DAx0cA0hcFhpFAgBBFx4OGwBCElMPRRAb7sIKBhYLDVNYFwAXSUkGTB4AAQ1eWgYCEQwNAkwbABcNQVMREw0NQhEJHFtGUA==" }
    ],
    setup: function (ctx) {
      s3 = {};
      const g = ctx.el('div', 'net n2', null);
      s3.src = box(ctx, g, 'Internet', 'peticiones'); s3.waf = box(ctx, g, 'WAF', 'Cloud Armor / AWS WAF'); s3.app = box(ctx, g, 'Tu aplicación', 'servidores web');
      s3.srcT = ctx.el('div', 'vm', s3.src, '<span>tráfico</span><small>mixto</small>');
      s3.wafT = ctx.el('div', 'vm', s3.waf, '<span>reglas</span><small>sqli · ddos</small>');
      s3.appT = ctx.el('div', 'vm', s3.app, '<span>web-1</span><small>sano</small>');
      s3.log = ctx.el('div', 'reqlist', null);
      s3.stats = ctx.el('div', 'stats', null);
      s3.a = stat(ctx, s3.stats, 'llegan a la app', '0'); s3.b = stat(ctx, s3.stats, 'bloqueadas', '0'); s3.c = stat(ctx, s3.stats, 'carga de la app', '0 %');
    },
    run: async function (ctx) {
      let ok = 0, bl = 0;
      ctx.log('El WAF se coloca delante de la aplicación y mira cada petición HTTP.'); await ctx.sleep(700);
      for (let i = 0; i < REQ3.length; i++) {
        const r = REQ3[i], t = r[1], chip = ctx.el('span', '', s3.log, esc(r[0]));
        await S.fly(ctx, s3.srcT, s3.wafT, t === 'ok' ? 'HTTP' : t === 'sqli' ? 'SQL' : '×500', t === 'ok' ? '' : 'err');
        if (t === 'ok') {
          S.flash(s3.wafT, true); await S.fly(ctx, s3.wafT, s3.appT, 'ok', 'ok'); ok++; chip.className = 'ok';
          ctx.log('Pasa: ' + r[0] + '.', 'ok');
        } else {
          S.flash(s3.wafT, false); bl++; chip.className = 'bad';
          ctx.log(t === 'sqli' ? 'Bloqueada (403): patrón de inyección SQL en «' + r[0] + '».' : 'Bloqueada: demasiadas peticiones por segundo desde la misma IP (limitación de ritmo).', 'err');
        }
        s3.a.v.textContent = ok; s3.b.v.textContent = bl; s3.c.v.textContent = Math.min(30, ok * 4) + ' %';
        if (i === 6) ctx.log('Empieza una inundación: el WAF la absorbe y tu aplicación ni se entera.', 'warn');
        await ctx.sleep(200);
      }
      s3.b.classList.add('hi');
      ctx.log('Resultado: ' + ok + ' peticiones legítimas atendidas y ' + bl + ' ataques parados antes de tocar tus servidores.', 'info');
    }
  };

  /* ---------- 4. Balanceador con health checks ---------- */
  const SH4 =
    "gcloud compute health-checks create http hc-web --port=80 --request-path=/salud \\\n" +
    "  --check-interval=5s --unhealthy-threshold=2 --healthy-threshold=2\n" +
    "gcloud compute backend-services create web-bes --health-checks=hc-web --global\n" +
    "gcloud compute backend-services get-health web-bes --global";
  let s4 = null;
  const ex4 = {
    id: 'balanceador', label: 'Balanceador con health checks', desc: 'Un servidor falla y deja de recibir tráfico; al recuperarse, vuelve',
    code: SH4,
    quiz: [
      { q: 'Un servidor falla el health check varias veces seguidas. ¿Qué hace el balanceador?', o: ["Apaga todos los servidores","Deja de enviarle peticiones","Le envía más"], x: "GEcFSxdSQE0QRhcQZAYRDRtMQwkDVRdIQEAKAQsbDQ0DTwYFQ10WBwAISV8GHA4HEEIST0MWDQ5YBkwMGgoNXlkQRQAMQKDNHFtGUA==" },
      { q: 'El servidor se recupera. ¿Qué pasa?', o: ["Hay que reconfigurar todo a mano","Nunca vuelve","Tras pasar el health check, vuelve a recibir tráfico"], x: "GEcFSxdRQE0QRhcQcw9FDAxMDxgHVQdFV1UIRRcAShYJTxYLQEJEDAenyEMHAwMaRFQSWgxFFgxEDQ8ABxRCQFdDBBEdQg6vzgENTlNbBgsQDA0AGQ4bAEISUxARp8gNEA0BGkoPTw==" }
    ],
    setup: function (ctx) {
      s4 = { v: [], n: [0, 0, 0] };
      const g = ctx.el('div', 'net n2', null);
      s4.cl = box(ctx, g, 'Clientes', 'peticiones'); s4.lb = box(ctx, g, 'Balanceador', 'reparto + health check'); s4.sv = box(ctx, g, 'Servidores', 'backend');
      s4.clT = ctx.el('div', 'vm', s4.cl, '<span>usuarios</span><small>…</small>'); s4.lbT = ctx.el('div', 'vm', s4.lb, '<span>LB</span><small>35.1.2.3</small>');
      ['web-1', 'web-2', 'web-3'].forEach(function (n, i) { const e = vm(ctx, s4.sv, n, '10.0.1.' + (4 + i)); e.querySelector('small').textContent = '0 peticiones'; s4.v.push(e); });
      s4.stats = ctx.el('div', 'stats', null);
      s4.a = stat(ctx, s4.stats, 'servidores sanos', '3 de 3'); s4.b = stat(ctx, s4.stats, 'peticiones atendidas', '0'); s4.c = stat(ctx, s4.stats, 'peticiones perdidas', '0');
    },
    run: async function (ctx) {
      let healthy = [true, true, true], done = 0, rr = 0;
      function upd() { s4.a.v.textContent = healthy.filter(Boolean).length + ' de 3'; s4.b.v.textContent = done; }
      async function send(n) {
        for (let k = 0; k < n; k++) {
          let tries = 0; while (!healthy[rr % 3] && tries++ < 3) rr++;
          const i = rr++ % 3;
          await S.fly(ctx, s4.clT, s4.lbT, 'GET', ''); await S.fly(ctx, s4.lbT, s4.v[i], 'GET', 'ok');
          s4.n[i]++; done++; s4.v[i].querySelector('small').textContent = s4.n[i] + ' peticiones'; S.flash(s4.v[i], true); upd();
        }
      }
      ctx.log('El balanceador reparte por turnos y comprueba la salud de cada servidor cada 5 s.'); await ctx.sleep(600);
      await send(3); ctx.log('Reparto equilibrado: una petición a cada servidor.', 'ok');
      ctx.log('web-2 empieza a fallar (su aplicación se ha colgado).', 'warn'); s4.v[1].classList.add('sick'); await ctx.sleep(700);
      ctx.log('Health check 1 de 2 fallado en web-2…', 'warn'); await ctx.sleep(600);
      healthy[1] = false; s4.v[1].classList.remove('sick'); s4.v[1].classList.add('down'); s4.v[1].querySelector('small').textContent = 'no sano'; upd();
      ctx.log('Health check 2 de 2 fallado: web-2 se retira del reparto.', 'err'); await ctx.sleep(500);
      await send(4); ctx.log('Todo el tráfico va a web-1 y web-3; los usuarios no notan nada.', 'ok');
      ctx.log('web-2 se reinicia y responde de nuevo.', 'info'); s4.v[1].classList.remove('down'); await ctx.sleep(700);
      ctx.log('Pasa 2 health checks seguidos: se reincorpora.', 'ok'); healthy[1] = true; s4.v[1].querySelector('small').textContent = s4.n[1] + ' peticiones'; upd();
      await send(3);
      ctx.log('Con 3 servidores y un balanceador, la caída de uno no tumba el servicio: esa es la base de la alta disponibilidad.', 'info');
    }
  };

  C.registerConsole('red-seguridad', { lang: 'bash', examples: [ex3, ex4] });
})(window.CEDI);
