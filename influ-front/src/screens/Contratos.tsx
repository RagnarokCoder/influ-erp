import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileCheck2, FileSignature, Landmark, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { Fila } from '../components/ui/Fila';
import { useInflu, useVista } from '../store/useInflu';
import {
  contratoGenerado, corto, documentoUnico, estadoContrato, estadoRug, factorado, faltanDatosContrato, porId,
  type EstadoContrato,
} from '../lib/derive';
import { fechaHora, formatDate, money } from '../lib/format';
import { HOY_ISO, INFLU } from '../data/constantes';
import type { Operacion } from '../data/types';

const FILTROS: (EstadoContrato | 'Todos')[] = ['Todos', 'Por firmar', 'Firmado', 'Faltan datos'];

// Pantalla nueva (cambio 23): el contrato de factoraje como documento único con
// sus anexos A, B y C. Se firma primero y después se inscribe en el RUG. Vive en
// el panel interno entre Revisión y RUG. Solo los contratos firmados pasan al RUG.
export const Contratos = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const v = useVista();
  const s = useInflu();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos');

  const estado = (o: Operacion) => estadoContrato(o, v);
  const generados = v.operaciones.filter(contratoGenerado);
  const lista = generados
    .filter((o) => filtro === 'Todos' || estado(o) === filtro)
    .sort((a, b) => (b.docusign?.enviado ?? '').localeCompare(a.docusign?.enviado ?? ''));
  const sel = lista.find((o) => o.id === params.get('id')) ?? lista[0];

  const porFirmar = generados.filter((o) => estado(o) === 'Por firmar');
  const firmadosMes = generados.filter((o) => o.docusign?.firmado && o.docusign.firmado.slice(0, 7) === HOY_ISO.slice(0, 7));
  const sinInscribir = generados.filter((o) => estado(o) === 'Firmado' && o.rug?.estado === 'En cola');
  const incompletos = generados.filter((o) => estado(o) === 'Faltan datos');

  const badge = (o: Operacion) => {
    const e = estado(o);
    const desde = o.docusign?.firmado ?? o.docusign?.enviado;
    return e === 'Firmado' ? <Badge tone="success">Firmado</Badge>
      : e === 'Por firmar' ? <Badge tone="warning">Por firmar{desde ? ` · desde ${formatDate(desde.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''}</Badge>
        : e === 'Faltan datos' ? <Badge tone="danger">Faltan datos</Badge> : <Badge tone="neutral">—</Badge>;
  };
  const rugBadge = (o: Operacion) => {
    const e = estadoRug(o);
    if (!o.rug) return <span className="text-mist">—</span>;
    return e === 'Inscrita' || e === 'Actualizada' ? <Badge tone="success">Inscrito</Badge>
      : e === 'En cola' ? <Badge tone="warning">En cola</Badge> : <Badge tone="neutral">{e}</Badge>;
  };
  const nombreFactorado = (o: Operacion) => o.solicitante === 'Agencia'
    ? porId(v.agencias, o.agenciaId)?.nombre ?? '—'
    : `${corto(porId(v.talentos, o.talentoId)?.nombre ?? '')} · indep.`;

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Por firmar" value={String(porFirmar.length)} note="enviados a DocuSign" icon={FileSignature} />
        <KpiCard label="Firmados este mes" value={String(firmadosMes.length)} note="documento único completo" icon={FileCheck2} />
        <KpiCard label="Firmados sin inscribir en el RUG" value={String(sinInscribir.length)} note={sinInscribir.map((o) => o.folio).join(', ') || 'ninguno'} icon={Landmark} />
        <KpiCard label="Con datos incompletos" value={String(incompletos.length)} note="no se puede generar" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-4 items-start">
        <Panel title="Documento único por operación" subtitle="Contrato de factoraje con anexos A (factura), B (pagaré) y C (firma electrónica)"
          right={<div className="w-[190px]"><Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>{FILTROS.map((f) => <option key={f} value={f}>{f === 'Todos' ? 'Todos los estados' : f}</option>)}</Select></div>}>
          {lista.length === 0 ? <EmptyState icon={FileCheck2} title="Sin contratos" message="El documento único se genera cuando el equipo aprueba la factura y el contrato." /> : (
            <div className="border-t border-hairline overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-hairline">{['Op.', 'Factorado', 'Marca', 'Monto', 'Contrato', 'RUG'].map((h) => <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap ${h === 'Monto' ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id} onClick={() => setParams({ id: o.id })} className={`border-b border-hairline cursor-pointer ${sel?.id === o.id ? 'bg-ice' : 'hover:bg-haze'}`}>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link whitespace-nowrap">#{o.folio.slice(-4)}</td>
                      <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{nombreFactorado(o)}</td>
                      <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{porId(v.marcas, o.marcaId)?.nombre}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right tabular-nums whitespace-nowrap">{money(o.monto)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{badge(o)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{rugBadge(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 text-[11.5px] text-mist border-t border-hairline">Una operación aprobada genera un documento único con los datos llenados. Si falta un dato para algún [●], no se genera y queda en "Faltan datos". Solo los contratos firmados pasan a la sección RUG.</div>
        </Panel>

        {sel && (() => {
          const doc = documentoUnico(sel, v);
          const faltan = faltanDatosContrato(sel, v);
          const fac = factorado(sel, v);
          return (
            <Panel title={`#${sel.folio.slice(-4)} · Documento único`} subtitle={`${doc.archivo} · ${doc.paginas} págs.`} right={badge(sel)}>
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-4">
                {faltan.length > 0 && (
                  <div className="border border-danger/30 bg-danger-wash rounded-[8px] px-3 py-2 text-[12px] text-danger">
                    No se puede generar: falta {faltan.join(', ')}. Ningún [●] puede quedar vacío al firmar.
                  </div>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-mist font-medium mb-2">Contenido del documento</div>
                  <div className="flex flex-col gap-2">
                    {doc.partes.map((p) => (
                      <div key={p.clave} className="flex items-start gap-2.5">
                        {doc.firmado ? <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" /> : <Circle size={15} className="text-mist shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-carbon">{p.etiqueta}</div>
                          <div className="text-[11px] text-ash">{p.detalle}</div>
                        </div>
                        <div className="text-[11px] text-ash whitespace-nowrap text-right">{doc.firmado ? `firmado · pág. ${p.firmaPagina}` : `pág. ${p.desde}${p.hasta !== p.desde ? `–${p.hasta}` : ''}`}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-hairline pt-3">
                  <div className="text-[11px] uppercase tracking-wide text-mist font-medium mb-2">Firmas</div>
                  <div className="text-[12px]">
                    <Fila t={fac.razonSocial} v={doc.firmantes[0].nombre} nota={doc.firmantes[0].fecha ? fechaHora(doc.firmantes[0].fecha) : 'por firmar'} />
                    <Fila t={INFLU.razonSocial} v={INFLU.apoderado} nota={doc.firmantes[1].fecha ? fechaHora(doc.firmantes[1].fecha) : 'por firmar'} />
                    <Fila t="Certificado DocuSign" v={doc.firmado ? `Sobre ${doc.sobre}` : '—'} nota={doc.firmado ? '4 de 4 firmas en un solo sobre' : 'un solo sobre para las 4 partes'} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!doc.firmado} onClick={() => s.registrarAperturaContrato(sel.id, 'Apertura')}>Ver documento</Button>
                  <Button size="sm" variant="outlined" disabled={!doc.firmado} onClick={() => s.registrarAperturaContrato(sel.id, 'Descarga')}>Descargar PDF</Button>
                  <Button size="sm" variant="ghost" disabled={!doc.firmado} onClick={() => s.toast(`En el sistema real se descarga el certificado de firma de ${sel.folio}.`, 'warn')}>Descargar certificado</Button>
                  {sel.rug && <Button size="sm" variant="ghost" onClick={() => navigate(`/rug?id=${sel.id}`)}>Ir a RUG →</Button>}
                </div>
                <div className="text-[11px] text-mist">
                  {doc.firmado
                    ? 'Guardado en la operación: no se puede borrar ni reemplazar. Cada apertura y descarga queda en la bitácora.'
                    : 'Cuando el solicitante lo firme en DocuSign, el documento queda guardado y pasa a la sección RUG.'}
                </div>
              </div>
            </Panel>
          );
        })()}
      </div>
    </div>
  );
};
