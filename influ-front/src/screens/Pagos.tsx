import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Banknote, ShieldCheck, Coins, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Archivo from '../components/ui/Archivo';
import EmptyState from '../components/ui/EmptyState';
import { Fila } from '../components/ui/Fila';
import { ModalPagoMarca } from '../components/operacion/Modales';
import { useInflu, useVista, rolActual, clabeValida } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import {
  beneficiario, bloqueoCxP, cxcDe, cxpDe, diasVencida, estatusCxC, faltantesLiberar, liquidacion, montoAdelanto, ordenDe, porId, recordatorios, saldoCxC, suma,
} from '../lib/derive';
import { estadoTone, fechaHora, formatDate, money } from '../lib/format';
import type { Operacion, OrdenPago } from '../data/types';

// Pantalla 20 (nueva) y etapa 12: la plataforma genera la orden de pago
// (CLABE validada, monto y referencia); una persona la prepara, otra la
// autoriza y se carga el CEP. Aplica al adelanto y al remanente.
export const Pagos = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('vista') === 'cobranza' ? 'cobranza' : 'ordenes';
  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-5">
      <div className="flex gap-1.5">
        {[['ordenes', 'Órdenes de pago'], ['cobranza', 'Cobranza a marcas']].map(([id, t]) => (
          <button key={id} onClick={() => setParams({ vista: id })} className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border ${tab === id ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline'}`}>{t}</button>
        ))}
      </div>
      {tab === 'ordenes' ? <Ordenes /> : <Cobranza />}
    </div>
  );
};

