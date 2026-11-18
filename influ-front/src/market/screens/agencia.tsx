import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import KpiCard from '../../components/ui/KpiCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { money, fechaHora } from '../../lib/format';
import { useMarket, estadoOferta, ofertaVigente, faltaParaDispersar } from '../useMarket';
import { asociada, fueraDeCondiciones, nuevoUuid, seguidoresDe, totalLineas } from '../logic';
import type { LineaPrecio, Postulacion } from '../types';
import { Estado, Pagina, Td, Th, Vacio, VerComo, k, useAgenciaActual, useNucleo } from '../ui';
import { Hilo, ListaHilos } from './comun';

const base = '/mk/agencia';

function useRoster() {
  const agenciaId = useAgenciaActual();
  const creadores = useMarket((s) => s.creadores);
  return { agenciaId, roster: creadores.filter((c) => c.agenciaId === agenciaId) };
}

export function Roster() {
  const s = useMarket();
  const { agencias, talentos } = useNucleo();
  const { agenciaId, roster } = useRoster();
  const ag = agencias.find((a) => a.id === agenciaId);
  const confirmados = talentos.filter((t) => t.agenciaId === agenciaId && t.representacion === 'Confirmada');
  const cts = s.contrataciones.filter((c) => roster.some((r) => r.id === c.creadorId));
  return (
    <Pagina titulo={`Roster en el marketplace · ${ag?.nombre ?? ''}`} sub="Tus talentos representados se contratan siempre a través de ti: confirmas precio y condiciones.">
      <VerComo tipo="agencia" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Talentos en el marketplace" value={String(roster.length)} note={`${confirmados.length} con representación confirmada`} />
        <KpiCard label="Con redes asociadas" value={String(roster.filter(asociada).length)} note="requisito para postularse" />
        <KpiCard label="Contrataciones" value={String(cts.length)} note={`${cts.filter((c) => c.estado !== 'Cerrada').length} en curso`} />
        <KpiCard label="Cobrado" value={money(cts.filter((c) => c.dispersion?.estado === 'Pagada').reduce((t, c) => t + c.tarifa, 0))} note="pagos automáticos a la agencia" />
      </div>
      <Panel title="Roster">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Talento', 'Redes', 'Temas', 'Tarifa mínima (reel)', 'Entregas a tiempo', 'Campañas', 'Estado'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{roster.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-0">
                <Td><span className="font-medium">{c.nombre}</span><div className="text-[11px] text-ash">{c.handle} · {k(seguidoresDe(c))}</div></Td>
                <Td>{c.redes.filter((r) => r.asociada).map((r) => r.red).join(', ') || <span className="text-warning">sin asociar</span>}</Td>
                <Td>{c.temas.join(', ')}</Td>
                <Td>{money(c.condiciones.tarifas[0]?.minimo ?? 0)}</Td>
                <Td>{c.historial.length ? `${Math.round(c.historial.filter((h) => h.aTiempo).length / c.historial.length * 100)}% · ${c.historial.length}` : 'Sin historial'}</Td>
                <Td>{s.contrataciones.filter((x) => x.creadorId === c.id).length}</Td>
                <Td><Estado e={asociada(c) ? 'Activa' : 'Borrador'}>{asociada(c) ? 'Puede postularse' : 'Falta asociar redes'}</Estado></Td>
              </tr>
            ))}</tbody>
          </table>
          {!roster.length && <Vacio texto="Sin talentos en el marketplace." />}
        </div>
      </Panel>
    </Pagina>
  );
}

function EditarPrecio({ p, onClose }: { p: Postulacion; onClose: () => void }) {
  const s = useMarket();
  const [l, setL] = useState<LineaPrecio[]>(p.lineas);
  return (
    <Modal open title="Editar precio" subtitle="La agencia fija la tarifa con la que se muestra a la marca" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (s.confirmarPostulacion(p.id, l)) onClose(); }}>Confirmar {money(totalLineas(l))}</Button></>}>
      <div className="flex flex-col gap-2">{l.map((x, i) => <Input key={i} label={`${x.formato} ${x.red}${x.cantidad > 1 ? ` × ${x.cantidad}` : ''}`} type="number" value={x.precio} onChange={(e) => setL(l.map((y, j) => j === i ? { ...y, precio: Number(e.target.value) } : y))} />)}</div>
    </Modal>
  );
}

