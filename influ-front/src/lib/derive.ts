import {
  ALERTA_RUG_DIAS, COMISION_FIJA, DIAS_LIQUIDACION, DIAS_METRICAS, HORAS_ACUSE, HORAS_REVISION, HOY_ISO, INFLU, LIMITE_CONCENTRACION,
  LISTA_69B, META_HORAS_COBRO, PLAZO_MAXIMO, PORCENTAJE_ADELANTO, QUORUM_APROBACION, RECORDATORIOS, TASA_MENSUAL, sumarDias,
} from '../data/constantes';
import type {
  Agencia, AnalisisContrato, CampoFicha, CuentaBancaria, Correo, CxC, CxP, Empresa, Entregable, Marca, Mensaje, Operacion,
  OrdenPago, Pieza, Red, Semaforo, Snapshot, Talento, Usuario,
} from '../data/types';
import { carteraPropia } from './permisos';
import { diffDays, formatDate, money } from './format';

/** Lo que las pantallas leen del store (ya filtrado por la cartera visible). */
export interface Datos {
  talentos: Talento[];
  agencias: Agencia[];
  empresas: Empresa[];
  marcas: Marca[];
  operaciones: Operacion[];
  piezas: Pieza[];
  ordenes: OrdenPago[];
  cxc: CxC[];
  cxp: CxP[];
  cuentas: CuentaBancaria[];
  mensajes: Mensaje[];
  correos: Correo[];
}

export const porId = <T extends { id: string }>(lista: T[], id: string | undefined) =>
  id ? lista.find((x) => x.id === id) : undefined;

export const suma = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
export const redondear = (n: number) => Math.round(n * 100) / 100;
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Número estable a partir de un texto: las simulaciones dan siempre el mismo resultado. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

/**
 * Regla 20: el talento ve solo lo suyo; la agencia, lo de sus talentos y las
 * operaciones que pidió. Dirección y el equipo interno ven todo.
 */
export function vista<T extends Datos>(s: T, u: Usuario | undefined): T {
  if (!u || !carteraPropia(u.rol)) return s;
  if (u.rol === 'Marca') return { ...s, operaciones: [], piezas: [], ordenes: [], cxc: [], cxp: [], mensajes: [], correos: [], talentos: [], agencias: [] };
  const esMia = (op: Operacion) =>
    u.rol === 'Talento' ? op.talentoId === u.talentoId : op.agenciaId === u.agenciaId;
  const operaciones = s.operaciones.filter(esMia);
  const ids = new Set(operaciones.map((o) => o.id));
  const talentos = u.rol === 'Talento'
    ? s.talentos.filter((t) => t.id === u.talentoId)
    : s.talentos.filter((t) => t.agenciaId === u.agenciaId);
  const agencias = u.rol === 'Agencia'
    ? s.agencias.filter((a) => a.id === u.agenciaId)
    : s.agencias.filter((a) => talentos.some((t) => t.agenciaId === a.id));
  return {
    ...s,
    talentos,
    agencias,
    operaciones,
    piezas: s.piezas.filter((p) => ids.has(p.operacionId)),
    ordenes: s.ordenes.filter((o) => ids.has(o.operacionId)),
    cxc: s.cxc.filter((c) => ids.has(c.operacionId)),
    cxp: s.cxp.filter((c) => ids.has(c.operacionId)),
    mensajes: s.mensajes.filter((m) => ids.has(m.operacionId)),
    correos: s.correos.filter((c) => c.operacionId && ids.has(c.operacionId)),
  };
}

// ---------------------------------------------------------------------------
// Talento, agencia y empresa
// ---------------------------------------------------------------------------

export const empresaDe = (d: Pick<Datos, 'marcas' | 'empresas'>, marcaId: string | undefined) =>
  porId(d.empresas, porId(d.marcas, marcaId)?.empresaId);

/** Nombre a mostrar: el legal si ya lo subió la agencia; si no, el artístico (piloto). */
export const nombreMostrar = (t: Pick<Talento, 'nombre' | 'nombreArtistico'> | undefined) =>
  t ? (t.nombre.trim() || t.nombreArtistico || '—') : '—';
export const nombreTalento = (d: Pick<Datos, 'talentos'>, id: string) => nombreMostrar(porId(d.talentos, id));
export const nombreMarca = (d: Pick<Datos, 'marcas'>, id: string) => porId(d.marcas, id)?.nombre ?? '—';
export const corto = (nombre: string) => { const p = nombre.split(' '); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : nombre; };
export const iniciales = (nombre: string) => nombre.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

/** El handle con más seguidores: el que identifica al talento en las listas. */
export function handlePrincipal(t: Pick<Talento, 'handles'> | undefined) {
  if (!t?.handles.length) return '';
  return [...t.handles].sort((a, b) => (b.seguidores ?? 0) - (a.seguidores ?? 0))[0].usuario;
}
export const handleDe = (t: Pick<Talento, 'handles'> | undefined, red: Red) => t?.handles.find((h) => h.red === red);

/** "412 k", "1.2 M". */
export function seguidores(n: number | undefined) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1000) return `${Math.round(n / 1000)} k`;
  return String(n);
}
export const ciudadDe = (t: Pick<Talento, 'ubicacion'>) => t.ubicacion.estado === 'Ciudad de México' ? 'CDMX' : t.ubicacion.ciudad;

/**
 * Fecha de nacimiento a partir del RFC (posiciones 5 a 10, AAMMDD). El siglo
 * lo confirma la CURP: su posición 17 es un dígito hasta 1999 y una letra desde 2000.
 */
export function nacimientoDeRfc(rfc: string, curp: string) {
  const r = rfc.trim().toUpperCase();
  const c = curp.trim().toUpperCase();
  const aammdd = r.slice(4, 10);
  if (!/^\d{6}$/.test(aammdd)) return { fecha: '', coincide: false };
  const siglo = /[A-Z]/.test(c[16] ?? '') ? '20' : '19';
  const fecha = `${siglo}${aammdd.slice(0, 2)}-${aammdd.slice(2, 4)}-${aammdd.slice(4, 6)}`;
  return { fecha, coincide: c.slice(4, 10) === aammdd };
}

export const en69b = (rfc: string) => LISTA_69B.includes(rfc.trim().toUpperCase());

export interface Chequeo { ok: boolean; texto: string }

/** Chequeos automáticos de la preaprobación de un talento (MVP Fase 1 §2). */
export function chequeosTalento(t: Talento, clabeOk: (c: string) => boolean): Chequeo[] {
  const nac = nacimientoDeRfc(t.rfc, t.curp);
  const encontrados = t.handles.filter((h) => h.encontrada);
  const extranjero = t.nacionalidad === 'Extranjera';
  return [
    // Cambio 12: para extranjeros no aplica el chequeo "RFC y CURP coinciden".
    { ok: extranjero || (nac.coincide && !t.nacimientoPorRevisar), texto: extranjero ? 'Talento extranjero · sin CURP que validar' : nac.coincide ? `RFC y CURP coinciden · nacimiento ${formatDate(nac.fecha, { day: '2-digit', month: '2-digit', year: 'numeric' })}` : 'RFC y CURP no coinciden en la fecha de nacimiento' },
    { ok: !en69b(t.rfc), texto: en69b(t.rfc) ? `RFC ${t.rfc} aparece en la lista 69-B` : 'RFC sin coincidencias en la lista 69-B' },
    { ok: clabeOk(t.clabe), texto: clabeOk(t.clabe) ? 'CLABE válida' : 'CLABE con dígito verificador incorrecto' },
    {
      ok: encontrados.length > 0 && encontrados.length === t.handles.length,
      texto: encontrados.length ? `Handle encontrado: ${encontrados.map((h) => `${h.usuario} · ${seguidores(h.seguidores)}`).join(', ')}` : 'Ningún handle encontrado',
    },
  ];
}

/** Chequeos automáticos de la preaprobación de una agencia. */
export function chequeosAgencia(a: Agencia): Chequeo[] {
  const rfcOk = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/.test(a.rfc);
  return [
    { ok: rfcOk && !!a.razonSocial.trim(), texto: rfcOk ? `RFC ${a.rfc} y razón social ${a.razonSocial}` : 'RFC de persona moral con formato inválido' },
    { ok: !en69b(a.rfc), texto: en69b(a.rfc) ? `RFC ${a.rfc} aparece en la lista 69-B` : 'RFC sin coincidencias en la lista 69-B' },
    { ok: /^N-\d{10}$/.test(a.folioMercantil), texto: `Folio mercantil ${a.folioMercantil || 'sin capturar'}` },
  ];
}

