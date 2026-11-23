/* Generador mínimo de PDF (texto, Helvetica, A4) sin librerías ni red.
   CEDI.buildReportPDF({ name, date, sections:[{title, items:[{title, qs:[{q, chosen, correct, ok, e}]}]}] }) -> Blob */
(function (C) {
  const W = { ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015, '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333, '{': 334, '|': 260, '}': 334, '~': 584 };
  '0123456789'.split('').forEach(function (d) { W[d] = 556; });
  const up = { A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611 };
  const lo = { a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500 };
  Object.assign(W, up, lo);
  const BASE = 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÑñÇçÝýÿ';
  const BASEOF = 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCcYyy';
  function width(s, size, bold) {
    let w = 0;
    for (let i = 0; i < s.length; i++) { const c = s[i]; let v = W[c]; if (v == null) { const k = BASE.indexOf(c); v = k >= 0 ? W[BASEOF[k]] : 556; } w += v; }
    return w * size / 1000 * (bold ? 1.06 : 1.0);
  }
  /* Caracteres fuera de WinAnsi → equivalentes sencillos */
  function clean(s) {
    return String(s).replace(/→/g, '->').replace(/≈/g, '~').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/−/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[✓✔]/g, 'OK').replace(/✗/g, 'X')
      .replace(/…/g, '...').replace(/ /g, ' ').replace(/[‐-‒]/g, '-').replace(/[^\x20-\x7e¡-ÿ–—]/g, '?');
  }
  const WIN = { 0x2013: 0x96, 0x2014: 0x97 };
  function bytes(s) { const o = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); o.push(WIN[c] || (c & 255)); } return o; }
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function wrap(text, size, maxW, bold) {
    const out = []; const paras = clean(text).split('\n');
    paras.forEach(function (p) {
      const words = p.split(' '); let line = '';
      words.forEach(function (w) {
        const t = line ? line + ' ' + w : w;
        if (width(t, size, bold) <= maxW) line = t;
        else { if (line) out.push(line); while (width(w, size, bold) > maxW) { let k = w.length - 1; while (k > 1 && width(w.slice(0, k), size, bold) > maxW) k--; out.push(w.slice(0, k)); w = w.slice(k); } line = w; }
      });
      out.push(line);
    });
    return out;
  }

  C.buildReportPDF = function (d) {
    const PW = 595, PH = 842, M = 54, MW = PW - 2 * M, pages = []; let cur = null, y = 0;
    function newPage() { cur = []; pages.push(cur); y = PH - M; }
    function text(s, size, bold, indent, color) {
      const lines = wrap(s, size, MW - (indent || 0), bold), lh = size * 1.32;
      lines.forEach(function (l) {
        if (y - lh < M + 14) newPage();
        y -= lh; cur.push({ t: l, x: M + (indent || 0), y: y, size: size, bold: bold, color: color || '0 0 0' });
      });
    }
    function gap(n) { y -= n; }
    function ensure(h) { if (y - h < M + 14) newPage(); }
    newPage();
    text('CEDI CLOUD · Informe de cuestionarios', 18, true, 0, '0.12 0.31 0.85'); gap(6);
    text('Nombre: ' + (d.name || '(sin indicar)'), 11, true); text('Fecha: ' + d.date, 11, false);
    text('Ejemplos contestados: ' + d.done + ' de ' + d.total + (d.done >= d.total ? ' (informe completo)' : ' (informe PARCIAL)'), 11, true, 0, d.done >= d.total ? '0 0 0' : '0.75 0.1 0.1');
    let tot = 0, ok = 0; d.sections.forEach(function (s) { s.items.forEach(function (it) { it.qs.forEach(function (q) { tot++; if (q.ok) ok++; }); }); });
    text('Resultado global: ' + ok + ' de ' + tot + ' preguntas correctas (' + (tot ? Math.round(ok / tot * 100) : 0) + ' %)', 11, true); gap(10);
    d.sections.forEach(function (s) {
      ensure(60); gap(6); text(s.title, 14, true, 0, '0.12 0.31 0.85'); gap(2);
      s.items.forEach(function (it) {
        ensure(60); text('Ejemplo: ' + it.title, 11, true, 0); gap(2);
        it.qs.forEach(function (q, k) {
          ensure(54);
          text((k + 1) + '. ' + q.q, 10, true, 8);
          text('Respuesta del alumno: ' + q.chosen + (q.ok ? '  [CORRECTA]' : '  [INCORRECTA]'), 10, false, 16, q.ok ? '0.02 0.45 0.3' : '0.75 0.1 0.1');
          if (!q.ok) text('Respuesta correcta: ' + q.correct, 10, false, 16);
          text('Explicación: ' + q.e, 9.5, false, 16, '0.3 0.35 0.42'); gap(4);
        });
        gap(4);
      });
    });
    /* ---- Serialización PDF ---- */
    const objs = []; // cada objeto: array de bytes
    function add(str) { const b = bytes(str); objs.push(b); return objs.length; }
    add('<< /Type /Catalog /Pages 2 0 R >>');
    const nPages = pages.length, kids = []; for (let i = 0; i < nPages; i++) kids.push((5 + i * 2 + 1) + ' 0 R');
    add('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + nPages + ' >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach(function (p, i) {
      let c = '';
      p.forEach(function (r) { c += 'BT ' + r.color + ' rg /' + (r.bold ? 'F2' : 'F1') + ' ' + r.size + ' Tf ' + r.x.toFixed(1) + ' ' + r.y.toFixed(1) + ' Td (' + esc(r.t) + ') Tj ET\n'; });
      c += 'BT 0.5 0.5 0.5 rg /F1 8 Tf ' + (PW / 2 - 20).toFixed(1) + ' 30 Td (' + 'Página ' + (i + 1) + ' de ' + nPages + ') Tj ET\n';
      const cb = bytes(c);
      objs.push(bytes('<< /Length ' + cb.length + ' >>\nstream\n').concat(cb, bytes('\nendstream')));
      add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (5 + i * 2) + ' 0 R >>');
    });
    let out = bytes('%PDF-1.4\n'); const offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out = out.concat(bytes((i + 1) + ' 0 obj\n'), o, bytes('\nendobj\n')); });
    const xr = out.length; let x = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
    x += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
    out = out.concat(bytes(x));
    return new Blob([new Uint8Array(out)], { type: 'application/pdf' });
  };
})(window.CEDI);
