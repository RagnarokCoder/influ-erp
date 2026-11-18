import { useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import KpiCard from '../../components/ui/KpiCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import MiniBar from '../../components/ui/MiniBar';
import { money, fechaHora, formatDate } from '../../lib/format';
import { HOY_ISO } from '../../data/constantes';
import { useMarket, creditoUsado, faltaParaDispersar, modoRevision } from '../useMarket';
import { FEE_INFLU, MUESTREO_CADA, PESOS, UMBRAL_MUESTREO, fee, seguidoresDe, ultimo } from '../logic';
import type { ComponentesScore, CuentaMarca } from '../types';
import { Chip, Estado, Fila, Pagina, Score, Td, Th, Vacio, k, useNombreEmpresa, useNucleo } from '../ui';
import { Hilo } from './comun';

const minutos = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 6e4;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

// ---------------------------------------------------------------------------
// Resumen del equipo: criterios de éxito (MVP Fase 2 §19)
// ---------------------------------------------------------------------------

export function ResumenEquipo() {
  const s = useMarket();
  const conResultado = s.contrataciones.filter((c) => c.publicacion);
  const porEmpresa = new Map<string, Set<string>>();
  s.contrataciones.forEach((c) => porEmpresa.set(c.empresaId, (porEmpresa.get(c.empresaId) ?? new Set()).add(c.briefId)));
  const recontratan = [...porEmpresa.values()].filter((x) => x.size >= 2).length;
  const h = s.historialDistribuciones.slice(-30);
  const sinReemplazo = pct(h.filter(Boolean).length, h.length);
  const horasSel = s.briefs.filter((b) => b.publicado && s.contrataciones.some((c) => c.briefId === b.id))
    .map((b) => { const primera = s.contrataciones.filter((c) => c.briefId === b.id).map((c) => c.aceptada).sort()[0]; return minutos(b.publicado!, primera) / 60; });
  const conPostulaciones = s.briefs.filter((b) => b.distribuido).map((b) => { const p = s.postulaciones.filter((x) => x.briefId === b.id && x.estado === 'Preseleccionado' || x.briefId === b.id && x.estado === 'Contratado').map((x) => x.fecha).sort()[0]; return p ? minutos(b.publicado ?? b.creado, p) / 60 : null; }).filter((x): x is number => x !== null);
  const aprobadas = s.contrataciones.filter((c) => c.aprobada);
  const primeraRonda = aprobadas.filter((c) => c.entregas.find((e) => e.estado === 'Aprobada')?.ronda === 1);
  const auto = conResultado.filter((c) => c.publicacion?.estado === 'Verificada' && !c.publicacion.revisadaPor);
  const pagadas = s.contrataciones.filter((c) => c.dispersion?.estado === 'Pagada' && c.aprobada);
  const enHora = pagadas.filter((c) => minutos(c.aprobada!.fechaHora, c.dispersion!.fechaHora) <= 60);
  const criterios = [
    { t: 'Contrataciones con resultado registrado', v: String(conResultado.length), meta: '≥ 300', avance: pct(conResultado.length, 300) },
    { t: 'Marcas que recontratan', v: String(recontratan), meta: '≥ 30', avance: pct(recontratan, 30) },
    { t: 'Selecciones del matching aceptadas sin reemplazo', v: `${sinReemplazo}%`, meta: '≥ 50%', avance: Math.min(100, sinReemplazo * 2) },
    { t: 'Brief → selección', v: horasSel.length ? `${Math.round(horasSel.reduce((a, b) => a + b, 0) / horasSel.length)} h` : '—', meta: '< 24 h', avance: horasSel.length ? Math.min(100, Math.round(24 / Math.max(1, horasSel.reduce((a, b) => a + b, 0) / horasSel.length) * 100)) : 0, nota: conPostulaciones.length ? `preselección promedio ${Math.round(conPostulaciones.reduce((a, b) => a + b, 0) / conPostulaciones.length)} h` : '' },
    { t: 'Contenidos aprobados en la primera ronda', v: `${pct(primeraRonda.length, aprobadas.length)}%`, meta: 'medir', avance: pct(primeraRonda.length, aprobadas.length) },
    { t: 'Publicaciones verificadas sin revisión manual', v: `${pct(auto.length, conResultado.length)}%`, meta: 'medir', avance: pct(auto.length, conResultado.length) },
    { t: 'Pagos dentro de la hora siguiente a la aprobación', v: `${pct(enHora.length, pagadas.length)}%`, meta: 'medir', avance: pct(enHora.length, pagadas.length) },
  ];
  const abiertos = s.casos.filter((c) => c.estado === 'Abierto');
  const pendientesRanking = s.rankings.filter((r) => !r.distribuido);
  return (
    <Pagina titulo="Marketplace · Equipo Influ" sub="Lanzamiento por invitación: el equipo da de alta a las marcas y revisa el matching">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Marcas con cuenta" value={String(s.cuentas.filter((c) => c.estado === 'Activa').length)} note={`${s.cuentas.filter((c) => c.estado !== 'Activa').length} invitaciones abiertas`} />
        <KpiCard label="Rankings por revisar" value={String(pendientesRanking.length)} note={`modo ${modoRevision(s).toLowerCase()}`} />
        <KpiCard label="Fee generado" value={money(s.contrataciones.reduce((t, c) => t + c.fee, 0))} note={`${Math.round(FEE_INFLU * 100)}% sobre tarifas`} />
        <KpiCard label="Casos abiertos" value={String(abiertos.length)} note="moderación, disputas e incumplimientos" />
      </div>
      <Panel title="Criterios de éxito" subtitle="MVP Fase 2 · se miden con lo que registra la plataforma">
        <div className="border-t border-hairline divide-y divide-hairline">
          {criterios.map((c) => (
            <div key={c.t} className="px-5 py-3 grid grid-cols-[minmax(0,1fr)_90px_70px_160px] gap-3 items-center">
              <span className="text-[13px] text-carbon">{c.t}{c.nota && <span className="block text-[11px] text-mist">{c.nota}</span>}</span>
              <span className="text-[15px] font-semibold tabular-nums text-right">{c.v}</span>
              <span className="text-[11px] text-ash">meta {c.meta}</span>
              <MiniBar value={c.avance} max={100} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Bitácora del marketplace" subtitle="Registro inmutable de cada movimiento">
        <div className="border-t border-hairline max-h-[420px] overflow-y-auto divide-y divide-hairline">
          {s.bitacora.map((b) => (
            <div key={b.id} className="px-5 py-2 grid grid-cols-[110px_150px_130px_minmax(0,1fr)] gap-3 text-[12.5px]">
              <span className="text-mist tabular-nums">{fechaHora(b.fechaHora)}</span><span className="text-carbon truncate">{b.usuario}</span><span className="text-ash">{b.modulo} · {b.accion}</span><span className="text-smoke">{b.detalle}</span>
            </div>
          ))}
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Revisión del matching
// ---------------------------------------------------------------------------

export function Matching() {
  const s = useMarket();
  const pendientes = s.rankings.filter((r) => !r.distribuido);
  const [rid, setRid] = useState<string>(pendientes[0]?.id ?? s.rankings[s.rankings.length - 1]?.id ?? '');
  const r = s.rankings.find((x) => x.id === rid);
  const [incl, setIncl] = useState<Record<string, string[]>>({});
  const [pesos, setPesos] = useState<ComponentesScore | null>(null);
  const b = r && s.briefs.find((x) => x.id === r.briefId);
  const sel = r ? incl[r.id] ?? r.items.filter((i) => i.incluido).map((i) => i.creadorId) : [];
  const h = s.historialDistribuciones.slice(-30);
  const modo = modoRevision(s);
  const pp = pesos ?? s.pesos;
  const sumaPesos = Object.values(pp).reduce((a, x) => a + x, 0);
  return (
    <Pagina titulo={`Revisión del matching${b ? ` · ${b.marca} ${b.titulo}` : ''}`} sub="Ranking antes de distribuir · la IA propone, el equipo confirma"
      right={<Select value={rid} onChange={(e) => setRid(e.target.value)}>{s.rankings.slice().reverse().map((x) => { const bb = s.briefs.find((y) => y.id === x.briefId); return <option key={x.id} value={x.id}>{`${x.id} · ${bb?.marca} ${bb?.titulo}${x.distribuido ? ' · distribuido' : ' · por revisar'}`}</option>; })}</Select>}>
      {r && b ? (
        <Panel title="Top 20 del ranking" subtitle={`Generado ${fechaHora(r.fechaHora)} · ${r.distribuido ? `distribuido ${fechaHora(r.distribuido)}${r.revision ? ` por ${r.revision.usuario} (${r.revision.cambios} cambios)` : ' por muestreo, sin revisión'}` : 'espera revisión'}`}
          right={!r.distribuido && <Button onClick={() => s.revisarRanking(r.id, sel)}>Distribuir a {sel.length} creadores</Button>}>
          <div className="overflow-x-auto border-t border-hairline">
            <table className="w-full"><thead><tr className="border-b border-hairline">{['#', 'Creador', 'Score', 'Contenido', 'Audiencia', 'Precio', 'Cumplimiento', 'Disponib.', 'Explicación', 'Incluir'].map((x) => <Th key={x}>{x}</Th>)}</tr></thead>
              <tbody>{r.items.map((i) => { const c = s.creadores.find((x) => x.id === i.creadorId)!; return (
                <tr key={i.creadorId} className={`border-b border-hairline last:border-0 ${i.conflicto ? 'bg-danger-wash/40' : ''}`}>
                  <Td>{i.posicion}</Td>
                  <Td><span className="font-medium">{c.handle}</span><div className="text-[11px] text-ash">{k(seguidoresDe(c))}</div></Td>
                  <Td><Score valor={i.score} chico /></Td>
                  <Td right>{i.componentes.contenido}</Td><Td right>{i.componentes.audiencia}</Td>
                  <Td>{i.sobrePresupuesto ? <span className="text-warning">Sobre presupuesto</span> : '✓'}</Td>
                  <Td>{c.historial.length ? `${i.componentes.cumplimiento}%` : 'Sin historial'}</Td>
                  <Td right>{i.componentes.disponibilidad}</Td>
                  <Td className="whitespace-normal min-w-[240px] text-[12px] text-ash">{i.conflicto ? <span className="text-danger">{i.conflicto}</span> : i.explicacion}</Td>
                  <Td><input type="checkbox" className="accent-blue" disabled={!!r.distribuido || !!i.conflicto} checked={sel.includes(i.creadorId)} onChange={() => setIncl({ ...incl, [r.id]: sel.includes(i.creadorId) ? sel.filter((x) => x !== i.creadorId) : [...sel, i.creadorId] })} /></Td>
                </tr>); })}</tbody>
            </table>
          </div>
        </Panel>
      ) : <Vacio texto="Sin rankings." />}
      <div className="bg-ice rounded-[8px] px-4 py-3 text-[13px] text-smoke border-l-4 border-blue">
        Últimas {h.length} distribuciones: {pct(h.filter(Boolean).length, h.length)}% de las selecciones de la IA aceptadas sin cambios. Revisión {modo === 'Completa' ? `completa hasta llegar a ${Math.round(UMBRAL_MUESTREO * 100)}%` : `por muestreo (uno de cada ${MUESTREO_CADA} briefs)`}.
      </div>
      <Panel title="Pesos del score" subtitle="El matching arranca con reglas y pesos ajustables; aprende de lo que eligen las marcas">
        <div className="border-t border-hairline px-5 py-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          {(Object.keys(PESOS) as (keyof ComponentesScore)[]).map((kk) => <Input key={kk} label={kk} type="number" step={0.01} value={pp[kk]} onChange={(e) => setPesos({ ...pp, [kk]: Number(e.target.value) })} />)}
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <Button size="sm" variant="outlined" disabled={!pesos || Math.abs(sumaPesos - 1) > 0.01} onClick={() => { s.ajustarPesos(pp); setPesos(null); }}>Guardar pesos</Button>
          <span className={`text-[12px] ${Math.abs(sumaPesos - 1) > 0.01 ? 'text-danger' : 'text-ash'}`}>Suman {Math.round(sumaPesos * 100)}% (deben sumar 100%)</span>
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Propuestas de venta directa
// ---------------------------------------------------------------------------

export function Propuestas() {
  const s = useMarket();
  const nombre = useNombreEmpresa();
  const [pid, setPid] = useState(s.propuestas[0]?.id ?? '');
  const [nueva, setNueva] = useState({ empresaId: 'EMP-01', titulo: '' });
  const [agregar, setAgregar] = useState('');
  const p = s.propuestas.find((x) => x.id === pid);
  const tarifas = p?.lineas.reduce((t, l) => t + l.tarifa, 0) ?? 0;
  const vmin = p?.lineas.reduce((t, l) => t + l.vistasMin, 0) ?? 0;
  const vmax = p?.lineas.reduce((t, l) => t + l.vistasMax, 0) ?? 0;
  return (
    <Pagina titulo="Propuestas de venta directa" sub="La puerta de entrada para marcas que llegan por venta y no publican un brief">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
        <Panel title="Propuestas">
          <div className="border-t border-hairline divide-y divide-hairline">
            {s.propuestas.map((x) => <button key={x.id} onClick={() => setPid(x.id)} className={`w-full text-left px-4 py-2.5 ${x.id === pid ? 'bg-ice' : 'hover:bg-frost'}`}><span className="block text-[13px] text-carbon">{x.titulo}</span><span className="flex items-center justify-between text-[11px] text-ash">{nombre(x.empresaId)} <Estado e={x.estado} /></span></button>)}
          </div>
          <div className="border-t border-hairline px-4 py-3 flex flex-col gap-2">
            <Select value={nueva.empresaId} onChange={(e) => setNueva({ ...nueva, empresaId: e.target.value })}>{s.cuentas.map((c) => <option key={c.empresaId} value={c.empresaId}>{nombre(c.empresaId)}</option>)}</Select>
            <Input placeholder="Título, ej. Porsche · Cayenne" value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
            <Button size="sm" onClick={() => { const id = s.crearPropuesta(nueva.empresaId, nueva.titulo); if (id) { setPid(id); setNueva({ ...nueva, titulo: '' }); } }}>Nueva propuesta</Button>
          </div>
        </Panel>
        {p ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-4 items-start">
            <Panel title="Creadores propuestos" subtitle={`Para: ${nombre(p.empresaId)} · la marca la recibe como link`}>
              <div className="overflow-x-auto border-t border-hairline">
                <table className="w-full"><thead><tr className="border-b border-hairline">{['Creador', 'Vistas estimadas', 'CPM hist.', 'Tarifa', ''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                  <tbody>{p.lineas.map((l) => { const c = s.creadores.find((x) => x.id === l.creadorId)!; return (
                    <tr key={l.creadorId} className="border-b border-hairline last:border-0"><Td>{c.handle}</Td><Td>{k(l.vistasMin)}–{k(l.vistasMax)}</Td><Td>{money(l.cpm)}</Td><Td>{money(l.tarifa)}</Td>
                      <Td>{p.estado === 'Borrador' && <button onClick={() => s.editarPropuesta(p.id, p.lineas.filter((x) => x.creadorId !== l.creadorId).map((x) => x.creadorId))} className="text-[11px] text-danger">Quitar</button>}</Td></tr>); })}</tbody>
                </table>
              </div>
              {p.estado === 'Borrador' && (
                <div className="px-5 py-3 flex gap-2 items-end">
                  <div className="flex-1"><Select value={agregar} onChange={(e) => setAgregar(e.target.value)} placeholder="+ Agregar creador">{s.creadores.filter((c) => !p.lineas.some((l) => l.creadorId === c.id)).map((c) => <option key={c.id} value={c.id}>{`${c.handle} · ${k(c.vistasMedianas)} vistas · CPM ${money(c.cpmHistorico)}`}</option>)}</Select></div>
                  <Button size="sm" variant="outlined" disabled={!agregar} onClick={() => { s.editarPropuesta(p.id, [...p.lineas.map((x) => x.creadorId), agregar]); setAgregar(''); }}>Agregar creador</Button>
                </div>
              )}
            </Panel>
            <Panel title="Resumen" right={<Estado e={p.estado} />}>
              <div className="border-t border-hairline px-5 py-3">
                <Fila t="Tarifas" v={money(tarifas)} />
                <Fila t={`Fee Influ (${Math.round(FEE_INFLU * 100)}%)`} v={money(fee(tarifas))} />
                <Fila t="Total" v={money(tarifas + fee(tarifas))} fuerte />
                <Fila t="Vistas estimadas" v={`${k(vmin)}–${k(vmax)}`} />
                <Fila t="CPM estimado" v={vmax ? money(Math.round(tarifas / ((vmin + vmax) / 2) * 1000)) : '—'} />
                {p.estado === 'Borrador' && <Button className="mt-3" onClick={() => s.enviarPropuesta(p.id)}>Enviar link a la marca</Button>}
                {p.estado !== 'Borrador' && <div className="mt-3 text-[12px] text-ash">Link: <Link to={`/propuesta/${p.token}`} className="text-blue-link font-mono">/propuesta/{p.token}</Link>{p.vista ? ` · vista ${fechaHora(p.vista)}` : ''}{p.aceptada ? ` · aceptada por ${p.aceptada.por}` : ''}</div>}
              </div>
            </Panel>
          </div>
        ) : <Vacio texto="Crea una propuesta." />}
      </div>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Marcas: invitación, condición de pago y límite de crédito
// ---------------------------------------------------------------------------

export function MarcasEquipo() {
  const s = useMarket();
  const { empresas } = useNucleo();
  const nombre = useNombreEmpresa();
  const libres = empresas.filter((e) => !s.cuentas.some((c) => c.empresaId === e.id) && !e.lista69b);
  const [inv, setInv] = useState<{ empresaId: string; condicion: CuentaMarca['condicion'] }>({ empresaId: '', condicion: { tipo: 'Prepago', dias: 0, limite: 0 } });
  const [edit, setEdit] = useState<Record<string, CuentaMarca['condicion']>>({});
  // El límite se sugiere con el historial de pago de Fase 1 (días reales contra pactados).
  return (
    <Pagina titulo="Marcas del marketplace" sub="Alta por invitación · prepago por defecto; plazo solo para marcas aprobadas, con límite de crédito según su historial de pago">
      <Panel title="Invitar una marca">
        <div className="border-t border-hairline px-5 py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_120px_160px_auto] gap-3 items-end">
          <Select label="Empresa" value={inv.empresaId} onChange={(e) => setInv({ ...inv, empresaId: e.target.value })}>{libres.map((e) => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}</Select>
          <Select label="Condición" value={inv.condicion.tipo} onChange={(e) => setInv({ ...inv, condicion: { ...inv.condicion, tipo: e.target.value as 'Prepago' | 'Plazo' } })}><option value="Prepago">Prepago</option><option value="Plazo">Plazo</option></Select>
          <Input label="Días" type="number" disabled={inv.condicion.tipo === 'Prepago'} value={inv.condicion.dias || ''} onChange={(e) => setInv({ ...inv, condicion: { ...inv.condicion, dias: Number(e.target.value) } })} />
          <Input label="Límite de crédito" type="number" disabled={inv.condicion.tipo === 'Prepago'} value={inv.condicion.limite || ''} onChange={(e) => setInv({ ...inv, condicion: { ...inv.condicion, limite: Number(e.target.value) } })} />
          <Button disabled={!inv.empresaId} onClick={() => { if (s.invitarMarca(inv.empresaId, inv.condicion)) setInv({ empresaId: '', condicion: { tipo: 'Prepago', dias: 0, limite: 0 } }); }}>Invitar</Button>
        </div>
      </Panel>
      <Panel title="Cuentas">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Empresa', 'Estado', 'Usuarios', 'Condición', 'Crédito usado', 'Briefs', 'Link de alta', ''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{s.cuentas.map((c) => { const e = edit[c.empresaId]; const usado = creditoUsado(s, c.empresaId); return (
              <tr key={c.empresaId} className="border-b border-hairline last:border-0 align-top">
                <Td><span className="font-medium">{nombre(c.empresaId)}</span><div className="text-[11px] text-ash">{c.marcas.join(', ') || 'sin marcas todavía'}</div></Td>
                <Td><Estado e={c.estado} /></Td>
                <Td>{c.equipo.length}</Td>
                <Td>{e ? (
                  <span className="flex gap-1.5 items-center">
                    <select value={e.tipo} onChange={(x) => setEdit({ ...edit, [c.empresaId]: { ...e, tipo: x.target.value as 'Prepago' | 'Plazo' } })} className="border border-hairline rounded-[6px] text-[12px] px-1 py-1"><option>Prepago</option><option>Plazo</option></select>
                    <input type="number" value={e.dias} onChange={(x) => setEdit({ ...edit, [c.empresaId]: { ...e, dias: Number(x.target.value) } })} className="w-14 border border-hairline rounded-[6px] text-[12px] px-1 py-1" placeholder="días" />
                    <input type="number" value={e.limite} onChange={(x) => setEdit({ ...edit, [c.empresaId]: { ...e, limite: Number(x.target.value) } })} className="w-24 border border-hairline rounded-[6px] text-[12px] px-1 py-1" placeholder="límite" />
                  </span>) : c.condicion.tipo === 'Prepago' ? 'Prepago' : `Plazo ${c.condicion.dias} d · ${money(c.condicion.limite)}`}</Td>
                <Td>{c.condicion.tipo === 'Plazo' ? <div className="w-36"><MiniBar value={usado} max={c.condicion.limite} label={money(usado)} tone={usado > c.condicion.limite * 0.8 ? 'danger' : 'avance'} /></div> : money(usado)}</Td>
                <Td>{s.briefs.filter((b) => b.empresaId === c.empresaId).length}</Td>
                <Td>{c.estado !== 'Activa' ? <Link to={`/invitacion/${c.invitada.token}`} className="text-blue-link text-[12px] font-mono">/invitacion/{c.invitada.token}</Link> : <span className="text-[11px] text-mist">{formatDate(c.invitada.fechaHora.slice(0, 10))}</span>}</Td>
                <Td>{e ? <span className="flex gap-1"><Button size="sm" onClick={() => { if (s.cambiarCondicion(c.empresaId, e)) setEdit({ ...edit, [c.empresaId]: undefined as never }); }}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, [c.empresaId]: undefined as never })}>×</Button></span> : <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, [c.empresaId]: c.condicion })}>Condición</Button>}</Td>
              </tr>); })}</tbody>
          </table>
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Pagos: facturas a marcas, prepagos, dispersiones y chequeo diario
// ---------------------------------------------------------------------------

export function PagosEquipo() {
  const s = useMarket();
  const nombre = useNombreEmpresa();
  const facs = s.facturas.slice().sort((a, b) => (a.pagada ? 1 : 0) - (b.pagada ? 1 : 0));
  const cts = s.contrataciones.filter((c) => c.aceptada).sort((a, b) => (b.dispersion?.fechaHora ?? b.aceptada).localeCompare(a.dispersion?.fechaHora ?? a.aceptada));
  return (
    <Pagina titulo="Pagos del marketplace" sub="Influ cobra a la marca una factura por campaña y le paga a cada creador o agencia en automático al aprobar el contenido"
      right={<Button variant="outlined" onClick={() => s.chequeoDiario()}>Correr chequeo diario de publicaciones</Button>}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Por cobrar a marcas" value={money(facs.filter((f) => !f.pagada).reduce((t, f) => t + f.total, 0))} />
        <KpiCard label="Dispersado" value={money(cts.filter((c) => c.dispersion?.estado === 'Pagada').reduce((t, c) => t + c.tarifa, 0))} note="SPEI vía API (BaaS)" />
        <KpiCard label="Pagos retenidos" value={String(cts.filter((c) => c.dispersion?.estado === 'Retenida').length)} />
        <KpiCard label="Facturas sin UUID" value={String(facs.filter((f) => !f.uuid).length)} note="la plataforma no factura: registra el UUID" />
      </div>
      <Panel title="Facturas de Influ a las marcas">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Campaña', 'Empresa', 'Tarifas', 'Fee', 'Total', 'UUID', 'Vence', 'Estado', ''].map((h, i) => <Th key={h} right={i >= 2 && i <= 4}>{h}</Th>)}</tr></thead>
            <tbody>{facs.map((f) => (
              <tr key={f.id} className="border-b border-hairline last:border-0">
                <Td>{f.campana}</Td><Td>{nombre(f.empresaId)}</Td><Td right>{money(f.tarifas)}</Td><Td right>{money(f.fee)}</Td><Td right>{money(f.total)}</Td>
                <Td className="font-mono text-[11px]">{f.uuid ? `${f.uuid.slice(0, 8)}…` : '—'}</Td>
                <Td>{f.vence ? formatDate(f.vence) : '—'}</Td>
                <Td><Estado e={f.pagada ? 'Pagada' : !f.uuid ? 'Borrador' : f.vence && f.vence < HOY_ISO ? 'Vencida' : 'Por vencer'}>{f.pagada ? 'Pagada' : !f.uuid ? 'Por facturar' : f.vence && f.vence < HOY_ISO ? 'Vencida' : 'Por vencer'}</Estado></Td>
                <Td className="text-right"><span className="inline-flex gap-1.5">{!f.uuid && <Button size="sm" variant="outlined" onClick={() => s.registrarFactura(f.id)}>Registrar UUID</Button>}{!f.pagada && <Button size="sm" variant="ghost" onClick={() => s.registrarPagoMarca(f.id)}>Registrar pago</Button>}</span></Td>
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Pagos a creadores y agencias">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Creador', 'Beneficiario', 'Tarifa', 'Aprobado', 'Pago', 'Tiempo', 'Falta', ''].map((h) => <Th key={h} right={h === 'Tarifa'}>{h}</Th>)}</tr></thead>
            <tbody>{cts.map((c) => { const falta = faltaParaDispersar(s, c); return (
              <tr key={c.id} className="border-b border-hairline last:border-0">
                <Td>{s.creadores.find((x) => x.id === c.creadorId)?.handle}</Td><Td>{c.beneficiario.nombre}</Td><Td right>{money(c.tarifa)}</Td>
                <Td>{c.aprobada ? fechaHora(c.aprobada.fechaHora) : '—'}</Td>
                <Td>{c.dispersion ? <Estado e={c.dispersion.estado} /> : <span className="text-mist">—</span>}</Td>
                <Td>{c.dispersion?.estado === 'Pagada' && c.aprobada ? `${Math.round(minutos(c.aprobada.fechaHora, c.dispersion.fechaHora))} min` : '—'}</Td>
                <Td className="whitespace-normal text-[11.5px] text-ash max-w-[280px]">{c.dispersion?.estado === 'Pagada' ? '' : falta.join(', ')}</Td>
                <Td>{c.dispersion?.estado === 'Retenida' && <Button size="sm" variant="outlined" onClick={() => s.reintentarDispersion(c.id)}>Reintentar</Button>}</Td>
              </tr>); })}</tbody>
          </table>
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Moderación: casos, revisión manual de publicaciones, avisos y hilos
// ---------------------------------------------------------------------------

export function Moderacion() {
  const s = useMarket();
  const [nota, setNota] = useState<Record<string, string>>({});
  const [conv, setConv] = useState('');
  const observadas = s.contrataciones.filter((c) => c.publicacion?.estado === 'Con observaciones' && !c.publicacion.revisadaPor);
  return (
    <Pagina titulo="Moderación y disputas" sub="Incumplimientos, disputas, protección del canal y revisión manual de publicaciones">
      <Panel title="Casos">
        <div className="border-t border-hairline divide-y divide-hairline">
          {s.casos.map((c) => (
            <div key={c.id} className="px-5 py-3 flex gap-3 items-start flex-wrap">
              <Estado e={c.tipo} />
              <div className="flex-1 min-w-[260px]"><div className="text-[13.5px] text-carbon font-medium">{c.titulo}</div><div className="text-[12px] text-ash">{c.detalle} · {fechaHora(c.abierto)}</div>{c.resolucion && <div className="text-[12px] text-success mt-1">Resuelto por {c.resolucion.usuario}: {c.resolucion.nota}</div>}</div>
              {c.estado === 'Abierto' ? (
                <span className="flex gap-1.5"><input value={nota[c.id] ?? ''} onChange={(e) => setNota({ ...nota, [c.id]: e.target.value })} placeholder="Resolución" className="border border-hairline rounded-full px-3 py-1 text-[12px] w-56" /><Button size="sm" onClick={() => s.resolverCaso(c.id, nota[c.id] ?? '')}>Resolver</Button>{c.convId && <Button size="sm" variant="ghost" onClick={() => setConv(c.convId!)}>Ver hilo</Button>}</span>
              ) : <Estado e="Resuelto" />}
            </div>
          ))}
          {!s.casos.length && <Vacio texto="Sin casos." />}
        </div>
      </Panel>
      {observadas.length > 0 && (
        <Panel title="Publicaciones con observaciones" subtitle="Revisión manual: verificar o abrir caso de incumplimiento">
          <div className="border-t border-hairline divide-y divide-hairline">
            {observadas.map((c) => (
              <div key={c.id} className="px-5 py-3 flex gap-3 items-center flex-wrap">
                <span className="flex-1 text-[13px]">{s.creadores.find((x) => x.id === c.creadorId)?.handle} · {c.publicacion!.checks.filter((x) => !x.ok).map((x) => x.texto).join('; ')}</span>
                <input value={nota[c.id] ?? ''} onChange={(e) => setNota({ ...nota, [c.id]: e.target.value })} placeholder="Nota" className="border border-hairline rounded-full px-3 py-1 text-[12px] w-48" />
                <Button size="sm" onClick={() => s.revisarPublicacion(c.id, true, nota[c.id] ?? '')}>Verificar</Button>
                <Button size="sm" variant="danger" onClick={() => s.revisarPublicacion(c.id, false, nota[c.id] ?? 'No coincide con lo aprobado')}>Incumplimiento</Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {conv && <Panel title="Hilo" right={<Button size="sm" variant="ghost" onClick={() => setConv('')}>Cerrar</Button>}><div className="border-t border-hairline p-4"><Hilo convId={conv} /></div></Panel>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Avisos enviados" subtitle="Email con copia a participantes + WhatsApp">
          <div className="border-t border-hairline max-h-80 overflow-y-auto divide-y divide-hairline">
            {s.avisos.slice(0, 60).map((a) => <div key={a.id} className="px-5 py-2 text-[12px]"><span className="text-mist tabular-nums">{fechaHora(a.fechaHora)}</span> · <Chip>{a.canal}</Chip> <span className="text-carbon">{a.para}</span><div className="text-ash">{a.texto}</div></div>)}
          </div>
        </Panel>
        <Panel title="Calificaciones" subtitle="Evaluación mutua al cierre: alimenta el matching">
          <div className="border-t border-hairline">
            <table className="w-full"><thead><tr className="border-b border-hairline"><Th>Creador</Th><Th>Marca → creador</Th><Th>Creador → marca</Th></tr></thead>
              <tbody>{s.contrataciones.filter((c) => c.calificaciones.marca || c.calificaciones.creador).map((c) => <tr key={c.id} className="border-b border-hairline last:border-0"><Td>{s.creadores.find((x) => x.id === c.creadorId)?.handle}</Td><Td>{c.calificaciones.marca ? `${'★'.repeat(c.calificaciones.marca.estrellas)}` : '—'}</Td><Td>{c.calificaciones.creador ? `${'★'.repeat(c.calificaciones.creador.estrellas)}` : '—'}</Td></tr>)}</tbody>
            </table>
            {s.contrataciones.every((c) => !ultimo(c.snapshots)) && null}
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}