export function PostulacionesAgencia() {
  const s = useMarket();
  const { roster } = useRoster();
  const [editar, setEditar] = useState<Postulacion | null>(null);
  const [revisar, setRevisar] = useState<Postulacion | null>(null);
  const ids = new Set(roster.map((r) => r.id));
  const pendientes = s.postulaciones.filter((p) => ids.has(p.creadorId) && p.estado === 'Por confirmar agencia');
  const convs = s.conversaciones.filter((c) => ids.has(c.creadorId));
  return (
    <Pagina titulo="Postulaciones de mi roster" sub="Confirma precio y condiciones antes de que lleguen a la marca">
      <VerComo tipo="agencia" />
      <Panel title={`Pendientes (${pendientes.length})`}>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Talento', 'Brief', 'Precio propuesto', 'Condiciones', ''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{pendientes.map((p) => {
              const c = s.creadores.find((x) => x.id === p.creadorId)!;
              const b = s.briefs.find((x) => x.id === p.briefId)!;
              const alertas = fueraDeCondiciones(c.condiciones, { lineas: p.lineas, usos: { ...b.estructurado.usos, tipos: b.estructurado.usos.tipos }, exclusividad: { dias: 0, categoria: '' }, rondas: 0, fechas: p.fechas });
              const licencia = alertas.find((a) => a.startsWith('Licencia'));
              return (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <Td>{c.nombre.split(' ').slice(0, 2).map((x, i) => i ? `${x[0]}.` : x).join(' ')}</Td>
                  <Td>{b.marca} · {b.titulo}</Td>
                  <Td>{money(totalLineas(p.lineas))}</Td>
                  <Td>{alertas.length ? <Estado e="Con observaciones">{licencia ? 'Licencia mayor a la aceptada' : alertas[0]}</Estado> : <Estado e="Dentro de sus condiciones" />}</Td>
                  <Td className="text-right"><span className="inline-flex gap-1.5">
                    {alertas.length ? <Button size="sm" variant="outlined" onClick={() => setRevisar(p)}>Revisar</Button> : <><Button size="sm" onClick={() => s.confirmarPostulacion(p.id)}>Confirmar</Button><Button size="sm" variant="ghost" onClick={() => setEditar(p)}>Editar</Button></>}
                  </span></Td>
                </tr>
              );
            })}</tbody>
          </table>
          {!pendientes.length && <Vacio texto="Nada por confirmar." />}
        </div>
      </Panel>
      <Panel title="Ofertas en curso">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Talento', 'Marca', 'Oferta', 'Estado', ''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{convs.map((cv) => { const o = ofertaVigente(cv); const c = s.creadores.find((x) => x.id === cv.creadorId)!; const b = s.briefs.find((x) => x.id === cv.briefId)!; return (
              <tr key={cv.id} className="border-b border-hairline last:border-0">
                <Td>{c.nombre.split(' ').slice(0, 2).map((x, i) => i ? `${x[0]}.` : x).join(' ')}</Td><Td>{b.marca}</Td>
                <Td>{o ? `v${o.version} · ${money(totalLineas(o.lineas))}` : '—'}</Td>
                <Td>{o ? <Estado e={estadoOferta(o)}>{estadoOferta(o) === 'Contraoferta' && o.lado === 'Agencia' ? 'Contraoferta enviada' : estadoOferta(o)}</Estado> : <Estado e="Borrador">Sin oferta</Estado>}</Td>
                <Td><Link to={`${base}/ofertas/${cv.id}`} className="text-blue-link text-[12px]">Abrir chat</Link></Td>
              </tr>); })}</tbody>
          </table>
        </div>
      </Panel>
      {editar && <EditarPrecio p={editar} onClose={() => setEditar(null)} />}
      {revisar && (
        <Modal open title="Revisar postulación" subtitle="Queda fuera de las condiciones aceptables del talento" onClose={() => setRevisar(null)}
          footer={<><Button variant="ghost" onClick={() => setRevisar(null)}>Cerrar</Button><Button variant="outlined" onClick={() => { setEditar(revisar); setRevisar(null); }}>Editar precio</Button><Button onClick={() => { if (s.confirmarPostulacion(revisar.id)) setRevisar(null); }}>Confirmar de todos modos</Button></>}>
          {(() => { const c = s.creadores.find((x) => x.id === revisar.creadorId)!; const b = s.briefs.find((x) => x.id === revisar.briefId)!; return (
            <div className="text-[13px] text-smoke flex flex-col gap-2">
              <div>{c.handle} → {b.marca} · {b.titulo} · {money(totalLineas(revisar.lineas))}</div>
              <ul className="list-disc pl-5 text-warning">{fueraDeCondiciones(c.condiciones, { lineas: revisar.lineas, usos: b.estructurado.usos, exclusividad: { dias: 0, categoria: '' }, rondas: 0, fechas: revisar.fechas }).map((a) => <li key={a}>{a}</li>)}</ul>
              <div className="text-ash">El brief pide {b.estructurado.usos.tipos.join(' + ')} por {b.estructurado.usos.meses} meses.</div>
            </div>); })()}
        </Modal>
      )}
    </Pagina>
  );
}

