/* Consola de ejemplos reutilizable.
   Cada servicio la rellena con CEDI.registerConsole(id, { lang, examples:[...] }).

   Un ejemplo:
   {
     id: 'paralelo',
     label: 'Secuencial frente a paralelo',     // texto del botón
     desc: 'Una línea que explica qué se verá',
     code: 'SELECT ...',                         // código de ejemplo (solo lectura)
     setup(ctx) { ... },                        // dibuja el estado inicial en ctx.stage (opcional)
     async run(ctx) { ... await ctx.sleep(600); ctx.log('...'); }   // la animación
   }

   ctx: { stage, log(texto, tipo), sleep(ms), status(texto, tipo), clear(), el(tag, clase, padre, html) }
   tipo de log: 'info' | 'ok' | 'warn' | 'err' | 'dim'
   Las duraciones CSS de las animaciones deben usar  calc(.6s * var(--k, 1))  para respetar la velocidad elegida. */
window.CEDI = window.CEDI || {};
(function (C) {
  const registry = {};
  C.registerConsole = function (id, def) { registry[id] = def; };
  C.hasConsole = function (id) { return !!(registry[id] && registry[id].examples && registry[id].examples.length); };

  /* ---------- Resaltado de sintaxis mínimo ---------- */
  const KW = {
    sql: 'SELECT FROM WHERE GROUP BY ORDER LIMIT JOIN ON AS AND OR NOT NULL IN BETWEEN INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PARTITION OPTIONS WITH DESC ASC COUNT SUM AVG MAX MIN DISTINCT HAVING UNION CASE WHEN THEN ELSE END DATE TRUE FALSE GRANT REVOKE TO',
    js: 'const let var await async function return if else for of in new true false null db',
    bash: 'gcloud gsutil bq aws az hadoop hdfs fs cp ls mv rm mkdir cat echo',
    python: 'import from def return if else for in as with class True False None await async'
  };
  function highlight(code, lang) {
    const kws = {}; (KW[lang] || '').split(' ').forEach(function (k) { kws[k.toLowerCase()] = 1; });
    const cm = lang === 'sql' ? '--[^\\n]*' : (lang === 'js' ? '\\/\\/[^\\n]*' : '#[^\\n]*');
    const re = new RegExp('(' + cm + ')|(\'(?:[^\'\\\\\\n]|\\\\.)*\'|"(?:[^"\\\\\\n]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)|(\\s--?[a-zA-Z][\\w-]*)|(\\b\\d+(?:[.,]\\d+)?\\b)|(\\b[A-Za-z_][A-Za-z_0-9]*\\b)', 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += C.esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tk-cm">' + C.esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-st">' + C.esc(m[2]) + '</span>';
      else if (m[3] && lang === 'bash') out += C.esc(m[3].charAt(0)) + '<span class="tk-fl">' + C.esc(m[3].slice(1)) + '</span>';
      else if (m[4]) out += '<span class="tk-nm">' + C.esc(m[4]) + '</span>';
      else if (m[5] && kws[m[5].toLowerCase()]) out += '<span class="tk-kw">' + C.esc(m[5]) + '</span>';
      else out += C.esc(m[0]);
      last = re.lastIndex;
    }
    return out + C.esc(code.slice(last));
  }
  C.highlight = highlight;

  const LANG = { sql: 'SQL', js: 'JavaScript', bash: 'Terminal', python: 'Python' };

  /* ---------- Montaje ---------- */
  C.mountConsole = function (host, svc) {
    const def = registry[svc.id];
    const live = !!(def && def.examples && def.examples.length);
    const examples = live ? def.examples : svc.planned.map(function (l) { return { label: l, planned: true }; });
    const lang = (def && def.lang) || 'sql';

    host.innerHTML =
      '<section class="console' + (live ? '' : ' is-planned') + '" aria-label="Consola de ' + C.esc(svc.name) + '">' +
        '<div class="console-bar">' +
          '<div class="console-title">' + C.icon('terminal', 18) + '<span>Consola · <b>' + C.esc(svc.name) + '</b></span></div>' +
          '<div class="console-status" data-kind="idle" role="status"><i class="dot"></i><span class="st-txt">' + (live ? 'Elige un ejemplo' : 'En preparación') + '</span></div>' +
        '</div>' +
        '<div class="console-examples" role="group" aria-label="Ejemplos">' +
          '<span class="lbl">Ejemplos</span>' +
          examples.map(function (ex, i) {
            return '<button type="button" class="ex-btn" data-ex="' + i + '" aria-pressed="false"' + (live ? '' : ' disabled title="Disponible en la parte ' + svc.part + '"') + '>' + C.esc(ex.label) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="console-body">' +
          '<div class="pane code-pane">' +
            '<div class="pane-head"><span>Código de ejemplo</span><span class="lang">' + (LANG[lang] || lang) + '</span></div>' +
            '<pre class="code" tabindex="0" aria-label="Código de ejemplo"><code>' + (live
              ? '<span class="tk-cm">' + (lang === 'sql' ? '--' : (lang === 'js' ? '//' : '#')) + ' Pulsa uno de los ejemplos de arriba para cargar su código.</span>'
              : '<span class="tk-cm"># Los ejemplos de este servicio se cargan aquí.</span>') + '</code></pre>' +
            '<div class="pane-actions">' +
              '<button type="button" class="btn primary" data-act="run" disabled>' + C.icon('play', 16) + '<span>Lanzar</span></button>' +
              '<button type="button" class="btn" data-act="reset" disabled>' + C.icon('reset', 16) + '<span>Reiniciar</span></button>' +
              '<label class="speed">Velocidad <select data-act="speed" aria-label="Velocidad de la animación"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>' +
            '</div>' +
          '</div>' +
          '<div class="pane stage-pane">' +
            '<div class="pane-head"><span>Qué pasa por detrás</span><span class="hint">simulado</span></div>' +
            '<div class="narrator" data-kind="idle" aria-live="polite"><span class="nr-tag">' + (live ? 'Antes de empezar' : 'En preparación') + '</span><p class="nr-txt">' + (live ? 'Elige un ejemplo de arriba y pulsa <b>Lanzar</b>. Aquí te iré contando qué pasa en cada paso.' : '') + '</p></div>' +
            '<div class="stage" aria-live="off">' +
              (live ? '<div class="stage-empty">' + C.icon('layers', 28) + '<p>Aquí verás la animación cuando lances un ejemplo.</p></div>'
                    : '<div class="stage-empty">' + C.icon('layers', 28) + '<p>Esta consola se activa en la <b>parte ' + svc.part + '</b>.<br>Los botones de arriba son los ejemplos previstos.</p></div>') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="console-log"><div class="pane-head"><span>Registro técnico (detalle de cada paso)</span><button type="button" class="link-btn" data-act="clear">Limpiar</button></div><div class="log" role="log" aria-live="off" tabindex="0"></div></div>' +
      '</section>';

    if (!live) return;

    const root = host.firstElementChild;
    const $r = function (s) { return root.querySelector(s); };
    const stage = $r('.stage'), logEl = $r('.log'), codeEl = $r('.code code');
    const runBtn = $r('[data-act="run"]'), resetBtn = $r('[data-act="reset"]'), speedSel = $r('[data-act="speed"]');
    const stEl = $r('.console-status'), stTxt = $r('.st-txt');
    const nrEl = $r('.narrator'), nrTag = $r('.nr-tag'), nrTxt = $r('.nr-txt');
    let nrLast = '', nrFree = 0, nrTimers = [];
    function nrClear() { nrTimers.forEach(clearTimeout); nrTimers = []; nrFree = 0; }
    /* Cada frase del narrador se queda el tiempo suficiente para leerla; la animación espera a que se pueda leer. */
    function nrSchedule(fn, text) { const now = performance.now(), at = Math.max(now, nrFree); nrFree = at + Math.min(5000, (700 + 42 * (text || "").length) / speed); nrTimers.push(setTimeout(fn, at - now)); }
    if (C.wow) C.wow.attach(stage);
    function narr(tag, html, kind) { nrEl.setAttribute('data-kind', kind || 'idle'); nrTag.textContent = tag; nrTxt.innerHTML = html; nrEl.classList.remove('pop'); void nrEl.offsetWidth; nrEl.classList.add('pop'); }
    function lesson(ex) { return (C.lessons && C.lessons[svc.id] && C.lessons[svc.id][ex.id]) || null; }
    const BASE = 0.5;   // el 1× equivale al antiguo 0,5×: todo dura el doble
    let sel = -1, running = false, speed = 1, t0 = 0, pending = [], runId = 0;
    const CANCEL = { cancelled: true };

    function setStatus(text, kind) { stEl.setAttribute('data-kind', kind || 'idle'); stTxt.textContent = text; }
    function applySpeed() { root.style.setProperty('--k', String(1 / (speed * BASE))); }
    applySpeed();

    const ctx = {
      stage: stage,
      get speed() { return speed * BASE; },
      status: setStatus,
      clear: function () { stage.innerHTML = ''; },
      el: function (tag, cls, parent, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        (parent || stage).appendChild(e);
        return e;
      },
      sleep: function (ms) {
        return new Promise(function (res, rej) {
          const h = { };
          h.id = setTimeout(function () { pending = pending.filter(function (x) { return x !== h; }); res(); }, Math.max(0, ms / (speed * BASE), running ? nrFree - performance.now() : 0));
          h.rej = rej; pending.push(h);
        });
      },
      log: function (text, kind) {
        const s = running ? ((performance.now() - t0) / 1000) : 0;
        const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = (s % 60).toFixed(1).padStart(4, '0');
        const row = document.createElement('div');
        row.className = 'log-row k-' + (kind || 'info');
        row.innerHTML = '<time>' + mm + ':' + ss + '</time><span>' + C.esc(text) + '</span>';
        logEl.appendChild(row);
        logEl.scrollTop = logEl.scrollHeight;
        if (running && kind === 'err' && C.wow) C.wow.shake(stage);
        if (running) {
          nrSchedule(function () { const prev = nrLast; nrLast = text;
            narr('Ahora mismo', (prev ? '<span class="nr-prev">' + C.esc(prev) + '</span>' : '') + '<span class="nr-cur">' + C.esc(text) + '</span>', kind === 'dim' ? 'info' : (kind || 'info')); }, text);
        }
      }
    };

    function cancelAll() { const p = pending; pending = []; p.forEach(function (h) { clearTimeout(h.id); h.rej(CANCEL); }); }

    function select(i) {
      nrClear();
      runId++;
      if (running) {
        cancelAll(); running = false;
        runBtn.classList.remove('stop'); runBtn.innerHTML = C.icon('play', 16) + '<span>Lanzar</span>';
      }
      sel = i;
      const ex = examples[i];
      C.$$('.ex-btn', root).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      codeEl.innerHTML = highlight(ex.code || '', ex.lang || lang);
      root.querySelector('.lang').textContent = LANG[ex.lang || lang] || (ex.lang || lang);
      logEl.innerHTML = '';
      stage.innerHTML = '';
      if (ex.setup) ex.setup(ctx);
      runBtn.disabled = false; resetBtn.disabled = false;
      setStatus(ex.desc || 'Listo para lanzar', 'idle');
      const L = lesson(ex);
      narr('Qué vas a ver', C.esc(ex.desc || '') + (L && L.mira ? ' <span class="nr-look"><b>Fíjate en</b> ' + C.esc(L.mira) + '</span>' : '') + '', 'idle');
    }

    async function run() {
      if (sel < 0) return;
      if (running) { cancelAll(); return; }
      const ex = examples[sel];
      logEl.innerHTML = ''; stage.innerHTML = ''; if (ex.setup) ex.setup(ctx);
      const myRun = ++runId;
      running = true; t0 = performance.now();
      runBtn.classList.add('stop'); runBtn.innerHTML = C.icon('stop', 16) + '<span>Detener</span>';
      resetBtn.disabled = true;
      setStatus('Ejecutando…', 'run'); if (C.wow) C.wow.live(stage, true);
      nrClear(); nrLast = ''; narr('Ahora mismo', '<span class="nr-cur">Empezamos…</span>', 'info'); nrFree = performance.now() + 1200 / speed;
      const top = root.getBoundingClientRect().top;
      if (top < 58 || top > 160) window.scrollTo({ top: window.scrollY + top - 66, behavior: 'smooth' });
      try {
        await ex.run(ctx);
        const L2 = lesson(ex);
        if (L2) nrSchedule(function () { narr('Idea clave', '<b>' + C.esc(L2.idea) + '</b>' + (L2.como ? ' <span class="nr-como">' + C.esc(L2.como) + '</span>' : ''), 'learn'); }, L2.idea + (L2.como || ''));
        if (C.wow) C.wow.celebrate(stage);
        setStatus('Completado en ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s (simulado)', 'ok');
      } catch (err) {
        if (myRun !== runId) { /* se cambió de ejemplo: no tocar la interfaz */ }
        else if (err === CANCEL) { nrClear(); ctx.log('Ejecución detenida.', 'warn'); setStatus('Detenido', 'warn'); narr('Detenido', 'Has detenido la animación. Pulsa <b>Lanzar de nuevo</b> para verla otra vez.', 'warn'); }
        else { if (window.console) console.error(err); ctx.log('Error en la simulación: ' + (err && err.message), 'err'); setStatus('Error', 'err'); }
      } finally {
        if (myRun === runId) {
          running = false; if (C.wow) C.wow.live(stage, false);
          runBtn.classList.remove('stop'); runBtn.innerHTML = C.icon('play', 16) + '<span>Lanzar de nuevo</span>';
          resetBtn.disabled = false;
        }
      }
    }

    root.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-ex')) select(+b.getAttribute('data-ex'));
      else if (b.getAttribute('data-act') === 'run') run();
      else if (b.getAttribute('data-act') === 'reset') { select(sel); }
      else if (b.getAttribute('data-act') === 'clear') { logEl.innerHTML = ''; }
    });
    speedSel.addEventListener('change', function () { speed = parseFloat(speedSel.value) || 1; applySpeed(); });

    /* Al salir de la página se cancelan las animaciones en curso */
    root._dispose = function () { cancelAll(); };
    C._activeConsole = root;
  };

  C.disposeConsole = function () {
    if (C._activeConsole && C._activeConsole._dispose) C._activeConsole._dispose();
    C._activeConsole = null;
  };
})(window.CEDI);
