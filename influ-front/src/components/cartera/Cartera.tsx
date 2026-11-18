import React, { useEffect, useMemo, useState } from 'react';
import { Search, Inbox, ChevronRight } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import KpiCard from '../ui/KpiCard';
import EmptyState from '../ui/EmptyState';
import { money, formatDate, diasVencidos, estadoTone } from '../../lib/format';
import type { Kpi } from '../crud/types';

/** Cliente o proveedor: la columna de la izquierda. */
export interface EntidadCartera {
  id: string;
  nombre: string;
  /** Segunda línea: contacto, material que surte, lo que distinga. */
  detalle: string;
  saldo: number;
  estatus: string;
}

/** Un documento por cobrar o por pagar: la columna de en medio. */
export interface DocumentoCartera {
  id: string;
  entidadId: string;
  documento: string;
  monto: number;
  vencimiento: string;
  estatus: string;
  /** Cuando algo impide liberar el documento, aquí va el motivo. */
  bloqueo?: string;
  /** Segunda línea bajo el folio (el cliente, cuando la columna 1 agrupa por asesor). */
  sub?: string;
}

interface Props {
  entidades: EntidadCartera[];
  documentos: DocumentoCartera[];
  kpis: Kpi[];
  /** Cómo se llama la primera columna: "Clientes" o "Proveedores". */
  tituloEntidades: string;
  etiquetaAccion: string;
  /** Estatus que ya no admite acción. */
  estatusLiquidado: string;
  onAccion: (documentoId: string) => void;
  /** Renglones extra de la ficha del documento en la tercera columna. */
  fichaDocumento?: (doc: DocumentoCartera) => React.ReactNode;
  /** Bloque de contexto general de la entidad, bajo la ficha. */
  resumenEntidad?: (entidad: EntidadCartera, docs: DocumentoCartera[]) => React.ReactNode;
  /** Sustituye el botón de acción: abono parcial, cuenta de origen del pago. */
  renderAccion?: (doc: DocumentoCartera) => React.ReactNode;
  /** Filtro de periodo entre los KPIs y la cartera ("listado del día"). */
  filtros?: React.ReactNode;
  /** Días de atraso desde los que la columna Días se pinta en rojo. */
  umbralRojo?: number;
  /** Cómo se llama el documento en los textos: "documento", "recibo". */
  nombreDocumento?: string;
  /** Leyenda bajo el saldo de la columna 2. */
  leyendaSaldo?: string;
}

const Renglon = ({ titulo, valor, detalle }: { titulo: string; valor: React.ReactNode; detalle?: string }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-hairline last:border-0">
    <div className="min-w-0">
      <div className="text-[12px] text-ash">{titulo}</div>
      {detalle && <div className="text-[11px] text-mist mt-0.5">{detalle}</div>}
    </div>
    <div className="text-[13px] text-carbon text-right shrink-0">{valor}</div>
  </div>
);

