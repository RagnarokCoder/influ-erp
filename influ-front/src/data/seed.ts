import type {
  AdelantoMensual, Agencia, AnalisisContrato, Bitacora, Correo, CuentaBancaria, CxC, CxP, Empresa, Entregable, Handle, Marca, Mensaje,
  Operacion, OrdenPago, Pieza, Rol, Talento, Usuario,
} from './types';
import {
  BANCOS, CONDICIONES_DESDE, COMISION_FIJA, MODALIDAD_RUG, PAC, PORCENTAJE_ADELANTO, RUG_EXTERNO, TASA_MENSUAL, VERSION_AVISO_PRIVACIDAD,
  VERSION_CONDICIONES, WHATSAPP_INFLU, d, dh, sumarDias, sumarHoras,
} from './constantes';
import { construirFicha, hash, nacimientoDeRfc, snapshotsHasta, textoEntregable } from '../lib/derive';

// Semilla de Influ con fecha fija 26 oct 2026. Caso tipo de la especificación
// del 22 oct: Valeria Martínez (Stay On Social) con Porsche por $80,000 a 60
// días, dos reels y tres stories (INF-0184). Todas las operaciones cuadran con
// su ficha de IA, su cesión, su RUG, sus piezas, sus órdenes de pago, su factura
// por cobrar (CxC), su remanente (CxP) y sus avisos.

// ---------------------------------------------------------------------------
// CLABE con dígito verificador válido (pesos 3-7-1)
// ---------------------------------------------------------------------------

export function digitoClabe(diecisiete: string) {
  const pesos = [3, 7, 1];
  const s = diecisiete.split('').reduce((t, c, i) => t + ((Number(c) * pesos[i % 3]) % 10), 0);
  return String((10 - (s % 10)) % 10);
}
const clabe = (banco: string, plaza: string, cuenta: string) => {
  const base = `${banco}${plaza}${cuenta}`;
  return base + digitoClabe(base);
};
/** CLABE que termina en `fin` (4 dígitos): la del caso tipo termina en 4821. */
function clabeTerminada(banco: string, plaza: string, fin: string) {
  for (let i = 0; i < 100000; i++) {
    const base = `${banco}${plaza}${String(i).padStart(8, '0')}${fin.slice(0, 3)}`;
    if (digitoClabe(base) === fin[3]) return base + fin[3];
  }
  return clabe(banco, plaza, `00000000${fin.slice(0, 3)}`);
}

const consentimientos = (fh: string) => [
  { tipo: 'Condiciones comerciales' as const, version: VERSION_CONDICIONES, fechaHora: fh },
  { tipo: 'Aviso de privacidad' as const, version: VERSION_AVISO_PRIVACIDAD, fechaHora: fh },
];

const USR = {
  mauricio: 'Mauricio Leal Treviño', sofia: 'Sofía Cantú Garza', rodrigo: 'Rodrigo Elizondo Villarreal', lucas: 'Lucas Tamez Ochoa',
  ana: 'Ana López Morales', luis: 'Luis Garza Cantú',
};

// ---------------------------------------------------------------------------
// Agencias: el piloto arranca con una sola agencia, Stay On Social
// ---------------------------------------------------------------------------

const agencias: Agencia[] = [
  {
    id: 'AG-01', nombre: 'Stay On Social', razonSocial: 'Stay On Social, S.A. de C.V.', rfc: 'SOS180523JK2',
    contacto: USR.ana, correo: 'ana@stayonsocial.mx', telefono: '55 4312 8870', ciudad: 'Ciudad de México',
    folioMercantil: 'N-2018045127', clabe: clabe('012', '180', '01583920471'), banco: BANCOS['012'],
    condiciones: { fija: COMISION_FIJA, mensual: TASA_MENSUAL, desde: CONDICIONES_DESDE }, avisoPago: 'Ambos',
    consentimientos: consentimientos(dh(-262, '10:20')), alta: dh(-262, '10:20'), cuenta: 'Preaprobada',
    resoluciones: [{ decision: 'Preaprobada', usuario: USR.sofia, fechaHora: dh(-261, '12:05'), nota: 'Folio mercantil y contacto verificados.' }], estatus: 'Activa',
  },
];

// ---------------------------------------------------------------------------
// Talentos con su perfil de creador
// ---------------------------------------------------------------------------

type TalSemilla = Omit<Talento, 'banco' | 'consentimientos' | 'fechaNacimiento' | 'lada' | 'resoluciones' | 'cuenta' | 'nacimientoPorRevisar'> & {
  cuenta?: Talento['cuenta']; resoluciones?: Talento['resoluciones'];
};

const h = (red: Handle['red'], usuario: string, seguidores: number): Handle => ({ red, usuario, encontrada: true, seguidores });
const cdmx = { pais: 'México', estado: 'Ciudad de México', ciudad: 'CDMX' };
const preaprobada = (fh: string, quien = USR.sofia) => [{ decision: 'Preaprobada' as const, usuario: quien, fechaHora: fh }];

// Piloto Stay On Social: 27 talentos del board real. 26 entran sin datos fiscales
// (nombre legal, RFC, CURP, CLABE los sube la agencia después); Paco de Miguel
// (TAL-02) va aprobado con datos de ejemplo para el caso tipo de Porsche.
// `nombreArtistico` es el nombre en redes; `audienciaTotal` lo reporta la agencia.

/** Talento del piloto sin datos fiscales: la agencia los completa en el alta (M4). */
const pendiente = (
  id: string, nombreArtistico: string, handles: Handle[], audienciaTotal: number,
  tipo: 'Persona física' | 'Grupo' = 'Persona física',
): TalSemilla => ({
  id, nombre: '', nombreArtistico, correo: '', telefono: '', rfc: '', curp: '',
  regimenFiscal: '626 · Régimen Simplificado de Confianza', genero: 'Prefiero no decir', foto: '',
  audienciaTotal, tipo, handles, nichos: [], tiposContenido: [], ubicacion: cdmx,
  agenciaId: 'AG-01', representacion: 'Confirmada', confirmada: dh(-262, '10:20'),
  clabe: '', alta: dh(-262, '10:20'), cuenta: 'En revisión', resoluciones: [], estatus: 'Activo',
});

