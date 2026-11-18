import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, AlertTriangle, XCircle, Instagram, Music2, Youtube } from 'lucide-react';
import Panel from '../../components/ui/Panel';
import KpiCard from '../../components/ui/KpiCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Archivo from '../../components/ui/Archivo';
import Stepper from '../../components/ui/Stepper';
import { money, fechaHora, formatDate } from '../../lib/format';
import { CATEGORICA, ejeX, ejeY, tooltipEstilo, TINTA, ejePiezas } from '../../lib/charts';
import { d } from '../../data/constantes';
import { useMarket, faltaParaDispersar } from '../useMarket';
import { briefFueraDeCondiciones, costos, entregablesTexto, guiaPrecio, revisarContenido, scoreMatch, seguidoresDe, totalLineas, ultimo, usosTexto, foto, asociada } from '../logic';
import type { Condiciones, Creador, LineaPrecio, UsoMk } from '../types';
import { Chip, Estado, Estrellas, Fila, Pagina, Score, Td, Th, Vacio, VerComo, k, useCreadorActual, useNucleo } from '../ui';
import { Hilo, ListaHilos } from './comun';

const base = '/mk/creador';

function SinCreador() {
  return <Pagina titulo="Marketplace"><VerComo tipo="creador" /><Panel title="Tu perfil de creador todavía no está en el marketplace" subtitle="Se crea cuando tu cuenta de Influ queda preaprobada."><div className="h-2" /></Panel></Pagina>;
}

// ---------------------------------------------------------------------------
// Perfil y redes: asociación obligatoria + condiciones aceptables
// ---------------------------------------------------------------------------

const ICONO = { Instagram, TikTok: Music2, YouTube: Youtube } as Record<string, typeof Instagram>;