export default function Cartera({
  entidades, documentos, kpis, tituloEntidades, etiquetaAccion,
  estatusLiquidado, onAccion, fichaDocumento, resumenEntidad, renderAccion,
  filtros, umbralRojo = 60, nombreDocumento = 'documento', leyendaSaldo = 'saldo abierto',
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [entidadId, setEntidadId] = useState<string | null>(entidades[0]?.id ?? null);
  const [docId, setDocId] = useState<string | null>(null);

  const conSaldo = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return entidades
      .map((e) => {
        const docs = documentos.filter((d) => d.entidadId === e.id);
        const abierto = docs.filter((d) => d.estatus !== estatusLiquidado).reduce((s, d) => s + d.monto, 0);
        const vencidos = docs.filter((d) => d.estatus === 'Vencido').length;
        return { entidad: e, docs, abierto, vencidos };
      })
      .filter((r) => !q || r.entidad.nombre.toLowerCase().includes(q) || r.entidad.detalle.toLowerCase().includes(q))
      .sort((a, b) => b.abierto - a.abierto);
  }, [entidades, documentos, busqueda, estatusLiquidado]);

  const seleccionada = conSaldo.find((r) => r.entidad.id === entidadId) ?? conSaldo[0];
  const docs = seleccionada?.docs ?? [];
  const doc = docs.find((d) => d.id === docId) ?? null;

  // Al cambiar de entidad el documento de la anterior deja de tener sentido.
  useEffect(() => { setDocId(null); }, [entidadId]);

  return (
    <div className="px-4 md:px-8 py-5 max-w-[1600px] mx-auto flex flex-col gap-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k) => <KpiCard key={k.label} compacto {...k} />)}
      </div>

      {filtros}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-4 items-start">
        {/* ---------- 1. Entidades ---------- */}
        <div className="bg-white border border-hairline rounded-[8px] flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-hairline">
            <div className="text-[13px] font-semibold text-carbon mb-2">{tituloEntidades}</div>
            <div className="flex items-center gap-1.5 bg-frost border border-hairline rounded-full px-2.5 py-1.5">
              <Search size={12} className="text-ash" strokeWidth={1.6} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-[12px] outline-none w-full placeholder:text-mist"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-hairline">
            {conSaldo.map((r) => {
              const activa = seleccionada?.entidad.id === r.entidad.id;
              return (
                <button
                  key={r.entidad.id}
                  onClick={() => setEntidadId(r.entidad.id)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${activa ? 'bg-ice' : 'hover:bg-frost'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[13px] truncate ${activa ? 'text-blue-link font-medium' : 'text-carbon'}`}>
                      {r.entidad.nombre}
                    </span>
                    {r.vencidos > 0 && (
                      <span className="min-w-4 h-4 rounded-full bg-danger text-white text-[9px] font-semibold flex items-center justify-center px-1 shrink-0">
                        {r.vencidos}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-mist truncate">{r.docs.length} {nombreDocumento === 'documento' ? 'doc.' : `${nombreDocumento}${r.docs.length === 1 ? '' : 's'}`}</span>
                    <span className="text-[12px] tabular-nums text-ash shrink-0">{money(r.abierto)}</span>
                  </div>
                </button>
              );
            })}
            {conSaldo.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-mist">Sin resultados</div>}
          </div>
        </div>

        {/* ---------- 2. Cuentas de la entidad ---------- */}
        <div className="bg-white border border-hairline rounded-[8px] overflow-hidden">
          <div className="px-4 py-3 border-b border-hairline flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-carbon truncate">{seleccionada?.entidad.nombre ?? '—'}</div>
              <div className="text-[11.5px] text-ash">{seleccionada?.entidad.detalle}</div>
            </div>
            <div className="text-right">
              <div className="text-[17px] font-semibold tabular-nums text-carbon">{money(seleccionada?.abierto ?? 0)}</div>
              <div className="text-[11px] text-mist">{leyendaSaldo}</div>
            </div>
          </div>

          {docs.length === 0 ? (
            <EmptyState icon={Inbox} title={`Sin ${nombreDocumento}s`} message="No hay registros en este periodo. Cambia el filtro de arriba." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    {[nombreDocumento === 'documento' ? 'Documento' : nombreDocumento[0].toUpperCase() + nombreDocumento.slice(1), 'Monto', 'Vencimiento', 'Días', 'Estatus', ''].map((h, i) => (
                      <th key={h || i} className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap ${i === 1 || i === 3 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => {
                    const dias = diasVencidos(d.vencimiento);
                    const activo = doc?.id === d.id;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setDocId(d.id)}
                        className={`border-b border-hairline cursor-pointer transition-colors ${activo ? 'bg-ice' : 'hover:bg-haze'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="text-[12px] font-mono text-blue-link">{d.documento}</div>
                          {d.sub && <div className="text-[11px] text-ash truncate max-w-[220px]">{d.sub}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right tabular-nums font-medium whitespace-nowrap">{money(d.monto)}</td>
                        <td className="px-4 py-2.5 text-[12px] text-ash whitespace-nowrap">{formatDate(d.vencimiento)}</td>
                        <td className={`px-4 py-2.5 text-[12px] text-right tabular-nums whitespace-nowrap ${
                          d.estatus === estatusLiquidado || d.estatus === 'Cancelado' ? 'text-mist' : dias > umbralRojo ? 'text-danger font-medium' : dias > 0 ? 'text-warning' : 'text-ash'
                        }`}>
                          {d.estatus === estatusLiquidado || d.estatus === 'Cancelado' || Number.isNaN(dias) ? '—' : dias > 0 ? `${dias} vencidos` : dias === 0 ? 'hoy' : `en ${-dias}`}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Badge tone={estadoTone(d.estatus)}>{d.estatus}</Badge>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <ChevronRight size={14} className={activo ? 'text-blue-link' : 'text-pebble'} strokeWidth={1.8} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------- 3. Pago y contexto general ---------- */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-hairline rounded-[8px] overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline">
              <div className="text-[13px] font-semibold text-carbon">{doc ? doc.documento : etiquetaAccion}</div>
              <div className="text-[11px] text-ash mt-0.5">
                {doc ? `Detalle del ${nombreDocumento} seleccionado` : `Selecciona un ${nombreDocumento} de la lista`}
              </div>
            </div>

            {doc ? (
              <div className="px-4 py-3">
                <div className="text-[24px] font-semibold tabular-nums text-carbon leading-none mb-3">{money(doc.monto)}</div>
                <Renglon titulo="Vence" valor={formatDate(doc.vencimiento)} />
                <Renglon
                  titulo="Antigüedad"
                  valor={
                    doc.estatus === estatusLiquidado || Number.isNaN(diasVencidos(doc.vencimiento))
                      ? '—'
                      : diasVencidos(doc.vencimiento) > 0
                        ? `${diasVencidos(doc.vencimiento)} días vencidos`
                        : `${-diasVencidos(doc.vencimiento)} días por vencer`
                  }
                />
                <Renglon titulo="Estatus" valor={<Badge tone={estadoTone(doc.estatus)}>{doc.estatus}</Badge>} />
                {fichaDocumento?.(doc)}

                {doc.bloqueo && (
                  <div className="mt-3 border border-danger/30 bg-danger-wash rounded-[8px] px-3 py-2 text-[11.5px] text-danger leading-snug">
                    {doc.bloqueo}
                  </div>
                )}

                <div className="mt-3">
                  {doc.estatus === estatusLiquidado ? (
                    <div className="text-[12px] text-success text-center py-2">{nombreDocumento[0].toUpperCase() + nombreDocumento.slice(1)} {estatusLiquidado.toLowerCase()}</div>
                  ) : doc.estatus === 'Cancelado' ? (
                    <div className="text-[12px] text-mist text-center py-2">{nombreDocumento[0].toUpperCase() + nombreDocumento.slice(1)} cancelado</div>
                  ) : renderAccion && !doc.bloqueo ? (
                    renderAccion(doc)
                  ) : (
                    // El documento bloqueado no se libera, y el botón lo dice:
                    // dejarlo activo para que el clic rebote es pedirle al
                    // usuario que descubra la regla a golpes.
                    <Button className="w-full" disabled={!!doc.bloqueo} onClick={() => onAccion(doc.id)}>
                      {doc.bloqueo ? 'Pago bloqueado' : etiquetaAccion}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[12px] text-mist">
                Aquí se confirma el {nombreDocumento} y se ve su historial.
              </div>
            )}
          </div>

          {seleccionada && resumenEntidad && (
            <div className="bg-white border border-hairline rounded-[8px] overflow-hidden">
              <div className="px-4 py-3 border-b border-hairline">
                <div className="text-[13px] font-semibold text-carbon">Detalles generales</div>
                <div className="text-[11px] text-ash mt-0.5">{seleccionada.entidad.nombre}</div>
              </div>
              <div className="px-4 py-2">{resumenEntidad(seleccionada.entidad, docs)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { Renglon as RenglonCartera };
