import type { Talento } from '../data/types';
import type { ToneKey } from './format';

export type EstadoTalento = 'Aprobado por Influ' | 'Observado' | 'En revisión de Influ' | 'Faltan datos fiscales';

/** Señal del talento en el roster de la agencia (M3/M4). */
export function estadoTalento(t: Pick<Talento, 'cuenta' | 'rfc'>): EstadoTalento {
  if (t.cuenta === 'Preaprobada') return 'Aprobado por Influ';
  if (t.cuenta === 'Observada') return 'Observado';
  if (!t.rfc) return 'Faltan datos fiscales';
  return 'En revisión de Influ';
}

/** Un talento aprobado por Influ puede pedir adelantos. */
export const aprobadoInflu = (t: Pick<Talento, 'cuenta'>) => t.cuenta === 'Preaprobada';

/** Faltan sus datos fiscales (lo sube la agencia en el alta). */
export const faltanDatosFiscales = (t: Pick<Talento, 'rfc'>) => t.rfc === '';

export function toneEstado(e: EstadoTalento): ToneKey {
  return e === 'Aprobado por Influ' ? 'success' : e === 'Observado' ? 'danger' : e === 'Faltan datos fiscales' ? 'warning' : 'blue';
}
