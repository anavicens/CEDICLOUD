# CEDI CLOUD

Consola de nube genérica y simulada (HTML + CSS + JavaScript, sin backend ni dependencias).

## Probar en local

Abre `index.html` con doble clic, o desde la carpeta:

```
python3 -m http.server 8000
```

## Subir a Vercel

Es un sitio estático: no hay build.

1. Descomprime el zip: la carpeta `cedi-cloud` debe tener `index.html` en la raíz.
2. Opción A (sin instalar nada): sube la carpeta a un repositorio de GitHub, entra en vercel.com → *Add New… → Project*, importa el repositorio, *Framework Preset: Other*, deja vacíos *Build Command* y *Output Directory* y pulsa *Deploy*.
3. Opción B (terminal): `npm i -g vercel`, entra en la carpeta, ejecuta `vercel` (acepta los valores por defecto) y después `vercel --prod`.

- Con la CLI: `vercel` dentro de esta carpeta (Framework Preset: *Other*, sin comando de build, directorio de salida `.`).
- O arrastra la carpeta al panel de Vercel, o importa el repositorio de GitHub con esos mismos ajustes.

## Velocidad de las animaciones

El selector de cada consola va de 0,5× a 4×. El valor base está en `js/console.js` (`const BASE = 1`): si quieres que todo vaya más lento o más rápido, cambia ese número (más pequeño = más lento).

## Pantallas

Se adapta a móvil, tablet y escritorio: en pantallas pequeñas el menú lateral pasa a ser un cajón (botón de las tres rayas) y los escenarios se apilan. El icono «i» funciona con el ratón (al pasar) y en táctil (al tocar).

## Estructura

```
index.html          Esqueleto: barra superior, menú lateral y contenido
css/                base · layout (barra y menú) · components · stage (escenarios)
js/icons.js         Iconos de línea
js/glossary.js      Conceptos: definición corta + nombre en Google Cloud, AWS y Azure
js/catalog.js       Servicios, categorías, proyectos, regiones y equivalencias
js/ui.js            Iconos «i» con tooltip, menús desplegables y avisos
js/console.js       Consola reutilizable (ejemplos, código, escenario animado, registro)
js/stage.js         Ayudas de escenario (paquetes que viajan, destellos, medidores)
js/svc-iam.js       Servicio IAM: 4 ejemplos animados (parte 2)
js/svc-almacenamiento.js  Servicio Almacenamiento: 4 ejemplos animados (parte 3)
js/svc-analitica.js     Servicio Analítica: 4 ejemplos animados (parte 4)
js/svc-computacion.js    Servicio Computación: 4 ejemplos animados (parte 5)
js/svc-bases-de-datos.js  Servicio Bases de datos: 4 ejemplos animados (parte 6)
js/svc-ia.js             Servicio IA: 3 ejemplos animados (parte 7)
js/extend.js        Ayudas para añadir servicios, conceptos y equivalencias desde cada fichero svc-*
js/svc-regiones-zonas.js · svc-facturacion.js · svc-hadoop.js · svc-monitorizacion.js
js/svc-red-seguridad.js · svc-vms-autoescalado.js · svc-modelos-servicio.js
js/svc-ingesta-orquestacion.js · svc-terminal.js · svc-spark.js
js/svc-formatos-datos.js · svc-contenedores.js     Secciones nuevas (4 ejemplos cada una)
js/classroom.js     Herramientas de clase: visita guiada, cuestionarios, progreso e informe
js/report.js        Generador de PDF (sin librerías)
js/quizzes-base.js  Cuestionarios de los ejemplos de las partes 2 a 7
css/classroom.css   Estilos de las herramientas de clase
js/pages.js         Panel, páginas de servicio, glosario y equivalencias
js/app.js           Buscador, selectores de proyecto y región, enrutado (#/servicio)
```

## Añadir un servicio (partes siguientes)

Cada servicio se enchufa en su propio fichero, por ejemplo `js/svc-iam.js`, cargado en `index.html` antes de `app.js`:

