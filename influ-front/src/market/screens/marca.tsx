import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Sparkles, Users, FileText, Wallet, Play, CheckCircle2, AlertTriangle, XCircle, Download, Plus, ChevronRight } from 'lucide-react';
import Panel from '../../components/ui/Panel';
import KpiCard from '../../components/ui/KpiCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Stepper from '../../components/ui/Stepper';
import MiniBar from '../../components/ui/MiniBar';
import { money, fechaHora, formatDate } from '../../lib/format';
import { CATEGORICA, ejeX, ejeY, tooltipEstilo, leyendaEstilo, TINTA, ejePiezas } from '../../lib/charts';
import { HOY_ISO } from '../../data/constantes';
import { useInflu } from '../../store/useInflu';
import { useMarket, permisosEn, creditoUsado, faltaParaDispersar } from '../useMarket';
import { FEE_INFLU, costos, entregablesTexto, fee, foto, scoreMatch, seguidoresDe, tarifaEstimada, totalLineas, ultimo, usosTexto } from '../logic';
import type { BriefEstructurado, Contratacion, CuentaMarca, PermisoMk } from '../types';
import { Chip, Estado, Estrellas, Fila, Pagina, Score, Td, Th, Vacio, VerComo, k, useEmpresaActual, useNombreEmpresa, useNucleo } from '../ui';
import { Hilo, ListaHilos } from './comun';

const base = '/mk/marca';

function useCuenta() {
  const empresaId = useEmpresaActual();
  const cuenta = useMarket((s) => s.cuentas.find((c) => c.empresaId === empresaId));
  const { u } = useNucleo();
  return { empresaId, cuenta, permisos: permisosEn(cuenta, u) };
}

function SinCuenta() {
  return <Pagina titulo="Marketplace"><VerComo tipo="empresa" /><Panel title="Tu empresa todavía no tiene cuenta en el marketplace" subtitle="El alta es por invitación del equipo de Influ."><div className="h-2" /></Panel></Pagina>;
}

// ---------------------------------------------------------------------------
// Campañas
// ---------------------------------------------------------------------------

