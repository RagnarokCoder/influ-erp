import { HOY, HOY_ISO } from '../data/constantes';

export { HOY };

export function money(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}
export function money2(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
export function num(n: number, decimals = 0) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}
export function pct(n: number, decimals = 1) { return Number.isFinite(n) ? `${n.toFixed(decimals)}%` : '—'; }

/** Seguidores/audiencia compactos: 11_900_000 → "11.9M", 147_000 → "147K". */
export function millones(n: number | undefined) {
  if (!n) return '—';
  if (n >= 1_000_000) { const m = n / 1_000_000; return `${m % 1 === 0 ? m : m.toFixed(1)}M`; }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

// Monto en letra para la instrucción irrevocable de pago y el pagaré.
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const DECENAS = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function centenasEnLetra(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const d = n % 100;
  let resto = '';
  if (d <= 20) resto = UNIDADES[d];
  else if (d < 30) resto = (d === 20 ? 'veinte' : `veinti${UNIDADES[d - 20]}`);
  else { const dec = Math.floor(d / 10); const u = d % 10; resto = DECENAS[dec] + (u ? ` y ${UNIDADES[u]}` : ''); }
  return `${CENTENAS[c]}${c && resto ? ' ' : ''}${resto}`.trim();
}

/** "treinta y dos mil pesos 00/100 M.N." a partir de 32000. */
export function montoEnLetra(n: number) {
  const entero = Math.floor(Math.abs(n));
  const centavos = Math.round((Math.abs(n) - entero) * 100);
  const grupo = (num: number, singular: string, plural: string): string => {
    if (num === 0) return '';
    if (num === 1) return singular;
    return `${centenasEnLetra(num)} ${plural}`;
  };
  let palabras = '';
  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1000);
  const resto = entero % 1000;
  if (millones) palabras += grupo(millones, 'un millón', 'millones');
  if (miles) palabras += `${palabras ? ' ' : ''}${miles === 1 ? 'mil' : `${centenasEnLetra(miles)} mil`}`;
  if (resto) palabras += `${palabras ? ' ' : ''}${centenasEnLetra(resto)}`;
  if (!palabras) palabras = 'cero';
  return `${palabras} ${entero === 1 ? 'peso' : 'pesos'} ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

/** Convierte a fecha lo que se pueda; null si el campo viene vacío o inválido. */
function aFecha(valor: Date | string | null | undefined): Date | null {
  if (!valor) return null;
  const d = typeof valor === 'string' ? new Date(`${valor}T12:00:00`) : valor;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Días entre dos fechas. Un registro recién capturado puede no tener fecha
 * todavía, así que devuelve NaN en lugar de tronar: quien lo muestre decide
 * si pone un guion. `Number.isNaN` es la guarda en los puntos de lectura.
 */
export function diffDays(from: Date | string | null | undefined, to: Date | string | null | undefined) {
  const a = aFecha(from);
  const b = aFecha(to);
  if (!a || !b) return NaN;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Días vencidos de un documento contra la fecha de la demo. Negativo = por vencer. */
export function diasVencidos(vencimiento: string | null | undefined) {
  return diffDays(vencimiento, HOY);
}

export function formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', options ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export const hoyISO = HOY_ISO;

export type ToneKey = 'success' | 'warning' | 'danger' | 'neutral' | 'blue';

// Semáforo único de todo el sistema: verde listo o al corriente, ámbar en
// espera de alguien, rojo vencido o bloqueado, azul en curso.
export function estadoTone(estado: string): ToneKey {
  const map: Record<string, ToneKey> = {
    Activo: 'success', Activa: 'success', Vigente: 'blue', Pagado: 'success', Liquidada: 'success', Confirmada: 'success',
    Visibles: 'success', Entregado: 'success', 'Campaña completa': 'success', 'A tiempo': 'success', Aprobado: 'success',
    'En revisión': 'warning', 'Por firmar': 'warning', 'Por validar': 'warning', Pendiente: 'warning',
    'Pendiente de aprobación': 'warning', 'Por liquidar': 'warning', 'Hitos parciales': 'warning', Firmada: 'blue',
    Vencido: 'danger', Rechazada: 'danger', Rechazado: 'danger', Suspendido: 'danger', Suspendida: 'danger', Bloqueada: 'danger',
    Fallido: 'danger', 'Con atraso': 'danger', Observada: 'danger',
    Preaprobada: 'success', 'En cola': 'warning', Inscrita: 'success',
    Enviado: 'blue', Independiente: 'neutral', Talento: 'blue', Agencia: 'blue',
    Inactivo: 'neutral', Ocultos: 'neutral', Cancelado: 'neutral',
  };
  return map[estado] ?? 'neutral';
}

/** "24 sep · 07:40" a partir de "2026-09-24T07:40". */
export function fechaHora(valor: string | null | undefined) {
  if (!valor) return '—';
  const [fecha, hora] = valor.split('T');
  return `${formatDate(fecha, { day: 'numeric', month: 'short' })}${hora ? ` · ${hora.slice(0, 5)}` : ''}`;
}

/** Hora local de la demo: la fecha es fija, el reloj no. */
export function ahora() {
  const x = new Date();
  const hh = String(x.getHours()).padStart(2, '0');
  const mm = String(x.getMinutes()).padStart(2, '0');
  return { fecha: hoyISO, hora: `${hh}:${mm}`, fechaHora: `${hoyISO}T${hh}:${mm}` };
}
