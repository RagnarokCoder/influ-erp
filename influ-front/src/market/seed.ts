import { d, dh, sumarDias } from '../data/constantes';
import { generarBrief, nuevoUuid, serieKpis, fee, revisarContenido, scoreMatch } from './logic';
import type {
  Aviso, BitacoraMk, Brief, Caso, Contratacion, Conversacion, Creador, CuentaMarca, FacturaInflu, Postulacion, Propuesta, Ranking,
} from './types';

// Semilla del marketplace. Caso tipo (MVP Fase 2): Porsche publica el brief de
// su Campaña Q1, el matching lo distribuye a 20 creadores, Diego (@diego.drive,
// Stay On Social) negocia con legal y finanzas en copia, la agencia contraoferta
// (v2), Porsche acepta, aprueba el reel y el pago sale solo; la publicación se
// detecta y verifica. Valeria tiene su reel esperando la aprobación de la marca.

const condBase = (reel: number, story: number, tiktok: number, extra: Partial<Creador['condiciones']> = {}): Creador['condiciones'] => ({
  tarifas: [
    { formato: 'Reel', minimo: reel }, { formato: 'Story', minimo: story }, { formato: 'TikTok', minimo: tiktok },
    { formato: 'Paquete reel + 2 stories', minimo: Math.round((reel + story * 2) * 0.96 / 1000) * 1000 },
  ],
  usos: ['Orgánico', 'Pauta pagada'], licenciaMaxMeses: 6, exclusividadMaxDias: 30, plazoMinDias: 10, rondasMax: 2, ...extra,
});

const hist = (n: number, aTiempo = n, base = 380_000) =>
  Array.from({ length: n }, (_, i) => ({ campana: ['Marca de llantas', 'Marca de lubricantes', 'Marca de relojes', 'Marca de bebidas', 'Marca de moda', 'Marca de tecnología', 'Marca de viajes', 'Marca de belleza', 'Marca de comida', 'Marca de seguros', 'Marca de telefonía', 'Marca de café', 'Marca de lentes'][i % 13], vistas: base + ((i * 37_000) % 110_000), aTiempo: i < aTiempo }));

const red = (usuario: string, seguidores: number, asociada = true, tiktok?: number) => [
  { red: 'Instagram' as const, usuario, asociada, fecha: asociada ? dh(-60, '10:00') : undefined, seguidores },
  ...(tiktok ? [{ red: 'TikTok' as const, usuario, asociada: false, seguidores: tiktok }] : []),
];

const audiencia = (mx: number, e: number, ciudades: [string, number][], hombres = 50): Creador['audiencia'] => ({
  mx, edad25a44: e, edades: [10, Math.round(e * 0.5), Math.round(e * 0.5), 14, 6], ciudades: ciudades.map(([ciudad, pct]) => ({ ciudad, pct })), hombres, real: 94,
});

const creadoresBase: Creador[] = [
  { id: 'CR-01', handle: '@diego.drive', nombre: 'Diego Ramírez Salinas', talentoId: 'TAL-02', agenciaId: 'AG-01', temas: ['autos', 'lifestyle', 'lujo'], ciudad: 'CDMX',
    redes: [{ red: 'Instagram', usuario: '@diego.drive', asociada: true, fecha: dh(-70, '11:20'), seguidores: 180_000 }, { red: 'TikTok', usuario: '@diego.drive', asociada: false, seguidores: 96_000 }, { red: 'YouTube', usuario: '', asociada: false, seguidores: 0 }],
    audiencia: { mx: 81, edad25a44: 64, edades: [9, 26, 38, 19, 8], ciudades: [{ ciudad: 'CDMX', pct: 44 }, { ciudad: 'Monterrey', pct: 17 }, { ciudad: 'Guadalajara', pct: 12 }], hombres: 68, real: 97 },
    engagement: 6.1, vistasMedianas: 410_000, cpmHistorico: 148, historial: hist(7, 7, 390_000), exclusividades: [], condiciones: condBase(45_000, 6_000, 40_000) },
  { id: 'CR-02', handle: '@valeria.moda', nombre: 'Valeria Martínez Ruiz', talentoId: 'TAL-01', agenciaId: 'AG-01', temas: ['moda', 'lujo', 'belleza', 'lifestyle'], ciudad: 'CDMX',
    redes: red('@valeria.moda', 412_000, true, 188_000), audiencia: audiencia(88, 58, [['CDMX', 46], ['Guadalajara', 11], ['Monterrey', 9]], 22),
    engagement: 5.1, vistasMedianas: 460_000, cpmHistorico: 171, historial: hist(4, 4, 430_000), exclusividades: [], condiciones: condBase(64_000, 8_000, 52_000, { licenciaMaxMeses: 6 }) },
  { id: 'CR-03', handle: '@sofi.city', nombre: 'Sofía Lara', talentoId: 'TAL-13', temas: ['lifestyle', 'ciudad', 'gastronomía', 'autos'], ciudad: 'CDMX',
    redes: red('@sofi.city', 95_000), audiencia: audiencia(90, 71, [['CDMX', 63], ['Puebla', 6]], 41),
    engagement: 7.9, vistasMedianas: 180_000, cpmHistorico: 203, historial: [], exclusividades: [], condiciones: condBase(28_000, 4_000, 24_000) },
  { id: 'CR-04', handle: '@ramiro.mty', nombre: 'Ramiro Garza', temas: ['autos', 'tecnología'], ciudad: 'Monterrey',
    redes: red('@ramiro.mty', 140_000), audiencia: audiencia(86, 61, [['Monterrey', 52], ['CDMX', 14]], 72),
    engagement: 4.2, vistasMedianas: 210_000, cpmHistorico: 262, historial: hist(3, 2, 150_000), exclusividades: [], condiciones: condBase(42_000, 5_000, 36_000) },
  { id: 'CR-05', handle: '@nico.motor', nombre: 'Nicolás Ibarra', temas: ['autos', 'motor', 'deportes'], ciudad: 'Guadalajara',
    redes: red('@nico.motor', 260_000), audiencia: audiencia(80, 66, [['Guadalajara', 31], ['CDMX', 22], ['Monterrey', 10]], 79),
    engagement: 5.4, vistasMedianas: 520_000, cpmHistorico: 165, historial: hist(13, 12, 480_000), exclusividades: [], condiciones: condBase(85_000, 9_000, 70_000) },
  { id: 'CR-06', handle: '@carla.garage', nombre: 'Carla Méndez', temas: ['autos', 'lifestyle'], ciudad: 'Puebla',
    redes: red('@carla.garage', 120_000), audiencia: audiencia(84, 52, [['Puebla', 30], ['CDMX', 21]], 58),
    engagement: 6.6, vistasMedianas: 190_000, cpmHistorico: 190, historial: [], exclusividades: [], condiciones: condBase(36_000, 4_500, 30_000) },
  { id: 'CR-07', handle: '@pablo.drift', nombre: 'Pablo Treviño', temas: ['autos', 'deportes'], ciudad: 'Monterrey',
    redes: red('@pablo.drift', 90_000), audiencia: audiencia(78, 45, [['Monterrey', 48]], 83),
    engagement: 5.8, vistasMedianas: 150_000, cpmHistorico: 210, historial: hist(9, 7, 120_000), exclusividades: [], condiciones: condBase(30_000, 4_000, 26_000) },
  { id: 'CR-08', handle: '@lucia.style', nombre: 'Lucía Gómez Herrera', talentoId: 'TAL-11', agenciaId: 'AG-01', temas: ['moda', 'belleza', 'bebidas', 'lifestyle'], ciudad: 'Guadalajara',
    redes: red('@lucia.style', 150_000), audiencia: audiencia(91, 63, [['Guadalajara', 38], ['CDMX', 20]], 18),
    engagement: 6.9, vistasMedianas: 240_000, cpmHistorico: 158, historial: hist(5, 5, 220_000), exclusividades: [], condiciones: condBase(34_000, 5_000, 28_000) },
  { id: 'CR-09', handle: '@camilaortiz', nombre: 'Camila Ortiz Navarro', talentoId: 'TAL-03', agenciaId: 'AG-01', temas: ['lifestyle', 'moda', 'relojes', 'lujo'], ciudad: 'Guadalajara',
    redes: red('@camilaortiz', 230_000), audiencia: audiencia(87, 60, [['Guadalajara', 41], ['CDMX', 17]], 26),
    engagement: 4.9, vistasMedianas: 300_000, cpmHistorico: 176, historial: hist(6, 6, 280_000), exclusividades: [], condiciones: condBase(40_000, 5_500, 34_000) },
  { id: 'CR-10', handle: '@martin.fit', nombre: 'Martín Vega', talentoId: 'TAL-04', agenciaId: 'AG-01', temas: ['fitness', 'deportes'], ciudad: 'Monterrey',
    redes: red('@martin.fit', 210_000, false), audiencia: audiencia(85, 59, [['Monterrey', 50]], 61),
    engagement: 5.5, vistasMedianas: 260_000, cpmHistorico: 180, historial: [], exclusividades: [], condiciones: condBase(38_000, 5_000, 32_000) },
];

