import React, { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Inbox } from 'lucide-react';
import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import MiniBar from '../ui/MiniBar';
import KpiCard from '../ui/KpiCard';
import EmptyState from '../ui/EmptyState';
import { money, money2, num, pct, formatDate, estadoTone } from '../../lib/format';
import { useInflu, rolActual, type Coleccion } from '../../store/useInflu';
import { veImportes } from '../../lib/permisos';
import { useCatalogos } from './useCatalogos';
import type { Col, Kpi } from './types';

type Fila = { id: string } & Record<string, any>;

interface Props<T extends Fila> {
  /** Opcional en módulos de solo lectura (bitácora). */
  coleccion?: Coleccion;
  rows: T[];
  cols: Col<T>[];
  estatuses?: readonly string[];
  kpis?: Kpi[];
  nombreSingular: string;
  /** Valores por omisión del alta. */
  plantilla?: Partial<T>;
  /** Contenido extra del panel de detalle: relaciones con otros módulos. */
  detalle?: (row: T) => React.ReactNode;
  /** Columna de acción propia del módulo. */
  accion?: (row: T) => React.ReactNode;
  /** Botones extra del encabezado. */
  encabezado?: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
  sinAlta?: boolean;
  /** Registro inalterable: sin editar ni eliminar (bitácora). */
  sinEdicion?: boolean;
  /** Se edita pero no se da de baja. */
  sinBaja?: boolean;
  /** Paneles de contexto entre los indicadores y la tabla. */
  arriba?: React.ReactNode;
  /** Sustantivo femenino: "Nueva póliza" en lugar de "Nuevo póliza". */
  femenino?: boolean;
  /** Texto de búsqueda con el que abre (liga desde otro módulo, `?q=`). */
  busquedaInicial?: string;
  /** Pie propio del drawer cuando el módulo tiene acciones distintas a editar. */
  pieDetalle?: (row: T) => React.ReactNode;
  /** Texto del estado vacío. */
  vacio?: { titulo: string; mensaje: string };
  /** Aviso en línea bajo el formulario, con el registro original para comparar. */
  avisoForma?: (forma: Partial<T>, original: T | undefined) => React.ReactNode;
  /** Título y subtítulo del drawer cuando la primera columna no sirve de título. */
  tituloDetalle?: (row: T) => string;
  subtituloDetalle?: (row: T) => string;
}

export function valorCelda<T extends Fila>(
  col: Col<T>,
  row: T,
  catalogos: ReturnType<typeof useCatalogos>,
): React.ReactNode {
  if (col.render) return col.render(row);
  const v = row[col.key];
  if (v === undefined || v === null || v === '') return <span className="text-mist">—</span>;
  switch (col.tipo) {
    case 'money': return money(Number(v));
    case 'money2': return money2(Number(v));
    case 'number': return num(Number(v));
    case 'pct': return pct(Number(v));
    case 'date': return formatDate(String(v));
    case 'catalog': {
      const lista = col.catalogo ? catalogos[col.catalogo] : [];
      return lista.find((o) => o.id === v)?.label ?? String(v);
    }
    case 'multicatalog': {
      const lista = col.catalogo ? catalogos[col.catalogo] : [];
      const ids = Array.isArray(v) ? (v as string[]) : [];
      if (ids.length === 0) return <span className="text-mist">—</span>;
      return (
        <span className="flex items-center gap-1 flex-wrap justify-end">
          {ids.map((id) => (
            <span key={id} className="text-[11px] bg-frost border border-hairline rounded px-1.5 py-0.5">
              {lista.find((o) => o.id === id)?.label.split(' · ')[0] ?? id}
            </span>
          ))}
        </span>
      );
    }
    default: return String(v);
  }
}

const esNumerico = (col: Col<any>) =>
  col.tipo === 'money' || col.tipo === 'money2' || col.tipo === 'number' || col.tipo === 'pct';

export const esImporte = (col: Col<any>) => col.importe || col.tipo === 'money' || col.tipo === 'money2';