export function OfertasAgencia() {
  const { id } = useParams();
  const s = useMarket();
  const { roster } = useRoster();
  if (id) return <Pagina titulo="Oferta" right={<Link to={`${base}/ofertas`}><Button variant="ghost">Todas</Button></Link>}><Hilo convId={id} /></Pagina>;
  const ids = new Set(roster.map((r) => r.id));
  return <Pagina titulo="Ofertas" sub="Contraofertas por tus talentos, versionadas en el chat"><VerComo tipo="agencia" /><Panel><ListaHilos convs={s.conversaciones.filter((c) => ids.has(c.creadorId))} ruta={(x) => `${base}/ofertas/${x}`} /></Panel></Pagina>;
}

export function CobrosAgencia() {
  const s = useMarket();
  const { agencias } = useNucleo();
  const { agenciaId, roster } = useRoster();
  const ag = agencias.find((a) => a.id === agenciaId);
  const cts = s.contrataciones.filter((c) => roster.some((r) => r.id === c.creadorId) && c.beneficiario.tipo === 'Agencia').sort((a, b) => b.aceptada.localeCompare(a.aceptada));
  const [uuid, setUuid] = useState<Record<string, string>>({});
  return (
    <Pagina titulo="Cobros" sub="Firma los acuerdos de tus talentos y sube tu CFDI a Influ: al aprobar la marca, el pago sale solo">
      <VerComo tipo="agencia" />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Cobrado" value={money(cts.filter((c) => c.dispersion?.estado === 'Pagada').reduce((t, c) => t + c.tarifa, 0))} />
        <KpiCard label="Por cobrar" value={money(cts.filter((c) => c.dispersion?.estado !== 'Pagada').reduce((t, c) => t + c.tarifa, 0))} note="se paga al aprobar el contenido" />
        <KpiCard label="Acuerdos por firmar" value={String(cts.filter((c) => !c.acuerdo.creador).length)} />
      </div>
      <Panel>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Talento', 'Campaña', 'Tarifa', 'Acuerdo', 'CFDI a Influ', 'Pago', ''].map((h) => <Th key={h} right={h === 'Tarifa'}>{h}</Th>)}</tr></thead>
            <tbody>{cts.map((c) => { const cr = s.creadores.find((x) => x.id === c.creadorId)!; const b = s.briefs.find((x) => x.id === c.briefId)!; const falta = faltaParaDispersar(s, c); return (
              <tr key={c.id} className="border-b border-hairline last:border-0 align-top">
                <Td>{cr.handle}</Td><Td>{b.marca} · {b.titulo}</Td><Td right>{money(c.tarifa)}</Td>
                <Td>{c.acuerdo.creador ? <span className="text-success text-[12px]">Firmado {fechaHora(c.acuerdo.creador)}</span> : <Button size="sm" onClick={() => s.firmarAcuerdo(c.id)}>Firmar</Button>}</Td>
                <Td>{c.cfdi?.validado ? <Estado e="Aceptada">Validado</Estado> : (
                  <span className="flex gap-1.5 items-center">
                    <input value={uuid[c.id] ?? ''} onChange={(e) => setUuid({ ...uuid, [c.id]: e.target.value })} placeholder="UUID del CFDI" className="border border-hairline rounded-[6px] px-2 py-1 text-[12px] w-56 font-mono" />
                    <button onClick={() => setUuid({ ...uuid, [c.id]: nuevoUuid(c.id + 'x') })} className="text-[11px] text-ash hover:underline">ejemplo</button>
                    <Button size="sm" variant="outlined" onClick={() => s.subirCfdi(c.id, `${ag?.nombre ?? 'agencia'}_${c.id}.xml`.replace(/\s/g, '_'), uuid[c.id] ?? '', ag?.rfc ?? '', c.tarifa)}>Validar</Button>
                    {c.cfdi?.motivo && <span className="text-[11px] text-danger">{c.cfdi.motivo}</span>}
                  </span>)}</Td>
                <Td>{c.dispersion ? <Estado e={c.dispersion.estado} /> : <span className="text-[11px] text-mist">{falta.length ? `falta ${falta.join(', ')}` : 'al aprobar la marca'}</span>}</Td>
                <Td>{c.dispersion?.estado === 'Pagada' ? <span className="text-[11px] text-ash">{fechaHora(c.dispersion.fechaHora)}</span> : null}</Td>
              </tr>); })}</tbody>
          </table>
          {!cts.length && <Vacio texto="Sin cobros todavía." />}
        </div>
      </Panel>
    </Pagina>
  );
}
