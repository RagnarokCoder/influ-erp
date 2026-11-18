import { d, PORCENTAJE_ADELANTO } from '../data/constantes';

// -----------------------------------------------------------------------------
// M9 · Panel de fondeadores (piloto Stay On Social).
//
// El panel usa DATOS FICTICIOS, independientes del resto del maquetado: muestra
// cómo un fondeador ve el uso de su capital sin tocar la operación real. Cada
// operación la cubre COMPLETA un solo fondeador (el 100% del adelanto). El
// fondeador no elige ni rechaza: Influ le asigna la operación al aprobar la
// solicitud. Reglas de visibilidad: el talento va abreviado, nunca se muestran
// RFC, CURP ni contratos, y no se ve la comisión de Influ.
// -----------------------------------------------------------------------------

export const FONDEADOR = { nombre: 'Ricardo Treviño', desde: '2026-09-18' };

/** Capital total comprometido por el fondeador con Influ (ficticio). */
export const CAPITAL_TOTAL = 2_000_000;

export type EstadoFondeo = 'En evaluación' | 'Fondeando' | 'Vigente' | 'Cobrada' | 'Atrasada';

export interface EtapaFondeo { nombre: string; fecha?: string; estado: 'hecho' | 'curso' | 'pendiente' }

export interface OperacionFondeo {
  id: string;                    // folio interno del fondeo
  agencia: string;
  talento: string;               // abreviado: nunca el nombre legal completo
  marca: string;
  factura: number;               // monto de la factura (sin IVA)
  adelanto: number;              // 80% de la factura
  capital: number;               // = adelanto (cobertura 100%)
  asignada: string;              // fecha en que Influ asignó la operación
  vence: string;                 // vencimiento de la factura de la marca
  plazoDias: number;
  rendimiento: number;           // rendimiento estimado/pagado del fondeador (ficticio)
  estado: EstadoFondeo;
  entregable: { descripcion: string; vistas: number; interaccion: number };
  etapas: EtapaFondeo[];
  documentos: { nombre: string; tipo: string }[];
}

const adel = (factura: number) => Math.round(factura * PORCENTAJE_ADELANTO);

/** Operación ficticia con sus etapas y expediente ya armados. */
function op(x: {
  id: string; talento: string; marca: string; factura: number; asignada: number; vence: number; plazo: number;
  rendimiento: number; estado: EstadoFondeo; entregable: OperacionFondeo['entregable'];
}): OperacionFondeo {
  const adelanto = adel(x.factura);
  const cobrada = x.estado === 'Cobrada';
  const vigente = x.estado === 'Vigente' || x.estado === 'Atrasada';
  const etapas: EtapaFondeo[] = [
    { nombre: 'Solicitud asignada a tu capital', fecha: d(x.asignada), estado: 'hecho' },
    { nombre: 'Adelanto liberado a la agencia', fecha: x.estado === 'En evaluación' ? undefined : d(x.asignada + 1), estado: x.estado === 'En evaluación' ? 'pendiente' : 'hecho' },
    { nombre: 'Esperando el pago de la marca', fecha: vigente ? d(x.asignada + 1) : undefined, estado: cobrada ? 'hecho' : vigente ? 'curso' : 'pendiente' },
    { nombre: 'Pago de la marca recibido', fecha: cobrada ? d(x.vence - 2) : undefined, estado: cobrada ? 'hecho' : 'pendiente' },
    { nombre: 'Rendimiento pagado a tu cuenta', fecha: cobrada ? d(x.vence - 1) : undefined, estado: cobrada ? 'hecho' : 'pendiente' },
  ];
  return {
    id: x.id, agencia: 'Stay On Social', talento: x.talento, marca: x.marca,
    factura: x.factura, adelanto, capital: adelanto, asignada: d(x.asignada), vence: d(x.vence), plazoDias: x.plazo,
    rendimiento: x.rendimiento, estado: x.estado, entregable: x.entregable, etapas,
    documentos: [
      { nombre: `Estado de la operación ${x.id}.pdf`, tipo: 'Estado' },
      { nombre: `Adelanto ${x.id} · comprobante.pdf`, tipo: 'Comprobante' },
      ...(cobrada ? [{ nombre: `Rendimiento ${x.id} · liquidación.pdf`, tipo: 'Rendimiento' }] : []),
    ],
  };
}

