// Entidades del marketplace (MVP Fase 2 §17). Se suman al núcleo de Fase 1:
// talentos, agencias, empresas y marcas se leen del store principal; aquí vive
// solo lo que nace en el marketplace.

import type { Red } from '../data/types';

export type FormatoMk = 'Reel' | 'Story' | 'Post' | 'TikTok' | 'Video' | 'Short';
export type UsoMk = 'Orgánico' | 'Pauta pagada' | 'Cuenta de la marca';
export type PermisoMk = 'Admin' | 'Aprueba contenido' | 'Aprueba ofertas' | 'Comenta';

/** Cuenta de una empresa en el marketplace: nace por invitación del equipo de Influ. */
export interface CuentaMarca {
  empresaId: string;
  marcas: string[];
  estado: 'Invitada' | 'Configurando' | 'Activa';
  invitada: { por: string; fechaHora: string; token: string };
  pasos: { empresa: boolean; equipo: boolean; pagos: boolean };
  /** Prepago por defecto; plazo solo con límite de crédito aprobado por el equipo. */
  condicion: { tipo: 'Prepago' | 'Plazo'; dias: number; limite: number };
  contactoPagos: { nombre: string; email: string };
  equipo: { nombre: string; email: string; area: string; permisos: PermisoMk[] }[];
}

export interface RedAsociada {
  red: Red;
  usuario: string;
  asociada: boolean;            // OAuth con consentimiento
  fecha?: string;
  seguidores: number;
}

export interface Condiciones {
  tarifas: { formato: FormatoMk | 'Paquete reel + 2 stories'; minimo: number }[];
  usos: UsoMk[];
  licenciaMaxMeses: number;
  exclusividadMaxDias: number;
  plazoMinDias: number;
  rondasMax: number;
}

/** Creador en el marketplace. Si viene de Fase 1, `talentoId` lo liga a su registro. */
export interface Creador {
  id: string;
  handle: string;
  nombre: string;
  talentoId?: string;
  agenciaId?: string;
  temas: string[];               // afinidad de contenido para el matching
  ciudad: string;
  redes: RedAsociada[];
  audiencia: { mx: number; edad25a44: number; edades: number[]; ciudades: { ciudad: string; pct: number }[]; hombres: number; real: number };
  engagement: number;            // %
  vistasMedianas: number;
  cpmHistorico: number;
  /** Historial de cumplimiento verificado en Influ (Fase 1 y Fase 2). */
  historial: { campana: string; vistas: number; aTiempo: boolean }[];
  exclusividades: { categoria: string; hasta: string; marca: string }[];
  ocupadoHasta?: string;
  condiciones: Condiciones;
}

export interface EntregableMk { formato: FormatoMk; red: Red; cantidad: number }

export interface BriefEstructurado {
  objetivo: string;
  audiencia: { edad: string; ciudades: string[]; nse: string };
  creadores: { cantidad: number; temas: string[] };
  entregables: EntregableMk[];
  fechas: { desde: string; hasta: string };
  presupuesto: { min: number; max: number };
  usos: { tipos: UsoMk[]; meses: number; territorio: string };
  kpis: string[];
  restricciones: string[];
  duracion: { min: number; max: number };
  menciones: string[];          // @marca y modelo
}

export interface Brief {
  id: string;
  empresaId: string;
  marca: string;
  titulo: string;
  textoOriginal: string;
  estructurado: BriefEstructurado;
  /** Ediciones de la marca sobre lo que propuso la IA. */
  ediciones: { campo: string; antes: string; despues: string; usuario: string; fechaHora: string }[];
  modo: { invitacion: boolean; abierto: boolean };
  estado: 'Borrador' | 'Revisión del matching' | 'Publicado' | 'Cerrado';
  creado: string;
  creadoPor: string;
  publicado?: string;
  distribuido?: string;
  seleccionCerrada?: string;
}

export interface ComponentesScore {
  contenido: number; audiencia: number; precio: number; performance: number; cumplimiento: number; disponibilidad: number;
}

/** Registro del ranking: qué se mostró, en qué orden y con qué score (base para entrenar el matching). */
export interface Ranking {
  id: string;
  briefId: string;
  fechaHora: string;
  items: { creadorId: string; posicion: number; score: number; componentes: ComponentesScore; explicacion: string; conflicto?: string; sobrePresupuesto: boolean; incluido: boolean; sugeridoIA: boolean }[];
  modo: 'Completa' | 'Muestreo';
  revision?: { usuario: string; fechaHora: string; cambios: number };
  distribuido?: string;
}

export interface LineaPrecio { formato: FormatoMk; red: Red; cantidad: number; precio: number }

export interface Postulacion {
  id: string;
  briefId: string;
  creadorId: string;
  origen: 'Invitado' | 'Postulación';
  estado: 'Invitado' | 'Sin respuesta' | 'Por confirmar agencia' | 'Nueva' | 'Preseleccionado' | 'Descartado' | 'Contratado';
  lineas: LineaPrecio[];
  fechas: { contenido: string; publicacion: string };
  usos: UsoMk[];
  mensaje: string;
  fecha: string;
  agencia?: { confirmo: string; fechaHora: string; editado?: boolean };
}

