// Motores del marketplace (MVP Fase 2 §8), simulados con reglas deterministas:
// briefing, matching, guía de precio, revisión de contenido, verificación de
// publicación y KPIs. En producción los resuelve un modelo de lenguaje y
// visión; aquí las reglas dan el mismo tipo de salida.

import { HOY_ISO, sumarDias } from '../data/constantes';
import type {
  BriefEstructurado, Chequeo, ComponentesScore, Condiciones, Creador, Brief, EntregableMk, FormatoMk, LineaPrecio, Oferta,
  SnapshotMk, UsoMk,
} from './types';

/** Fee de Influ sobre la tarifa del creador, visible para la marca por separado. */
export const FEE_INFLU = 0.12;
/** Pesos ajustables del score de match. Arranca con reglas; aprende de lo que eligen las marcas. */
export const PESOS: ComponentesScore = { contenido: 0.3, audiencia: 0.25, precio: 0.15, performance: 0.1, cumplimiento: 0.12, disponibilidad: 0.08 };
/** Con esta tasa de aceptación sin cambios, la revisión del ranking pasa a ser por muestreo. */
export const UMBRAL_MUESTREO = 0.8;
/** En muestreo, el equipo revisa uno de cada N briefs. */
export const MUESTREO_CADA = 5;
export const DIAS_KPIS = 30;

export const redondear = (n: number) => Math.round(n * 100) / 100;
export const suma = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
export const totalLineas = (l: LineaPrecio[]) => suma(l.map((x) => x.precio));
export const fee = (tarifa: number) => Math.round(tarifa * FEE_INFLU);
export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

export const entregablesTexto = (e: EntregableMk[]) =>
  e.map((x) => `${x.cantidad} ${x.formato.toLowerCase()}${x.cantidad > 1 ? (x.formato === 'Story' ? 's' : 's') : ''}`.replace('storys', 'stories')).join(' + ');

// ---------------------------------------------------------------------------
// Briefing: texto libre → brief estructurado
// ---------------------------------------------------------------------------

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CIUDADES = ['CDMX', 'Monterrey', 'Guadalajara', 'Puebla', 'Querétaro', 'Mérida', 'Tijuana', 'León', 'Cancún'];
const TEMAS: [RegExp, string][] = [
  [/auto|coche|manejo|carro|motor/, 'autos'], [/lifestyle|estilo de vida/, 'lifestyle'], [/moda|outfit/, 'moda'],
  [/belleza|maquillaje|skincare/, 'belleza'], [/lujo|premium/, 'lujo'], [/fitness|gym|bienestar/, 'fitness'],
  [/viaje|turismo/, 'viajes'], [/comida|gastronom|restaurante/, 'gastronomía'], [/tecnolog|gadget/, 'tecnología'],
  [/gaming|videojuego/, 'gaming'], [/mam[aá]|familia|maternidad/, 'maternidad'], [/reloj/, 'relojes'], [/bebida|refresco|agua/, 'bebidas'],
];
const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10 };
const num = (x: string) => NUMEROS[x] ?? Number(x);

