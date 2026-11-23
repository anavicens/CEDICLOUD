/* Sección 2 · Facturación: calculadora de costes simulados, presupuesto con alertas, consulta con y sin filtro de partición. */
(function (C) {
  const S = C.stage, esc = C.esc;
  const fm = function (n, d) { return n.toLocaleString('es-ES', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + ' $'; };

  C.addConcepts([
    C.concept('presupuesto', 'Presupuesto y alertas', 'nube',
      'Importe mensual que te fijas como límite orientativo. El servicio avisa cuando el gasto llega a ciertos porcentajes (50 %, 90 %, 100 %), pero por defecto no apaga nada.',
      'Cloud Billing: presupuestos y alertas', 'AWS Budgets', 'Azure Cost Management: presupuestos', { alias: ['budget', 'alerta de coste', 'gasto'] }),
    C.concept('capa-gratuita', 'Capa gratuita', 'nube',
      'Cantidad de uso que no se factura cada mes (por ejemplo, el primer TiB consultado en el almacén de datos) o durante un periodo de prueba.',
      'Free Tier de Google Cloud', 'AWS Free Tier', 'Cuenta gratuita de Azure', { alias: ['free tier', 'gratis'] })
  ]);
  C.addService({
    id: 'facturacion', cat: 'Gestión y costes', name: 'Facturación', sub: 'Costes simulados y presupuesto', icon: 'table', part: 9,
    lead: 'En la nube se paga por uso. Aquí calculas el coste de almacenar, consultar y tener máquinas encendidas, y ves cómo salta una alerta cuando se supera el presupuesto.',
    def: 'Muestra cuánto cuesta cada servicio (almacenamiento por clase, bytes leídos en consultas, horas de máquina) y permite fijar presupuestos con alertas. Las cifras de esta consola son simuladas.',
    gcp: 'Cloud Billing', aws: 'Billing and Cost Management', azure: 'Cost Management + Billing',
    sla: '99,9 %',
    concepts: ['pago-por-uso', 'presupuesto', 'capa-gratuita', 'clase-almacenamiento', 'poda', 'particion'],
    planned: ['Calculadora de costes', 'Alerta de presupuesto', 'Misma consulta con y sin filtro de partición', 'Almacenamiento por clase: guardar barato, leer caro'],
    kw: ['coste', 'precio', 'presupuesto', 'billing', 'factura', 'gasto', 'euros', 'dólares', 'alerta']
  });
  C.addEquivalences([{ need: 'Facturación y costes', gcp: 'Cloud Billing', aws: 'Billing and Cost Management', azure: 'Cost Management + Billing', src: 'extra' }]);

  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  const PRICE = { std: 0.020, near: 0.010, cold: 0.004, arch: 0.0012 };   // $/GB·mes (ejemplo)
  const QPRICE = 6.25, VM = 0.13;                                            // $/TiB leído · $/hora por máquina (ejemplo)
  const NOTE = 'Precios de ejemplo para practicar; los reales cambian según proveedor y región.';

  /* ====================================================================
     1. Calculadora de costes
     ==================================================================== */
  const SH1 =
    "# Estimar el coste mensual antes de desplegar\n" +
    "# Almacenamiento: GB x precio de la clase\n" +
    "# Consultas: TiB leídos x 6,25 $ (el primer TiB al mes es gratis)\n" +
    "# Máquinas: nº de máquinas x horas encendidas x precio/hora\n\n" +
    "gcloud billing budgets create --billing-account=ABC-123 \\\n" +
    "  --display-name='curso-bigdata' --budget-amount=250USD";
  let s1 = null;
  const ROWS1 = [
    { k: 'std', l: 'Standard', u: 'GB', max: 20000, step: 100, v: 500, price: PRICE.std, grp: 's' },
    { k: 'near', l: 'Nearline', u: 'GB', max: 20000, step: 100, v: 2000, price: PRICE.near, grp: 's' },
    { k: 'cold', l: 'Coldline', u: 'GB', max: 20000, step: 100, v: 5000, price: PRICE.cold, grp: 's' },
    { k: 'arch', l: 'Archive', u: 'GB', max: 20000, step: 100, v: 10000, price: PRICE.arch, grp: 's' },
    { k: 'tib', l: 'Consultas', u: 'TiB leídos', max: 50, step: 0.5, v: 3, grp: 'q' },
    { k: 'vm', l: 'Máquinas', u: 'máquinas', max: 10, step: 1, v: 2, grp: 'm' },
    { k: 'hr', l: 'Horas encendidas', u: 'h/mes', max: 730, step: 10, v: 730, grp: 'm' }
  ];
  function calc1() {
    const g = {}; ROWS1.forEach(function (r) { g[r.k] = +r.input.value; });
    const st = g.std * PRICE.std + g.near * PRICE.near + g.cold * PRICE.cold + g.arch * PRICE.arch;
    const q = Math.max(0, g.tib - 1) * QPRICE, m = g.vm * g.hr * VM, tot = st + q + m;
    ROWS1.forEach(function (r) {
      r.val.textContent = nfmt(+r.input.value) + ' ' + (r.u === 'GB' ? 'GB' : r.u === 'TiB leídos' ? 'TiB' : r.u === 'máquinas' ? 'uds' : 'h');
      let c = 0;
      if (r.grp === 's') c = +r.input.value * r.price; else if (r.k === 'tib') c = q; else if (r.k === 'vm') c = m; else c = null;
      r.cost.textContent = c === null ? '' : fm(c);
    });
    s1.a.v.textContent = fm(st); s1.b.v.textContent = fm(q); s1.c.v.textContent = fm(m);
    s1.t.v.textContent = fm(tot);
    const over = tot > 250; s1.t.classList.toggle('hi', over);
    s1.e.v.textContent = over ? 'SUPERADO' : tot > 225 ? 'cerca (90 %)' : 'dentro';
    s1.e.classList.toggle('hi', over); s1.e.classList.toggle('ok', !over && tot <= 225);
    return tot;
  }
  function nfmt(n) { return n.toLocaleString('es-ES', { maximumFractionDigits: 1 }); }
  const ex1 = {
    id: 'calculadora', label: 'Calculadora de costes',
    desc: 'Mueve los deslizadores: almacenamiento por clase, datos leídos y horas de máquina',
    code: SH1,
    quiz: [
      { q: 'En la calculadora, ¿qué parte suele disparar el coste si hay muchas máquinas encendidas?', o: ["Las horas de máquina","El primer TiB consultado","El almacenamiento Archive"], x: "GEcFSxdTQE0QRhcQegIWRATuwh0aHApMQRYQAEQKQgEeDhtEXV1EQw0LG0xDCQEWAUNWXwcEX0lAFg8HFBcNX/XCFBEAQwIfTwELSV0WBglEBEgQTB8QF0xcFg4QBwFCTU4S" },
      { q: 'Se supera el presupuesto de 250 $. ¿Qué hace por defecto el servicio?', o: ["Borrar los datos","Avisar con una alerta","Apagar todos los recursos"], x: "GEcFSxdSQE0QRhcQegwWRBlfBh8aBRFIQUIMFkQIWwofDhtfDVNGAgIFGw0RCQwAFl5dRUMXARhYCgkdEERMR0IMCAUdRBkNHRkLDVNGAhcQDANBEQ==" }
    ],
    setup: function (ctx) {
      s1 = {};
      s1.calc = ctx.el('div', 'calc', null);
      ROWS1.forEach(function (r) {
        const row = ctx.el('div', 'calc-row', s1.calc, '<span class="cl">' + esc(r.l) + '<small>' + esc(r.grp === 's' ? 'almacenamiento' : r.grp === 'q' ? 'consultas' : 'máquinas') + '</small></span><input type="range" min="0" max="' + r.max + '" step="' + r.step + '" value="0" aria-label="' + esc(r.l) + '"><span class="cv"></span><span class="cc"></span>');
        r.input = row.querySelector('input'); r.val = row.querySelector('.cv'); r.cost = row.querySelector('.cc');
        r.input.addEventListener('input', function () { calc1(); });
      });
      s1.s1 = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.s1, 'almacenamiento', '0,00 $'); s1.b = stat(ctx, s1.s1, 'consultas', '0,00 $'); s1.c = stat(ctx, s1.s1, 'máquinas', '0,00 $');
      s1.s2 = ctx.el('div', 'stats', null);
      s1.t = stat(ctx, s1.s2, 'total del mes', '0,00 $'); s1.p = stat(ctx, s1.s2, 'presupuesto', '250,00 $'); s1.e = stat(ctx, s1.s2, 'estado', 'dentro');
      ctx.el('div', 'flow-note', null, NOTE);
      calc1();
    },
    run: async function (ctx) {
      async function tween(r, to, msg, kind) {
        if (msg) ctx.log(msg, kind);
        for (let i = 1; i <= 8; i++) { r.input.value = String(to * i / 8); calc1(); await ctx.sleep(70); }
        r.input.value = String(to); calc1(); await ctx.sleep(350);
      }
      ROWS1.forEach(function (r) { r.input.value = '0'; }); calc1();
      ctx.log('Escenario del mes del curso: datos en las cuatro clases de almacenamiento, consultas en el almacén de datos y dos máquinas.');
      await ctx.sleep(600);
      await tween(ROWS1[0], 500, 'Standard (acceso frecuente): 500 GB a 0,020 $ por GB·mes.');
      await tween(ROWS1[1], 2000, 'Nearline (acceso mensual): 2.000 GB a 0,010 $.');
      await tween(ROWS1[2], 5000, 'Coldline (acceso trimestral): 5.000 GB a 0,004 $.');
      await tween(ROWS1[3], 10000, 'Archive (casi sin acceso): 10.000 GB a 0,0012 $. Guardar es baratísimo; leer no lo es.');
      ctx.log('Almacenamiento total: ' + s1.a.v.textContent + '. Con 17.500 GB, la clase más barata aguanta la mayor parte.', 'ok');
      await tween(ROWS1[4], 3, 'Consultas: 3 TiB leídos. Se paga por bytes leídos (6,25 $ por TiB) y el primer TiB del mes es gratis: (3 − 1) × 6,25 $.');
      await tween(ROWS1[5], 2, 'Dos máquinas virtuales.');
      await tween(ROWS1[6], 730, 'Encendidas las 730 horas del mes: 2 × 730 h × 0,13 $/h.', 'warn');
      ctx.log('Total: ' + s1.t.v.textContent + '. La parte de máquinas es la mayor: lo que está encendido sin usarse cuesta igual.', 'info');
      if (s1.t.classList.contains('hi')) ctx.log('Presupuesto de 250 $ superado: salta la alerta de facturación.', 'err');
      ctx.log('Ahora puedes mover los deslizadores. Por ejemplo, baja las horas a 260 (solo horario laboral) y mira cuánto baja el total.', 'dim');
    }
  };

  /* ====================================================================
     2. Alerta de presupuesto
     ==================================================================== */
  const SH2 =
    "# Presupuesto de 100 $ con alertas al 50 %, 90 % y 100 %\n" +
    "gcloud billing budgets create \\\n" +
    "  --billing-account=ABC-123 --display-name='curso' \\\n" +
    "  --budget-amount=100USD \\\n" +
    "  --threshold-rule=percent=0.5 \\\n" +
    "  --threshold-rule=percent=0.9 \\\n" +
    "  --threshold-rule=percent=1.0";
  let s2 = null;
  const ex2 = {
    id: 'presupuesto', label: 'Alerta de presupuesto',
    desc: 'Un mes de gasto diario con un error el día 22: ¿cuándo salta cada aviso?',
    code: SH2,
    quiz: [
      { q: 'Un presupuesto con alertas, ¿detiene por sí mismo el gasto al llegar al 100 %?', o: ["No, solo avisa","Sí, borra el proyecto","Sí, apaga todo"], x: "GEcFSxdTQE0QRhcQegIWRAhBBh4bFBcNU0AKFgUHFkMICgEBQ1dEQxcBClgRHwAGREhKXwQARBxDAkwOABBCX1cXDB4ITgqv3BtETFZfAAwLB0wPQk0I" },
      { q: '¿Para qué sirve la previsión de gasto a fin de mes?', o: ["Para avisar antes de pasarte","Para bajar el precio","Para cambiar de región"], x: "GEcFSxdTQE0QRhcQZQpFCAgNEx4ADAFOUV+g1gpJXhYcCgcFDVdaQxUWDF4WHBoQF1ldGkMVEQxJBh9PBwFMUVUKCgoIX0MNAQEBXhJSBkUVHEhDGAoHCURcU0MACElABh9BVxk=" }
    ],
    setup: function (ctx) {
      s2 = { bars: [] };
      s2.stats = ctx.el('div', 'stats', null);
      s2.a = stat(ctx, s2.stats, 'gasto acumulado', '0,00 $'); s2.b = stat(ctx, s2.stats, 'del presupuesto (100 $)', '0 %'); s2.c = stat(ctx, s2.stats, 'previsión a fin de mes', '—');
      const row = ctx.el('div', 'hrow', null, '<span class="hl">Presupuesto</span><div class="hbar"><i></i><span class="th" style="left:50%"></span><span class="th" style="left:90%"></span></div><span class="hv">0 / 100 $</span>');
      row.style.gridTemplateColumns = '82px minmax(0, 1fr) 100px';
      s2.bar = row.querySelector('i'); s2.bv = row.querySelector('.hv');
      s2.cols = ctx.el('div', 'dcols', null);
      for (let i = 0; i < 30; i++) { const b = ctx.el('i', '', s2.cols); b.style.height = '0%'; b.title = 'día ' + (i + 1); s2.bars.push(b); }
      ctx.el('div', 'flow-note', null, 'Cada barra es el gasto de un día (cifras de ejemplo)');
      s2.al = ctx.el('div', 'alerts', null);
    },
    run: async function (ctx) {
      ctx.log('Presupuesto del mes: 100 $, con alertas al 50 %, 90 % y 100 %. El gasto normal es de unos 3 $ al día (almacenamiento y una máquina pequeña).');
      await ctx.sleep(700);
      let cum = 0; const fired = {};
      for (let d = 1; d <= 30; d++) {
        let day = 3.0, spike = false;
        if (d === 22) { day += 56.25; spike = true; }
        cum += day;
        s2.bars[d - 1].style.height = Math.min(100, day / 60 * 100 + 4) + '%'; if (spike) s2.bars[d - 1].classList.add('spike');
        s2.a.v.textContent = fm(cum); const pct = cum / 100 * 100; s2.b.v.textContent = Math.round(pct) + ' %';
        s2.bar.style.width = Math.min(100, pct) + '%'; s2.bar.className = pct >= 100 ? 'hot' : pct >= 90 ? 'wait' : ''; s2.bv.textContent = fm(cum, 0) + ' / 100 $';
        const fc = d < 22 ? cum / d * 30 : cum / d * 30;
        s2.c.v.textContent = d >= 3 ? fm(fc, 0) : '—'; s2.c.classList.toggle('hi', fc > 100);
        if (spike) ctx.log('Día 22: un script lanza 3 consultas sin filtro de partición, leyendo 3 TB cada una (3 × 18,75 $).', 'err');
        [[50, 'Alerta 50 %: ya llevas la mitad del presupuesto (día ' + d + ').', ''], [90, 'Alerta 90 %: casi agotado (día ' + d + ').', ''], [100, 'Presupuesto SUPERADO el día ' + d + ': el gasto ya pasa de 100 $.', 'hot']].forEach(function (t) {
          if (pct >= t[0] && !fired[t[0]]) {
            fired[t[0]] = 1; ctx.el('div', 'alertbox ' + t[2], s2.al, '<b>Aviso por correo · </b>' + esc(t[1]));
            ctx.log(t[1], t[0] === 100 ? 'err' : 'warn');
          }
        });
        await ctx.sleep(110);
      }
      await ctx.sleep(500);
      ctx.log('Final de mes: ' + fm(cum) + ' frente a 100 $ de presupuesto. Sin la consulta del día 22 habrían sido unos 102 $.', 'info');
      ctx.log('Los avisos no frenan el gasto: solo informan. Para frenarlo hay que automatizar una acción (apagar recursos) o poner cuotas.', 'warn');
      ctx.log('Consejo: la previsión de fin de mes sube en cuanto hay un pico y permite reaccionar antes de pasarte.', 'dim');
    }
  };

  /* ====================================================================
     3. Misma consulta con y sin filtro de partición
     ==================================================================== */
  const SQL3 =
    "-- A: con filtro de partición (lee 1 de 1.095 particiones)\n" +
    "SELECT SUM(importe) FROM ventas\n" +
    "WHERE fecha = '2026-11-16' AND ciudad = 'Madrid';\n\n" +
    "-- B: sin filtro de partición (lee las 1.095 particiones)\n" +
    "SELECT SUM(importe) FROM ventas\n" +
    "WHERE ciudad = 'Madrid';";
  let s3 = null;
  function qcard(ctx, parent, title, sql) {
    const el = ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '</h5><div class="qbox" style="font-size:11px">' + esc(sql) + '</div><div class="hbar"><i></i></div><div class="readout">sin ejecutar</div>');
    return { box: el, bar: el.querySelector('i'), out: el.querySelector('.readout') };
  }
  const ex3 = {
    id: 'filtro', label: 'Misma consulta con y sin filtro de partición', lang: 'sql',
    desc: 'La diferencia de un WHERE sobre la fecha: bytes leídos y dinero',
    code: SQL3,
    quiz: [
      { q: 'La consulta B no filtra por fecha. ¿Por qué cuesta tanto más?', o: ["Lee todas las particiones","Devuelve más filas","Usa otra región"], x: "GEcFSxdTQE0QRhcQZQoLRA9EDxgdGkRdXURDCQVJTgwAGhgKTBJSBkUUCF8XBQwcp55cFg0KRBpIQxwaEABIEkYMAQUbDRpMHBBEQVdTDUVXSXkhQk0I" },
      { q: '¿Cómo evitas que alguien lance una consulta sin filtro de fecha?', o: ["Cambiar de clase de almacenamiento","Apagar el presupuesto","require_partition_filter"], x: "GEcFSxdRQE0QRhcQcxAERAZdAAWsxgoNVlNDCQVJWQIOAxREX1dVCwQeCA0AAwEGEUFGVxBFFwBDQwoGGRBfXRYTChZJQQJMDBoIWF9YAkUADA0TDR0BDU5b9dALSktQ" }
    ],
    setup: function (ctx) {
      s3 = {};
      s3.two = ctx.el('div', 'two', null);
      s3.a = qcard(ctx, s3.two, 'A · con filtro de fecha', "WHERE fecha = '2026-11-16'");
      s3.b = qcard(ctx, s3.two, 'B · sin filtro de fecha', "WHERE ciudad = 'Madrid'");
      s3.stats = ctx.el('div', 'stats', null);
      s3.sa = stat(ctx, s3.stats, 'coste A (1 ejecución)', '—'); s3.sb = stat(ctx, s3.stats, 'coste B (1 ejecución)', '—'); s3.sr = stat(ctx, s3.stats, 'B cuesta … veces A', '—');
      s3.al = ctx.el('div', 'alerts', null);
    },
    run: async function (ctx) {
      ctx.log('La tabla ventas tiene 3 años: 1.095 particiones diarias de ≈ 2,7 GB (3 TB). Se cobran 6,25 $ por TiB leído.');
      await ctx.sleep(800);
      ctx.log('Consulta A: filtra por fecha, el motor poda y lee 1 partición.');
      s3.a.bar.style.width = '2%'; s3.a.out.textContent = 'lee 2,7 GB';
      await ctx.sleep(900);
      const ca = 2.7 / 1024 * QPRICE; s3.sa.v.textContent = fm(ca); s3.a.out.textContent = 'lee 2,7 GB · ' + fm(ca);
      ctx.log('Coste de A: 2,7 GB ≈ ' + fm(ca) + ' (menos de 2 céntimos).', 'ok');
      await ctx.sleep(900);
      ctx.log('Consulta B: filtra solo por ciudad. No hay filtro por la columna de partición, así que lee todo.');
      s3.b.bar.style.width = '100%'; s3.b.bar.className = 'hot'; s3.b.out.textContent = 'lee 3 TB';
      await ctx.sleep(1200);
      const cb = 3072 / 1024 * QPRICE; s3.sb.v.textContent = fm(cb); s3.sb.classList.add('hi'); s3.b.out.textContent = 'lee 3 TB · ' + fm(cb);
      s3.sr.v.textContent = '≈ ' + Math.round(cb / ca) + '×'; s3.sr.classList.add('hi');
      ctx.log('Coste de B: 3 TB = ' + fm(cb) + '. La misma respuesta para Madrid cuesta más de mil veces más.', 'err');
      await ctx.sleep(1000);
      ctx.log('Ahora imagina que un panel ejecuta la consulta 20 veces al día durante 30 días: 600 ejecuciones (sin contar el TiB gratis).');
      await ctx.sleep(500);
      for (let i = 1; i <= 10; i++) {
        s3.a.out.textContent = Math.round(600 * i / 10) + ' ejecuciones · ' + fm(ca * 600 * i / 10); s3.b.out.textContent = Math.round(600 * i / 10) + ' ejecuciones · ' + fm(cb * 600 * i / 10, 0);
        await ctx.sleep(120);
      }
      ctx.log('A: ' + fm(ca * 600) + ' al mes. B: ' + fm(cb * 600, 0) + ' al mes.', 'warn');
      ctx.el('div', 'alertbox hot', s3.al, '<b>Alerta de presupuesto · </b>el gasto de este mes (' + fm(cb * 600, 0) + ') supera el presupuesto de 100 $.');
      ctx.log('Con un presupuesto de 100 $, B salta la alerta casi al instante y A ni se nota.', 'err');
      await ctx.sleep(700);
      ctx.log('Se paga por bytes leídos, no por filas devueltas: un LIMIT no lo arregla. Lo que ayuda: filtrar por la columna de partición y activar require_partition_filter.', 'info');
    }
  };

  /* ====================================================================
     4. Almacenamiento por clase: guardar barato, leer caro
     ==================================================================== */
  const SH4 =
    "# 10 TB de datos: ¿en qué clase?\n" +
    "gcloud storage buckets create gs://curso-datos \\\n" +
    "  --default-storage-class=COLDLINE\n\n" +
    "# Regla de ciclo de vida para enfriar datos antiguos\n" +
    "gcloud storage buckets update gs://curso-datos \\\n" +
    "  --lifecycle-file=ciclo.json";
  const CL4 = [
    { n: 'Standard', st: 10240 * PRICE.std, rd: 0, d: 'sin mínimo' },
    { n: 'Nearline', st: 10240 * PRICE.near, rd: 1024 * 0.01, d: 'mín. 30 d' },
    { n: 'Coldline', st: 10240 * PRICE.cold, rd: 1024 * 0.02, d: 'mín. 90 d' },
    { n: 'Archive', st: 10240 * PRICE.arch, rd: 1024 * 0.05, d: 'mín. 365 d' }
  ];
  let s4 = null;
  const ex4 = {
    id: 'clases', label: 'Almacenamiento por clase: guardar barato, leer caro',
    desc: '10 TB en cada clase: coste de guardar y coste si los lees una vez al mes',
    code: SH4,
    quiz: [
      { q: 'Datos que casi nunca se leen, ¿en qué clase salen más baratos?', o: ["Nearline","Archive","Standard"], x: "GEcFSxdSQE0QRhcQdxEGDABbBkwKBkRBUxYOpsUaDQENHRQQTBJSBkUDHEwRCA4HSA1TFgAKFx1MQwgKVQhIV0RDCKfIXkMPDgcLDUsWBwBEGUgRAQ4bAUNRXwJFCaqADQUCFEoPTw==" },
      { q: 'Si lees todos los meses 1 TB de los 10 TB, ¿qué pasa con Archive?', o: ["No se puede leer","Sigue siendo la más barata","Deja de ser la más barata"], x: "GEcFSxdRQE0QRhcQcw9FBwhfBANPBQtfEloGABZJTgwBHxAKXlMWBglECEUMHh0aRElXFgQQBRtJAh5VVSdCXlIPDAoMDRANAxBEQPGXEEUGCF8CGA5bRlA=" }
    ],
    setup: function (ctx) {
      s4 = { rows: [] };
      ctx.el('div', 'flow-note', null, '10 TB (10.240 GB) · precios de ejemplo · la barra azul es guardar, la ámbar es leer 1 TB');
      CL4.forEach(function (c) {
        const row = ctx.el('div', 'hrow', null, '<span class="hl">' + esc(c.n) + '</span><div class="hbar seg"><i></i><i class="amb"></i></div><span class="hv">—</span>');
        row.style.gridTemplateColumns = '82px minmax(0, 1fr) 128px';
        const bars = row.querySelectorAll('i'); s4.rows.push({ a: bars[0], b: bars[1], v: row.querySelector('.hv') });
      });
      s4.stats = ctx.el('div', 'stats', null);
      s4.x = stat(ctx, s4.stats, 'más barata si no se lee', '—'); s4.y = stat(ctx, s4.stats, 'más barata si se lee 1 TB/mes', '—'); s4.z = stat(ctx, s4.stats, 'ahorro frente a Standard', '—');
    },
    run: async function (ctx) {
      const max = CL4[0].st;
      ctx.log('Tienes 10 TB de datos. Veamos cuánto cuesta guardarlos al mes en cada clase.');
      await ctx.sleep(700);
      CL4.forEach(function (c, i) { s4.rows[i].a.style.width = (c.st / max * 70) + '%'; s4.rows[i].v.textContent = fm(c.st) + ' / mes'; });
      await ctx.sleep(1300);
      ctx.log('Guardar: Standard ' + fm(CL4[0].st) + ', Nearline ' + fm(CL4[1].st) + ', Coldline ' + fm(CL4[2].st) + ', Archive ' + fm(CL4[3].st) + '. Archive es unas 17 veces más barata que Standard.', 'ok');
      s4.x.v.textContent = 'Archive'; s4.x.classList.add('ok'); s4.z.v.textContent = Math.round((1 - CL4[3].st / CL4[0].st) * 100) + ' %';
      await ctx.sleep(1100);
      ctx.log('Pero las clases frías cobran por leer (recuperación) y tienen una permanencia mínima: 30, 90 y 365 días.', 'warn');
      ctx.log('¿Y si cada mes lees 1 TB de esos 10 TB?');
      await ctx.sleep(800);
      CL4.forEach(function (c, i) { s4.rows[i].b.style.width = (c.rd / max * 70) + '%'; s4.rows[i].v.textContent = fm(c.st + c.rd) + ' / mes'; });
      await ctx.sleep(1400);
      const tot = CL4.map(function (c) { return c.st + c.rd; }), best = tot.indexOf(Math.min.apply(null, tot));
      s4.y.v.textContent = CL4[best].n; s4.y.classList.add('ok'); s4.x.classList.remove('ok');
      S.flash(s4.rows[best].v, true);
      ctx.log('Con una lectura al mes: Standard ' + fm(tot[0]) + ', Nearline ' + fm(tot[1]) + ', Coldline ' + fm(tot[2]) + ', Archive ' + fm(tot[3]) + '.', 'info');
      ctx.log('Ahora Coldline sale más barata que Archive: leer con frecuencia hace perder el ahorro de guardar.', 'warn');
      ctx.log('Regla: cuanto menos se lee un dato, más fría debe ser su clase. Una regla de ciclo de vida los va enfriando solos con la edad.', 'info');
    }
  };

  C.registerConsole('facturacion', { lang: 'bash', examples: [ex1, ex3] });
})(window.CEDI);