export interface Participante {
  nombre: string;
  email: string;
  lado: 'Marca' | 'Creador' | 'Agencia';
  permisos: PermisoMk[];
  enCopia: boolean;
  token: string;
  agregado: { por: string; fechaHora: string };
}

export interface MensajeChat {
  id: string;
  autor: string;
  lado: 'Marca' | 'Creador' | 'Agencia' | 'Sistema' | 'Influ';
  texto: string;
  ocultos: number;              // datos de contacto ocultados por la protección del canal
  fechaHora: string;
}

export interface Oferta {
  version: number;
  autor: string;
  lado: 'Marca' | 'Creador' | 'Agencia';
  lineas: LineaPrecio[];
  fechas: { contenido: string; publicacion: string };
  rondas: number;
  usos: { tipos: UsoMk[]; meses: number; territorio: string };
  exclusividad: { dias: number; categoria: string };
  kpis: string;
  consecuencia: string;
  estado: 'Borrador' | 'Enviada' | 'Contraoferta' | 'Aceptada' | 'Rechazada' | 'Vencida';
  fechaHora: string;
  vence: string;
  alertas: string[];
}

export interface Conversacion {
  id: string;
  briefId: string;
  creadorId: string;
  participantes: Participante[];
  mensajes: MensajeChat[];
  ofertas: Oferta[];
  registro: { quien: string; que: string; fechaHora: string }[];
}

export interface Chequeo { ok: boolean; nivel: 'ok' | 'aviso' | 'falla'; texto: string }

export interface Entrega {
  id: string;
  ronda: number;
  archivo: string;
  duracion: number;
  texto: string;                // copy de la publicación
  chequeos: Chequeo[];
  fechaHora: string;
  estado: 'En revisión' | 'Cambios pedidos' | 'Aprobada';
  decision?: { usuario: string; fechaHora: string; nota?: string };
}

export interface SnapshotMk {
  dia: number;
  fecha: string;
  vistas: number; alcance: number; impresiones: number; interacciones: number; guardados: number; compartidos: number; clics: number; ventas: number;
}

export interface Contratacion {
  id: string;
  convId: string;
  briefId: string;
  creadorId: string;
  empresaId: string;
  oferta: number;               // versión aceptada
  beneficiario: { tipo: 'Creador' | 'Agencia'; nombre: string; clabe: string };
  tarifa: number;
  fee: number;
  aceptada: string;
  acuerdo: { marca?: string; creador?: string };
  cfdi?: { archivo: string; uuid: string; rfcEmisor: string; monto: number; validado: boolean; motivo?: string; fechaHora: string };
  entregas: Entrega[];
  aprobada?: { usuario: string; fechaHora: string };
  dispersion?: { estado: 'Retenida' | 'Pagada'; fechaHora: string; referencia?: string; motivo?: string; via: string };
  publicacion?: { estado: 'Verificada' | 'Con observaciones' | 'No detectada'; fechaHora: string; checks: Chequeo[]; revisadaPor?: string };
  snapshots: SnapshotMk[];
  utm: string;
  codigo: string;
  incumplimiento?: string;      // id del caso
  calificaciones: { marca?: { estrellas: number; nota: string }; creador?: { estrellas: number; nota: string } };
  estado: 'Acuerdo por firmar' | 'En producción' | 'Contenido en revisión' | 'Pagada' | 'Publicada' | 'Cerrada';
}

export interface FacturaInflu {
  id: string;
  briefId: string;
  empresaId: string;
  campana: string;
  uuid?: string;
  tarifas: number;
  fee: number;
  total: number;
  emitida?: string;
  vence?: string;
  pagada?: string;
  creadores: number;
}

export interface Propuesta {
  id: string;
  empresaId: string;
  token: string;
  titulo: string;
  lineas: { creadorId: string; vistasMin: number; vistasMax: number; cpm: number; tarifa: number; formato: string }[];
  estado: 'Borrador' | 'Enviada' | 'Vista' | 'Aceptada';
  creada: string;
  creadaPor: string;
  enviada?: string;
  vista?: string;
  aceptada?: { por: string; fechaHora: string; briefId: string };
  copias: string[];
}

export interface Caso {
  id: string;
  tipo: 'Incumplimiento' | 'Disputa' | 'Moderación';
  contratacionId?: string;
  convId?: string;
  titulo: string;
  detalle: string;
  abierto: string;
  estado: 'Abierto' | 'Resuelto';
  resolucion?: { nota: string; usuario: string; fechaHora: string };
}

export interface Aviso { id: string; canal: 'Email' | 'WhatsApp'; para: string; texto: string; fechaHora: string }

export interface BitacoraMk { id: string; fechaHora: string; usuario: string; modulo: string; accion: string; detalle: string }
