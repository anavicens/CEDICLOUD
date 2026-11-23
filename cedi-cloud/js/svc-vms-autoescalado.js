/* Sección 6 · Máquinas virtuales y autoescalado. */
(function (C) {
  const S = C.stage, esc = C.esc;
  const nf = function (n, d) { return n.toLocaleString('es-ES', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 2 : d }); };
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('autoescalado', 'Autoescalado', 'computo',
      'El servicio añade o quita máquinas solo, según una métrica (por ejemplo, la CPU media). Sube cuando hay picos y baja cuando pasan, de modo que pagas lo que usas.',
      'Autoscaler de grupos de instancias gestionados', 'EC2 Auto Scaling', 'Virtual Machine Scale Sets', { alias: ['auto scaling', 'escalado automático', 'pico de carga', 'elasticidad'] }),
    C.concept('esc-vertical', 'Escalado vertical frente a horizontal', 'computo',
      'Vertical: usar una máquina más grande (más núcleos y memoria); tiene un tope y suele exigir reiniciar. Horizontal: añadir más máquinas iguales detrás de un balanceador; casi no tiene techo y tolera fallos.',
      'Cambiar tipo de máquina / grupo de instancias', 'Cambiar tipo de instancia / Auto Scaling Group', 'Cambiar tamaño de VM / Scale Sets', { alias: ['scale up', 'scale out', 'escalar', 'más núcleos'] }),
    C.concept('tipo-maquina', 'Tipo de máquina (núcleos y memoria)', 'computo',
      'Combinación de vCPU y memoria RAM que eliges para una VM. Más recursos rinden más, pero cuestan más por hora.',
      'Tipos de máquina de Compute Engine (e2, n2…)', 'Tipos de instancia de EC2 (t3, m5…)', 'Tamaños de VM (Standard_D…)', { alias: ['vcpu', 'ram', 'machine type', 'instancia', 'cores'] })
  ]);
  C.addService({
    id: 'vms-autoescalado', cat: 'Computación', name: 'VMs y autoescalado', sub: 'Tamaño, picos y escalado', icon: 'cpu', part: 13,
    lead: 'Crea máquinas virtuales eligiendo su tamaño, deja que el autoescalado reaccione a los picos de carga y compara escalar en vertical con escalar en horizontal.',
    def: 'Máquinas virtuales a la carta, agrupadas tras un balanceador, que se añaden o retiran automáticamente según la carga para mantener el rendimiento y controlar el coste.',
    gcp: 'Compute Engine y grupos de instancias con autoescalado', aws: 'EC2 y Auto Scaling Groups', azure: 'Virtual Machines y Scale Sets',
    sla: '99,99 %',
    concepts: ['autoescalado', 'esc-vertical', 'tipo-maquina', 'balanceador', 'zona'],
    planned: ['Crear una VM: núcleos y memoria', 'Pico de carga: más máquinas', 'Bajada de carga: menos máquinas', 'Vertical frente a horizontal'],
    kw: ['vm', 'máquina virtual', 'compute engine', 'ec2', 'autoescalado', 'autoscaling', 'escalado', 'vertical', 'horizontal', 'núcleos', 'memoria', 'pico', 'elasticidad']
  });
  C.addEquivalences([{ need: 'Autoescalado de VMs', gcp: 'Autoscaler de MIG', aws: 'EC2 Auto Scaling', azure: 'VM Scale Sets', src: 'extra' }]);

  /* ---------- 1. Crear una VM ---------- */
  const TYPES = [
    { n: 'e2-small', c: 2, m: 2, p: 0.017 }, { n: 'e2-standard-4', c: 4, m: 16, p: 0.134 }, { n: 'e2-standard-8', c: 8, m: 32, p: 0.268 }
  ];
  const SH1 =
    "gcloud compute instances create analisis-1 \\\n" +
    "  --zone=europe-west1-b \\\n" +
    "  --machine-type=e2-standard-4 \\\n" +
    "  --image-family=debian-12 --boot-disk-size=50GB";
  let s1 = null;
  const ex1 = {
    id: 'crear-vm', label: 'Crear una VM: núcleos y memoria', desc: 'Compara tamaños y arranca la máquina elegida',
    code: SH1,
    quiz: [
      { q: 'Tu proceso necesita mucha memoria pero poca CPU. ¿Qué haces?', o: ["Elegir el más barato siempre","Añadir discos","Elegir un tipo con más RAM por núcleo"], x: "GEcFSxdRQE0QRhcQfgIcRA9MDgUDHAVeElIGRQmqjBIZBhsFXhJZEQwBB1kCCA4GREwSWwYICxtEAkBPFERuYmNDCkQMXBYFAxwGX1NSAhZfSV4GTAoZDUpXFhAAA6qXDUwDFEROU0QEBEpLUA==" },
      { q: '¿Cuándo se paga una VM?', o: ["Por el tiempo que está encendida (por hora o segundo)","Solo una vez al crearla","Nunca"], x: "GEcFSxdTQE0QRhcQdxMEAwhfDw1PFhFMXFIMRQoGDRAJTwAXTBJEBgERCkhDCQNVB0JBQgZFAAwNAAMCBRFZU1UKptcHA0ER" }
    ],
    setup: function (ctx) {
      s1 = { t: [] };
      const g = ctx.el('div', 'g3', null);
      TYPES.forEach(function (t) { const c = node(ctx, g, t.n, t.c + ' vCPU · ' + t.m + ' GB'); c.appendChild(ctx.el('div', 'vm', null, '<span>' + nf(t.p, 3) + ' $/h</span><small>≈ ' + nf(t.p * 730, 0) + ' $/mes</small>')); s1.t.push(c); });
      s1.stats = ctx.el('div', 'stats', null);
      s1.a = stat(ctx, s1.stats, 'estado', 'sin crear'); s1.b = stat(ctx, s1.stats, 'vCPU / memoria', '—'); s1.c = stat(ctx, s1.stats, 'coste por hora', '—');
    },
    run: async function (ctx) {
      ctx.log('Tres tamaños posibles. Cada uno combina núcleos (vCPU) y memoria con un precio por hora (de ejemplo).'); await ctx.sleep(900);
      for (let i = 0; i < 3; i++) { s1.t[i].classList.add('active'); await ctx.sleep(450); s1.t[i].classList.remove('active'); }
      ctx.log('El análisis necesita unos 12 GB de memoria: e2-small se queda corta y e2-standard-8 sobra. Elegimos e2-standard-4.', 'info'); await ctx.sleep(800);
      s1.t[1].classList.add('active'); s1.b.v.textContent = '4 / 16 GB'; s1.c.v.textContent = '0,134 $';
      s1.a.v.textContent = 'aprovisionando…'; ctx.log('Reservando capacidad en la zona europe-west1-b…'); await ctx.sleep(900);
      s1.a.v.textContent = 'arrancando…'; ctx.log('Creando disco de 50 GB y copiando la imagen Debian 12…'); await ctx.sleep(900);
      s1.a.v.textContent = 'en ejecución'; s1.a.classList.add('ok'); S.flash(s1.t[1], true);
      ctx.log('analisis-1 está en ejecución. Se factura mientras esté encendida: apagarla al terminar ahorra dinero.', 'ok');
    }
  };

  /* ---------- helper de flota con balanceador ---------- */
  function fleetScene(ctx) {
    const g = ctx.el('div', 'net n2', null);
    const cl = node(ctx, g, 'Usuarios', 'carga'), lb = node(ctx, g, 'Balanceador', 'reparte'), fl = node(ctx, g, 'Grupo de VMs', 'autoescalado');
    const o = { cl: cl.appendChild(ctx.el('div', 'vm', null, '<span>peticiones</span><small id="rps">0 /s</small>')), lb: lb.appendChild(ctx.el('div', 'vm', null, '<span>LB</span><small>activo</small>')), fleet: ctx.el('div', 'fleet', fl), vms: [] };
    o.rps = o.cl.querySelector('small');
    o.stats = ctx.el('div', 'stats', null);
    o.a = stat(ctx, o.stats, 'máquinas', '1'); o.b = stat(ctx, o.stats, 'CPU media', '0 %'); o.c = stat(ctx, o.stats, 'coste por hora', '0,05 $');
    return o;
  }
  function addVm(ctx, o) { const i = o.vms.length + 1, e = ctx.el('div', 'vm', o.fleet, '<span>vm-' + i + '</span><small>CPU 0 %</small><i></i>'); o.vms.push(e); return e; }
  function setLoad(o, load) {   // load = trabajo total en "máquinas completas"
    const n = o.vms.length, per = Math.min(1.3, load / n);
    o.vms.forEach(function (e) {
      const p = Math.round(Math.min(100, per * 100));
      e.querySelector('small').textContent = 'CPU ' + p + ' %'; const b = e.querySelector('i'); b.style.width = p + '%'; b.className = p >= 85 ? 'hot' : '';
      e.classList.toggle('hot', p >= 85); e.classList.toggle('warm', p >= 65 && p < 85);
    });
    o.a.v.textContent = n; o.b.v.textContent = Math.round(Math.min(100, per * 100)) + ' %'; o.c.v.textContent = nf(n * 0.05, 2) + ' $'; o.rps.textContent = Math.round(load * 100) + ' /s';
    return per;
  }

  /* ---------- 2. Pico de carga ---------- */
  const SH2 =
    "gcloud compute instance-groups managed set-autoscaling web-mig \\\n" +
    "  --min-num-replicas=1 --max-num-replicas=6 \\\n" +
    "  --target-cpu-utilization=0.60 --cool-down-period=60";
  let s2 = null;
  const ex2 = {
    id: 'pico', label: 'Pico de carga: nacen máquinas', desc: 'La CPU se dispara y el autoescalador añade VMs detrás del balanceador',
    code: SH2,
    quiz: [
      { q: 'La CPU media supera el objetivo del 60 %. ¿Qué hace el autoescalador?', o: ["Añade máquinas al grupo","Borra los datos","Apaga el balanceador"], x: "GEcFSxdTQE0QRhcQdREABUlfoMUfGQ1OU0VDDQUaWQJMHgABDV5XQyY0PA0OCQscBQ1EQwYJEgwNAAkdFgUNVlMPRQsLRwYYBgMLDRpeAhYQCA0GAE8Yp4xKXw4KRApCDQoGEhFfU1IMTEpLUA==" },
      { q: '¿Para qué sirve fijar un máximo de máquinas?', o: ["No sirve","Para limitar el coste ante picos inesperados","Para ir más lento"], x: "GEcFSxdSQE0QRhcQcxUMEAgNBQ0MARFfU0VDAQEaTwwPDhEFXhJFCkUIBUgEDU8ACg1GRKDEAgBODEwOG6eeX1cPCkpLUA==" }
    ],
    setup: function (ctx) { s2 = fleetScene(ctx); addVm(ctx, s2); setLoad(s2, 0.35); },
    run: async function (ctx) {
      ctx.log('Un grupo con 1 VM. Objetivo: mantener la CPU media alrededor del 60 %. Mínimo 1 máquina, máximo 6.'); await ctx.sleep(900);
      const prof = [0.4, 0.8, 1.6, 2.6, 3.4, 3.4, 3.4];
      for (let t = 0; t < prof.length; t++) {
        let per = setLoad(s2, prof[t]); ctx.log('Carga: ' + Math.round(prof[t] * 100) + ' peticiones/s → CPU media ' + Math.round(per * 100) + ' %.', per > 0.85 ? 'err' : per > 0.65 ? 'warn' : '');
        await ctx.sleep(700);
        while (per > 0.65 && s2.vms.length < 6) {
          ctx.log('CPU por encima del objetivo (60 %): el autoescalador crea una VM nueva.', 'warn');
          await ctx.sleep(500); const e = addVm(ctx, s2); await S.fly(ctx, s2.lb, e, 'nueva', 'ok');
          ctx.log('vm-' + s2.vms.length + ' arrancada y registrada en el balanceador.', 'ok'); per = setLoad(s2, prof[t]); await ctx.sleep(500);
        }
      }
      s2.b.classList.add('hi');
      ctx.log('El pico se absorbe con ' + s2.vms.length + ' máquinas. Sin autoescalado habría que tener todas encendidas siempre, o caer.', 'info');
    }
  };

  /* ---------- 3. Bajada de carga ---------- */
  const SH3 =
    "# Escalado a la baja: se retiran máquinas cuando la CPU media lleva un rato por debajo del objetivo\n" +
    "gcloud compute instance-groups managed describe web-mig --format='value(autoscaler)'\n" +
    "gcloud compute instance-groups managed resize web-mig --size=2";
  let s3 = null;
  const ex3 = {
    id: 'bajada', label: 'Bajada de carga: se apagan máquinas', desc: 'Pasa el pico y el grupo se encoge, con un tiempo de espera',
    code: SH3,
    quiz: [
      { q: '¿Por qué el escalado a la baja espera un rato antes de actuar?', o: ["Para cobrar más","Por pereza","Para no quitar máquinas ante una bajada pasajera"], x: "GEcFSxdRQE0QRhcQcw9FAQdLEQUOGA1IXEIMRQEfRBcNTxoXTltaAgYNBkMGH1VVBe6DVwcMFklUQx0aHBBMQBYOpsUYWAoCDgZEXltYQxUFG0wRQk0I" },
      { q: 'Al retirar una VM, ¿qué debe pasar antes con sus peticiones en curso?', o: ["Duplicarse","Terminar o redirigirse (drenaje de conexiones)","Perderse"], x: "GEcFSxdSQE0QRhcQcw9FBghBAgIMEAVJXURDAQEDTEMIClUBQ0RfAhcIDA0XHqzUAkRRWUMLEQxbDEwWVQFeQlMRBEQIDRIZClUFTlNUBkUIBg0SGQpVEERXWAZLRhQ=" }
    ],
    setup: function (ctx) { s3 = fleetScene(ctx); for (let i = 0; i < 5; i++) addVm(ctx, s3); setLoad(s3, 3.2); },
    run: async function (ctx) {
      ctx.log('El grupo tiene 5 VMs tras el pico. La carga empieza a bajar.'); await ctx.sleep(900);
      const prof = [2.4, 1.6, 1.0, 0.7, 0.5];
      for (let t = 0; t < prof.length; t++) {
        let per = setLoad(s3, prof[t]); ctx.log('Carga: ' + Math.round(prof[t] * 100) + ' peticiones/s → CPU media ' + Math.round(per * 100) + ' %.', per < 0.4 ? 'dim' : '');
        await ctx.sleep(800);
        while (per < 0.4 && s3.vms.length > 1) {
          ctx.log('CPU baja de forma sostenida: tras el tiempo de enfriamiento se retira una VM.', 'warn'); await ctx.sleep(900);
          const e = s3.vms.pop(); ctx.log(e.querySelector('span').textContent + ': el balanceador deja de enviarle tráfico y la apaga.', 'info');
          e.style.opacity = '.3'; await ctx.sleep(600); e.remove(); per = setLoad(s3, prof[t]); await ctx.sleep(300);
        }
      }
      s3.c.classList.add('hi');
      ctx.log('De 5 máquinas a ' + s3.vms.length + ': el coste por hora baja de 0,25 $ a ' + nf(s3.vms.length * 0.05, 2) + ' $. La elasticidad es pagar solo lo que hace falta.', 'ok');
    }
  };

  /* ---------- 4. Vertical frente a horizontal ---------- */
  const SH4 =
    "# Vertical: cambiar el tamaño de UNA máquina (hay que pararla)\n" +
    "gcloud compute instances stop web-1\n" +
    "gcloud compute instances set-machine-type web-1 --machine-type=e2-standard-8\n\n" +
    "# Horizontal: más máquinas iguales\n" +
    "gcloud compute instance-groups managed resize web-mig --size=4";
  let s4 = null;
  const ex4 = {
    id: 'vertical-horizontal', label: 'Vertical frente a horizontal', desc: 'Una máquina mayor o varias iguales: qué pasa con el tope y con los fallos',
    code: SH4,
    quiz: [
      { q: '¿Qué escalado tiene un tope por el tamaño máximo de máquina?', o: ["Ninguno","El horizontal","El vertical"], x: "GEcFSxdRQE0QRhcQYw0ERBpCDw1PGKeMQ0MKCwVJQwxMHwABSVcWABcBCkgRTAYbAEhUXw0MAAhABgIbEF8NU/XSBAAAX0MBrNQVWFtYAhZEGu7OQk0I" },
      { q: 'Una máquina cae. ¿Qué diseño aguanta mejor?', o: ["Una gigante","Da igual","Varias máquinas pequeñas (horizontal)"], x: "GEcFSxdRQE0QRhcQdQwLRB9MEQUOBkRf8Z8TCQ0KTBBATxkFDVFXoMgACA0HCU8ACkwSRQwJC0lfBggaFgENXldDBgUZTAAFCxQAFhJVDAtEHEMCTBwaCEwSW6DEFRxEDQ1DVQdMV0VDAQEFDRcDCxpKD08=" }
    ],
    setup: function (ctx) {
      s4 = {};
      const g = ctx.el('div', 'g3', null);
      s4.v = node(ctx, g, 'Vertical', 'una máquina más grande'); s4.h = node(ctx, g, 'Horizontal', 'más máquinas iguales');
      s4.vb = ctx.el('div', 'sizebox', s4.v); s4.hb = ctx.el('div', 'sizebox', s4.h);
      s4.vm = ctx.el('div', 'big', s4.vb, '2 vCPU<br>4 GB'); s4.vm.style.width = '70px'; s4.vm.style.height = '40px';
      s4.hv = [ctx.el('div', 'big', s4.hb, '2 vCPU<br>4 GB')]; s4.hv[0].style.width = '70px'; s4.hv[0].style.height = '40px';
      s4.stats = ctx.el('div', 'stats', null);
      s4.a = stat(ctx, s4.stats, 'capacidad vertical', '1×'); s4.b = stat(ctx, s4.stats, 'capacidad horizontal', '1×'); s4.c = stat(ctx, s4.stats, 'si falla una máquina', '—');
    },
    run: async function (ctx) {
      ctx.log('Partimos de una VM de 2 vCPU y 4 GB. La demanda se va a multiplicar. Dos estrategias.'); await ctx.sleep(900);
      ctx.log('Vertical: paramos la VM y la cambiamos por un tipo mayor.', 'info');
      s4.vm.style.opacity = '.4'; ctx.log('Parada necesaria: el servicio no responde durante el cambio.', 'warn'); await ctx.sleep(900);
      s4.vm.style.opacity = '1'; s4.vm.innerHTML = '8 vCPU<br>32 GB'; s4.vm.style.width = '120px'; s4.vm.style.height = '80px'; s4.a.v.textContent = '4×'; await ctx.sleep(700);
      ctx.log('Capacidad ×4 con una sola máquina. Si hace falta ×16, se acaba la gama: hay un tope.', 'warn'); await ctx.sleep(900);
      ctx.log('Horizontal: añadimos máquinas iguales detrás de un balanceador, sin parar nada.', 'info');
      for (let i = 0; i < 3; i++) { const e = ctx.el('div', 'big', s4.hb, '2 vCPU<br>4 GB'); e.style.width = '70px'; e.style.height = '40px'; s4.hv.push(e); s4.b.v.textContent = (i + 2) + '×'; await ctx.sleep(600); }
      ctx.log('Capacidad ×4 sin parar el servicio, y se puede seguir añadiendo.', 'ok'); await ctx.sleep(900);
      ctx.log('¿Y si falla una máquina? Vertical: se cae todo (era la única).', 'err'); s4.vm.style.opacity = '.2'; s4.vm.style.background = '#fecaca'; await ctx.sleep(900);
      s4.hv[1].style.opacity = '.2'; s4.hv[1].style.background = '#fecaca';
      ctx.log('Horizontal: se pierde un 25 % de capacidad pero el servicio sigue.', 'ok'); s4.c.v.textContent = 'V: caída · H: −25 %'; s4.c.classList.add('hi');
      ctx.log('Por eso en la nube se prefiere escalar en horizontal; el vertical es útil para cargas que no se pueden repartir (p. ej. una base de datos única).', 'info');
    }
  };

  C.registerConsole('vms-autoescalado', { lang: 'bash', examples: [ex2, ex3, ex4] });
})(window.CEDI);
