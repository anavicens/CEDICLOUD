/* Ayudas para añadir servicios, conceptos y equivalencias desde cada fichero svc-*.js
   sin tocar catalog.js ni glossary.js. Se carga justo después del catálogo. */
(function (C) {
  /* Concepto del glosario (misma forma que en glossary.js) */
  C.concept = function (id, term, cat, def, gcp, aws, azure, extra) {
    return Object.assign({ id: id, term: term, cat: cat, def: def, gcp: gcp, aws: aws, azure: azure }, extra || {});
  };
  C.addConcepts = function (list, newCats) {
    Object.assign(C.conceptCats, newCats || {});
    list.forEach(function (k) { if (!C.conceptById[k.id]) { C.concepts.push(k); C.conceptById[k.id] = k; } });
  };
  /* Servicio nuevo: se añade al menú dentro de su categoría (que se crea si no existe) */
  C.addService = function (svc) {
    C.services.push(svc); C.serviceById[svc.id] = svc;
    let cat = C.navCategories.filter(function (c) { return c.label === svc.cat; })[0];
    if (!cat) { cat = { label: svc.cat, services: [] }; C.navCategories.push(cat); }
    cat.services.push(svc.id);
  };
  C.addEquivalences = function (list) { list.forEach(function (e) { C.equivalences.push(e); }); };
})(window.CEDI);
