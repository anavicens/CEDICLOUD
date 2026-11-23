/* Servicio IA: entrenamiento en paralelo, inferencia (endpoint con autoescalado) y pipeline de datos a endpoint. */
(function (C) {
  const S = C.stage, esc = C.esc;
  const f2 = function (n) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const nf = function (n, d) { return n.toLocaleString('es-ES', { maximumFractionDigits: d == null ? 0 : d }); };

  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function box(ctx, parent, title, sub, blocks) {
    const el = ctx.el('div', 'cn', parent, '<h5><span>' + esc(title) + '</span><span class="badge"></span></h5><small style="color:var(--muted);font-size:11px">' + esc(sub || '') + '</small><div class="queue"></div><div class="readout">—</div>');
    const o = { box: el, b: el.querySelector('.badge'), sub: el.querySelector('small'), q: el.querySelector('.queue'), out: el.querySelector('.readout'), blk: [] };
    for (let i = 0; i < (blocks || 0); i++) o.blk.push(ctx.el('i', 'blk', o.q));
    return o;
  }
  function setQueue(ctx, o, n, cls) {
    o.q.innerHTML = ''; o.blk = [];
    for (let i = 0; i < n; i++) o.blk.push(ctx.el('i', 'blk' + (cls ? ' ' + cls : ''), o.q));
  }

  /* ====================================================================
     1. Entrenar un modelo en paralelo
     ==================================================================== */
  const PY1 =
    "# Entrenamiento distribuido con paralelismo de datos\n" +
    "trabajo = aiplatform.CustomJob(\n" +
    "    nombre='clasificador-ventas',\n" +
    "    maquina='gpu', num_gpus=4)\n\n" +
    "for epoca in range(4):\n" +
    "    # cada GPU calcula el gradiente de SU cuarto de los datos\n" +
    "    grad = modelo.gradiente(lote_local)\n" +
    "    # all-reduce: se promedian los gradientes de las 4 GPU\n" +
    "    grad = all_reduce(grad, op='media')\n" +
    "    modelo.actualizar(grad)";
  const LOSS = [1.0, 0.62, 0.41, 0.30, 0.24];
  let s1 = null;
  const ex1 = {
    id: 'entrenar', label: 'Entrenar un modelo en paralelo',
    desc: 'Los datos se reparten entre 4 GPU y se sincronizan los gradientes en cada vuelta',
    code: PY1,
    setup: function (ctx) {
      s1 = {};
      s1.hub = box(ctx, null, 'Modelo (parámetros)', 'una sola versión compartida', 0);
      s1.hub.out.textContent = 'pesos v0';
      s1.g = ctx.el('div', 'g4', null); s1.w = [];
      for (let i = 0; i < 4; i++) s1.w.push(box(ctx, s1.g, 'GPU ' + (i + 1), '25 % de los datos', 6));
      const row = ctx.el('div', 'hrow', null, '<span class="hl">Pérdida</span><div class="hbar"><i></i></div><span class="hv">—</span>');
      s1.bar = row.querySelector('i'); s1.bv = row.querySelector('.hv');
      s1.stats = ctx.el('div', 'stats', null);
      s1.ep = stat(ctx, s1.stats, 'época', '0 / 4'); s1.ls = stat(ctx, s1.stats, 'pérdida (error)', '—'); s1.t = stat(ctx, s1.stats, 'tiempo estimado', '—');
    },
    run: async function (ctx) {
      const w = s1.w;
      ctx.log('Entrenar = ajustar los parámetros del modelo para que el error (la pérdida) baje. Con muchos datos una sola GPU tardaría horas.');
      await ctx.sleep(700);
      ctx.log('Paralelismo de datos: cada GPU tiene una copia del modelo y un cuarto de los datos.', 'dim');
      for (let e = 0; e < 4; e++) {
        ctx.log('Época ' + (e + 1) + ': cada GPU calcula el gradiente (hacia dónde corregir los pesos) con sus datos.');
        s1.ep.v.textContent = (e + 1) + ' / 4';
        w.forEach(function (o) { o.box.classList.add('active'); o.out.textContent = 'calculando…'; });
        for (let k = 0; k < 6; k++) { w.forEach(function (o) { o.blk[k].classList.add('done'); }); await ctx.sleep(150); }
        await Promise.all(w.map(function (o, i) { return S.fly(ctx, o.box, s1.hub.box, 'grad ' + (i + 1), ''); }));
        w.forEach(function (o) { o.box.classList.remove('active'); o.out.textContent = 'esperando…'; });
        s1.hub.box.classList.add('active'); s1.hub.out.textContent = 'promediando 4 gradientes';
        if (e === 0) ctx.log('All-reduce: los 4 gradientes se promedian y todas las GPU necesitan el mismo resultado. Aquí se espera al más lento.', 'warn');
        await ctx.sleep(500);
        await Promise.all(w.map(function (o) { return S.fly(ctx, s1.hub.box, o.box, 'pesos', 'ok'); }));
        s1.hub.box.classList.remove('active'); s1.hub.out.textContent = 'pesos v' + (e + 1);
        w.forEach(function (o) { o.out.textContent = 'pesos v' + (e + 1); o.blk.forEach(function (b) { b.classList.remove('done'); }); });
        s1.ls.v.textContent = f2(LOSS[e + 1]); s1.bv.textContent = f2(LOSS[e + 1]);
        s1.bar.style.width = (LOSS[e + 1] * 100) + '%';
        ctx.log('Pérdida: ' + f2(LOSS[e]) + ' → ' + f2(LOSS[e + 1]) + '.', 'ok');
        await ctx.sleep(300);
      }
      s1.bar.className = 'ok';
      s1.t.v.textContent = '2 h 40 min'; s1.t.classList.add('ok');
      ctx.log('Con 1 GPU el entrenamiento llevaría ≈ 8 h; con 4 GPU ≈ 2 h 40 min (cifras de ejemplo): aceleración 3×, no 4×.', 'info');
      ctx.log('Por qué no 4×: sincronizar gradientes cuesta tiempo, igual que viste en Computación. La eficiencia baja al subir el número de GPU.', 'warn');
      ctx.log('Se paga por el tiempo de GPU usado: al acabar el trabajo, las máquinas se apagan.', 'dim');
    }
  };

  /* ====================================================================
     2. Servir una predicción (inferencia)
     ==================================================================== */
  const PY2 =
    "# El modelo entrenado se publica como endpoint\n" +
    "endpoint = modelo.deploy(\n" +
    "    min_replicas=1, max_replicas=3)\n\n" +
    "# Una petición de predicción (inferencia)\n" +
    "resultado = endpoint.predict(instances=[{'imagen': 'foto.jpg'}])\n" +
    "print(resultado)       # {'clase': 'gato', 'prob': 0.97}";
  let s2 = null;
  const ex2 = {
    id: 'inferencia', label: 'Servir una predicción (inferencia)',
    desc: 'Un endpoint recibe peticiones y el autoescalado añade réplicas cuando hay mucha demanda',
    code: PY2,
    setup: function (ctx) {
      s2 = {};
      s2.cli = ctx.el('div', 'cli', null, '<b>Aplicación</b><span>pide predicciones</span><span class="ans">—</span>');
      s2.cli.ans = s2.cli.querySelector('.ans');
      s2.ep = box(ctx, null, 'Endpoint /predict', 'balanceador: reparte entre réplicas', 0);
      s2.ep.out.textContent = 'https://…/v1/predict';
      s2.g = ctx.el('div', 'g3', null); s2.r = [];
      for (let i = 0; i < 3; i++) s2.r.push(box(ctx, s2.g, 'Réplica ' + (i + 1), 'copia del modelo en una GPU', 0));
      s2.r.forEach(function (o, i) { if (i === 0) { S.badge(o.b, 'activa', 'ok'); o.out.textContent = 'sin cola'; } else { o.box.classList.add('off'); S.badge(o.b, 'apagada', ''); o.out.textContent = '—'; } });
      s2.stats = ctx.el('div', 'stats', null);
      s2.lat = stat(ctx, s2.stats, 'latencia por petición', '—'); s2.rep = stat(ctx, s2.stats, 'réplicas activas', '1'); s2.rps = stat(ctx, s2.stats, 'peticiones por segundo', '0');
    },
    run: async function (ctx) {
      const r = s2.r;
      ctx.log('El modelo ya está entrenado. Servirlo = dejarlo cargado en una máquina esperando peticiones. Eso es la inferencia.');
      await ctx.sleep(700);
      ctx.log('Una petición: la aplicación envía una imagen y recibe la predicción.');
      await S.fly(ctx, s2.cli, s2.ep.box, 'foto.jpg', '');
      await S.fly(ctx, s2.ep.box, r[0].box, 'foto.jpg', '');
      r[0].box.classList.add('active'); r[0].out.textContent = 'calculando…'; await ctx.sleep(400);
      await S.fly(ctx, r[0].box, s2.cli, 'gato 0,97', 'ok');
      r[0].box.classList.remove('active'); r[0].out.textContent = 'sin cola';
      s2.cli.ans.textContent = '{clase: gato, prob: 0,97}'; s2.lat.v.textContent = '≈ 80 ms'; s2.rps.v.textContent = '1';
      ctx.log('Respuesta en ≈ 80 ms. Inferir es mucho más barato que entrenar: solo se aplica el modelo, no se ajusta.', 'ok');
      await ctx.sleep(900);

      ctx.log('Llega un pico: 300 peticiones por segundo y hay una sola réplica.', 'warn');
      s2.rps.v.textContent = '300';
      for (let n = 2; n <= 12; n += 2) {
        setQueue(ctx, r[0], n); r[0].out.textContent = 'cola: ' + n * 25 + ' peticiones';
        s2.lat.v.textContent = '≈ ' + (80 + n * 70) + ' ms'; await ctx.sleep(200);
      }
      s2.lat.classList.add('hi'); S.badge(r[0].b, 'saturada', 'err');
      ctx.log('La cola crece y la latencia se multiplica por 10: los usuarios esperan casi un segundo.', 'err');
      await ctx.sleep(700);
      ctx.log('Autoescalado: la carga supera el 80 %, así que se arrancan dos réplicas más.');
      for (let i = 1; i < 3; i++) { r[i].box.classList.remove('off'); r[i].box.classList.add('warmup'); S.badge(r[i].b, 'arrancando', 'warn'); r[i].out.textContent = 'cargando el modelo…'; }
      await ctx.sleep(1500);
      ctx.log('Arrancar tarda unos segundos (cargar el modelo en memoria): el escalado no es instantáneo.', 'dim');
      for (let i = 1; i < 3; i++) { r[i].box.classList.remove('warmup'); S.badge(r[i].b, 'activa', 'ok'); }
      r.forEach(function (o) { setQueue(ctx, o, 4); o.out.textContent = 'cola: 100 peticiones'; });
      S.badge(r[0].b, 'activa', 'ok');
      s2.lat.classList.remove('hi'); s2.lat.v.textContent = '≈ 120 ms'; s2.rep.v.textContent = '3'; s2.lat.classList.add('ok');
      ctx.log('El balanceador reparte las peticiones: 3 réplicas, latencia otra vez baja (≈ 120 ms).', 'ok');
      await ctx.sleep(1000);
      ctx.log('Pasa el pico y baja el tráfico: sobran réplicas.');
      s2.rps.v.textContent = '2';
      for (let i = 1; i < 3; i++) { r[i].box.classList.add('off'); S.badge(r[i].b, 'apagada', ''); setQueue(ctx, r[i], 0); r[i].out.textContent = '—'; }
      setQueue(ctx, r[0], 0); r[0].out.textContent = 'sin cola'; s2.rep.v.textContent = '1'; s2.lat.v.textContent = '≈ 80 ms';
      ctx.log('Vuelve a 1 réplica (mínimo configurado): solo se paga por las réplicas encendidas.', 'info');
      ctx.log('Si quieres cero latencia de arranque, mantén mínimo 1 réplica; si prefieres ahorrar, acepta un arranque en frío.', 'dim');
    }
  };

  /* ====================================================================
     3. Pipeline: datos → modelo → endpoint
     ==================================================================== */
  const PY3 =
    "# Pipeline de ML (cada paso es un contenedor)\n" +
    "@pipeline(cuenta='sa-pipeline@mi_proyecto')\n" +
    "def flujo():\n" +
    "    datos   = leer('gs://curso-bigdata-ventas/clean/')\n" +
    "    feats   = preparar(datos)\n" +
    "    modelo  = entrenar(feats, gpus=4)\n" +
    "    metrica = evaluar(modelo)\n" +
    "    if metrica.exactitud >= 0.90:\n" +
    "        registrar(modelo, version='v2')\n" +
    "        desplegar(modelo, endpoint='ventas')";
  const STEPS = [
    ['1 · Datos', 'Leer la capa depurada del lago'],
    ['2 · Preparar', 'Limpiar y crear variables (features)'],
    ['3 · Entrenar', '4 GPU en paralelo'],
    ['4 · Evaluar', 'Probar con datos que no ha visto'],
    ['5 · Registrar', 'Guardar la versión del modelo'],
    ['6 · Desplegar', 'Publicar el endpoint']
  ];
  let s3 = null;
  const ex3 = {
    id: 'pipeline', label: 'Pipeline: datos → modelo → endpoint',
    desc: 'Todos los pasos encadenados, con una puerta de calidad antes de publicar',
    code: PY3,
    setup: function (ctx) {
      s3 = { st: [] };
      ctx.el('div', 'cli', null, '<b>Cuenta de servicio</b><span>sa-pipeline · lee la capa depurada y usa la plataforma de IA (nada más)</span>');
      STEPS.forEach(function (s) {
        const p = ctx.el('div', 'phase pstep', null, '<div class="phase-h"><b>' + esc(s[0]) + '</b><small>' + esc(s[1]) + '</small></div><div class="wrk-row"><span class="badge">pendiente</span><span class="rd" style="font:600 11.5px var(--mono);color:var(--ink-2)"></span></div>');
        s3.st.push({ box: p, b: p.querySelector('.badge'), rd: p.querySelector('.rd') });
      });
    },
    run: async function (ctx) {
      const st = s3.st;
      async function step(i, ms, txt) {
        st[i].box.classList.add('active'); S.badge(st[i].b, 'en curso', 'warn'); if (txt) st[i].rd.textContent = txt;
        await ctx.sleep(ms);
        st[i].box.classList.remove('active');
      }
      function ok(i, txt) { S.badge(st[i].b, 'hecho', 'ok'); if (txt) st[i].rd.textContent = txt; }
      ctx.log('El pipeline encadena los pasos para que sean repetibles y automáticos. Se ejecuta con una cuenta de servicio con los permisos justos (IAM).');
      await ctx.sleep(700);
      ctx.log('Paso 1: lee datos de la capa depurada del lago (no de la bruta).');
      await step(0, 900, 'clean/ · 3 GB Parquet'); ok(0);
      await S.fly(ctx, st[0].box, st[1].box, 'datos', '');
      ctx.log('Paso 2: prepara las variables que usa el modelo.');
      await step(1, 1000, '48 variables'); ok(1);
      await S.fly(ctx, st[1].box, st[2].box, 'features', '');
      ctx.log('Paso 3: entrena con 4 GPU (como en el ejemplo de entrenamiento paralelo).');
      await step(2, 1400, 'candidato v1'); ok(2);
      await S.fly(ctx, st[2].box, st[3].box, 'modelo v1', '');
      ctx.log('Paso 4: evalúa con datos que el modelo no vio al entrenar.');
      await step(3, 900, 'exactitud 0,86');
      S.badge(st[3].b, 'no pasa', 'err'); S.flash(st[3].box, false, 1600);
      ctx.log('0,86 < 0,90 (umbral de calidad): el pipeline no registra ni despliega. Un modelo malo no llega a producción.', 'err');
      await ctx.sleep(1000);
      ctx.log('Se ajusta (más datos, mejores variables) y el pipeline se ejecuta de nuevo.', 'dim');
      for (let i = 1; i < 4; i++) { S.badge(st[i].b, 'pendiente', ''); st[i].rd.textContent = ''; }
      await step(1, 700, '60 variables'); ok(1);
      await S.fly(ctx, st[1].box, st[2].box, 'features', '');
      await step(2, 1000, 'candidato v2'); ok(2);
      await S.fly(ctx, st[2].box, st[3].box, 'modelo v2', '');
      await step(3, 700, 'exactitud 0,92'); ok(3); S.flash(st[3].box, true);
      ctx.log('0,92 ≥ 0,90: supera la puerta de calidad.', 'ok');
      await S.fly(ctx, st[3].box, st[4].box, 'modelo v2', 'ok');
      ctx.log('Paso 5: se guarda como versión v2 en el registro de modelos (permite volver a la anterior).');
      await step(4, 700, 'v2 registrado'); ok(4);
      await S.fly(ctx, st[4].box, st[5].box, 'v2', 'ok');
      ctx.log('Paso 6: se publica el endpoint, listo para recibir peticiones de inferencia.');
      await step(5, 900, 'endpoint «ventas» activo'); ok(5); S.flash(st[5].box, true);
      ctx.log('De datos a servicio sin pasos manuales: IA usa el almacenamiento (lago), la computación (GPU en paralelo) y IAM (cuenta de servicio) de los demás servicios.', 'info');
      ctx.log('Cifras de ejemplo.', 'dim');
    }
  };

  C.registerConsole('ia', { lang: 'python', examples: [ex1, ex2, ex3] });
})(window.CEDI);
