import type { Formato, Genero, Nicho, Red, RegimenFiscal, TipoContenido } from './types';

// Fecha fija del demo: lo vencido sigue vencido mañana y los números no se
// mueven entre una junta y otra. Se movió al lunes 26 oct 2026 con la versión
// del 22 oct de la especificación (el caso tipo de Porsche ya liberó su adelanto).
export const HOY_ISO = '2026-10-26';
export const HOY = new Date(`${HOY_ISO}T12:00:00`);

const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

/** Fecha relativa a HOY en ISO (AAAA-MM-DD). */
export function d(offset: number) {
  const x = new Date(HOY);
  x.setDate(x.getDate() + offset);
  return iso(x);
}

/** Fecha-hora relativa a HOY: dh(-1, '09:40') → "2026-10-04T09:40". */
export function dh(offset: number, hora: string) {
  return `${d(offset)}T${hora}`;
}

/** Suma días a una fecha ISO. */
export function sumarDias(fecha: string, dias: number) {
  const x = new Date(`${fecha}T12:00:00`);
  x.setDate(x.getDate() + dias);
  return iso(x);
}

/** Suma horas a una fecha-hora local "AAAA-MM-DDTHH:MM". */
export function sumarHoras(fechaHora: string, horas: number) {
  const x = new Date(fechaHora);
  x.setMinutes(x.getMinutes() + Math.round(horas * 60));
  return `${iso(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}

/** Contraseña única de los accesos de demo (login.md §4). */
export const CLAVE_DEMO = 'demo';

/**
 * Flags del maquetado para el piloto con Stay On Social (cambios 12-nov-2026).
 * M1: el talento no entra a la plataforma; la agencia controla todo.
 * M2/M9: el rol Fondeador se puede ocultar en la demo a la agencia.
 */
export const CONFIG = {
  talentPortal: false,
  fondeadorVisible: true,
  /** Roles del piloto que muestra el selector "Ver el sistema como" (M2). */
  rolesPiloto: ['Dirección General', 'Equipo interno', 'Agencia', 'Fondeador'] as const,
};

// Condiciones comerciales del documento ("8% sobre el total de la factura +
// 1.5% mensual sobre lo adelantado"). La comisión fija se calcula sobre el total
// del CFDI; la variable, sobre el monto adelantado por mes hasta que paga la marca.
export const PORCENTAJE_ADELANTO = 0.8;
export const COMISION_FIJA = 0.08;
export const TASA_MENSUAL = 0.015;

/** Provisional: pendiente #3. "Aprobación colectiva": votos de integrantes distintos para aprobar. */
export const QUORUM_APROBACION = 2;
/** Provisional: pendiente #6. Días para pagar el remanente después del pago de la marca. */
export const DIAS_LIQUIDACION = 2;
/** Provisional: pendiente #8. Plazo con la marca a partir del cual la revisión pide confirmación. */
export const PLAZO_MAXIMO = 120;
/** Provisional: pendiente #12. Meta del tiempo de cobro (captura → adelanto) y alerta de revisión. */
export const META_HORAS_COBRO = 48;
export const HORAS_REVISION = 24;
/** Recordatorios internos de vencimiento (documento, paso 11): 7 días y 1 día antes. */
export const RECORDATORIOS = [7, 1];
/** Provisional: pendiente #13. Límite de concentración de la cartera por marca (%). */
export const LIMITE_CONCENTRACION = 25;

/** Número de WhatsApp Business de Influ. Provisional: número de demo. */
export const WHATSAPP_INFLU = '81 4170 2250';
export const DOMINIO = 'influ.mx';

// ---------------------------------------------------------------------------
// Perfil del creador (MVP Fase 1 §11)
// ---------------------------------------------------------------------------

export const NICHOS: Nicho[] = [
  'Moda', 'Belleza', 'Lujo', 'Fitness y bienestar', 'Gastronomía', 'Viajes', 'Tecnología', 'Gaming', 'Finanzas personales',
  'Maternidad y familia', 'Hogar y decoración', 'Mascotas', 'Deportes', 'Música y entretenimiento', 'Otro',
];
export const TIPOS_CONTENIDO: TipoContenido[] = [
  'Lifestyle', 'Storytelling', 'Reviews', 'Unboxing', 'Tutoriales / how-to', 'GRWM', 'Vlogs', 'Humor', 'Educativo', 'Otro',
];
export const REDES: Red[] = ['Instagram', 'TikTok', 'YouTube', 'X', 'Twitch', 'Facebook', 'Otra'];
export const FORMATOS: Formato[] = ['Reel', 'Story', 'Post', 'Video', 'Short', 'Live'];
export const GENEROS: Genero[] = ['Femenino', 'Masculino', 'No binario', 'Prefiero no decir'];
export const REGIMENES: RegimenFiscal[] = [
  '626 · Régimen Simplificado de Confianza', '612 · Actividades Empresariales y Profesionales', '625 · Plataformas Tecnológicas',
  '621 · Incorporación Fiscal', '605 · Sueldos y Salarios',
];
export const LADAS = ['+52', '+1', '+34', '+57', '+54'];

/** País, estado y ciudades (México por omisión). */
export const ESTADOS_MX: Record<string, string[]> = {
  'Ciudad de México': ['CDMX'],
  'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'Guadalupe', 'Apodaca'],
  Jalisco: ['Guadalajara', 'Zapopan', 'Puerto Vallarta'],
  'Estado de México': ['Toluca', 'Naucalpan', 'Huixquilucan'],
  Puebla: ['Puebla', 'Cholula'],
  Querétaro: ['Querétaro', 'San Juan del Río'],
  Yucatán: ['Mérida'],
  'Baja California': ['Tijuana', 'Ensenada'],
  'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Tulum'],
};
export const PAISES = ['México', 'Estados Unidos', 'España', 'Colombia', 'Argentina'];

// Consentimientos versionados que se aceptan en el registro.
export const VERSION_AVISO_PRIVACIDAD = 'v2026.10';
export const VERSION_CONDICIONES = 'v2026.10';
export const CONDICIONES_DESDE = '2026-10-01';

/** Foto de perfil: JPG o PNG hasta 5 MB, recorte cuadrado. */
export const FOTO_MAX_MB = 5;

// ---------------------------------------------------------------------------
// Validaciones e integraciones simuladas (MVP Fase 1 §12)
// ---------------------------------------------------------------------------

/** PAC que valida el CFDI contra el SAT. Candidatos: SW Sapien o Facturama. */
export const PAC = 'SW Sapien';

/** RFC que el SAT publica en la lista 69-B (simulado): talentos, agencias y empresas. */
export const LISTA_69B = ['CBD190225MN8', 'GOMA880101XX1', 'FAC170512EF2'];

/**
 * Garantías ya inscritas en el RUG por otros acreedores (simulado): la consulta
 * previa por RFC del otorgante detecta un doble factoraje antes de aprobar.
 */
export const RUG_EXTERNO: Record<string, { acreedor: string; folio: string; fecha: string; descripcion: string }[]> = {
  OINC970204LS1: [{ acreedor: 'Factor Capital Digital S.A.P.I. de C.V.', folio: 'RUG-2026-004318', fecha: '2026-08-14', descripcion: 'Cesión de derechos de crédito · CFDI CO-131 · El Palacio de Hierro' }],
};

/** La inscripción en el RUG vale 12 meses; se avisa 30 días antes de que venza. */
export const VIGENCIA_RUG_MESES = 12;
export const ALERTA_RUG_DIAS = 30;
/** Modalidad del RUG. Provisional: pendiente #15 (se define antes del arranque del piloto). */
export const MODALIDAD_RUG: 'Asistida' | 'Tercerizada' = 'Asistida';

/** Sin acuse de la notificación de la cesión a las 48 h: reenvío automático y alerta. */
export const HORAS_ACUSE = 48;

/** Métricas de cada pieza: al cargar el link, cada 24 h durante 30 días y fotos oficiales a 7 y 30. */
export const DIAS_METRICAS = 30;
export const FOTOS_OFICIALES = [7, 30];

/** Datos de Influ para la carta de la instrucción irrevocable de pago (la cuenta
 * concentradora vive en Kapital). */
export const INFLU = {
  razonSocial: 'Influ Tech S.A. de C.V.',
  rfc: 'ITE250310XX0',
  clabe: '660180000000067264',
  cuenta: '0000067264',
  banco: 'Kapital',
  /** Apoderado que firma por Influ el contrato de factoraje. */
  apoderado: 'Lucas Tamez Ochoa',
  /** Domicilio fiscal para el contrato y la instrucción de pago. */
  domicilio: 'Av. Lázaro Cárdenas 2400, Valle Oriente, San Pedro Garza García, N.L., C.P. 66269',
};

/** Clave de banco (3 primeros dígitos de la CLABE) → nombre. Incluye a Kapital,
 * donde viven las cuentas de dispersión y concentradora de Influ. */
export const BANCOS: Record<string, string> = {
  '002': 'Banamex', '012': 'BBVA México', '014': 'Santander', '021': 'HSBC', '036': 'Inbursa',
  '044': 'Scotiabank', '058': 'Banregio', '072': 'Banorte', '127': 'Banco Azteca', '638': 'Nu México',
  '660': 'Kapital',
};

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