/** Lee el texto de la marca y arma el brief. Lo que no encuentra queda con un valor por omisión editable. */
export function generarBrief(texto: string, marca: string): BriefEstructurado {
  const t = sinAcentos(texto);
  const cantidad = Number(t.match(/(\d+)\s+creador/)?.[1] ?? NUMEROS[t.match(/(un|dos|tres|cuatro|cinco|seis|ocho|diez)\s+creador/)?.[1] ?? ''] ?? 3);
  const temas = TEMAS.filter(([r]) => r.test(t)).map(([, v]) => v);
  const ciudades = CIUDADES.filter((c) => t.includes(sinAcentos(c)) || (c === 'CDMX' && /ciudad de mexico|cdmx/.test(t)));
  const edad = t.match(/(\d{2})\s*(?:–|-|a)\s*(\d{2})/);
  const nse = /ingresos altos|nse alto|premium|lujo/.test(t) ? 'NSE alto' : /ingresos medios/.test(t) ? 'NSE medio' : 'Todos';

  const entregables: EntregableMk[] = [];
  const re = /(\d+|un|una|uno|dos|tres|cuatro|cinco)\s+(reels?|stor(?:y|ies)|historias?|posts?|tiktoks?|videos?|shorts?)/g;
  for (const m of t.matchAll(re)) {
    const f = m[2];
    const formato: FormatoMk = f.startsWith('reel') ? 'Reel' : f.startsWith('stor') || f.startsWith('histor') ? 'Story' : f.startsWith('post') ? 'Post'
      : f.startsWith('tiktok') ? 'TikTok' : f.startsWith('short') ? 'Short' : 'Video';
    const red = formato === 'TikTok' ? 'TikTok' : formato === 'Video' || formato === 'Short' ? 'YouTube' : 'Instagram';
    if (!entregables.some((e) => e.formato === formato)) entregables.push({ formato, red, cantidad: num(m[1]) || 1 });
  }
  if (!entregables.length) entregables.push({ formato: 'Reel', red: 'Instagram', cantidad: 1 });

  const mesIdx = MESES.findIndex((m) => t.includes(m));
  const hoy = new Date(`${HOY_ISO}T12:00:00`);
  let desde = sumarDias(HOY_ISO, 21);
  let hasta = sumarDias(HOY_ISO, 42);
  if (mesIdx >= 0) {
    const anio = mesIdx >= hoy.getMonth() ? hoy.getFullYear() : hoy.getFullYear() + 1;
    desde = `${anio}-${String(mesIdx + 1).padStart(2, '0')}-15`;
    hasta = `${anio}-${String(mesIdx + 1).padStart(2, '0')}-28`;
  }

  let min = 0; let max = 0;
  const rango = t.match(/entre\s+\$?\s*([\d.,]+)\s*(mil|k)?\s*y\s*\$?\s*([\d.,]+)\s*(mil|k|millones?)?/);
  const escala = (v: string, u?: string) => Number(v.replace(/[.,]/g, '')) * (u?.startsWith('mil') || u === 'k' ? 1000 : u?.startsWith('millon') ? 1_000_000 : 1);
  if (rango) {
    const u = rango[4] ?? rango[2];
    min = escala(rango[1], u); max = escala(rango[3], u);
    if (max < 10_000 && min < 10_000) { min *= 1000; max *= 1000; }
  } else {
    const uno = t.match(/presupuesto\s+(?:de\s+)?\$?\s*([\d.,]+)\s*(mil|k)?/);
    if (uno) { max = escala(uno[1], uno[2]); if (max < 10_000) max *= 1000; min = Math.round(max * 0.8); }
  }
  if (!max) { max = cantidad * 60_000; min = Math.round(max * 0.75); }

  const restricciones = texto.split(/[.;\n]/).map((s) => s.trim()).filter((s) => /^(nada de|no |sin |evitar|prohibido)/i.test(s));
  if (!restricciones.some((r) => /publicidad/i.test(r))) restricciones.push('Etiqueta #publicidad visible');
  const pauta = /pauta|anuncio|ads/.test(t);
  const meses = Number(t.match(/(\d+)\s*mes/)?.[1] ?? (pauta ? 3 : 6));
  const kpis = [/vistas|views/.test(t) && 'Vistas', /alcance/.test(t) && 'Alcance', /clic/.test(t) && 'Clics con UTM', /venta|codigo/.test(t) && 'Ventas con código'].filter(Boolean) as string[];
  const objetivo = /nuevo modelo|lanzamiento|lanzar/.test(t)
    ? (/experiencia|consider/.test(t) || /modelo/.test(t) ? 'Consideración del nuevo modelo' : 'Lanzamiento')
    : /venta|codigo/.test(t) ? 'Conversión' : 'Awareness';
  const handle = `@${sinAcentos(marca).replace(/[^a-z0-9]/g, '')}`;

  return {
    objetivo,
    audiencia: { edad: edad ? `${edad[1]}–${edad[2]}` : '18–44', ciudades: ciudades.length ? ciudades : ['México'], nse },
    creadores: { cantidad, temas: temas.length ? temas : ['lifestyle'] },
    entregables,
    fechas: { desde, hasta },
    presupuesto: { min, max },
    usos: { tipos: pauta ? ['Orgánico', 'Pauta pagada'] : ['Orgánico'], meses, territorio: 'México' },
    kpis: kpis.length ? kpis : ['Vistas', 'Engagement'],
    restricciones,
    duracion: { min: 30, max: 45 },
    menciones: [handle],
  };
}

