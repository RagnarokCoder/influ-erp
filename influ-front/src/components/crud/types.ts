import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type CatalogoOrigen = 'talentos' | 'agencias' | 'agenciasActivas' | 'empresas' | 'marcas' | 'nichos' | 'permisosMarca';

export type TipoCampo =
  | 'text' | 'number' | 'money' | 'money2' | 'date' | 'pct' | 'select' | 'catalog'
  | 'multicatalog';

export interface OpcionCatalogo { id: string; label: string }

export interface Col<T> {
  key: string;
  label: string;
  tipo?: TipoCampo;
  /** Para tipo catalog: contra qué catálogo se resuelve el selector. */
  catalogo?: CatalogoOrigen;
  /** Para tipo select: la lista cerrada de valores. */
  opciones?: readonly string[];
  /** Columna de referencia contra la que se dibuja la barra comparativa. */
  barra?: string;
  /** El campo no se captura: se calcula o se hereda. */
  soloLectura?: boolean;
  /** Acota las opciones del selector con lo que ya trae el formulario. */
  opcionesDinamicas?: (row: Partial<T>, catalogos: Record<CatalogoOrigen, OpcionCatalogo[]>) => OpcionCatalogo[];
  /** Deriva otros campos al cambiar éste: la herencia del pedido al plan. */
  deriva?: (row: Partial<T>, valor: unknown) => Partial<T>;
  /** La columna no aparece en el formulario. */
  fueraDeForma?: boolean;
  mono?: boolean;
  /** Muestra dinero aunque no sea tipo money: se oculta a los perfiles sin importes. */
  importe?: boolean;
  render?: (row: T) => ReactNode;
  ayuda?: string;
}

export interface Kpi {
  label: string;
  value: string;
  note?: string;
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  /** El indicador es dinero: no se muestra a los perfiles sin importes. */
  importe?: boolean;
}
