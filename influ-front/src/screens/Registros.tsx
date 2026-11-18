import { useState } from 'react';
import { UserCheck, AlertTriangle, Clock, Users } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Check, Fila } from '../components/ui/Fila';
import { useInflu, rolActual, clabeValida } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { chequeosAgencia, chequeosTalento, ciudadDe, handlePrincipal, horasDesde, porId, suma } from '../lib/derive';
import { estadoTone, fechaHora, formatDate } from '../lib/format';
import type { Agencia, Talento } from '../data/types';

type Cuenta = { tipo: 'talento'; x: Talento } | { tipo: 'agencia'; x: Agencia };

// El estado interno 'Preaprobada' se muestra al usuario como 'Aprobada'.
const etiquetaEstado = (estado: string) => (estado === 'Preaprobada' ? 'Aprobada' : estado);

// Pantalla 15 (nueva): toda cuenta nueva, de talento o agencia, queda en
// revisión hasta que el equipo la aprueba; queda registrado quién resolvió.
export const Registros = () => {
  const s = useInflu();
  const rol = rolActual(s);
  const [filtro, setFiltro] = useState<'Por resolver' | 'Todas'>('Por resolver');
  const [selId, setSelId] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [accion, setAccion] = useState<'Observada' | 'Rechazada' | null>(null);

  const cuentas: Cuenta[] = [
    ...s.talentos.map((x) => ({ tipo: 'talento' as const, x })),
    ...s.agencias.map((x) => ({ tipo: 'agencia' as const, x })),
  ].filter((c) => filtro === 'Todas' || ['En revisión', 'Observada'].includes(c.x.cuenta))
    .sort((a, b) => (a.x.cuenta === 'En revisión' ? -1 : 1) - (b.x.cuenta === 'En revisión' ? -1 : 1) || b.x.alta.localeCompare(a.x.alta));
  const sel = cuentas.find((c) => c.x.id === selId) ?? cuentas[0];
  const enRevision = [...s.talentos, ...s.agencias].filter((x) => x.cuenta === 'En revisión');
  const observadas = [...s.talentos, ...s.agencias].filter((x) => x.cuenta === 'Observada');
  const tiempos = [...s.talentos, ...s.agencias].flatMap((x) => x.resoluciones.filter((r) => r.decision !== 'Reenviada').slice(0, 1).map((r) => horasDesde(x.alta, r.fechaHora)));
  const resolver = (decision: 'Preaprobada' | 'Observada' | 'Rechazada') => {
    if (!sel) return;
    if (s.resolverCuenta(sel.tipo, sel.x.id, decision, decision === 'Preaprobada' ? '' : nota)) { setNota(''); setAccion(null); }
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Esperan aprobación" value={String(enRevision.length)} note="no pueden pedir adelantos hasta ser aprobadas" icon={UserCheck} />
        <KpiCard label="Observadas" value={String(observadas.length)} note="esperan que el usuario corrija" icon={AlertTriangle} />
        <KpiCard label="Tiempo promedio de aprobación" value={tiempos.length ? `${Math.round(suma(tiempos) / tiempos.length)} h` : '—'} note="del registro a la resolución" icon={Clock} />
        <KpiCard label="Cuentas aprobadas" value={String([...s.talentos, ...s.agencias].filter((x) => x.cuenta === 'Preaprobada').length)} note={`${s.talentos.length} talentos · ${s.agencias.length} agencias`} icon={Users} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-4 items-start">
        <Panel title="Registros nuevos" subtitle={`${enRevision.length} cuentas esperan aprobación · no pueden pedir adelantos hasta ser aprobadas`}
          right={(['Por resolver', 'Todas'] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1 rounded-full text-[12px] font-medium border ${filtro === f ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline'}`}>{f}</button>
          ))}>
          {cuentas.length === 0 ? <EmptyState icon={UserCheck} title="Sin registros por resolver" message="Las cuentas nuevas aparecen aquí al registrarse." /> : (
            <div className="border-t border-hairline overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-hairline">{['', 'Cuenta', 'Alta', 'Estado'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {cuentas.map((c) => {
                    const activo = sel?.x.id === c.x.id;
                    const det = c.tipo === 'talento'
                      ? `Talento · ${handlePrincipal(c.x)}${c.x.agenciaId ? ` · ${porId(s.agencias, c.x.agenciaId)?.nombre}` : ' · independiente'}`
                      : `Agencia · RFC ${c.x.rfc.slice(0, 4)}•••`;
                    return (
                      <tr key={c.x.id} onClick={() => { setSelId(c.x.id); setAccion(null); }} className={`border-b border-hairline cursor-pointer ${activo ? 'bg-ice' : 'hover:bg-haze'}`}>
                        <td className="pl-4 w-4">{c.x.cuenta === 'En revisión' && <span className="block w-2 h-2 rounded-full bg-blue" />}</td>
                        <td className="px-4 py-2.5"><div className="text-[13.5px] font-semibold text-carbon">{c.x.nombre}</div><div className="text-[11.5px] text-ash">{det}</div></td>
                        <td className="px-4 py-2.5 text-[12.5px] text-ash whitespace-nowrap">{formatDate(c.x.alta.slice(0, 10), { day: '2-digit', month: '2-digit' })}</td>
                        <td className="px-4 py-2.5"><Badge tone={c.x.cuenta === 'Preaprobada' ? 'success' : c.x.cuenta === 'Observada' || c.x.cuenta === 'Rechazada' ? 'danger' : 'warning'}>{etiquetaEstado(c.x.cuenta)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {sel && (
          <Panel title={`${sel.x.nombre} · ${sel.tipo === 'talento' ? 'Talento' : 'Agencia'}`} right={<Badge tone={estadoTone(sel.x.cuenta === 'Preaprobada' ? 'Activa' : sel.x.cuenta)}>{etiquetaEstado(sel.x.cuenta)}</Badge>}>
            <div className="border-t border-hairline px-5 py-3">
              <div className="text-[12px] font-semibold text-ash mb-1">Chequeos automáticos</div>
              {(sel.tipo === 'talento' ? chequeosTalento(sel.x, clabeValida) : chequeosAgencia(sel.x)).map((c) => <Check key={c.texto} ok={c.ok} texto={c.texto} />)}
            </div>
            <div className="border-t border-hairline px-5 py-1">
              {sel.tipo === 'talento' ? (
                <>
                  <Fila t="Nichos" v={sel.x.nichos.map((n) => (n === 'Otro' ? sel.x.nichoOtro ?? n : n)).join(' · ')} />
                  <Fila t="Contenido" v={sel.x.tiposContenido.map((n) => (n === 'Otro' ? sel.x.contenidoOtro ?? n : n)).join(' · ')} />
                  <Fila t="Crea desde" v={`${ciudadDe(sel.x)}, ${sel.x.ubicacion.estado}`} />
                  <Fila t="Régimen · género" v={`${sel.x.regimenFiscal.split(' · ')[0]} · ${sel.x.genero}`} />
                  <Fila t="Teléfono" v={`${sel.x.lada} ${sel.x.telefono}`} />
                  <Fila t="Agencia" v={sel.x.agenciaId ? `${porId(s.agencias, sel.x.agenciaId)?.nombre} · representación ${sel.x.representacion.toLowerCase()}` : 'Independiente'} />
                </>
              ) : (
                <>
                  <Fila t="Razón social" v={sel.x.razonSocial} />
                  <Fila t="Folio mercantil" v={sel.x.folioMercantil} />
                  <Fila t="Contacto principal" v={`${sel.x.contacto} · ${sel.x.correo}`} />
                  <Fila t="Condiciones pactadas" v={`${sel.x.condiciones.fija * 100}% fijo + ${sel.x.condiciones.mensual * 100}% mensual`} />
                  <Fila t="Aviso de pago" v={sel.x.avisoPago} />
                </>
              )}
              <Fila t="Consentimientos" v={sel.x.consentimientos.map((c) => c.version).join(' · ')} nota={fechaHora(sel.x.alta)} />
            </div>
            {sel.x.resoluciones.length > 0 && (
              <div className="border-t border-hairline px-5 py-2 text-[12px] text-ash flex flex-col gap-1">
                {sel.x.resoluciones.map((r) => <span key={r.fechaHora}><b className="text-carbon">{etiquetaEstado(r.decision)}</b> · {r.usuario} · {fechaHora(r.fechaHora)}{r.nota ? ` · ${r.nota}` : ''}</span>)}
              </div>
            )}
            {sel.x.cuenta === 'En revisión' && (
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                {accion && (
                  <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder={accion === 'Observada' ? 'Qué tiene que corregir o completar…' : 'Motivo del rechazo…'}
                    className="border border-hairline rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-blue" />
                )}
                <div className="flex gap-2 flex-wrap">
                  {!accion && <Button disabled={!autoriza.preaprobacion(rol)} onClick={() => resolver('Preaprobada')}>Aprobar</Button>}
                  {accion ? <Button variant={accion === 'Rechazada' ? 'danger' : 'outlined'} onClick={() => resolver(accion)}>{accion === 'Observada' ? 'Enviar observación' : 'Rechazar cuenta'}</Button>
                    : <Button variant="ghost" disabled={!autoriza.preaprobacion(rol)} onClick={() => setAccion('Observada')}>Observar</Button>}
                  {accion ? <Button variant="ghost" onClick={() => setAccion(null)}>Cancelar</Button>
                    : <Button variant="danger" disabled={!autoriza.preaprobacion(rol)} onClick={() => setAccion('Rechazada')}>Rechazar</Button>}
                </div>
                <div className="text-[11.5px] text-mist">
                  {sel.tipo === 'talento' && sel.x.representacion === 'Pendiente' ? `Pide adelantos con la aprobación y con la representación confirmada por ${porId(s.agencias, sel.x.agenciaId)?.nombre}.` : 'Al aprobar puede pedir adelantos.'} Queda registrado quién resolvió y cuándo; el usuario recibe un aviso.
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};