// ---------------------------------------------------------------------------
// Guía de precio: rango de mercado por formato, tamaño y categoría
// ---------------------------------------------------------------------------

const BASE_FORMATO: Record<FormatoMk, number> = { Reel: 40_000, Story: 5_500, Post: 22_000, TikTok: 34_000, Video: 55_000, Short: 18_000 };

/** Precio de referencia a 200 k seguidores, ajustado por tamaño y por los precios facturados registrados. */
export function guiaPrecio(formato: FormatoMk, seguidores: number, ajusteFacturado = 1) {
  const tam = Math.pow(Math.max(20_000, seguidores) / 200_000, 0.55);
  const centro = BASE_FORMATO[formato] * tam * ajusteFacturado;
  const r = (n: number) => Math.round(n / 1000) * 1000 || Math.round(n / 100) * 100;
  return { min: r(centro * 0.78), max: r(centro * 1.2), centro: r(centro) };
}

export const seguidoresDe = (c: Creador) => Math.max(0, ...c.redes.map((r) => r.seguidores));
export const asociada = (c: Creador) => c.redes.some((r) => r.asociada);

/** Tarifa estimada del creador para los entregables del brief (su mínima o la guía). */
export function tarifaEstimada(c: Creador, e: EntregableMk[]) {
  return suma(e.map((x) => {
    const min = c.condiciones.tarifas.find((t) => t.formato === x.formato)?.minimo;
    return (min ? Math.round(min * 1.1) : guiaPrecio(x.formato, seguidoresDe(c)).centro) * x.cantidad;
  }));
}

// ---------------------------------------------------------------------------
// Matching: score 0–100 con explicación
// ---------------------------------------------------------------------------

export function scoreMatch(c: Creador, b: BriefEstructurado, pesos = PESOS) {
  const temas = b.creadores.temas.map(sinAcentos);
  const propios = c.temas.map(sinAcentos);
  const comunes = temas.filter((t) => propios.some((p) => p.includes(t) || t.includes(p)));
  const contenido = Math.round(40 + 60 * (comunes.length / Math.max(1, temas.length)));
  const ciudadesBrief = b.audiencia.ciudades.map((x) => sinAcentos(x));
  const enCiudades = suma(c.audiencia.ciudades.filter((x) => ciudadesBrief.includes(sinAcentos(x.ciudad)) || ciudadesBrief.includes('mexico')).map((x) => x.pct));
  const audiencia = Math.round(Math.min(100, c.audiencia.mx * 0.35 + c.audiencia.edad25a44 * 0.4 + Math.min(100, enCiudades * 1.4) * 0.25));
  const porCreador = b.presupuesto.max / Math.max(1, b.creadores.cantidad);
  const tarifa = tarifaEstimada(c, b.entregables);
  const sobrePresupuesto = tarifa > porCreador;
  const precio = Math.round(sobrePresupuesto ? Math.max(20, 100 - ((tarifa - porCreador) / porCreador) * 120) : 100);
  const performance = Math.round(Math.max(30, Math.min(100, 100 - (c.cpmHistorico - 120) * 0.5)));
  const hechas = c.historial.length;
  const cumplimiento = hechas ? Math.round((c.historial.filter((h) => h.aTiempo).length / hechas) * 100) : 60;
  const disponibilidad = c.ocupadoHasta && c.ocupadoHasta >= b.fechas.desde ? 40 : 100;
  const conflicto = c.exclusividades.find((x) => x.hasta >= b.fechas.desde && temas.some((t) => sinAcentos(x.categoria).includes(t)));
  const componentes: ComponentesScore = { contenido, audiencia, precio, performance, cumplimiento, disponibilidad };
  let score = Math.round(suma((Object.keys(pesos) as (keyof ComponentesScore)[]).map((k) => componentes[k] * pesos[k])));
  if (conflicto) score = Math.min(score, 30);
  const fuertes = [
    contenido >= 85 && `contenido de ${comunes.join(' y ')}`, audiencia >= 80 && 'audiencia alineada', !sobrePresupuesto && 'dentro del presupuesto',
    hechas >= 3 && cumplimiento === 100 && `${hechas} entregas a tiempo`,
  ].filter(Boolean);
  const flojos = [
    contenido < 70 && 'menor afinidad con el brief', sobrePresupuesto && 'sobre presupuesto', !hechas && 'sin historial en Influ',
    disponibilidad < 100 && 'ocupado en las fechas', conflicto && `exclusividad con ${conflicto.marca} hasta ${conflicto.hasta}`,
  ].filter(Boolean);
  const explicacion = [fuertes.length ? `${String(fuertes.join(', '))[0].toUpperCase()}${fuertes.join(', ').slice(1)}` : '', flojos.length ? `${fuertes.length ? '; ' : ''}${flojos.join(', ')}` : ''].join('') + '.';
  return { score, componentes, explicacion, sobrePresupuesto, conflicto: conflicto ? `Exclusividad con ${conflicto.marca}` : undefined, tarifa };
}