/**
 * Regla de la preaprobación: pide adelantos con la preaprobación de Influ y, si
 * eligió agencia, la representación confirmada. Las dos corren en paralelo.
 * Devuelve qué falta, o null si ya puede pedir.
 */
export function bloqueoPedir(t: Talento | undefined, agencias: Agencia[]): string | null {
  if (!t) return 'Elige el talento de la colaboración.';
  if (t.estatus === 'Suspendido') return `${t.nombre} está suspendido. Habla con el equipo de Influ.`;
  if (t.cuenta === 'Rechazada') return `La cuenta de ${t.nombre} fue rechazada por el equipo de Influ.`;
  if (t.cuenta === 'Observada') return `El equipo de Influ pidió corregir datos de la cuenta de ${t.nombre}: revisa su perfil y reenvíalo.`;
  if (t.cuenta === 'En revisión') return `La cuenta de ${t.nombre} está en revisión: el equipo de Influ la preaprueba antes del primer adelanto.`;
  if (t.representacion === 'Pendiente') return `${porId(agencias, t.agenciaId)?.nombre ?? 'Su agencia'} todavía no confirma que representa a ${t.nombre}.`;
  return null;
}

// ---------------------------------------------------------------------------
// Operación
// ---------------------------------------------------------------------------

/** Pendiente #7: vence a la fecha de publicación más el plazo pactado con la marca. */
export const vencimientoOp = (op: Pick<Operacion, 'fechaPublicacion' | 'plazoDias'>) =>
  sumarDias(op.fechaPublicacion, op.plazoDias);

/** "2 reels · Instagram". */
export function textoEntregable(e: Pick<Entregable, 'red' | 'formato' | 'cantidad'>) {
  const plurales: Record<string, string> = { Reel: 'reels', Story: 'stories', Post: 'posts', Video: 'videos', Short: 'shorts', Live: 'lives' };
  return `${e.cantidad} ${e.cantidad === 1 ? e.formato.toLowerCase() : plurales[e.formato]} · ${e.red}`;
}

/** Nombre de quien pidió el adelanto: firma, sube evidencia y recibe el dinero. */
export function beneficiario(op: Operacion, d: Pick<Datos, 'talentos' | 'agencias'>) {
  if (op.solicitante === 'Agencia') {
    const a = porId(d.agencias, op.agenciaId);
    return { tipo: 'Agencia' as const, id: op.agenciaId, nombre: a?.nombre ?? '—', clabe: a?.clabe ?? '', banco: a?.banco ?? '' };
  }
  const t = porId(d.talentos, op.talentoId);
  return { tipo: 'Talento' as const, id: op.talentoId, nombre: t?.nombre ?? '—', clabe: t?.clabe ?? '', banco: t?.banco ?? '' };
}

/** A quién se avisa por WhatsApp: la preferencia de la agencia; sin agencia, al talento. */
export function destinosAviso(op: Pick<Operacion, 'agenciaId'>, agencias: Agencia[]) {
  const ag = porId(agencias, op.agenciaId);
  if (!ag) return { talento: true, agencia: false };
  return { talento: ag.avisoPago !== 'Agencia', agencia: ag.avisoPago !== 'Talento' };
}

/** Monto base del adelanto: el que aprobó el equipo o, antes, el que sugiere la ficha. */
export const montoBaseOp = (op: Operacion) => op.montoBase ?? op.analisis.montoBaseSugerido ?? op.monto;

/** Base del 80%: el monto base con campaña completa, o su porción cumplida con hitos parciales. */
export function baseAdelanto(op: Operacion) {
  const pct = op.evidencia?.alcance === 'Hitos parciales' ? op.evidencia.porcentaje : 100;
  return redondear(montoBaseOp(op) * pct / 100);
}
export const montoAdelanto = (op: Operacion) => op.adelanto?.monto ?? redondear(baseAdelanto(op) * PORCENTAJE_ADELANTO);

/**
 * Recorrido del portal del talento y la agencia: CFDI y contrato (validación del
 * CFDI y análisis del contrato en un solo paso) · Aprobación · Firma · Aceptación
 * de marca · Evidencia · Adelanto · Liquidación. En el panel interno el paso
 * "Aceptación de marca" se llama "Instrucción de pago y RUG".
 */
