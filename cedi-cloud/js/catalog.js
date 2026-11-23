/* Catálogo: servicios, categorías, proyectos, regiones y equivalencias. */
window.CEDI = window.CEDI || {};
(function (C) {

  /* ---------- Servicios (en el orden de construcción: parte 2 = IAM, parte 3 = Almacenamiento…) ---------- */
  C.services = [
    {
      id: 'iam', cat: 'Seguridad e identidad', name: 'IAM', sub: 'Usuarios, roles y permisos', icon: 'shield', part: 2,
      lead: 'Controla quién puede hacer qué sobre cada recurso. Los usuarios, grupos y cuentas de servicio reciben roles, y cada rol es un conjunto de permisos.',
      def: 'Controla quién puede hacer qué sobre cada recurso: usuarios, grupos y cuentas de servicio reciben roles formados por permisos.',
      gcp: 'Cloud IAM', aws: 'AWS IAM', azure: 'Microsoft Entra ID + Azure RBAC',
      sla: '99,99 %',
      concepts: ['iam', 'rol', 'permiso', 'cuenta-servicio', 'minimo-privilegio', 'responsabilidad-compartida', 'proyecto'],
      planned: ['Crear usuario y asignar rol', 'Acceso denegado a un bucket', 'Rol personalizado (mínimo privilegio)', 'Cuenta de servicio para un trabajo'],
      kw: ['usuarios', 'roles', 'permisos', 'acceso', 'identidad', 'grant']
    },
    {
      id: 'almacenamiento', cat: 'Almacenamiento', name: 'Almacenamiento', sub: 'Data lake, capas y clases', icon: 'storage', part: 3,
      lead: 'Guarda ficheros como objetos dentro de buckets. Es la base del data lake: capas bruta, depurada y negocio, y un precio que depende de lo a menudo que se lee cada dato.',
      def: 'Guarda ficheros como objetos en buckets: capacidad casi ilimitada, alta durabilidad y precio según la frecuencia de acceso. Es la base del data lake.',
      gcp: 'Cloud Storage', aws: 'Amazon S3', azure: 'Azure Blob Storage (ADLS Gen2)',
      sla: '99,95 %',
      concepts: ['data-lake', 'capas', 'objeto', 'bucket', 'clase-almacenamiento', 'region', 'zona'],
      planned: ['Subir un fichero a la capa bruta', 'Promover bruta → depurada → negocio', 'Mover datos a Nearline, Coldline y Archive', 'Bucket público por error'],
      kw: ['data lake', 'bucket', 's3', 'objetos', 'ficheros', 'nearline', 'coldline', 'archive', 'standard']
    },
    {
      id: 'analitica', cat: 'Analítica de datos', name: 'Analítica', sub: 'Almacén de datos tipo BigQuery', icon: 'analytics', part: 4,
      lead: 'Un almacén de datos sin servidores: lanzas una consulta SQL y el servicio la reparte en fases entre muchos trabajadores. Se paga por los bytes que lee cada consulta.',
      def: 'Almacén de datos sin servidores: lanza consultas SQL que se reparten en fases entre muchos trabajadores y se pagan por los bytes leídos.',
      gcp: 'BigQuery', aws: 'Amazon Redshift (y Athena)', azure: 'Azure Synapse Analytics',
      sla: '99,99 %',
      concepts: ['data-warehouse', 'columnar', 'particion', 'poda', 'shuffle', 'serverless', 'pago-por-uso', 'batch-streaming'],
      planned: ['Consulta repartida en fases y trabajadores', 'Poda de particiones por fecha', 'Almacenamiento por filas frente a columnas', 'GROUP BY con shuffle'],
      kw: ['bigquery', 'sql', 'consulta', 'warehouse', 'redshift', 'synapse', 'columnas']
    },
    {
      id: 'computacion', cat: 'Computación', name: 'Computación', sub: 'Un nodo y un clúster', icon: 'cpu', part: 5,
      lead: 'Máquinas virtuales con varios núcleos y clústeres de varios nodos. Aquí se ve la diferencia entre ejecutar en secuencial o en paralelo, y qué cambia al repartir los datos entre máquinas.',
      def: 'Máquinas virtuales (nodos) con núcleos y clústeres de varios nodos para ejecutar trabajos en paralelo y de forma distribuida.',
      gcp: 'Compute Engine · Dataproc', aws: 'EC2 · EMR', azure: 'Virtual Machines · HDInsight',
      sla: '99,95 %',
      concepts: ['nodo', 'cluster', 'escalado-horizontal', 'maestro-trabajador', 'paralelismo', 'aceleracion', 'data-skew', 'particion', 'shuffle', 'localidad'],
      planned: ['Secuencial frente a paralelo en un nodo', 'Aceleración y eficiencia', 'Clúster: particiones, shuffle y reducción', 'Datos sesgados'],
      kw: ['nodo', 'cluster', 'clúster', 'núcleos', 'paralelo', 'distribuida', 'ec2', 'dataproc', 'emr', 'vm']
    },
    {
      id: 'bases-de-datos', cat: 'Bases de datos', name: 'Bases de datos', sub: 'Réplicas, caídas y copias', icon: 'database', part: 6,
      lead: 'Bases de datos gestionadas con réplicas. Aquí se ve cómo el líder copia las escrituras a los seguidores, qué pasa cuando cae el primario y por qué una réplica no es una copia de seguridad.',
      def: 'Bases de datos gestionadas con réplicas, copias de seguridad y alta disponibilidad automática.',
      gcp: 'Cloud SQL · Firestore', aws: 'Amazon RDS · DynamoDB', azure: 'Azure SQL Database · Cosmos DB',
      sla: '99,95 %',
      concepts: ['replica', 'lider-seguidor', 'failover', 'eleccion-lider', 'write-concern', 'copia-seguridad', 'cap', 'consistencia', 'acid', 'base', 'sla', 'rpo', 'rto', 'idempotencia', 'heartbeat', 'disponibilidad'],
      planned: ['Replicación líder-seguidor', 'Cae el primario: elección de un nuevo líder', 'writeConcern: w:1 frente a majority', 'Réplica frente a copia de seguridad'],
      kw: ['replicación', 'mongodb', 'mysql', 'sql', 'nosql', 'primario', 'secundario', 'rds', 'cosmos']
    },
    {
      id: 'ia', cat: 'Inteligencia artificial', name: 'IA', sub: 'Entrenar y servir modelos', icon: 'ai', part: 7,
      lead: 'Una plataforma para entrenar modelos con datos propios y servirlos como endpoints de predicción. Combina todo lo anterior: datos en el lago, cálculo en paralelo y acceso controlado.',
      def: 'Plataforma para entrenar modelos con datos propios y servirlos como endpoints de predicción.',
      gcp: 'Vertex AI', aws: 'Amazon SageMaker', azure: 'Azure Machine Learning',
      sla: '99,9 %',
      concepts: ['entrenamiento', 'inferencia', 'acelerador', 'pago-por-uso'],
      planned: ['Entrenar un modelo en paralelo', 'Servir una predicción (inferencia)', 'Pipeline: datos → modelo → endpoint'],
      kw: ['modelo', 'machine learning', 'ml', 'vertex', 'sagemaker', 'gpu', 'entrenamiento', 'inferencia']
    }
  ];
  C.serviceById = {};
  C.services.forEach(function (s) { C.serviceById[s.id] = s; });

  /* Categorías del menú lateral (en orden) */
  C.navCategories = [
    { label: 'Seguridad e identidad', services: ['iam'] },
    { label: 'Almacenamiento', services: ['almacenamiento'] },
    { label: 'Analítica de datos', services: ['analitica'] },
    { label: 'Computación', services: ['computacion'] },
    { label: 'Bases de datos', services: ['bases-de-datos'] },
    { label: 'Inteligencia artificial', services: ['ia'] }
  ];

  /* ---------- Proyectos y regiones simulados ---------- */
  C.projects = [
    { id: 'curso-bigdata-2026', name: 'Curso Big Data 2026' },
    { id: 'ventas-retail', name: 'Ventas retail' },
    { id: 'telemetria-iot', name: 'Telemetría IoT' }
  ];

  C.regions = [
    { id: 'madrid', city: 'Madrid', area: 'Europa', gcp: 'europe-southwest1', aws: 'eu-south-2', azure: 'spaincentral' },
    { id: 'paris', city: 'París', area: 'Europa', gcp: 'europe-west9', aws: 'eu-west-3', azure: 'francecentral' },
    { id: 'frankfurt', city: 'Fráncfort', area: 'Europa', gcp: 'europe-west3', aws: 'eu-central-1', azure: 'germanywestcentral' },
    { id: 'londres', city: 'Londres', area: 'Europa', gcp: 'europe-west2', aws: 'eu-west-2', azure: 'uksouth' },
    { id: 'virginia', city: 'Virginia', area: 'América', gcp: 'us-east4', aws: 'us-east-1', azure: 'eastus' },
    { id: 'sao-paulo', city: 'São Paulo', area: 'América', gcp: 'southamerica-east1', aws: 'sa-east-1', azure: 'brazilsouth' },
    { id: 'tokio', city: 'Tokio', area: 'Asia', gcp: 'asia-northeast1', aws: 'ap-northeast-1', azure: 'japaneast' }
  ];

  /* ---------- Equivalencias entre nubes ---------- */
  C.equivalences = [
    // Del temario (Computación en la nube, diapositiva «Equivalencias entre proveedores»)
    { need: 'Máquinas virtuales', gcp: 'Compute Engine', aws: 'EC2', azure: 'Virtual Machines', src: 'temario' },
    { need: 'Almacenamiento de objetos', gcp: 'Cloud Storage', aws: 'S3', azure: 'Blob Storage', src: 'temario' },
    { need: 'Base de datos relacional', gcp: 'Cloud SQL', aws: 'RDS', azure: 'Azure SQL Database', src: 'temario' },
    { need: 'Almacén de datos', gcp: 'BigQuery', aws: 'Redshift', azure: 'Synapse Analytics', src: 'temario' },
    { need: 'Clúster Hadoop/Spark', gcp: 'Dataproc', aws: 'EMR', azure: 'HDInsight', src: 'temario' },
    { need: 'Mensajería y streaming', gcp: 'Pub/Sub', aws: 'Kinesis', azure: 'Event Hubs', src: 'temario' },
    { need: 'Orquestación', gcp: 'Cloud Composer', aws: 'MWAA', azure: 'Data Factory', src: 'temario' },
    // Ampliación para los servicios de la consola
    { need: 'Identidad y accesos', gcp: 'Cloud IAM', aws: 'IAM', azure: 'Microsoft Entra ID + RBAC', src: 'extra' },
    { need: 'Base de datos NoSQL', gcp: 'Firestore', aws: 'DynamoDB', azure: 'Cosmos DB', src: 'extra' },
    { need: 'Funciones sin servidor', gcp: 'Cloud Run functions', aws: 'Lambda', azure: 'Azure Functions', src: 'extra' },
    { need: 'Copias de seguridad', gcp: 'Backup and DR Service', aws: 'AWS Backup', azure: 'Azure Backup', src: 'extra' },
    { need: 'Plataforma de IA', gcp: 'Vertex AI', aws: 'SageMaker', azure: 'Azure Machine Learning', src: 'extra' }
  ];

  /* ---------- Estado persistente (proyecto, región, menú) ---------- */
  const KEY = 'cedi-cloud-v1';
  C.state = { project: 'curso-bigdata-2026', region: 'madrid', collapsed: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved.project && C.projects.some(function (p) { return p.id === saved.project; })) C.state.project = saved.project;
    if (saved.region && C.regions.some(function (r) { return r.id === saved.region; })) C.state.region = saved.region;
    if (typeof saved.collapsed === 'boolean') C.state.collapsed = saved.collapsed;
  } catch (e) { /* sin almacenamiento: se usa el estado por defecto */ }
  C.saveState = function () { try { localStorage.setItem(KEY, JSON.stringify(C.state)); } catch (e) { /* ignorar */ } };
  C.project = function () { return C.projects.find(function (p) { return p.id === C.state.project; }); };
  C.region = function () { return C.regions.find(function (r) { return r.id === C.state.region; }); };
})(window.CEDI);