const talentosBase: TalSemilla[] = [
  pendiente('TAL-01', 'Chingu Amiga', [h('Instagram', '@chinguamiga', 11_900_000), h('TikTok', '@chinguamiga', 28_400_000), h('YouTube', '@chinguamiga', 16_500_000), h('Facebook', 'soojinicoreana', 11_300_000)], 72_300_000),
  // TAL-02 Paco de Miguel: aprobado con datos de EJEMPLO (caso tipo de Porsche).
  {
    id: 'TAL-02', nombre: 'Francisco Miguel Hernández López', nombreArtistico: 'Paco de Miguel', correo: 'paco@stayonsocial.mx', telefono: '55 2048 7731',
    rfc: 'HELF920418QK4', curp: 'HELF920418HDFRPR06', regimenFiscal: '626 · Régimen Simplificado de Confianza', genero: 'Masculino', foto: 'paco.jpg',
    audienciaTotal: 15_600_000, tipo: 'Persona física',
    handles: [h('Instagram', '@pacodemiguel', 3_100_000), h('TikTok', '@pacodemiguel', 7_600_000), h('YouTube', '@PacoDeMiguelOficial', 147_000), h('Facebook', 'PacoDeMiguelF', 3_600_000)],
    nichos: ['Música y entretenimiento', 'Otro'], nichoOtro: 'Comedia', tiposContenido: ['Humor', 'Storytelling'], ubicacion: cdmx,
    agenciaId: 'AG-01', representacion: 'Confirmada', confirmada: dh(-262, '10:20'), clabe: clabeTerminada('012', '180', '4821'),
    alta: dh(-262, '10:20'), cuenta: 'Preaprobada', resoluciones: preaprobada(dh(-261, '12:05')), estatus: 'Activo',
  },
  pendiente('TAL-03', 'Dani Valle', [h('Instagram', '@danielvallem', 6_200_000), h('TikTok', '@danivallem', 8_700_000), h('YouTube', '@danivallem', 445_000), h('Facebook', 'danivallemvideos', 2_800_000)], 20_000_000),
  pendiente('TAL-04', 'Doris Jocelyn', [h('Instagram', '@dorisjocelynn', 5_700_000), h('TikTok', '@dorisjocelyn', 32_800_000), h('YouTube', '@DorisJocelyn', 6_900_000), h('Facebook', 'dorisjocelynn', 11_200_000)], 57_700_000),
  pendiente('TAL-05', 'Beth Cast', [h('Instagram', '@bethcast', 7_400_000), h('TikTok', '@bethcast', 17_300_000), h('YouTube', '@bethcast1', 4_200_000), h('Facebook', 'bethcast.ok', 3_000_000)], 32_700_000),
  pendiente('TAL-06', 'Alexis Omman', [h('Instagram', '@alexisomman', 14_000_000), h('TikTok', '@alexisomman', 29_100_000), h('YouTube', '@alexisomman', 15_200_000), h('Facebook', 'alexisomman', 16_900_000)], 76_400_000),
  pendiente('TAL-07', 'Chef en Proceso', [h('Instagram', '@chefenproceso', 4_000_000), h('TikTok', '@chefenproceso', 13_900_000), h('YouTube', '@chefenproceso', 3_700_000), h('Facebook', 'chefenproceso.cep', 10_800_000)], 33_300_000),
  pendiente('TAL-08', 'Andrés Johnson', [h('Instagram', '@andres.gjohnson', 5_300_000), h('TikTok', '@andresgjohnson', 8_800_000), h('YouTube', '@Andresjohnson28', 756_000), h('Facebook', 'andresjohnson28', 2_600_000)], 18_500_000),
  pendiente('TAL-09', 'Fer Jalil', [h('Instagram', '@fer_jalil', 3_500_000), h('TikTok', '@fer.jalil', 17_200_000), h('YouTube', '@fer_jalil', 20_100_000), h('Facebook', 'Fer Jalil', 1_700_000)], 43_300_000),
  pendiente('TAL-10', 'Bastian Delfin', [h('Instagram', '@bastiandelfin', 1_900_000), h('TikTok', '@bastiandelfin', 5_400_000), h('YouTube', '@bastiandelfin', 2_800_000), h('Facebook', 'ElBastiandelfin', 1_600_000)], 12_100_000),
  pendiente('TAL-11', 'Samadhi Zendejas', [h('Instagram', '@samadhiza', 7_000_000), h('TikTok', '@samadhiza_', 10_800_000), h('Facebook', 'samadhizendejass', 3_200_000)], 22_200_000),
  pendiente('TAL-12', 'Claus Maluf', [h('Instagram', '@clausmaluf', 1_000_000), h('TikTok', '@clausmaluf', 4_000_000), h('YouTube', '@Clausmaluf', 21_700), h('Facebook', 'clausmaluf', 799_000)], 6_100_000),
  pendiente('TAL-13', 'Natalia Juárez', [h('Instagram', '@nattaliajz', 2_300_000), h('TikTok', '@nattaliajz', 7_000_000), h('YouTube', '@nattaliajz1', 30_700), h('Facebook', 'nattaliajz', 3_300_000)], 13_200_000),
  pendiente('TAL-14', 'Stephany Leal', [h('Instagram', '@leal__stephany', 3_400_000), h('TikTok', '@leal_stephany', 22_800_000), h('YouTube', '@leal_stephany', 2_200_000), h('Facebook', 'leal__stephany', 1_000_000)], 29_400_000),
  pendiente('TAL-15', 'Sonrixs', [h('Instagram', '@sonrixs1', 5_100_000), h('TikTok', '@sonrixs_', 23_500_000), h('YouTube', '@Sonrixs', 14_100_000), h('Facebook', 'Sonrixs1', 8_500_000)], 52_600_000),
  pendiente('TAL-16', 'Kim Migneault', [h('Instagram', '@kimmigneaultxox', 3_500_000), h('TikTok', '@kimmigneault', 13_800_000), h('YouTube', '@kimmigneault', 6_700_000), h('Facebook', 'kimmigneaultxox', 4_300_000)], 29_000_000),
  pendiente('TAL-17', 'Celeste Pellegrini', [h('Instagram', '@celestepellegrini', 8_200_000), h('TikTok', '@cellegrini_oficial', 18_100_000), h('YouTube', '@Cellegrini', 14_500_000), h('Facebook', 'Cellegrini', 14_100_000)], 55_900_000),
  pendiente('TAL-18', 'Fer Carnal', [h('Instagram', '@fercarnal', 955_000), h('TikTok', '@fercarnal', 3_200_000), h('YouTube', '@fercarnal', 39_100), h('Facebook', 'Fer Carnal', 616_000)], 4_900_000),
  pendiente('TAL-19', 'Moni Basila', [h('Instagram', '@monibasila', 256_000), h('TikTok', '@monibasila', 364_000), h('Otra', '@monibasila', 14_700)], 637_000),
  pendiente('TAL-20', 'Aziel Medina', [h('Instagram', '@aziel_medina', 699_000), h('TikTok', '@aziel.medinaa', 3_100_000), h('YouTube', '@aziel_medinaa', 108_000), h('Facebook', 'azielmedinaa', 426_000)], 4_300_000),
  pendiente('TAL-21', 'Carlota Madrigal', [h('Instagram', '@carlotamadrigal', 589_000), h('TikTok', '@carlotamadrigal', 4_000_000), h('X', '@carlotamgl', 45_700)], 4_700_000),
  pendiente('TAL-22', 'Los Chicaneros', [h('Instagram', '@los_chicaneros', 7_100_000), h('TikTok', '@los_chicaneros', 16_500_000), h('YouTube', '@los_chicaneros', 6_000_000), h('Facebook', 'chicaneros', 7_200_000)], 38_300_000, 'Grupo'),
  pendiente('TAL-23', 'Scarcuchi', [h('Instagram', '@scarcuchi', 1_400_000), h('TikTok', '@scarcuchi_', 9_700_000), h('YouTube', '@scarcuchi', 4_300_000), h('Facebook', 'scarcuchi', 3_000_000)], 18_900_000),
  pendiente('TAL-24', 'Mamá Mecanic', [h('Instagram', '@mamamecanic', 1_300_000), h('TikTok', '@mamamecanic', 2_100_000), h('YouTube', '@mamamecanic', 3_500_000), h('Facebook', 'mamamecanicoficial', 1_400_000)], 4_900_000),
  pendiente('TAL-25', 'Daniela Guillermo', [h('Instagram', '@danielaguillermo', 185_000), h('TikTok', '@danielaguillermob', 173_000), h('YouTube', '@danielaguillermo15', 47_900)], 407_000),
  pendiente('TAL-26', 'Alejandro Salomón', [h('Instagram', '@salomondrin', 2_700_000), h('TikTok', '@salomondrintv', 788_000), h('YouTube', '@Salomundo', 4_200_000), h('Facebook', 'salomondrin', 3_700_000)], 15_100_000),
  pendiente('TAL-27', 'Majo Gutiérrez', [h('Instagram', '@mariajosegi', 1_200_000), h('TikTok', '@mariajosegi', 1_700_000), h('YouTube', '@mariajosegi', 2_100_000), h('Facebook', 'mariajossegi', 168_000)], 5_600_000),
];