// Resto del universo del matching: creadores del marketplace sin registro de factoraje.
const extra: [string, string, string[], number, number, number][] = [
  ['@ale.ruta', 'Alejandra Ruiz', ['autos', 'viajes'], 132_000, 190, 3], ['@mau.motor', 'Mauricio Peña', ['autos', 'motor'], 205_000, 172, 5],
  ['@fer.drive', 'Fernanda Ochoa', ['autos', 'lifestyle'], 88_000, 214, 2], ['@lalo.cars', 'Eduardo Lozano', ['autos', 'lujo'], 310_000, 158, 8],
  ['@andy.lifestyle', 'Andrea Solís', ['lifestyle', 'moda'], 175_000, 181, 4], ['@gaby.cdmx', 'Gabriela Mora', ['lifestyle', 'gastronomía'], 99_000, 205, 1],
  ['@rob.trips', 'Roberto Salas', ['viajes', 'autos'], 156_000, 188, 6], ['@dani.garage', 'Daniel Cruz', ['autos', 'tecnología'], 72_000, 230, 0],
  ['@tono.road', 'Antonio Leal', ['autos', 'deportes'], 118_000, 196, 4], ['@isa.urbana', 'Isabel Treviño', ['lifestyle', 'moda'], 143_000, 179, 3],
  ['@pau.motors', 'Paulina Rangel', ['autos', 'lujo'], 196_000, 166, 5], ['@kike.mx', 'Enrique Aguilar', ['autos', 'humor'], 240_000, 199, 7],
];
const ciudadesExtra = ['CDMX', 'Monterrey', 'Guadalajara', 'Querétaro', 'Puebla'];
export const creadores: Creador[] = [
  ...creadoresBase,
  ...extra.map(([handle, nombre, temas, seg, cpm, h], i): Creador => ({
    id: `CR-${String(11 + i).padStart(2, '0')}`, handle, nombre, temas, ciudad: ciudadesExtra[i % 5],
    redes: red(handle, seg), audiencia: audiencia(76 + (i * 3) % 15, 48 + (i * 7) % 22, [[ciudadesExtra[i % 5], 34 + i % 12], ['CDMX', 12]], 50 + (i * 5) % 30),
    engagement: 4 + (i % 5) * 0.6, vistasMedianas: Math.round(seg * 1.6), cpmHistorico: cpm, historial: hist(h, Math.max(0, h - (i % 3 === 0 ? 1 : 0)), Math.round(seg * 1.5)),
    exclusividades: handle === '@lalo.cars' ? [{ categoria: 'autos', hasta: d(60), marca: 'BMW' }] : [],
    ocupadoHasta: handle === '@kike.mx' ? d(30) : undefined,
    condiciones: condBase(Math.round(seg * 0.27 / 1000) * 1000, Math.round(seg * 0.035 / 500) * 500, Math.round(seg * 0.23 / 1000) * 1000),
  })),
];

// ---------------------------------------------------------------------------
// Cuentas de marca (alta por invitación)
// ---------------------------------------------------------------------------

