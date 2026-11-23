/* Escenas A: autoescalado, MapReduce, Spark, Kubernetes */
(function (C) {
  const kit = C._kit, reg = C._reg, S = C._S, K = C._col, nf = C._nf;

  /* ---------- Autoescalado: pico de carga ---------- */
  reg('vms-autoescalado', 'pico', (function () {
    let k, vms, kp, lines, load, rpsT;
    const SLOT = [[372, 12], [500, 12], [372, 92], [500, 92], [372, 172], [500, 172]];
    function cpuOf(n) { return Math.min(130, load / (n * 100) * 100); }
    function paint() {
      const n = vms.length, c = cpuOf(n);
      vms.forEach(function (v) { v.cpu(c); v.state(v.booting ? 'boot' : c >= 85 ? 'hot' : c >= 65 ? 'warn' : 'on'); });
      kp[0].set(n); kp[1].set(Math.round(Math.min(100, c)) + ' %', c >= 85 ? 'bad' : c > 60 ? 'warn' : 'ok'); kp[2].set(nf(n * 0.05, 2) + ' $');
      rpsT.textContent = load + ' /s';
    }
    function traffic() {
      const nn = Math.min(9, Math.max(2, Math.round(load / 40)));
      for (let i = 0; i < nn; i++) setTimeout(function () {
        k.fly([96, 125], [206, 125], { c: BLUEc, ms: 380 }).then(function () { const v = vms[i % vms.length]; if (v) k.fly([262, 125], [v.x, v.cy], { c: K.GREEN, ms: 480 }); });
      }, k.ms(i * 160));
    }
    const BLUEc = K.BLUE;
    function addVm() {
      const i = vms.length, p = SLOT[i], v = k.server(p[0], p[1], 112, 62, 'vm-' + (i + 1), { state: 'boot' });
      v.booting = true; k.pop(v.g, 600);
      const l = k.line(262, 125, p[0], p[1] + 31, 'flowl', k.svg); k.svg.insertBefore(l, k.svg.children[1]);
      vms.push(v); return v;
    }
    return {
      setup: function (ctx) {
        k = kit(ctx, 252); vms = []; load = 0;
        SLOT.forEach(function (p) { S('rect', { x: p[0], y: p[1], width: 112, height: 62, rx: 10, 'class': 'slot' }, k.svg); });
        [[0, 0], [26, 14], [-6, 26]].forEach(function (o, i) { k.person(40 + o[0] + 14, 112 + o[1], ['#64748b', '#94a3b8', '#7c8aa0'][i]); });
        k.T(60, 42, 'Usuarios', 't-sm', 'middle'); rpsT = k.T(60, 70, '0 /s', 't-b', 'middle'); k.T(60, 85, 'peticiones', 't-sm', 'middle');
        const lb = k.g(234, 125); S('polygon', { points: '-30,0 -15,-26 15,-26 30,0 15,26 -15,26', 'class': 'card', fill: '#eff6ff', stroke: K.BLUE }, lb);
        k.T(0, 4, 'LB', 't-b', 'middle', lb); k.T(234, 166, 'Balanceador', 't-sm', 'middle');
        k.line(96, 125, 204, 125, 'flowl', k.svg);
        kp = k.kpis([['máquinas', '1'], ['CPU media', '0 %'], ['coste por hora', '0,05 $']]);
        const v = addVm(); v.booting = false; paint();
      },
      run: async function (ctx) {
        ctx.log('Un grupo con 1 VM. Objetivo: mantener la CPU media alrededor del 60 %. Mínimo 1 máquina, máximo 6.'); await ctx.sleep(900);
        const loads = [40, 80, 160, 260, 340];
        for (let li = 0; li < loads.length; li++) {
          load = loads[li]; paint(); traffic();
          let n = vms.length, c = Math.round(Math.min(100, cpuOf(n)));
          ctx.log('Carga: ' + load + ' peticiones/s → CPU media ' + c + ' %.'); await ctx.sleep(900);
          while (cpuOf(vms.length) > 60 && vms.length < 6) {
            ctx.log('CPU por encima del objetivo (60 %): el autoescalador crea una VM nueva.', 'warn');
            const v = addVm(); paint(); await ctx.sleep(900);
            v.booting = false; ctx.log('vm-' + vms.length + ' arrancada y registrada en el balanceador.', 'ok'); paint(); k.ring(v.cx, v.cy, K.GREEN, 20); traffic(); await ctx.sleep(900);
          }
        }
        ctx.log('Carga: 340 peticiones/s → CPU media ' + Math.round(cpuOf(vms.length)) + ' %.'); await ctx.sleep(700);
        ctx.log('El pico se absorbe con 6 máquinas. Sin autoescalado habría que tener todas encendidas siempre, o caer.', 'ok');
      }
    };
  })());

  /* ---------- MapReduce: contar palabras ---------- */
  reg('hadoop', 'mapreduce', (function () {
    let k, pills, mapBox, redRows, redBox, redTitle;
    const LINES = [['el', 'gato', 'come', 'pescado'], ['el', 'perro', 'come', 'carne'], ['el', 'gato', 'duerme']];
    const RED = [['el', 'pescado', 'duerme'], ['gato', 'perro'], ['come', 'carne']];
    const COL = [K.BLUE, K.ORANGE, K.GREEN];
    const MY = [38, 128, 218], H = 80;
    function redOf(w) { return RED.findIndex(function (r) { return r.indexOf(w) >= 0; }); }
    function phase(i) { pills.forEach(function (p, j) { p.setAttribute('class', j === i ? 'pillon' : 'pilloff'); p.nextSibling.setAttribute('class', j === i ? 't-w' : 'pill-t'); p.nextSibling.style.fill = j === i ? '#fff' : ''; }); }
    return {
      setup: function (ctx) {
        k = kit(ctx, 306); pills = []; mapBox = []; redRows = []; redBox = [];
        ['1 · MAP', '2 · SHUFFLE', '3 · REDUCE'].forEach(function (t, i) {
          const x = 130 + i * 140, r = S('rect', { x: x, y: 2, width: 124, height: 22, rx: 11, 'class': 'pilloff' }, k.svg); k.T(x + 62, 17, t, 'pill-t', 'middle').style.fontSize = '11px'; pills.push(r);
        });
        for (let m = 0; m < 3; m++) {
          k.card(14, MY[m], 196, H); k.T(24, MY[m] + 18, 'Mapper ' + (m + 1), 't-sm'); k.T(24, MY[m] + 38, '«' + LINES[m].join(' ') + '»', 't-b').style.fontSize = '11px';
          mapBox.push(k.T(24, MY[m] + 62, '', 't-sm'));
        }
        const mid = k.g(0, 0); for (let m = 0; m < 3; m++) for (let r = 0; r < 3; r++) k.line(212, MY[m] + H / 2, 428, MY[r] + H / 2, 'pipe', mid).style.strokeWidth = 1.5;
        for (let r = 0; r < 3; r++) {
          k.card(430, MY[r], 196, H, null).style.stroke = COL[r]; k.T(440, MY[r] + 17, 'Reducer ' + (r + 1), 't-sm');
          redRows.push(RED[r].map(function (w, j) { const t = k.T(440, MY[r] + 36 + j * 15, '', 't-b'); t.style.fontSize = '11px'; return { w: w, t: t, n: 0 }; }));
        }
      },
      run: async function (ctx) {
        phase(0); ctx.log('MAP: cada mapper lee su línea y, por cada palabra, emite un par (palabra, 1). Trabajan los tres a la vez.', 'info');
        for (let m = 0; m < 3; m++) { mapBox[m].textContent = LINES[m].map(function (w) { return '(' + w + ',1)'; }).join(' '); k.pop(mapBox[m], 500); }
        await ctx.sleep(1500);
        phase(1); ctx.log('SHUFFLE: los pares con la misma palabra viajan al mismo reducer. Todos los «el» acaban juntos, estén donde estén.', 'info');
        const jobs = [];
        LINES.forEach(function (ws, m) { ws.forEach(function (w, j) { jobs.push([m, w, j]); }); });
        jobs.sort(function (a, b) { return a[2] - b[2]; });
        for (let i = 0; i < jobs.length; i++) {
          const m = jobs[i][0], w = jobs[i][1], r = redOf(w);
          k.fly([200, MY[m] + 40], [430, MY[r] + 36 + RED[r].indexOf(w) * 15 - 4], { c: COL[r], ms: 800, rect: [30, 14], keep: true }).then(function (e) {
            const row = redRows[r].find(function (x) { return x.w === w; }); row.n++; row.t.textContent = w + '  ' + '1 '.repeat(row.n); if (e) e.remove();
          });
          await ctx.sleep(210);
        }
        await ctx.sleep(900);
        phase(2); ctx.log('REDUCE: cada reducer suma los unos de cada palabra: el = 3, gato = 2, come = 2…', 'info');
        redRows.forEach(function (rr, r) { rr.forEach(function (row) { row.t.textContent = row.w + ' = ' + row.n; k.pop(row.t, 450); row.t.style.fill = COL[r]; }); });
        await ctx.sleep(1200);
        ctx.log('Resultado: 7 palabras distintas contadas, repartidas entre 3 reducers que han trabajado a la vez.', 'ok');
      }
    };
  })());

  /* ---------- Spark: driver, executors y particiones ---------- */
  reg('spark', 'driver-executors', (function () {
    let k, tiles, ex, kp, driver, res;
    const EY = [26, 108, 190];
    return {
      setup: function (ctx) {
        k = kit(ctx, 268); tiles = []; ex = [];
        k.card(14, 40, 150, 190); k.T(24, 58, 'Cloud Storage', 't-sm'); k.T(24, 72, '9 particiones', 't-sm');
        for (let i = 0; i < 9; i++) { const x = 28 + (i % 3) * 44, y = 90 + Math.floor(i / 3) * 44, g = k.g(x, y); S('rect', { width: 36, height: 34, rx: 6, fill: '#e8eef7', stroke: '#cbd5e1', 'class': 'state' }, g); k.T(18, 21, 'p' + (i + 1), 't-sm', 'middle', g); tiles.push(g); }
        driver = k.g(250, 108); S('circle', { r: 34, fill: '#eff6ff', stroke: K.BLUE, 'stroke-width': 2, 'class': 'card' }, driver); k.T(0, -2, 'Driver', 't-b', 'middle', driver); k.T(0, 13, 'planifica', 't-sm', 'middle', driver);
        for (let i = 0; i < 3; i++) {
          k.line(280, 140, 372, EY[i] + 36, 'flowl'); const e = k.server(372, EY[i], 140, 72, 'executor-' + (i + 1), { state: 'on' }); e.text('esperando'); ex.push(e);
        }
        k.card(548, 80, 80, 110); k.T(588, 100, 'Resultado', 't-sm', 'middle'); res = k.T(588, 148, '—', 't-b', 'middle');
        kp = k.kpis([['particiones procesadas', '0 / 9'], ['tareas en paralelo', '0'], ['tiempo (relativo)', '—']]);
      },
      run: async function (ctx) {
        ctx.log('El driver lee los metadatos de los datos: 9 particiones en Cloud Storage.'); await ctx.sleep(700);
        ctx.log('Crea 9 tareas (una por partición) y las reparte entre 3 executors.', 'info'); k.ring(250, 142, K.BLUE, 30); await ctx.sleep(900);
        let done = 0;
        for (let r = 0; r < 3; r++) {
          ctx.log('Ronda ' + (r + 1) + ': 3 particiones procesadas a la vez.'); kp[1].set('3', 'ok');
          const jobs = [];
          for (let i = 0; i < 3; i++) {
            const p = r * 3 + i; tiles[p].firstChild.setAttribute('fill', '#dbeafe'); tiles[p].firstChild.setAttribute('stroke', K.BLUE);
            jobs.push(k.fly([40 + (p % 3) * 44 + 18, 107 + Math.floor(p / 3) * 44], [372, EY[i] + 36], { c: K.BLUE, ms: 700 }).then(function () { ex[i].text('procesa p' + (p + 1)); ex[i].cpu(95); ex[i].state('hot'); }));
          }
          await Promise.all(jobs); await ctx.sleep(800);
          for (let i = 0; i < 3; i++) { const p = r * 3 + i; tiles[p].firstChild.setAttribute('fill', '#bbf7d0'); tiles[p].firstChild.setAttribute('stroke', K.GREEN); ex[i].cpu(12); ex[i].state('on'); done++; }
          kp[0].set(done + ' / 9'); await ctx.sleep(300);
        }
        ctx.log('Cada executor devuelve sumas parciales por región; Spark las combina (shuffle) en el resultado final.', 'info');
        for (let i = 0; i < 3; i++) k.fly([512, EY[i] + 36], [548, 135], { c: K.VIOLET, ms: 600 });
        await ctx.sleep(900); res.textContent = 'suma/región'; k.pop(res, 500); kp[1].set('0'); kp[2].set('≈ 1/3', 'ok');
        ctx.log('Con 3 executors el trabajo ha tardado aproximadamente un tercio. Más executors, más particiones a la vez.', 'ok');
      }
    };
  })());

  /* ---------- Kubernetes: mantener las réplicas ---------- */
  reg('contenedores', 'kubernetes', (function () {
    let k, desiredT, ctl, pods, kp, scan;
    const POS = [[300, 14], [300, 92], [300, 170], [468, 52], [468, 132]];
    function addPod(slot, name, state) {
      const p = POS[slot], s = k.server(p[0], p[1], 150, 70, name, { cpu: false, state: state || 'boot' });
      s.text('contenedor'); const cube = k.g(p[0] + 120, p[1] + 40); S('path', { d: 'M0 -9 L9 -4 L9 6 L0 11 L-9 6 L-9 -4 Z M0 1 L0 11 M0 1 L9 -4 M0 1 L-9 -4', fill: 'none', stroke: K.BLUE, 'stroke-width': 1.6 }, cube);
      k.pop(s.g, 550); k.pop(cube, 550); s.slot = slot; s.cube = cube; pods.push(s); return s;
    }
    return {
      setup: function (ctx) {
        k = kit(ctx, 262); pods = [];
        POS.forEach(function (p) { S('rect', { x: p[0], y: p[1], width: 150, height: 70, rx: 10, 'class': 'slot' }, k.svg); });
        k.card(14, 40, 130, 150); k.T(79, 62, 'Estado deseado', 't-sm', 'middle'); desiredT = k.T(79, 125, '3', 't-xl', 'middle'); desiredT.style.fontSize = '54px'; k.T(79, 150, 'réplicas', 't-sm', 'middle');
        ctl = k.g(210, 115); S('circle', { r: 34, fill: '#f5f3ff', stroke: K.VIOLET, 'stroke-width': 2, 'class': 'card' }, ctl);
        scan = S('path', { d: 'M0 0 L0 -30 A30 30 0 0 1 26 -15 Z', fill: K.VIOLET, opacity: .25, 'class': 'spin' }, ctl); k.T(0, 4, 'Controlador', 't-b', 'middle', ctl).style.fontSize = '9.5px';
        k.line(144, 115, 176, 115, 'flowl'); k.line(244, 115, 298, 115, 'flowl');
        kp = k.kpis([['pods en marcha', '0'], ['deseados', '3'], ['servicio disponible', '—']]);
      },
      run: async function (ctx) {
        ctx.log('kubectl apply: declaras que quieres 3 réplicas de la aplicación.'); await ctx.sleep(900);
        ctx.log('El controlador ve 0 pods y 3 deseados: crea 3.', 'info'); k.ring(210, 115, K.VIOLET, 30);
        for (let i = 0; i < 3; i++) { addPod(i, 'pod-' + (i + 1)); await ctx.sleep(450); }
        await ctx.sleep(500); pods.forEach(function (p) { p.state('on'); }); kp[0].set('3', 'ok'); kp[2].set('sí', 'ok');
        ctx.log('Hay 3 pods ejecutando. Estado real = estado deseado.', 'ok'); await ctx.sleep(1100);
        const bad = pods[1]; ctx.log('El pod-2 se cuelga (falla su comprobación de salud).', 'err'); bad.state('dead'); k.shake(bad.g); bad.text('¡no responde!'); kp[0].set('2', 'warn'); await ctx.sleep(1200);
        ctx.log('El controlador detecta 2 pods sanos frente a 3 deseados y crea uno nuevo.', 'warn'); k.ring(210, 115, K.RED, 30); await ctx.sleep(700);
        bad.g.classList.add('gone'); await ctx.sleep(500); bad.g.remove(); bad.cube.remove(); pods.splice(1, 1);
        const n = addPod(1, 'pod-4'); await ctx.sleep(900); n.state('on'); kp[0].set('3', 'ok');
        ctx.log('Recuperado de forma automática: nadie ha tenido que intervenir y el servicio no se ha parado.', 'ok'); await ctx.sleep(1200);
        ctx.log('Llega más tráfico: kubectl scale --replicas=5. Cambia el estado deseado.', 'info'); desiredT.textContent = '5'; k.pop(desiredT, 500); kp[1].set('5'); await ctx.sleep(900);
        addPod(3, 'pod-5'); await ctx.sleep(600); addPod(4, 'pod-6'); await ctx.sleep(1100);
        pods.forEach(function (p) { p.state('on'); }); kp[0].set('5', 'ok');
        ctx.log('5 pods en marcha. Declaras qué quieres y Kubernetes se encarga de cómo conseguirlo y mantenerlo.', 'ok');
      }
    };
  })());
})(window.CEDI);
