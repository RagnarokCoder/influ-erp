// Entidades de Influ (ANALISIS.md §b), versión del 22 oct 2026: talento con su
// perfil de creador, agencia, empresa (quien paga) separada de la marca
// anunciante, la operación de adelanto con todo su recorrido, las piezas
// publicadas con sus métricas, la notificación de la cesión, la inscripción en
// el RUG y las órdenes de pago con doble control. Fase 2 (marketplace) se apoya
// en este mismo núcleo: ver src/market.

export type RolUsuario =
  | 'Dirección General'
  | 'Equipo interno'
  | 'Agencia'
  | 'Talento'
  | 'Marca'
  | 'Fondeador';

// ---------------------------------------------------------------------------
// Perfil del creador (formulario del registro, MVP Fase 1 §11)
// ---------------------------------------------------------------------------

export type Nicho =
  | 'Moda' | 'Belleza' | 'Lujo' | 'Fitness y bienestar' | 'Gastronomía' | 'Viajes' | 'Tecnología' | 'Gaming'
  | 'Finanzas personales' | 'Maternidad y familia' | 'Hogar y decoración' | 'Mascotas' | 'Deportes'
  | 'Música y entretenimiento' | 'Otro';

export type TipoContenido =
  | 'Lifestyle' | 'Storytelling' | 'Reviews' | 'Unboxing' | 'Tutoriales / how-to' | 'GRWM' | 'Vlogs' | 'Humor'
  | 'Educativo' | 'Otro';

export type Red = 'Instagram' | 'TikTok' | 'YouTube' | 'X' | 'Twitch' | 'Facebook' | 'Otra';

/** Un handle por red. Fase 1 no conecta la cuenta: la plataforma solo comprueba que existe. */
export interface Handle {
  red: Red;
  usuario: string;               // @usuario, sin espacios
  encontrada: boolean;           // la cuenta existe (proveedor de datos públicos)
  seguidores?: number;
}

export type Genero = 'Femenino' | 'Masculino' | 'No binario' | 'Prefiero no decir';

export interface Ubicacion { pais: string; estado: string; ciudad: string }

/** Consentimientos versionados: condiciones comerciales y aviso de privacidad. */
export interface Consentimiento {
  tipo: 'Condiciones comerciales' | 'Aviso de privacidad';
  version: string;
  fechaHora: string;
}

// ---------------------------------------------------------------------------
// Preaprobación de cuentas nuevas (MVP Fase 1 §2)
// ---------------------------------------------------------------------------

/** Toda cuenta nueva queda en revisión hasta que el equipo la preaprueba. */
export type EstadoCuenta = 'En revisión' | 'Observada' | 'Preaprobada' | 'Rechazada';

export interface Resolucion {
  decision: 'Preaprobada' | 'Observada' | 'Rechazada' | 'Reenviada';
  usuario: string;
  fechaHora: string;
  nota?: string;
}

/** A quién llega el aviso de pago por WhatsApp (preferencia de la agencia). */
export type AvisoPago = 'Talento' | 'Agencia' | 'Ambos';

export interface Agencia {
  id: string;
  nombre: string;
  razonSocial: string;
  rfc: string;                   // persona moral, 12 caracteres
  contacto: string;              // contacto principal
  correo: string;
  telefono: string;
  ciudad: string;
  folioMercantil: string;        // Registro Público de Comercio
  clabe: string;
  banco: string;
  /** Condiciones pactadas con Influ. */
  condiciones: { fija: number; mensual: number; desde: string };
  avisoPago: AvisoPago;
  consentimientos: Consentimiento[];
  alta: string;                  // fecha-hora del registro
  cuenta: EstadoCuenta;
  resoluciones: Resolucion[];
  estatus: 'Activa' | 'Suspendida';
}

export type Representacion = 'Independiente' | 'Pendiente' | 'Confirmada';

export type RegimenFiscal =
  | '626 · Régimen Simplificado de Confianza'
  | '612 · Actividades Empresariales y Profesionales'
  | '625 · Plataformas Tecnológicas'
  | '621 · Incorporación Fiscal'
  | '605 · Sueldos y Salarios';

