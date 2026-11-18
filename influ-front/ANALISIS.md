# Influ · Análisis

> **Versión vigente: 22 oct 2026** (sección 0). Fuentes: *Influ MVP Fase 1* (.docx, 22 oct),
> *Flujo Pantallas Fase 1* (PDF, 26 pantallas), *Influ MVP Fase 2* (.docx, 29 sep) e *Influ
> Pantallas Fase 2* (PDF, 18 pantallas). Las secciones a) a i) son el análisis original de la
> Fase 0 (29 sep); lo que cambió está en la sección 0 y manda sobre ellas.

## 0. Cambios de la versión del 22 oct

### 0.1 Pantallas de Fase 1 → rutas

| # | Pantalla | Ruta | Perfil |
|---|---|---|---|
| 1 | Landing page | `/inicio` (+ `influ-landing/public/index.html`) | Público |
| 2 | Selector de registro | `/registro` | Público |
| 3 | Registro de talento (2 vistas: datos y cobro · perfil de creador) | `/registro?tipo=talento` | Público |
| 4 | Registro de agencia (preferencia de aviso de pago) | `/registro?tipo=agencia` | Público |
| 5 | Dashboard del talento | `/resumen` | Talento |
| 6–7 | Solicitud (datos, entregables, área de pagos) · CFDI XML+PDF y contrato | `/pedir-adelanto` | Talento / agencia |
| 8 | Validación del CFDI y análisis del contrato en curso | `/operaciones?id=` | Talento / agencia |
| 9 | Firma del documento único (DocuSign) | `/operaciones?id=` | Talento / agencia |
| 10 | Evidencia con links por publicación y sugerencia de cumplimiento | `/operaciones?id=` | Talento / agencia |
| 11 | Métricas de la campaña | `/metricas` | Talento / agencia |
| 12–13 | Pago liberado · seguimiento y vencimiento | `/operaciones?id=` | Talento / agencia |
| 14 | Liquidación y cierre | `/operaciones?id=` | Talento / agencia |
| 15 | Aprobación de registros | `/registros` | Equipo |
| 16 | Cola de solicitudes (CFDI y semáforo IA) + tablero por etapa | `/solicitudes` | Equipo |
| 17 | Revisión con ficha del contrato | `/revision` | Equipo |
| 18 | Cola del RUG | `/rug` | Equipo |
| 19 | Notificaciones de cesión | `/cesiones` | Equipo |
| 20 | Orden de pago manual (doble control y CEP) + cobranza a marcas | `/pagos` | Equipo |
| 21 | Ficha de marca + catálogo de empresas | `/marcas` | Equipo |
| 22 | Notificaciones internas (Alertas) | `/notificaciones` | Equipo |
| 23 | Resumen de agencia | `/resumen` | Agencia |
| 24–25 | Mis talentos · detalle de talento | `/talentos`, `/talentos?id=` | Agencia |
| 26 | Selección de talento | `/pedir-adelanto` (paso 0) | Agencia |
| — | Perfil (talento) · Configuración (agencia) | `/perfil` | Talento / agencia |

Fase 2 (marketplace, 18 pantallas) vive en `src/market` con rutas `/mk/...`: ver `src/market/README.md`.

### 0.2 Modelo de datos (`src/data/types.ts`)

- **Talento**: perfil de creador (handles por red con seguidores y "cuenta encontrada", nichos, tipo
  de contenido, ubicación país/estado/ciudad, género, foto, lada + teléfono, régimen fiscal), fecha
  de nacimiento **derivada del RFC** con el siglo de la CURP (`nacimientoPorRevisar` si no coinciden),
  consentimientos versionados, `cuenta` (En revisión · Observada · Preaprobada · Rechazada) con
  `resoluciones` (quién y cuándo). Sale `categoria`, `instagram`, `tiktok`, `ciudad`.
- **Agencia**: condiciones pactadas (9% + 1.5%, vigentes desde), `avisoPago` (Talento · Agencia ·
  Ambos), `cuenta` y `resoluciones`. Sale el acta constitutiva como requisito.