// Las siete operaciones del tablero del fondeador (ficticias).
export const OPERACIONES_FONDEO: OperacionFondeo[] = [
  op({ id: '#6214', talento: 'Sophia P.', marca: 'Sephora', factura: 200_000, asignada: -6, vence: 176, plazo: 60, rendimiento: 3_160, estado: 'Fondeando',
    entregable: { descripcion: '2 Reels · Instagram', vistas: 1_840_000, interaccion: 7.2 } }),
  op({ id: '#6212', talento: 'Valeria M.', marca: 'Hot Book', factura: 95_000, asignada: -18, vence: 106, plazo: 60, rendimiento: 2_830, estado: 'Vigente',
    entregable: { descripcion: '1 Reel · 2 Stories · Instagram', vistas: 960_000, interaccion: 5.9 } }),
  op({ id: '#6230', talento: 'Chef en P.', marca: "L'Bel", factura: 140_000, asignada: -9, vence: 79, plazo: 45, rendimiento: 2_830, estado: 'Vigente',
    entregable: { descripcion: '1 Video · TikTok', vistas: 2_100_000, interaccion: 8.1 } }),
  op({ id: '#6187', talento: 'Fer J.', marca: 'Bonafont', factura: 150_000, asignada: -30, vence: 45, plazo: 60, rendimiento: 2_550, estado: 'Vigente',
    entregable: { descripcion: '2 Reels · 3 Stories · Instagram', vistas: 1_420_000, interaccion: 6.4 } }),
  op({ id: '#6193', talento: 'Celeste P.', marca: 'Sephora', factura: 180_000, asignada: -24, vence: 79, plazo: 75, rendimiento: 9_450, estado: 'Vigente',
    entregable: { descripcion: '3 Reels · Instagram · 1 Short · YouTube', vistas: 3_050_000, interaccion: 7.7 } }),
  op({ id: '#6202', talento: 'Lucía G.', marca: 'El Palacio de Hierro', factura: 520_000, asignada: -1, vence: 135, plazo: 90, rendimiento: 15_630, estado: 'En evaluación',
    entregable: { descripcion: '4 Reels · 6 Stories · Instagram', vistas: 0, interaccion: 0 } }),
  op({ id: '#6201', talento: 'Paco de M.', marca: 'Porsche', factura: 380_000, asignada: -46, vence: 46, plazo: 60, rendimiento: 7_600, estado: 'Cobrada',
    entregable: { descripcion: '2 Reels · 3 Stories · Instagram', vistas: 2_480_000, interaccion: 6.8 } }),
];

export const porFolio = (id: string) => OPERACIONES_FONDEO.find((o) => o.id === id);

/** Capital en uso: el de las operaciones que todavía no cobran (ni en evaluación). */
export const capitalEnUso = () =>
  OPERACIONES_FONDEO.filter((o) => o.estado === 'Vigente' || o.estado === 'Fondeando' || o.estado === 'Atrasada').reduce((t, o) => t + o.capital, 0);

/** Capital que Influ está por asignar (operaciones en evaluación). */
export const capitalEnEvaluacion = () =>
  OPERACIONES_FONDEO.filter((o) => o.estado === 'En evaluación').reduce((t, o) => t + o.capital, 0);

export const capitalDisponible = () => CAPITAL_TOTAL - capitalEnUso() - capitalEnEvaluacion();

/** Rendimiento ya pagado (operaciones cobradas) y el estimado en curso. */
export const rendimientoPagado = () =>
  OPERACIONES_FONDEO.filter((o) => o.estado === 'Cobrada').reduce((t, o) => t + o.rendimiento, 0);
export const rendimientoEnCurso = () =>
  OPERACIONES_FONDEO.filter((o) => o.estado === 'Vigente' || o.estado === 'Fondeando' || o.estado === 'Atrasada').reduce((t, o) => t + o.rendimiento, 0);

export const toneFondeo = (e: EstadoFondeo): 'success' | 'warning' | 'danger' | 'neutral' | 'blue' =>
  e === 'Cobrada' ? 'success' : e === 'Atrasada' ? 'danger' : e === 'En evaluación' ? 'warning' : 'blue';

export interface AvisoFondeo { id: string; titulo: string; detalle: string; cuando: string; tipo: 'ok' | 'warn' | 'info' }

export const AVISOS_FONDEO: AvisoFondeo[] = [
  { id: 'N1', titulo: 'Nueva solicitud en evaluación', detalle: '#6202 · El Palacio de Hierro · Lucía G. — $416,000 de tu capital en revisión del equipo de Influ.', cuando: d(-1), tipo: 'info' },
  { id: 'N2', titulo: 'Operación asignada a tu capital', detalle: '#6214 · Sephora · Sophia P. — $160,000 asignados. El adelanto se libera a la agencia.', cuando: d(-6), tipo: 'ok' },
  { id: 'N3', titulo: 'Fecha de pago próxima (7 días)', detalle: '#6187 · Bonafont vence el ' + d(45) + '. Esperamos el pago de la marca.', cuando: d(-2), tipo: 'warn' },
  { id: 'N4', titulo: 'Pago de la marca recibido', detalle: '#6201 · Porsche pagó $380,000. Tu capital regresa con su rendimiento.', cuando: d(-4), tipo: 'ok' },
  { id: 'N5', titulo: 'Rendimiento pagado', detalle: '#6201 · Porsche — $7,600 depositados a tu cuenta.', cuando: d(-3), tipo: 'ok' },
  { id: 'N6', titulo: 'Estado de cuenta disponible', detalle: 'Tu estado de cuenta de octubre 2026 ya se puede descargar.', cuando: d(-5), tipo: 'info' },
];

export interface PrefAviso { id: string; etiqueta: string; correo: boolean; whatsapp: boolean }

export const PREFERENCIAS_AVISO: PrefAviso[] = [
  { id: 'P1', etiqueta: 'Nueva solicitud en evaluación', correo: true, whatsapp: true },
  { id: 'P2', etiqueta: 'Operación asignada a tu capital', correo: true, whatsapp: true },
  { id: 'P3', etiqueta: 'Fecha de pago próxima (7 y 1 días antes)', correo: true, whatsapp: true },
  { id: 'P4', etiqueta: 'Pago recibido de la marca', correo: true, whatsapp: false },
  { id: 'P5', etiqueta: 'Pago atrasado', correo: true, whatsapp: true },
  { id: 'P6', etiqueta: 'Rendimiento pagado', correo: true, whatsapp: false },
  { id: 'P7', etiqueta: 'Estado de cuenta disponible', correo: true, whatsapp: false },
];