export const cuentas: CuentaMarca[] = [
  { empresaId: 'EMP-01', marcas: ['Porsche'], estado: 'Activa', invitada: { por: 'Lucas Tamez Ochoa', fechaHora: dh(-120, '10:00'), token: 'porsche-alta' },
    pasos: { empresa: true, equipo: true, pagos: true }, condicion: { tipo: 'Plazo', dias: 60, limite: 500_000 },
    contactoPagos: { nombre: 'Mariana Pérez', email: 'pagos@porsche-mx.com' },
    equipo: [
      { nombre: 'Andrea Ríos', email: 'andrea.rios@porsche-mx.com', area: 'Marketing', permisos: ['Admin', 'Aprueba contenido'] },
      { nombre: 'Tomás Gómez', email: 'tomas.gomez@porsche-mx.com', area: 'Legal', permisos: ['Comenta'] },
      { nombre: 'Finanzas Porsche', email: 'finanzas@porsche-mx.com', area: 'Finanzas', permisos: ['Aprueba ofertas'] },
    ] },
  { empresaId: 'EMP-07', marcas: ['El Palacio de Hierro', 'Relojería Palacio'], estado: 'Activa', invitada: { por: 'Sofía Cantú Garza', fechaHora: dh(-80, '12:00'), token: 'palacio-alta' },
    pasos: { empresa: true, equipo: true, pagos: true }, condicion: { tipo: 'Prepago', dias: 0, limite: 0 },
    contactoPagos: { nombre: 'Cuentas por pagar', email: 'cxp@ph.com.mx' },
    equipo: [{ nombre: 'Mónica Esquivel', email: 'digital@ph.com.mx', area: 'Digital', permisos: ['Admin', 'Aprueba contenido', 'Aprueba ofertas'] }] },
  { empresaId: 'EMP-02', marcas: ['Nissan'], estado: 'Activa', invitada: { por: 'Lucas Tamez Ochoa', fechaHora: dh(-60, '09:30'), token: 'nissan-alta' },
    pasos: { empresa: true, equipo: true, pagos: true }, condicion: { tipo: 'Plazo', dias: 45, limite: 300_000 },
    contactoPagos: { nombre: 'Tesorería Nissan', email: 'tesoreria@nissan.com.mx' },
    equipo: [{ nombre: 'Gerardo Pliego', email: 'social@nissan.com.mx', area: 'Social media', permisos: ['Admin', 'Aprueba contenido', 'Aprueba ofertas'] }] },
  { empresaId: 'EMP-09', marcas: ['Bonafont'], estado: 'Activa', invitada: { por: 'Sofía Cantú Garza', fechaHora: dh(-40, '16:00'), token: 'bonafont-alta' },
    pasos: { empresa: true, equipo: true, pagos: true }, condicion: { tipo: 'Prepago', dias: 0, limite: 0 },
    contactoPagos: { nombre: 'Pagos Bonafont', email: 'pagos@bonafont.com.mx' },
    equipo: [{ nombre: 'Carlos Mena', email: 'brand@bonafont.com.mx', area: 'Brand', permisos: ['Admin', 'Aprueba contenido', 'Aprueba ofertas'] }] },
  { empresaId: 'EMP-08', marcas: ['Sephora'], estado: 'Activa', invitada: { por: 'Lucas Tamez Ochoa', fechaHora: dh(-20, '11:00'), token: 'sephora-alta' },
    pasos: { empresa: true, equipo: true, pagos: true }, condicion: { tipo: 'Prepago', dias: 0, limite: 0 },
    contactoPagos: { nombre: 'Finanzas Sephora', email: 'finanzas@sephora.com.mx' },
    equipo: [{ nombre: 'Julieta Ramos', email: 'pr@sephora.com.mx', area: 'PR', permisos: ['Admin', 'Aprueba contenido', 'Aprueba ofertas'] }] },
  { empresaId: 'EMP-11', marcas: [], estado: 'Invitada', invitada: { por: 'Lucas Tamez Ochoa', fechaHora: dh(-1, '13:10'), token: 'liverpool-alta' },
    pasos: { empresa: false, equipo: false, pagos: false }, condicion: { tipo: 'Prepago', dias: 0, limite: 0 }, contactoPagos: { nombre: '', email: '' }, equipo: [] },
];

// ---------------------------------------------------------------------------
// Briefs
// ---------------------------------------------------------------------------

const textoPorsche = 'Queremos 6 creadores de autos y lifestyle en CDMX y Monterrey para mostrar la experiencia de manejo del nuevo modelo. Público 25–44, ingresos altos. Un reel y dos stories cada uno, en noviembre. Presupuesto entre 300 y 400 mil. Pauta por 3 meses. Nada de mencionar otras marcas de autos.';
const porsche = generarBrief(textoPorsche, 'Porsche');
porsche.fechas = { desde: d(-12), hasta: d(16) };
porsche.menciones = ['@porsche', 'Taycan'];

const brief = (id: string, empresaId: string, marca: string, titulo: string, texto: string, creado: number, estado: Brief['estado'], ajuste?: (b: Brief['estructurado']) => void, modo = { invitacion: true, abierto: true }): Brief => {
  const e = generarBrief(texto, marca);
  ajuste?.(e);
  return { id, empresaId, marca, titulo, textoOriginal: texto, estructurado: e, ediciones: [], modo, estado, creado: dh(creado, '10:00'), creadoPor: 'Equipo de la marca',
    publicado: estado !== 'Borrador' && estado !== 'Revisión del matching' ? dh(creado, '12:00') : undefined, distribuido: estado === 'Publicado' || estado === 'Cerrado' ? dh(creado, '15:00') : undefined };
};