const talentos: Talento[] = talentosBase.map((t) => {
  // Piloto Stay On Social: casi todos entran sin datos fiscales (la agencia los
  // sube después). Sin RFC no hay fecha de nacimiento que calcular ni discrepancia.
  const nac = t.rfc ? nacimientoDeRfc(t.rfc, t.curp) : { fecha: '', coincide: true };
  return {
    ...t, lada: '+52', fechaNacimiento: nac.fecha, nacimientoPorRevisar: (t.rfc && !nac.coincide) || undefined, banco: t.clabe ? BANCOS[t.clabe.slice(0, 3)] ?? '' : '',
    consentimientos: consentimientos(t.alta), cuenta: t.cuenta ?? 'Preaprobada', resoluciones: t.resoluciones ?? [],
  };
});

// ---------------------------------------------------------------------------
// Empresas (quien paga) y marcas (anunciante)
// ---------------------------------------------------------------------------

type EmpSemilla = [string, string, string, number, string, string, string, string?];
// id, razón social, RFC, plazo habitual, marca, industria, contacto de pagos (nombre|email|teléfono), marketing
const EMPRESAS: EmpSemilla[] = [
  ['01', 'Porsche de México, S.A. de C.V.', 'PME980605AB1', 60, 'Porsche', 'Automotriz', 'Mariana Pérez|pagos@porsche-mx.com|55 4128 2210'],
  ['02', 'Nissan Mexicana, S.A. de C.V.', 'NME610911L71', 90, 'Nissan', 'Automotriz', 'Óscar Medina|cxp@nissan.com.mx|55 5628 1100', 'Gerardo Pliego|social@nissan.com.mx'],
  ['03', 'Bel Star México, S.A. de C.V.', 'BSM030822FG4', 60, "L'Bel", 'Cosmética', 'Patricia Rueda|cuentasporpagar@lbel.com.mx|55 5089 4400', 'Paola Rincón|influencers@lbel.com.mx'],
  ['04', 'Hot Book Media, S.A. de C.V.', 'HBM110317KR2', 45, 'Hot Book', 'Medios', 'Iñaki Loredo|pagos@hotbook.mx|55 6721 3300'],
  ['05', 'Trana Moda, S.A. de C.V.', 'TMO150630UH9', 90, 'Trana', 'Moda', 'Renata Villaseñor|finanzas@marca-moda.mx|55 2280 1900'],
  ['06', 'Grupo Lagos Restaurantes, S.A. de C.V.', 'GLR120914MZ6', 30, 'Grupo Lagos', 'Restaurantes', 'Héctor Lagos|pagos@grupolagos.mx|81 8335 2200'],
  ['07', 'El Palacio de Hierro, S.A. de C.V.', 'PHI830429MG1', 60, 'El Palacio de Hierro', 'Departamentales', 'Mónica Esquivel|proveedores@ph.com.mx|55 5229 5100', 'Lucía Ferrer|digital@ph.com.mx'],
  ['08', 'Sephora Cosméticos México, S. de R.L. de C.V.', 'SCM101005TA3', 60, 'Sephora', 'Belleza', 'Julieta Ramos|ap.mexico@sephora.com|55 9138 6000'],
  ['09', 'Bonafont, S.A. de C.V.', 'BON920301QS8', 45, 'Bonafont', 'Bebidas', 'Carlos Mena|cxp@marca-bebidas.mx|55 5089 7700'],
  ['10', 'Aerovías de México, S.A. de C.V.', 'AME880912I89', 60, 'Aeroméxico', 'Aerolínea', 'Lorena Paz|cuentasxpagar@aeromexico.com|55 9132 4000'],
  ['11', 'El Puerto de Liverpool, S.A.B. de C.V.', 'PLI830527KE3', 90, 'Liverpool', 'Departamentales', 'Tomás Ugalde|proveedores@liverpool.com.mx|55 5268 3000'],
  ['12', 'Comercializadora Brillo Digital, S.A. de C.V.', 'CBD190225MN8', 30, 'Brillo Digital', 'Comercio', 'Sin contacto verificado|contacto@brillodigital.com|'],
  ['13', 'Xiaomi Technology México, S.A. de C.V.', 'XTM180903KD4', 60, 'Xiaomi', 'Tecnología', 'Andrés Pineda|pagos@marca-tec.mx|55 4170 9900'],
];

