/* Escenas C: balanceador, entrenamiento en paralelo, alerta de monitorización */
(function (C) {
  const kit = C._kit, reg = C._reg, S = C._S, K = C._col;

  /* ---------- Balanceador con health checks ---------- */
  reg('red-seguridad', 'balanceador', (function () {
    let k, sv, kp, lines, rr, ok, served, lost;
    const Y = [12, 90, 168];
    function healthy() { return [0, 1, 2].filter(function (i) { return ok[i]; }); }
    function request() {
      const h = healthy(); const i = h[rr++ % h.length]; served++;
      k.fly([100, 125], [196, 125], { c: K.BLUE, ms: 350 }).then(function () { k.fly([248, 125], [sv[i].x, sv[i].cy], { c: K.GREEN, ms: 450 }).then(function () { sv[i].n++; sv[i].text('peticiones: ' + sv[i].n); }); });
      kp[1].set(String(served));
    }
    async function burst(ctx, n) { for (let j = 0; j < n; j++) { request(); await ctx.sleep(380); } await ctx.sleep(500); }
    function check(i, pass) { return k.fly([248, 125], [sv[i].x, sv[i].cy], { c: pass ? K.GREEN : K.RED, ms: 500, r: 3, noglow: false }); }
    return {
      setup: function (ctx) {
        k = kit(ctx, 252); sv = []; ok = [true, true, true]; rr = 0; served = 0; lost = 0;
        [0, 14, -4].forEach(function (o, i) { k.person(40 + o + 10, 112 + i * 14, ['#64748b', '#94a3b8', '#7c8aa0'][i]); }); k.T(60, 76, 'Usuarios', 't-sm', 'middle');
        const lb = k.g(222, 125); S('polygon', { points: '-30,0 -15,-26 15,-26 30,0 15,26 -15,26', 'class': 'card', fill: '#eff6ff', stroke: K.BLUE }, lb); k.T(0, 4, 'LB', 't-b', 'middle', lb); k.T(222, 166, 'Balanceador', 't-sm', 'middle'); k.T(222, 178, 'health check cada 5 s', 't-sm', 'middle');
        lines = [];
        for (let i = 0; i < 3; i++) { lines.push(k.line(252, 125, 420, Y[i] + 31, 'flowl')); const s = k.server(420, Y[i], 180, 62, 'web-' + (i + 1), { cpu: false, state: 'on' }); s.text('peticiones: 0'); s.n = 0; sv.push(s); }
        k.line(96, 125, 192, 125, 'flowl');
        kp = k.kpis([['servidores sanos', '3 / 3'], ['peticiones atendidas', '0'], ['peticiones perdidas', '0']]); kp[0].set('3 / 3', 'ok'); kp[2].set('0', 'ok');
      },
      run: async function (ctx) {
        ctx.log('El balanceador reparte por turnos y comprueba la salud de cada servidor cada 5 s.'); await ctx.sleep(900);
        await burst(ctx, 6); ctx.log('Reparto equilibrado: una petición a cada servidor.', 'ok'); await ctx.sleep(600);
        ctx.log('web-2 empieza a fallar (su aplicación se ha colgado).', 'err'); sv[1].state('hot'); sv[1].text('¡colgado!'); k.shake(sv[1].g); await ctx.sleep(800);
        ctx.log('Health check 1 de 2 fallado en web-2…', 'warn'); check(1, false); await ctx.sleep(1100);
        ctx.log('Health check 2 de 2 fallado: web-2 se retira del reparto.', 'warn'); check(1, false); await ctx.sleep(700);
        ok[1] = false; sv[1].state('dead'); lines[1].style.opacity = .12; sv[1].text('fuera del reparto'); kp[0].set('2 / 3', 'warn'); await ctx.sleep(500);
        await burst(ctx, 6); ctx.log('Todo el tráfico va a web-1 y web-3; los usuarios no notan nada.', 'ok'); await ctx.sleep(500);
        ctx.log('web-2 se reinicia y responde de nuevo.', 'info'); sv[1].state('boot'); sv[1].text('reiniciando…'); await ctx.sleep(1100);
        check(1, true); await ctx.sleep(700); ctx.log('Pasa 2 health checks seguidos: se reincorpora.', 'ok'); check(1, true); await ctx.sleep(700);
        ok[1] = true; sv[1].state('on'); lines[1].style.opacity = 1; sv[1].text('peticiones: ' + sv[1].n); kp[0].set('3 / 3', 'ok'); k.ring(sv[1].cx, sv[1].cy, K.GREEN, 20); await ctx.sleep(500);
        await burst(ctx, 6);
        ctx.log('Con 3 servidores y un balanceador, la caída de uno no tumba el servicio: esa es la base de la alta disponibilidad.', 'ok');
      }
    };
  })());

  /* ---------- Entrenamiento distribuido ---------- */
  reg('ia', 'entrenar', (function () {
    let k, gpu, kp, curve, dots, hub;
    const LOSS = [1.0, 0.62, 0.41, 0.30, 0.24], CX = function (e) { return 440 + e * 46; }, CY = function (l) { return 150 - l * 120; };
    const COL = [K.BLUE, K.ORANGE, K.GREEN, K.VIOLET];
    return {
      setup: function (ctx) {
        k = kit(ctx, 262); gpu = [];
        k.T(14, 14, 'Datos (1 / 4 por GPU)', 't-sm');
        for (let i = 0; i < 4; i++) {
          S('rect', { x: 14, y: 26 + i * 62, width: 52, height: 34, rx: 6, fill: COL[i], opacity: .85 }, k.svg); k.T(40, 47 + i * 62, 'datos ' + (i + 1), 't-w', 'middle');
          const g = k.server(120, 20 + i * 62, 138, 54, 'GPU ' + (i + 1), { cpu: true, state: 'on', unit: 'uso' }); g.cpu(8); gpu.push(g);
        }
        hub = k.g(334, 126); S('circle', { r: 40, fill: '#f5f3ff', stroke: K.VIOLET, 'stroke-width': 2, 'class': 'card' }, hub); k.T(0, -2, 'All-reduce', 't-b', 'middle', hub).style.fontSize = '11px'; k.T(0, 12, 'promedia', 't-sm', 'middle', hub);
        k.T(520, 14, 'Pérdida (error)', 't-b', 'middle').style.fontSize = '11px';
        S('path', { d: 'M426 24 V150 H640', fill: 'none', stroke: '#cbd5e1', 'stroke-width': 1.5 }, k.svg); k.T(404, 34, '1,0', 't-sm'); k.T(404, 150, '0', 't-sm'); k.T(540, 168, 'épocas', 't-sm', 'middle');
        curve = S('polyline', { fill: 'none', stroke: K.BLUE, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', points: CX(0) + ',' + CY(1) }, k.svg); dots = [S('circle', { cx: CX(0), cy: CY(1), r: 4.5, fill: K.BLUE }, k.svg)];
        kp = k.kpis([['época', '0 / 4'], ['pérdida', '1,00'], ['tiempo de entrenamiento', '—']]);
      },
      run: async function (ctx) {
        ctx.log('Entrenar = ajustar los parámetros del modelo para que el error (la pérdida) baje. Con muchos datos una sola GPU tardaría horas.'); await ctx.sleep(1400);
        ctx.log('Paralelismo de datos: cada GPU tiene una copia del modelo y un cuarto de los datos.', 'info'); gpu.forEach(function (g) { k.ring(g.cx, g.cy, K.BLUE, 14); }); await ctx.sleep(1400);
        for (let e = 1; e <= 4; e++) {
          ctx.log(e === 1 ? 'Época 1: cada GPU calcula el gradiente (hacia dónde corregir los pesos) con sus datos.' : 'Época ' + e + ': de nuevo, gradientes locales → promedio → pesos corregidos.');
          kp[0].set(e + ' / 4'); gpu.forEach(function (g, i) { g.state('hot'); g.cpu(96); });
          await ctx.sleep(900); gpu.forEach(function (g, i) { g.cpu(30); g.state('warn'); k.fly([258, g.cy], [334, 126], { c: COL[i], ms: 650 }); });
          await ctx.sleep(800);
          if (e === 1) ctx.log('All-reduce: los 4 gradientes se promedian y todas las GPU necesitan el mismo resultado. Aquí se espera al más lento.', 'warn');
          k.ring(334, 126, K.VIOLET, 30); await ctx.sleep(500);
          gpu.forEach(function (g, i) { k.fly([334, 126], [258, g.cy], { c: K.VIOLET, ms: 650 }); g.state('on'); }); await ctx.sleep(900);
          const x = CX(e), y = CY(LOSS[e]); curve.setAttribute('points', curve.getAttribute('points') + ' ' + x + ',' + y); dots.push(S('circle', { cx: x, cy: y, r: 4.5, fill: K.BLUE }, k.svg)); k.pop(dots[dots.length - 1], 400);
          ctx.log('Pérdida: ' + LOSS[e - 1].toFixed(2).replace('.', ',') + ' → ' + LOSS[e].toFixed(2).replace('.', ',') + '.', 'ok'); kp[1].set(LOSS[e].toFixed(2).replace('.', ','), 'ok'); gpu.forEach(function (g) { g.cpu(8); }); await ctx.sleep(700);
        }
        kp[2].set('8 h → 2 h 40', 'ok');
        ctx.log('Con 1 GPU el entrenamiento llevaría ≈ 8 h; con 4 GPU ≈ 2 h 40 min (cifras de ejemplo): aceleración 3×, no 4×.', 'ok'); await ctx.sleep(1100);
        ctx.log('Por qué no 4×: sincronizar gradientes cuesta tiempo, igual que viste en Computación. La eficiencia baja al subir el número de GPU.', 'info'); await ctx.sleep(1100);
        ctx.log('Se paga por el tiempo de GPU usado: al acabar el trabajo, las máquinas se apagan.', 'info'); gpu.forEach(function (g) { g.state('off'); g.text('apagada'); });
      }
    };
  })());

  /* ---------- Alerta cuando un nodo no responde ---------- */
  reg('monitorizacion', 'alerta', (function () {
    let k, rows, kp, alert, ch, g1, g2, bell, tick, beatsN;
    const NY = [30, 82, 134, 186], BX = function (i) { return 92 + i * 15; };
    function beat(r, ok) { const x = BX(r.n++ % 14), c = S('rect', { x: x, y: r.y + 8, width: 9, height: 22, rx: 3, fill: ok ? K.GREEN : '#fca5a5', 'class': 'state' }, k.svg); k.pop(c, 300); r.cells.push(c); if (r.cells.length > 14) r.cells.shift().remove(); }
    return {
      setup: function (ctx) {
        k = kit(ctx, 262); rows = []; beatsN = 0;
        k.T(14, 16, 'Latidos de cada nodo', 't-b').style.fontSize = '11px';
        NY.forEach(function (y, i) { k.card(10, y, 306, 40); k.T(18, y + 25, 'nodo-' + (i + 1), 't-b', 'start').style.fontSize = '11px'; rows.push({ y: y, n: 0, cells: [], led: S('circle', { cx: 300, cy: y + 20, r: 5, fill: K.GREEN, 'class': 'led' }, k.svg) }); });
        alert = k.g(338, 30); k.card(0, 0, 160, 78, alert); alert.style.opacity = .3; k.T(12, 22, 'ALERTA', 't-b', 'start', alert).style.fill = '#94a3b8'; k.T(12, 40, 'sin alertas', 't-sm', 'start', alert); tick = k.T(12, 62, '', 't-sm', 'start', alert);
        ch = [['✉', 'correo'], ['#', 'chat del equipo'], ['☎', 'llamada']].map(function (c, i) {
          const g = k.g(338, 124 + i * 36); S('circle', { cx: 14, cy: 14, r: 13, fill: '#e2e8f0', 'class': 'state' }, g); k.T(14, 19, c[0], 't-b', 'middle', g); k.T(36, 18, c[1], 't-sm', 'start', g); return g;
        });
        g1 = k.g(512, 30); k.card(0, 0, 124, 64, g1); k.person(26, 40, '#94a3b8', g1); k.T(52, 28, 'guardia 1', 't-b', 'start', g1).style.fontSize = '10.5px'; g1.t = k.T(52, 46, 'en espera', 't-sm', 'start', g1);
        g2 = k.g(512, 124); k.card(0, 0, 124, 64, g2); k.person(26, 40, '#94a3b8', g2); k.T(52, 28, 'guardia 2', 't-b', 'start', g2).style.fontSize = '10.5px'; g2.t = k.T(52, 46, 'en espera', 't-sm', 'start', g2);
        kp = k.kpis([['tiempo desde el fallo', 'T + 0 s'], ['alerta', 'ninguna'], ['responde', '—']]);
        for (let i = 0; i < 12; i++) rows.forEach(function (r) { beat(r, true); });
      },
      run: async function (ctx) {
        const run = function () { rows.forEach(function (r, i) { if (i < 3 || r.alive !== false) beat(r, true); }); };
        ctx.log('El nodo-4 de un clúster va a fallar. La regla de alerta está configurada: «sin latidos durante 30 s».'); run(); await ctx.sleep(900); run(); await ctx.sleep(700);
        ctx.log('T+0 s: el nodo-4 deja de enviar latidos.', 'err'); rows[3].alive = false; rows[3].led.setAttribute('fill', K.RED); kp[0].set('T + 0 s'); await ctx.sleep(700);
        ctx.log('La monitorización cuenta los latidos perdidos: 1… 2… 3.', 'warn');
        for (let i = 1; i <= 3; i++) { rows.slice(0, 3).forEach(function (r) { beat(r, true); }); beat(rows[3], false); kp[0].set('T + ' + i * 10 + ' s', i === 3 ? 'warn' : ''); tick.textContent = 'latidos perdidos: ' + i; await ctx.sleep(750); }
        ctx.log('T+30 s: se abre una alerta crítica «nodo-4 sin respuesta».', 'err'); alert.style.opacity = 1; alert.firstChild.setAttribute('stroke', K.RED); alert.firstChild.setAttribute('fill', '#fef2f2'); alert.children[1].textContent = 'ALERTA crítica'; alert.children[1].style.fill = K.RED; alert.children[2].textContent = 'nodo-4 sin respuesta'; k.pop(alert, 500); k.shake(alert); kp[1].set('crítica', 'bad'); await ctx.sleep(1300);
        ctx.log('T+31 s: aviso por correo, mensaje al chat del equipo y llamada a la persona de guardia.', 'info');
        ch.forEach(function (c, i) { c.firstChild.setAttribute('fill', K.AMBER); k.fly([498, 69], [352, 138 + i * 36], { c: K.AMBER, ms: 600 }); c.children[1].style.fill = '#fff'; }); await ctx.sleep(1300);
        ch.forEach(function (c) { k.fly([360, 138], [512, 62], { c: K.AMBER, ms: 700, r: 3 }); }); g1.t.textContent = '¡suena el móvil!'; await ctx.sleep(1200);
        ctx.log('Pasan 5 minutos y nadie reconoce la alerta (la persona de guardia está en el metro).', 'warn'); kp[0].set('T + 5 min', 'bad'); g1.t.textContent = 'sin respuesta'; g1.firstChild.setAttribute('stroke', K.RED); k.ring(576, 62, K.RED, 14); await ctx.sleep(1600);
        ctx.log('Se escala a la segunda persona de guardia, que sí responde.', 'ok'); k.fly([576, 62], [576, 156], { c: K.VIOLET, ms: 800 }); await ctx.sleep(1000); g2.t.textContent = '¡lo veo!'; g2.firstChild.setAttribute('stroke', K.GREEN); kp[2].set('guardia 2', 'ok'); k.ring(576, 156, K.GREEN, 14); await ctx.sleep(1200);
        ctx.log('Reinicia el nodo; el clúster ya había re-repartido su trabajo.', 'info'); kp[0].set('T + 7 min', 'warn'); await ctx.sleep(1200);
        rows[3].alive = true; rows[3].led.setAttribute('fill', K.GREEN); for (let i = 0; i < 3; i++) { rows.forEach(function (r) { beat(r, true); }); await ctx.sleep(300); }
        alert.firstChild.setAttribute('stroke', K.GREEN); alert.firstChild.setAttribute('fill', '#ecfdf5'); alert.children[1].textContent = 'ALERTA resuelta'; alert.children[1].style.fill = K.GREEN; alert.children[2].textContent = 'nodo-4 vuelve a latir'; tick.textContent = ''; kp[1].set('cerrada', 'ok'); kp[0].set('T + 8 min', 'ok');
        ctx.log('El nodo vuelve a latir y la alerta se cierra. Cada minuto de este recorrido cuenta para el SLA.', 'ok'); await ctx.sleep(1200);
        ctx.log('Detectar rápido (monitorización) y avisar a alguien que responda (escalado) reduce la caída: el fallo en sí no se puede evitar.', 'ok');
      }
    };
  })());
})(window.CEDI);