export interface Talento {
  id: string;
  nombre: string;                // nombre legal (para el piloto queda pendiente en casi todos)
  /** Nombre como aparece en redes (board de Stay On Social). El `nombre` legal lo sube la agencia después. */
  nombreArtistico?: string;
  correo: string;
  lada: string;                  // +52 por omisión
  telefono: string;              // 10 dígitos; también es su WhatsApp
  /** Nacionalidad (cambio 12): el CURP solo es obligatorio para mexicanos. */
  nacionalidad?: 'Mexicana' | 'Extranjera';
  rfc: string;                   // persona física, 13 caracteres
  curp: string;                  // '' si es extranjero
  regimenFiscal: RegimenFiscal;
  /** No se pide: sale del RFC (posiciones 5 a 10) y el siglo se confirma con la CURP. */
  fechaNacimiento: string;
  /** El RFC y la CURP no coinciden en la fecha: se marca para la revisión del equipo. */
  nacimientoPorRevisar?: boolean;
  genero: Genero;
  foto: string;                  // nombre del archivo (JPG o PNG, hasta 5 MB)
  /** Audiencia total que reporta la agencia (board de Stay On Social). Puede ser mayor que la suma de redes. */
  audienciaTotal?: number;
  /** Persona física o grupo (ej. Los Chicaneros). Se confirma en la aprobación de Influ (M4). */
  tipo?: 'Persona física' | 'Grupo';
  handles: Handle[];
  nichos: Nicho[];
  nichoOtro?: string;
  tiposContenido: TipoContenido[];
  contenidoOtro?: string;
  ubicacion: Ubicacion;          // desde dónde crea su contenido
  agenciaId: string;             // '' si es independiente
  representacion: Representacion;
  confirmada?: string;           // fecha-hora en que la agencia confirmó
  clabe: string;
  banco: string;
  consentimientos: Consentimiento[];
  alta: string;                  // fecha-hora del registro
  cuenta: EstadoCuenta;
  resoluciones: Resolucion[];
  estatus: 'Activo' | 'Suspendido';
}

// ---------------------------------------------------------------------------
// Empresa (quien paga) y marca (anunciante)
// ---------------------------------------------------------------------------

export interface Contacto { nombre: string; email: string; telefono?: string; verificado?: boolean }

export interface Empresa {
  id: string;
  razonSocial: string;
  rfc: string;
  lista69b: boolean;             // aparece en la lista 69-B del SAT (EFOS)
  /** Área de pagos o cuentas por pagar: recibe la notificación de la cesión y la cobranza. */
  contactoPagos?: Contacto;
  contactoMarketing?: Contacto;
  plazoHabitual: number;         // días de pago que suele pactar
  /** Cómo nació: desde el CFDI de una solicitud, del catálogo o por invitación (Fase 2). */
  origen: 'CFDI' | 'Catálogo' | 'Invitación';
  estatus: 'Activa' | 'En revisión' | 'Bloqueada';
  /** Bloqueo manual de la marca (cambio 10): motivo interno y quién lo registró. */
  bloqueo?: { motivo: string; fechaHora: string; usuario: string };
}

export interface Marca {
  id: string;
  nombre: string;
  empresaId: string;
  industria: string;             // Automotriz, Belleza…
  estatus: 'Activa' | 'En revisión' | 'Bloqueada';
}

// ---------------------------------------------------------------------------
// Operación de adelanto
// ---------------------------------------------------------------------------

export type Formato = 'Reel' | 'Story' | 'Post' | 'Video' | 'Short' | 'Live';

/** Entregable pactado con la marca: "2 reels · Instagram". */
export interface Entregable { id: string; red: Red; formato: Formato; cantidad: number }

/** XML del CFDI estructurado (lo que guarda el PAC). */
export interface Cfdi {
  archivoXml: string;
  archivoPdf: string;
  uuid: string;                  // folio fiscal
  serieFolio: string;            // "A1024"
  emisor: { rfc: string; nombre: string; regimen: string };
  receptor: { rfc: string; nombre: string; usoCfdi: string };
  conceptos: { descripcion: string; cantidad: number; importe: number }[];
  metodoPago: 'PUE' | 'PPD';
  formaPago: string;
  subtotal: number;
  iva: number;
  total: number;
  fechaEmision: string;
  fechaTimbrado: string;
}

/** Validación automática del CFDI con el PAC contra el SAT (etapa 4). `true` = pasa. */
export interface ValidacionCfdi {
  uuidVigente: boolean;
  rfcEmisor: boolean;
  lista69b: boolean;
  montoFecha: boolean;
  marcaVinculada: boolean;
  motivo?: string;
  pac: string;
  fechaHora: string;
}

export interface Contrato {
  archivo: string;
  formato: 'PDF' | 'Escaneo' | 'Foto';
  paginas: number;
}

export type Semaforo = 'Verde' | 'Amarillo' | 'Rojo';

export type ClaveFicha =
  | 'partes' | 'fechas' | 'monto' | 'pago' | 'entregables' | 'kpis' | 'pena' | 'incumplimiento' | 'cesion' | 'usos'
  | 'confidencialidad';

/** Un dato extraído del contrato, con su cita y su nivel de confianza. */
export interface CampoFicha {
  clave: ClaveFicha;
  etiqueta: string;
  valor: string;
  cita: { clausula: number; pagina: number };
  confianza: number;             // 0 a 1
  alerta?: { nivel: 'Amarillo' | 'Rojo'; texto: string };
  correccion?: { anterior: string; usuario: string; fechaHora: string };
}