const contacto = (s?: string, verificado = true) => {
  if (!s) return undefined;
  const [nombre, email, telefono] = s.split('|');
  return { nombre, email, telefono: telefono || undefined, verificado: verificado && nombre !== 'Sin contacto verificado' };
};

const empresas: Empresa[] = EMPRESAS.map(([n, razon, rfc, plazo, , , pagos, mkt]) => ({
  id: `EMP-${n}`, razonSocial: razon, rfc, lista69b: rfc === 'CBD190225MN8', contactoPagos: contacto(pagos), contactoMarketing: contacto(mkt, false),
  plazoHabitual: plazo, origen: n === '01' || n === '13' ? 'CFDI' : 'Catálogo', estatus: rfc === 'CBD190225MN8' ? 'Bloqueada' : n === '05' ? 'En revisión' : 'Activa',
}));

const marcas: Marca[] = EMPRESAS.map(([n, , rfc, , nombre, industria]) => ({
  id: `MAR-${n}`, nombre, empresaId: `EMP-${n}`, industria, estatus: rfc === 'CBD190225MN8' ? 'Bloqueada' : n === '05' ? 'En revisión' : 'Activa',
}));

const cuentas: CuentaBancaria[] = [
  { id: 'CTA-01', banco: 'Kapital', cuenta: 'Concentradora ···7264', clabe: '660180000000067264', uso: 'Recibe los pagos de las marcas', saldo: 3_184_500 },
  { id: 'CTA-02', banco: 'Kapital', cuenta: 'Dispersión SPEI ···3051', clabe: '660180000000063051', uso: 'Adelantos y liquidaciones', saldo: 1_426_300 },
  { id: 'CTA-03', banco: 'Santander', cuenta: 'Operación ···0915', clabe: clabe('014', '180', '00009150334'), uso: 'Gastos de operación', saldo: 518_200 },
];

// ---------------------------------------------------------------------------
// Operaciones: cada una se describe por sus hitos y el constructor arma el resto
// ---------------------------------------------------------------------------

type FH = [number, string];
interface OpSemilla {
  n: number;
  t: string;
  sol: 'Talento' | 'Agencia';
  m: string;
  monto: number;
  publ: number;
  plazo: number;
  capt: FH;
  estatus: Operacion['estatus'];
  entregables?: [Entregable['red'], Entregable['formato'], number][];
  serie?: string;
  votos?: [string, FH][];
  firma?: FH;
  cesion?: { enviada?: FH; abierta?: FH | null; acuse?: FH | null; reenvios?: FH[] };
  rug?: FH | null | 'cola';
  evid?: FH | null;
  parcial?: number;
  adel?: FH;
  pagoMarca?: FH;
  liq?: FH;
  ordenRemanente?: 'Por autorizar';
  rechazo?: { usuario: string; motivo: string; en: FH };
  observacion?: { usuario: string; nota: string; en: FH };
  lectura?: Partial<AnalisisContrato['lectura']>;
  correccion?: { clave: string; anterior: string; usuario: string };
  validacion?: Partial<Operacion['validacion']>;
  paginas?: number;
  whatsappFallido?: boolean;
}

const fh = ([o, hr]: FH) => dh(o, hr);