export const briefs: Brief[] = [
  { id: 'BR-01', empresaId: 'EMP-01', marca: 'Porsche', titulo: 'Campaña Q1', textoOriginal: textoPorsche, estructurado: porsche, modo: { invitacion: true, abierto: true },
    ediciones: [{ campo: 'Menciones', antes: '@porsche', despues: '@porsche · Taycan', usuario: 'Andrea Ríos', fechaHora: dh(-25, '10:20') }],
    estado: 'Publicado', creado: dh(-25, '10:05'), creadoPor: 'Andrea Ríos', publicado: dh(-25, '10:40'), distribuido: dh(-24, '09:15') },
  brief('BR-02', 'EMP-07', 'El Palacio de Hierro', 'Relojes · Lanzamiento', 'Buscamos 4 creadores de lujo, moda y relojes en CDMX y Guadalajara. Público 25–44 con ingresos altos. Un reel cada uno en diciembre. Presupuesto entre 140 y 200 mil. Nada de mencionar otras tiendas departamentales.', -6, 'Publicado'),
  brief('BR-03', 'EMP-02', 'Nissan', 'Road trip · llantas', 'Queremos 3 creadores de autos y viajes para un road trip por carretera. Público 25–44. Dos reels cada uno en diciembre. Presupuesto entre 180 y 270 mil. Pauta 3 meses.', -4, 'Publicado'),
  brief('BR-04', 'EMP-09', 'Bonafont', 'Verano', 'Necesitamos 8 creadores de lifestyle, bienestar y bebidas. Público 18–34 en todo México. Tres stories cada uno en enero. Presupuesto entre 120 y 200 mil. Pauta 12 meses.', -3, 'Publicado'),
  brief('BR-05', 'EMP-02', 'Nissan', 'Kicks · lanzamiento', 'Queremos 5 creadores de autos y tecnología en Monterrey y CDMX para el lanzamiento del nuevo Kicks. Público 25–44. Un reel y un tiktok cada uno en diciembre. Presupuesto entre 250 y 320 mil. Nada de mencionar otras marcas de autos.', -1, 'Revisión del matching'),
  { ...brief('BR-06', 'EMP-01', 'Porsche', 'Piloto', 'Piloto con 4 creadores de autos y lifestyle en CDMX. Un reel y dos stories cada uno. Presupuesto entre 200 y 260 mil.', -120, 'Cerrado'), creadoPor: 'Andrea Ríos', seleccionCerrada: dh(-119, '18:00') },
];

// ---------------------------------------------------------------------------
// Rankings: el registro de lo que se mostró (base para entrenar el matching)
// ---------------------------------------------------------------------------

function rankear(id: string, b: Brief, fechaHora: string, top: number, revision?: Ranking['revision'], distribuido?: string): Ranking {
  const items = creadores
    .filter((c) => c.redes.some((r) => r.asociada))
    .map((c) => ({ c, s: scoreMatch(c, b.estructurado) }))
    .sort((a, z) => z.s.score - a.s.score)
    .slice(0, 20)
    .map(({ c, s }, i) => ({ creadorId: c.id, posicion: i + 1, score: s.score, componentes: s.componentes, explicacion: s.explicacion, conflicto: s.conflicto, sobrePresupuesto: s.sobrePresupuesto, incluido: !s.conflicto && i < top, sugeridoIA: !s.conflicto && i < top }));
  return { id, briefId: b.id, fechaHora, items, modo: 'Completa', revision, distribuido };
}

export const rankings: Ranking[] = [
  rankear('RK-01', briefs[0], dh(-25, '10:41'), 20, { usuario: 'Lucas Tamez Ochoa', fechaHora: dh(-24, '09:10'), cambios: 0 }, dh(-24, '09:15')),
  rankear('RK-02', briefs[1], dh(-6, '12:01'), 10, { usuario: 'Sofía Cantú Garza', fechaHora: dh(-6, '14:30'), cambios: 1 }, dh(-6, '15:00')),
  rankear('RK-03', briefs[2], dh(-4, '12:01'), 10, { usuario: 'Lucas Tamez Ochoa', fechaHora: dh(-4, '14:00'), cambios: 0 }, dh(-4, '15:00')),
  rankear('RK-04', briefs[3], dh(-3, '12:01'), 12, { usuario: 'Rodrigo Elizondo Villarreal', fechaHora: dh(-3, '13:40'), cambios: 2 }, dh(-3, '15:00')),
  rankear('RK-05', briefs[4], dh(-1, '10:05'), 18),
];

/** Últimas 30 distribuciones: true = la selección de la IA se aceptó sin cambios. */
export const historialDistribuciones: boolean[] = Array.from({ length: 30 }, (_, i) => [1, 0, 1, 1, 0, 1, 1, 0, 1, 1][i % 10] === 1 && i !== 26);

// ---------------------------------------------------------------------------
// Postulaciones e invitaciones del brief de Porsche
// ---------------------------------------------------------------------------

const lineasPaquete = (reel: number, story: number) => [
  { formato: 'Reel' as const, red: 'Instagram' as const, cantidad: 1, precio: reel },
  { formato: 'Story' as const, red: 'Instagram' as const, cantidad: 2, precio: story },
];
const fechasQ1 = { contenido: d(-11), publicacion: d(-7) };

