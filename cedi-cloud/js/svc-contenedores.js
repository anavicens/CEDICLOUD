/* Sección 13 · Contenedores: imagen, contenedor frente a VM, Kubernetes y despliegue rodante. */
(function (C) {
  const S = C.stage, esc = C.esc;
  function stat(ctx, parent, label, init) {
    const el = ctx.el('div', 'stat', parent, '<b>' + esc(init) + '</b><small>' + esc(label) + '</small>');
    el.v = el.querySelector('b'); return el;
  }
  function node(ctx, parent, title, sub) { return ctx.el('div', 'cn', parent, '<h5>' + esc(title) + '<small>' + esc(sub || '') + '</small></h5>'); }

  C.addConcepts([
    C.concept('contenedor', 'Contenedor e imagen', 'computo',
      'Un contenedor empaqueta una aplicación con sus librerías y se ejecuta aislado compartiendo el sistema operativo del anfitrión. La imagen es la plantilla inmutable a partir de la cual se arrancan los contenedores.',
      'Cloud Run / Artifact Registry', 'ECS, Fargate / ECR', 'Container Apps / ACR', { alias: ['docker', 'dockerfile', 'imagen', 'registro', 'portabilidad'] }),
    C.concept('kubernetes', 'Kubernetes (orquestador de contenedores)', 'computo',
      'Mantiene el estado deseado de una aplicación en contenedores: cuántas réplicas, qué versión. Reinicia los que fallan, escala y actualiza sin parar el servicio.',
      'Google Kubernetes Engine (GKE)', 'Amazon EKS', 'Azure Kubernetes Service (AKS)', { alias: ['k8s', 'pod', 'réplicas', 'despliegue rodante', 'rolling update', 'orquestador', 'estado deseado'] })
  ]);
  C.addService({
    id: 'contenedores', cat: 'Computación', name: 'Contenedores', sub: 'Docker y Kubernetes', icon: 'cpu', part: 19,
    lead: 'Empaqueta una aplicación en una imagen, compara contenedores con máquinas virtuales y mira cómo Kubernetes mantiene las réplicas y actualiza sin cortes.',
    def: 'Los contenedores empaquetan una aplicación con todo lo que necesita y arrancan en segundos; un orquestador como Kubernetes los reparte, los repara y los actualiza.',
    gcp: 'GKE, Cloud Run, Artifact Registry', aws: 'EKS, ECS/Fargate, ECR', azure: 'AKS, Container Apps, ACR',
    sla: '99,95 %',
    concepts: ['contenedor', 'kubernetes', 'esc-vertical', 'autoescalado', 'balanceador'],
    planned: ['Imagen y contenedores', 'Contenedor frente a máquina virtual', 'Kubernetes: réplicas y fallos', 'Despliegue rodante y vuelta atrás'],
    kw: ['contenedor', 'docker', 'dockerfile', 'imagen', 'kubernetes', 'k8s', 'gke', 'eks', 'aks', 'pod', 'réplicas', 'cloud run', 'fargate', 'rolling update']
  });
  C.addEquivalences([{ need: 'Kubernetes gestionado', gcp: 'GKE', aws: 'EKS', azure: 'AKS', src: 'extra' }, { need: 'Contenedores sin servidores', gcp: 'Cloud Run', aws: 'Fargate', azure: 'Container Apps', src: 'extra' }]);

  /* ---------- 1. Imagen y contenedores ---------- */
  const SH1 =
    "# Dockerfile\n" +
    "FROM python:3.12-slim\n" +
    "COPY requirements.txt .\n" +
    "RUN pip install -r requirements.txt\n" +
    "COPY app.py .\n" +
    "CMD [\"python\", \"app.py\"]\n\n" +
    "# docker build -t europe-docker.pkg.dev/curso/ventas:1.0 .\n" +
    "# docker run -d ventas:1.0";
  let s1 = null;
  const ex1 = {
    id: 'imagen', lang: 'bash', label: 'De la imagen a los contenedores', desc: 'Una imagen por capas y varios contenedores arrancados desde ella',
    code: SH1,
    quiz: [
      { q: '¿Qué relación hay entre imagen y contenedor?', o: ["La imagen es un tipo de disco","El contenedor es una instancia en ejecución de una imagen","Son lo mismo"], x: "GEcFSxdSQE0QRhcQcgZFEQdMQwEGBglMEl8OBAMMQ0MfClUUWFdSBgtECF8RDQEWBV8SWxYGDAZeQw8AGxBIXFMHChYMXkMFC7bNQ0ZfAAoXRw8e" },
      { q: '¿Qué ventaja da empaquetar la aplicación con sus librerías?', o: ["Funciona igual en tu portátil y en la nube","No necesita sistema operativo","Ocupa menos que el código"], x: "GEcFSxdTQE0QRhcQegJFDQRMBAkBVQhBV0ACRRAGSQxMAxpEQ1dVBhYFG0QMQE8UF+6fFhIQAUleBkwKAw1ZUxYGCUSrhgYCTxgNDV/1whQRAEMCTAkACk5bWQ0EptIDQRE=" }
    ],
    setup: function (ctx) {
      s1 = { c: [] };
      const g = ctx.el('div', 'net', null);
      s1.f = node(ctx, g, 'Dockerfile', 'receta'); s1.i = node(ctx, g, 'Imagen', 'capas de solo lectura'); s1.r = node(ctx, g, 'Contenedores', 'en ejecución');
      s1.fT = ['FROM python:3.12-slim', 'RUN pip install …', 'COPY app.py', 'CMD python app.py'].map(function (x) { return ctx.el('div', 'vm', s1.f, '<span>' + esc(x) + '</span><small>pendiente</small>'); });
      s1.stats = ctx.el('div', 'stats', null); s1.a = stat(ctx, s1.stats, 'capas de la imagen', '0'); s1.b = stat(ctx, s1.stats, 'contenedores en marcha', '0'); s1.cc = stat(ctx, s1.stats, 'tamaño de la imagen', '—');
    },
    run: async function (ctx) {
      ctx.log('docker build lee el Dockerfile y construye la imagen capa a capa.'); await ctx.sleep(800);
      const sizes = ['45 MB', '180 MB', '181 MB', '181 MB'];
      for (let i = 0; i < 4; i++) {
        s1.fT[i].classList.add('sick'); s1.fT[i].querySelector('small').textContent = 'ejecutando'; await ctx.sleep(600);
        s1.fT[i].classList.remove('sick'); s1.fT[i].querySelector('small').textContent = 'hecho'; s1.fT[i].style.borderColor = '#10b981';
        await S.fly(ctx, s1.fT[i], s1.i, 'capa ' + (i + 1), ''); ctx.el('div', 'vm', s1.i, '<span>capa ' + (i + 1) + '</span><small>' + sizes[i] + '</small>'); s1.a.v.textContent = i + 1; s1.cc.v.textContent = sizes[i];
      }
      ctx.log('Imagen ventas:1.0 lista y subida al registro de imágenes. Es inmutable: no cambia una vez construida.', 'ok'); await ctx.sleep(800);
      for (let k = 1; k <= 3; k++) {
        await S.fly(ctx, s1.i, s1.r, 'run', 'ok'); ctx.el('div', 'vm', s1.r, '<span>ventas-' + k + '</span><small>en ejecución</small>'); s1.b.v.textContent = k;
        ctx.log('Contenedor ventas-' + k + ' arrancado desde la misma imagen.', 'ok');
      }
      s1.b.classList.add('hi');
      ctx.log('Tres contenedores idénticos a partir de una imagen. Las capas comunes se comparten, por eso arrancan en segundos y ocupan poco.', 'info');
    }
  };

  /* ---------- 2. Contenedor frente a VM ---------- */
  const SH2 =
    "# Una VM arranca un sistema operativo completo; un contenedor comparte el del anfitrión\n" +
    "gcloud compute instances create web-vm --machine-type=e2-small     # ~ 40-60 s\n" +
    "docker run -d ventas:1.0                                           # ~ 1 s";
  let s2 = null;
  const ex2 = {
    id: 'vm-contenedor', lang: 'bash', label: 'Contenedor frente a máquina virtual', desc: 'Tiempo de arranque, tamaño y cuántos caben en el mismo servidor',
    code: SH2,
    quiz: [
      { q: '¿Qué comparten los contenedores de un mismo servidor?', o: ["El núcleo del sistema operativo del anfitrión","Toda la memoria","El código de la aplicación"], x: "GEcFSxdTQE0QRhcQdQIBBUlODAIbEApIVlkRRQgFSBUNTwYRXhJaCgcWDF+gwQ4GSA1CUxEKRBxeAkwKGURGV0QNAAhJSQYATxQKS1tCEQyn2kNYTB8aFg1XRQxFFAxeAkwCAAdFXRYOAAoGXkMdGhBEWFxXQzMpRw8e" },
      { q: '¿Qué aporta más aislamiento?', o: ["Es igual","Un contenedor","Una máquina virtual"], x: "GEcFSxdRQE0QRhcQdQIBBUl7LkwbHAFDVxYQEEQZXwwcBhpEXltFFwAJCA0MHAoHBVlbQAxeRAxBQw0GBghMX18GCxAGDQcJTwAKDVFZDREBB0gHAx1VAV4SW6DEF0lBCgsKBwsDEEs=" }
    ],
    setup: function (ctx) {
      s2 = {};
      s2.w = ctx.el('div', 'tbl-wrap', null, '<table class="tbl mini"><thead><tr><th></th><th>Máquina virtual</th><th>Contenedor</th></tr></thead><tbody></tbody></table>'); s2.tb = s2.w.querySelector('tbody');
      s2.stats = ctx.el('div', 'stats', null); s2.a = stat(ctx, s2.stats, 'arranque de una VM', '—'); s2.b = stat(ctx, s2.stats, 'arranque de un contenedor', '—'); s2.cc = stat(ctx, s2.stats, 'apps por servidor (ej.)', '—');
    },
    run: async function (ctx) {
      ctx.log('Comparamos las dos formas de ejecutar una aplicación (cifras orientativas).'); await ctx.sleep(800);
      const rows = [['Qué incluye', 'sistema operativo completo + app', 'solo la app y sus librerías'], ['Tamaño típico', '1 – 10 GB', '50 – 500 MB'], ['Arranque', '30 – 60 s', '≈ 1 s'], ['Aislamiento', 'fuerte (propio SO)', 'ligero (comparte el kernel)'], ['Cuántos caben en un servidor', 'unas 10', 'cientos']];
      for (const r of rows) { s2.tb.insertAdjacentHTML('beforeend', '<tr><td><b>' + r[0] + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'); if (r[0] === 'Arranque') { s2.a.v.textContent = '≈ 45 s'; s2.b.v.textContent = '≈ 1 s'; } if (r[0].startsWith('Cuántos')) { s2.cc.v.textContent = '10 VM · 200 cont.'; s2.cc.classList.add('hi'); } await ctx.sleep(850); }
      ctx.log('Un contenedor arranca unas 45 veces antes: encaja con el autoescalado, que necesita réplicas nuevas en segundos.', 'ok');
      ctx.log('Cuándo elegir VM: necesitas otro sistema operativo, aislamiento fuerte o control total del equipo.', 'info');
    }
  };

  /* ---------- 3. Kubernetes: réplicas y fallos ---------- */
  const SH3 =
    "# deployment.yaml (estado deseado: 3 réplicas)\n" +
    "replicas: 3\n" +
    "image: europe-docker.pkg.dev/curso/ventas:1.0\n\n" +
    "kubectl apply -f deployment.yaml\n" +
    "kubectl get pods\n" +
    "kubectl scale deployment ventas --replicas=5";
  let s3 = null;
  const ex3 = {
    id: 'kubernetes', lang: 'bash', label: 'Kubernetes: mantener las réplicas', desc: 'Estado deseado: 3 pods. Uno cae, se recrea y se escala a 5',
    code: SH3,
    quiz: [
      { q: 'Declaras 3 réplicas y un pod falla. ¿Qué hace Kubernetes?', o: ["Crea otro para volver a las 3","Se queda con 2","Apaga la aplicación"], x: "GEcFSxdTQE0QRhcQYw1FBwZDFx4AGQVJXURDBgsEXQIeDlUBQRJTEBEFDUJDHgoUCA1RWQ1FAQUNBwkcEAVJXRYaRQcGXxEFCBBEQVMWBwwCDF8GAgwcBQMQSw==" },
      { q: '¿Qué es un pod?', o: ["Un tipo de disco","La unidad mínima que ejecuta uno o varios contenedores","Una región"], x: "GEcFSxdSQE0QRhcQfRYHARtDBhgKBkRKV0UXDAsHTEMcABEXFhJYDBcJCEEOCQEBAQ1RVwcERBlCB0wKHwFOR0ICRREHDQADAQEBQ1dSDBdEDUhDGBpVBV1eXwAEBwDu0AJBVxk=" }
    ],
    setup: function (ctx) {
      s3 = { p: [] };
      const g = ctx.el('div', 'net n2', null);
      s3.d = node(ctx, g, 'Estado deseado', 'lo que declaras'); s3.c = node(ctx, g, 'Controlador', 'compara y corrige'); s3.f = node(ctx, g, 'Pods', 'estado real');
      s3.dT = ctx.el('div', 'vm', s3.d, '<span>réplicas</span><small>3</small>'); s3.cT = ctx.el('div', 'vm', s3.c, '<span>bucle</span><small>vigilando</small>');
      s3.stats = ctx.el('div', 'stats', null); s3.a = stat(ctx, s3.stats, 'pods en marcha', '0'); s3.b = stat(ctx, s3.stats, 'deseados', '3'); s3.cc = stat(ctx, s3.stats, 'servicio disponible', 'no');
    },
    run: async function (ctx) {
      function upd() { const n = s3.p.filter(function (e) { return !e.classList.contains('down'); }).length; s3.a.v.textContent = n; s3.cc.v.textContent = n > 0 ? 'sí' : 'no'; return n; }
      async function crear(n) { for (let i = 0; i < n; i++) { await S.fly(ctx, s3.cT, s3.f, 'crear', 'ok'); s3.p.push(ctx.el('div', 'vm', s3.f, '<span>pod-' + (s3.p.length + 1) + '</span><small>ejecutando</small>')); upd(); } }
      ctx.log('kubectl apply: declaras que quieres 3 réplicas de la aplicación.'); await ctx.sleep(700);
      ctx.log('El controlador ve 0 pods y 3 deseados: crea 3.', 'info'); await crear(3);
      ctx.log('Hay 3 pods ejecutando. Estado real = estado deseado.', 'ok'); await ctx.sleep(900);
      ctx.log('El pod-2 se cuelga (falla su comprobación de salud).', 'err'); s3.p[1].classList.add('down'); s3.p[1].querySelector('small').textContent = 'caído'; upd(); await ctx.sleep(900);
      ctx.log('El controlador detecta 2 pods sanos frente a 3 deseados y crea uno nuevo.', 'warn'); await S.fly(ctx, s3.cT, s3.f, 'crear', 'ok');
      s3.p[1].remove(); s3.p.splice(1, 1); s3.p.push(ctx.el('div', 'vm', s3.f, '<span>pod-4</span><small>ejecutando</small>')); upd(); ctx.log('Recuperado de forma automática: nadie ha tenido que intervenir y el servicio no se ha parado.', 'ok'); await ctx.sleep(900);
      ctx.log('Llega más tráfico: kubectl scale --replicas=5. Cambia el estado deseado.', 'info'); s3.dT.querySelector('small').textContent = '5'; s3.b.v.textContent = '5'; await ctx.sleep(500);
      await crear(2); s3.a.classList.add('hi');
      ctx.log('5 pods en marcha. Declaras qué quieres y Kubernetes se encarga de cómo conseguirlo y mantenerlo.', 'ok');
    }
  };

  /* ---------- 4. Despliegue rodante y vuelta atrás ---------- */
  const SH4 =
    "kubectl set image deployment/ventas ventas=europe-docker.pkg.dev/curso/ventas:2.0\n" +
    "kubectl rollout status deployment/ventas\n" +
    "kubectl rollout undo deployment/ventas     # volver a la versión anterior";
  let s4 = null;
  const ex4 = {
    id: 'rolling', lang: 'bash', label: 'Despliegue rodante y vuelta atrás', desc: 'Pasar de la v1 a la v2 sin parar el servicio; si falla, se vuelve a la v1',
    code: SH4,
    quiz: [
      { q: '¿Qué es un despliegue rodante (rolling update)?', o: ["Apagar todo y arrancar de nuevo","Sustituir los pods poco a poco por la versión nueva","Borrar la imagen"], x: "GEcFSxdSQE0QRhcQZQoACRlfBkweAAFJU1hDFQsNXkMNGxAKSVtTDQELSUAKCQEBFkxBFhAARAhOFxkOGQ1XU1hDCQsaDQcJArbFXh4WAhanxA0SGQpVCkISXgIcRApCERgKW0ZQ" },
      { q: 'La versión nueva falla sus comprobaciones. ¿Qué conviene hacer?', o: ["Detener el avance y volver a la versión anterior","Eliminar el clúster","Seguir actualizando"], x: "GEcFSxdTQE0QRhcQdQwLRBxDAkwZAAFBRldDBBAb7sIfT10WQl5aAQQHAgRDCQNVF0hAQAoGDQYNFRkKGRJIEldDCQVJWwYeHBynnlwWBhYQCE8PCUFXGQ==" }
    ],
    setup: function (ctx) {
      s4 = { p: [] };
      const g = ctx.el('div', 'fleet', null); s4.g = g;
      for (let i = 0; i < 4; i++) s4.p.push(ctx.el('div', 'vm', g, '<span>pod-' + (i + 1) + '</span><small>v1.0</small>'));
      s4.stats = ctx.el('div', 'stats', null); s4.a = stat(ctx, s4.stats, 'pods en v1', '4'); s4.b = stat(ctx, s4.stats, 'pods en v2', '0'); s4.cc = stat(ctx, s4.stats, 'servicio', 'activo');
    },
    run: async function (ctx) {
      function cnt() { s4.a.v.textContent = s4.p.filter(function (e) { return e.dataset.v === '1'; }).length; s4.b.v.textContent = s4.p.filter(function (e) { return e.dataset.v === '2'; }).length; }
      s4.p.forEach(function (e) { e.dataset.v = '1'; });
      ctx.log('4 pods ejecutan la versión 1.0. Desplegamos la 2.0 sustituyéndolos de uno en uno.'); await ctx.sleep(900);
      for (let i = 0; i < 2; i++) {
        s4.p[i].classList.add('sick'); s4.p[i].querySelector('small').textContent = 'terminando'; await ctx.sleep(600);
        s4.p[i].classList.remove('sick'); s4.p[i].querySelector('small').textContent = 'v2.0 arrancando'; await ctx.sleep(600);
        s4.p[i].querySelector('small').textContent = 'v2.0 sano'; s4.p[i].dataset.v = '2'; s4.p[i].style.borderColor = '#10b981'; cnt();
        ctx.log('pod-' + (i + 1) + ' sustituido por v2.0 y supera su comprobación de salud. Los otros 3 siguen atendiendo.', 'ok');
      }
      ctx.log('El tercer pod de v2.0 no pasa la comprobación de salud (error al arrancar).', 'err');
      s4.p[2].classList.add('sick'); s4.p[2].querySelector('small').textContent = 'v2.0 falla'; await ctx.sleep(1000); s4.p[2].classList.remove('sick'); s4.p[2].classList.add('hot');
      ctx.log('Kubernetes detiene el avance: no sigue sustituyendo pods. El servicio sigue activo con 2 pods en v1 y 2 en v2.', 'warn'); await ctx.sleep(1000);
      ctx.log('kubectl rollout undo: vuelta atrás a la versión 1.0.', 'info');
      for (let i = 0; i < 3; i++) { s4.p[i].classList.remove('hot'); s4.p[i].style.borderColor = ''; if (s4.p[i].dataset.v !== '1') { s4.p[i].querySelector('small').textContent = 'v1.0 arrancando'; await ctx.sleep(500); } s4.p[i].querySelector('small').textContent = 'v1.0'; s4.p[i].dataset.v = '1'; cnt(); }
      s4.a.classList.add('hi');
      ctx.log('Vuelta a 4 pods en v1.0 sin haber cortado el servicio en ningún momento. Es la gran ventaja de desplegar de forma gradual.', 'ok');
    }
  };

  C.registerConsole('contenedores', { lang: 'bash', examples: [ex1, ex3, ex4] });
})(window.CEDI);