/** UUID determinista para la semilla (formato de folio fiscal). */
function uuid(n: number) {
  let x = n * 2654435761 % 4294967296;
  const hex = (len: number) => Array.from({ length: len }, () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return '0123456789ABCDEF'[x % 16];
  }).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-A${hex(3)}-${hex(12)}`;
}

const inic = (nombre: string) => nombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const R: Entregable['red'] = 'Instagram';
// Piloto Stay On Social: una sola operación de ejemplo en revisión — Paco de
// Miguel (TAL-02) × Porsche (MAR-01), $80,000 a 60 días, capturada por la agencia.
const OPS: OpSemilla[] = [
  { n: 184, t: 'TAL-02', sol: 'Agencia', m: 'MAR-01', monto: 80_000, publ: -5, plazo: 60, capt: [-3, '09:00'], estatus: 'En revisión', serie: 'A1024', paginas: 9,
    entregables: [[R, 'Reel', 2], [R, 'Story', 3]] },
];

const avanzadas: Operacion['estatus'][] = ['Por firmar', 'Firmada', 'Activa', 'Por liquidar', 'Liquidada'];
const firmadas: Operacion['estatus'][] = ['Firmada', 'Activa', 'Por liquidar', 'Liquidada'];

function entregablesPorOmision(s: OpSemilla): Entregable[] {
  const lista = s.entregables ?? (s.monto >= 90_000 ? [[R, 'Reel', 2], [R, 'Story', 3], ['TikTok', 'Video', 1]] : s.monto >= 40_000 ? [[R, 'Reel', 1], [R, 'Story', 3]] : [[R, 'Reel', 1], [R, 'Story', 2]]) as [Entregable['red'], Entregable['formato'], number][];
  return lista.map(([red, formato, cantidad], i) => ({ id: `E${i + 1}`, red, formato, cantidad }));
}

function construir() {
  const operaciones: Operacion[] = [];
  const piezas: Pieza[] = [];
  const ordenes: OrdenPago[] = [];
  const cxc: CxC[] = [];
  const cxp: CxP[] = [];
  const mensajes: Mensaje[] = [];
  const correos: Correo[] = [];

  for (const s of OPS) {
    const tal = talentos.find((t) => t.id === s.t)!;
    const marca = marcas.find((m) => m.id === s.m)!;
    const empresa = empresas.find((e) => e.id === marca.empresaId)!;
    const agenciaId = tal.agenciaId && tal.representacion === 'Confirmada' ? tal.agenciaId : '';
    const ag = agencias.find((a) => a.id === agenciaId);
    const folio = `INF-${String(s.n).padStart(4, '0')}`;
    const capturada = fh(s.capt);
    const capturadaPor = s.sol === 'Agencia' ? (agenciaId === 'AG-01' ? USR.ana : USR.luis) : tal.nombre;
    const fechaCfdi = d(Math.min(0, s.publ + 1));
    const entregables = entregablesPorOmision(s);
    const emisor = s.sol === 'Agencia' && ag ? { rfc: ag.rfc, nombre: ag.razonSocial, regimen: '601 · General de Ley Personas Morales' } : { rfc: tal.rfc, nombre: tal.nombre, regimen: tal.regimenFiscal };
    const subtotal = Math.round((s.monto / 1.16) * 100) / 100;
    const totalPiezas = entregables.reduce((t, e) => t + e.cantidad, 0);

    const votos = s.votos
      ? s.votos.map(([usuario, t]) => ({ usuario, fechaHora: fh(t) }))
      : avanzadas.includes(s.estatus) ? [{ usuario: USR.sofia, fechaHora: sumarHoras(capturada, 2) }, { usuario: USR.rodrigo, fechaHora: sumarHoras(capturada, 4) }] : [];
    const aprobada = votos.length >= 2 ? votos[votos.length - 1].fechaHora : undefined;
    const firmado = s.firma ? fh(s.firma) : firmadas.includes(s.estatus) && aprobada ? sumarHoras(aprobada, 2) : undefined;
    const adelantoFH = s.adel ? fh(s.adel) : undefined;
    // Cesión, RUG y evidencia completas antes del adelanto cuando la semilla no las detalla.
    const enviada = s.cesion?.enviada ? fh(s.cesion.enviada) : firmado ? sumarHoras(firmado, 0.02) : undefined;
    const acuse = s.cesion?.acuse === null ? undefined : s.cesion?.acuse ? fh(s.cesion.acuse) : enviada && adelantoFH ? sumarHoras(enviada, 3) : undefined;
    const abierta = s.cesion?.abierta === null ? undefined : s.cesion?.abierta ? fh(s.cesion.abierta) : acuse ? sumarHoras(enviada!, 1) : undefined;
    const rugFH = s.rug === null || s.rug === 'cola' ? undefined : s.rug ? fh(s.rug) : firmado && adelantoFH ? sumarHoras(firmado, 1.5) : undefined;
    const evidFH = s.evid === null ? undefined : s.evid ? fh(s.evid) : firmado && adelantoFH ? sumarHoras(firmado, 2.5) : undefined;

    const lectura: AnalisisContrato['lectura'] = {
      monto: s.monto, plazoDias: s.plazo, razonSocial: empresa.razonSocial, rfcMarca: empresa.rfc, rfcTalento: emisor.rfc, firmas: true,
      kpiCondicionado: 0, penaCompensable: 0, prohibeCesion: false, retencionAmplia: false, confidencial: false, pagoACuentaTalento: false, ...s.lectura,
    };
    const paginas = s.paginas ?? 4 + (hash(folio) % 8);
    const ficha = construirFicha({
      monto: s.monto, plazoDias: s.plazo, fechaPublicacion: d(s.publ), capturada, entregables, empresa, talento: tal, agencia: ag,
      rfcEmisorCfdi: emisor.rfc, evidencia: !!evidFH, lectura, paginas,
    });
    if (s.correccion) {
      const c = ficha.campos.find((x) => x.clave === s.correccion!.clave);
      if (c) c.correccion = { anterior: s.correccion.anterior, usuario: s.correccion.usuario, fechaHora: sumarHoras(capturada, 1) };
    }
    const sinValidar = !!s.validacion;
    const pagosContacto = empresa.contactoPagos ?? { nombre: '—', email: '—' };

    const op: Operacion = {
      id: folio, folio, talentoId: s.t, agenciaId, solicitante: s.sol, marcaId: s.m, monto: s.monto,
      fechaPublicacion: d(s.publ), plazoDias: s.plazo, entregables,
      contactoPagos: { nombre: pagosContacto.nombre, email: pagosContacto.email, telefono: pagosContacto.telefono },
      contactoMarketing: empresa.contactoMarketing,
      capturada, capturadaPor,
      cfdi: {
        archivoXml: `CFDI_${slug(marca.nombre)}_${s.serie ?? `${inic(tal.nombre)}${s.n}`}.xml`, archivoPdf: `CFDI_${slug(marca.nombre)}_${s.serie ?? `${inic(tal.nombre)}${s.n}`}.pdf`,
        uuid: uuid(s.n), serieFolio: s.serie ?? `${inic(tal.nombre)}-${s.n}`, emisor,
        receptor: { rfc: empresa.rfc, nombre: empresa.razonSocial, usoCfdi: 'G03 · Gastos en general' },
        // Una sola línea de concepto por CFDI: varias colaboraciones serían facturas distintas (cambio 15).
        conceptos: [{ descripcion: `Colaboración de contenido · ${entregables.map(textoEntregable).join(' + ')}`, cantidad: 1, importe: subtotal }],
        metodoPago: 'PPD', formaPago: '99 · Por definir', subtotal, iva: Math.round((s.monto - subtotal) * 100) / 100, total: s.monto,
        fechaEmision: fechaCfdi, fechaTimbrado: `${fechaCfdi}T10:12`,
      },
      contrato: { archivo: `Contrato_${slug(marca.nombre)}_${slug(tal.nombre.split(' ')[0])}.pdf`, formato: 'PDF', paginas },
      validacion: { uuidVigente: true, rfcEmisor: true, lista69b: true, montoFecha: true, marcaVinculada: true, pac: PAC, fechaHora: capturada, ...s.validacion,
        motivo: sinValidar ? s.rechazo?.motivo : undefined },
      analisis: sinValidar
        ? { estado: 'Lista', pagina: 0, inicio: capturada, fin: capturada, campos: [], lectura, montoBaseSugerido: 0 }
        : { estado: 'Lista', pagina: paginas, inicio: capturada, fin: sumarHoras(capturada, 0.4), lectura, ...ficha },
      consultaRug: sinValidar ? undefined : { fechaHora: sumarHoras(capturada, 0.4), registros: RUG_EXTERNO[tal.rfc]?.filter((r) => r.fecha < capturada.slice(0, 10)) ?? [] },
      votos,
      montoBase: aprobada ? ficha.montoBaseSugerido : undefined,
      confirmaciones: aprobada && ficha.semaforo === 'Amarillo' ? ficha.campos.filter((c) => c.alerta).map((c) => c.alerta!.texto).join(' ') : undefined,
      docusign: aprobada ? { enviado: aprobada, firmado, firmo: firmado ? capturadaPor : undefined } : undefined,
      cesion: enviada ? {
        email: pagosContacto.email,
        firmada: { fechaHora: firmado ?? enviada, firmo: capturadaPor },
        enviada, abierta, acuse, acuseVia: acuse ? 'Botón "Confirmo recepción"' : undefined,
        reenvios: (s.cesion?.reenvios ?? []).map((r) => ({ fechaHora: fh(r), automatico: true, usuario: 'Sistema' })),
      } : undefined,
      rug: s.rug === 'cola' ? { estado: 'En cola', modalidad: MODALIDAD_RUG, enCola: firmado! }
        : rugFH ? {
          estado: s.estatus === 'Liquidada' && s.n !== 157 ? 'Cancelada' : 'Inscrita', modalidad: MODALIDAD_RUG, enCola: firmado!, folio: `RUG-2026-${String(4700 + s.n * 3).padStart(6, '0')}`,
          fechaInscripcion: rugFH, vigencia: sumarDias(rugFH.slice(0, 10), 365), boleta: `boleta_rug_${s.n}.pdf`, usuario: s.n % 2 ? USR.rodrigo : USR.lucas,
          cierre: s.estatus === 'Liquidada' && s.n !== 157 && s.liq ? { accion: 'Cancelada', fechaHora: sumarHoras(fh(s.liq), 2), usuario: USR.lucas } : undefined,
        } : undefined,
      evidencia: undefined,
      avisar: { talento: !ag || ag.avisoPago !== 'Agencia', agencia: !!ag && ag.avisoPago !== 'Talento' },
      observacion: s.observacion ? { nota: s.observacion.nota, fechaHora: fh(s.observacion.en), usuario: s.observacion.usuario } : undefined,
      rechazo: s.rechazo ? { motivo: s.rechazo.motivo, usuario: s.rechazo.usuario, fechaHora: fh(s.rechazo.en) } : undefined,
      estatus: s.estatus,
    };

    // Etapa 8: piezas publicadas con su verificación y sus métricas (nunca se sobreescriben).
    if (evidFH) {
      const base = Math.max(...tal.handles.map((x) => x.seguidores ?? 0));
      let indice = 0;
      const mias: Pieza[] = [];
      for (const e of entregables) {
        for (let i = 1; i <= e.cantidad; i++) {
          indice++;
          const handle = tal.handles.find((x) => x.red === e.red) ?? tal.handles[0];
          const clave = `${folio}-${e.id}-${i}`;
          const link = e.formato === 'Story' ? undefined
            : e.red === 'TikTok' ? `https://www.tiktok.com/${handle.usuario}/video/73${hash(clave) % 10 ** 9}`
              : e.red === 'YouTube' ? `https://www.youtube.com/watch?v=${clave.replace(/[^A-Z0-9]/gi, '').slice(-11)}`
                : `https://www.instagram.com/reel/C${(hash(clave) % 36 ** 6).toString(36)}x${i}/`;
          const snaps = snapshotsHasta(clave, evidFH, e.formato, base);
          mias.push({
            id: `PZ-${s.n}-${indice}`, operacionId: folio, entregableId: e.id, indice: i, red: e.red, formato: e.formato, link,
            capturas: e.formato === 'Story' ? [`estadisticas_story_${i}_${s.n}.png`] : undefined,
            publicada: d(s.publ), verificacion: { existe: true, cuenta: true, fecha: true, mencion: true, ok: true, motivo: `Menciona a @${slug(marca.nombre).replace(/_/g, '')}`, fechaHora: evidFH },
            snapshots: snaps, fotos: { d7: snaps.find((x) => x.dia === 7), d30: snaps.find((x) => x.dia === 30) },
          });
        }
      }
      piezas.push(...mias);
      op.evidencia = {
        aprobacionMarca: `aprobacion_${slug(marca.nombre)}_email.pdf`, sugerencia: { verificados: mias.length, total: totalPiezas },
        alcance: s.parcial ? 'Hitos parciales' : 'Campaña completa', porcentaje: s.parcial ?? 100, fechaHora: evidFH, usuario: capturadaPor,
      };
    }

    // Etapa 9: orden de pago del 80% con doble control y CEP.
    if (adelantoFH) {
      const base = Math.round(op.montoBase! * (s.parcial ?? 100) / 100);
      const monto = Math.round(base * PORCENTAJE_ADELANTO);
      const benef = s.sol === 'Agencia' && ag ? { tipo: 'Agencia' as const, nombre: ag.nombre, clabe: ag.clabe, banco: ag.banco } : { tipo: 'Talento' as const, nombre: tal.nombre, clabe: tal.clabe, banco: tal.banco };
      const referencia = `INF${adelantoFH.slice(0, 10).replace(/-/g, '')}${String(s.n).padStart(5, '0')}`;
      op.adelanto = { monto, base, fechaHora: adelantoFH, cuentaId: 'CTA-02', referencia, usuario: s.n % 3 ? USR.sofia : USR.rodrigo };
      ordenes.push({
        id: `OP-${s.n}-A`, operacionId: folio, tipo: 'Adelanto', beneficiario: benef, monto, referencia: `INF-${String(s.n).padStart(4, '0')}-A`,
        concepto: `Adelanto · CFDI ${op.cfdi.serieFolio}`, cuentaId: 'CTA-02',
        preparo: { usuario: USR.lucas, fechaHora: sumarHoras(adelantoFH, -0.5) }, autorizo: { usuario: s.n % 3 ? USR.sofia : USR.rodrigo, fechaHora: sumarHoras(adelantoFH, -0.2) },
        cep: { archivo: `CEP_${referencia}.pdf`, claveRastreo: referencia, fechaHora: adelantoFH, usuario: s.n % 3 ? USR.sofia : USR.rodrigo }, estatus: 'Pagada',
      });

      const c: CxC = {
        id: `CXC-${s.n}`, operacionId: op.id, marcaId: s.m, documento: op.cfdi.serieFolio, importe: s.monto,
        abonos: s.pagoMarca ? [{ fecha: d(s.pagoMarca[0]), monto: s.monto, referencia: `SPEI ${empresa.rfc.slice(0, 3)}${String(s.n * 7).padStart(5, '0')}`, cuentaId: 'CTA-01', conciliado: true }] : [],
        vencimiento: sumarDias(op.fechaPublicacion, s.plazo),
      };
      cxc.push(c);
      const p: CxP = { id: `CXP-${s.n}`, operacionId: op.id, documento: `LIQ-${String(s.n).padStart(4, '0')}` };
      if (s.pagoMarca) correos.push({ id: `MAIL-${s.n}-P`, operacionId: folio, para: pagosContacto.email, asunto: `Pago recibido · ${op.cfdi.serieFolio} · ${marca.nombre}`, tipo: 'Pago recibido', fechaHora: dh(s.pagoMarca[0], '11:00'), estatus: 'Entregado' });
      if (s.liq && s.pagoMarca) {
        const dias = Math.round((new Date(`${d(s.pagoMarca[0])}T12:00:00`).getTime() - new Date(`${adelantoFH.slice(0, 10)}T12:00:00`).getTime()) / 864e5);
        const meses = Math.max(1, Math.ceil(dias / 30));
        const fijo = Math.round(s.monto * COMISION_FIJA * 100) / 100;
        const variable = Math.round(monto * TASA_MENSUAL * meses * 100) / 100;
        const importe = Math.max(0, Math.round((s.monto - monto - fijo - variable) * 100) / 100);
        const quien = s.n % 2 ? USR.sofia : USR.rodrigo;
        p.pago = { cuentaId: 'CTA-02', fecha: d(s.liq[0]), hora: s.liq[1], usuario: quien, importe, fijo, variable, meses };
        const refR = `INF${d(s.liq[0]).replace(/-/g, '')}${String(s.n).padStart(5, '0')}R`;
        ordenes.push({
          id: `OP-${s.n}-R`, operacionId: folio, tipo: 'Remanente', beneficiario: benef, monto: importe, referencia: `INF-${String(s.n).padStart(4, '0')}-L`,
          concepto: `Remanente · CFDI ${op.cfdi.serieFolio}`, cuentaId: 'CTA-02',
          preparo: { usuario: USR.lucas, fechaHora: sumarHoras(fh(s.liq), -1) }, autorizo: { usuario: quien, fechaHora: sumarHoras(fh(s.liq), -0.3) },
          cep: { archivo: `CEP_${refR}.pdf`, claveRastreo: refR, fechaHora: fh(s.liq), usuario: quien }, estatus: 'Pagada',
        });
      }
      if (s.ordenRemanente) {
        const meses = Math.max(1, Math.ceil(((new Date(`${d(s.pagoMarca![0])}T12:00`).getTime() - new Date(`${adelantoFH.slice(0, 10)}T12:00`).getTime()) / 864e5) / 30));
        const neto = Math.max(0, Math.round((s.monto - monto - s.monto * COMISION_FIJA - monto * TASA_MENSUAL * meses) * 100) / 100);
        ordenes.push({
          id: `OP-${s.n}-R`, operacionId: folio, tipo: 'Remanente', beneficiario: benef, monto: neto, referencia: `INF-${String(s.n).padStart(4, '0')}-L`,
          concepto: `Remanente · CFDI ${op.cfdi.serieFolio}`, cuentaId: 'CTA-02', preparo: { usuario: USR.sofia, fechaHora: dh(0, '10:20') }, estatus: s.ordenRemanente,
        });
      }
      cxp.push(p);

      // Etapa 10: un aviso por WhatsApp por pago, a quien elige la agencia en su preferencia.
      const destinatarios = [
        ...(op.avisar.talento ? [{ destinatario: 'Talento' as const, nombre: tal.nombre, telefono: tal.telefono }] : []),
        ...(op.avisar.agencia && ag ? [{ destinatario: 'Agencia' as const, nombre: ag.nombre, telefono: ag.telefono }] : []),
      ];
      const pagos: { tipo: Mensaje['tipo']; fechaHora: string; monto: number }[] = [
        { tipo: 'Adelanto enviado', fechaHora: sumarHoras(adelantoFH, 0.02), monto },
        ...(p.pago ? [{ tipo: 'Remanente enviado' as const, fechaHora: sumarHoras(`${p.pago.fecha}T${p.pago.hora}`, 0.02), monto: p.pago.importe }] : []),
      ];
      for (const pg of pagos) {
        if (pg.fechaHora < dh(-45, '00:00')) continue;
        for (const x of destinatarios) {
          const fallido = s.whatsappFallido && x.destinatario === 'Talento' && pg.tipo === 'Adelanto enviado';
          mensajes.push({
            id: `MSG-${s.n}-${pg.tipo === 'Adelanto enviado' ? 'A' : 'R'}${x.destinatario[0]}`,
            operacionId: op.id, destinatario: x.destinatario, nombre: x.nombre, telefono: x.telefono, tipo: pg.tipo,
            contenido: `Influ: enviamos ${pg.tipo === 'Adelanto enviado' ? 'el adelanto' : 'el remanente'} de ${folio} (${marca.nombre}, ${tal.nombre.split(' ')[0]}) por $${pg.monto.toLocaleString('es-MX')} MXN por SPEI. Llega en minutos a la CLABE registrada.`,
            fechaHora: pg.fechaHora, estatus: fallido ? 'Fallido' : pg.fechaHora >= dh(-3, '00:00') ? 'Enviado' : 'Entregado',
          });
        }
      }
    }
    if (op.cesion) {
      correos.push({ id: `MAIL-${s.n}-C`, operacionId: folio, para: op.cesion.email, asunto: `Instrucción irrevocable de pago · CFDI ${op.cfdi.serieFolio}`, tipo: 'Notificación de cesión', fechaHora: op.cesion.enviada, estatus: op.cesion.abierta ? 'Abierto' : 'Entregado' });
      op.cesion.reenvios.forEach((r, i) => correos.push({ id: `MAIL-${s.n}-R${i}`, operacionId: folio, para: op.cesion!.email, asunto: `Reenvío · Instrucción irrevocable de pago · CFDI ${op.cfdi.serieFolio}`, tipo: 'Reenvío de cesión', fechaHora: r.fechaHora, estatus: 'Entregado' }));
    }
    operaciones.push(op);
  }
  return { operaciones, piezas, ordenes, cxc, cxp, mensajes, correos };
}

