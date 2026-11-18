import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  Wallet, Coins, PiggyBank, TrendingUp, FileText, Download, Info, CheckCircle2, AlertTriangle, Image as ImageIcon,
} from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Drawer from '../components/ui/Drawer';
import SegmentedControl from '../components/ui/SegmentedControl';
import { formatDate, money, num } from '../lib/format';
import { MESES } from '../data/constantes';
import {
  AVISOS_FONDEO, CAPITAL_TOTAL, FONDEADOR, OPERACIONES_FONDEO, PREFERENCIAS_AVISO, capitalDisponible, capitalEnEvaluacion,
  capitalEnUso, porFolio, rendimientoEnCurso, rendimientoPagado, toneFondeo, type EstadoFondeo, type OperacionFondeo,
} from './datos';

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1400px] mx-auto flex flex-col gap-5">{children}</div>
);

const Encabezado = ({ titulo, sub }: { titulo: string; sub: string }) => (
  <div>
    <div className="text-[22px] font-semibold text-carbon">{titulo}</div>
    <div className="text-[13px] text-ash">{sub}</div>
  </div>
);

const NotaDemo = () => (
  <div className="border border-blue/30 bg-ice rounded-[8px] px-4 py-2.5 text-[12.5px] text-blue-link flex gap-2">
    <Info size={15} className="shrink-0 mt-0.5" />
    Maquetado con datos ficticios: muestra cómo vería el fondeador el uso de su capital. Cada operación la cubre completa un solo fondeador (100% del adelanto); Influ la asigna al aprobar la solicitud.
  </div>
);

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------