export default function DataModule<T extends Fila>({
  coleccion, rows, cols: todas, estatuses, kpis: todosKpis, nombreSingular, plantilla,
  detalle, accion, encabezado, titulo, subtitulo, sinAlta, sinEdicion, arriba,
  femenino, busquedaInicial, pieDetalle, vacio, avisoForma, tituloDetalle, subtituloDetalle,
}: Props<T>) {
  const guardar = useInflu((s) => s.guardar);
  const catalogos = useCatalogos();
  // Regla 10: el perfil sin importes no ve columnas ni indicadores de dinero,
  // ni en la tabla, ni en el detalle, ni en el formulario.
  const conImportes = veImportes(useInflu(rolActual));
  const cols = conImportes ? todas : todas.filter((c) => !esImporte(c));
  const kpis = conImportes ? todosKpis : todosKpis?.filter((k) => !k.importe);

  const [busqueda, setBusqueda] = useState(busquedaInicial ?? '');
  const [filtro, setFiltro] = useState('Todos');
  const [forma, setForma] = useState<Partial<T> | null>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  // El drawer lee el registro vigente, no una copia del momento en que se abrió.
  const abierto = rows.find((r) => r.id === abiertoId) ?? null;
  const setAbierto = (r: T | null) => setAbiertoId(r?.id ?? null);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtro !== 'Todos' && String(r.estatus ?? '') !== filtro) return false;
      if (!q) return true;
      // La búsqueda corre sobre todas las columnas visibles, ya resueltas: se
      // busca "Flexi León", no "CLI-02".
      return cols.some((c) => {
        const v = r[c.key];
        if (v === undefined || v === null) return false;
        if (c.tipo === 'catalog' && c.catalogo) {
          const label = catalogos[c.catalogo].find((o) => o.id === v)?.label ?? '';
          return label.toLowerCase().includes(q);
        }
        if (c.tipo === 'multicatalog' && c.catalogo) {
          const lista = catalogos[c.catalogo];
          return (Array.isArray(v) ? (v as string[]) : []).some((id) =>
            (lista.find((o) => o.id === id)?.label ?? '').toLowerCase().includes(q),
          );
        }
        return String(v).toLowerCase().includes(q);
      });
    });
  }, [rows, cols, busqueda, filtro, catalogos]);

  const camposForma = cols.filter((c) => !c.fueraDeForma && !c.soloLectura);

  const onGuardar = () => {
    if (!forma || !coleccion) return;
    if (!guardar(coleccion, forma as Fila)) return;
    setForma(null);
    setAbierto(null);
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto">
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
      )}

      {arriba && <div className="flex flex-col gap-4 mb-6">{arriba}</div>}

      <Panel
        title={titulo}
        subtitle={subtitulo}
        right={
          <>
            {encabezado}
            <div className="flex items-center gap-1.5 bg-frost border border-hairline rounded-full px-3 py-1.5">
              <Search size={13} className="text-ash" strokeWidth={1.6} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-[13px] outline-none w-36 placeholder:text-mist"
              />
            </div>
            {!sinAlta && (
              <Button size="sm" onClick={() => setForma({ ...(plantilla ?? {}) } as Partial<T>)}>
                <Plus size={14} strokeWidth={2} /> Nuevo
              </Button>
            )}
          </>
        }
      >
        {estatuses && estatuses.length > 0 && (
          <div className="flex gap-1.5 px-5 pb-4 flex-wrap">
            {['Todos', ...estatuses].map((e) => (
              <button
                key={e}
                onClick={() => setFiltro(e)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  filtro === e ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline hover:bg-frost'
                }`}
              >
                {e}
                <span className="ml-1.5 opacity-60">
                  {e === 'Todos' ? rows.length : rows.filter((r) => r.estatus === e).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {lista.length === 0 ? (
          <EmptyState icon={Inbox} title={vacio?.titulo ?? 'Sin registros'} message={vacio?.mensaje ?? 'Ajusta la búsqueda o el filtro de estatus, o captura el primero.'} />
        ) : (
          <div className="overflow-x-auto border-t border-hairline">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  {cols.map((c) => (
                    <th key={c.key} className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap ${esNumerico(c) ? 'text-right' : 'text-left'}`}>
                      {c.label}
                    </th>
                  ))}
                  {(accion || !sinEdicion) && <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wide text-mist font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} onClick={() => setAbierto(r)} className="border-b border-hairline hover:bg-haze cursor-pointer">
                    {cols.map((c) => (
                      <td key={c.key} className={`px-4 py-2.5 text-[13px] whitespace-nowrap ${esNumerico(c) ? 'text-right tabular-nums' : ''} ${c.mono ? 'font-mono text-[12px] text-blue-link' : ''}`}>
                        {c.key === 'estatus' && !c.render ? (
                          <Badge tone={estadoTone(String(r.estatus))}>{String(r.estatus)}</Badge>
                        ) : c.barra ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="tabular-nums">{num(Number(r[c.key]))}</span>
                            <MiniBar value={Number(r[c.key])} max={Number(r[c.barra])} />
                          </div>
                        ) : (
                          valorCelda(c, r, catalogos)
                        )}
                      </td>
                    ))}
                    {(accion || !sinEdicion) && <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {accion?.(r)}
                        {!sinEdicion && (
                          <button onClick={() => setForma(r)} className="p-1.5 rounded hover:bg-frost text-ash hover:text-carbon">
                            <Pencil size={14} strokeWidth={1.6} />
                          </button>
                        )}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Formulario generado desde la definición de columnas del módulo. */}
      <Modal
        open={!!forma}
        title={forma?.id ? `Editar ${nombreSingular}` : `${femenino ? 'Nueva' : 'Nuevo'} ${nombreSingular}`}
        subtitle={forma?.id ? String(forma.id) : 'Los campos de catálogo se resuelven contra su catálogo origen'}
        onClose={() => setForma(null)}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setForma(null)}>Cancelar</Button>
            <Button onClick={onGuardar}>Guardar</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {camposForma.map((c) => {
            const valor = forma?.[c.key] ?? '';
            // `deriva` es lo que hace que al elegir pedidos el plan herede
            // producto, piezas y compromiso sin capturarlos otra vez.
            const set = (v: any) => {
              const base = { ...(forma as object), [c.key]: v } as Partial<T>;
              setForma(c.deriva ? { ...base, ...c.deriva(base, v) } : base);
            };
            const opciones = c.catalogo
              ? (c.opcionesDinamicas?.(forma ?? {}, catalogos) ?? catalogos[c.catalogo])
              : [];

            if (c.tipo === 'multicatalog' && c.catalogo) {
              const marcados: string[] = Array.isArray(valor) ? valor : [];
              return (
                <div key={c.key} className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[12px] font-medium text-ash">
                    {c.label}
                    {marcados.length > 0 && <span className="ml-1.5 text-mist">· {marcados.length} seleccionado{marcados.length > 1 ? 's' : ''}</span>}
                  </label>
                  <div className="border border-hairline rounded-[8px] max-h-44 overflow-y-auto divide-y divide-hairline">
                    {opciones.length === 0 && (
                      <div className="px-3 py-3 text-[12px] text-mist">No hay opciones compatibles con lo ya seleccionado.</div>
                    )}
                    {opciones.map((o) => {
                      const activo = marcados.includes(o.id);
                      return (
                        <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-frost transition-colors">
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() => set(activo ? marcados.filter((x) => x !== o.id) : [...marcados, o.id])}
                            className="accent-blue w-3.5 h-3.5"
                          />
                          <span className="text-[13px] text-carbon">{o.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {c.ayuda && <small className="text-[11px] text-mist">{c.ayuda}</small>}
                </div>
              );
            }

            if (c.tipo === 'catalog' && c.catalogo) {
              return (
                <div key={c.key} className="flex flex-col gap-1">
                  <Select label={c.label} value={String(valor)} onChange={(e) => set(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {opciones.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                  {c.ayuda && <small className="text-[11px] text-mist">{c.ayuda}</small>}
                </div>
              );
            }
            if (c.tipo === 'select' && c.opciones) {
              return (
                <div key={c.key} className="flex flex-col gap-1">
                  <Select label={c.label} value={String(valor)} onChange={(e) => set(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                  {c.ayuda && <small className="text-[11px] text-mist">{c.ayuda}</small>}
                </div>
              );
            }
            const tipoInput = c.tipo === 'date' ? 'date' : esNumerico(c) ? 'number' : 'text';
            return (
              <div key={c.key} className="flex flex-col gap-1">
                <Input
                  label={c.label}
                  type={tipoInput}
                  value={String(valor)}
                  onChange={(e) => set(tipoInput === 'number' ? Number(e.target.value) : e.target.value)}
                />
                {c.ayuda && <small className="text-[11px] text-mist">{c.ayuda}</small>}
              </div>
            );
          })}
        </div>
        {forma && avisoForma?.(forma, rows.find((r) => r.id === forma.id))}
      </Modal>

      {/* Panel lateral de detalle: ficha completa, relaciones y acciones. */}
      <Drawer
        open={!!abierto}
        onClose={() => setAbierto(null)}
        title={abierto ? (tituloDetalle ? tituloDetalle(abierto) : String(abierto[cols[0].key] ?? abierto.id)) : ''}
        subtitle={abierto && subtituloDetalle ? subtituloDetalle(abierto) : nombreSingular}
        footer={
          abierto && (pieDetalle ? pieDetalle(abierto) : !sinEdicion && (
            <Button variant="outlined" size="sm" onClick={() => { setForma(abierto); }}>
              <Pencil size={13} strokeWidth={1.8} /> Editar
            </Button>
          ))
        }
      >
        {abierto && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col divide-y divide-hairline">
              {cols.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4 py-2.5">
                  <span className="text-[13px] text-ash shrink-0">{c.label}</span>
                  <span className="text-[14px] text-carbon text-right">
                    {c.key === 'estatus' && !c.render
                      ? <Badge tone={estadoTone(String(abierto.estatus))}>{String(abierto.estatus)}</Badge>
                      : valorCelda(c, abierto, catalogos)}
                  </span>
                </div>
              ))}
            </div>
            {detalle?.(abierto)}
          </div>
        )}
      </Drawer>

    </div>
  );
}

/** Bloque de relaciones para el panel de detalle. */
export function Relacion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-mist font-semibold mb-2">{titulo}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function RenglonRelacion({ titulo, detalle, valor, tone }: { titulo: string; detalle?: string; valor?: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-hairline rounded-[8px] px-3 py-2">
      <div className="min-w-0">
        <div className="text-[13px] text-carbon truncate">{titulo}</div>
        {detalle && <div className="text-[11px] text-ash truncate">{detalle}</div>}
      </div>
      {valor && (tone
        ? <Badge tone={estadoTone(tone)}>{valor}</Badge>
        : <span className="text-[13px] tabular-nums text-carbon shrink-0">{valor}</span>)}
    </div>
  );
}