// ---------------------------------------------------------------------------
// Usuarios, perfiles, bitácora e histórico del tablero
// ---------------------------------------------------------------------------

// Piloto Stay On Social (M1/M2): solo los roles del piloto. El talento no entra
// a la plataforma; la agencia (Stay On Social) controla a sus 27 talentos.
const usuarios: Usuario[] = [
  { id: 'USR-01', nombre: USR.mauricio, correo: 'direccion@influ.mx', rol: 'Dirección General', estatus: 'Activo' },
  { id: 'USR-02', nombre: USR.sofia, correo: 'operaciones@influ.mx', rol: 'Equipo interno', estatus: 'Activo' },
  { id: 'USR-03', nombre: USR.rodrigo, correo: 'riesgos@influ.mx', rol: 'Equipo interno', estatus: 'Activo' },
  { id: 'USR-19', nombre: USR.lucas, correo: 'lucas@influ.mx', rol: 'Equipo interno', estatus: 'Activo' },
  { id: 'USR-04', nombre: USR.ana, correo: 'ana@stayonsocial.mx', rol: 'Agencia', agenciaId: 'AG-01', estatus: 'Activo' },
  { id: 'USR-FND', nombre: 'Ricardo Treviño', correo: 'ricardo@fondeador.mx', rol: 'Fondeador', estatus: 'Activo' },
];