// ---------------------------------------------------------------------------
// Condiciones aceptables del creador
// ---------------------------------------------------------------------------

export function fueraDeCondiciones(c: Condiciones, o: Pick<Oferta, 'lineas' | 'usos' | 'exclusividad' | 'rondas' | 'fechas'>) {
  const a: string[] = [];
  for (const l of o.lineas) {
    const min = c.tarifas.find((t) => t.formato === l.formato)?.minimo;
    const unitario = l.precio / Math.max(1, l.cantidad);
    if (min && unitario < min) a.push(`${l.formato} a ${unitario.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })} por pieza: su mínimo es ${min.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}`);
  }
  const usosNo = o.usos.tipos.filter((u) => !c.usos.includes(u));
  if (usosNo.length) a.push(`No acepta ${usosNo.join(' ni ').toLowerCase()}`);
  if (o.usos.meses > c.licenciaMaxMeses) a.push(`Licencia de ${o.usos.meses} meses: acepta hasta ${c.licenciaMaxMeses}`);
  if (o.exclusividad.dias > c.exclusividadMaxDias) a.push(`Exclusividad de ${o.exclusividad.dias} días: acepta hasta ${c.exclusividadMaxDias}`);
  if (o.rondas > c.rondasMax) a.push(`${o.rondas} rondas de cambios: acepta hasta ${c.rondasMax}`);
  const dias = Math.round((new Date(`${o.fechas.contenido}T12:00`).getTime() - new Date(`${HOY_ISO}T12:00`).getTime()) / 864e5);
  if (dias < c.plazoMinDias) a.push(`Entrega en ${dias} días: su plazo mínimo es ${c.plazoMinDias}`);
  return a;
}

/** El brief completo queda fuera si el presupuesto por creador no alcanza su paquete mínimo o pide usos que no acepta. */
export function briefFueraDeCondiciones(c: Condiciones, b: BriefEstructurado) {
  const minimo = suma(b.entregables.map((e) => (c.tarifas.find((t) => t.formato === e.formato)?.minimo ?? 0) * e.cantidad));
  const porCreador = b.presupuesto.max / Math.max(1, b.creadores.cantidad);
  const a: string[] = [];
  if (minimo > porCreador) a.push('presupuesto por creador menor a tus tarifas mínimas');
  if (b.usos.meses > c.licenciaMaxMeses) a.push(`licencia de ${b.usos.meses} meses`);
  const usosNo = b.usos.tipos.filter((u) => !c.usos.includes(u));
  if (usosNo.length) a.push(`uso ${usosNo.join(', ').toLowerCase()}`);
  return a;
}