```js
CEDI.registerConsole('iam', {
  lang: 'sql',
  examples: [
    { label: 'Crear usuario y asignar rol', desc: '…', code: 'GRANT …',
      setup(ctx) { /* estado inicial en ctx.stage */ },
      async run(ctx) { ctx.log('…'); await ctx.sleep(600); /* animación */ } }
  ]
});
```

Para añadir un concepto con su icono «i», se da de alta en `js/glossary.js` y se muestra con `CEDI.infoIcon('id')`
(arriba a la derecha de un contenedor con la clase `has-info`) o `CEDI.term('id')` dentro de un texto.


## Herramientas de clase

- **Visita guiada**: aparece una sola vez, la primera vez que se entra en IAM (7 pasos). Se guarda que ya se ha visto.
- **Cuestionario rápido**: al terminar cada animación aparece 1 pregunta con explicación.
- **Informe PDF**: se puede descargar en cualquier momento desde el menú lateral, con las preguntas contestadas hasta ese momento (marcado como «parcial» si faltan ejemplos). Al completar los ejemplos se ofrece automáticamente. Pide el nombre del alumno e incluye preguntas, respuestas, aciertos, explicaciones y resultado global. Se genera en el navegador (`js/report.js`), sin servidor.
- **Respuestas ofuscadas**: las respuestas correctas y las explicaciones van codificadas en los ficheros `js/svc-*.js` y `js/quizzes-base.js` (campo `x`). Evita leerlas de un vistazo, pero no es seguridad real: quien lea el código puede decodificarlas. Las versiones editables están en el zip aparte «fuentes privadas»; no las subas a Vercel.
- **Progreso**: el menú lateral muestra servicios visitados (✓) y ejemplos completados. Se guarda en `localStorage` (con `try/catch`). «Reiniciar» lo borra, junto con las respuestas.
- **Glosario**: ya existía en «Referencia → Glosario» y reúne las definiciones de todos los iconos «i».

## Añadir una sección nueva

Crea `js/svc-nombre.js` y cárgalo en `index.html` después de `svc-terminal.js` y antes de `app.js`. Dentro usa
`CEDI.addConcepts([...])`, `CEDI.addService({...})`, `CEDI.addEquivalences([...])` y `CEDI.registerConsole('id', {...})`.
Si añades `quiz: [{q, o:[...], a:índice, e:'explicación'}]` a un ejemplo, tendrá cuestionario automáticamente.

## Novedades didácticas
- **Narrador en pantalla** (`js/console.js`): antes de lanzar dice «Qué vas a ver» y «Fíjate en»; durante la animación muestra en grande el paso actual (y el anterior en gris); al terminar, «Idea clave» con una analogía cotidiana.
- **`js/lecciones.js`**: textos `mira / idea / como` de los ejemplos (se editan sin tocar la lógica).
- **Pantallas de portátil**: probado a 1366×768 y 1280×720; código con saltos de línea, consola en columnas 4/8 y registro técnico compacto con desplazamiento automático a la escena.
- **Aspecto «centro de control» y efectos** (`js/wow.js`, final de `css/components.css`): escenario oscuro con brillos neón, fundido al aparecer los elementos, pulso verde/rojo/ámbar al cambiar de estado, sacudida en los fallos y barrido de luz mientras corre. Se desactivan solos si el sistema pide «reducir movimiento».
- **Escenas dibujadas (SVG)** (`js/escenas*.js`, `css/escenas.css`): 14 ejemplos clave tienen dibujo propio en vez de tarjetas: autoescalado, MapReduce, Spark, Kubernetes, zonas y regiones, DAG (2), cola de mensajes (2), HDFS (2), balanceador, entrenamiento en paralelo y alerta de monitorización. Sustituyen solo el dibujo; el código, la narración y el test de cada ejemplo se mantienen. Para añadir otra: `CEDI._reg('servicio', 'id-ejemplo', { setup, run })` con las herramientas de `kit()`.
