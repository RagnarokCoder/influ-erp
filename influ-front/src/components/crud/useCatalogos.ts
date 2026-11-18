import { useInflu } from '../../store/useInflu';
import { NICHOS } from '../../data/constantes';
import type { CatalogoOrigen, OpcionCatalogo } from './types';

const PERMISOS_MARCA = ['Admin', 'Aprueba contenido', 'Aprueba ofertas', 'Comenta'];

/** Resuelve un campo de tipo catálogo contra su catálogo origen. */
export function useCatalogos(): Record<CatalogoOrigen, OpcionCatalogo[]> {
  const talentos = useInflu((s) => s.talentos);
  const agencias = useInflu((s) => s.agencias);
  const empresas = useInflu((s) => s.empresas);
  const marcas = useInflu((s) => s.marcas);
  return {
    talentos: talentos.map((t) => ({ id: t.id, label: t.nombre })),
    agencias: agencias.map((a) => ({ id: a.id, label: a.nombre })),
    agenciasActivas: agencias.filter((a) => a.cuenta === 'Preaprobada' && a.estatus === 'Activa').map((a) => ({ id: a.id, label: `${a.nombre} · ${a.ciudad}` })),
    empresas: empresas.map((e) => ({ id: e.id, label: e.razonSocial })),
    marcas: marcas.map((m) => ({ id: m.id, label: m.nombre })),
    nichos: NICHOS.map((c) => ({ id: c, label: c })),
    permisosMarca: PERMISOS_MARCA.map((p) => ({ id: p, label: p })),
  };
}