// ---------------------------------------------------------------------------
// Protección del canal: hasta aceptar la oferta no se comparten datos de contacto
// ---------------------------------------------------------------------------

export function protegerCanal(texto: string, permitidos: string[] = []) {
  let ocultos = 0;
  const tapa = (m: string) => { if (permitidos.some((p) => sinAcentos(p) === sinAcentos(m))) return m; ocultos++; return '[dato de contacto oculto]'; };
  const limpio = texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, tapa)
    .replace(/(?:\+?\d[\s-]?){8,}/g, tapa)
    .replace(/(?:https?:\/\/|www\.)\S+/g, tapa)
    .replace(/@[a-z0-9_.]{3,}/gi, tapa);
  return { texto: limpio, ocultos };
}

// ---------------------------------------------------------------------------
// Revisión del contenido contra el brief (antes de que la marca decida)
// ---------------------------------------------------------------------------

const COMPETIDORES: Record<string, string[]> = {
  autos: ['bmw', 'audi', 'mercedes', 'tesla', 'nissan', 'toyota', 'volkswagen', 'kia', 'mazda'],
  bebidas: ['coca', 'pepsi', 'ciel', 'epura'],
  belleza: ['mac', 'sephora', 'ulta'],
};
const PROHIBIDAS: [RegExp, string][] = [
  [/velocidad|a fondo|km\/h|acelerar|rebasar/, 'Frase de velocidad en carretera: revisar'],
  [/garantizado|cura|100% efectivo/, 'Promesa no comprobable: revisar'],
  [/alcohol|cerveza|tequila/, 'Mención de alcohol: revisar'],
];