- **Empresa** (quien paga: RFC, 69-B, contacto del área de pagos y de marketing, plazo, origen
  CFDI/catálogo/invitación) separada de la **Marca** anunciante (`empresaId`, industria).
- **Operación**: entregables pactados, contacto de pagos y de marketing, **CFDI estructurado**
  (emisor, receptor, conceptos, método y forma de pago, fechas), validación con PAC (UUID vigente,
  RFC emisor, 69-B, monto y fecha, marca vinculada), **análisis del contrato** (campos con cita a
  cláusula y página, confianza, alerta, corrección del equipo; semáforo; monto base sugerido),
  consulta previa del RUG, consentimiento de la marca, observación, monto base aprobado,
  **notificación de cesión** (envío, apertura, acuse, reenvíos), **RUG** (cola, folio, vigencia,
  boleta, cierre). Estatus nuevo: `Observada`.
- **Pieza** publicada (link o capturas de story, verificación, snapshots que nunca se sobreescriben,
  fotos D7/D30), **OrdenPago** (prepara/autoriza/CEP), **Correo** (cesión, recordatorios, pago
  recibido, resolución de cuenta). Rol nuevo **Marca** (usuarios de marca de Fase 2 con permisos).

### 0.3 Reglas nuevas (`src/store/useInflu.ts`)

| Regla (documento) | Acción |
|---|---|
| Toda cuenta nueva queda en revisión; preaprobar, observar (pide corrección) o rechazar; queda quién y cuándo; aviso al usuario | `registrarTalento`, `registrarAgencia`, `resolverCuenta`, `reenviarRevision` |
| El talento pide con las dos aprobaciones (Influ y su agencia), en paralelo | `bloqueoPedir` (derive), `capturarSolicitud` |
| Handles: al menos uno, @usuario sin espacios, la plataforma comprueba que existe | `registrarTalento`, `actualizarPerfil` |
| Solicitud con entregables y email obligatorio del área de pagos; se guarda en la ficha de la empresa | `capturarSolicitud` |
| CFDI XML + PDF; PAC: UUID vigente, RFC emisor, 69-B, monto y fecha, marca vinculada por RFC receptor (alta automática desde CFDI); si falla, el flujo se corta | `capturarSolicitud`, `validarCfdi` |
| La IA lee el contrato (página a página) y arma la ficha; no aprueba sola | `avanzarAnalisis`, `construirFicha` |
| KPIs condicionados → solo la porción no condicionada; pena compensable → se resta; prohíbe ceder → rojo sin consentimiento escrito; confidencialidad → revisar | `construirFicha`, `bloqueosRevision`, `avisosRevision` |
| Consulta previa del RUG por RFC del otorgante (doble factoraje) | `avanzarAnalisis` |
| Correcciones del equipo a la ficha quedan registradas (precisión de la IA) | `corregirCampo` |
| Aprobación colectiva sin umbral; monto base aprobado | `votarAprobacion`, `observarSolicitud`, `responderObservacion` |
| Al completarse la firma: notificación de la cesión al área de pagos y RUG en cola | `firmarDocumento` |
| Sin acuse a las 48 h: reenvío automático y alerta | `useMotorSimulado`, `reenviarCesion` |
| RUG asistido: datos precargados, boleta leída por IA, vigencia 12 meses, alerta 30 días, actualizar/cancelar al cerrar | `inscribirRug`, `actualizarRug`, `cancelarRug` |
| Link por publicación verificado (existe, handle registrado, fecha, mención); stories con captura; métricas al cargar, cada 24 h por 30 días, fotos D7/D30 | `cargarPieza`, `verificarLink`, `snapshotsHasta` |
| La plataforma sugiere completa/parcial; quien carga confirma | `enviarEvidencia`, `sugerencia` |
| El 80% no sale sin firma, RUG inscrito, cesión con acuse y evidencia | `faltantesLiberar`, `prepararOrden` |
| Orden de pago (CLABE validada, monto, referencia); prepara una persona, autoriza otra; CEP dispara el WhatsApp | `prepararOrden`, `autorizarOrden`, `cargarCep` |
| WhatsApp según la preferencia de la agencia (talento, agencia o ambos) | `destinosAviso`, `avisarPago`, `cambiarAvisoPago` |
| Recordatorios por email al área de pagos (7 y 1 día); registro y conciliación del pago; aviso de pago recibido | `recordatorios`, `registrarCobro` |
| Comisión sobre el **monto adelantado** (pantalla 14: $64,000 → $5,760 + $1,920 → neto $8,320) | `liquidacion` |
| Cierre: estado pagada, plazo real de pago de la marca, tarea de RUG | `cargarCep` (remanente), `plazoReal` |

