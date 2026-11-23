/* Sección 10 · Herramientas de clase:
   - modo guiado (recorrido paso a paso, una sola vez, al entrar por primera vez en IAM),
   - cuestionario rápido tras cada animación,
   - indicador de servicios visitados y ejemplos completados (guardado en localStorage, dentro de try/catch),
   - informe PDF con todas las preguntas y respuestas, que se descarga al completar todos los ejemplos.
   Se carga antes de los servicios: envuelve registerConsole y mountConsole sin cambiar su comportamiento. */
(function (C) {
  const esc = C.esc, DEFS = {}, KEY = 'cedi.progreso.v1';

  /* ---------- Captura de los ejemplos registrados ---------- */
  const origReg = C.registerConsole;
  C.registerConsole = function (id, def) { DEFS[id] = def; return origReg.apply(this, arguments); };
  C.extraQuizzes = C.extraQuizzes || {};   // 'servicio/ejemplo' -> [{q,o,a,e}] (cuestionarios de los ejemplos antiguos)

  /* ---------- Respuestas codificadas (ofuscación ligera: evita leerlas de un vistazo, no es seguridad real) ---------- */
  const KEYS = 'cedi-cloud-26';
  function dec(it) {
    if (it.x == null) return { a: it.a, e: it.e };
    try {
      const raw = atob(it.x), b = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i) ^ KEYS.charCodeAt(i % KEYS.length);
      return JSON.parse(new TextDecoder().decode(b));
    } catch (e) { return { a: -1, e: '' }; }
  }

  /* ---------- Progreso guardado ---------- */
  let prog = { visited: {}, quiz: {}, answers: {}, tourDone: false, name: '' };
  try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') prog = { visited: p.visited || {}, quiz: p.quiz || {}, answers: p.answers || {}, tourDone: !!p.tourDone, name: p.name || '' }; } } catch (e) { /* sin almacenamiento: se trabaja en memoria */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* ignorar */ } }

  function total() { return C.services.length; }
  function exTotal() { return Object.keys(DEFS).reduce(function (n, k) { return n + (C.serviceById[k] ? DEFS[k].examples.length : 0); }, 0); }
  function exDone() { return Object.keys(prog.answers).filter(function (k) { return prog.answers[k] && prog.answers[k].length; }).length; }
  function complete() { return exTotal() > 0 && exDone() >= exTotal(); }
  function renderProgress() {
    const v = Object.keys(prog.visited).filter(function (k) { return C.serviceById[k]; }).length;
    const d = exDone(), n = exTotal();
    let box = document.getElementById('progress');
    if (!box) {
      const foot = document.querySelector('.side-foot'); if (!foot) return;
      box = document.createElement('div'); box.id = 'progress'; box.className = 'progress'; foot.parentNode.insertBefore(box, foot);
      box.addEventListener('click', function (e) {
        if (e.target.closest('[data-reset]')) { if (window.confirm('¿Borrar tu progreso y tus respuestas de este navegador?')) { prog = { visited: {}, quiz: {}, answers: {}, tourDone: false, name: '' }; save(); renderProgress(); C.toast && C.toast('Progreso reiniciado'); } }
        else if (e.target.closest('[data-pdf]')) askName();
      });
    }
    box.innerHTML = '<b>Progreso</b>: ' + v + ' de ' + total() + ' servicios visitados<br>' + d + ' de ' + n + ' ejemplos con cuestionario' +
      '<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + d + '"><i style="width:' + (n ? Math.round(d / n * 100) : 0) + '%"></i></div>' +
      (d > 0 ? '<button type="button" class="pdf-btn" data-pdf>Descargar informe PDF' + (complete() ? '' : ' (parcial)') + '</button> ' : '<span>Contesta algún cuestionario para poder descargar tu informe PDF.</span> ') +
      '<button type="button" data-reset>Reiniciar</button>';
    document.querySelectorAll('.nav-link[data-route]').forEach(function (a) { a.classList.toggle('visited', !!prog.visited[a.getAttribute('data-route')]); });
  }

  /* ---------- Informe PDF ---------- */
  function buildData(name) {
    const secs = [];
    C.services.forEach(function (svc) {
      const def = DEFS[svc.id]; if (!def) return;
      const items = [];
      def.examples.forEach(function (ex) { const a = prog.answers[svc.id + '/' + ex.id]; if (a && a.length) items.push({ title: ex.label, qs: a }); });
      if (items.length) secs.push({ title: svc.name, items: items });
    });
    return { name: name, done: exDone(), total: exTotal(), date: new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }), sections: secs };
  }
  function download(name) {
    const blob = C.buildReportPDF(buildData(name));
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = 'CEDI-CLOUD-informe-' + (name || 'alumno').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function askName() {
    if (document.getElementById('pdf-modal')) return;
    const m = document.createElement('div'); m.id = 'pdf-modal'; m.className = 'modal-bg';
    m.innerHTML = '<form class="modal" role="dialog" aria-modal="true" aria-label="Descargar informe"><h3>' + (complete() ? '¡Has completado todos los ejemplos!' : 'Informe parcial (' + exDone() + ' de ' + exTotal() + ' ejemplos)') + '</h3>' +
      '<p>Escribe tu nombre y apellidos: aparecerán en el informe PDF con las preguntas que has contestado hasta ahora.</p>' +
      '<input type="text" name="n" required maxlength="80" autocomplete="name" placeholder="Nombre y apellidos" value="' + esc(prog.name) + '">' +
      '<div class="modal-btns"><button type="button" data-x>Cancelar</button><button type="submit" class="primary">Descargar PDF</button></div></form>';
    document.body.appendChild(m);
    const inp = m.querySelector('input'); inp.focus();
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
    m.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); prog.name = inp.value.trim(); save(); download(prog.name); m.remove(); C.toast && C.toast('Informe descargado'); });
  }

  /* ---------- Modo guiado ---------- */
  const STEPS = [
    ['.svc-head .info', 'El icono «i»', 'Pasa el ratón o toca el icono «i»: te da la definición corta y cómo se llama este servicio en Google Cloud, AWS y Azure.'],
    ['.console-examples', 'Los ejemplos', 'Cada botón carga un ejemplo distinto. Empieza por el primero.'],
    ['.code-pane', 'El código', 'Aquí aparece el código de ejemplo (solo lectura). Es lo que ejecutarías en la nube de verdad.'],
    ['.pane-actions', 'Lanzar y velocidad', 'Pulsa «Lanzar» para ver la animación. Con «Velocidad» la haces más lenta o más rápida.'],
    ['.stage-pane', 'Qué pasa por detrás', 'La animación enseña lo que ocurre dentro del servicio mientras se ejecuta el código.'],
    ['.console-log', 'El registro', 'Cada paso queda escrito con su hora: léelo para entender el porqué de lo que ves.'],
    [null, 'Cuestionario e informe', 'Al acabar cada animación aparece un cuestionario rápido. Puedes descargar un PDF con tus preguntas y respuestas en cualquier momento desde el menú lateral; al completar todos los ejemplos se te ofrecerá automáticamente. ¡Listo!']
  ];
  function startTour(root, svc) {
    const old = root.querySelector('.tour'); if (old) old.remove();
    let i = 0; const box = document.createElement('div'); box.className = 'tour'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Visita guiada');
    root.insertBefore(box, root.firstChild);
    function clearHl() { document.querySelectorAll('.tour-hl').forEach(function (e) { e.classList.remove('tour-hl'); }); }
    function close() { clearHl(); box.remove(); }
    function draw() {
      const s = STEPS[i]; clearHl();
      box.innerHTML = '<div><small>Visita guiada · ' + esc(svc.name) + ' · paso ' + (i + 1) + ' de ' + STEPS.length + '</small><br><b>' + esc(s[1]) + '</b></div><div>' + esc(s[2]) + '</div>' +
        '<div class="tour-btns"><button type="button" data-t="prev"' + (i === 0 ? ' disabled' : '') + '>Anterior</button><button type="button" class="primary" data-t="next">' + (i === STEPS.length - 1 ? 'Terminar' : 'Siguiente') + '</button><button type="button" class="skip" data-t="skip">Saltar la visita</button></div>';
      if (s[0]) { const el = document.querySelector(s[0]); if (el) { el.classList.add('tour-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
    }
    box.addEventListener('click', function (e) {
      const b = e.target.closest('[data-t]'); if (!b) return; const a = b.getAttribute('data-t');
      if (a === 'prev') { i = Math.max(0, i - 1); draw(); }
      else if (a === 'next') { if (i >= STEPS.length - 1) close(); else { i++; draw(); } }
      else close();
    });
    draw();
  }

  /* ---------- Cuestionario ---------- */
  function renderQuiz(root, svc, exIdx) {
    const old = root.querySelector('.quiz'); if (old) old.remove();
    const def = DEFS[svc.id], ex = def && def.examples[exIdx]; if (!ex) return;
    const qs0 = ex.quiz || C.extraQuizzes[svc.id + '/' + ex.id]; if (!qs0 || !qs0.length) return;
    const qs = qs0.slice(0, 1);   // una sola pregunta por ejemplo
    const q = document.createElement('div'); q.className = 'quiz'; q.setAttribute('role', 'group'); q.setAttribute('aria-label', 'Cuestionario rápido');
    let answered = 0, right = 0; const rec = [];
    q.innerHTML = '<h4>Comprueba lo que has entendido <small>' + (qs.length === 1 ? '1 pregunta' : qs.length + ' preguntas') + '</small></h4>' + qs.map(function (it, k) {
      return '<div class="qq" data-k="' + k + '"><p>' + (k + 1) + '. ' + esc(it.q) + '</p><div class="qopts">' + it.o.map(function (o, j) { return '<button type="button" data-j="' + j + '">' + esc(o) + '</button>'; }).join('') + '</div><div class="qexp" hidden></div></div>';
    }).join('') + '<div class="qscore" hidden></div>';
    q.addEventListener('click', function (e) {
      const b = e.target.closest('.qopts button'); if (!b || b.disabled) return;
      const blk = b.closest('.qq'), it0 = qs[+blk.getAttribute('data-k')], j = +b.getAttribute('data-j'), dd = dec(it0), it = { q: it0.q, o: it0.o, a: dd.a, e: dd.e };
      blk.querySelectorAll('button').forEach(function (x, n) { x.disabled = true; if (n === it.a) x.classList.add('good'); });
      if (j !== it.a) b.classList.add('bad'); else right++;
      rec[+blk.getAttribute('data-k')] = { q: it.q, chosen: it.o[j], correct: it.o[it.a], ok: j === it.a, e: it.e };
      const ex2 = blk.querySelector('.qexp'); ex2.hidden = false; ex2.textContent = (j === it.a ? '¡Correcto! ' : 'No exactamente. ') + it.e;
      if (++answered === qs.length) {
        const sc = q.querySelector('.qscore'); sc.hidden = false; sc.textContent = 'Resultado: ' + right + ' de ' + qs.length + (right === qs.length ? ' · ¡perfecto!' : ' · puedes volver a lanzar el ejemplo y repasarlo.');
        const key = svc.id + '/' + ex.id; if (!prog.quiz[key] || prog.quiz[key] < right) prog.quiz[key] = right;
        const was = complete(); prog.answers[key] = rec.slice(); save(); renderProgress();
        if (complete() && !was) setTimeout(askName, 900);
      }
    });
    const log = root.querySelector('.console-log'); root.insertBefore(q, log);
  }

  /* ---------- Integración con la consola ---------- */
  const origMount = C.mountConsole;
  C.mountConsole = function (host, svc) {
    origMount.apply(this, arguments);
    const root = host.firstElementChild; if (!root || !DEFS[svc.id]) return;
    prog.visited[svc.id] = 1; save(); renderProgress();

    // Visita guiada: una sola vez, al entrar por primera vez en IAM
    if (svc.id === 'iam' && !prog.tourDone) { prog.tourDone = true; save(); startTour(root, svc); }

    // El cuestionario aparece cuando la animación termina bien y desaparece al cambiar de ejemplo o relanzar
    const st = root.querySelector('.console-status');
    new MutationObserver(function () {
      const kind = st.getAttribute('data-kind');
      if (kind === 'ok') { const b = root.querySelector('.ex-btn[aria-pressed="true"]'); if (b) renderQuiz(root, svc, +b.getAttribute('data-ex')); }
      else { const old = root.querySelector('.quiz'); if (old) old.remove(); }
    }).observe(st, { attributes: true, attributeFilter: ['data-kind'] });
  };

  setTimeout(renderProgress, 0);
  window.addEventListener('hashchange', function () { setTimeout(renderProgress, 0); });
})(window.CEDI);