export function revisarContenido(b: BriefEstructurado, e: { duracion: number; texto: string }, formato: FormatoMk = 'Reel'): import('./types').Chequeo[] {
  const t = sinAcentos(e.texto);
  const c: Chequeo[] = [];
  const faltan = b.menciones.filter((m) => !t.includes(sinAcentos(m)));
  c.push(faltan.length ? { ok: false, nivel: 'falla', texto: `Falta la mención ${faltan.join(', ')}` } : { ok: true, nivel: 'ok', texto: `Menciona a ${b.menciones.join(' y ')}` });
  c.push(/#publicidad|#ad\b|#anuncio/.test(t) ? { ok: true, nivel: 'ok', texto: 'Etiqueta #publicidad visible' } : { ok: false, nivel: 'falla', texto: 'Falta la etiqueta #publicidad' });
  if (formato === 'Reel' || formato === 'TikTok' || formato === 'Video') {
    const ok = e.duracion >= b.duracion.min && e.duracion <= b.duracion.max;
    c.push({ ok, nivel: ok ? 'ok' : 'falla', texto: ok ? `Duración dentro de lo pactado (${b.duracion.min}–${b.duracion.max} s)` : `Dura ${e.duracion} s: lo pactado es ${b.duracion.min}–${b.duracion.max} s` });
  }
  const comp = b.creadores.temas.flatMap((x) => COMPETIDORES[sinAcentos(x)] ?? []).filter((x) => new RegExp(`\\b${x}\\b`).test(t));
  c.push(comp.length ? { ok: false, nivel: 'falla', texto: `Menciona competidores: ${comp.join(', ')}` } : { ok: true, nivel: 'ok', texto: 'Sin marcas competidoras' });
  for (const [r, txt] of PROHIBIDAS) if (r.test(t)) c.push({ ok: false, nivel: 'aviso', texto: txt });
  for (const r of b.restricciones) {
    const palabra = sinAcentos(r).match(/nada de (?:mencionar )?(.+)/)?.[1]?.split(' ').slice(-1)[0];
    if (palabra && palabra.length > 3 && !['autos', 'marcas'].includes(palabra) && t.includes(palabra)) c.push({ ok: false, nivel: 'aviso', texto: `Choca con la restricción "${r}"` });
  }
  return c;
}

// ---------------------------------------------------------------------------
// KPIs: snapshots cada 24 h durante 30 días; fotos oficiales a 7 y 30 días
// ---------------------------------------------------------------------------

/** Serie determinista desde la publicación hasta hoy (máx. 30 días). Los snapshots nunca se reescriben. */
export function serieKpis(semilla: string, publicada: string, vistasFinal: number, er: number, hasta = HOY_ISO): SnapshotMk[] {
  const dias = Math.min(DIAS_KPIS, Math.max(0, Math.round((new Date(`${hasta}T12:00`).getTime() - new Date(`${publicada}T12:00`).getTime()) / 864e5)));
  const h = hash(semilla);
  const out: SnapshotMk[] = [];
  for (let d = 0; d <= dias; d++) {
    const curva = 1 - Math.exp(-(d + 1) / 2.6);
    const vistas = Math.round(vistasFinal * curva * (0.97 + ((h >> (d % 16)) % 7) / 100));
    const interacciones = Math.round(vistas * er / 100);
    out.push({
      dia: d, fecha: sumarDias(publicada, d), vistas, alcance: Math.round(vistas * 0.71), impresiones: Math.round(vistas * 1.18),
      interacciones, guardados: Math.round(interacciones * 0.09), compartidos: Math.round(interacciones * 0.06),
      clics: Math.round(vistas * 0.0042), ventas: Math.round(vistas * 0.00011),
    });
  }
  return out;
}

export const ultimo = (s: SnapshotMk[]) => s[s.length - 1];
export const foto = (s: SnapshotMk[], dia: number) => s.find((x) => x.dia === dia);

export function costos(monto: number, s?: SnapshotMk) {
  if (!s || !s.vistas) return { cpm: 0, porVista: 0, porInteraccion: 0, porClic: 0, er: 0 };
  return {
    cpm: Math.round((monto / s.vistas) * 1000),
    porVista: redondear(monto / s.vistas),
    porInteraccion: redondear(monto / Math.max(1, s.interacciones)),
    porClic: redondear(monto / Math.max(1, s.clics)),
    er: redondear((s.interacciones / s.vistas) * 100),
  };
}

// ---------------------------------------------------------------------------
// CFDI del creador o la agencia a Influ (validador de Fase 1)
// ---------------------------------------------------------------------------

const UUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
export function validarCfdiInflu(uuid: string, rfcEmisor: string, rfcEsperado: string, monto: number, esperado: number) {
  if (!UUID.test(uuid)) return 'El folio fiscal (UUID) no es válido ante el SAT.';
  if (rfcEsperado && rfcEmisor !== rfcEsperado) return `El RFC emisor ${rfcEmisor} no es del beneficiario (${rfcEsperado}).`;
  if (Math.abs(monto - esperado) > 1) return `El CFDI ampara ${monto.toLocaleString('es-MX')} y la tarifa pactada es ${esperado.toLocaleString('es-MX')}.`;
  return null;
}

export const nuevoUuid = (semilla = String(Math.random())) => {
  let x = hash(semilla);
  const hex = (n: number) => Array.from({ length: n }, () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return '0123456789ABCDEF'[x % 16]; }).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-A${hex(3)}-${hex(12)}`;
};

export const token = () => Math.random().toString(36).slice(2, 10);

/** Vistas estimadas para una propuesta: mediana ± 10%. */
export const estimado = (c: Creador) => ({ min: Math.round(c.vistasMedianas * 0.92 / 1000) * 1000, max: Math.round(c.vistasMedianas * 1.08 / 1000) * 1000 });

export const usosTexto = (u: { tipos: UsoMk[]; meses: number; territorio: string }) =>
  `${u.tipos.join(' + ')}${u.tipos.includes('Pauta pagada') ? ` ${u.meses} meses` : ''} · ${u.territorio}`;

export const briefActivo = (b: Brief) => b.estado === 'Publicado';