const roles: Rol[] = [
  { id: 'ROL-01', nombre: 'Dirección General', estatus: 'Activo' },
  { id: 'ROL-02', nombre: 'Equipo interno', estatus: 'Activo' },
  { id: 'ROL-03', nombre: 'Agencia', estatus: 'Activo' },
  { id: 'ROL-04', nombre: 'Talento', estatus: 'Activo' },
  { id: 'ROL-05', nombre: 'Marca', estatus: 'Activo' },
  { id: 'ROL-06', nombre: 'Fondeador', estatus: 'Activo' },
];

const SOL = 'Solicitudes de adelanto';
// Piloto Stay On Social: la bitácora arranca casi vacía (una sola operación en
// revisión y el alta de la agencia con su board de 27 talentos).
const bitacora: Bitacora[] = [
  { id: 'BIT-003', fechaHora: dh(0, '08:21'), usuario: 'Sistema', rol: 'Sistema', modulo: SOL, accion: 'Análisis del contrato', detalle: 'INF-0184 Paco de Miguel / Porsche: ficha verde, 2 reels y 3 stories. Lista para la revisión del equipo.' },
  { id: 'BIT-002', fechaHora: dh(0, '08:20'), usuario: 'Sistema', rol: 'Sistema', modulo: SOL, accion: 'Validación del CFDI', detalle: `INF-0184 A1024 Porsche $80,000: UUID vigente, RFC emisor, lista 69-B, monto y fecha en regla (${PAC}).` },
  { id: 'BIT-001', fechaHora: dh(-3, '09:00'), usuario: USR.ana, rol: 'Agencia', modulo: SOL, accion: 'Captura de solicitud', detalle: 'INF-0184 Paco de Miguel / Porsche $80,000 a 60 días. Stay On Social capturó la factura y el contrato.' },
  { id: 'BIT-000', fechaHora: dh(-262, '12:05'), usuario: USR.sofia, rol: 'Equipo interno', modulo: 'Agencias', accion: 'Preaprobación', detalle: 'Stay On Social (SOS180523JK2) preaprobada con su board de 27 talentos. Datos fiscales de cada talento quedan pendientes de carga.' },
];