export const postulaciones: Postulacion[] = (() => {
  const out: Postulacion[] = [];
  const abiertosIds = new Set(['CR-03', 'CR-04', 'CR-06', 'CR-07', 'CR-18', 'CR-19']);
  const invitados = [...new Set(['CR-01', 'CR-02', ...rankings[0].items.filter((i) => i.incluido && !abiertosIds.has(i.creadorId)).map((i) => i.creadorId)])].slice(0, 20);
  const responden = new Set(['CR-01', 'CR-02', 'CR-05', 'CR-13', 'CR-14', 'CR-15', 'CR-17', 'CR-20']);
  invitados.forEach((id, i) => {
    const c = creadores.find((x) => x.id === id)!;
    const reel = c.condiciones.tarifas[0].minimo; const st = c.condiciones.tarifas[1].minimo * 2;
    const respondio = responden.has(id);
    out.push({
      id: `PO-${String(i + 1).padStart(3, '0')}`, briefId: 'BR-01', creadorId: id, origen: 'Invitado',
      estado: id === 'CR-01' || id === 'CR-02' ? 'Contratado' : id === 'CR-05' ? 'Sin respuesta' : respondio ? (['CR-13', 'CR-15', 'CR-20'].includes(id) ? 'Preseleccionado' : 'Nueva') : 'Sin respuesta',
      lineas: respondio && id !== 'CR-05' ? (id === 'CR-01' ? lineasPaquete(50_000, 12_000) : id === 'CR-02' ? lineasPaquete(64_000, 16_000) : lineasPaquete(reel, st)) : [],
      fechas: fechasQ1, usos: ['Orgánico', 'Pauta pagada'], mensaje: id === 'CR-01' ? 'Tengo ruta pensada a Valle de Bravo…' : '',
      fecha: dh(-23 + (i % 3), '11:00'), agencia: c.agenciaId ? { confirmo: 'Ana López', fechaHora: dh(-22, '10:00') } : undefined,
    });
  });
  const abiertos: [string, number, number][] = [['CR-03', 30_000, 8_000], ['CR-04', 44_000, 10_000], ['CR-06', 36_000, 9_000], ['CR-07', 30_000, 8_000], ['CR-18', 30_000, 8_000], ['CR-19', 40_000, 9_000]];
  abiertos.forEach(([id, reel, st], i) => out.push({
    id: `PO-${String(40 + i)}`, briefId: 'BR-01', creadorId: id, origen: 'Postulación', estado: 'Nueva', lineas: lineasPaquete(reel, st),
    fechas: { contenido: d(2), publicacion: d(8) }, usos: ['Orgánico', 'Pauta pagada'], mensaje: id === 'CR-03' ? 'Mi audiencia es 63% CDMX; propongo rodar en Polanco y Reforma.' : 'Me encantaría sumarme a la campaña.', fecha: dh(-20 + i, '18:00'),
  }));
  // Otros briefs: lo que la agencia confirma antes de que llegue a la marca.
  out.push({ id: 'PO-60', briefId: 'BR-02', creadorId: 'CR-09', origen: 'Postulación', estado: 'Por confirmar agencia', lineas: [{ formato: 'Reel', red: 'Instagram', cantidad: 1, precio: 42_000 }], fechas: { contenido: d(30), publicacion: d(40) }, usos: ['Orgánico'], mensaje: 'Tengo una sesión de relojes ya planeada en Guadalajara.', fecha: dh(-2, '19:20') });
  out.push({ id: 'PO-61', briefId: 'BR-04', creadorId: 'CR-08', origen: 'Invitado', estado: 'Por confirmar agencia', lineas: [{ formato: 'Story', red: 'Instagram', cantidad: 3, precio: 18_000 }], fechas: { contenido: d(70), publicacion: d(75) }, usos: ['Orgánico', 'Pauta pagada'], mensaje: '', fecha: dh(-1, '12:40') });
  out.push({ id: 'PO-62', briefId: 'BR-03', creadorId: 'CR-02', origen: 'Invitado', estado: 'Invitado', lineas: [], fechas: { contenido: d(35), publicacion: d(42) }, usos: [], mensaje: '', fecha: dh(-4, '15:00') });
  out.push({ id: 'PO-63', briefId: 'BR-02', creadorId: 'CR-02', origen: 'Invitado', estado: 'Invitado', lineas: [], fechas: { contenido: d(30), publicacion: d(40) }, usos: [], mensaje: '', fecha: dh(-6, '15:00') });
  // Piloto de Porsche: contratados.
  ['CR-01', 'CR-02', 'CR-03', 'CR-04'].forEach((id, i) => out.push({ id: `PO-8${i}`, briefId: 'BR-06', creadorId: id, origen: 'Invitado', estado: 'Contratado', lineas: lineasPaquete([48_000, 62_000, 30_000, 40_000][i], [10_000, 14_000, 8_000, 9_000][i]), fechas: { contenido: d(-110), publicacion: d(-105) }, usos: ['Orgánico'], mensaje: '', fecha: dh(-118, '10:00') }));
  return out;
})();

// ---------------------------------------------------------------------------
// Conversaciones: hilo por creador, con participantes en copia y oferta versionada
// ---------------------------------------------------------------------------

const porscheMarca = (enCopia: boolean, nombre: string, email: string, permisos: ('Admin' | 'Aprueba contenido' | 'Aprueba ofertas' | 'Comenta')[], t: string) =>
  ({ nombre, email, lado: 'Marca' as const, permisos, enCopia, token: t, agregado: { por: 'Andrea Ríos', fechaHora: dh(-22, '10:30') } });