function FondeoResumen() {
  const enUso = capitalEnUso();
  const disponible = capitalDisponible();
  const evaluacion = capitalEnEvaluacion();
  const proximos = useMemo(
    () => OPERACIONES_FONDEO.filter((o) => o.estado === 'Vigente' || o.estado === 'Fondeando').sort((a, b) => a.vence.localeCompare(b.vence)),
    [],
  );
  const usoPct = Math.round((enUso / CAPITAL_TOTAL) * 100);
  const evalPct = Math.round((evaluacion / CAPITAL_TOTAL) * 100);

  return (
    <Wrap>
      <Encabezado titulo="Resumen" sub={`${FONDEADOR.nombre} · fondeador desde ${formatDate(FONDEADOR.desde, { month: 'long', year: 'numeric' })}`} />
      <NotaDemo />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Capital comprometido" value={money(CAPITAL_TOTAL)} icon={Wallet} />
        <KpiCard label="Capital en uso" value={money(enUso)} note={`${usoPct}% · ${proximos.length} operaciones`} icon={Coins} />
        <KpiCard label="Capital disponible" value={money(disponible)} note="listo para asignar" icon={PiggyBank} />
        <KpiCard label="Rendimiento acumulado" value={money(rendimientoPagado())} note={`+${money(rendimientoEnCurso())} en curso`} icon={TrendingUp} />
      </div>

      <Panel title="Uso de tu capital">
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
          <div className="h-3 w-full rounded-full bg-pebble overflow-hidden flex">
            <div className="h-full bg-blue" style={{ width: `${usoPct}%` }} />
            <div className="h-full bg-warning" style={{ width: `${evalPct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue" /> En uso {money(enUso)}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> En evaluación {money(evaluacion)}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pebble" /> Disponible {money(disponible)}</span>
          </div>
        </div>
      </Panel>

      <Panel title="Próximos cobros de marca">
        <div className="border-t border-hairline divide-y divide-hairline">
          {proximos.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-[12px] text-blue-link w-14 shrink-0">{o.id}</span>
              <span className="flex-1 min-w-0 text-[13.5px] text-carbon truncate">{o.marca} · {o.talento}</span>
              <span className="text-[13px] tabular-nums text-carbon whitespace-nowrap">{money(o.capital)}</span>
              <span className="text-[12.5px] text-ash whitespace-nowrap w-24 text-right">{formatDate(o.vence, { day: '2-digit', month: 'short' })}</span>
            </div>
          ))}
        </div>
      </Panel>
    </Wrap>
  );
}

// -----------------------------------------------------------------------------
// Asignación
// -----------------------------------------------------------------------------

function FondeoAsignacion() {
  const enEvaluacion = OPERACIONES_FONDEO.filter((o) => o.estado === 'En evaluación');
  const asignadas = OPERACIONES_FONDEO.filter((o) => o.estado !== 'En evaluación');
  return (
    <Wrap>
      <Encabezado titulo="Asignación" sub="Cómo asigna Influ tu capital a cada operación" />
      <NotaDemo />
      <Panel title="Cómo funciona">
        <div className="border-t border-hairline px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12.5px] text-ash">
          {[
            ['1 · Influ aprueba', 'El equipo de Influ revisa y aprueba la solicitud de la agencia.'],
            ['2 · Se asigna completa', 'Influ asigna la operación a un fondeador con capital disponible: cubre el 100% del adelanto.'],
            ['3 · Tu capital trabaja', 'El adelanto sale a la agencia. Al pagar la marca, tu capital regresa con su rendimiento.'],
          ].map(([t, txt]) => (
            <div key={t} className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-carbon">{t}</span>
              <span>{txt}</span>
            </div>
          ))}
        </div>
      </Panel>

      {enEvaluacion.length > 0 && (
        <Panel title="Por asignar a tu capital" subtitle="Solicitudes en evaluación del equipo de Influ. Tú no eliges ni rechazas: se asignan completas.">
          <div className="border-t border-hairline divide-y divide-hairline">
            {enEvaluacion.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                <span className="font-mono text-[12px] text-blue-link w-14 shrink-0">{o.id}</span>
                <span className="flex-1 min-w-0 text-[13.5px] text-carbon truncate">{o.marca} · {o.talento}</span>
                <span className="text-[13px] tabular-nums text-carbon whitespace-nowrap">{money(o.capital)}</span>
                <Badge tone="warning">En evaluación</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Capital asignado" subtitle={`${asignadas.length} operaciones · cada una cubierta al 100% del adelanto`}>
        <div className="border-t border-hairline divide-y divide-hairline">
          {asignadas.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-[12px] text-blue-link w-14 shrink-0">{o.id}</span>
              <span className="flex-1 min-w-0 text-[13.5px] text-carbon truncate">{o.marca} · {o.talento}</span>
              <span className="text-[12.5px] text-ash whitespace-nowrap hidden sm:block">{formatDate(o.asignada, { day: '2-digit', month: 'short' })}</span>
              <span className="text-[13px] tabular-nums text-carbon whitespace-nowrap">{money(o.capital)}</span>
              <Badge tone={toneFondeo(o.estado)}>{o.estado}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </Wrap>
  );
}

// -----------------------------------------------------------------------------
// Operaciones (tabla + expediente)
// -----------------------------------------------------------------------------

const FILTROS: { id: string; label: string; estados: EstadoFondeo[] | null }[] = [
  { id: 'todas', label: 'Todas', estados: null },
  { id: 'vigentes', label: 'Vigentes', estados: ['Vigente', 'Fondeando', 'Atrasada'] },
  { id: 'cobradas', label: 'Cobradas', estados: ['Cobrada'] },
  { id: 'evaluacion', label: 'En evaluación', estados: ['En evaluación'] },
];

function Expediente({ op, onClose }: { op: OperacionFondeo; onClose: () => void }) {
  const dato = (k: string, val: React.ReactNode) => (
    <div className="flex items-center justify-between py-2 text-[13px]"><span className="text-ash">{k}</span><span className="text-carbon font-medium text-right">{val}</span></div>
  );
  return (
    <Drawer open onClose={onClose} title={`Operación ${op.id}`} subtitle={`${op.marca} · ${op.talento} · ${op.agencia}`}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Badge tone={toneFondeo(op.estado)}>{op.estado}</Badge>
          <span className="text-[12px] text-ash">Asignada {formatDate(op.asignada, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>

        <div className="border border-hairline rounded-[8px] px-4 divide-y divide-hairline">
          {dato('Factura de la marca', money(op.factura))}
          {dato('Adelanto (80%)', money(op.adelanto))}
          {dato('Tu capital (100% del adelanto)', <span className="text-blue-link">{money(op.capital)}</span>)}
          {dato('Plazo de la marca', `${op.plazoDias} días`)}
          {dato('Vencimiento', formatDate(op.vence, { day: '2-digit', month: 'short', year: 'numeric' }))}
          {dato('Tu rendimiento estimado', <span className="text-success">{money(op.rendimiento)}</span>)}
        </div>

        <div>
          <div className="text-[13px] font-semibold text-carbon mb-2">Entregable</div>
          <div className="border border-hairline rounded-[8px] overflow-hidden">
            <div className="h-28 bg-pebble flex items-center justify-center text-mist"><ImageIcon size={26} strokeWidth={1.4} /></div>
            <div className="px-4 py-3 flex flex-col gap-1">
              <span className="text-[13px] text-carbon">{op.entregable.descripcion}</span>
              {op.entregable.vistas > 0
                ? <span className="text-[12px] text-ash">{num(op.entregable.vistas)} vistas · {op.entregable.interaccion}% de interacción</span>
                : <span className="text-[12px] text-ash">Métricas disponibles cuando se publique.</span>}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[13px] font-semibold text-carbon mb-2">Etapas</div>
          <div className="flex flex-col gap-2.5">
            {op.etapas.map((e) => (
              <div key={e.nombre} className="flex items-start gap-2.5 text-[12.5px]">
                <span className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center ${e.estado === 'hecho' ? 'bg-success text-white' : e.estado === 'curso' ? 'bg-blue text-white' : 'bg-pebble'}`}>
                  {e.estado === 'hecho' && <CheckCircle2 size={12} />}
                </span>
                <span className="flex-1 text-carbon">{e.nombre}</span>
                <span className="text-ash whitespace-nowrap">{e.fecha ? formatDate(e.fecha, { day: '2-digit', month: 'short' }) : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[13px] font-semibold text-carbon mb-2">Documentos</div>
          <div className="flex flex-col gap-1.5">
            {op.documentos.map((doc) => (
              <button key={doc.nombre} className="flex items-center gap-2.5 border border-hairline rounded-[8px] px-3 py-2 text-left hover:bg-frost">
                <FileText size={15} className="text-ash shrink-0" />
                <span className="flex-1 text-[12.5px] text-carbon truncate">{doc.nombre}</span>
                <Download size={14} className="text-blue-link shrink-0" />
              </button>
            ))}
          </div>
          <div className="text-[11.5px] text-mist mt-2">No se muestran RFC, CURP ni contratos del talento ni la comisión de Influ.</div>
        </div>
      </div>
    </Drawer>
  );
}

function FondeoOperaciones() {
  const [filtro, setFiltro] = useState('todas');
  const [abierta, setAbierta] = useState<string | null>(null);
  const estados = FILTROS.find((f) => f.id === filtro)!.estados;
  const lista = estados ? OPERACIONES_FONDEO.filter((o) => estados.includes(o.estado)) : OPERACIONES_FONDEO;
  const cols = ['Operación', 'Agencia', 'Talento', 'Marca', 'Factura', 'Adelanto 80%', 'Tu capital', 'Vence', 'Plazo', 'Rendimiento', 'Estado', ''];

  return (
    <Wrap>
      <Encabezado titulo="Operaciones fondeadas" sub={`${OPERACIONES_FONDEO.length} operaciones asignadas a tu capital — cada una cubierta al 100% del adelanto`} />
      <NotaDemo />
      <div><SegmentedControl options={FILTROS.map((f) => ({ id: f.id, label: f.label }))} value={filtro} onChange={setFiltro} /></div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-hairline bg-frost/60">{cols.map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11.5px] text-ash font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} className="border-b border-hairline last:border-0 hover:bg-frost/50">
                  <td className="px-4 py-3 font-mono text-[12px] text-blue-link whitespace-nowrap">{o.id}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{o.agencia}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{o.talento}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{o.marca}</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums whitespace-nowrap">{money(o.factura)}</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums whitespace-nowrap">{money(o.adelanto)}</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums whitespace-nowrap font-medium text-blue-link">{money(o.capital)}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{formatDate(o.vence, { day: '2-digit', month: 'short' })}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{o.plazoDias} d</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums whitespace-nowrap text-success">{o.estado === 'En evaluación' ? '—' : money(o.rendimiento)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge tone={toneFondeo(o.estado)}>{o.estado}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setAbierta(o.id)}>Ver</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="text-[12px] text-mist">
        El rendimiento es un estimado sobre el capital asignado, calculado por operación con base en su plazo. Se confirma al cobrar. No se muestra la comisión de Influ.
      </div>
      {abierta && <Expediente op={porFolio(abierta)!} onClose={() => setAbierta(null)} />}
    </Wrap>
  );
}

// -----------------------------------------------------------------------------
// Flujos
// -----------------------------------------------------------------------------

function FondeoFlujos() {
  // Entradas de capital por mes de vencimiento (lo que regresa cada mes).
  const porMes = useMemo(() => {
    const m = new Map<string, { capital: number; rendimiento: number; mes: string }>();
    for (const o of OPERACIONES_FONDEO) {
      if (o.estado === 'En evaluación') continue;
      const dt = new Date(`${o.vence}T12:00:00`);
      const clave = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, '0')}`;
      const etiqueta = `${MESES[dt.getMonth()]} ${dt.getFullYear()}`;
      const prev = m.get(clave) ?? { capital: 0, rendimiento: 0, mes: etiqueta };
      m.set(clave, { capital: prev.capital + o.capital, rendimiento: prev.rendimiento + o.rendimiento, mes: etiqueta });
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, []);
  const maximo = Math.max(...porMes.map((x) => x.capital), 1);

  return (
    <Wrap>
      <Encabezado titulo="Flujos" sub="Cuándo regresa tu capital y su rendimiento, por mes de cobro" />
      <NotaDemo />
      <Panel title="Capital que regresa por mes">
        <div className="border-t border-hairline px-5 py-5 flex flex-col gap-4">
          {porMes.map((x) => (
            <div key={x.mes} className="flex items-center gap-3">
              <span className="w-20 text-[12.5px] text-ash shrink-0">{x.mes}</span>
              <div className="flex-1 h-7 bg-pebble/60 rounded-[6px] overflow-hidden">
                <div className="h-full bg-blue/85 rounded-[6px] flex items-center justify-end px-2" style={{ width: `${Math.max(12, (x.capital / maximo) * 100)}%` }}>
                  <span className="text-[11px] text-white font-medium tabular-nums">{money(x.capital)}</span>
                </div>
              </div>
              <span className="w-24 text-right text-[12px] text-success tabular-nums shrink-0">+{money(x.rendimiento)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Capital en uso hoy" value={money(capitalEnUso())} icon={Coins} />
        <KpiCard label="Rendimiento en curso" value={money(rendimientoEnCurso())} icon={TrendingUp} />
        <KpiCard label="Rendimiento ya pagado" value={money(rendimientoPagado())} icon={CheckCircle2} />
      </div>
    </Wrap>
  );
}

// -----------------------------------------------------------------------------
// Notificaciones
// -----------------------------------------------------------------------------

function FondeoNotificaciones() {
  const [prefs, setPrefs] = useState(PREFERENCIAS_AVISO);
  const toggle = (id: string, canal: 'correo' | 'whatsapp') =>
    setPrefs((p) => p.map((x) => (x.id === id ? { ...x, [canal]: !x[canal] } : x)));
  const icono = (t: string) => (t === 'ok' ? <CheckCircle2 size={15} className="text-success" /> : t === 'warn' ? <AlertTriangle size={15} className="text-warning" /> : <Info size={15} className="text-blue-link" />);

  return (
    <Wrap>
      <Encabezado titulo="Notificaciones" sub="Avisos de tus operaciones y a qué canal llegan" />
      <NotaDemo />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Avisos recientes">
          <div className="border-t border-hairline divide-y divide-hairline">
            {AVISOS_FONDEO.map((a) => (
              <div key={a.id} className="px-5 py-3 flex gap-3">
                <span className="mt-0.5 shrink-0">{icono(a.tipo)}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-carbon">{a.titulo}</div>
                  <div className="text-[12px] text-ash mt-0.5">{a.detalle}</div>
                  <div className="text-[11px] text-mist mt-0.5">{formatDate(a.cuando, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Preferencias de aviso" subtitle="Elige a qué canal llega cada tipo de notificación.">
          <div className="border-t border-hairline">
            <div className="px-5 py-2 flex items-center text-[11.5px] text-ash font-semibold">
              <span className="flex-1">Aviso</span><span className="w-16 text-center">Correo</span><span className="w-20 text-center">WhatsApp</span>
            </div>
            <div className="divide-y divide-hairline">
              {prefs.map((p) => (
                <div key={p.id} className="px-5 py-2.5 flex items-center">
                  <span className="flex-1 text-[12.5px] text-carbon pr-3">{p.etiqueta}</span>
                  <span className="w-16 flex justify-center"><Switch on={p.correo} onClick={() => toggle(p.id, 'correo')} /></span>
                  <span className="w-20 flex justify-center"><Switch on={p.whatsapp} onClick={() => toggle(p.id, 'whatsapp')} /></span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </Wrap>
  );
}

const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-blue' : 'bg-pebble'}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

// -----------------------------------------------------------------------------
// Documentos
// -----------------------------------------------------------------------------

function FondeoDocumentos() {
  const generales = [
    { nombre: 'Estado de cuenta · octubre 2026.pdf', tipo: 'Estado de cuenta' },
    { nombre: 'Contrato de fondeo · Ricardo Treviño.pdf', tipo: 'Contrato' },
    { nombre: 'Constancia fiscal de retenciones 2026.pdf', tipo: 'Fiscal' },
  ];
  const Doc = ({ nombre, tipo }: { nombre: string; tipo: string }) => (
    <button className="flex items-center gap-3 border border-hairline rounded-[8px] px-4 py-2.5 text-left hover:bg-frost w-full">
      <FileText size={16} className="text-ash shrink-0" />
      <span className="flex-1 min-w-0"><span className="block text-[13px] text-carbon truncate">{nombre}</span><span className="block text-[11.5px] text-mist">{tipo}</span></span>
      <Download size={15} className="text-blue-link shrink-0" />
    </button>
  );

  return (
    <Wrap>
      <Encabezado titulo="Documentos" sub="Tus estados de cuenta y los comprobantes de cada operación" />
      <NotaDemo />
      <Panel title="Generales">
        <div className="border-t border-hairline px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {generales.map((g) => <Doc key={g.nombre} {...g} />)}
        </div>
      </Panel>
      <Panel title="Por operación">
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-4">
          {OPERACIONES_FONDEO.filter((o) => o.estado !== 'En evaluación').map((o) => (
            <div key={o.id} className="flex flex-col gap-2">
              <div className="text-[12.5px] font-semibold text-carbon">{o.id} · {o.marca} · {o.talento}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {o.documentos.map((doc) => <Doc key={doc.nombre} {...doc} />)}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Wrap>
  );
}

// -----------------------------------------------------------------------------
// Rutas del panel de fondeadores
// -----------------------------------------------------------------------------

export const FondeoRoutes = () => (
  <Routes>
    <Route path="resumen" element={<FondeoResumen />} />
    <Route path="asignacion" element={<FondeoAsignacion />} />
    <Route path="operaciones" element={<FondeoOperaciones />} />
    <Route path="flujos" element={<FondeoFlujos />} />
    <Route path="notificaciones" element={<FondeoNotificaciones />} />
    <Route path="documentos" element={<FondeoDocumentos />} />
    <Route path="*" element={<Navigate to="/fondeo/resumen" replace />} />
  </Routes>
);