// Histórico mensual del tablero. Proyección de colocación de los primeros 3 meses
// sobre el modelo de la línea Kapital (cambio 14): tope $15M, $1.5M el mes 1 y +10.5%/mes,
// adelanto promedio $100,000 (factura ~$125,000). Nov–Dic '26 y Ene '27 son proyección.
export const adelantosMensuales: AdelantoMensual[] = [
  { mes: 'Ene', ops2025: 0, imp2025: 0, ops2026: 4, imp2026: 400_000 },
  { mes: 'Feb', ops2025: 0, imp2025: 0, ops2026: 5, imp2026: 500_000 },
  { mes: 'Mar', ops2025: 1, imp2025: 100_000, ops2026: 6, imp2026: 600_000 },
  { mes: 'Abr', ops2025: 1, imp2025: 100_000, ops2026: 7, imp2026: 700_000 },
  { mes: 'May', ops2025: 2, imp2025: 200_000, ops2026: 8, imp2026: 800_000 },
  { mes: 'Jun', ops2025: 2, imp2025: 200_000, ops2026: 9, imp2026: 900_000 },
  { mes: 'Jul', ops2025: 3, imp2025: 300_000, ops2026: 10, imp2026: 1_000_000 },
  { mes: 'Ago', ops2025: 3, imp2025: 300_000, ops2026: 11, imp2026: 1_100_000 },
  { mes: 'Sep', ops2025: 4, imp2025: 400_000, ops2026: 12, imp2026: 1_200_000 },
  { mes: 'Oct', ops2025: 4, imp2025: 400_000, ops2026: 14, imp2026: 1_400_000 },
  { mes: 'Nov', ops2025: 5, imp2025: 500_000, ops2026: 15, imp2026: 1_500_000, proyeccion: true },
  { mes: 'Dic', ops2025: 5, imp2025: 500_000, ops2026: 17, imp2026: 1_657_500, proyeccion: true },
  { mes: "Ene '27", ops2025: 0, imp2025: 0, ops2026: 18, imp2026: 1_831_500, proyeccion: true },
];

export const seed = {
  talentos, agencias, empresas, marcas, cuentas, usuarios, roles, bitacora,
  ...construir(),
};

export { WHATSAPP_INFLU };
