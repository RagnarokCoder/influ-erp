import type { RolUsuario } from '../data/types';
import { CONFIG } from '../data/constantes';
import { MARKET_RUTAS_POR_ROL } from '../market/rutas';

// Qué rutas abre cada perfil (ANALISIS.md §e). '*' es acceso completo.
// El orden importa: la primera ruta es la pantalla de entrada. Las rutas del
// marketplace (Fase 2, /mk/…) se suman al final desde src/market.
const FASE1: Record<RolUsuario, '*' | string[]> = {
  'Dirección General': '*',
  'Equipo interno': ['/solicitudes', '/registros', '/revision', '/contratos', '/rug', '/cesiones', '/evidencia', '/pagos', '/marcas', '/notificaciones', '/talentos', '/agencias', '/operaciones', '/metricas'],
  Agencia: ['/resumen', '/talentos', '/pedir-adelanto', '/operaciones', '/perfil', '/notificaciones'],
  // M1 (piloto Stay On Social): con el portal de talento apagado, el talento no
  // entra a la plataforma; sus rutas quedan vacías y el guard lo manda al login.
  Talento: CONFIG.talentPortal ? ['/resumen', '/pedir-adelanto', '/operaciones', '/perfil', '/notificaciones'] : [],
  // La marca no tiene panel: recibe la cesión y la cobranza por email.
  Marca: [],
  // Rol nuevo Fondeador (M9): ve cómo se usa su capital. Panel propio /fondeo/*.
  Fondeador: ['/fondeo/resumen', '/fondeo/asignacion', '/fondeo/operaciones', '/fondeo/flujos', '/fondeo/notificaciones', '/fondeo/documentos'],
};

export const RUTAS_POR_ROL: Record<RolUsuario, '*' | string[]> = Object.fromEntries(
  (Object.keys(FASE1) as RolUsuario[]).map((r) => {
    const base = FASE1[r];
    // M1: con el portal de talento apagado, el rol Talento no suma rutas del marketplace.
    const market = r === 'Talento' && !CONFIG.talentPortal ? [] : (MARKET_RUTAS_POR_ROL[r] ?? []);
    return [r, base === '*' ? '*' : [...base, ...market]];
  }),
) as Record<RolUsuario, '*' | string[]>;

// Ven dinero los perfiles que cobran, pagan o dirigen: aquí son todos. El
// talento y la agencia ven solo el de su cartera.
const CON_IMPORTES: RolUsuario[] = ['Dirección General', 'Equipo interno', 'Agencia', 'Talento', 'Marca', 'Fondeador'];

// Regla 20: cada talento ve lo suyo; la agencia, lo de sus talentos; el fondeador, sus operaciones.
const CARTERA_PROPIA: RolUsuario[] = ['Agencia', 'Talento', 'Marca', 'Fondeador'];

export function veImportes(rol: RolUsuario) {
  return CON_IMPORTES.includes(rol);
}

export function carteraPropia(rol: RolUsuario) {
  return CARTERA_PROPIA.includes(rol);
}

/** Abre la ruta exacta o una de sus subrutas (/mk/marca/briefs/BR-01 cuelga de /mk/marca/briefs). */
export function puedeVer(rol: RolUsuario, path: string) {
  const permitidas = RUTAS_POR_ROL[rol];
  if (permitidas === '*') return true;
  return permitidas.some((r) => path === r || path.startsWith(`${r}/`));
}

export function rutaInicial(rol: RolUsuario) {
  const permitidas = RUTAS_POR_ROL[rol];
  if (permitidas === '*') return '/tablero';
  // Un rol sin rutas (Talento con el portal apagado, Marca) no tiene panel: va al login.
  return permitidas[0] ?? '/login';
}

const DIR: RolUsuario = 'Dirección General';
const EQ: RolUsuario = 'Equipo interno';
const AG: RolUsuario = 'Agencia';
const TA: RolUsuario = 'Talento';
const en = (...roles: RolUsuario[]) => (rol: RolUsuario) => roles.includes(rol);

// Quién autoriza qué. La acción del store la consulta; la pantalla la usa para orientar.
export const autoriza = {
  solicitud: en(AG, TA),              // capturar, firmar, cargar evidencia y links
  preaprobacion: en(DIR, EQ),         // preaprobar, observar o rechazar cuentas nuevas
  revision: en(DIR, EQ),              // votar la aprobación, observar y rechazar (sin umbral de monto)
  ficha: en(DIR, EQ),                 // corregir un dato de la ficha del contrato
  cesion: en(DIR, EQ),                // reenviar la notificación de la cesión
  rug: en(DIR, EQ),                   // inscribir, actualizar o cancelar la cesión en el RUG
  dispersion: en(DIR, EQ),            // preparar, autorizar y cerrar órdenes de pago (doble control)
  cobro: en(DIR, EQ),                 // registrar y conciliar el pago de la marca
  pago: en(DIR, EQ),                  // liquidar el remanente
  representacion: en(AG),             // confirmar o rechazar a quien la eligió como agencia
  preferencias: en(AG),               // a quién llega el aviso de pago por WhatsApp
  agencia: en(DIR, EQ),               // suspender agencias
  catalogo: en(DIR, EQ),              // talentos, empresas y marcas
  mensajes: en(DIR, EQ),              // reenviar un aviso de pago no entregado
  usuarios: en(DIR),
  roles: en(DIR),
};

/** Nombre de quién autoriza, para el toast "La autoriza …". */
export const QUIEN: Record<keyof typeof autoriza, string> = {
  solicitud: 'el talento o su agencia',
  preaprobacion: 'el equipo interno',
  revision: 'el equipo interno',
  ficha: 'el equipo interno',
  cesion: 'el equipo interno',
  rug: 'el equipo interno',
  dispersion: 'el equipo interno',
  cobro: 'el equipo interno',
  pago: 'el equipo interno',
  representacion: 'la agencia que eligió el talento',
  preferencias: 'la agencia',
  agencia: 'el equipo interno',
  catalogo: 'el equipo interno',
  mensajes: 'el equipo interno',
  usuarios: 'Dirección General',
  roles: 'Dirección General',
};

/** Etiqueta legible de cada llave, para la pantalla de Roles. */
export const ETIQUETA_AUTORIZA: Record<keyof typeof autoriza, string> = {
  solicitud: 'Solicitudes de adelanto, firma, evidencia y links',
  preaprobacion: 'Aprobación de cuentas nuevas',
  revision: 'Voto de aprobación, observación y rechazo',
  ficha: 'Corrección de la ficha del contrato (IA)',
  cesion: 'Reenvío de la instrucción de pago',
  rug: 'Inscripción y cierre en el RUG',
  dispersion: 'Órdenes de pago (prepara una persona, autoriza otra)',
  cobro: 'Registro y conciliación del pago de la marca',
  pago: 'Liquidación del remanente',
  representacion: 'Confirmación de representación',
  preferencias: 'Preferencia del aviso de pago',
  agencia: 'Suspensión de agencias',
  catalogo: 'Catálogos de talentos, empresas y marcas',
  mensajes: 'Reenvío de avisos de pago',
  usuarios: 'Altas y bajas de usuarios',
  roles: 'Estatus de perfiles',
};