export const conversaciones: Conversacion[] = [
  {
    id: 'CV-01', briefId: 'BR-01', creadorId: 'CR-01',
    participantes: [
      porscheMarca(false, 'Andrea Ríos', 'andrea.rios@porsche-mx.com', ['Admin', 'Aprueba contenido'], 'hilo-andrea'),
      porscheMarca(true, 'Tomás Gómez · legal', 'tomas.gomez@porsche-mx.com', ['Comenta'], 'tomas-legal-01'),
      porscheMarca(true, 'Finanzas Porsche', 'finanzas@porsche-mx.com', ['Aprueba ofertas'], 'finanzas-01'),
      { nombre: 'Diego Ramírez', email: 'diego@diego.drive', lado: 'Creador', permisos: [], enCopia: false, token: 'hilo-diego', agregado: { por: 'Sistema', fechaHora: dh(-22, '10:00') } },
      { nombre: 'Stay On Social', email: 'ana@stayonsocial.mx', lado: 'Agencia', permisos: [], enCopia: false, token: 'hilo-sos', agregado: { por: 'Sistema', fechaHora: dh(-22, '10:00') } },
    ],
    mensajes: [
      { id: 'M1', autor: 'Diego R.', lado: 'Creador', texto: '¡Hola! Me encanta el brief. Propongo el reel manejando en la carretera a Valle de Bravo.', ocultos: 0, fechaHora: dh(-22, '10:05') },
      { id: 'M2', autor: 'Andrea R.', lado: 'Marca', texto: 'Perfecto. ¿Podemos sumar pauta por 3 meses?', ocultos: 0, fechaHora: dh(-22, '11:40') },
      { id: 'M3', autor: 'Sistema', lado: 'Sistema', texto: 'Stay On Social envió una contraoferta · v2', ocultos: 0, fechaHora: dh(-21, '09:15') },
      { id: 'M4', autor: 'Tomás G. · legal', lado: 'Marca', texto: 'Ok con 3 meses de pauta, solo México.', ocultos: 0, fechaHora: dh(-21, '12:00') },
      { id: 'M5', autor: 'Sistema', lado: 'Sistema', texto: 'Finanzas Porsche aceptó la oferta v2. Acuerdo de colaboración enviado a firma.', ocultos: 0, fechaHora: dh(-20, '10:30') },
    ],
    ofertas: [
      { version: 1, autor: 'Andrea Ríos', lado: 'Marca', lineas: lineasPaquete(45_000, 10_000), fechas: fechasQ1, rondas: 2, usos: { tipos: ['Orgánico'], meses: 6, territorio: 'México' },
        exclusividad: { dias: 30, categoria: 'marcas de autos' }, kpis: 'Sin KPIs comprometidos', consecuencia: 'Si no publica en la fecha pactada: republicación en 48 h o devolución del pago',
        estado: 'Contraoferta', fechaHora: dh(-22, '11:45'), vence: d(-15), alertas: [] },
      { version: 2, autor: 'Ana López', lado: 'Agencia', lineas: lineasPaquete(50_000, 12_000), fechas: fechasQ1, rondas: 2, usos: { tipos: ['Orgánico', 'Pauta pagada'], meses: 3, territorio: 'México' },
        exclusividad: { dias: 30, categoria: 'marcas de autos' }, kpis: 'Sin KPIs comprometidos', consecuencia: 'Si no publica en la fecha pactada: republicación en 48 h o devolución del pago',
        estado: 'Aceptada', fechaHora: dh(-21, '09:15'), vence: d(-14), alertas: [] },
    ],
    registro: [
      { quien: 'Andrea Ríos', que: 'sumó en copia a Tomás Gómez · legal', fechaHora: dh(-22, '10:30') },
      { quien: 'Andrea Ríos', que: 'sumó en copia a finanzas@porsche-mx.com', fechaHora: dh(-22, '10:31') },
      { quien: 'Tomás Gómez · legal', que: 'comentó', fechaHora: dh(-21, '12:00') },
      { quien: 'Finanzas Porsche', que: 'aceptó la oferta v2', fechaHora: dh(-20, '10:30') },
      { quien: 'Andrea Ríos', que: 'aprobó el contenido (ronda 1)', fechaHora: dh(-9, '16:05') },
    ],
  },
  {
    id: 'CV-02', briefId: 'BR-01', creadorId: 'CR-02',
    participantes: [
      porscheMarca(false, 'Andrea Ríos', 'andrea.rios@porsche-mx.com', ['Admin', 'Aprueba contenido'], 'hilo-andrea-2'),
      porscheMarca(true, 'Finanzas Porsche', 'finanzas@porsche-mx.com', ['Aprueba ofertas'], 'finanzas-02'),
      { nombre: 'Valeria Martínez', email: 'valeria@valeria.moda', lado: 'Creador', permisos: [], enCopia: false, token: 'hilo-valeria', agregado: { por: 'Sistema', fechaHora: dh(-22, '10:00') } },
      { nombre: 'Stay On Social', email: 'ana@stayonsocial.mx', lado: 'Agencia', permisos: [], enCopia: false, token: 'hilo-sos-2', agregado: { por: 'Sistema', fechaHora: dh(-22, '10:00') } },
    ],
    mensajes: [
      { id: 'M1', autor: 'Andrea R.', lado: 'Marca', texto: 'Valeria, nos encantaría un look de noche saliendo del Taycan en Polanco.', ocultos: 0, fechaHora: dh(-21, '17:10') },
      { id: 'M2', autor: 'Valeria M.', lado: 'Creador', texto: 'Me encanta. Te paso mi [dato de contacto oculto] para coordinar.', ocultos: 1, fechaHora: dh(-21, '17:40') },
      { id: 'M3', autor: 'Sistema', lado: 'Sistema', texto: 'Finanzas Porsche aceptó la oferta v1. Acuerdo de colaboración enviado a firma.', ocultos: 0, fechaHora: dh(-19, '13:00') },
      { id: 'M4', autor: 'Valeria M.', lado: 'Creador', texto: 'Ya subí el reel para su revisión.', ocultos: 0, fechaHora: dh(-1, '18:30') },
    ],
    ofertas: [
      { version: 1, autor: 'Andrea Ríos', lado: 'Marca', lineas: lineasPaquete(64_000, 16_000), fechas: { contenido: d(-1), publicacion: d(3) }, rondas: 2, usos: { tipos: ['Orgánico', 'Pauta pagada'], meses: 3, territorio: 'México' },
        exclusividad: { dias: 30, categoria: 'marcas de autos' }, kpis: 'Sin KPIs comprometidos', consecuencia: 'Si no publica en la fecha pactada: republicación en 48 h o devolución del pago',
        estado: 'Aceptada', fechaHora: dh(-20, '11:00'), vence: d(-13), alertas: [] },
    ],
    registro: [
      { quien: 'Andrea Ríos', que: 'sumó en copia a finanzas@porsche-mx.com', fechaHora: dh(-21, '17:00') },
      { quien: 'Protección del canal', que: 'ocultó 1 dato de contacto de Valeria M.', fechaHora: dh(-21, '17:40') },
      { quien: 'Finanzas Porsche', que: 'aceptó la oferta v1', fechaHora: dh(-19, '13:00') },
    ],
  },
];

// ---------------------------------------------------------------------------
// Contrataciones
// ---------------------------------------------------------------------------

const textoDiego = 'Manejando el nuevo @porsche Taycan rumbo a Valle de Bravo: sentir la velocidad en carretera no tiene comparación. #publicidad';
const textoValeria = 'Noche en Polanco con el @porsche Taycan. Elegancia eléctrica. #publicidad';