### 0.4 Decisiones provisionales nuevas

| # | Tema | Valor provisional |
|---|---|---|
| 1 | Base de la comisión | **Resuelto**: sobre el monto adelantado (pantalla 14) |
| 4 | Quién firma y sube evidencia | Sigue: quien pidió el adelanto |
| 15 | Modalidad del RUG (se define antes del piloto) | Asistida (`MODALIDAD_RUG`) |
| 16 | Evidencia de la notificación para liberar | Acuse de recibo (botón o respuesta); la marca no tiene panel: en el demo se simula desde Notificaciones de cesión |
| 17 | Fecha de publicación | Puede ser futura (hasta 60 días): los links se cargan después de la firma y la verificación falla si la fecha aún no llega |
| 18 | Quórum de la aprobación colectiva | Sigue en 2 votos (la pantalla 17 muestra 3; el documento no fija número) |
| 19 | Validar el contacto del área de pagos "una sola vez" | Botón "Validar contacto" en la ficha de marca |
| 20 | Lectura de la IA, PAC, proveedor de datos públicos, DocuSign, RUG, SPEI, WhatsApp, email | Simulados con sus reglas; integraciones del §12 pendientes de contratar |
| — | Fecha fija del demo | Lunes **26 oct 2026** |

### 0.5 Fuera de alcance (documento §13)

Dispersión automática por API bancaria (llega en Fase 2), scoring de riesgo automático (la revisión
lo indica), automatización total del RUG, exclusividad con agencias, verificación de identidad
adicional agencia–talento y conexión de redes del talento (Fase 1 usa handles, links y capturas).

### 0.6 Criterios de éxito del piloto (día 90)

En el Tablero: % liberadas en 24–48 h, % fichas sin correcciones, % publicaciones verificadas, % cesiones
con acuse en 48 h, tiempo de inscripción en el RUG, tiempo de preaprobación, volumen y operaciones,
plazo real por marca y % de pendientes que las agencias no resolvieron. La satisfacción se mide en el
checkpoint con Stay On Social, Le Reve y Paragon Talent.

---

## Fase 0 (29 sep) · análisis original


Fuentes: *Influ · Flujo operativo (pantallas)* (19 pantallas) e *Influ · Recorrido
operativo* (14 pasos). Giro: financiamiento — factoraje de colaboraciones de
influencers: Influ adelanta el 80% de la factura (CFDI) que el talento o su agencia
le emitió a una marca, cobra la factura completa a la marca al vencimiento y
liquida el 20% restante descontando su comisión (9% fijo + 1.5% mensual).