export function Redes() {
  const s = useMarket();
  const c = useCreadorActual();
  const [cond, setCond] = useState<Condiciones | null>(null);
  if (!c) return <SinCreador />;
  const cc = cond ?? c.condiciones;
  const redes = ['Instagram', 'TikTok', 'YouTube'].map((r) => c.redes.find((x) => x.red === r) ?? { red: r, usuario: '', asociada: false, seguidores: 0, fecha: undefined as string | undefined });
  return (
    <Pagina titulo="Perfil y redes" sub="Asocia tus redes: es obligatorio para postularte. Tus métricas y publicaciones se leen solas.">
      <VerComo tipo="creador" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {redes.map((r) => {
          const I = ICONO[r.red] ?? Instagram;
          return (
            <div key={r.red} className={`bg-white rounded-[12px] p-5 flex flex-col items-center gap-1.5 border ${r.asociada ? 'border-blue' : 'border-hairline'}`}>
              <I size={26} strokeWidth={1.5} className="text-carbon" />
              <div className="text-[16px] font-semibold text-carbon">{r.red}</div>
              <div className="text-[13px] text-ash">{r.usuario || c.handle}{r.red === 'YouTube' ? ' · opcional' : ''}</div>
              {r.asociada
                ? <><Estado e="Asociada" /><span className="text-[11px] text-mist">{k(r.seguidores)} seguidores · {fechaHora(r.fecha)}</span><button onClick={() => s.asociarRed(c.id, r.red, false)} className="text-[11px] text-danger hover:underline">Revocar acceso</button></>
                : <Button size="sm" variant={r.red === 'YouTube' ? 'outlined' : 'filled'} onClick={() => s.asociarRed(c.id, r.red, true)}>Asociar</Button>}
            </div>
          );
        })}
      </div>
      <Panel title="Qué autorizas">
        <div className="border-t border-hairline px-5 py-3 flex flex-col gap-2 text-[13.5px] text-carbon">
          {['Perfil, seguidores y audiencia (edad, género, ciudad)', 'Publicaciones, stories y sus métricas', 'Detección automática de las publicaciones de tus campañas'].map((t) => <span key={t} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" />{t}</span>)}
          <span className="text-[12px] text-ash mt-1">Puedes revocar el acceso cuando quieras. No publicamos nada en tu nombre.</span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Tarifas mínimas" subtitle="Las ofertas fuera de estas condiciones se marcan antes de llegarte">
          <div className="border-t border-hairline">
            <table className="w-full"><thead><tr className="border-b border-hairline"><Th>Formato</Th><Th right>Tarifa mínima</Th><Th right>Guía de mercado</Th></tr></thead>
              <tbody>{cc.tarifas.map((t, i) => {
                const g = t.formato === 'Paquete reel + 2 stories' ? null : guiaPrecio(t.formato, seguidoresDe(c));
                return (
                  <tr key={t.formato} className="border-b border-hairline last:border-0">
                    <Td>{t.formato === 'Reel' ? 'Reel IG' : t.formato === 'Story' ? 'Story IG (c/u)' : t.formato}</Td>
                    <Td right><input type="number" value={t.minimo} onChange={(e) => setCond({ ...cc, tarifas: cc.tarifas.map((x, j) => j === i ? { ...x, minimo: Number(e.target.value) } : x) })} className="w-28 text-right border border-hairline rounded-[6px] px-2 py-1" /></Td>
                    <Td right className="text-ash">{g ? `${money(g.min)} – ${money(g.max)}` : '—'}</Td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Condiciones">
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <div className="flex gap-1.5 flex-wrap items-center"><span className="text-[12px] text-ash mr-1">Usos que acepto</span>
              {(['Orgánico', 'Pauta pagada', 'Cuenta de la marca'] as UsoMk[]).map((u) => <Chip key={u} activo={cc.usos.includes(u)} onClick={() => setCond({ ...cc, usos: cc.usos.includes(u) ? cc.usos.filter((x) => x !== u) : [...cc.usos, u] })}>{u === 'Cuenta de la marca' ? 'Publicar desde la cuenta de la marca' : u}</Chip>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Licencia máxima (meses)" type="number" value={cc.licenciaMaxMeses} onChange={(e) => setCond({ ...cc, licenciaMaxMeses: Number(e.target.value) })} />
              <Input label="Exclusividad máxima (días por categoría)" type="number" value={cc.exclusividadMaxDias} onChange={(e) => setCond({ ...cc, exclusividadMaxDias: Number(e.target.value) })} />
              <Input label="Plazo mínimo de entrega (días)" type="number" value={cc.plazoMinDias} onChange={(e) => setCond({ ...cc, plazoMinDias: Number(e.target.value) })} />
              <Input label="Rondas de cambios (hasta)" type="number" value={cc.rondasMax} onChange={(e) => setCond({ ...cc, rondasMax: Number(e.target.value) })} />
            </div>
            <Button className="self-start" disabled={!cond} onClick={() => { if (s.guardarCondiciones(c.id, cc)) setCond(null); }}>Guardar condiciones</Button>
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Oportunidades y postulación con presupuesto
// ---------------------------------------------------------------------------

export function Oportunidades() {
  const s = useMarket();
  const c = useCreadorActual();
  if (!c) return <SinCreador />;
  const lista = s.briefs.filter((b) => b.estado === 'Publicado')
    .map((b) => {
      const p = s.postulaciones.find((x) => x.briefId === b.id && x.creadorId === c.id);
      return { b, p, m: scoreMatch(c, b.estructurado, s.pesos), fuera: briefFueraDeCondiciones(c.condiciones, b.estructurado) };
    })
    .filter((x) => x.p || (x.b.modo.abierto && x.m.score >= 50))
    .sort((a, z) => z.m.score - a.m.score);
  return (
    <Pagina titulo="Oportunidades" sub="Briefs que coinciden con tu perfil, ordenados por score de match" ancho="max-w-[1100px]">
      <VerComo tipo="creador" />
      {!asociada(c) && <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-4 py-3 text-[13px] text-warning">Asocia al menos una red en <Link to={`${base}/redes`} className="underline">Perfil y redes</Link> para postularte.</div>}
      <div className="flex flex-col gap-3">
        {lista.map(({ b, p, m, fuera }) => {
          const porCreador = b.estructurado.presupuesto.max / Math.max(1, b.estructurado.creadores.cantidad);
          const etiqueta = p && ['Contratado', 'Nueva', 'Preseleccionado', 'Por confirmar agencia'].includes(p.estado) ? p.estado : fuera.length ? 'Fuera de tus condiciones' : p?.origen === 'Invitado' ? 'Te invitaron' : 'Abierto';
          return (
            <div key={b.id} className="bg-white border border-hairline rounded-[8px] p-4 flex items-center gap-4 flex-wrap">
              <Score valor={m.score} />
              <div className="flex-1 min-w-[220px]">
                <div className="text-[15px] text-carbon"><b>{b.marca}</b> · {b.titulo} · {entregablesTexto(b.estructurado.entregables)}</div>
                <div className="text-[12.5px] text-ash">Hasta {money(Math.round(porCreador))} por creador · {formatDate(b.estructurado.fechas.desde, { month: 'short', year: 'numeric' })}{fuera.length ? ` · ${fuera.join(', ')}` : ''}</div>
              </div>
              <Estado e={etiqueta} />
              <Link to={`${base}/oportunidades/${b.id}`}><Button size="sm" variant="outlined">Ver brief</Button></Link>
            </div>
          );
        })}
        {!lista.length && <Vacio texto="Por ahora no hay briefs para tu perfil." />}
      </div>
    </Pagina>
  );
}

export function Postularme() {
  const { id } = useParams();
  const s = useMarket();
  const c = useCreadorActual();
  const { agencias } = useNucleo();
  const b = s.briefs.find((x) => x.id === id);
  const previa = s.postulaciones.find((x) => x.briefId === id && x.creadorId === c?.id);
  const [lineas, setLineas] = useState<LineaPrecio[] | null>(null);
  const [fechas, setFechas] = useState({ contenido: b?.estructurado.fechas.desde ?? d(14), publicacion: b?.estructurado.fechas.hasta ?? d(21) });
  const [usos, setUsos] = useState<UsoMk[]>(b?.estructurado.usos.tipos ?? ['Orgánico']);
  const [mensaje, setMensaje] = useState('');
  if (!c || !b) return <SinCreador />;
  const ls = lineas ?? (previa?.lineas.length ? previa.lineas : b.estructurado.entregables.map((e) => ({ ...e, precio: (c.condiciones.tarifas.find((t) => t.formato === e.formato)?.minimo ?? guiaPrecio(e.formato, seguidoresDe(c)).centro) * e.cantidad })));
  const ag = agencias.find((a) => a.id === c.agenciaId);
  const m = scoreMatch(c, b.estructurado, s.pesos);
  const yaEnviada = previa && !['Invitado', 'Sin respuesta'].includes(previa.estado);
  return (
    <Pagina titulo={`Postularme · ${b.marca} ${b.titulo}`} sub={ag ? `Tu agencia (${ag.nombre}) confirma antes de enviar` : 'Tu postulación llega directo a la marca'} ancho="max-w-[1150px]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Panel title="Brief" right={<Score valor={m.score} chico />}>
            <div className="border-t border-hairline px-5 py-3">
              <Fila t="Objetivo" v={b.estructurado.objetivo} />
              <Fila t="Audiencia" v={`${b.estructurado.audiencia.edad} · ${b.estructurado.audiencia.ciudades.join(', ')}`} />
              <Fila t="Entregables" v={entregablesTexto(b.estructurado.entregables)} />
              <Fila t="Usos" v={usosTexto(b.estructurado.usos)} />
              <Fila t="Restricciones" v={b.estructurado.restricciones.join(' · ')} />
              <div className="text-[12px] text-ash py-2">Por qué te recomendamos: {m.explicacion}</div>
            </div>
          </Panel>
          <Panel title="Presupuesto" subtitle="Tu precio por entregable, con la guía de mercado basada en precios facturados">
            <div className="border-t border-hairline">
              <table className="w-full"><thead><tr className="border-b border-hairline"><Th>Entregable</Th><Th right>Tu precio</Th><Th right>Guía de mercado</Th></tr></thead>
                <tbody>{ls.map((l, i) => { const g = guiaPrecio(l.formato, seguidoresDe(c)); return (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <Td>{l.formato} {l.red}{l.cantidad > 1 ? ` × ${l.cantidad}` : ''}</Td>
                    <Td right><input type="number" disabled={!!yaEnviada} value={l.precio} onChange={(e) => setLineas(ls.map((x, j) => j === i ? { ...x, precio: Number(e.target.value) } : x))} className="w-28 text-right border border-hairline rounded-[6px] px-2 py-1" /></Td>
                    <Td right className="text-ash">{money(g.min * l.cantidad)} – {money(g.max * l.cantidad)}</Td>
                  </tr>); })}</tbody>
              </table>
              <div className="px-5 py-3 flex justify-between text-[14px] font-semibold"><span>Total</span><span className="text-[18px] tabular-nums">{money(totalLineas(ls))}</span></div>
            </div>
          </Panel>
        </div>
        <Panel title="Propuesta">
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Entrega del contenido" type="date" value={fechas.contenido} onChange={(e) => setFechas({ ...fechas, contenido: e.target.value })} />
              <Input label="Publicación" type="date" value={fechas.publicacion} onChange={(e) => setFechas({ ...fechas, publicacion: e.target.value })} />
            </div>
            <div className="flex gap-1.5 flex-wrap items-center"><span className="text-[12px] text-ash mr-1">Usos que aceptas</span>
              {(['Orgánico', 'Pauta pagada', 'Cuenta de la marca'] as UsoMk[]).map((u) => <Chip key={u} activo={usos.includes(u)} onClick={() => setUsos(usos.includes(u) ? usos.filter((x) => x !== u) : [...usos, u])}>{u === 'Pauta pagada' ? `Pauta ${b.estructurado.usos.meses} meses` : u}</Chip>)}
            </div>
            <Input label="Mensaje" placeholder="Tengo ruta pensada a Valle de Bravo…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
            {yaEnviada
              ? <div className="text-[13px] text-ash">Postulación enviada: <Estado e={previa!.estado} /></div>
              : <Button className="self-end" onClick={() => s.postular(b.id, c.id, ls, fechas, usos, mensaje)}>{ag ? 'Enviar a mi agencia' : 'Enviar a la marca'}</Button>}
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}

export function PostulacionesCreador() {
  const s = useMarket();
  const c = useCreadorActual();
  if (!c) return <SinCreador />;
  const ps = s.postulaciones.filter((p) => p.creadorId === c.id && p.lineas.length).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <Pagina titulo="Postulaciones" sub="Lo que enviaste, con su estado">
      <VerComo tipo="creador" />
      <Panel>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Brief', 'Origen', 'Presupuesto', 'Fechas', 'Agencia', 'Estado'].map((h) => <Th key={h} right={h === 'Presupuesto'}>{h}</Th>)}</tr></thead>
            <tbody>{ps.map((p) => { const b = s.briefs.find((x) => x.id === p.briefId); return (
              <tr key={p.id} className="border-b border-hairline last:border-0">
                <Td><Link to={`${base}/oportunidades/${p.briefId}`} className="text-blue-link">{b?.marca} · {b?.titulo}</Link></Td>
                <Td><Estado e={p.origen === 'Invitado' ? 'Invitado' : 'Postulación'} /></Td>
                <Td right>{money(totalLineas(p.lineas))}</Td>
                <Td>{formatDate(p.fechas.contenido, { day: '2-digit', month: '2-digit' })} · {formatDate(p.fechas.publicacion, { day: '2-digit', month: '2-digit' })}</Td>
                <Td>{p.agencia ? `confirmó ${p.agencia.confirmo.split(' ')[0]}${p.agencia.editado ? ' (editó precio)' : ''}` : c.agenciaId ? 'por confirmar' : '—'}</Td>
                <Td><Estado e={p.estado} /></Td>
              </tr>); })}</tbody>
          </table>
          {!ps.length && <Vacio texto="Todavía no te postulas a ningún brief." />}
        </div>
      </Panel>
    </Pagina>
  );
}

export function MensajesCreador() {
  const { id } = useParams();
  const s = useMarket();
  const c = useCreadorActual();
  if (!c) return <SinCreador />;
  if (id) return <Pagina titulo="Mensajes" right={<Link to={`${base}/mensajes`}><Button variant="ghost">Todos</Button></Link>}><Hilo convId={id} /></Pagina>;
  return <Pagina titulo="Mensajes" sub="Ves quién participa del lado de la marca"><VerComo tipo="creador" /><Panel><ListaHilos convs={s.conversaciones.filter((x) => x.creadorId === c.id)} ruta={(x) => `${base}/mensajes/${x}`} /></Panel></Pagina>;
}

// ---------------------------------------------------------------------------
// Entregas: acuerdo, chequeo previo de la IA, publicación detectada
// ---------------------------------------------------------------------------

const IconoCheck = ({ nivel }: { nivel: 'ok' | 'aviso' | 'falla' }) =>
  nivel === 'ok' ? <CheckCircle2 size={16} className="text-success shrink-0" /> : nivel === 'aviso' ? <AlertTriangle size={16} className="text-warning shrink-0" /> : <XCircle size={16} className="text-danger shrink-0" />;

export function Entregas() {
  const { id } = useParams();
  const s = useMarket();
  const c = useCreadorActual();
  if (!c) return <SinCreador />;
  if (id) return <EntregarContenido ctId={id} />;
  const cts = s.contrataciones.filter((x) => x.creadorId === c.id).sort((a, b) => b.aceptada.localeCompare(a.aceptada));
  return (
    <Pagina titulo="Entregas" sub="Sube el contenido antes de publicarlo; la IA lo revisa contra el brief">
      <VerComo tipo="creador" />
      <Panel>
        <div className="divide-y divide-hairline border-t border-hairline">
          {cts.map((ct) => { const b = s.briefs.find((x) => x.id === ct.briefId); const e = ct.entregas.at(-1); return (
            <Link key={ct.id} to={`${base}/entregas/${ct.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-frost flex-wrap">
              <span className="flex-1 min-w-[200px] text-[14px]"><b>{b?.marca}</b> · {b?.titulo}<span className="block text-[12px] text-ash">{money(ct.tarifa)} · {e ? `ronda ${e.ronda}` : 'sin entregar'}</span></span>
              <Estado e={ct.estado} />
            </Link>); })}
          {!cts.length && <Vacio texto="Cuando una marca acepte tu oferta, aquí entregas el contenido." />}
        </div>
      </Panel>
    </Pagina>
  );
}

function EntregarContenido({ ctId }: { ctId: string }) {
  const s = useMarket();
  const { rol } = useNucleo();
  const [archivo, setArchivo] = useState<string[]>([]);
  const [dur, setDur] = useState(32);
  const [texto, setTexto] = useState('');
  const [cfdi, setCfdi] = useState({ archivo: [] as string[], uuid: '', rfc: '' });
  const [cal, setCal] = useState({ e: 0, n: '' });
  const ct = s.contrataciones.find((x) => x.id === ctId);
  if (!ct) return <Pagina titulo="Entrega"><Vacio texto="No encontrada." /></Pagina>;
  const b = s.briefs.find((x) => x.id === ct.briefId)!;
  const cr = s.creadores.find((x) => x.id === ct.creadorId)!;
  const of = s.conversaciones.find((x) => x.id === ct.convId)?.ofertas.find((o) => o.version === ct.oferta);
  const ult = ct.entregas.at(-1);
  const ronda = ct.entregas.length + (ult?.estado === 'Cambios pedidos' || !ult ? 1 : 0);
  const previo = texto || archivo.length ? revisarContenido(b.estructurado, { duracion: dur, texto }) : [];
  const falta = faltaParaDispersar(s, ct);
  const firmado = ct.acuerdo.marca && ct.acuerdo.creador;
  return (
    <Pagina titulo={`Entregar contenido · ${b.marca} ${b.titulo}`} sub={`${entregablesTexto(of?.lineas ?? b.estructurado.entregables)} · ronda ${Math.min(ronda, of?.rondas ?? 2)} de ${of?.rondas ?? 2} · fecha límite ${formatDate(of?.fechas.contenido)}`}
      right={<Link to={`${base}/entregas`}><Button variant="ghost">Todas</Button></Link>}>
      <Stepper pasos={['Acuerdo', 'Contenido', 'Aprobación = cobro', 'Publicación', 'KPIs']} actual={!firmado ? 0 : !ct.aprobada ? 1 : !ct.publicacion ? 3 : 4} completo={ct.estado === 'Cerrada'} />
      {!firmado && (
        <Panel title="Acuerdo de colaboración" subtitle="Firma electrónica de ambas partes antes de producir">
          <div className="border-t border-hairline px-5 py-3 flex items-center gap-3 flex-wrap text-[13px]">
            <span>Marca: {ct.acuerdo.marca ? `firmó ${fechaHora(ct.acuerdo.marca)}` : 'pendiente'}</span>
            <span>Creador: {ct.acuerdo.creador ? `firmó ${fechaHora(ct.acuerdo.creador)}` : 'pendiente'}</span>
            {!ct.acuerdo.creador && (cr.agenciaId ? <span className="text-ash">Firma tu agencia por ti.</span> : <Button size="sm" onClick={() => s.firmarAcuerdo(ct.id)}>Firmar acuerdo</Button>)}
          </div>
        </Panel>
      )}
      {firmado && !ct.aprobada && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Panel title="Archivo">
            <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
              {ult?.estado === 'Cambios pedidos' && <div className="bg-warning-wash text-warning text-[12.5px] rounded-[8px] px-3 py-2">La marca pidió cambios: {ult.decision?.nota}</div>}
              {ult?.estado === 'En revisión' ? <div className="text-[13px] text-ash">Ronda {ult.ronda} enviada el {fechaHora(ult.fechaHora)}: la marca la está revisando.</div> : (
                <>
                  <Archivo titulo="Arrastra tu video o imágenes" ayuda="MP4, MOV o JPG" acepta=".mp4,.mov,.jpg,.png" archivos={archivo} onChange={setArchivo} ejemplo={`reel_${b.marca.toLowerCase().replace(/\W/g, '')}_v${ronda}.mp4`} />
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <Input label="Duración (s)" type="number" value={dur} onChange={(e) => setDur(Number(e.target.value))} />
                    <Input label="Texto de la publicación" placeholder={`Menciona ${b.estructurado.menciones.join(' y ')} · #publicidad`} value={texto} onChange={(e) => setTexto(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </Panel>
          <Panel title="Chequeo previo de la IA" subtitle="Contra el brief, antes de enviarlo a la marca">
            <div className="border-t border-hairline px-5 py-4 flex flex-col gap-2.5">
              {(ult?.estado === 'En revisión' ? ult.chequeos : previo).map((x, i) => <div key={i} className="flex items-center gap-2.5 text-[13.5px]"><IconoCheck nivel={x.nivel} />{x.texto}{x.nivel === 'aviso' ? ': la marca puede pedir cambios' : ''}</div>)}
              {!previo.length && ult?.estado !== 'En revisión' && <span className="text-[12px] text-mist">Sube el archivo y escribe el texto para ver el chequeo.</span>}
              {ult?.estado !== 'En revisión' && <Button className="self-start mt-1" onClick={() => { if (s.entregarContenido(ct.id, archivo[0] ?? '', dur, texto)) { setArchivo([]); setTexto(''); } }}>Enviar a la marca</Button>}
            </div>
          </Panel>
        </div>
      )}
      <div className="bg-ice rounded-[8px] px-4 py-3 text-[13px] text-smoke border-l-4 border-blue">Cuando la marca apruebe, cobras automáticamente. Después publica en tu cuenta asociada: la detectamos sola.</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Cobro" subtitle={`${money(ct.tarifa)} a ${ct.beneficiario.nombre} · sin costo para ti`}>
          <div className="border-t border-hairline px-5 py-3 flex flex-col gap-2 text-[13px]">
            <Fila t="Estado" v={ct.dispersion ? <Estado e={ct.dispersion.estado} /> : 'Al aprobar la marca'} />
            {ct.dispersion?.estado === 'Pagada' && <Fila t="Pagado" v={`${fechaHora(ct.dispersion.fechaHora)} · ${ct.dispersion.referencia}`} />}
            {ct.dispersion?.estado === 'Retenida' && <div className="text-[12px] text-warning">{ct.dispersion.motivo}</div>}
            <Fila t="CFDI a Influ" v={ct.cfdi ? (ct.cfdi.validado ? `Validado · ${ct.cfdi.archivo}` : `Rechazado: ${ct.cfdi.motivo}`) : 'Pendiente'} tono={ct.cfdi?.validado ? 'success' : 'warning'} />
            {!ct.cfdi?.validado && (ct.beneficiario.tipo === 'Creador'
              ? <div className="flex flex-col gap-2 pt-1">
                  <Archivo titulo="XML del CFDI a Influ" ayuda={`Por ${money(ct.tarifa)}, emitido con tu RFC`} acepta=".xml" archivos={cfdi.archivo} onChange={(x) => setCfdi({ ...cfdi, archivo: x })} ejemplo={`cfdi_influ_${ct.id}.xml`} />
                  <div className="grid grid-cols-2 gap-2"><Input label="UUID" value={cfdi.uuid} onChange={(e) => setCfdi({ ...cfdi, uuid: e.target.value })} /><Input label="RFC emisor" value={cfdi.rfc} onChange={(e) => setCfdi({ ...cfdi, rfc: e.target.value.toUpperCase() })} /></div>
                  <Button size="sm" variant="outlined" className="self-start" onClick={() => s.subirCfdi(ct.id, cfdi.archivo[0] ?? '', cfdi.uuid, cfdi.rfc, ct.tarifa)}>Validar CFDI</Button>
                </div>
              : <span className="text-[12px] text-ash">El CFDI lo emite tu agencia a Influ.</span>)}
            {!ct.dispersion && falta.length > 0 && <div className="text-[11.5px] text-mist">Para cobrar al aprobar falta: {falta.join(', ')}.</div>}
          </div>
        </Panel>
        <Panel title="Publicación" right={ct.publicacion && <Estado e={ct.publicacion.estado} />}>
          <div className="border-t border-hairline px-5 py-3 flex flex-col gap-2">
            {ct.publicacion
              ? ct.publicacion.checks.map((x, i) => <div key={i} className="flex items-center gap-2 text-[13px]"><IconoCheck nivel={x.nivel} />{x.texto}</div>)
              : <span className="text-[13px] text-ash">Publica el {formatDate(of?.fechas.publicacion)} en tu cuenta asociada. La revisamos con más frecuencia cerca de la fecha.</span>}
            {ct.aprobada && !ct.publicacion && rol === 'Talento' && <Button size="sm" variant="outlined" className="self-start" onClick={() => s.avisarPublicacion(ct.id)}>Ya publiqué: consultar mi cuenta</Button>}
            {ct.publicacion && ct.publicacion.estado !== 'No detectada' && (
              ct.calificaciones.creador
                ? <div className="text-[12px] text-ash flex items-center gap-2">Calificaste a la marca: <Estrellas valor={ct.calificaciones.creador.estrellas} /></div>
                : <div className="flex items-center gap-2 flex-wrap border-t border-hairline pt-2"><span className="text-[12px] text-ash">Califica a la marca:</span><Estrellas valor={cal.e} onChange={(n) => setCal({ ...cal, e: n })} /><input value={cal.n} onChange={(e) => setCal({ ...cal, n: e.target.value })} placeholder="Comentario" className="text-[12px] border border-hairline rounded-full px-3 py-1 flex-1 min-w-32" /><Button size="sm" variant="outlined" onClick={() => s.calificar(ct.id, cal.e, cal.n)}>Calificar</Button></div>
            )}
          </div>
        </Panel>
      </div>
    </Pagina>
  );
}

// ---------------------------------------------------------------------------
// Cobros y métricas
// ---------------------------------------------------------------------------

export function CobrosCreador() {
  const s = useMarket();
  const c = useCreadorActual();
  if (!c) return <SinCreador />;
  const cts = s.contrataciones.filter((x) => x.creadorId === c.id).sort((a, b) => b.aceptada.localeCompare(a.aceptada));
  const ultimoPago = cts.find((x) => x.dispersion?.estado === 'Pagada');
  const reel = cts.find((x) => x.snapshots.length);
  return (
    <Pagina titulo="Cobros" sub="Cobras cuando la marca aprueba tu contenido, sin costo">
      <VerComo tipo="creador" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label={`Cobrado · ${ultimoPago ? s.briefs.find((b) => b.id === ultimoPago.briefId)?.titulo : '—'}`} value={money(ultimoPago?.tarifa ?? 0)} note="pagado al aprobar" />
        <KpiCard label="Contenido en revisión" value={String(cts.filter((x) => x.entregas.at(-1)?.estado === 'En revisión').length)} />
        <KpiCard label="Vistas de tu reel" value={reel ? k(ultimo(reel.snapshots).vistas) : '—'} note={reel ? `día ${ultimo(reel.snapshots).dia}` : ''} />
      </div>
      <Panel title="Mis cobros">
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full"><thead><tr className="border-b border-hairline">{['Campaña', 'Monto', 'Aprobado', 'Pagado', 'Publicación'].map((h) => <Th key={h} right={h === 'Monto'}>{h}</Th>)}</tr></thead>
            <tbody>{cts.map((x) => { const b = s.briefs.find((y) => y.id === x.briefId); return (
              <tr key={x.id} className="border-b border-hairline last:border-0">
                <Td>{b?.marca} · {b?.titulo}</Td><Td right>{money(x.tarifa)}</Td>
                <Td>{x.aprobada ? fechaHora(x.aprobada.fechaHora) : '—'}</Td>
                <Td>{x.dispersion?.estado === 'Pagada' ? fechaHora(x.dispersion.fechaHora) : x.dispersion?.estado === 'Retenida' ? <Estado e="Retenida" /> : '—'}</Td>
                <Td>{x.publicacion ? <Estado e={x.publicacion.estado}>{x.publicacion.estado === 'Verificada' ? 'Detectada y verificada' : x.publicacion.estado}</Estado> : <Estado e={x.estado} />}</Td>
              </tr>); })}</tbody>
          </table>
          {!cts.length && <Vacio texto="Aún no tienes cobros." />}
        </div>
      </Panel>
    </Pagina>
  );
}

export function MetricasCreador() {
  const s = useMarket();
  const c = useCreadorActual();
  const [ct, setCt] = useState('');
  if (!c) return <SinCreador />;
  const cts = s.contrataciones.filter((x) => x.creadorId === c.id && x.snapshots.length);
  const sel = cts.find((x) => x.id === ct) ?? cts[0];
  return (
    <Pagina titulo="Métricas" sub="Leídas de tu cuenta asociada cada 24 h durante 30 días; fotos oficiales a 7 y 30 días">
      <VerComo tipo="creador" />
      <div className="flex gap-1.5 flex-wrap">{cts.map((x) => <Chip key={x.id} activo={sel?.id === x.id} onClick={() => setCt(x.id)}>{s.briefs.find((b) => b.id === x.briefId)?.marca} · {s.briefs.find((b) => b.id === x.briefId)?.titulo}</Chip>)}</div>
      {sel ? <MetricasDe c={c} snapshots={sel.snapshots} tarifa={sel.tarifa} /> : <Vacio texto="Cuando publiques una campaña verificada aparecen aquí sus métricas." />}
    </Pagina>
  );
}

function MetricasDe({ snapshots, tarifa }: { c: Creador; snapshots: ReturnType<typeof useMarket.getState>['contrataciones'][number]['snapshots']; tarifa: number }) {
  const u = ultimo(snapshots);
  const kk = costos(tarifa, u);
  const d7 = foto(snapshots, 7);
  const d30 = foto(snapshots, 30);
  const datos = snapshots.slice(0, 31).map((x) => ({ dia: `D${x.dia}`, vistas: x.vistas, oficial: x.dia === 7 || x.dia === 30 }));
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Vistas" value={k(u.vistas)} note={`día ${u.dia}`} />
        <KpiCard label="Interacciones" value={k(u.interacciones)} note={`${k(u.guardados)} guardados · ${k(u.compartidos)} compartidos`} />
        <KpiCard label="Engagement" value={`${kk.er.toFixed(1)}%`} />
        <KpiCard label="Clics con UTM" value={k(u.clics)} note={`${u.ventas} ventas con código`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-4 items-start">
        <Panel title="Vistas acumuladas">
          <div className="border-t border-hairline px-3 py-3 h-64"><ResponsiveContainer><BarChart data={datos}><CartesianGrid vertical={false} stroke={TINTA.rejilla} /><XAxis dataKey="dia" {...ejeX} /><YAxis {...ejeY} tickFormatter={ejePiezas} width={42} /><Tooltip {...tooltipEstilo} /><Bar dataKey="vistas" fill={CATEGORICA[2]} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Fotos oficiales">
          <div className="border-t border-hairline px-5 py-3">
            <Fila t="Día 7" v={d7 ? `${k(d7.vistas)} vistas` : 'pendiente'} />
            <Fila t="Día 30" v={d30 ? `${k(d30.vistas)} vistas` : 'pendiente'} />
            <Fila t="Alcance" v={k(u.alcance)} />
            <Fila t="Impresiones" v={k(u.impresiones)} />
          </div>
        </Panel>
      </div>
    </>
  );
}