export const contrataciones: Contratacion[] = [
  {
    id: 'CT-01', convId: 'CV-01', briefId: 'BR-01', creadorId: 'CR-01', empresaId: 'EMP-01', oferta: 2,
    beneficiario: { tipo: 'Agencia', nombre: 'Stay On Social', clabe: '012180015839204718' }, tarifa: 62_000, fee: fee(62_000), aceptada: dh(-20, '10:30'),
    acuerdo: { marca: dh(-20, '12:00'), creador: dh(-20, '15:40') },
    cfdi: { archivo: 'SOS_A2219.xml', uuid: nuevoUuid('cfdi-ct01'), rfcEmisor: 'SOS180523JK2', monto: 62_000, validado: true, fechaHora: dh(-19, '10:00') },
    entregas: [{ id: 'EN-01', ronda: 1, archivo: 'reel_porsche_v1.mp4', duracion: 32, texto: textoDiego, chequeos: revisarContenido(porsche, { duracion: 32, texto: textoDiego }), fechaHora: dh(-11, '19:00'), estado: 'Aprobada', decision: { usuario: 'Andrea Ríos', fechaHora: dh(-9, '16:05'), nota: 'Aprobado; la frase de velocidad se mantiene en contexto de experiencia.' } }],
    aprobada: { usuario: 'Andrea Ríos', fechaHora: dh(-9, '16:05') },
    dispersion: { estado: 'Pagada', fechaHora: dh(-9, '16:07'), referencia: 'MKT2026CT01A', via: 'SPEI vía API (STP)' },
    publicacion: { estado: 'Verificada', fechaHora: dh(-7, '19:12'), checks: [{ ok: true, nivel: 'ok', texto: 'Publicada en @diego.drive (cuenta asociada) dentro de la fecha pactada' }, { ok: true, nivel: 'ok', texto: 'Coincide con el contenido aprobado (imagen, video y texto)' }, { ok: true, nivel: 'ok', texto: 'Menciones, #publicidad y link con UTM presentes' }] },
    snapshots: serieKpis('CT-01', d(-7), 430_000, 6.4), utm: 'utm_source=influ&utm_campaign=porsche-q1&utm_content=diego', codigo: 'DIEGO911',
    calificaciones: {}, estado: 'Publicada',
  },
  {
    id: 'CT-02', convId: 'CV-02', briefId: 'BR-01', creadorId: 'CR-02', empresaId: 'EMP-01', oferta: 1,
    beneficiario: { tipo: 'Agencia', nombre: 'Stay On Social', clabe: '012180015839204718' }, tarifa: 80_000, fee: fee(80_000), aceptada: dh(-19, '13:00'),
    acuerdo: { marca: dh(-19, '15:00'), creador: dh(-18, '10:20') },
    cfdi: { archivo: 'SOS_A2231.xml', uuid: nuevoUuid('cfdi-ct02'), rfcEmisor: 'SOS180523JK2', monto: 80_000, validado: true, fechaHora: dh(-18, '12:00') },
    entregas: [{ id: 'EN-02', ronda: 1, archivo: 'reel_taycan_polanco.mp4', duracion: 38, texto: textoValeria, chequeos: revisarContenido(porsche, { duracion: 38, texto: textoValeria }), fechaHora: dh(-1, '18:30'), estado: 'En revisión' }],
    snapshots: [], utm: 'utm_source=influ&utm_campaign=porsche-q1&utm_content=valeria', codigo: 'VALERIA911', calificaciones: {}, estado: 'Contenido en revisión',
  },
  // Piloto de Porsche: cerrado, con historial verificado.
  ...([['CT-11', 'CR-01', 58_000, 418_000, 6.4, 'Verificada'], ['CT-12', 'CR-02', 76_000, 467_000, 5.1, 'Verificada'], ['CT-13', 'CR-03', 38_000, 187_000, 7.9, 'Verificada'], ['CT-14', 'CR-04', 49_000, 138_000, 4.2, 'Con observaciones']] as const)
    .map(([id, cr, tarifa, vistas, er, estado]): Contratacion => ({
      id, convId: '', briefId: 'BR-06', creadorId: cr, empresaId: 'EMP-01', oferta: 1,
      beneficiario: cr === 'CR-01' || cr === 'CR-02' ? { tipo: 'Agencia', nombre: 'Stay On Social', clabe: '012180015839204718' } : { tipo: 'Creador', nombre: creadores.find((c) => c.id === cr)!.nombre, clabe: '072580011743629051' },
      tarifa, fee: fee(tarifa), aceptada: dh(-118, '12:00'), acuerdo: { marca: dh(-118, '13:00'), creador: dh(-118, '15:00') },
      cfdi: { archivo: `${id}.xml`, uuid: nuevoUuid(id), rfcEmisor: 'XAXX010101000', monto: tarifa, validado: true, fechaHora: dh(-117, '10:00') },
      entregas: [{ id: `EN-${id}`, ronda: 1, archivo: `${id}.mp4`, duracion: 34, texto: '@porsche Taycan #publicidad', chequeos: [], fechaHora: dh(-110, '10:00'), estado: 'Aprobada', decision: { usuario: 'Andrea Ríos', fechaHora: dh(-109, '12:00') } }],
      aprobada: { usuario: 'Andrea Ríos', fechaHora: dh(-109, '12:00') }, dispersion: { estado: 'Pagada', fechaHora: dh(-109, '12:03'), referencia: `MKT2026${id}`, via: 'SPEI vía API (STP)' },
      publicacion: { estado, fechaHora: dh(-105, '19:00'), checks: estado === 'Verificada' ? [{ ok: true, nivel: 'ok', texto: 'Publicada, coincide con lo aprobado y cumple requisitos' }] : [{ ok: false, nivel: 'aviso', texto: 'Falta el link con UTM en la descripción' }], revisadaPor: estado === 'Verificada' ? undefined : 'Rodrigo Elizondo Villarreal' },
      snapshots: serieKpis(id, d(-105), Math.round(vistas * 1.07), er).map((s) => s), utm: `utm_campaign=porsche-piloto&utm_content=${cr}`, codigo: `${cr}P`,
      calificaciones: { marca: { estrellas: estado === 'Verificada' ? 5 : 3, nota: estado === 'Verificada' ? 'Entregó a tiempo y con gran calidad.' : 'Faltó el link con UTM.' }, creador: { estrellas: 5, nota: 'Brief claro y pago inmediato.' } },
      estado: 'Cerrada',
    })),
];
// Fotos oficiales de la tabla del dashboard (día 7 del piloto).
for (const c of contrataciones.filter((x) => x.briefId === 'BR-06')) c.snapshots = c.snapshots.slice(0, 31);