export const ETAPAS = ['CFDI y contrato', 'Aprobación', 'Firma', 'Aceptación de marca', 'Evidencia', 'Adelanto', 'Liquidación'];
export function etapa(op: Operacion) {
  switch (op.estatus) {
    case 'En revisión': case 'Observada': return op.analisis.estado === 'En curso' ? 0 : 1;
    case 'Por firmar': return 2;
    case 'Firmada': return !op.cesion?.acuse || op.rug?.estado !== 'Inscrita' ? (op.evidencia ? 5 : 3) : op.evidencia ? 5 : 4;
    case 'Activa': return 6;
    case 'Por liquidar': case 'Liquidada': return 6;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// CFDI (etapa 4): validación con el PAC contra el SAT. Simulada; mismas reglas.
// ---------------------------------------------------------------------------

const UUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export function validarCfdi(
  cfdi: { uuid: string; emisor: { rfc: string }; receptor: { rfc: string }; total: number; fechaEmision: string },
  rfcsValidos: string[],
  empresa: Empresa | undefined,
  monto: number,
  uuidsUsados: string[] = [],
) {
  const uuidVigente = UUID.test(cfdi.uuid) && !uuidsUsados.includes(cfdi.uuid.toUpperCase());
  const rfcEmisor = rfcsValidos.includes(cfdi.emisor.rfc);
  const lista69b = !empresa?.lista69b && !en69b(cfdi.receptor.rfc) && !en69b(cfdi.emisor.rfc);
  const montoFecha = Math.abs(cfdi.total - monto) < 0.01 && cfdi.fechaEmision <= HOY_ISO;
  const marcaVinculada = !!empresa && empresa.rfc === cfdi.receptor.rfc;
  const motivo = !uuidVigente
    ? 'El folio fiscal (UUID) no está vigente ante el SAT o ya se usó en otra solicitud.'
    : !rfcEmisor
      ? `El RFC emisor ${cfdi.emisor.rfc} no es del talento ni de su agencia.`
      : !lista69b
        ? `El RFC ${en69b(cfdi.emisor.rfc) ? cfdi.emisor.rfc : cfdi.receptor.rfc} aparece en la lista 69-B del SAT.`
        : !montoFecha
          ? `El total del CFDI (${money(cfdi.total)}) no coincide con el monto capturado (${money(monto)}) o su fecha es futura.`
          : !marcaVinculada ? `El RFC receptor ${cfdi.receptor.rfc} no corresponde a la marca elegida.` : undefined;
  return { uuidVigente, rfcEmisor, lista69b, montoFecha, marcaVinculada, motivo };
}

// ---------------------------------------------------------------------------
// Análisis del contrato con IA (MVP Fase 1 §4). Simulado: la lectura sale del
// expediente; las reglas de negocio que marcan alertas y el monto base son las reales.
// ---------------------------------------------------------------------------

export interface EntradaFicha {
  monto: number;                 // del CFDI
  plazoDias: number;             // declarado en la solicitud
  fechaPublicacion: string;
  capturada: string;
  entregables: Entregable[];
  empresa: Empresa;
  talento: Talento;
  agencia?: Agencia;
  rfcEmisorCfdi: string;
  evidencia: boolean;
  lectura: AnalisisContrato['lectura'];
  paginas: number;
}

export function construirFicha(e: EntradaFicha): Pick<AnalisisContrato, 'campos' | 'semaforo' | 'montoBaseSugerido'> {
  const l = e.lectura;
  const conf = (k: string) => Math.round((0.86 + (hash(`${e.talento.id}${e.monto}${k}`) % 13) / 100) * 100) / 100;
  const pag = (p: number) => Math.min(e.paginas, p);
  const campos: CampoFicha[] = [];
  const add = (c: Omit<CampoFicha, 'confianza'>) => campos.push({ ...c, confianza: conf(c.clave) });

  const partesOk = l.rfcMarca === e.empresa.rfc && (l.rfcTalento === e.rfcEmisorCfdi || l.rfcTalento === e.talento.rfc);
  add({
    clave: 'partes', etiqueta: 'Partes',
    valor: `${l.razonSocial} · ${e.talento.nombre}${e.agencia ? ` · ${e.agencia.nombre}` : ''}`,
    cita: { clausula: 1, pagina: 1 },
    alerta: !partesOk ? { nivel: 'Rojo', texto: 'Las partes del contrato no coinciden con el emisor o el receptor del CFDI.' }
      : !l.firmas ? { nivel: 'Amarillo', texto: 'Falta la firma de alguna de las partes.' } : undefined,
  });
  const vigencia = sumarDias(e.fechaPublicacion, 180);
  add({
    clave: 'monto', etiqueta: 'Monto y plazo',
    valor: `${money(l.monto)} · ${l.plazoDias} días desde publicación`,
    cita: { clausula: 5, pagina: pag(3) },
    alerta: Math.abs(l.monto - e.monto) > 0.01 ? { nivel: 'Rojo', texto: `El contrato ampara ${money(l.monto)} y el CFDI ${money(e.monto)}: no respalda la factura.` }
      : l.plazoDias !== e.plazoDias ? { nivel: 'Amarillo', texto: `El plazo del contrato (${l.plazoDias} días) no coincide con el declarado (${e.plazoDias} días).` }
        : l.plazoDias > PLAZO_MAXIMO ? { nivel: 'Amarillo', texto: `Plazo de ${l.plazoDias} días: más de ${PLAZO_MAXIMO} pide confirmación.` } : undefined,
  });
  add({
    clave: 'fechas', etiqueta: 'Fechas',
    valor: `Firma ${formatDate(sumarDias(e.fechaPublicacion, -12))} · publicación ${formatDate(e.fechaPublicacion)} · vigencia al ${formatDate(vigencia)}`,
    cita: { clausula: 2, pagina: 1 },
    alerta: vigencia < HOY_ISO ? { nivel: 'Amarillo', texto: 'La vigencia del contrato ya terminó.' } : undefined,
  });
  add({
    clave: 'entregables', etiqueta: 'Entregables',
    valor: e.entregables.map(textoEntregable).join(' + ') || 'Sin entregables declarados',
    cita: { clausula: 3, pagina: pag(2) },
    alerta: e.fechaPublicacion < sumarDias(HOY_ISO, -30) && !e.evidencia ? { nivel: 'Amarillo', texto: 'Entregas vencidas sin evidencia cargada.' } : undefined,
  });
  add({
    clave: 'kpis', etiqueta: 'KPIs',
    valor: l.kpiCondicionado > 0 ? `${money(l.kpiCondicionado)} condicionados a 500 k vistas` : 'Sin pago condicionado',
    cita: { clausula: 4, pagina: pag(2) },
    alerta: l.kpiCondicionado > 0 ? { nivel: 'Amarillo', texto: 'Parte del pago depende de KPIs: se adelanta solo la porción no condicionada.' } : undefined,
  });
  add({
    clave: 'pena', etiqueta: 'Pena convencional',
    valor: l.penaCompensable > 0 ? `${money(l.penaCompensable)} por entrega tardía, compensable contra el pago` : '10% por entrega tardía, no compensable',
    cita: { clausula: 9, pagina: pag(5) },
    alerta: l.penaCompensable > 0 ? { nivel: 'Amarillo', texto: 'La marca puede descontar la pena del pago: el monto base se reduce por la pena máxima.' } : undefined,
  });
  add({
    clave: 'incumplimiento', etiqueta: 'Incumplimiento y rescisión',
    valor: l.retencionAmplia ? 'La marca retiene el pago "a su juicio" ante cualquier incumplimiento' : '5 días hábiles para subsanar; sin retención del pago',
    cita: { clausula: 10, pagina: pag(5) },
    alerta: l.retencionAmplia ? { nivel: 'Amarillo', texto: 'La marca puede retener el pago o pedir devolución ante incumplimientos amplios o subjetivos.' } : undefined,
  });
  add({
    clave: 'pago', etiqueta: 'Forma de pago',
    valor: l.pagoACuentaTalento ? 'Transferencia obligatoria a una cuenta del talento' : `Transferencia a la cuenta que indique el emisor del CFDI`,
    cita: { clausula: 6, pagina: pag(3) },
    alerta: l.pagoACuentaTalento ? { nivel: 'Amarillo', texto: 'El pago es obligatorio a una cuenta específica del talento: confirmar que la marca aceptará pagar a Influ.' } : undefined,
  });
  add({
    clave: 'cesion', etiqueta: 'Cesión del cobro',
    valor: l.prohibeCesion ? 'Prohíbe ceder los derechos de cobro' : 'Sin prohibición',
    cita: { clausula: 12, pagina: pag(6) },
    alerta: l.prohibeCesion ? { nivel: 'Rojo', texto: 'El contrato prohíbe ceder el cobro: no se factora sin consentimiento escrito de la marca.' } : undefined,
  });
  add({ clave: 'usos', etiqueta: 'Uso de imagen', valor: 'Orgánico, 6 meses, México · sin exclusividad', cita: { clausula: 7, pagina: pag(4) } });
  add({
    clave: 'confidencialidad', etiqueta: 'Confidencialidad',
    valor: l.confidencial ? 'Impide compartir el contrato con terceros' : 'Sin restricción para compartirlo',
    cita: { clausula: 14, pagina: pag(7) },
    alerta: l.confidencial ? { nivel: 'Amarillo', texto: 'Revisar antes de aprobar: el contrato impide compartirlo con terceros.' } : undefined,
  });

  const semaforo: Semaforo = campos.some((c) => c.alerta?.nivel === 'Rojo') ? 'Rojo' : campos.some((c) => c.alerta) ? 'Amarillo' : 'Verde';
  const montoBaseSugerido = Math.max(0, redondear(Math.min(l.monto, e.monto) - l.kpiCondicionado - l.penaCompensable));
  return { campos, semaforo, montoBaseSugerido };
}

export const semaforoDe = (op: Operacion): Semaforo | null => (op.analisis.estado === 'Lista' ? op.analisis.semaforo ?? 'Verde' : null);

/** Lo que impide votar: ficha sin terminar, alertas rojas sin resolver. */
export function bloqueosRevision(op: Operacion): string[] {
  if (op.analisis.estado !== 'Lista') return ['La IA todavía está leyendo el contrato.'];
  return op.analisis.campos
    .filter((c) => c.alerta?.nivel === 'Rojo' && !(c.clave === 'cesion' && op.consentimientoMarca))
    .map((c) => c.alerta!.texto);
}

/** Lo que pide confirmación al votar: alertas amarillas y garantías previas en el RUG. */
export function avisosRevision(op: Operacion): string[] {
  if (op.analisis.estado !== 'Lista') return [];
  const a = op.analisis.campos.filter((c) => c.alerta?.nivel === 'Amarillo').map((c) => c.alerta!.texto);
  if (op.consultaRug?.registros.length) a.push(`RUG: ${plural(op.consultaRug.registros.length, 'garantía inscrita', 'garantías inscritas')} por otros acreedores para el RFC del otorgante.`);
  if (op.analisis.campos.some((c) => c.clave === 'cesion' && c.alerta?.nivel === 'Rojo') && op.consentimientoMarca) a.push(`Cesión con consentimiento escrito de la marca (${op.consentimientoMarca}).`);
  return a;
}

/** "Contrato coincide con el CFDI": partes, monto y plazo sin alerta. */
export const contratoCoincide = (op: Operacion) =>
  op.analisis.estado === 'Lista' && !op.analisis.campos.some((c) => (c.clave === 'partes' || c.clave === 'monto') && c.alerta);

export const faltanVotos = (op: Operacion) => Math.max(0, QUORUM_APROBACION - op.votos.length);

// ---------------------------------------------------------------------------
// Notificación de la cesión y RUG (etapa 7)
// ---------------------------------------------------------------------------

export type EstadoCesion = 'Al firmar' | 'Enviada' | 'Abierta' | 'Con acuse' | 'Sin acuse';

export const horasDesde = (fechaHora: string, ahora: string) =>
  Math.round((new Date(ahora).getTime() - new Date(fechaHora).getTime()) / 36e5);

export function estadoCesion(op: Operacion, ahoraFH: string): EstadoCesion {
  const c = op.cesion;
  if (!c) return 'Al firmar';
  if (c.acuse) return 'Con acuse';
  const ultimo = c.reenvios.length ? c.reenvios[c.reenvios.length - 1].fechaHora : c.enviada;
  if (horasDesde(ultimo, ahoraFH) >= HORAS_ACUSE) return 'Sin acuse';
  return c.abierta ? 'Abierta' : 'Enviada';
}

/** La notificación ya debió tener acuse y no lo tiene: toca el reenvío automático. */
export function tocaReenvio(op: Operacion, ahoraFH: string) {
  const c = op.cesion;
  if (!c || c.acuse || op.estatus === 'Liquidada' || op.estatus === 'Rechazada') return false;
  const ultimo = c.reenvios.length ? c.reenvios[c.reenvios.length - 1].fechaHora : c.enviada;
  return horasDesde(ultimo, ahoraFH) >= HORAS_ACUSE;
}

export const vigenciaRug = (fecha: string) => sumarDias(fecha, 365);
export function diasRugPorVencer(op: Operacion) {
  if (op.rug?.estado !== 'Inscrita' || !op.rug.vigencia) return null;
  return diffDays(HOY_ISO, op.rug.vigencia);
}
export function estadoRug(op: Operacion): 'En cola' | 'Inscrita' | 'Vence pronto' | 'Actualizada' | 'Cancelada' | 'Por cerrar' | '—' {
  if (!op.rug) return '—';
  if (op.rug.estado === 'Inscrita' && op.estatus === 'Liquidada') return 'Por cerrar';
  const dias = diasRugPorVencer(op);
  if (dias !== null && dias <= ALERTA_RUG_DIAS) return 'Vence pronto';
  return op.rug.estado;
}

/** Lo que falta para liberar el adelanto (etapa 9): firma, inscripción, confirmación de la marca y evidencia. */
export function faltantesLiberar(op: Operacion) {
  const f: string[] = [];
  if (!op.docusign?.firmado) f.push('firma en DocuSign');
  if (op.rug?.estado !== 'Inscrita') f.push('inscripción en el RUG');
  if (!op.cesion?.acuse) f.push('confirmación de la instrucción de pago por la marca');
  if (!op.evidencia) f.push('evidencia de campaña con los links');
  return f;
}

// ---------------------------------------------------------------------------
// Contrato de factoraje como documento único (cambio 23): un solo PDF con sus
// anexos A (copia de la factura), B (pagaré no negociable) y C (acuerdo de uso
// de firma electrónica). Se genera cuando la factura y el contrato quedan
// aprobados; se firma una sola vez en un sobre de DocuSign; solo los firmados
// pasan a la sección RUG.
// ---------------------------------------------------------------------------

/** El factorado: la agencia (persona moral) o el talento que pidió el adelanto. */
export function factorado(op: Operacion, d: Pick<Datos, 'talentos' | 'agencias'>) {
  if (op.solicitante === 'Agencia') {
    const a = porId(d.agencias, op.agenciaId);
    return { razonSocial: a?.razonSocial ?? '—', firmante: a?.contacto ?? '—', rfc: a?.rfc ?? '', folioMercantil: a?.folioMercantil ?? '' };
  }
  const t = porId(d.talentos, op.talentoId);
  return { razonSocial: t?.nombre ?? '—', firmante: t?.nombre ?? '—', rfc: t?.rfc ?? '', folioMercantil: '' };
}

export const nombreArchivoContrato = (op: Operacion) => `Contrato_Factoraje_${op.folio}.pdf`;
/** Sobre único de DocuSign del documento (los cuatro partes firman en el mismo). */
export const sobreDocuSign = (op: Operacion) => {
  const h = hash(op.folio).toString(16).toUpperCase().padStart(6, '0');
  return `${h.slice(0, 4)}…${h.slice(-3)}`;
};

export interface ParteDocumento { clave: 'contrato' | 'anexoA' | 'anexoB' | 'anexoC'; etiqueta: string; detalle: string; desde: number; hasta: number; firmaPagina: number }

/** Partes del documento único con su rango de páginas y la página de cada firma. */
export function documentoUnico(op: Operacion, d: Pick<Datos, 'talentos' | 'agencias'>) {
  const cp = op.contrato.paginas;
  const partes: ParteDocumento[] = [
    { clave: 'contrato', etiqueta: 'Contrato de factoraje', detalle: 'Persona Moral (Agencia) v1.0 · campos [●] completos', desde: 1, hasta: cp, firmaPagina: cp },
    { clave: 'anexoA', etiqueta: 'Anexo A · Copia de la factura', detalle: `CFDI ${op.cfdi.serieFolio} insertado · UUID e importe coinciden`, desde: cp + 1, hasta: cp + 2, firmaPagina: cp + 2 },
    { clave: 'anexoB', etiqueta: 'Anexo B · Pagaré no negociable', detalle: `${money(montoAdelanto(op))} · vence ${formatDate(vencimientoOp(op))}`, desde: cp + 3, hasta: cp + 3, firmaPagina: cp + 3 },
    { clave: 'anexoC', etiqueta: 'Anexo C · Acuerdo de uso de firma electrónica', detalle: 'DocuSign', desde: cp + 4, hasta: cp + 5, firmaPagina: cp + 5 },
  ];
  const total = cp + 6;
  const fac = factorado(op, d);
  const firmado = !!op.docusign?.firmado;
  return {
    archivo: nombreArchivoContrato(op),
    paginas: total,
    partes,
    firmado,
    firmadoEl: op.docusign?.firmado,
    sobre: sobreDocuSign(op),
    firmantes: [
      { quien: fac.razonSocial, nombre: op.docusign?.firmo ?? fac.firmante, fecha: op.docusign?.firmado },
      { quien: INFLU.razonSocial, nombre: INFLU.apoderado, fecha: op.docusign?.firmado },
    ],
  };
}

/** Datos [●] que el sistema debe poder llenar para generar el documento único. */
export function faltanDatosContrato(op: Operacion, d: Pick<Datos, 'talentos' | 'agencias' | 'empresas' | 'marcas'>) {
  const fac = factorado(op, d);
  const empresa = empresaDe(d, op.marcaId);
  const falta: string[] = [];
  if (!fac.rfc) falta.push('RFC del factorado');
  if (op.solicitante === 'Agencia' && !fac.folioMercantil) falta.push('folio mercantil de la agencia');
  if (!op.contactoPagos.email || op.contactoPagos.email === '—') falta.push('correo del área de pagos');
  if (!empresa?.rfc) falta.push('RFC de la marca');
  if (!op.cfdi.uuid) falta.push('UUID de la factura');
  return falta;
}

/** El documento único se genera cuando la factura y el contrato quedan aprobados. */
export const contratoGenerado = (op: Operacion) => !!op.docusign;

export type EstadoContrato = 'Firmado' | 'Por firmar' | 'Faltan datos' | '—';
export function estadoContrato(op: Operacion, d: Pick<Datos, 'talentos' | 'agencias' | 'empresas' | 'marcas'>): EstadoContrato {
  if (!contratoGenerado(op)) return '—';
  if (faltanDatosContrato(op, d).length) return 'Faltan datos';
  return op.docusign?.firmado ? 'Firmado' : 'Por firmar';
}

/** Horas de la captura al adelanto (tiempo de cobro prometido: 24–48 h). */
export const horasCobro = (op: Operacion) =>
  op.adelanto ? Math.round((new Date(op.adelanto.fechaHora).getTime() - new Date(op.capturada).getTime()) / 36e5 * 10) / 10 : null;

// ---------------------------------------------------------------------------
// Links de publicación y métricas (MVP Fase 1 §5). Proveedor de datos públicos
// simulado: verifica el link y devuelve métricas estables para el mismo link.
// ---------------------------------------------------------------------------

const PATRONES: Partial<Record<Red, RegExp>> = {
  Instagram: /instagram\.com\/(reel|p|tv)\/[\w-]+/i,
  TikTok: /tiktok\.com\/@([\w.]+)\/video\/\d+/i,
  YouTube: /(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i,
  X: /(x|twitter)\.com\/([\w]+)\/status\/\d+/i,
  Facebook: /facebook\.com\/[\w.]+\/(videos|posts)\/[\w]+/i,
  Twitch: /twitch\.tv\/videos\/\d+/i,
};

export function verificarLink(link: string, red: Red, t: Talento, marca: string, fechaPublicacion: string): Pieza['verificacion'] {
  const fh = `${HOY_ISO}T${new Date().toTimeString().slice(0, 5)}`;
  const patron = PATRONES[red];
  const existe = !!patron && patron.test(link.trim());
  const enLink = link.match(/@([\w.]+)/)?.[1] ?? (red === 'X' ? link.match(/(?:x|twitter)\.com\/([\w]+)/i)?.[1] : undefined);
  const suyo = handleDe(t, red);
  const cuenta = !!suyo && (!enLink || suyo.usuario.replace('@', '').toLowerCase() === enLink.toLowerCase());
  const fecha = fechaPublicacion <= HOY_ISO;
  const mencion = existe && cuenta;
  const motivo = !existe ? `No es un link válido de ${red}.`
    : !suyo ? `${t.nombre} no registró un handle de ${red}.`
      : !cuenta ? `La publicación es de @${enLink}, no de ${suyo.usuario}.`
        : !fecha ? 'La publicación todavía no aparece: la fecha pactada es futura.' : undefined;
  return { existe, cuenta, fecha, mencion: mencion && fecha, ok: !motivo, motivo: motivo ?? `Menciona a @${marca.toLowerCase().replace(/[^a-z0-9]/g, '')}`, fechaHora: fh };
}

/** Métricas del día `dia` desde la carga del link: curva que crece y se estabiliza. */
export function metricasDia(clave: string, dia: number, formato: Pieza['formato'], base: number): Omit<Snapshot, 'fechaHora' | 'dia'> {
  const h = hash(clave);
  if (formato === 'Story') {
    const vistas = Math.round(base * (0.028 + (h % 9) / 1000));
    return { vistas, likes: Math.round(vistas * 0.04), comentarios: Math.round(vistas * 0.004) };
  }
  const tope = base * (0.9 + (h % 70) / 100);
  const vistas = Math.round(tope * (1 - 0.58 * Math.exp(-0.42 * (dia + 0.35))));
  return { vistas, likes: Math.round(vistas * (0.058 + (h % 15) / 1000)), comentarios: Math.round(vistas * (0.006 + (h % 5) / 1000)) };
}

/** Snapshots del día 0 (al cargar el link) hasta hoy, un máximo de 30 días. */
export function snapshotsHasta(clave: string, cargado: string, formato: Pieza['formato'], base: number): Snapshot[] {
  const dias = Math.min(DIAS_METRICAS, Math.max(0, diffDays(cargado.slice(0, 10), HOY_ISO)));
  return Array.from({ length: dias + 1 }, (_, dia) => ({
    fechaHora: dia === 0 ? cargado : `${sumarDias(cargado.slice(0, 10), dia)}T06:00`, dia, ...metricasDia(clave, dia, formato, base),
  }));
}

export const ultimo = (p: Pieza) => p.snapshots[p.snapshots.length - 1];
export const snapshotDia = (p: Pieza, dia: number) => p.snapshots.find((s) => s.dia === dia);

export function totalesPiezas(piezas: Pieza[]) {
  const ult = piezas.map(ultimo).filter(Boolean);
  const vistas = suma(ult.map((s) => s.vistas));
  const likes = suma(ult.map((s) => s.likes));
  const comentarios = suma(ult.map((s) => s.comentarios));
  return { vistas, likes, comentarios, engagement: vistas ? Math.round(((likes + comentarios) / vistas) * 1000) / 10 : 0 };
}

/** Vistas acumuladas por día de todas las piezas de una operación. */
export function serieVistas(piezas: Pieza[]) {
  const max = Math.max(0, ...piezas.map((p) => ultimo(p)?.dia ?? 0));
  return Array.from({ length: max + 1 }, (_, d) => ({
    dia: d,
    vistas: suma(piezas.map((p) => (snapshotDia(p, Math.min(d, ultimo(p)?.dia ?? 0)) ?? ultimo(p))?.vistas ?? 0)),
  }));
}

/** Sugerencia de cumplimiento: piezas verificadas contra los entregables del contrato. */
export function sugerencia(op: Operacion, piezas: Pieza[]) {
  const total = suma(op.entregables.map((e) => e.cantidad));
  const verificados = Math.min(total, piezas.filter((p) => p.verificacion.ok).length);
  return { verificados, total, completa: total > 0 && verificados >= total };
}

export const piezasDe = (opId: string, piezas: Pieza[]) => piezas.filter((p) => p.operacionId === opId);

// ---------------------------------------------------------------------------
// Cuentas por cobrar (la factura de la marca)
// ---------------------------------------------------------------------------

export const saldoCxC = (c: CxC) => Math.max(0, redondear(c.importe - suma(c.abonos.map((a) => a.monto))));

export function estatusCxC(c: CxC): 'Vigente' | 'Vencido' | 'Pagado' {
  if (saldoCxC(c) <= 0.01) return 'Pagado';
  return c.vencimiento < HOY_ISO ? 'Vencido' : 'Vigente';
}

export const diasVencida = (c: CxC) => diffDays(c.vencimiento, HOY_ISO);

export const carteraVencida = (cxc: CxC[]) => suma(cxc.filter((c) => estatusCxC(c) === 'Vencido').map(saldoCxC));

export function finDeMes(fecha = HOY_ISO) {
  const x = new Date(`${fecha}T12:00:00`);
  const f = new Date(x.getFullYear(), x.getMonth() + 1, 0, 12);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}
export const inicioDeMes = (fecha = HOY_ISO) => `${fecha.slice(0, 8)}01`;

/** Vencido más lo que vence antes de fin de mes. */
export const cobranzaEstimadaMes = (cxc: CxC[]) =>
  suma(cxc.filter((c) => estatusCxC(c) !== 'Pagado' && c.vencimiento <= finDeMes()).map(saldoCxC));

/** Fecha en que la marca terminó de pagar (el abono que liquidó). */
export function pagoMarca(c: CxC | undefined) {
  if (!c || saldoCxC(c) > 0.01) return null;
  const ult = [...c.abonos].sort((a, b) => a.fecha.localeCompare(b.fecha)).pop();
  return ult ? ult.fecha : null;
}

/** Plazo real de pago de la marca: de la publicación al pago (se registra al cerrar). */
export function plazoReal(op: Operacion, c: CxC | undefined) {
  const f = pagoMarca(c);
  return f ? diffDays(op.fechaPublicacion, f) : null;
}

export interface Bandas { corriente: number; d1a30: number; d31a60: number; mas60: number }
export function bandas(cxc: CxC[]): Bandas {
  const b = { corriente: 0, d1a30: 0, d31a60: 0, mas60: 0 };
  for (const c of cxc) {
    const s = saldoCxC(c);
    if (s <= 0.01) continue;
    const dias = diasVencida(c);
    if (dias <= 0) b.corriente += s;
    else if (dias <= 30) b.d1a30 += s;
    else if (dias <= 60) b.d31a60 += s;
    else b.mas60 += s;
  }
  return b;
}

/** Recordatorios por email al área de pagos: 7 días y 1 día antes del vencimiento. */
export function recordatorios(op: Operacion) {
  const venc = vencimientoOp(op);
  return RECORDATORIOS.map((r) => ({ dias: r, fecha: sumarDias(venc, -r), enviado: sumarDias(venc, -r) <= HOY_ISO }));
}

// ---------------------------------------------------------------------------
// Cuentas por pagar (remanente) y liquidación (etapa 13)
// ---------------------------------------------------------------------------

export interface Liquidacion {
  total: number;
  adelantado: number;
  retenido: number;
  fijo: number;
  meses: number;
  variable: number;
  neto: number;
  aCargo: number;
  /** La marca todavía no paga: los meses se estiman al vencimiento (o a hoy si ya venció). */
  estimada: boolean;
}

/**
 * Comisión fija: 8% sobre el total de la factura (CFDI). Pendiente #2: la tasa
 * variable (1.5% mensual sobre lo adelantado) cuenta los meses iniciados entre
 * la liberación del adelanto y el pago de la marca. Pendiente #5: si la comisión
 * supera lo retenido, el remanente es $0 y la diferencia queda a cargo.
 */
export function liquidacion(op: Operacion, c: CxC | undefined): Liquidacion {
  const total = op.monto;
  const adelantado = op.adelanto?.monto ?? montoAdelanto(op);
  const retenido = redondear(total - adelantado);
  const pagada = pagoMarca(c);
  const desde = op.adelanto?.fechaHora.slice(0, 10) ?? HOY_ISO;
  const hasta = pagada ?? [vencimientoOp(op), HOY_ISO].sort().pop()!;
  const meses = Math.max(1, Math.ceil(Math.max(0, diffDays(desde, hasta)) / 30));
  const fijo = redondear(total * COMISION_FIJA);
  const variable = redondear(adelantado * TASA_MENSUAL * meses);
  const neto = Math.max(0, redondear(retenido - fijo - variable));
  const aCargo = Math.max(0, redondear(fijo + variable - retenido));
  return { total, adelantado, retenido, fijo, meses, variable, neto, aCargo, estimada: !pagada };
}

/** Comisión variable acumulada a hoy (seguimiento). */
export function variableAcumulada(op: Operacion) {
  if (!op.adelanto) return 0;
  const meses = Math.max(1, Math.ceil(Math.max(0, diffDays(op.adelanto.fechaHora.slice(0, 10), HOY_ISO)) / 30));
  return { meses, monto: redondear(op.adelanto.monto * TASA_MENSUAL * meses) };
}

export const cxcDe = (opId: string, cxc: CxC[]) => cxc.find((c) => c.operacionId === opId);
export const cxpDe = (opId: string, cxp: CxP[]) => cxp.find((c) => c.operacionId === opId);
export const ordenDe = (opId: string, tipo: OrdenPago['tipo'], ordenes: OrdenPago[]) => ordenes.find((o) => o.operacionId === opId && o.tipo === tipo);

/** El remanente vence dos días después del pago de la marca; antes, al vencimiento de la factura + 2. */
export function vencimientoCxP(p: CxP, ops: Operacion[], cxc: CxC[]) {
  const op = porId(ops, p.operacionId)!;
  const pagada = pagoMarca(cxcDe(op.id, cxc));
  return sumarDias(pagada ?? vencimientoOp(op), DIAS_LIQUIDACION);
}

export function estatusCxP(p: CxP, ops: Operacion[], cxc: CxC[]): 'Vigente' | 'Vencido' | 'Pagado' {
  if (p.pago) return 'Pagado';
  const pagada = pagoMarca(cxcDe(p.operacionId, cxc));
  if (!pagada) return 'Vigente';
  return vencimientoCxP(p, ops, cxc) < HOY_ISO ? 'Vencido' : 'Vigente';
}

/** Regla 17: sin el pago de la marca acreditado, el remanente no se libera. */
export function bloqueoCxP(p: CxP, ops: Operacion[], cxc: CxC[], marcas: Marca[]) {
  if (p.pago) return null;
  const op = porId(ops, p.operacionId);
  const c = op && cxcDe(op.id, cxc);
  if (!op || !c) return 'La operación no tiene factura por cobrar.';
  if (pagoMarca(c)) return null;
  return `${nombreMarca({ marcas }, op.marcaId)} no ha pagado ${c.documento}: el remanente se libera cuando el pago llegue a la cuenta de Influ. Saldo ${money(saldoCxC(c))}.`;
}

export const montoCxP = (p: CxP, ops: Operacion[], cxc: CxC[]) => {
  if (p.pago) return p.pago.importe;
  const op = porId(ops, p.operacionId)!;
  return liquidacion(op, cxcDe(op.id, cxc)).neto;
};

// ---------------------------------------------------------------------------
// Notificaciones (etapa 11): se derivan, no se guardan
// ---------------------------------------------------------------------------

export type TipoNotificacion = 'Registros' | 'Solicitudes' | 'Contrato (IA)' | 'Cesión y RUG' | 'Pagos' | 'Vencimientos' | 'Evidencia';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  icono: 'reloj' | 'ok' | 'documento' | 'alerta' | 'pago';
  titulo: string;
  detalle: string;
  fechaHora: string;
  operacionId?: string;
  ruta?: string;
  urgente?: boolean;
}

/**
 * Feed de cada perfil. El equipo ve además los registros por preaprobar, los
 * acuses pendientes, la vigencia del RUG y los semáforos rojos (pantalla 22).
 */
export function notificaciones(v: Datos, ahoraFH: string, interno: boolean): Notificacion[] {
  const n: Notificacion[] = [];
  if (interno) {
    const porRevisar = [...v.talentos.filter((t) => t.cuenta === 'En revisión'), ...v.agencias.filter((a) => a.cuenta === 'En revisión')];
    if (porRevisar.length) n.push({ id: 'reg', tipo: 'Registros', icono: 'alerta', titulo: `${plural(porRevisar.length, 'registro nuevo espera', 'registros nuevos esperan')} preaprobación`, detalle: porRevisar.map((x) => x.nombre).join(', '), fechaHora: `${HOY_ISO}T07:00`, ruta: '/registros', urgente: true });
  }
  for (const t of v.talentos) {
    for (const r of t.resoluciones) {
      n.push({ id: `${t.id}-${r.fechaHora}`, tipo: 'Registros', icono: r.decision === 'Preaprobada' ? 'ok' : r.decision === 'Reenviada' ? 'documento' : 'alerta', titulo: `Cuenta ${r.decision.toLowerCase()} — ${t.nombre}`, detalle: `${r.usuario}${r.nota ? ` · ${r.nota}` : ''}`, fechaHora: r.fechaHora, ruta: interno ? '/registros' : '/perfil' });
    }
  }
  for (const a of v.agencias) {
    for (const r of a.resoluciones) {
      n.push({ id: `${a.id}-${r.fechaHora}`, tipo: 'Registros', icono: r.decision === 'Preaprobada' ? 'ok' : 'alerta', titulo: `Cuenta ${r.decision.toLowerCase()} — ${a.nombre}`, detalle: `${r.usuario}${r.nota ? ` · ${r.nota}` : ''}`, fechaHora: r.fechaHora, ruta: interno ? '/registros' : '/perfil' });
    }
  }
  for (const op of v.operaciones) {
    const marca = nombreMarca(v, op.marcaId);
    const tag = `#${op.folio.slice(-4)} · ${marca}`;
    const base = { operacionId: op.id };
    n.push({ ...base, id: `${op.id}-cap`, tipo: 'Solicitudes', icono: 'documento', titulo: `Nueva solicitud — ${tag}`, detalle: `${money(op.monto)} · ${nombreTalento(v, op.talentoId)}`, fechaHora: op.capturada });
    if (op.analisis.estado === 'Lista' && op.analisis.fin) {
      const rojo = op.analisis.campos.find((c) => c.alerta?.nivel === 'Rojo');
      n.push({ ...base, id: `${op.id}-ia`, tipo: 'Contrato (IA)', icono: rojo ? 'alerta' : 'ok', titulo: rojo ? `${tag} · Contrato con semáforo rojo` : `${tag} · Ficha del contrato lista (${op.analisis.semaforo?.toLowerCase()})`, detalle: rojo?.alerta?.texto ?? `Monto base sugerido ${money(op.analisis.montoBaseSugerido)}`, fechaHora: op.analisis.fin, urgente: !!rojo && ['En revisión', 'Observada'].includes(op.estatus) });
    }
    if (op.observacion) n.push({ ...base, id: `${op.id}-obs`, tipo: 'Solicitudes', icono: 'alerta', titulo: `${tag} · Solicitud observada`, detalle: op.observacion.nota, fechaHora: op.observacion.fechaHora });
    if (op.estatus === 'Rechazada' && op.rechazo) n.push({ ...base, id: `${op.id}-rech`, tipo: 'Solicitudes', icono: 'alerta', titulo: `${tag} · Solicitud rechazada`, detalle: op.rechazo.motivo, fechaHora: op.rechazo.fechaHora });
    if (op.docusign) n.push({ ...base, id: `${op.id}-apr`, tipo: 'Solicitudes', icono: 'ok', titulo: `${tag} · Solicitud aprobada`, detalle: 'Documento único enviado por DocuSign', fechaHora: op.docusign.enviado });
    if (op.docusign?.firmado) n.push({ ...base, id: `${op.id}-fir`, tipo: 'Solicitudes', icono: 'ok', titulo: `${tag} · Documento único firmado`, detalle: 'Factoraje, pagaré y certificación firmados en DocuSign', fechaHora: op.docusign.firmado });
    if (op.cesion) {
      n.push({ ...base, id: `${op.id}-ces`, tipo: 'Cesión y RUG', icono: 'documento', titulo: `${tag} · Instrucción de pago enviada a la marca`, detalle: op.cesion.email, fechaHora: op.cesion.enviada });
      if (op.cesion.acuse) n.push({ ...base, id: `${op.id}-acu`, tipo: 'Cesión y RUG', icono: 'ok', titulo: `${tag} · ${marca} aceptó la instrucción de pago`, detalle: `${op.cesion.email} · ${op.cesion.acuseVia ?? ''}`, fechaHora: op.cesion.acuse });
      for (const r of op.cesion.reenvios) n.push({ ...base, id: `${op.id}-re-${r.fechaHora}`, tipo: 'Cesión y RUG', icono: 'alerta', titulo: `${tag} · Sin confirmar en 2 días hábiles · reenviado`, detalle: r.automatico ? 'Reenvío automático' : `Reenvió ${r.usuario}`, fechaHora: r.fechaHora, urgente: !op.cesion.acuse });
    }
    if (op.rug?.fechaInscripcion) n.push({ ...base, id: `${op.id}-rug`, tipo: 'Cesión y RUG', icono: 'ok', titulo: `${tag} · Cesión inscrita en el RUG`, detalle: `${op.rug.folio} · vigente al ${formatDate(op.rug.vigencia)}`, fechaHora: op.rug.fechaInscripcion });
    const dRug = diasRugPorVencer(op);
    if (interno && dRug !== null && dRug <= ALERTA_RUG_DIAS && op.estatus !== 'Liquidada') n.push({ ...base, id: `${op.id}-rugv`, tipo: 'Cesión y RUG', icono: 'alerta', titulo: `${tag} · Inscripción RUG vence en ${dRug} días`, detalle: `${op.rug!.folio} · actualízala antes del ${formatDate(op.rug!.vigencia)}`, fechaHora: `${HOY_ISO}T07:30`, urgente: true, ruta: '/rug' });
    if (interno && op.estatus === 'Liquidada' && op.rug?.estado === 'Inscrita') n.push({ ...base, id: `${op.id}-rugc`, tipo: 'Cesión y RUG', icono: 'reloj', titulo: `${tag} · Cancelar o actualizar la inscripción en el RUG`, detalle: `Operación cerrada · ${op.rug.folio}`, fechaHora: `${HOY_ISO}T07:30`, ruta: '/rug' });
    if (op.evidencia) n.push({ ...base, id: `${op.id}-evi`, tipo: 'Evidencia', icono: 'ok', titulo: `${tag} · Evidencia de campaña recibida`, detalle: `${op.evidencia.alcance.toLowerCase()}${op.evidencia.alcance === 'Hitos parciales' ? ` (${op.evidencia.porcentaje}%)` : ''} · ${op.evidencia.sugerencia.verificados} de ${op.evidencia.sugerencia.total} piezas verificadas`, fechaHora: op.evidencia.fechaHora });
    if (op.adelanto) n.push({ ...base, id: `${op.id}-ade`, tipo: 'Pagos', icono: 'pago', titulo: `${tag} · Adelanto liberado`, detalle: `Adelanto por SPEI — ${money(op.adelanto.monto)} · ${op.adelanto.referencia}`, fechaHora: op.adelanto.fechaHora });
    const c = cxcDe(op.id, v.cxc);
    if (c) {
      const pagada = pagoMarca(c);
      if (pagada) {
        n.push({ ...base, id: `${op.id}-cob`, tipo: 'Pagos', icono: 'ok', titulo: `${tag} · Pago de la marca recibido`, detalle: `${marca} pagó ${c.documento} por ${money(c.importe)}`, fechaHora: `${pagada}T09:00` });
        if (interno && !cxpDe(op.id, v.cxp)?.pago) n.push({ ...base, id: `${op.id}-liqlista`, tipo: 'Pagos', icono: 'ok', titulo: `${tag} · Remanente listo para orden de pago`, detalle: `Remanente neto ${money(liquidacion(op, c).neto)}`, fechaHora: `${pagada}T09:05`, ruta: '/pagos' });
      } else {
        for (const r of recordatorios(op).filter((x) => x.enviado)) {
          n.push({ ...base, id: `${op.id}-v${r.dias}`, tipo: 'Vencimientos', icono: 'reloj', titulo: `${tag} · Vencimiento de la marca en ${plural(r.dias, 'día', 'días')} · recordatorio enviado`, detalle: `Email al área de pagos (${op.contactoPagos.email}) · saldo ${money(saldoCxC(c))}`, fechaHora: `${r.fecha}T08:00`, urgente: r.dias === 1 && r.fecha === HOY_ISO });
        }
        const dias = diffDays(HOY_ISO, c.vencimiento);
        if (dias < 0) n.push({ ...base, id: `${op.id}-venc`, tipo: 'Vencimientos', icono: 'alerta', titulo: `${tag} · Factura vencida hace ${-dias} días`, detalle: `${marca} no ha pagado ${money(saldoCxC(c))}`, fechaHora: `${HOY_ISO}T08:00`, urgente: true });
      }
    }
    const p = cxpDe(op.id, v.cxp);
    if (p?.pago) n.push({ ...base, id: `${op.id}-liq`, tipo: 'Pagos', icono: 'pago', titulo: `${tag} · Remanente (neto de comisiones)`, detalle: `${money(p.pago.importe)} neto de comisiones. Operación cerrada.`, fechaHora: `${p.pago.fecha}T${p.pago.hora}` });
  }
  void ahoraFH;
  return n.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

// ---------------------------------------------------------------------------
// Alertas del sistema (una por dolor del documento, ANALISIS.md §f)
// ---------------------------------------------------------------------------

export interface Alerta { id: string; tipo: 'error' | 'warn' | 'ok'; titulo: string; detalle: string; ruta: string }

export function alertas(v: Datos, ahoraFH: string, marcas: Marca[] = v.marcas): Alerta[] {
  const a: Alerta[] = [];
  const ops = v.operaciones;

  const registros = [...v.talentos.filter((t) => t.cuenta === 'En revisión'), ...v.agencias.filter((x) => x.cuenta === 'En revisión')];
  if (registros.length) a.push({ id: 'registros', tipo: 'warn', titulo: `${plural(registros.length, 'registro nuevo espera', 'registros nuevos esperan')} preaprobación`, detalle: `${registros.map((x) => x.nombre).join(', ')}: no pueden pedir adelantos hasta ser preaprobados.`, ruta: '/registros' });

  const vencidas = v.cxc.filter((c) => estatusCxC(c) === 'Vencido');
  if (vencidas.length) a.push({ id: 'vencidas', tipo: 'error', titulo: `${plural(vencidas.length, 'factura vencida', 'facturas vencidas')} sin pago de la marca`, detalle: `${money(suma(vencidas.map(saldoCxC)))}: ${vencidas.map((c) => `${c.documento} ${nombreMarca({ marcas }, c.marcaId)}`).join(', ')}.`, ruta: '/pagos' });

  const rojas = ops.filter((o) => ['En revisión', 'Observada'].includes(o.estatus) && o.analisis.semaforo === 'Rojo' && bloqueosRevision(o).length);
  if (rojas.length) a.push({ id: 'rojas', tipo: 'error', titulo: `${plural(rojas.length, 'contrato', 'contratos')} con semáforo rojo`, detalle: rojas.map((o) => `${o.folio}: ${bloqueosRevision(o)[0]}`).join(' '), ruta: '/revision' });

  const sinAcuse = ops.filter((o) => o.cesion && !o.cesion.acuse && estadoCesion(o, ahoraFH) === 'Sin acuse');
  if (sinAcuse.length) a.push({ id: 'acuses', tipo: 'error', titulo: `${plural(sinAcuse.length, 'instrucción de pago sin confirmar', 'instrucciones de pago sin confirmar')} en 2 días hábiles`, detalle: `${sinAcuse.map((o) => o.folio).join(', ')}: el adelanto no se libera sin la confirmación de la marca.`, ruta: '/cesiones' });

  const enCola = ops.filter((o) => o.rug?.estado === 'En cola');
  if (enCola.length) a.push({ id: 'rug', tipo: 'error', titulo: `${plural(enCola.length, 'cesión firmada', 'cesiones firmadas')} sin inscribir en el RUG`, detalle: `${enCola.map((o) => o.folio).join(', ')}: sin RUG la misma factura se podría ceder dos veces.`, ruta: '/rug' });

  const rugVence = ops.filter((o) => estadoRug(o) === 'Vence pronto');
  if (rugVence.length) a.push({ id: 'rugvence', tipo: 'warn', titulo: `${plural(rugVence.length, 'inscripción vence', 'inscripciones vencen')} en el RUG en ${ALERTA_RUG_DIAS} días o menos`, detalle: rugVence.map((o) => `${o.folio} (${o.rug!.folio})`).join(', '), ruta: '/rug' });

  const porCerrar = ops.filter((o) => estadoRug(o) === 'Por cerrar');
  if (porCerrar.length) a.push({ id: 'rugcierre', tipo: 'warn', titulo: `${plural(porCerrar.length, 'inscripción', 'inscripciones')} por cancelar o actualizar`, detalle: `${porCerrar.map((o) => o.folio).join(', ')}: la operación ya se cerró.`, ruta: '/rug' });

  const porAutorizar = v.ordenes.filter((o) => o.estatus === 'Por autorizar');
  if (porAutorizar.length) a.push({ id: 'ordenes', tipo: 'warn', titulo: `${plural(porAutorizar.length, 'orden de pago espera', 'órdenes de pago esperan')} la segunda firma`, detalle: porAutorizar.map((o) => `${o.referencia} ${money(o.monto)} (preparó ${o.preparo.usuario.split(' ')[0]})`).join(', '), ruta: '/pagos' });

  const sinCep = v.ordenes.filter((o) => o.estatus === 'Autorizada');
  if (sinCep.length) a.push({ id: 'cep', tipo: 'warn', titulo: `${plural(sinCep.length, 'orden autorizada espera', 'órdenes autorizadas esperan')} el CEP`, detalle: sinCep.map((o) => o.referencia).join(', '), ruta: '/pagos' });

  const fallidos = v.mensajes.filter((m) => m.estatus === 'Fallido');
  if (fallidos.length) a.push({ id: 'whatsapp', tipo: 'error', titulo: `${plural(fallidos.length, 'aviso de pago no entregado', 'avisos de pago no entregados')}`, detalle: `${fallidos.map((m) => `${m.nombre} (${porId(ops, m.operacionId)?.folio})`).join(', ')}: el WhatsApp no llegó.`, ruta: '/notificaciones' });

  const remanentes = v.cxp.filter((p) => !p.pago && !bloqueoCxP(p, ops, v.cxc, marcas) && !ordenDe(p.operacionId, 'Remanente', v.ordenes));
  if (remanentes.length) {
    const venc = remanentes.filter((p) => estatusCxP(p, ops, v.cxc) === 'Vencido');
    a.push({ id: 'remanentes', tipo: venc.length ? 'error' : 'warn', titulo: `${plural(remanentes.length, 'remanente listo', 'remanentes listos')} para orden de pago`, detalle: `La marca ya pagó: ${remanentes.map((p) => p.documento).join(', ')}.${venc.length ? ` ${venc.length} fuera del plazo de ${DIAS_LIQUIDACION} días.` : ''}`, ruta: '/pagos' });
  }

  const lentas = ops.filter((o) => o.estatus === 'En revisión' && horasDesde(o.capturada, ahoraFH) > HORAS_REVISION);
  if (lentas.length) a.push({ id: 'sla', tipo: 'warn', titulo: `${plural(lentas.length, 'solicitud lleva', 'solicitudes llevan')} más de ${HORAS_REVISION} h en revisión`, detalle: `${lentas.map((o) => o.folio).join(', ')}: el tiempo de cobro prometido es de ${META_HORAS_COBRO} h.`, ruta: '/revision' });

  const conVoto = ops.filter((o) => o.estatus === 'En revisión' && o.votos.length > 0 && o.votos.length < QUORUM_APROBACION);
  if (conVoto.length) a.push({ id: 'votos', tipo: 'warn', titulo: `${plural(conVoto.length, 'solicitud espera', 'solicitudes esperan')} otro voto`, detalle: `${conVoto.map((o) => `${o.folio} (votó ${o.votos.map((x) => x.usuario.split(' ')[0]).join(', ')})`).join('; ')}.`, ruta: '/revision' });

  const porVencer = v.cxc.filter((c) => estatusCxC(c) === 'Vigente' && diffDays(HOY_ISO, c.vencimiento) <= RECORDATORIOS[0]);
  if (porVencer.length) a.push({ id: 'porvencer', tipo: 'warn', titulo: `${plural(porVencer.length, 'factura vence', 'facturas vencen')} en ${RECORDATORIOS[0]} días o menos`, detalle: porVencer.map((c) => `${c.documento} ${nombreMarca({ marcas }, c.marcaId)} el ${formatDate(c.vencimiento, { day: 'numeric', month: 'short' })}`).join(', ') + '. Recordatorio enviado al área de pagos.', ruta: '/pagos' });

  const listas = ops.filter((o) => o.estatus === 'Firmada' && faltantesLiberar(o).length === 0 && !ordenDe(o.id, 'Adelanto', v.ordenes));
  if (listas.length) a.push({ id: 'listas', tipo: 'ok', titulo: `${plural(listas.length, 'adelanto listo', 'adelantos listos')} para orden de pago`, detalle: `${listas.map((o) => `${o.folio} ${money(montoAdelanto(o))}`).join(', ')}: firma, RUG, acuse y evidencia completos.`, ruta: '/pagos' });

  const pendientes = v.talentos.filter((t) => t.representacion === 'Pendiente');
  if (pendientes.length) a.push({ id: 'representacion', tipo: 'ok', titulo: `${plural(pendientes.length, 'talento espera', 'talentos esperan')} confirmación de su agencia`, detalle: `${pendientes.map((t) => `${t.nombre} (${porId(v.agencias, t.agenciaId)?.nombre ?? 'agencia'})`).join(', ')}.`, ruta: '/talentos' });

  return a;
}

// ---------------------------------------------------------------------------
// Tablero
// ---------------------------------------------------------------------------

/** Exposición por marca y si rebasa el límite de concentración (pendiente #13). */
export function exposicion(cxc: CxC[], marcas: Marca[]) {
  const abiertas = cxc.filter((c) => estatusCxC(c) !== 'Pagado');
  const total = suma(abiertas.map(saldoCxC));
  return marcas
    .map((m) => {
      const s = suma(abiertas.filter((c) => c.marcaId === m.id).map(saldoCxC));
      const pct = total ? (s / total) * 100 : 0;
      return { marca: m.nombre, saldo: Math.round(s), pct: Math.round(pct * 10) / 10, alta: pct > LIMITE_CONCENTRACION };
    })
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
}

/** Historial de pago de una marca: plazo pactado contra plazo real por operación. */
export function historialMarca(marcaId: string, v: Pick<Datos, 'operaciones' | 'cxc'>) {
  const ops = v.operaciones.filter((o) => o.marcaId === marcaId && o.adelanto);
  const filas = ops.map((o) => ({ folio: o.folio, pactado: o.plazoDias, real: plazoReal(o, cxcDe(o.id, v.cxc)), monto: o.monto }))
    .sort((a, b) => a.folio.localeCompare(b.folio));
  const reales = filas.map((f) => f.real).filter((x): x is number => x !== null);
  return {
    filas,
    operaciones: ops.length,
    monto: suma(ops.map((o) => o.monto)),
    pactado: ops.length ? Math.round(suma(ops.map((o) => o.plazoDias)) / ops.length) : null,
    real: reales.length ? Math.round(suma(reales) / reales.length) : null,
  };
}

/** Criterios de éxito del piloto (día 90), MVP Fase 1 §14. */
export function criteriosPiloto(v: Datos, todosTalentos: Talento[], ahoraFH: string) {
  const liberadas = v.operaciones.filter((o) => o.adelanto);
  const enMeta = liberadas.filter((o) => (horasCobro(o) ?? 99) <= META_HORAS_COBRO);
  const aprobadas = v.operaciones.filter((o) => o.docusign);
  const sinCorreccion = aprobadas.filter((o) => !o.analisis.campos.some((c) => c.correccion));
  const piezas = v.piezas;
  const verificadas = piezas.filter((p) => p.verificacion.ok);
  const notificadas = v.operaciones.filter((o) => o.cesion && (o.cesion.acuse || estadoCesion(o, ahoraFH) === 'Sin acuse'));
  const conAcuse48 = notificadas.filter((o) => o.cesion?.acuse && horasDesde(o.cesion.enviada, o.cesion.acuse) <= HORAS_ACUSE);
  const inscritas = v.operaciones.filter((o) => o.rug?.fechaInscripcion);
  const horasRug = inscritas.map((o) => horasDesde(o.rug!.enCola, o.rug!.fechaInscripcion!));
  const resueltas = [...todosTalentos.flatMap((t) => t.resoluciones.filter((r) => r.decision !== 'Reenviada').slice(0, 1).map((r) => horasDesde(t.alta, r.fechaHora)))];
  const conAgencia = todosTalentos.filter((t) => t.agenciaId || t.representacion === 'Independiente');
  const sinResolver = todosTalentos.filter((t) => t.representacion === 'Pendiente');
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  return {
    liberadasEnMeta: pct(enMeta.length, liberadas.length),
    fichasSinCorreccion: pct(sinCorreccion.length, aprobadas.length),
    piezasVerificadas: pct(verificadas.length, piezas.length),
    acuse48: pct(conAcuse48.length, notificadas.length),
    horasRug: horasRug.length ? Math.round(suma(horasRug) / horasRug.length * 10) / 10 : null,
    horasPreaprobacion: resueltas.length ? Math.round(suma(resueltas) / resueltas.length) : null,
    volumen: suma(liberadas.map((o) => o.adelanto!.monto)),
    operaciones: liberadas.length,
    pendientesAgencias: pct(sinResolver.length, conAgencia.filter((t) => t.agenciaId).length),
  };
}