Datos del arranque que venían vacíos o ambiguos (se resolvieron con "Decisiones
sin preguntar" de 01):

| Dato | Valor aplicado |
|---|---|
| Carpeta ("te la subí en archivos") | La carpeta actual no está vacía → `~/Documents/Influ/influ-front` |
| Fecha fija (vacía) | Hoy 29 sep 2026 + 4 días = sáb 3 oct → siguiente día hábil: **lunes 5 oct 2026** |
| Región | El documento dice "México" y usa Ciudad de México como ejemplo: talento de CDMX, Monterrey y Guadalajara; Influ opera desde Monterrey (teléfonos 81) |
| Color de marca | El verde de Influ choca con el verde de estado (`success`); se conserva el azul del design system |

Todo lo que el documento escribe en voseo ("Cobrá", "Subí") se pasa a español de México ("Cobra", "Sube").

## a) Módulos por área del menú

| Área | Módulo · ruta | Pantalla del documento | Spec | Adaptables aplicados |
|---|---|---|---|---|
| — | Login · `/login` | "Ingresar" | login.md | Marca Influ, giro "adelanto de colaboraciones", 3 viñetas del giro; enlace a registro |
| — | Página pública · `/inicio` | p. 1 (landing) | sin spec → `modulos/pagina-publica.md` | — |
| — | Registro · `/registro` | p. 2–4 (elige panel, talento, agencia) | sin spec → `modulos/registro.md` | — |
| Dirección | Tablero · `/tablero` | "Reportes" del panel interno | dashboard.md | KPIs y gráficas por equivalencia (ver g); KPI 6 "Bancos + cobranza" (Influ sí mueve dinero) |
| Operación | Solicitudes de adelanto · `/solicitudes` | p. 13 cola + p. 14 revisión | solicitudes.md (patrón kanban de pedidos.md) | Etapas: En revisión · Por firmar · Evidencia y RUG · Adelanto liberado; documentos exigidos = CFDI, contrato, firma, RUG, evidencia, notificación de pago; "número del tercero" = folio de inscripción RUG. Modal de revisión con tabla CFDI vs contrato (patrón de validación de pedidos.md) |
| Operación | Notificaciones · `/notificaciones` | p. 15 (interno) y "Notificaciones" del portal | sin spec → `modulos/notificaciones.md` | — |
| Mi cuenta | Resumen · `/resumen` | p. 5 (talento) y p. 16 (agencia) | sin spec → `modulos/portal.md` | — |
| Mi cuenta | Pedir adelanto · `/pedir-adelanto` | p. 6 y p. 19 (elegir talento) | sin spec → `modulos/portal.md` | — |
| Mi cuenta | Mis operaciones · `/operaciones` | p. 7–12 (etapas 2 a 6) y p. 11 (detalle) | sin spec → `modulos/portal.md` | — |
| Cartera | Talentos · `/talentos` | p. 17–18 (Mis talentos, detalle) | clientes.md (layout de catálogo) | Cliente → Talento; Contacto → Instagram; Prioridad → Agencia; Días de crédito → Categoría; Anticipo → CLABE; Saldo → Adelantado vigente; panel `arriba` "Pendientes de aprobación" (confirmar representación); sin "Nuevo" (el talento nace en el registro) |
| Cartera | Agencias · `/agencias` | "Agencias" del panel interno + p. 4 | clientes.md (layout de catálogo) | Prioridad → Folio mercantil; Días de crédito → Talentos confirmados; Anticipo → Acta constitutiva; Saldo → Adelantado vigente; acción "Validar agencia"; sin "Nuevo" (nace en el registro) |
| Cartera | Marcas · `/marcas` | (la marca se captura en p. 6) | clientes.md (layout de catálogo) | Cliente → Marca; Prioridad → Lista 69-B; Días de crédito → Plazo habitual; Anticipo → Días reales de pago (derivado); Saldo → Por cobrar |
| Sistema | Usuarios · `/usuarios` | — | usuarios.md | 4 perfiles; columna "Talento o agencia relacionada" (llave de la cartera propia) |
| Sistema | Roles · `/roles` | — | roles.md | Columnas derivadas de `permisos.ts`; "Cartera propia" en Información a la que accede |
| Sistema | Bitácora · `/bitacora` | — | bitacora.md | AUTORIZACIONES del giro (votos, liberaciones, cobros, liquidaciones, RUG, validaciones) |

Specs que no aplican al giro: pedidos (solo su patrón kanban y el de validación
contra historial), compras, pagos/tesorería (no está en el documento; va a
siguiente etapa), proveedores, inventarios, recepción, embarques, rastreo,
programación, facturación (el CFDI lo emite el talento, no Influ), gastos,
pólizas, asesores, productos, cartera vencida y avisos de cobranza (los
recordatorios del documento son internos: se resuelven en Notificaciones),
comunicación (solo existe el aviso de pago por WhatsApp: vive en Notificaciones).

> **Cambio del 29 sep (a pedido del cliente):** se quitaron los módulos de Cuentas por cobrar y Cuentas
> por pagar; el pago de la marca y el del remanente se registran en el kanban de Solicitudes (5 columnas).

## b) Entidades

Ver `src/data/types.ts`.

| Entidad | Campos principales | Estatus |
|---|---|---|
| Talento | nombre, correo, teléfono (WhatsApp), ciudad, RFC, CURP, Instagram, TikTok, categoría, agenciaId, representación, CLABE, banco, condiciones aceptadas, alta | `Activo` · `Pendiente de aprobación` · `Suspendido`; representación `Independiente` · `Pendiente` · `Confirmada` |
| Agencia | nombre, razón social, contacto, correo, teléfono, RFC, talentos aprox., folio mercantil, acta constitutiva, CLABE, banco, alta, validó | `Por validar` · `Activa` · `Suspendida` |
| Marca | nombre, razón social, RFC, contacto, correo, plazo habitual, lista 69-B | `Activa` · `En revisión` · `Bloqueada` |
| Operación (solicitud de adelanto) | folio `INF-0142`, talento, agencia, solicitante (Talento/Agencia), marca, monto, fecha de publicación, plazo, CFDI (UUID, serie-folio, RFC emisor/receptor, total, fecha, validación SAT), contrato (razón social, monto, RFC, fecha, plazo), votos, firma DocuSign, RUG, evidencia (archivos, alcance, % cumplido, notificación a Influ), a quién avisar, adelanto (monto, cuenta, SPEI) | `En revisión` · `Por firmar` · `Firmada` · `Activa` · `Por liquidar` · `Liquidada` · `Rechazada` |
| CxC (factura a la marca) | operación, marca, documento, importe, abonos, vencimiento | derivado `Vigente` · `Vencido` · `Pagado` |
| CxP (remanente) | operación, beneficiario, documento `LIQ-0142`, pago | derivado `Vigente` · `Vencido` · `Pagado`; bloqueo derivado mientras la marca no pague |
| Cuenta bancaria | banco, cuenta, uso, saldo | — |
| Mensaje de WhatsApp | operación, destinatario, teléfono, tipo (Adelanto enviado / Remanente enviado), contenido | `Enviado` · `Entregado` · `Fallido` |
| Usuario · Rol · Bitácora · Sesión | como en los specs | Usuario `Activo` · `Suspendido`; Rol `Activo` · `Inactivo` |

Las notificaciones internas **no se guardan**: se derivan de las fechas de cada
operación (captura, firma, evidencia, adelanto, vencimiento, pago de la marca).

## c) Flujo principal

```
registrarTalento / registrarAgencia (público)
   ├─ talento con agencia → Pendiente → confirmarRepresentacion (agencia) → Activo
   └─ agencia → Por validar → validarAgencia (equipo) → Activa
capturarSolicitud (talento o agencia)          ─▶ En revisión   [paso 3]
   └─ validación automática del CFDI (Sistema: RFC, UUID, 69-B, UUID único)
        └─ falla → Rechazada automáticamente          [paso 4]
votarAprobacion (equipo, 2 integrantes) ─▶ Por firmar   [paso 5]  · rechazarSolicitud ─▶ Rechazada
firmarDocumento (solicitante, DocuSign) ─▶ Firmada       [paso 6]
inscribirRug (equipo)                                     [paso 7]
enviarEvidencia (solicitante)                             [paso 8]
liberarAdelanto (equipo, SPEI 80%) ─▶ Activa             [paso 9]
   ├─ crea CxC (la marca debe la factura completa a Influ)
   ├─ crea CxP del remanente (bloqueada hasta el pago de la marca)
   └─ WhatsApp "pago enviado" a quien se eligió            [paso 10]
notificaciones internas (derivadas)                       [paso 11]
registrarCobro (equipo, pago de la marca en CxC) ─▶ Por liquidar [paso 12]
liquidarRemanente (equipo, CxP) ─▶ Liquidada (cierre)    [pasos 13–14]
   └─ WhatsApp "pago enviado"
```

## d) Reglas críticas → acción del store (`src/store/useInflu.ts`)

| # | Regla (documento) | Acción |
|---|---|---|
| 1 | Talento con agencia queda pendiente hasta que la agencia confirme; sin confirmación no pide adelanto | `registrarTalento`, `confirmarRepresentacion`, `capturarSolicitud` |
| 2 | La agencia se valida con su folio mercantil antes de operar | `registrarAgencia`, `validarAgencia`, `capturarSolicitud` |
| 3 | La agencia solo pide para talentos con representación confirmada | `capturarSolicitud` |
| 4 | Obligatorios: marca, monto, fecha de publicación, plazo, CFDI y contrato | `capturarSolicitud` |
| 5 | El CFDI se valida solo contra el SAT: RFC del emisor, UUID válido, lista 69-B | `capturarSolicitud` (`validarCfdi` en derive) |
| 6 | Nadie cobra la misma factura dos veces (UUID único y misma colaboración) | `capturarSolicitud`; RUG en `inscribirRug` |
| 7 | El contrato debe decir lo mismo que la factura (marca, monto, RFC, fecha, plazo coherente) | `votarAprobacion` |
| 8 | La aprobación la decide el equipo en conjunto, sin umbral de monto | `votarAprobacion` (quórum de 2, provisional) |
| 9 | Un solo documento DocuSign con contrato, pagaré y certificación | `firmarDocumento` (las 3 secciones) |
| 10 | Se inscribe la cesión en el RUG antes de pagar | `inscribirRug`, `liberarAdelanto` |
| 11 | Evidencia de campaña + alcance + notificación de pago dirigida a Influ | `enviarEvidencia`, `liberarAdelanto` |
| 12 | 80% sobre el total (campaña completa) o sobre la porción cumplida (hitos parciales) | `liberarAdelanto` (`montoAdelanto` en derive) |
| 13 | El adelanto va a quien subió la factura | `liberarAdelanto` (CLABE del solicitante) |
| 14 | El único aviso por WhatsApp es "pago enviado", a quien se eligió | `liberarAdelanto`, `liquidarRemanente`, `guardarAvisos` |
| 15 | Los demás avisos quedan en el panel | `notificaciones()` en derive (nada sale por WhatsApp) |
| 16 | La marca paga la factura completa directo a Influ | `registrarCobro` (cuenta destino de Influ) |
| 17 | El 20% se paga solo con el pago de la marca acreditado, descontando 9% fijo y 1.5% mensual | `liquidarRemanente` (`liquidacion` en derive) |
| 18 | La operación se cierra al pagar el remanente | `liquidarRemanente` |
| 19 | Condiciones comerciales aceptadas al registrarse | `registrarTalento`, `registrarAgencia` |
| 20 | Cada talento ve lo suyo; la agencia, lo de sus talentos | `vista()` al leer, `deSuCartera()` en cada acción |
| — | Bitácora inalterable | `log` (no hay acción que la edite) |

## e) Perfiles

`E` = pantalla de entrada · `●` = abre · vacío = no abre.

| Área | Módulo | Dirección General | Equipo interno | Agencia | Talento |
|---|---|---|---|---|---|
| Dirección | Tablero | **E** | | | |
| Operación | Solicitudes de adelanto | ● | **E** | | |
| Operación | Notificaciones | ● | ● | ● propias | ● propias |
| Mi cuenta | Resumen | ● | | **E** | **E** |
| Mi cuenta | Pedir adelanto | ● | | ● | ● |
| Mi cuenta | Mis operaciones | ● | ● consulta | ● propias | ● propias |
| Cartera | Talentos | ● | ● | ● sus talentos | |
| Cartera | Agencias | ● | ● | | |
| Cartera | Marcas | ● | ● | | |
| Sistema | Usuarios · Roles · Bitácora | ● | | | |
| | **Ve importes** | sí | sí | sí (suyos) | sí (suyos) |

Qué autoriza cada uno (`autoriza` en `src/lib/permisos.ts`):

| Llave | Perfiles | Acción |
|---|---|---|
| `solicitud` | Agencia, Talento | capturar, firmar, enviar evidencia, elegir a quién avisar |
| `revision` | Dirección, Equipo interno | votar la aprobación, rechazar |
| `rug` | Dirección, Equipo interno | inscribir la cesión en el RUG |
| `dispersion` | Dirección, Equipo interno | liberar el 80% por SPEI |
| `cobro` | Dirección, Equipo interno | registrar el pago de la marca |
| `pago` | Dirección, Equipo interno | liquidar el remanente |
| `representacion` | Agencia | confirmar o rechazar talentos que la eligieron |
| `agencia` | Dirección, Equipo interno | validar folio mercantil, suspender |
| `catalogo` | Dirección, Equipo interno | editar talentos y marcas |
| `usuarios`, `roles` | Dirección | usuarios y estatus de perfiles |

Todos ven importes: los cuatro perfiles cobran, pagan o dirigen. El checklist
"perfiles sin importes" **no aplica** (el documento no tiene perfiles operativos sin dinero).

## f) Dolores del cliente → solución visible

| Dolor (documento) | Solución en el demo |
|---|---|
| El talento espera 30–90 días para cobrar | KPI "Tiempo de cobro" contra meta de 48 h; gráfica por operación; alerta "solicitudes en revisión con más de 24 h" |
| La agencia pone capital propio para retener talento | Panel de agencia con talentos, operaciones y adelantos; "Pedir adelanto" para cualquier talento confirmado |
| Riesgo de facturas falsas o de EFOS | Validación automática del CFDI (RFC, UUID, lista 69-B) con rechazo automático; alerta de agencias por validar |
| Riesgo de cobrar dos veces la misma factura | UUID único; inscripción en RUG obligatoria antes de pagar; alerta "cesiones firmadas sin inscribir en el RUG" |
| Contrato que no respalda la factura | Tabla CFDI vs contrato; diferencia de monto o marca bloquea la aprobación |
| Decisiones de crédito de una sola persona | Quórum de 2 votos distintos; bitácora de cada voto; alerta "solicitudes con 1 de 2 votos" |
| La marca paga tarde | Recordatorios internos a 7 y 1 día; alerta "facturas vencidas sin pago de la marca"; dona "Pagos de marcas a tiempo"; antigüedad por marca |
| Concentración en pocas marcas | Gráfica "Exposición por marca" con límite de concentración |
| Remanente olvidado después del pago de la marca | CxP desbloqueada al cobrar; alerta "remanentes por liquidar"; vencido a los 2 días |
| El talento no sabe cuándo le pagan | WhatsApp "pago enviado" (único mensaje externo); alerta de avisos no entregados con "Reenviar" |

## g) Tablero (dashboard.md, tabla de equivalencias → servicios financieros)

| Lugar | Influ |
|---|---|
| KPI 1 · volumen del insumo principal | **Adelantado en oct.** (Σ adelantos liberados en el mes) · nota "N operaciones" |
| KPI 2 · precio contra referencia | **Días reales de pago** de las marcas (90 días) · delta "sobre plazo" / "dentro del plazo" contra el plazo pactado promedio |
| KPI 3 · costo unitario del producto estrella | **Comisión por operación** (fija + variable promedio de las liquidadas, 90 días) |
| KPI 4 · pérdida contra meta | **Tiempo de cobro** (horas promedio de la solicitud al adelanto, 30 días) · meta 48 h |
| KPI 5 · cumplimiento | **Marcas a tiempo** (% de facturas pagadas en o antes del vencimiento, 90 días) |
| KPI 6 | **Bancos + cobranza** (saldo en bancos + cobranza estimada al cierre) · nota "vencido $X" |
| Dona 1 | **Pagos de marcas a tiempo** (A tiempo / Con atraso) |
| Dona 2 | **Cartera** (Vigente / Vencido, por cobrar a marcas) |
| Fila 3 | **Adelantos por mes** (operaciones, 2026 vs 2025) · **Importe adelantado por mes** (MXN) |
| Merma por corrida | **Tiempo de cobro por operación** (horas, 30 días, meta 48 h) |
| Cobertura de MP (ranking) | **Exposición por marca** (saldo por cobrar, top 8, rojo sobre el límite de concentración) |
| Pedidos abiertos (avance) | **Operaciones activas** (días transcurridos vs días por vencer) |
| Antigüedad de saldos | **Antigüedad de saldos por marca** (Corriente / 1 a 30 / 31 a 60 / Más de 60) |

## h) Pendientes y decisiones provisionales

| # | Tema | Valor provisional |
|---|---|---|
| 1 | Base de la comisión: el registro dice "sobre el monto adelantado"; la liquidación la calcula sobre el total de la factura | Sobre el **total de la factura** (cuadra con el ejemplo: $80,000 → $7,200 + $4,800) |
| 2 | Meses de la tasa variable | Meses iniciados entre la liberación del adelanto y el pago de la marca (hacia arriba, mínimo 1) |
| 3 | "El equipo en conjunto" | Quórum de **2 votos** de integrantes distintos (Dirección cuenta); un rechazo con motivo cierra la solicitud |
| 4 | Quién firma y sube evidencia (el documento dice "agencia" en el paso 8) | Quien pidió el adelanto; si lo pidió la agencia, el talento lo ve pero no actúa |
| 5 | Comisión mayor que el remanente (marcas que pagan muy tarde) | Remanente en $0 y la diferencia se muestra "a cargo"; su cobro va a siguiente etapa |
| 6 | Plazo para pagar el remanente tras el pago de la marca | 2 días |
| 7 | Cálculo del vencimiento | Fecha de publicación + plazo pactado con la marca |
| 8 | "Plazo coherente" | Contrato y captura con el mismo plazo; más de 120 días pide confirmación |
| 9 | Hitos parciales | El solicitante indica el % cumplido; el equipo lo coteja con la evidencia |
| 10 | Folio del RUG | Formato `RUG-AAAA-NNNNNN` |
| 11 | Agencia que rechaza a un talento | El talento queda independiente y puede operar solo |
| 12 | Tiempo de cobro prometido (24–48 h) | Meta 48 h de la captura al adelanto; alerta si una solicitud lleva más de 24 h en revisión |
| 13 | Límite de concentración por marca | 25% de la cartera por cobrar |
| 14 | Integraciones (SAT, DocuSign, RUG, SPEI, WhatsApp) | Simuladas en el demo con sus reglas y resultados; la conexión real va a siguiente etapa |
| — | Fecha fija | 2026-10-05 |
| — | Moneda | Solo MXN |

## i) Etapa futura (no se dibuja)

- **Score de riesgo**: el documento lo marca "Próximamente" hasta tener historial;
  en la revisión se muestra el recuadro "Próximamente" y los datos de cada operación ya se guardan.
- **Conexión real** con SAT, DocuSign, RUG, SPEI y WhatsApp Business (dependen de terceros).
- **Reportes** y **Configuración** del panel interno (las condiciones 9% + 1.5% viven en `constantes.ts`); **Ayuda** del portal.
- **Tesorería / fondeo** (disponible para nuevos adelantos): no está en el documento.
- Cobro del saldo a cargo cuando la comisión supera el remanente; descarga real del comprobante.