/** Lo que la IA lee del contrato (MVP Fase 1 §4). No aprueba nada por sí sola. */
export interface AnalisisContrato {
  estado: 'En curso' | 'Lista';
  pagina: number;
  inicio: string;
  fin?: string;
  campos: CampoFicha[];
  semaforo?: Semaforo;
  /** Datos de la lectura que mueven el monto base. */
  lectura: {
    monto: number;
    plazoDias: number;
    razonSocial: string;
    rfcMarca: string;
    rfcTalento: string;
    firmas: boolean;
    kpiCondicionado: number;     // porción del pago condicionada a KPIs (MXN)
    penaCompensable: number;     // pena máxima que la marca puede descontar (MXN)
    prohibeCesion: boolean;
    retencionAmplia: boolean;
    confidencial: boolean;
    pagoACuentaTalento: boolean;
  };
  montoBaseSugerido: number;
}

/** Consulta previa en el RUG por el RFC del otorgante: detecta un doble factoraje. */
export interface ConsultaRug {
  fechaHora: string;
  registros: { acreedor: string; folio: string; fecha: string; descripcion: string }[];
}

export interface Voto { usuario: string; fechaHora: string }

/**
 * Instrucción irrevocable de pago (formato v1.0). Documento aparte del contrato
 * de factoraje (cambio 1): la agencia la firma en el paso Aceptación de marca,
 * sale al área de pagos de la marca con copia a la agencia y a Influ, y la marca
 * la confirma dentro de 2 días hábiles. El adelanto no se libera sin esa
 * confirmación (cláusula quinta del contrato).
 */
export interface NotificacionCesion {
  email: string;
  /** Firma de la agencia (apoderado): la instrucción se emite ya firmada. */
  firmada?: { fechaHora: string; firmo: string };
  enviada: string;
  entregada?: string;
  abierta?: string;
  acuse?: string;
  acuseVia?: 'Botón "Confirmo recepción"' | 'Respuesta de la marca';
  reenvios: { fechaHora: string; automatico: boolean; usuario: string }[];
}

export interface Rug {
  estado: 'En cola' | 'Inscrita' | 'Actualizada' | 'Cancelada';
  modalidad: 'Asistida' | 'Tercerizada';
  enCola: string;
  folio?: string;
  fechaInscripcion?: string;
  /** 12 meses por omisión. */
  vigencia?: string;
  boleta?: string;
  usuario?: string;
  cierre?: { accion: 'Actualizada' | 'Cancelada'; fechaHora: string; usuario: string };
}

export interface Snapshot {
  fechaHora: string;
  dia: number;                   // días desde que se cargó el link
  vistas: number;
  likes: number;
  comentarios: number;
}

/** Pieza publicada: link verificado y métricas que nunca se sobreescriben. */
export interface Pieza {
  id: string;
  operacionId: string;
  entregableId: string;
  indice: number;                // Reel 1, Reel 2…
  red: Red;
  formato: Formato;
  link?: string;                 // reels, posts y videos
  capturas?: string[];           // stories: captura de estadísticas que lee la IA
  publicada: string;
  verificacion: {
    existe: boolean;
    cuenta: boolean;
    fecha: boolean;
    mencion: boolean;
    ok: boolean;
    motivo?: string;
    fechaHora: string;
  };
  snapshots: Snapshot[];
  fotos: { d7?: Snapshot; d30?: Snapshot };
}

export interface Evidencia {
  aprobacionMarca: string;       // archivo: email o brief aprobado
  sugerencia: { verificados: number; total: number };
  alcance: 'Campaña completa' | 'Hitos parciales';
  porcentaje: number;            // porción cumplida (100 si completa)
  fechaHora: string;
  usuario: string;
}

export interface Adelanto {
  monto: number;
  base: number;                  // monto base (o porción cumplida) sobre el que se calculó el 80%
  fechaHora: string;
  cuentaId: string;
  referencia: string;            // clave de rastreo SPEI
  usuario: string;
}

export type EstatusOperacion =
  | 'En revisión' | 'Observada' | 'Por firmar' | 'Firmada' | 'Activa' | 'Por liquidar' | 'Liquidada' | 'Rechazada';

export type Solicitante = 'Talento' | 'Agencia';