function Ordenes() {
  const [params, setParams] = useSearchParams();
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const [cuentaId, setCuentaId] = useState('CTA-02');
  const [cep, setCep] = useState<string[]>([]);
  const yo = s.usuarios.find((u) => u.id === s.usuarioId)?.nombre ?? '';
  const listas = v.operaciones.filter((o) => o.estatus === 'Firmada' && !faltantesLiberar(o).length && !ordenDe(o.id, 'Adelanto', v.ordenes));
  const remanentes = v.operaciones.filter((o) => o.estatus === 'Por liquidar' && !ordenDe(o.id, 'Remanente', v.ordenes) && !bloqueoCxP(cxpDe(o.id, v.cxp)!, v.operaciones, v.cxc, v.marcas));
  const esperando = v.operaciones.filter((o) => o.estatus === 'Firmada' && faltantesLiberar(o).length);
  const ordenes = [...v.ordenes].sort((a, b) => (a.estatus === 'Pagada' ? 1 : 0) - (b.estatus === 'Pagada' ? 1 : 0) || b.preparo.fechaHora.localeCompare(a.preparo.fechaHora));
  const sel = ordenes.find((o) => o.id === params.get('orden')) ?? ordenes.find((o) => o.estatus !== 'Pagada');
  const opSel = sel && porId(v.operaciones, sel.operacionId);
  const pendientes = v.ordenes.filter((o) => o.estatus !== 'Pagada');

  const preparar = (o: Operacion, tipo: OrdenPago['tipo']) => {
    if (s.prepararOrden(o.id, tipo, cuentaId)) {
      const nueva = useInflu.getState().ordenes.find((x) => x.operacionId === o.id && x.tipo === tipo);
      if (nueva) setParams({ orden: nueva.id });
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Listas para orden" value={String(listas.length + remanentes.length)} note={`${listas.length} ${listas.length === 1 ? 'adelanto' : 'adelantos'} · ${remanentes.length} ${remanentes.length === 1 ? 'remanente' : 'remanentes'}`} icon={Banknote} />
        <KpiCard label="Esperan segunda firma" value={String(v.ordenes.filter((o) => o.estatus === 'Por autorizar').length)} note="prepara una persona, autoriza otra" icon={ShieldCheck} />
        <KpiCard label="Esperan CEP" value={String(v.ordenes.filter((o) => o.estatus === 'Autorizada').length)} note="transferir en la banca en línea" icon={Clock} />
        <KpiCard label="Por dispersar" value={money(suma(pendientes.map((o) => o.monto)) + suma(listas.map(montoAdelanto)))} note="órdenes abiertas y listas" icon={Coins} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_460px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Panel title="Listas para orden de pago" subtitle="Firma, RUG, confirmación de la instrucción de pago y evidencia completos; o la marca ya pagó"
            right={<div className="w-[260px]"><Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>{s.cuentas.map((c) => <option key={c.id} value={c.id}>{`${c.banco} ${c.cuenta} · ${money(c.saldo)}`}</option>)}</Select></div>}>
            <div className="border-t border-hairline divide-y divide-hairline">
              {listas.length + remanentes.length === 0 && <div className="px-5 py-5 text-[12px] text-mist text-center">Nada listo para pagar.</div>}
              {[...listas.map((o) => ({ o, tipo: 'Adelanto' as const, monto: montoAdelanto(o) })), ...remanentes.map((o) => ({ o, tipo: 'Remanente' as const, monto: liquidacion(o, cxcDe(o.id, v.cxc)).neto }))].map(({ o, tipo, monto }) => (
                <div key={`${o.id}-${tipo}`} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</span>
                  <span className="flex-1 min-w-[200px] text-[13px]">{beneficiario(o, v).nombre} · {porId(v.marcas, o.marcaId)?.nombre}<span className="block text-[11.5px] text-ash">{tipo === 'Adelanto' ? 'Adelanto' : 'Remanente (neto de comisiones)'}</span></span>
                  <span className="text-[14px] font-semibold tabular-nums">{money(monto)}</span>
                  <Button size="sm" disabled={!autoriza.dispersion(rol)} onClick={() => preparar(o, tipo)}>Preparar orden</Button>
                </div>
              ))}
              {esperando.length > 0 && (
                <div className="px-5 py-2.5 text-[12px] text-ash">Firmadas que aún no se liberan: {esperando.map((o) => `${o.folio} (falta ${faltantesLiberar(o).join(', ')})`).join('; ')}.</div>
              )}
            </div>
          </Panel>

          <Panel title="Órdenes de pago">
            {ordenes.length === 0 ? <EmptyState icon={Banknote} title="Sin órdenes" message="Prepara una desde las operaciones listas." /> : (
              <div className="border-t border-hairline overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-hairline">{['Referencia', 'Beneficiario', 'Tipo', 'Monto', 'Preparó', 'Autorizó', 'Estado'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {ordenes.map((o) => (
                      <tr key={o.id} onClick={() => setParams({ orden: o.id })} className={`border-b border-hairline cursor-pointer ${sel?.id === o.id ? 'bg-ice' : 'hover:bg-haze'}`}>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link whitespace-nowrap"><Link to={`/operaciones?id=${o.referencia.replace(/-[AL]$/, '')}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{o.referencia}</Link></td>
                        <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{o.beneficiario.nombre}</td>
                        <td className="px-4 py-2.5 text-[12.5px] whitespace-nowrap">{o.tipo === 'Adelanto' ? 'Adelanto' : 'Remanente'}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular-nums whitespace-nowrap">{money(o.monto)}</td>
                        <td className="px-4 py-2.5 text-[12px] text-ash whitespace-nowrap">{o.preparo.usuario.split(' ')[0]}</td>
                        <td className="px-4 py-2.5 text-[12px] text-ash whitespace-nowrap">{o.autorizo?.usuario.split(' ')[0] ?? '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><Badge tone={o.estatus === 'Pagada' ? 'success' : o.estatus === 'Autorizada' ? 'blue' : 'warning'}>{o.estatus}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {sel && opSel && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[20px] font-semibold text-carbon">Orden de pago · #{opSel.folio.slice(-4)}</div>
              <div className="text-[13px] text-ash">{sel.tipo === 'Adelanto' ? 'Adelanto' : 'Remanente'}</div>
            </div>
            <Panel title="Datos de la transferencia">
              <div className="border-t border-hairline px-5 py-1">
                <Fila t="Beneficiario" v={sel.beneficiario.nombre} fuerte nota={sel.beneficiario.tipo} />
                <Fila t="CLABE" v={`•••• •••• •••• ${sel.beneficiario.clabe.slice(-4)}`} fuerte nota={clabeValida(sel.beneficiario.clabe) ? `✓ Dígito verificador correcto · ${sel.beneficiario.banco}` : 'Dígito verificador incorrecto'} />
                <Fila t="Monto" v={money(sel.monto)} fuerte />
                <Fila t="Referencia" v={<Link to={`/operaciones?id=${sel.referencia.replace(/-[AL]$/, '')}`} className="text-blue-link hover:underline">{sel.referencia}</Link>} fuerte />
                <Fila t="Concepto" v={sel.concepto} />
                <Fila t="Cuenta de origen" v={`${porId(s.cuentas, sel.cuentaId)?.banco} ${porId(s.cuentas, sel.cuentaId)?.cuenta}`} />
              </div>
            </Panel>
            <Panel title="Doble control">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 text-[13.5px]"><CheckCircle2 size={18} className="text-success" /> Preparó: {sel.preparo.usuario.split(' ').slice(0, 2).join(' ')} · {fechaHora(sel.preparo.fechaHora)}</div>
                <div className="flex items-center gap-2.5 text-[13.5px]">
                  {sel.autorizo ? <CheckCircle2 size={18} className="text-success" /> : <span className="w-[18px] h-[18px] rounded-full bg-mist text-white text-[10px] font-semibold flex items-center justify-center">2</span>}
                  Autoriza: {sel.autorizo ? `${sel.autorizo.usuario.split(' ').slice(0, 2).join(' ')} · ${fechaHora(sel.autorizo.fechaHora)}` : 'pendiente'}
                </div>
                {sel.estatus === 'Por autorizar' && (
                  <>
                    <Button className="self-start" disabled={!autoriza.dispersion(rol) || sel.preparo.usuario === yo} onClick={() => s.autorizarOrden(sel.id)}>Autorizar</Button>
                    {sel.preparo.usuario === yo && <div className="text-[11.5px] text-warning">Tú la preparaste: la autoriza otra persona del equipo. Cambia de usuario en el menú "Ver el sistema como…".</div>}
                  </>
                )}
                {sel.estatus === 'Autorizada' && (
                  <>
                    <Archivo titulo="Sube el CEP de Banxico" ayuda={sel.tipo === 'Adelanto' ? '"Tu adelanto fue enviado" con monto, fecha, cuenta destino y comprobante CEP; llega por email y como aviso en la plataforma a la agencia y al influencer' : 'Comprobante electrónico de pago (PDF o XML); avisa al factorado por email y en la plataforma'} acepta=".pdf,.xml" archivos={cep} onChange={setCep} ejemplo={`CEP_${sel.referencia}.pdf`} />
                    <Button className="self-start" disabled={!cep.length} onClick={() => { if (s.cargarCep(sel.id, cep[0])) setCep([]); }}>Registrar CEP y cerrar el pago</Button>
                  </>
                )}
                {sel.cep && <Fila t="CEP" v={sel.cep.claveRastreo} nota={`${sel.cep.archivo} · ${sel.cep.usuario} · ${fechaHora(sel.cep.fechaHora)}`} />}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

/** Etapa 12: recordatorios al área de pagos, registro y conciliación del pago de la marca. */
function Cobranza() {
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const [opId, setOpId] = useState<string | null>(null);
  const abiertas = v.cxc.filter((c) => estatusCxC(c) !== 'Pagado').sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  const pagadas = v.cxc.filter((c) => estatusCxC(c) === 'Pagado').sort((a, b) => (b.abonos.at(-1)?.fecha ?? '').localeCompare(a.abonos.at(-1)?.fecha ?? '')).slice(0, 10);
  const vencidas = abiertas.filter((c) => estatusCxC(c) === 'Vencido');
  const op = opId ? porId(v.operaciones, opId) : null;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Por cobrar a marcas" value={money(suma(abiertas.map(saldoCxC)))} note={`${abiertas.length} facturas`} icon={Coins} />
        <KpiCard label="Vencido" value={money(suma(vencidas.map(saldoCxC)))} note={`${vencidas.length} facturas`} icon={CalendarClock} />
        <KpiCard label="Pagos identificados" value={String(v.cxc.flatMap((c) => c.abonos).filter((a) => a.conciliado).length)} note={`${v.cxc.flatMap((c) => c.abonos).filter((a) => !a.conciliado).length} por identificar`} icon={CheckCircle2} />
      </div>
      <Panel title="Facturas por cobrar" subtitle="La marca paga la factura completa a Influ; los recordatorios salen por email a su área de pagos">
        <div className="border-t border-hairline overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Op.', 'Marca · área de pagos', 'Factura', 'Vence', 'Días', 'Recordatorios', 'Saldo', ''].map((h, i) => <th key={h || i} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {abiertas.map((c) => {
                const o = porId(v.operaciones, c.operacionId)!;
                const d = diasVencida(c);
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</td>
                    <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{porId(v.marcas, c.marcaId)?.nombre}<span className="block text-[11px] text-ash">{o.contactoPagos.email}</span></td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{c.documento}</td>
                    <td className="px-4 py-2.5 text-[12.5px] whitespace-nowrap">{formatDate(c.vencimiento)}</td>
                    <td className={`px-4 py-2.5 text-[12.5px] tabular-nums ${d > 0 ? 'text-danger font-medium' : 'text-ash'}`}>{d > 0 ? `${d} vencidos` : d === 0 ? 'hoy' : `en ${-d}`}</td>
                    <td className="px-4 py-2.5 text-[12px] text-ash whitespace-nowrap">{recordatorios(o).map((r) => `${r.dias} d ${r.enviado ? '✓' : formatDate(r.fecha, { day: 'numeric', month: 'short' })}`).join(' · ')}</td>
                    <td className="px-4 py-2.5 text-[13px] tabular-nums font-medium">{money(saldoCxC(c))}</td>
                    <td className="px-4 py-2.5 text-right"><Button size="sm" variant="outlined" disabled={!autoriza.cobro(rol)} onClick={() => setOpId(o.id)}>Registrar pago</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Cobros recientes">
        <div className="border-t border-hairline divide-y divide-hairline">
          {pagadas.map((c) => {
            const o = porId(v.operaciones, c.operacionId)!;
            return c.abonos.map((a, i) => (
              <div key={`${c.id}-${i}`} className="px-5 py-2.5 flex items-center gap-3 text-[13px] flex-wrap">
                <span className="font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</span>
                <span className="flex-1 min-w-[180px]">{porId(v.marcas, c.marcaId)?.nombre} · {a.referencia}</span>
                <span className="text-ash text-[12px]">{formatDate(a.fecha)}</span>
                <span className="tabular-nums font-medium">{money(a.monto)}</span>
                <Badge tone={a.conciliado ? 'success' : 'warning'}>{a.conciliado ? 'Identificado' : 'Por identificar'}</Badge>
                <Badge tone={estadoTone(o.estatus)}>{o.estatus}</Badge>
              </div>
            ));
          })}
        </div>
      </Panel>
      {op && <ModalPagoMarca op={op} onClose={() => setOpId(null)} />}
    </>
  );
}
