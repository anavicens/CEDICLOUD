/* Cuestionarios de los ejemplos de las partes 2 a 7 (los de las secciones nuevas van dentro de su propio fichero). */
(function (C) {
  const Q = C.extraQuizzes = C.extraQuizzes || {};
  function q(a, b, x) { return { q: a, o: b, x: x }; }
  Q['iam/usuario-rol'] = [
    q('Un usuario nuevo no tiene ningún rol. ¿Qué puede hacer?', ["Solo leer","Todo","Nada hasta que se le asigne un rol"], "GEcFSxdRQE0QRhcQZQoLRBtCDwkcVQpCEl4CHEQZSBEBBgYLXggWBglECE4ACRwaRF5XFgAKCgpIBwlPFBdEVVgCCwAGDREDAxAXAxBL"),
    q('¿Qué agrupa un rol?', ["Un conjunto de permisos","Un conjunto de facturas","Un conjunto de regiones"], "GEcFSxdTQE0QRhcQYw1FFgZBQwkcVRFDEkYCFBEMWQZMCxBEXVdEDgwXBl5DHRoQRF5XFgIWDQ5DAkwOVRFeR1cRDAsaDQxMDAABQ0ZXEEtGFA==")];
  Q['iam/denegado'] = [
    q('Un usuario intenta leer un bucket sin permiso. ¿Qué recibe?', ["Los datos","Una copia vacía","Acceso denegado"], "GEcFSxdRQE0QRhcQegxFFRxIQwIAVRdIEkYGFwkAWQZMCg0UQfGbAAwQCEAGAhsQSA1BU0MBAQdEBgsOW0ZQ"),
    q('¿Qué conviene hacer ante un acceso denegado legítimo?', ["Dar permisos de administrador","Hacer público el bucket","Dar el rol mínimo necesario"], "GEcFSxdRQE0QRhcQZQZFBRlBCg8OVQFBElugyAoAQAxMHwcNW1taBgINBhdDHwAZCw1eWUMMCRlfBh8MHApJW1QPAEpLUA==")];
  Q['iam/rol-personalizado'] = [
    q('¿Para qué sirve un rol personalizado?', ["Para dar justo los permisos necesarios","Para crear máquinas","Para ahorrar dinero en la factura"], "GEcFSxdTQE0QRhcQegwWRBtCDwkcVRRfV1IGAw0HRAcDHFUUWFdSBgtEDUwRTAK2xV4SUgZFCAYNDQkMEBdMQF8MXkQcQwxMHwcLXVtZQwQOHF4XDU8QCA1CUxEIDRpCTU4S"),
    q('¿Qué principio se aplica al limitar permisos al mínimo?', ["Máximo rendimiento","Redundancia","Mínimo privilegio"], "GEcFSxdRQE0QRhcQewYLCxoNEwkdGA1eXUVPRQkMQwwfTxEF7oNZQxULGkQBAApVF0QSVw8CC0leAgAKVQlMXhhBGA==")];
  Q['iam/cuenta-servicio'] = [
    q('Un trabajo automático necesita acceder a datos. ¿Qué identidad usa?', ["Una cuenta de servicio","Ninguna","La contraseña de una persona"], "GEcFSxdTQE0QRhcQegIWRApYBgIbFBcNVlNDFgEbWwoPBhpEXl1YQwwADEMXBQsUAEhBFhMEFggNAhwDHAdMUV8MCwEaAUMCAFUUTEBXQxUBG14MAg4GSg9P"),
    q('¿Por qué no usar la cuenta personal de alguien para un trabajo?', ["Se rompería al cambiar esa persona y daría demasiados permisos","Está prohibido hablar de ello","Es más lento"], "GEcFSxdTQE0QRhcQYw0ERApYBgIbFERJVxYQABYfRAAFAFUHQlwWEwAWBEQQAxxVBU5dQgIBCxoNBh9PGKeMQRYQAAMcXwJMFlUBXkZXAQkBRw8e")];
  Q['almacenamiento/subir'] = [
    q('¿Qué guarda la capa bruta (raw)?', ["Copias de seguridad","Los datos tal como llegan, sin tocar","Solo informes finales"], "GEcFSxdSQE0QRhcQdQwLFwxfFQ0dVQFBElkRDAMAQwIATwUBX19fFwBEG0gTHgAWAV5TREMWDUlMDwsAVQJMXloCS0YU"),
    q('¿Cómo se llaman los contenedores de objetos en el almacenamiento?', ["Nodos","Tablas","Buckets"], "GEcFSxdRQE0QRhcQegwWRAZPCQkbGhcNGlAKBgwMXwwfRlUSRERTDUUADEMXHgBVAEgSVBYGDwxZEEJNCA==")];
  Q['almacenamiento/capas'] = [
    q('¿Qué ocurre al pasar de bruta a depurada?', ["Se borran","Se limpian y validan los datos","Se cifran sin más"], "GEcFSxdSQE0QRhcQegJFBwhdAkwLEBRYQFcHBEQKQg0YBhAKSBJSAhELGg0PBQIFDUJBFhpFBwZDQwoABwlMRllDAw0ITw8JQVcZ"),
    q('¿Para quién suele estar pensada la capa de negocio?', ["Para borrarla","Solo para máquinas","Para consumo de informes y análisis"], "GEcFSxdRQE0QRhcQZQwLRA1MFwMcVR1MEkYRABQIXwIIAAZEVBJXBBcBDkwHAxxVFExAV0MBAQpEBwUdW0ZQ")];
  Q['almacenamiento/clases'] = [
    q('Datos que casi nunca se leen y deben conservarse años. ¿Qué clase conviene?', ["Archive","Ninguna","Standard"], "GEcFSxdTQE0QRhcQdxEGDABbBkwKBkRBUxYOpsUaDQENHRQQTBJSBkUDHEwRCA4HSA1CUxEKRAVMQwGs1BcNUVcRBEQNSEMAChAWAxBL"),
    q('¿Qué contrapartida tienen las clases más frías?', ["Menos seguridad","Acceso más caro y a veces más lento","Menos espacio"], "GEcFSxdSQE0QRhcQZQZFBQFCER4OVQFDElcPCAUKSA0NAhwBQ0ZZQwRECkIQGA5VAEheFgIGBwxeDEJNCA==")];
  Q['almacenamiento/publico'] = [
    q('Un bucket con datos personales se deja público por error. ¿Qué riesgo hay?', ["Va más lento","Se llena antes","Cualquiera en Internet puede leerlos"], "GEcFSxdRQE0QRhcQYw1FBQpOBh8AVRTuiFQPDAcGDQYUHxoKSBJaDBZEDUwXAxxVBQ1GWQcKRAxBQwEaGwBCHBQe"),
    q('¿Cómo se evita?', ["Cambiar el nombre","Acceso uniforme y bloqueo de acceso público","Comprimir los ficheros"], "GEcFSxdSQE0QRhcQdA8KFRxIAh5PEAgNU1UAABcGDROv1RcIRFFZQxxEDUwRTB8QFkBbRQwWRBpCDwNPFERcR18GC0QKQhEeCgYUQlxSAktGFA==")];
  Q['analitica/fases'] = [
    q('¿Por qué se reparte una consulta entre trabajadores?', ["Para gastar más","Para procesar partes en paralelo","Para cambiar los datos"], "GEcFSxdSQE0QRhcQdQIBBUlZEQ0NFA5MVlkRRRQbQgAJHBREWFxXQxULG04Kr9wbRFQSWhYAAwYNEAlPFgtAUF8NBApJQQwfTwcBXkdaFwQABl5NThI="),
    q('¿Qué ocurre en la fase final?', ["Se apaga el servicio","Se combinan los resultados parciales","Se borran las tablas"], "GEcFSxdSQE0QRhcQegIWRA9MEAkcVQJEXFcPABdJTAQeChIFQxJaDEUVHEhDDw4ZB1heVxEKCklBDB9PARZMUFcJBAAGXwYfQVcZ")];
  Q['analitica/poda'] = [
    q('Consultas solo un día de una tabla particionada por fecha. ¿Cuánto se lee?', ["Solo la partición de ese día","Nada","Toda la tabla"], "GEcFSxdTQE0QRhcQegJFFAZJAkwLEERdU0QXDAcAQg0JHFUBW1tCAkUIDEgRTAMaRFxHU0MLC0lFAg8KVQJMXkICS0YU"),
    q('Si facturan por datos leídos, ¿qué hace la poda?', ["Reduce el coste","No influye","Lo sube"], "GEcFSxdTQE0QRhcQewYLCxoNBw0bGhcNXlOgyAAGXk9MAhAKQkEWAAoXHUhNThI=")];
  Q['analitica/columnas'] = [
    q('Una consulta usa 2 columnas de 50. ¿Qué almacenamiento rinde mejor?', ["Por columnas","Por filas","Da igual"], "GEcFSxdTQE0QRhcQcw9FAgZfDg0bGkROXVoWCAoIX0MAChBEXl1aDEUICF5DDwAZEUBcVxBFCgxOBh8OBw1MQRhBGA=="),
    q('¿Qué formato de almacenamiento suele usar BigQuery?', ["Por filas","Imágenes","Columnar"], "GEcFSxdRQE0QRhcQcxARp8gNBwUcEKecU1IMRRQIXwJMDhsFQfGbFwwHCA0QAw0HAQ1CWQAEF0lODAAaGApMQRYHAEQEWAAEDgZES1taAhZKS1A=")];
  Q['analitica/shuffle'] = [
    q('¿Qué es el shuffle?', ["Una copia de seguridad","Borrar duplicados","Reagrupar datos entre trabajadores por clave"], "GEcFSxdRQE0QRhcQZgIXBUlYDUwoJyt4YhYhPEQBTBpMHgABDVhDDREFGw0PDRxVAkReVxBFBwZDQwAOVQlEQVsCRQcFTBUJQVcZ"),
    q('¿Por qué el shuffle es costoso?', ["Mueve datos por la red entre nodos","Lee menos datos","Usa menos memoria"], "GEcFSxdTQE0QRhcQcxBFCAgNEw0dAQENQ0MGRQmqjBBMGwenjFRfAApEDUhDHgoRREpXWAYXBUcPHg==")];
  Q['computacion/nodo'] = [
    q('Con varios núcleos, ¿cómo acabarás antes tareas independientes?', ["En paralelo","Una detrás de otra","Con menos datos"], "GEcFSxdTQE0QRhcQZAYVBRtZCh5PEAgNRkQCBwUDQkMJAQEWSBJYoN8HBUgMH08HAUlHVQZFAQUNFwUKGBRCEkIMEQUFA0ER"),
    q('¿Qué limita la mejora al paralelizar?', ["El color","La parte que no se puede repartir","El nombre del nodo"], "GEcFSxdSQE0QRhcQegJFFAhfFwlPBgFOR1MNBg0IQUMcABsBDUdYQxELGUhDDU8ZBQ1TVQYJARtMAAWsxgoDEEs=")];
  Q['computacion/aceleracion'] = [
    q('¿Qué mide la aceleración?', ["El tamaño","Cuántas veces más rápido va con más recursos","El precio"], "GEcFSxdSQE0QRhcQcxBFAQUNFwUKGBRCElUMC0RYDRYCBhEFSRJSChMNDUQHA08FC18SUw9FEABIDhwAVQdCXBYNS0YU"),
    q('Al duplicar núcleos la eficiencia baja. ¿Por qué?', ["Porque cuesta menos","Porque se rompen","Por la coordinación y las partes secuenciales"], "GEcFSxdRQE0QRhcQZQoACRlfBkwHFB0NRkQCBwUDQkMIClUHQl1EBwwKCE4Kr9wbRFxHU0MLC0leBkwfFBZMXlMPDB4IA0ER")];
  Q['computacion/cluster'] = [
    q('En un clúster, ¿qué hace la reducción?', ["Cifra los datos","Combina los resultados parciales","Divide los datos"], "GEcFSxdSQE0QRhcQYhEEF0ldEQMMEBdMQBYTBBYdRAAFABsBXh4WEABECEoRCQgUCg1eWRBFFgxeFgAbFABCQRhBGA=="),
    q('¿Qué es una partición?', ["Un permiso","Un trozo de los datos para un nodo","Un disco"], "GEcFSxdSQE0QRhcQegwWRA1MFwMcVRdIEkQGFQUbWQYCTxAKDUJXERENCkQMAgoGRFxHU0MWAUldEQMMEBdMXBYGC0QZTBENAxAIQhwUHg==")];
  Q['computacion/sesgo'] = [
    q('Una clave concentra la mayoría de los datos. ¿Qué pasa?', ["Un nodo tarda mucho más que los demás","Se pierden datos","Todo va más rápido"], "GEcFSxdTQE0QRhcQcw9FCgZJDEwMGgoNXldDBggIWwZMHBAXSlNSAkUBGg0GAE8WEUheWgxFAAwNAQMbEAhBUxhBGA=="),
    q('¿Cómo se mitiga el sesgo?', ["Apagar nodos","Añadir más usuarios","Repartir la clave pesada en subclaves"], "GEcFSxdRQE0QRhcQcgoTDQ1EEUwDFEROXlcVAEQNQg4FARQKWVcWBhQRAEEKDh0UREheFhcXBQtMCQNBVxk=")];
  Q['bases-de-datos/replicacion'] = [
    q('En replicación líder-seguidor, ¿quién recibe las escrituras?', ["El líder","Ninguno","Cualquiera"], "GEcFSxdTQE0QRhcQcw9FCKqABwkdVQhMQRYCBgEZWQJMFlUITEEWExcLGUwEDU8UREFdRUMWAQ5YCggABwFeHBQe"),
    q('¿Para qué sirven los seguidores?', ["Cambiar los datos","Gastar disco","Tolerar fallos y repartir lecturas"], "GEcFSxdRQE0QRhcQcgILRApCEwUOVQBIEloMFkQNTBcDHFUdDVFXEwQHAEkCCE8RAQ1eUwARERtMTU4S")];
  Q['bases-de-datos/eleccion'] = [
    q('Cae el líder. ¿Qué ocurre?', ["Los seguidores eligen un nuevo líder","Se apaga la base","Se pierden las réplicas"], "GEcFSxdTQE0QRhcQZQZFDAhOBkwaGwUNV1oGBgcA7tACTwUFX1MWEhABSUIXHgBVCkJWWUMEFxxAAkwKGURBW1IGFwUTSgxCTQg="),
    q('¿Por qué hace falta mayoría para elegir?', ["Por estética","Para evitar dos líderes a la vez","Por coste"], "GEcFSxdSQE0QRhcQegJFCQhUDB6s2AUNV0AKEQVJSA9MDBAWSFBEDEUAAFsKCAYRCw0aRRMJDR0NAR4OHAoEHBQe")];
  Q['bases-de-datos/writeconcern'] = [
    q('w:1 frente a majority: ¿cuál es más seguro?', ["Igual","w:1","majority"], "GEcFSxdRQE0QRhcQdQwLRARMCQMdHBBUEloCRQEaThEFGwAWTBJTEBGnyA0GAk8ZBQ1fVxoKFqqAAkwLEERf8Z8TCQ0KTBBMDhsQSEEWBwBECkINCgYHCUxARQZLRhQ="),
    q('¿Qué coste tiene majority?', ["Menos datos","Menos seguridad","Más latencia"], "GEcFSxdRQE0QRhcQcxAVARtMEUwCtsVeElUMCwIAXw4NDBwLQ1dFQxEFG0kCTAK2xV4cFB4=")];
  Q['bases-de-datos/copia'] = [
    q('Se borra una tabla por error. ¿Una réplica ayuda?', ["No, replica también el borrado","Sí, siempre","Solo en fin de semana"], "GEcFSxdTQE0QRhcQegIWRBvuyhwDHAdMQRYAChQATA1MAxoXDVFXDgcNBl5PTBsUCU9b9coLRAVCEEwKBxZCQFMQXkQBTAAJTxMFQUZXQwYLGUQCTAsQRF5XURYXDQ1MB0JNCA=="),
    q('¿Qué protege una copia de seguridad que no protege una réplica?', ["Errores humanos y borrados","Un fallo de disco","Un corte de luz"], "GEcFSxdTQE0QRhcQZgYXCQBZBkwZGghbV0RDBEQcQ0McGhsQQhJXDREBG0QMHk8QCg1XWkMRDQxAEwNBVxk=")];
  Q['ia/entrenar'] = [
    q('¿Por qué se entrena un modelo en paralelo?', ["Para reducir el tiempo de entrenamiento","Para tener peor modelo","Para gastar menos datos"], "GEcFSxdTQE0QRhcQZQZFFgxdAh4bEAoNXlkXABdJSQZMCxQQQkEWBgsQG0hDGB0UBkxYVwcKFgxeQxVPBgENUVkOBw0HTA1MAxoXDUBTEBAIHUwHAxxbRlA="),
    q('¿Qué se combina entre trabajadores?', ["Los discos","Las contraseñas","Los gradientes o parámetros"], "GEcFSxdRQE0QRhcQdQIBBUlZEQ0NFA5MVlkRRQcIQQAZAxRETFFCFgQIAFcCDwYaCkhBFhpFFwwNEx4AGAFJW1cNS0YU")];
  Q['ia/inferencia'] = [
    q('¿Qué es la inferencia?', ["Entrenar de nuevo","Borrar el modelo","Usar el modelo ya entrenado para predecir"], "GEcFSxdRQE0QRhcQZQZFAQdboMEOG0RJU0IMFkQHWAYaAAZETF4WDgoADEEMTBZVAEhEQwYJEgwNFgIOVRRfV1IKBgcA7tACQVcZ"),
    q('¿Qué suele importar más al servir un modelo?', ["El color","El tamaño del bucket","La latencia"], "GEcFSxdRQE0QRhcQegIWRBtIEBwaEBdZU0VDAQELSA1MAxkBSlNEQxenyF0KCABVBUESQxAQBRtEDEJNCA==")];
  Q['ia/pipeline'] = [
    q('¿Qué ventaja da un pipeline?', ["Evitar el modelo","Evitar los datos","Repetir todo el proceso de forma ordenada"], "GEcFSxdRQE0QRhcQcgIRCxoNger9VQlCVlMPCkSLq/FMChsAXV1fDRFEGkhDCQEWBUlXWAILRBANEAlPBRFIVlMNRRYMSAkJDAAQTEAYQRg="),
    q('¿Qué es un endpoint?', ["Un servicio al que se le piden predicciones","Un permiso","Un disco"], "GEcFSxdTQE0QRhcQcxBFCAgNExkKBxBMElIGRQEHWRENCxREXVNEAkUHBkMQGQMBBV8SUw9FCQZJBgAAVQBIQUYPAAMISQxCTQg=")];
})(window.CEDI);