export interface Operacion {
  id: string;
  folio: string;                 // INF-0184
  talentoId: string;
  agenciaId: string;             // '' si el talento es independiente
  solicitante: Solicitante;      // quien subió la factura: firma, sube evidencia y recibe el pago
  marcaId: string;
  monto: number;                 // total de la factura
  fechaPublicacion: string;
  plazoDias: number;             // plazo de pago acordado con la marca
  entregables: Entregable[];
  contactoPagos: Contacto;
  contactoMarketing?: Contacto;
  capturada: string;             // fecha-hora
  capturadaPor: string;
  cfdi: Cfdi;
  contrato: Contrato;
  validacion: ValidacionCfdi;
  analisis: AnalisisContrato;
  consultaRug?: ConsultaRug;
  /** Consentimiento escrito de la marca cuando el contrato prohíbe ceder el cobro. */
  consentimientoMarca?: string;
  observacion?: { nota: string; fechaHora: string; usuario: string; respondida?: string };
  votos: Voto[];
  confirmaciones?: string;       // alertas amarillas que el equipo verificó al votar
  montoBase?: number;            // monto base aprobado por el equipo
  docusign?: { enviado: string; firmado?: string; firmo?: string };
  cesion?: NotificacionCesion;
  rug?: Rug;
  evidencia?: Evidencia;
  /** A quién se avisó por WhatsApp: sale de la preferencia de la agencia. */
  avisar: { talento: boolean; agencia: boolean };
  adelanto?: Adelanto;
  rechazo?: { motivo: string; fechaHora: string; usuario: string };
  estatus: EstatusOperacion;
}

export interface Abono { fecha: string; monto: number; referencia: string; cuentaId: string; conciliado: boolean }

/** La factura que la marca le debe a Influ (nace al liberar el adelanto). */
export interface CxC {
  id: string;
  operacionId: string;
  marcaId: string;
  documento: string;             // serie-folio del CFDI
  importe: number;
  abonos: Abono[];
  vencimiento: string;
}

export interface PagoRemanente {
  cuentaId: string;
  fecha: string;
  hora: string;
  usuario: string;
  importe: number;
  fijo: number;
  variable: number;
  meses: number;
}

/** El remanente que Influ le debe a quien pidió el adelanto (bloqueado hasta que la marca pague). */
export interface CxP {
  id: string;
  operacionId: string;
  documento: string;             // LIQ-0184
  pago?: PagoRemanente;
}

/** Orden de pago manual por SPEI con doble control (MVP Fase 1 §9). */
export interface OrdenPago {
  id: string;
  operacionId: string;
  tipo: 'Adelanto' | 'Remanente';
  beneficiario: { tipo: Solicitante; nombre: string; clabe: string; banco: string };
  monto: number;
  referencia: string;            // INF-0184-A
  concepto: string;
  cuentaId: string;
  preparo: { usuario: string; fechaHora: string };
  autorizo?: { usuario: string; fechaHora: string };
  cep?: { archivo: string; claveRastreo: string; fechaHora: string; usuario: string };
  estatus: 'Por autorizar' | 'Autorizada' | 'Pagada';
}

export interface CuentaBancaria { id: string; banco: string; cuenta: string; clabe: string; uso: string; saldo: number }

export interface Mensaje {
  id: string;
  operacionId: string;
  destinatario: Solicitante;
  nombre: string;
  telefono: string;
  tipo: 'Adelanto enviado' | 'Remanente enviado';
  contenido: string;
  fechaHora: string;
  estatus: 'Enviado' | 'Entregado' | 'Fallido';
}

/** Correos transaccionales: a la marca (cesión, cobranza) y a los usuarios (resolución de su cuenta). */
export interface Correo {
  id: string;
  operacionId?: string;
  para: string;
  asunto: string;
  tipo: 'Notificación de cesión' | 'Recordatorio de pago' | 'Pago recibido' | 'Resolución de cuenta' | 'Reenvío de cesión';
  fechaHora: string;
  estatus: 'Enviado' | 'Entregado' | 'Abierto' | 'Rebotado';
}

export type PermisoMarca = 'Admin' | 'Aprueba contenido' | 'Aprueba ofertas' | 'Comenta';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  talentoId?: string;
  agenciaId?: string;
  /** Usuarios de marca (Fase 2): su empresa y sus permisos. */
  empresaId?: string;
  permisosMarca?: PermisoMarca[];
  estatus: 'Activo' | 'Suspendido';
}

export interface Rol { id: string; nombre: RolUsuario; estatus: 'Activo' | 'Inactivo' }

export interface Bitacora {
  id: string;
  fechaHora: string;
  usuario: string;
  rol: RolUsuario | 'Sistema';
  modulo: string;
  accion: string;
  detalle: string;
}

export interface Sesion { usuarioId: string; desde: string; recordar: boolean }

export interface Toast { id: string; texto: string; tipo: 'ok' | 'warn' | 'error' }

/** Histórico del tablero: el mes en curso sale de las operaciones del sistema. */
export interface AdelantoMensual {
  mes: string;
  ops2025: number; imp2025: number;
  ops2026: number; imp2026: number;
  /** Mes proyectado (modelo de colocación línea Kapital, cambio 14): se dibuja en tono claro / línea punteada. */
  proyeccion?: boolean;
}