export const facturas: FacturaInflu[] = [
  { id: 'FI-01', briefId: 'BR-01', empresaId: 'EMP-01', campana: 'Porsche · Campaña Q1', uuid: '7B1C4E2A-91D3-4F0B-A7C2-5D18E3F0E204', tarifas: 142_000, fee: fee(142_000), total: 142_000 + fee(142_000), emitida: d(-19), vence: sumarDias(d(-19), 60), creadores: 2 },
  { id: 'FI-06', briefId: 'BR-06', empresaId: 'EMP-01', campana: 'Porsche · Piloto', uuid: '2A9F7C10-4B2E-4D8A-9F31-0C6B5E7A11C8', tarifas: 221_000, fee: fee(221_000), total: 221_000 + fee(221_000), emitida: d(-118), vence: d(-58), pagada: d(-61), creadores: 4 },
];

export const propuestas: Propuesta[] = [
  { id: 'PR-01', empresaId: 'EMP-08', token: 'sephora-navidad', titulo: 'Sephora · Navidad', estado: 'Enviada', creada: dh(-3, '10:00'), creadaPor: 'Lucas Tamez Ochoa', enviada: dh(-2, '09:00'), copias: [],
    lineas: [['CR-02', 72_000], ['CR-08', 38_000], ['CR-09', 44_000]].map(([id, tarifa]) => { const c = creadores.find((x) => x.id === id)!; return { creadorId: String(id), vistasMin: Math.round(c.vistasMedianas * 0.92), vistasMax: Math.round(c.vistasMedianas * 1.08), cpm: c.cpmHistorico, tarifa: Number(tarifa), formato: '1 reel + 2 stories' }; }) },
  { id: 'PR-02', empresaId: 'EMP-01', token: 'porsche-cayenne', titulo: 'Porsche · Cayenne', estado: 'Borrador', creada: dh(0, '09:20'), creadaPor: 'Lucas Tamez Ochoa', copias: [],
    lineas: [['CR-01', 62_000], ['CR-02', 80_000], ['CR-03', 38_000]].map(([id, tarifa]) => { const c = creadores.find((x) => x.id === id)!; return { creadorId: String(id), vistasMin: Math.round(c.vistasMedianas * 0.92), vistasMax: Math.round(c.vistasMedianas * 1.08), cpm: c.cpmHistorico, tarifa: Number(tarifa), formato: '1 reel + 2 stories' }; }) },
];

export const casos: Caso[] = [
  { id: 'CS-01', tipo: 'Moderación', contratacionId: 'CT-14', titulo: 'Publicación con observaciones · @ramiro.mty', detalle: 'Piloto de Porsche: faltó el link con UTM. Revisión manual.', abierto: dh(-105, '20:00'), estado: 'Resuelto', resolucion: { nota: 'El creador agregó el link en 24 h; se registra en su historial.', usuario: 'Rodrigo Elizondo Villarreal', fechaHora: dh(-104, '12:00') } },
  { id: 'CS-02', tipo: 'Moderación', convId: 'CV-02', titulo: 'Intento de compartir datos de contacto', detalle: 'Valeria M. escribió un teléfono antes de aceptar la oferta; la protección del canal lo ocultó.', abierto: dh(-21, '17:40'), estado: 'Abierto' },
];

export const avisos: Aviso[] = [
  { id: 'AV-1', canal: 'Email', para: 'andrea.rios@porsche-mx.com', texto: 'Valeria Martínez entregó el reel de Porsche · Campaña Q1 (ronda 1).', fechaHora: dh(-1, '18:31') },
  { id: 'AV-2', canal: 'WhatsApp', para: 'Stay On Social', texto: 'Influ: Porsche aprobó el reel de Diego. Enviamos $62,000 por SPEI.', fechaHora: dh(-9, '16:07') },
  { id: 'AV-3', canal: 'Email', para: 'tomas.gomez@porsche-mx.com', texto: 'Copia: Stay On Social envió una contraoferta v2 para @diego.drive.', fechaHora: dh(-21, '09:16') },
];

export const bitacora: BitacoraMk[] = [
  { id: 'BM-6', fechaHora: dh(-1, '18:30'), usuario: 'Valeria Martínez Ruiz', modulo: 'Contenidos', accion: 'Entrega', detalle: 'Porsche · Campaña Q1: reel ronda 1 de 2 entregado.' },
  { id: 'BM-5', fechaHora: dh(-1, '10:05'), usuario: 'Sistema', modulo: 'Matching', accion: 'Ranking', detalle: 'Nissan · Kicks: top 20 generado; espera la revisión del equipo antes de distribuir.' },
  { id: 'BM-4', fechaHora: dh(-7, '19:12'), usuario: 'Sistema', modulo: 'Publicaciones', accion: 'Verificación', detalle: '@diego.drive publicó el reel aprobado: verificado. Arrancan los KPIs.' },
  { id: 'BM-3', fechaHora: dh(-9, '16:07'), usuario: 'Sistema', modulo: 'Pagos', accion: 'Dispersión automática', detalle: '$62,000 a Stay On Social por @diego.drive (SPEI vía API) al aprobar Porsche el contenido.' },
  { id: 'BM-2', fechaHora: dh(-20, '10:30'), usuario: 'Finanzas Porsche', modulo: 'Ofertas', accion: 'Aceptación', detalle: '@diego.drive · oferta v2 $62,000 + fee $7,440.' },
  { id: 'BM-1', fechaHora: dh(-24, '09:15'), usuario: 'Lucas Tamez Ochoa', modulo: 'Matching', accion: 'Distribución', detalle: 'Porsche · Campaña Q1 distribuido a 20 creadores, sin cambios al ranking de la IA.' },
];

export const seedMarket = {
  creadores, cuentas, briefs, rankings, historialDistribuciones, postulaciones, conversaciones, contrataciones, facturas, propuestas, casos, avisos, bitacora,
};