export function Campanas() {
  const s = useMarket();
  const { empresaId, cuenta } = useCuenta();
  const nombre = useNombreEmpresa();
  if (!cuenta) return <SinCuenta />;
  const briefs = s.briefs.filter((b) => b.empresaId === empresaId);
  const cts = s.contrataciones.filter((c) => c.empresaId === empresaId);
  const usado = creditoUsado(s, empresaId);
  return (
    <Pagina titulo={`Campañas · ${cuenta.marcas.join(', ') || nombre(empresaId)}`} sub={`Un solo proveedor: Influ · condición ${cuenta.condicion.tipo === 'Prepago' ? 'prepago' : `plazo de ${cuenta.condicion.dias} días · límite ${money(cuenta.condicion.limite)}`}`}
      right={<Link to={`${base}/briefs/nuevo`}><Button><Sparkles size={14} /> Nuevo brief con IA</Button></Link>}>
      <VerComo tipo="empresa" />
      {cuenta.estado !== 'Activa' && <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-4 py-3 text-[13px] text-warning">Tu cuenta está en configuración. Termina el alta en <Link to={`${base}/equipo`} className="underline">Equipo</Link> para publicar briefs.</div>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Campañas activas" value={String(briefs.filter((b) => b.estado === 'Publicado').length)} note={`${briefs.length} en total`} icon={FileText} />
        <KpiCard label="Creadores contratados" value={String(cts.length)} note={`${cts.filter((c) => c.publicacion?.estado === 'Verificada').length} publicaciones verificadas`} icon={Users} />
        <KpiCard label="Comprometido" value={money(cts.reduce((t, c) => t + c.tarifa + c.fee, 0))} note="tarifas + fee de Influ" icon={Wallet} />
        <KpiCard label={cuenta.condicion.tipo === 'Plazo' ? 'Crédito usado' : 'Por pagar'} value={money(usado)} note={cuenta.condicion.tipo === 'Plazo' ? `de ${money(cuenta.condicion.limite)}` : 'prepago antes de dispersar'} icon={Wallet} />
      </div>
      <Panel title="Campañas y briefs">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Campaña', 'Estado', 'Entregables', 'Invitados', 'Postulaciones', 'Contratados', 'Comprometido', ''].map((h) => <Th key={h} right={h === 'Comprometido'}>{h}</Th>)}</tr></thead>
            <tbody>
              {briefs.map((b) => {
                const ps = s.postulaciones.filter((p) => p.briefId === b.id);
                const c = cts.filter((x) => x.briefId === b.id);
                return (
                  <tr key={b.id} className="border-b border-hairline last:border-0 hover:bg-haze">
                    <Td><Link to={`${base}/briefs/${b.id}`} className="text-blue-link font-medium">{b.marca} · {b.titulo}</Link><div className="text-[11px] text-ash">{formatDate(b.creado.slice(0, 10))}</div></Td>
                    <Td><Estado e={b.estado} /></Td>
                    <Td>{entregablesTexto(b.estructurado.entregables)}</Td>
                    <Td right>{ps.filter((p) => p.origen === 'Invitado').length}</Td>
                    <Td right>{ps.filter((p) => p.lineas.length && p.estado !== 'Por confirmar agencia').length}</Td>
                    <Td right>{c.length}</Td>
                    <Td right>{money(c.reduce((t, x) => t + x.tarifa + x.fee, 0))}</Td>
                    <Td><Link to={`${base}/kpis?brief=${b.id}`} className="text-[12px] text-blue-link">KPIs</Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!briefs.length && <Vacio texto="Todavía no publicas briefs. Cuéntale a la IA qué necesitas." />}
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Briefs: lista, nuevo con IA, detalle (borrador o publicado)
// ---------------------------------------------------------------------------

export function Briefs() {
  const s = useMarket();
  const { empresaId, cuenta } = useCuenta();
  if (!cuenta) return <SinCuenta />;
  const briefs = s.briefs.filter((b) => b.empresaId === empresaId);
  return (
    <Pagina titulo="Briefs" sub="La IA arma el brief con lo que le cuentas; tú editas y publicas." right={<Link to={`${base}/briefs/nuevo`}><Button><Plus size={14} /> Nuevo brief</Button></Link>}>
      <VerComo tipo="empresa" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {briefs.map((b) => (
          <Link key={b.id} to={`${base}/briefs/${b.id}`} className="bg-white border border-hairline rounded-[8px] p-4 hover:border-blue/40 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2"><span className="text-[15px] font-semibold text-carbon">{b.marca} · {b.titulo}</span><Estado e={b.estado} /></div>
            <div className="text-[12px] text-ash">{b.estructurado.objetivo} · {entregablesTexto(b.estructurado.entregables)} por creador</div>
            <div className="text-[12px] text-ash">{b.estructurado.creadores.cantidad} creadores · {money(b.estructurado.presupuesto.min)}–{money(b.estructurado.presupuesto.max)}</div>
            <div className="text-[11px] text-mist">{b.modo.invitacion ? 'Por invitación' : ''}{b.modo.invitacion && b.modo.abierto ? ' · ' : ''}{b.modo.abierto ? 'Abierto a postulaciones' : ''}</div>
          </Link>
        ))}
      </div>
    </Pagina>
  );
}

export function BriefNuevo() {
  const navigate = useNavigate();
  const s = useMarket();
  const { empresaId, cuenta } = useCuenta();
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [marca, setMarca] = useState(cuenta?.marcas[0] ?? '');
  if (!cuenta) return <SinCuenta />;
  const generar = () => { const id = s.crearBrief(empresaId, marca || cuenta.marcas[0], titulo, texto); if (id) navigate(`${base}/briefs/${id}`); };
  return (
    <Pagina titulo="Nuevo brief" sub="Cuéntale a la IA qué necesitas; ella arma el brief." ancho="max-w-[900px]">
      <Panel title="Tu idea" subtitle="Escribe en texto libre: qué creadores, qué público, qué entregables, cuándo, cuánto y qué no quieres.">
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select label="Marca anunciante" value={marca} onChange={(e) => setMarca(e.target.value)}>{cuenta.marcas.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
            <Input label="Nombre de la campaña" placeholder="Ej. Campaña Q1" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} placeholder="Queremos 6 creadores de autos y lifestyle en CDMX y Monterrey para mostrar la experiencia de manejo del nuevo modelo. Público 25–44, ingresos altos. Un reel y dos stories cada uno, en febrero. Presupuesto entre 300 y 400 mil. Nada de mencionar otras marcas de autos."
            className="border border-hairline rounded-[8px] px-3 py-2 text-[14px] text-carbon leading-relaxed focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15" />
          <div className="flex gap-2 items-center">
            <Button onClick={generar}><Sparkles size={14} /> Generar brief</Button>
            <button onClick={() => setTexto('Queremos 6 creadores de autos y lifestyle en CDMX y Monterrey para mostrar la experiencia de manejo del nuevo modelo. Público 25–44, ingresos altos. Un reel y dos stories cada uno, en febrero. Presupuesto entre 300 y 400 mil. Pauta por 3 meses. Nada de mencionar otras marcas de autos.')} className="text-[12px] text-ash hover:underline">Usar texto de ejemplo</button>
          </div>
        </div>
      </Panel>
    </Pagina>
  );
}

const lista = (x: string[]) => x.join(', ');
const toastNucleo = (t: string) => (useInflu.getState() as unknown as { toast?: (a: string) => void }).toast?.(t);

function EditorBrief({ id }: { id: string }) {
  const s = useMarket();
  const b = s.briefs.find((x) => x.id === id)!;
  const [e, setE] = useState<BriefEstructurado>(JSON.parse(JSON.stringify(b.estructurado)));
  const [modo, setModo] = useState(b.modo);
  const guardar = () => {
    const o = b.estructurado;
    const pares: [string, Partial<BriefEstructurado>, string, string][] = [
      ['Objetivo', { objetivo: e.objetivo }, o.objetivo, e.objetivo],
      ['Audiencia', { audiencia: e.audiencia }, `${o.audiencia.edad} · ${lista(o.audiencia.ciudades)} · ${o.audiencia.nse}`, `${e.audiencia.edad} · ${lista(e.audiencia.ciudades)} · ${e.audiencia.nse}`],
      ['Creadores', { creadores: e.creadores }, `${o.creadores.cantidad} · ${lista(o.creadores.temas)}`, `${e.creadores.cantidad} · ${lista(e.creadores.temas)}`],
      ['Entregables', { entregables: e.entregables }, entregablesTexto(o.entregables), entregablesTexto(e.entregables)],
      ['Fechas', { fechas: e.fechas }, `${o.fechas.desde}–${o.fechas.hasta}`, `${e.fechas.desde}–${e.fechas.hasta}`],
      ['Presupuesto', { presupuesto: e.presupuesto }, `${o.presupuesto.min}–${o.presupuesto.max}`, `${e.presupuesto.min}–${e.presupuesto.max}`],
      ['Usos', { usos: e.usos }, usosTexto(o.usos), usosTexto(e.usos)],
      ['KPIs', { kpis: e.kpis }, lista(o.kpis), lista(e.kpis)],
      ['Restricciones', { restricciones: e.restricciones }, lista(o.restricciones), lista(e.restricciones)],
      ['Menciones', { menciones: e.menciones }, lista(o.menciones), lista(e.menciones)],
    ];
    let n = 0;
    for (const [campo, cambio, antes, despues] of pares) if (antes !== despues && s.editarBrief(id, campo, cambio, antes, despues)) n++;
    return n;
  };
  const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 items-start">
      <Panel title="Tu idea" subtitle="Versión original en texto libre: se conserva junto al brief">
        <div className="border-t border-hairline px-5 py-4 text-[13.5px] text-smoke leading-relaxed bg-frost/50">{b.textoOriginal}</div>
      </Panel>
      <Panel title="Brief estructurado" right={<span className="text-[11px] font-semibold text-success bg-success-wash rounded-full px-2.5 py-0.5">Generado por IA</span>}>
        <div className="border-t border-hairline px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Objetivo" value={e.objetivo} onChange={(x) => setE({ ...e, objetivo: x.target.value })} />
          <Input label="Audiencia: edad" value={e.audiencia.edad} onChange={(x) => setE({ ...e, audiencia: { ...e.audiencia, edad: x.target.value } })} />
          <Input label="Ciudades" value={lista(e.audiencia.ciudades)} onChange={(x) => setE({ ...e, audiencia: { ...e.audiencia, ciudades: split(x.target.value) } })} />
          <Input label="NSE" value={e.audiencia.nse} onChange={(x) => setE({ ...e, audiencia: { ...e.audiencia, nse: x.target.value } })} />
          <Input label="Creadores (cantidad)" type="number" value={e.creadores.cantidad} onChange={(x) => setE({ ...e, creadores: { ...e.creadores, cantidad: Number(x.target.value) } })} />
          <Input label="Temas" value={lista(e.creadores.temas)} onChange={(x) => setE({ ...e, creadores: { ...e.creadores, temas: split(x.target.value) } })} />
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ash">Entregables por creador</span>
            <div className="flex gap-2 flex-wrap">
              {e.entregables.map((x, i) => (
                <span key={i} className="flex items-center gap-1 border border-hairline rounded-full pl-2 pr-1 py-0.5 text-[12px]">
                  <input type="number" min={1} value={x.cantidad} onChange={(v) => setE({ ...e, entregables: e.entregables.map((y, j) => j === i ? { ...y, cantidad: Number(v.target.value) } : y) })} className="w-10 outline-none" />
                  {x.formato} · {x.red}
                  <button onClick={() => setE({ ...e, entregables: e.entregables.filter((_, j) => j !== i) })} className="text-mist px-1">×</button>
                </span>
              ))}
              <Chip onClick={() => setE({ ...e, entregables: [...e.entregables, { formato: 'Story', red: 'Instagram', cantidad: 1 }] })}>+ Story</Chip>
              <Chip onClick={() => setE({ ...e, entregables: [...e.entregables, { formato: 'TikTok', red: 'TikTok', cantidad: 1 }] })}>+ TikTok</Chip>
            </div>
          </div>
          <Input label="Publicación desde" type="date" value={e.fechas.desde} onChange={(x) => setE({ ...e, fechas: { ...e.fechas, desde: x.target.value } })} />
          <Input label="Publicación hasta" type="date" value={e.fechas.hasta} onChange={(x) => setE({ ...e, fechas: { ...e.fechas, hasta: x.target.value } })} />
          <Input label="Presupuesto mínimo" type="number" value={e.presupuesto.min} onChange={(x) => setE({ ...e, presupuesto: { ...e.presupuesto, min: Number(x.target.value) } })} />
          <Input label="Presupuesto máximo" type="number" value={e.presupuesto.max} onChange={(x) => setE({ ...e, presupuesto: { ...e.presupuesto, max: Number(x.target.value) } })} />
          <div className="md:col-span-2 flex gap-1.5 flex-wrap items-center">
            <span className="text-[12px] font-medium text-ash mr-1">Usos</span>
            {(['Orgánico', 'Pauta pagada', 'Cuenta de la marca'] as const).map((u) => <Chip key={u} activo={e.usos.tipos.includes(u)} onClick={() => setE({ ...e, usos: { ...e.usos, tipos: e.usos.tipos.includes(u) ? e.usos.tipos.filter((y) => y !== u) : [...e.usos.tipos, u] } })}>{u}</Chip>)}
            <input type="number" value={e.usos.meses} onChange={(x) => setE({ ...e, usos: { ...e.usos, meses: Number(x.target.value) } })} className="w-14 border border-hairline rounded-full px-2 py-0.5 text-[12px]" /> <span className="text-[12px] text-ash">meses · {e.usos.territorio}</span>
          </div>
          <Input label="KPIs" value={lista(e.kpis)} onChange={(x) => setE({ ...e, kpis: split(x.target.value) })} />
          <Input label="Menciones obligatorias" value={lista(e.menciones)} onChange={(x) => setE({ ...e, menciones: split(x.target.value) })} />
          <div className="md:col-span-2"><Input label="Restricciones" value={lista(e.restricciones)} onChange={(x) => setE({ ...e, restricciones: split(x.target.value) })} /></div>
        </div>
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {([['invitacion', 'Por invitación', 'El matching invita a los mejores'], ['abierto', 'Abierto a postulaciones', 'Los creadores elegibles se postulan']] as const).map(([key, t, dsc]) => (
              <label key={key} className={`flex items-start gap-2.5 border rounded-[8px] px-3 py-2.5 cursor-pointer ${modo[key] ? 'border-blue bg-ice' : 'border-hairline'}`}>
                <input type="checkbox" className="accent-blue mt-1" checked={modo[key]} onChange={() => setModo({ ...modo, [key]: !modo[key] })} />
                <span><span className="block text-[13px] font-medium text-carbon">{t}</span><span className="block text-[11.5px] text-ash">{dsc}</span></span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outlined" onClick={() => { const n = guardar(); toastNucleo(n ? `${n} cambio${n === 1 ? '' : 's'} guardado${n === 1 ? '' : 's'} sobre la propuesta de la IA.` : 'Sin cambios por guardar.'); }}>Guardar cambios</Button>
            <Button onClick={() => { guardar(); s.publicarBrief(id, modo); }}>Publicar brief</Button>
          </div>
          {b.ediciones.length > 0 && <div className="text-[11px] text-mist">Ediciones sobre la propuesta de la IA: {b.ediciones.map((x) => `${x.campo} (${x.usuario.split(' ')[0]})`).join(', ')}.</div>}
        </div>
      </Panel>
    </div>
  );
}

export function BriefDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useMarket();
  const { cuenta } = useCuenta();
  const [sel, setSel] = useState<string[]>([]);
  const b = s.briefs.find((x) => x.id === id);
  if (!b) return <Pagina titulo="Brief no encontrado"><Vacio texto="Ese brief no existe." /></Pagina>;
  if (b.estado === 'Borrador') return <Pagina titulo={`${b.marca} · ${b.titulo}`} sub="Borrador: revisa lo que armó la IA, edítalo y publícalo."><EditorBrief id={b.id} /></Pagina>;
  const ps = s.postulaciones.filter((p) => p.briefId === b.id && p.estado !== 'Por confirmar agencia');
  const ranking = s.rankings.find((r) => r.briefId === b.id);
  const conPrecio = ps.filter((p) => p.lineas.length);
  const pre = ps.filter((p) => p.estado === 'Preseleccionado' || p.estado === 'Contratado');
  const filas = ps.map((p) => ({ p, c: s.creadores.find((x) => x.id === p.creadorId)!, m: scoreMatch(s.creadores.find((x) => x.id === p.creadorId)!, b.estructurado, s.pesos) }))
    .sort((a, z) => (z.p.estado === 'Contratado' ? 1 : 0) - (a.p.estado === 'Contratado' ? 1 : 0) || z.m.score - a.m.score);
  const chat = (creadorId: string) => { const cv = s.abrirChat(b.id, creadorId); if (cv) navigate(`${base}/mensajes/${cv}`); };
  return (
    <Pagina titulo={`${b.marca} · ${b.titulo}`} sub={b.estado === 'Revisión del matching' ? 'Brief publicado · el equipo de Influ revisa el ranking antes de distribuirlo' : `Brief publicado · distribuido a ${ps.filter((p) => p.origen === 'Invitado').length} creadores por el matching`}
      right={<><Link to={`${base}/kpis?brief=${b.id}`}><Button variant="ghost">KPIs</Button></Link><Button variant="outlined" disabled={sel.length < 2} onClick={() => navigate(`${base}/creadores?brief=${b.id}&ids=${sel.join(',')}`)}>Comparar seleccionados ({sel.length})</Button></>}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Invitados" value={String(ps.filter((p) => p.origen === 'Invitado').length)} note={ranking ? `ranking ${ranking.id} · ${ranking.modo === 'Completa' ? 'revisado por el equipo' : 'por muestreo'}` : ''} />
        <KpiCard label="Postulaciones" value={String(conPrecio.length)} note="con presupuesto" />
        <KpiCard label="Preseleccionados" value={String(pre.length)} note={`${ps.filter((p) => p.estado === 'Contratado').length} contratados`} />
        <KpiCard label="Presupuesto de la selección" value={money(pre.reduce((t, p) => t + totalLineas(p.lineas), 0))} note={`de ${money(b.estructurado.presupuesto.min)}–${money(b.estructurado.presupuesto.max)}`} />
      </div>
      <Panel title="Creadores" subtitle="Invitados por el matching y postulantes en una sola lista, con score y presupuesto. Selecciona para comparar.">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['', 'Creador', 'Match', 'Presupuesto', 'Origen', 'Estado', ''].map((h, i) => <Th key={i} right={h === 'Presupuesto'}>{h}</Th>)}</tr></thead>
            <tbody>
              {filas.map(({ p, c, m }) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-haze">
                  <Td><input type="checkbox" className="accent-blue" checked={sel.includes(c.id)} onChange={() => setSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])} /></Td>
                  <Td><Link to={`${base}/creadores/${c.id}?brief=${b.id}`} className="font-semibold text-carbon hover:text-blue-link">{c.handle}</Link> <span className="text-ash">· {k(seguidoresDe(c))}</span>{c.agenciaId && <div className="text-[11px] text-ash">representado por agencia</div>}</Td>
                  <Td><span className="font-semibold tabular-nums" title={m.explicacion}>{m.score}</span>{m.sobrePresupuesto && <span className="text-[11px] text-warning ml-1.5">sobre presupuesto</span>}</Td>
                  <Td right>{p.lineas.length ? money(totalLineas(p.lineas)) : <span className="text-mist">—</span>}</Td>
                  <Td><Estado e={p.origen === 'Invitado' ? 'Invitado' : 'Postulación'} /></Td>
                  <Td><Estado e={p.estado === 'Invitado' && !p.lineas.length ? 'Sin respuesta' : p.estado} /></Td>
                  <Td className="text-right">
                    <span className="inline-flex gap-1.5">
                      {p.lineas.length > 0 && ['Nueva', 'Preseleccionado', 'Contratado'].includes(p.estado) && <Button size="sm" variant="outlined" onClick={() => chat(c.id)}>Chat</Button>}
                      {p.estado === 'Nueva' && <Button size="sm" variant="ghost" onClick={() => s.preseleccionar(p.id, true)}>Preseleccionar</Button>}
                      {p.estado === 'Nueva' && <Button size="sm" variant="ghost" onClick={() => s.preseleccionar(p.id, false)}>Descartar</Button>}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filas.length && <Vacio texto={b.estado === 'Revisión del matching' ? 'El equipo de Influ revisa el ranking: en cuanto lo distribuya aparecen aquí los invitados.' : 'Todavía no hay postulaciones.'} />}
        </div>
      </Panel>
      <ResumenBrief e={b.estructurado} original={b.textoOriginal} />
      {!cuenta && null}
    </Pagina>
  );
}

function ResumenBrief({ e, original }: { e: BriefEstructurado; original: string }) {
  const [ver, setVer] = useState(false);
  return (
    <Panel title="Brief" right={<button onClick={() => setVer(!ver)} className="text-[12px] text-blue-link">{ver ? 'Ocultar' : 'Ver'} versión original</button>}>
      <div className="border-t border-hairline px-5 py-3 grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Fila t="Objetivo" v={e.objetivo} />
        <Fila t="Audiencia" v={`${e.audiencia.edad} · ${e.audiencia.ciudades.join(' y ')} · ${e.audiencia.nse}`} />
        <Fila t="Creadores" v={`${e.creadores.cantidad} · ${e.creadores.temas.join(' y ')}`} />
        <Fila t="Entregables" v={`${entregablesTexto(e.entregables)} por creador`} />
        <Fila t="Fechas" v={`Publicación ${formatDate(e.fechas.desde)} – ${formatDate(e.fechas.hasta)}`} />
        <Fila t="Presupuesto" v={`${money(e.presupuesto.min)} – ${money(e.presupuesto.max)}`} />
        <Fila t="Usos" v={usosTexto(e.usos)} />
        <Fila t="KPIs" v={e.kpis.join(', ')} />
        <Fila t="Restricciones" v={e.restricciones.join(' · ')} />
        <Fila t="Menciones" v={e.menciones.join(' · ')} />
      </div>
      {ver && <div className="mx-5 mb-4 bg-frost rounded-[8px] px-3 py-2.5 text-[12.5px] text-smoke">{original}</div>}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Comparador y perfil del creador
// ---------------------------------------------------------------------------

export function Comparador() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s = useMarket();
  const { empresaId } = useCuenta();
  const briefId = params.get('brief') ?? s.briefs.find((b) => b.empresaId === empresaId && b.estado === 'Publicado')?.id;
  const b = s.briefs.find((x) => x.id === briefId);
  const pre = s.postulaciones.filter((p) => p.briefId === briefId && p.lineas.length && p.estado !== 'Por confirmar agencia');
  const ids = params.get('ids')?.split(',').filter(Boolean) ?? pre.slice(0, 3).map((p) => p.creadorId);
  if (!b) return <Pagina titulo="Comparar creadores"><VerComo tipo="empresa" /><Vacio texto="Elige un brief publicado para comparar creadores." /></Pagina>;
  return (
    <Pagina titulo="Comparar creadores" sub={`${b.marca} · ${b.titulo} · métricas de cuentas asociadas e historial en Influ`}
      right={<Select value={b.id} onChange={(e) => navigate(`${base}/creadores?brief=${e.target.value}`)} bare className="text-[12px] border border-hairline rounded-full px-3 py-1.5">{s.briefs.filter((x) => x.empresaId === b.empresaId).map((x) => <option key={x.id} value={x.id}>{`${x.marca} · ${x.titulo}`}</option>)}</Select>}>
      <div className="flex gap-1.5 flex-wrap">
        {pre.map((p) => { const c = s.creadores.find((x) => x.id === p.creadorId)!; const on = ids.includes(c.id); return <Link key={p.id} to={`${base}/creadores?brief=${b.id}&ids=${(on ? ids.filter((x) => x !== c.id) : [...ids, c.id]).join(',')}`}><Chip activo={on}>{c.handle}</Chip></Link>; })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ids.map((id, i) => {
          const c = s.creadores.find((x) => x.id === id);
          if (!c) return null;
          const m = scoreMatch(c, b.estructurado, s.pesos);
          const p = s.postulaciones.find((x) => x.briefId === b.id && x.creadorId === id);
          const tarifa = p?.lineas.length ? totalLineas(p.lineas) : tarifaEstimada(c, b.estructurado.entregables);
          const hechas = c.historial.length;
          return (
            <div key={id} className={`bg-white border rounded-[12px] p-4 flex flex-col gap-1 ${i === 0 ? 'border-blue' : 'border-hairline'}`}>
              <div className="flex items-center gap-3 mb-2"><Score valor={m.score} /><span><Link to={`${base}/creadores/${c.id}?brief=${b.id}`} className="block text-[16px] font-semibold text-carbon">{c.handle}</Link><span className="text-[12px] text-ash">Score de match</span></span></div>
              <Fila t="Audiencia en MX" v={`${c.audiencia.mx}%`} />
              <Fila t="Edad 25–44" v={`${c.audiencia.edad25a44}%`} />
              <Fila t="Vistas medianas por reel" v={k(c.vistasMedianas)} />
              <Fila t="CPM histórico" v={money(c.cpmHistorico)} />
              <Fila t="Entregas a tiempo" v={hechas ? `${Math.round(c.historial.filter((h) => h.aTiempo).length / hechas * 100)}% · ${hechas} campañas` : 'Sin historial'} />
              <Fila t="Tarifa del creador" v={money(tarifa)} />
              <Fila t={`Fee Influ (${Math.round(FEE_INFLU * 100)}%)`} v={money(fee(tarifa))} />
              <div className="mt-2 bg-ice rounded-[8px] px-3 py-2 text-[12px] text-smoke border-l-4 border-blue">{m.explicacion}</div>
              <div className="mt-2 flex flex-col gap-1">
                {(Object.entries(m.componentes) as [string, number][]).map(([kk, v]) => <div key={kk} className="flex items-center gap-2 text-[11px] text-ash"><span className="w-24 capitalize">{kk}</span><div className="flex-1"><MiniBar value={v} max={100} label={String(v)} /></div></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </Pagina>
  );
}

export function PerfilCreador() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const s = useMarket();
  const { talentos } = useNucleo();
  const operaciones = useNucleoOps();
  const c = s.creadores.find((x) => x.id === id);
  if (!c) return <Pagina titulo="Creador"><Vacio texto="No encontrado." /></Pagina>;
  const tal = talentos.find((t) => t.id === c.talentoId);
  const ig = c.redes.find((r) => r.red === 'Instagram');
  const edades = ['18–24', '25–34', '35–44', '45–54', '55+'].map((r, i) => ({ r, v: c.audiencia.edades[i] ?? 0 }));
  const verificadas = s.contrataciones.filter((x) => x.creadorId === c.id && x.publicacion);
  const deFactoraje = operaciones.filter((o) => o.talentoId === c.talentoId).length;
  return (
    <Pagina titulo={c.handle} sub={`${c.nombre} · ${c.temas.join(' y ')} · ${c.ciudad}${c.agenciaId ? ' · representado por agencia' : ''}`} right={params.get('brief') && <Link to={`${base}/briefs/${params.get('brief')}`}><Button variant="ghost">Volver al brief</Button></Link>}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label={`Seguidores ${ig?.red === 'Instagram' ? 'IG' : ''}`} value={k(ig?.seguidores ?? seguidoresDe(c))} note={ig?.asociada ? 'Cuenta asociada ✓' : 'Cuenta sin asociar'} />
        <KpiCard label="Engagement" value={`${c.engagement.toFixed(1)}%`} />
        <KpiCard label="Vistas medianas por reel" value={k(c.vistasMedianas)} />
        <KpiCard label="Audiencia real" value={`${c.audiencia.real}%`} note="autenticidad de la audiencia" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Audiencia" subtitle="Datos de la cuenta asociada">
          <div className="border-t border-hairline px-5 py-4">
            <div className="text-[12px] text-ash mb-2">Edad</div>
            <div className="h-44"><ResponsiveContainer><BarChart data={edades}><CartesianGrid vertical={false} stroke={TINTA.rejilla} /><XAxis dataKey="r" {...ejeX} /><YAxis {...ejeY} unit="%" width={34} /><Tooltip {...tooltipEstilo} /><Bar dataKey="v" name="%" fill={CATEGORICA[2]} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="text-[12.5px] text-smoke mt-2">{c.audiencia.ciudades.map((x) => `${x.ciudad} ${x.pct}%`).join(' · ')} · Hombres {c.audiencia.hombres}% · México {c.audiencia.mx}%</div>
          </div>
        </Panel>
        <Panel title="Historial verificado en Influ" subtitle={`${c.historial.length} campañas${deFactoraje ? ` · ${deFactoraje} colaboraciones con adelanto (Fase 1)` : ''}${tal ? '' : ''}`}>
          <div className="border-t border-hairline">
            <table className="w-full"><thead><tr className="border-b border-hairline"><Th>Campaña</Th><Th right>Vistas</Th><Th>Estado</Th></tr></thead>
              <tbody>{[...c.historial].reverse().slice(0, 8).map((h, i) => <tr key={i} className="border-b border-hairline last:border-0"><Td>{h.campana}</Td><Td right>{h.vistas ? k(h.vistas) : '—'}</Td><Td><Estado e={h.aTiempo ? 'A tiempo' : 'Con atraso'} /></Td></tr>)}</tbody></table>
            {!c.historial.length && <Vacio texto="Sin campañas previas en Influ." />}
            {verificadas.length > 0 && <div className="px-5 py-2 text-[11px] text-mist">Publicaciones detectadas en la cuenta asociada: {verificadas.length}.</div>}
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}

const sinOps: { talentoId: string; monto: number }[] = [];
function useNucleoOps() {
  return useInflu((st) => (st as unknown as { operaciones?: { talentoId: string; monto: number }[] }).operaciones ?? sinOps);
}

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------

export function MensajesMarca() {
  const { id } = useParams();
  const s = useMarket();
  const { empresaId } = useCuenta();
  const convs = s.conversaciones.filter((c) => s.briefs.find((b) => b.id === c.briefId)?.empresaId === empresaId);
  if (id) {
    const c = s.conversaciones.find((x) => x.id === id);
    const cr = s.creadores.find((x) => x.id === c?.creadorId);
    const b = s.briefs.find((x) => x.id === c?.briefId);
    return <Pagina titulo={`${cr?.handle ?? ''} · ${b?.marca ?? ''} ${b?.titulo ?? ''}`} right={<Link to={`${base}/mensajes`}><Button variant="ghost">Todos los mensajes</Button></Link>}><Hilo convId={id} /></Pagina>;
  }
  return (
    <Pagina titulo="Mensajes" sub="Un chat por creador; la oferta se negocia por versiones dentro del chat.">
      <VerComo tipo="empresa" />
      <Panel><ListaHilos convs={convs} ruta={(x) => `${base}/mensajes/${x}`} /></Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Contenidos: revisión y aprobación (aprobar = pago automático)
// ---------------------------------------------------------------------------

const IconoCheck = ({ nivel }: { nivel: 'ok' | 'aviso' | 'falla' }) =>
  nivel === 'ok' ? <CheckCircle2 size={16} className="text-success shrink-0" /> : nivel === 'aviso' ? <AlertTriangle size={16} className="text-warning shrink-0" /> : <XCircle size={16} className="text-danger shrink-0" />;

export function Contenidos() {
  const { id } = useParams();
  const s = useMarket();
  const { empresaId } = useCuenta();
  const cts = s.contrataciones.filter((c) => c.empresaId === empresaId).sort((a, b) => (b.entregas.at(-1)?.fechaHora ?? b.aceptada).localeCompare(a.entregas.at(-1)?.fechaHora ?? a.aceptada));
  if (id) return <RevisarContenido ctId={id} />;
  return (
    <Pagina titulo="Contenidos" sub="Revisa cada entrega con la observación de la IA; aprobar libera el pago al creador o a su agencia.">
      <VerComo tipo="empresa" />
      <Panel>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Creador', 'Campaña', 'Acuerdo', 'Contenido', 'Pago', 'Publicación', ''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {cts.map((c) => {
                const cr = s.creadores.find((x) => x.id === c.creadorId);
                const b = s.briefs.find((x) => x.id === c.briefId);
                const e = c.entregas.at(-1);
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0 hover:bg-haze">
                    <Td className="font-semibold">{cr?.handle}</Td>
                    <Td>{b?.marca} · {b?.titulo}</Td>
                    <Td>{c.acuerdo.marca && c.acuerdo.creador ? <Estado e="Aceptada">Firmado</Estado> : <Estado e="Acuerdo por firmar" />}</Td>
                    <Td>{e ? <Estado e={e.estado}>{e.estado} · ronda {e.ronda}</Estado> : <span className="text-mist">Sin entregar</span>}</Td>
                    <Td>{c.dispersion ? <Estado e={c.dispersion.estado} /> : <span className="text-mist">—</span>}</Td>
                    <Td>{c.publicacion ? <Estado e={c.publicacion.estado} /> : <span className="text-mist">—</span>}</Td>
                    <Td><Link to={`${base}/contenidos/${c.id}`} className="text-blue-link text-[12px] flex items-center gap-0.5">{e?.estado === 'En revisión' ? 'Revisar' : 'Ver'} <ChevronRight size={12} /></Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!cts.length && <Vacio texto="Aún no hay contrataciones." />}
        </div>
      </Panel>
    </Pagina>
  );
}

function RevisarContenido({ ctId }: { ctId: string }) {
  const s = useMarket();
  const { cuenta, permisos } = useCuenta();
  const [nota, setNota] = useState('');
  const [cal, setCal] = useState({ e: 0, n: '' });
  const ct = s.contrataciones.find((x) => x.id === ctId);
  if (!ct) return <Pagina titulo="Contenido"><Vacio texto="No encontrado." /></Pagina>;
  const cr = s.creadores.find((x) => x.id === ct.creadorId)!;
  const b = s.briefs.find((x) => x.id === ct.briefId)!;
  const of = s.conversaciones.find((x) => x.id === ct.convId)?.ofertas.find((o) => o.version === ct.oferta);
  const e = ct.entregas.at(-1);
  const falta = faltaParaDispersar(s, ct);
  const aprueban = cuenta?.equipo.filter((x) => x.permisos.includes('Aprueba contenido')).map((x) => x.nombre) ?? [];
  return (
    <Pagina titulo={`Revisar contenido · ${cr.handle}`} sub={e ? `${e.archivo.split('.').pop() === 'mp4' ? 'Reel' : 'Contenido'} · ronda ${e.ronda} de ${of?.rondas ?? 2} · entregado el ${formatDate(e.fechaHora.slice(0, 10))}` : `${b.marca} · ${b.titulo} · todavía sin entrega`}
      right={<Link to={`${base}/contenidos`}><Button variant="ghost">Todos los contenidos</Button></Link>}>
      <Stepper pasos={['Oferta aceptada', 'Acuerdo firmado', 'Contenido', 'Aprobación y pago', 'Publicación', 'KPIs']}
        actual={!ct.acuerdo.marca || !ct.acuerdo.creador ? 1 : !e ? 2 : !ct.aprobada ? 3 : !ct.publicacion ? 4 : 5} completo={ct.estado === 'Cerrada'} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 items-start">
        <div className="rounded-[12px] bg-gradient-to-br from-carbon to-[#0f9b8e] min-h-[380px] flex flex-col items-center justify-center text-white gap-2">
          {e ? <><Play size={44} className="fill-white" /><span className="text-[13px] font-semibold">{e.archivo} · 0:{String(e.duracion).padStart(2, '0')}</span><span className="text-[12px] text-white/80 px-6 text-center">“{e.texto}”</span></> : <span className="text-[13px] text-white/70">El creador todavía no entrega</span>}
        </div>
        <div className="flex flex-col gap-4">
          {!ct.acuerdo.marca && (
            <Panel title="Acuerdo de colaboración" subtitle="Firma electrónica de la marca y del creador (o su agencia)">
              <div className="border-t border-hairline px-5 py-3 flex items-center gap-3 flex-wrap"><span className="text-[13px] text-ash">Creador: {ct.acuerdo.creador ? `firmó ${fechaHora(ct.acuerdo.creador)}` : 'pendiente'}</span><Button size="sm" disabled={!permisos.includes('Aprueba ofertas')} onClick={() => s.firmarAcuerdo(ct.id)}>Firmar como marca</Button></div>
            </Panel>
          )}
          {e && (
            <Panel title="Revisión de la IA contra el brief">
              <div className="border-t border-hairline px-5 py-3 flex flex-col gap-2.5">
                {e.chequeos.map((x, i) => <div key={i} className="flex items-center gap-2.5 text-[13.5px] text-carbon"><IconoCheck nivel={x.nivel} />{x.texto}</div>)}
              </div>
            </Panel>
          )}
          <Panel title="Tu decisión">
            <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
              {ct.dispersion?.estado === 'Pagada'
                ? <div className="bg-success-wash rounded-[8px] px-3 py-2.5 text-[13px] text-success border-l-4 border-success">Aprobado por {ct.aprobada?.usuario} · pagados {money(ct.tarifa)} a {ct.beneficiario.nombre} el {fechaHora(ct.dispersion.fechaHora)} ({ct.dispersion.via}).</div>
                : <div className="bg-success-wash/60 rounded-[8px] px-3 py-2.5 text-[13px] text-carbon border-l-4 border-success">Al aprobar, se pagan automáticamente <b>{money(ct.tarifa)}</b> a {ct.beneficiario.nombre}{ct.beneficiario.tipo === 'Agencia' ? ` por ${cr.nombre.split(' ')[0]} ${cr.nombre.split(' ')[1]?.[0] ?? ''}.` : ''}</div>}
              {ct.dispersion?.estado === 'Retenida' && <div className="text-[12px] text-warning">Pago retenido: {ct.dispersion.motivo}.</div>}
              {!ct.dispersion && falta.length > 0 && <div className="text-[12px] text-warning">Para que el pago salga solo falta: {falta.join(', ')}.</div>}
              {e?.estado === 'En revisión' && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <Button disabled={!permisos.includes('Aprueba contenido')} onClick={() => s.aprobarContenido(ct.id)}>Aprobar y liberar pago</Button>
                    <Button variant="outlined" disabled={!permisos.includes('Aprueba contenido') || !nota.trim()} onClick={() => { if (s.pedirCambios(ct.id, nota)) setNota(''); }}>Pedir cambios</Button>
                  </div>
                  <textarea value={nota} onChange={(x) => setNota(x.target.value)} rows={2} placeholder="Qué cambios pides (para Pedir cambios)" className="border border-hairline rounded-[8px] px-3 py-2 text-[13px]" />
                </>
              )}
              <div className="text-[12px] text-ash">Aprueban: {aprueban.join(', ') || 'nadie con permiso'}{permisos.includes('Aprueba contenido') ? '' : ' · tu usuario no aprueba contenido'}</div>
              {ct.entregas.length > 1 && <div className="text-[12px] text-mist">Rondas: {ct.entregas.map((x) => `${x.ronda} ${x.estado.toLowerCase()}${x.decision?.nota ? ` ("${x.decision.nota}")` : ''}`).join(' · ')}</div>}
            </div>
          </Panel>
          {ct.publicacion && (
            <Panel title="Publicación" right={<Estado e={ct.publicacion.estado} />}>
              <div className="border-t border-hairline px-5 py-3 flex flex-col gap-2">
                {ct.publicacion.checks.map((x, i) => <div key={i} className="flex items-center gap-2 text-[13px]"><IconoCheck nivel={x.nivel} />{x.texto}</div>)}
                {ct.publicacion.estado !== 'No detectada' && (
                  ct.calificaciones.marca
                    ? <div className="text-[12px] text-ash flex items-center gap-2">Tu calificación: <Estrellas valor={ct.calificaciones.marca.estrellas} /> {ct.calificaciones.marca.nota}</div>
                    : <div className="flex items-center gap-2 flex-wrap border-t border-hairline pt-2"><span className="text-[12px] text-ash">Califica al creador:</span><Estrellas valor={cal.e} onChange={(n) => setCal({ ...cal, e: n })} /><input value={cal.n} onChange={(x) => setCal({ ...cal, n: x.target.value })} placeholder="Comentario" className="text-[12px] border border-hairline rounded-full px-3 py-1 flex-1 min-w-32" /><Button size="sm" variant="outlined" onClick={() => s.calificar(ct.id, cal.e, cal.n)}>Calificar</Button></div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function csv(nombre: string, filas: (string | number)[][]) {
  const texto = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${texto}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Kpis() {
  const [params, setParams] = useSearchParams();
  const s = useMarket();
  const { empresaId } = useCuenta();
  const briefs = s.briefs.filter((b) => b.empresaId === empresaId && s.contrataciones.some((c) => c.briefId === b.id));
  const briefId = params.get('brief') ?? briefs[0]?.id;
  const b = s.briefs.find((x) => x.id === briefId);
  const [dia, setDia] = useState<'hoy' | 7 | 30>('hoy');
  const cts = s.contrataciones.filter((c) => c.briefId === briefId);
  const corte = (c: Contratacion) => (dia === 'hoy' ? ultimo(c.snapshots) : foto(c.snapshots, dia));
  const tot = useMemo(() => {
    const ss = cts.map(corte).filter(Boolean);
    const sumar = (kk: 'vistas' | 'alcance' | 'interacciones' | 'clics' | 'ventas') => ss.reduce((t, x) => t + (x?.[kk] ?? 0), 0);
    const pagado = cts.filter((c) => corte(c)).reduce((t, c) => t + c.tarifa, 0);
    return { vistas: sumar('vistas'), alcance: sumar('alcance'), inter: sumar('interacciones'), clics: sumar('clics'), ventas: sumar('ventas'), cpm: sumar('vistas') ? Math.round(pagado / sumar('vistas') * 1000) : 0 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cts, dia]);
  // Promedio de su categoría y tamaño dentro de Influ: todo lo publicado fuera de esta campaña.
  const otros = s.contrataciones.filter((c) => c.briefId !== briefId && c.snapshots.length);
  const prom = otros.length ? { er: otros.reduce((t, c) => t + costos(c.tarifa, ultimo(c.snapshots)).er, 0) / otros.length, cpm: otros.reduce((t, c) => t + costos(c.tarifa, ultimo(c.snapshots)).cpm, 0) / otros.length } : null;
  const maxDia = Math.max(0, ...cts.map((c) => ultimo(c.snapshots)?.dia ?? 0));
  const serie = Array.from({ length: Math.min(30, maxDia) + 1 }, (_, i) => Object.fromEntries([['dia', `D${i}`], ...cts.map((c) => [s.creadores.find((x) => x.id === c.creadorId)?.handle ?? c.id, foto(c.snapshots, i)?.vistas ?? null])]));
  const exportar = () => csv(`kpis_${b?.marca}_${b?.titulo}.csv`.replace(/\s+/g, '_'), [
    ['Creador', 'Publicación', 'Vistas', 'Alcance', 'Impresiones', 'Interacciones', 'Guardados', 'Compartidos', 'Clics (UTM)', 'Ventas (código)', 'ER %', 'CPM', 'Costo por vista', 'Costo por interacción', 'Costo por clic', 'Monto pagado'],
    ...cts.map((c) => { const x = corte(c); const k2 = costos(c.tarifa, x); return [s.creadores.find((y) => y.id === c.creadorId)?.handle ?? '', c.publicacion?.estado ?? 'Sin publicar', x?.vistas ?? 0, x?.alcance ?? 0, x?.impresiones ?? 0, x?.interacciones ?? 0, x?.guardados ?? 0, x?.compartidos ?? 0, x?.clics ?? 0, x?.ventas ?? 0, k2.er, k2.cpm, k2.porVista, k2.porInteraccion, k2.porClic, c.tarifa]; }),
  ]);
  if (!b) return <Pagina titulo="KPIs"><VerComo tipo="empresa" /><Vacio texto="Aún no hay campañas con creadores contratados." /></Pagina>;
  return (
    <Pagina titulo={`KPIs · ${b.marca} ${b.titulo}`} sub={`Actualizado cada 24 h durante 30 días · día ${maxDia}${maxDia >= 7 ? ' · foto oficial D7 congelada' : ''}${maxDia >= 30 ? ' · foto oficial D30 congelada' : ''}`}
      right={<>
        <Select bare className="text-[12px] border border-hairline rounded-full px-3 py-1.5" value={b.id} onChange={(e) => setParams({ brief: e.target.value })}>{briefs.map((x) => <option key={x.id} value={x.id}>{`${x.marca} · ${x.titulo}`}</option>)}</Select>
        <Chip activo={dia === 'hoy'} onClick={() => setDia('hoy')}>Hoy</Chip><Chip activo={dia === 7} onClick={() => setDia(7)}>Foto D7</Chip><Chip activo={dia === 30} onClick={() => setDia(30)}>Foto D30</Chip>
      </>}>
      <VerComo tipo="empresa" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Vistas" value={k(tot.vistas)} note={dia === 'hoy' ? 'acumuladas' : `foto oficial D${dia}`} />
        <KpiCard label="Alcance" value={k(tot.alcance)} />
        <KpiCard label="Interacciones" value={k(tot.inter)} note={`${k(tot.clics)} clics con UTM · ${tot.ventas} ventas con código`} />
        <KpiCard label="CPM" value={money(tot.cpm)} note="con el monto realmente pagado" />
      </div>
      <Panel title="Comparativo de creadores" subtitle={prom ? `Contra el promedio de su categoría en Influ: ER ${prom.er.toFixed(1)}% · CPM ${money(prom.cpm)}` : undefined} right={<Button size="sm" variant="outlined" onClick={exportar}><Download size={13} /> Exportar reporte</Button>}>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Creador', 'Publicación', 'Vistas', 'ER', 'CPM', 'Costo por vista', 'Costo por interacción', 'Costo por clic', 'Ventas'].map((h, i) => <Th key={h} right={i > 1}>{h}</Th>)}</tr></thead>
            <tbody>
              {cts.map((c) => {
                const x = corte(c); const kk = costos(c.tarifa, x);
                const cr = s.creadores.find((y) => y.id === c.creadorId);
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <Td className="font-medium">{cr?.handle}</Td>
                    <Td>{c.publicacion ? <Estado e={c.publicacion.estado} /> : <Estado e={c.entregas.at(-1)?.estado ?? 'Borrador'}>{c.entregas.length ? `Contenido ${c.entregas.at(-1)!.estado.toLowerCase()}` : 'Sin publicar'}</Estado>}</Td>
                    <Td right>{x ? k(x.vistas) : '—'}</Td>
                    <Td right className={prom && x && kk.er < prom.er ? 'text-warning' : ''}>{x ? `${kk.er.toFixed(1)}%` : '—'}</Td>
                    <Td right className={prom && x && kk.cpm > prom.cpm * 1.3 ? 'text-danger' : ''}>{x ? money(kk.cpm) : '—'}</Td>
                    <Td right>{x ? `$${kk.porVista.toFixed(2)}` : '—'}</Td>
                    <Td right>{x ? `$${kk.porInteraccion.toFixed(1)}` : '—'}</Td>
                    <Td right>{x ? `$${kk.porClic.toFixed(0)}` : '—'}</Td>
                    <Td right>{x ? x.ventas : '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {serie.length > 1 && (
        <Panel title="Vistas acumuladas por creador" subtitle="Snapshots cada 24 h; nunca se sobreescriben">
          <div className="border-t border-hairline px-3 py-3 h-72">
            <ResponsiveContainer><LineChart data={serie}><CartesianGrid vertical={false} stroke={TINTA.rejilla} /><XAxis dataKey="dia" {...ejeX} /><YAxis {...ejeY} tickFormatter={ejePiezas} width={42} /><Tooltip {...tooltipEstilo} /><Legend wrapperStyle={leyendaEstilo} />
              {cts.map((c, i) => <Line key={c.id} type="monotone" dataKey={s.creadores.find((x) => x.id === c.creadorId)?.handle ?? c.id} stroke={CATEGORICA[i % CATEGORICA.length]} strokeWidth={2} dot={false} connectNulls />)}
            </LineChart></ResponsiveContainer>
          </div>
        </Panel>
      )}
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Pagos y estado de cuenta
// ---------------------------------------------------------------------------

export function PagosMarca() {
  const s = useMarket();
  const { empresaId, cuenta } = useCuenta();
  if (!cuenta) return <SinCuenta />;
  const facs = s.facturas.filter((f) => f.empresaId === empresaId).sort((a, b) => (b.emitida ?? '9').localeCompare(a.emitida ?? '9'));
  const actual = facs.find((f) => !f.pagada) ?? facs[0];
  const cts = s.contrataciones.filter((c) => c.empresaId === empresaId);
  return (
    <Pagina titulo="Pagos" sub={`Un solo proveedor: Influ · condición: ${cuenta.condicion.tipo === 'Prepago' ? 'prepago' : `plazo de ${cuenta.condicion.dias} días · límite ${money(cuenta.condicion.limite)}`}`}>
      <VerComo tipo="empresa" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Tarifas de creadores" value={money(actual?.tarifas ?? 0)} note={actual?.campana} />
        <KpiCard label="Fee Influ" value={money(actual?.fee ?? 0)} note={`${Math.round(FEE_INFLU * 100)}% sobre tarifas`} />
        <KpiCard label="Total campaña" value={money(actual?.total ?? 0)} note={actual?.uuid ? 'facturado' : 'por facturar'} />
        <KpiCard label="Vencimiento" value={actual?.vence ? formatDate(actual.vence, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'} note={cuenta.condicion.tipo === 'Plazo' ? `crédito usado ${money(creditoUsado(s, empresaId))}` : 'prepago'} />
      </div>
      <Panel title="Estado de cuenta" subtitle="Influ te emite una factura por campaña; tú no das de alta a cada creador.">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Campaña', 'Creadores', 'Total', 'Factura Influ (UUID)', 'Vence', 'Estado'].map((h, i) => <Th key={h} right={i === 1 || i === 2}>{h}</Th>)}</tr></thead>
            <tbody>
              {facs.map((f) => (
                <tr key={f.id} className="border-b border-hairline last:border-0">
                  <Td>{f.campana}</Td><Td right>{f.creadores}</Td><Td right>{money(f.total)}</Td>
                  <Td className="font-mono text-[12px]">{f.uuid ? `${f.uuid.slice(0, 4)}…${f.uuid.slice(-4)}` : <span className="text-mist">por emitir</span>}</Td>
                  <Td>{f.vence ? formatDate(f.vence) : '—'}</Td>
                  <Td><Estado e={f.pagada ? 'Pagada' : !f.uuid ? 'Borrador' : f.vence && f.vence < HOY_ISO ? 'Vencida' : 'Por vencer'}>{f.pagada ? 'Pagada' : !f.uuid ? 'Por facturar' : f.vence && f.vence < HOY_ISO ? 'Vencida' : 'Por vencer'}</Estado></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!facs.length && <Vacio texto="Sin facturas todavía." />}
        </div>
      </Panel>
      <Panel title="Transparencia: lo que cobra cada creador" subtitle="Tarifa del creador (tal como la fija su agencia, si la tiene) y fee de Influ por separado">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full">
            <thead><tr className="border-b border-hairline">{['Creador', 'Campaña', 'Tarifa', 'Fee', 'Pago al creador'].map((h, i) => <Th key={h} right={i > 1 && i < 4}>{h}</Th>)}</tr></thead>
            <tbody>{cts.map((c) => <tr key={c.id} className="border-b border-hairline last:border-0"><Td>{s.creadores.find((x) => x.id === c.creadorId)?.handle}</Td><Td>{s.briefs.find((x) => x.id === c.briefId)?.titulo}</Td><Td right>{money(c.tarifa)}</Td><Td right>{money(c.fee)}</Td><Td>{c.dispersion ? <Estado e={c.dispersion.estado}>{c.dispersion.estado}{c.dispersion.estado === 'Pagada' ? ` ${fechaHora(c.dispersion.fechaHora)}` : ''}</Estado> : <span className="text-mist">al aprobar el contenido</span>}</Td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Equipo de la marca y alta por invitación
// ---------------------------------------------------------------------------

const PERMISOS: PermisoMk[] = ['Admin', 'Aprueba contenido', 'Aprueba ofertas', 'Comenta'];

export function AltaMarca({ cuenta, publico }: { cuenta: CuentaMarca; publico?: boolean }) {
  const s = useMarket();
  const { empresas } = useNucleo();
  const nombre = useNombreEmpresa();
  const emp = empresas.find((e) => e.id === cuenta.empresaId);
  const [paso, setPaso] = useState<'empresa' | 'equipo' | 'pagos'>(!cuenta.pasos.empresa ? 'empresa' : !cuenta.pasos.equipo ? 'equipo' : 'pagos');
  const [marcas, setMarcas] = useState<string[]>(cuenta.marcas.length ? cuenta.marcas : ['']);
  const [equipo, setEquipo] = useState(cuenta.equipo.length ? cuenta.equipo : [{ nombre: '', email: '', area: 'Marketing', permisos: ['Admin', 'Aprueba contenido'] as PermisoMk[] }]);
  const [pagos, setPagos] = useState(cuenta.contactoPagos.nombre ? cuenta.contactoPagos : { nombre: emp?.contactoPagos?.nombre ?? '', email: emp?.contactoPagos?.email ?? '' });
  const guardar = (p: typeof paso) => {
    if (s.completarAlta(cuenta.invitada.token, { marcas, equipo, contactoPagos: pagos }, p)) setPaso(p === 'empresa' ? 'equipo' : 'pagos');
  };
  const idx = ['empresa', 'equipo', 'pagos'].indexOf(paso);
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] text-ash">Invitación de Influ · configura tu cuenta en 3 pasos{publico ? '' : ''}</div>
      <Stepper pasos={['Empresa', 'Equipo', 'Pagos']} actual={idx} completo={cuenta.estado === 'Activa'} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Empresa">
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <Input label="Empresa" value={emp?.razonSocial ?? nombre(cuenta.empresaId)} readOnly />
            <Input label="RFC" value={emp?.rfc ?? ''} readOnly />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ash">Marcas anunciantes</span>
              {marcas.map((m, i) => <input key={i} value={m} onChange={(e) => setMarcas(marcas.map((x, j) => j === i ? e.target.value : x))} placeholder="Ej. Porsche" className="border border-hairline rounded-[8px] px-3 py-2 text-[14px]" />)}
              <button onClick={() => setMarcas([...marcas, ''])} className="self-start text-[12px] text-blue-link font-medium">+ Agregar</button>
            </div>
            <div className="bg-ice rounded-[8px] px-3 py-2.5 text-[13px] border-l-4 border-blue">Condición asignada: <b>{cuenta.condicion.tipo === 'Prepago' ? 'prepago' : `plazo de ${cuenta.condicion.dias} días`}</b>{cuenta.condicion.tipo === 'Plazo' ? ` · límite de ${money(cuenta.condicion.limite)}` : ''}</div>
            {paso === 'empresa' && <Button className="self-start" onClick={() => guardar('empresa')}>Guardar y continuar</Button>}
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Equipo" subtitle="Usuarios y permisos: el administrador define quién acepta ofertas y aprueba contenido">
            <div className="border-t border-hairline px-5 py-3 flex flex-col gap-3">
              {equipo.map((e, i) => (
                <div key={i} className="flex flex-col gap-1.5 border-b border-hairline pb-3 last:border-0">
                  <div className="grid grid-cols-3 gap-2">
                    <input value={e.nombre} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, nombre: x.target.value } : y))} placeholder="Nombre" className="border border-hairline rounded-[8px] px-2.5 py-1.5 text-[13px]" />
                    <input value={e.email} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, email: x.target.value } : y))} placeholder="correo@empresa.com" className="border border-hairline rounded-[8px] px-2.5 py-1.5 text-[13px]" />
                    <input value={e.area} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, area: x.target.value } : y))} placeholder="Área" className="border border-hairline rounded-[8px] px-2.5 py-1.5 text-[13px]" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">{PERMISOS.map((p) => <Chip key={p} activo={e.permisos.includes(p)} onClick={() => setEquipo(equipo.map((y, j) => j === i ? { ...y, permisos: y.permisos.includes(p) ? y.permisos.filter((z) => z !== p) : [...y.permisos, p] } : y))}>{p}</Chip>)}</div>
                </div>
              ))}
              <button onClick={() => setEquipo([...equipo, { nombre: '', email: '', area: '', permisos: ['Comenta'] }])} className="self-start text-[12px] text-blue-link font-medium">+ Invitar usuario</button>
              {paso === 'equipo' && <Button className="self-start" onClick={() => guardar('equipo')}>Guardar y continuar</Button>}
            </div>
          </Panel>
          <Panel title="Pagos" subtitle="Influ es tu único proveedor: una factura por campaña.">
            <div className="border-t border-hairline px-5 py-3 grid grid-cols-2 gap-3">
              <Input label="Área de pagos · nombre" value={pagos.nombre} onChange={(e) => setPagos({ ...pagos, nombre: e.target.value })} />
              <Input label="Correo" value={pagos.email} onChange={(e) => setPagos({ ...pagos, email: e.target.value })} />
              {paso === 'pagos' && cuenta.estado !== 'Activa' && <Button className="self-start" onClick={() => guardar('pagos')}>Activar cuenta</Button>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function EquipoMarca() {
  const s = useMarket();
  const { empresaId, cuenta, permisos } = useCuenta();
  const { empresas } = useNucleo();
  const [equipo, setEquipo] = useState(cuenta?.equipo ?? []);
  if (!cuenta) return <SinCuenta />;
  if (cuenta.estado !== 'Activa') return <Pagina titulo={`Bienvenida, ${cuenta.marcas[0] ?? empresas.find((e) => e.id === empresaId)?.razonSocial ?? ''}`}><VerComo tipo="empresa" /><AltaMarca cuenta={cuenta} /></Pagina>;
  const emp = empresas.find((e) => e.id === empresaId);
  const admin = permisos.includes('Admin');
  return (
    <Pagina titulo="Equipo" sub="Usuarios de la empresa y sus permisos">
      <VerComo tipo="empresa" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 items-start">
        <Panel title="Empresa">
          <div className="border-t border-hairline px-5 py-3">
            <Fila t="Razón social" v={emp?.razonSocial ?? '—'} />
            <Fila t="RFC" v={emp?.rfc ?? '—'} />
            <Fila t="Marcas" v={cuenta.marcas.join(', ')} />
            <Fila t="Condición" v={cuenta.condicion.tipo === 'Prepago' ? 'Prepago' : `Plazo ${cuenta.condicion.dias} días · límite ${money(cuenta.condicion.limite)}`} />
            <Fila t="Área de pagos" v={`${cuenta.contactoPagos.nombre} · ${cuenta.contactoPagos.email}`} />
            <Fila t="Alta" v={`Invitación de ${cuenta.invitada.por} · ${fechaHora(cuenta.invitada.fechaHora)}`} />
          </div>
        </Panel>
        <Panel title="Usuarios y permisos" subtitle={admin ? 'Como administrador defines quién acepta ofertas y aprueba contenido; el resto participa comentando.' : 'Solo el administrador cambia permisos.'}>
          <div className="border-t border-hairline">
            <table className="w-full">
              <thead><tr className="border-b border-hairline"><Th>Usuario</Th><Th>Permisos</Th></tr></thead>
              <tbody>
                {equipo.map((e, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <Td>{admin && (!cuenta.equipo[i] || !e.nombre || !e.email) ? (
                      <div className="flex gap-1.5">
                        <input value={e.nombre} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, nombre: x.target.value } : y))} placeholder="Nombre" className="border border-hairline rounded-[8px] px-2 py-1 text-[12px] w-28" />
                        <input value={e.email} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, email: x.target.value } : y))} placeholder="correo" className="border border-hairline rounded-[8px] px-2 py-1 text-[12px] w-40" />
                        <input value={e.area} onChange={(x) => setEquipo(equipo.map((y, j) => j === i ? { ...y, area: x.target.value } : y))} placeholder="Área" className="border border-hairline rounded-[8px] px-2 py-1 text-[12px] w-24" />
                      </div>
                    ) : <><div className="text-carbon">{e.nombre} · {e.area.toLowerCase()}</div><div className="text-[11px] text-ash">{e.email}</div></>}</Td>
                    <Td><div className="flex gap-1 flex-wrap">{PERMISOS.map((p) => <Chip key={p} activo={e.permisos.includes(p)} onClick={admin ? () => setEquipo(equipo.map((y, j) => j === i ? { ...y, permisos: y.permisos.includes(p) ? y.permisos.filter((z) => z !== p) : [...y.permisos, p] } : y)) : undefined}>{p}</Chip>)}</div></Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admin && (
              <div className="px-5 py-3 flex gap-2">
                <Button size="sm" variant="outlined" onClick={() => setEquipo([...equipo, { nombre: '', email: '', area: 'Marketing', permisos: ['Comenta'] }])}>+ Invitar usuario</Button>
                <Button size="sm" onClick={() => s.guardarEquipo(empresaId, equipo.filter((e) => e.nombre || e.email))}>Guardar equipo y permisos</Button>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}
