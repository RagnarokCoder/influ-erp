import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ShieldCheck, Mail, AlertTriangle, Plus, Trash2, Lock } from 'lucide-react';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { money, fechaHora, formatDate } from '../../lib/format';
import { d } from '../../data/constantes';
import { useMarket, estadoOferta, ofertaVigente, aceptada, permisosEn, esEquipo, type BorradorOferta } from '../useMarket';
import { FEE_INFLU, fee, fueraDeCondiciones, totalLineas, usosTexto, entregablesTexto } from '../logic';
import type { Conversacion, FormatoMk, LineaPrecio, Oferta, UsoMk } from '../types';
import { Chip, Estado, Fila, useNucleo } from '../ui';

const FORMATOS: FormatoMk[] = ['Reel', 'Story', 'Post', 'TikTok', 'Video', 'Short'];
const USOS: UsoMk[] = ['Orgánico', 'Pauta pagada', 'Cuenta de la marca'];
const redDe = (f: FormatoMk) => (f === 'TikTok' ? 'TikTok' : f === 'Video' || f === 'Short' ? 'YouTube' : 'Instagram') as LineaPrecio['red'];

/** Tarjeta de la oferta: entregables, fechas, rondas, usos, exclusividad, monto con fee separado. */
export function TarjetaOferta({ o, compacta }: { o: Oferta; compacta?: boolean }) {
  const tarifa = totalLineas(o.lineas);
  return (
    <div className="flex flex-col">
      <Fila t="Entregables" v={entregablesTexto(o.lineas.map((l) => ({ formato: l.formato, red: l.red, cantidad: l.cantidad })))} />
      {!compacta && o.lineas.map((l, i) => <Fila key={i} t={<span className="pl-3 text-[12px]">{l.cantidad} × {l.formato} · {l.red}</span>} v={<span className="text-[12px]">{money(l.precio)}</span>} />)}
      <Fila t="Fechas" v={`Contenido ${formatDate(o.fechas.contenido, { day: '2-digit', month: '2-digit' })} · publicación ${formatDate(o.fechas.publicacion, { day: '2-digit', month: '2-digit' })}`} />
      <Fila t="Rondas de cambios" v={o.rondas} />
      <Fila t="Usos" v={usosTexto(o.usos)} />
      <Fila t="Exclusividad" v={o.exclusividad.dias ? `${o.exclusividad.dias} días · ${o.exclusividad.categoria}` : 'Sin exclusividad'} />
      {!compacta && <Fila t="KPIs" v={o.kpis || '—'} />}
      {!compacta && <div className="py-2 border-b border-hairline text-[12px] text-ash">Si no se publica en fecha: <span className="text-carbon">{o.consecuencia}</span></div>}
      <Fila t="Tarifa del creador" v={money(tarifa)} />
      <Fila t={`Fee Influ (${Math.round(FEE_INFLU * 100)}%)`} v={money(fee(tarifa))} />
      <Fila t="Total" v={<span className="text-[17px]">{money(tarifa + fee(tarifa))}</span>} fuerte />
      {o.alertas.length > 0 && (
        <div className="mt-2 border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>Fuera de las condiciones del talento: {o.alertas.join('; ')}.</span>
        </div>
      )}
    </div>
  );
}

/** Editor de oferta o contraoferta. Marca lo que queda fuera de las condiciones antes de enviar. */
export function EditorOferta({ conv, onClose }: { conv: Conversacion; onClose: () => void }) {
  const s = useMarket();
  const cr = s.creadores.find((c) => c.id === conv.creadorId)!;
  const brief = s.briefs.find((b) => b.id === conv.briefId)!;
  const base = ofertaVigente(conv);
  const inicial: BorradorOferta = base
    ? { lineas: base.lineas, fechas: base.fechas, rondas: base.rondas, usos: base.usos, exclusividad: base.exclusividad, kpis: base.kpis, consecuencia: base.consecuencia }
    : {
      lineas: brief.estructurado.entregables.map((e) => ({ ...e, precio: (cr.condiciones.tarifas.find((t) => t.formato === e.formato)?.minimo ?? 10_000) * e.cantidad })),
      fechas: { contenido: brief.estructurado.fechas.desde, publicacion: brief.estructurado.fechas.hasta }, rondas: 2, usos: brief.estructurado.usos,
      exclusividad: { dias: 30, categoria: brief.estructurado.creadores.temas[0] ? `marcas de ${brief.estructurado.creadores.temas[0]}` : '' },
      kpis: brief.estructurado.kpis.join(', '), consecuencia: 'Si no publica en la fecha pactada: republicación en 48 h o devolución del pago',
    };
  const [o, setO] = useState<BorradorOferta>(JSON.parse(JSON.stringify(inicial)));
  const alertas = useMemo(() => fueraDeCondiciones(cr.condiciones, o), [cr, o]);
  const tarifa = totalLineas(o.lineas);
  const linea = (i: number, x: Partial<LineaPrecio>) => setO({ ...o, lineas: o.lineas.map((l, j) => (j === i ? { ...l, ...x } : l)) });
  const enviar = () => { if (s.enviarOferta(conv.id, o)) onClose(); };
  return (
    <Modal open wide title={base ? `Contraoferta · v${base.version + 1}` : 'Oferta · v1'} subtitle={`${cr.handle} · ${brief.marca} · ${brief.titulo}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={enviar}>Enviar {money(tarifa + fee(tarifa))}</Button></>}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[13px] font-semibold text-carbon mb-2">Entregables y monto por entregable</div>
          <div className="flex flex-col gap-2">
            {o.lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-end">
                <Select label={i === 0 ? 'Formato' : undefined} value={l.formato} onChange={(e) => linea(i, { formato: e.target.value as FormatoMk, red: redDe(e.target.value as FormatoMk) })}>
                  {FORMATOS.map((f) => <option key={f} value={f}>{`${f} · ${redDe(f)}`}</option>)}
                </Select>
                <Input label={i === 0 ? 'Cantidad' : undefined} type="number" min={1} value={l.cantidad} onChange={(e) => linea(i, { cantidad: Number(e.target.value) })} />
                <Input label={i === 0 ? 'Precio (total de la línea)' : undefined} type="number" min={0} value={l.precio} onChange={(e) => linea(i, { precio: Number(e.target.value) })} />
                <button onClick={() => setO({ ...o, lineas: o.lineas.filter((_, j) => j !== i) })} className="h-[38px] flex items-center justify-center text-ash hover:text-danger"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setO({ ...o, lineas: [...o.lineas, { formato: 'Story', red: 'Instagram', cantidad: 1, precio: 5_000 }] })} className="self-start text-[12px] text-blue-link font-medium hover:underline flex items-center gap-1"><Plus size={12} /> Agregar entregable</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input label="Entrega del contenido" type="date" value={o.fechas.contenido} onChange={(e) => setO({ ...o, fechas: { ...o.fechas, contenido: e.target.value } })} />
          <Input label="Publicación" type="date" value={o.fechas.publicacion} onChange={(e) => setO({ ...o, fechas: { ...o.fechas, publicacion: e.target.value } })} />
          <Input label="Rondas de cambios" type="number" min={0} max={5} value={o.rondas} onChange={(e) => setO({ ...o, rondas: Number(e.target.value) })} />
        </div>
        <div>
          <div className="text-[12px] font-medium text-ash mb-1.5">Usos</div>
          <div className="flex gap-1.5 flex-wrap">
            {USOS.map((u) => <Chip key={u} activo={o.usos.tipos.includes(u)} onClick={() => setO({ ...o, usos: { ...o.usos, tipos: o.usos.tipos.includes(u) ? o.usos.tipos.filter((x) => x !== u) : [...o.usos.tipos, u] } })}>{u}</Chip>)}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="Licencia (meses)" type="number" min={0} value={o.usos.meses} onChange={(e) => setO({ ...o, usos: { ...o.usos, meses: Number(e.target.value) } })} />
          <Input label="Territorio" value={o.usos.territorio} onChange={(e) => setO({ ...o, usos: { ...o.usos, territorio: e.target.value } })} />
          <Input label="Exclusividad (días)" type="number" min={0} value={o.exclusividad.dias} onChange={(e) => setO({ ...o, exclusividad: { ...o.exclusividad, dias: Number(e.target.value) } })} />
          <Input label="Categoría excluida" value={o.exclusividad.categoria} onChange={(e) => setO({ ...o, exclusividad: { ...o.exclusividad, categoria: e.target.value } })} />
        </div>
        <Input label="KPIs comprometidos (si los hay)" value={o.kpis} onChange={(e) => setO({ ...o, kpis: e.target.value })} />
        <Input label="Consecuencia si no se publica en la fecha pactada" value={o.consecuencia} onChange={(e) => setO({ ...o, consecuencia: e.target.value })} />
        <div className="border border-hairline rounded-[8px] px-3 py-2">
          <Fila t="Tarifa del creador" v={money(tarifa)} />
          <Fila t={`Fee Influ (${Math.round(FEE_INFLU * 100)}%)`} v={money(fee(tarifa))} />
          <Fila t="Total para la marca" v={money(tarifa + fee(tarifa))} fuerte />
        </div>
        {alertas.length > 0
          ? <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning">Queda fuera de las condiciones aceptables de {cr.handle}: {alertas.join('; ')}. Se envía marcada.</div>
          : <div className="text-[12px] text-success flex items-center gap-1.5"><ShieldCheck size={13} /> Dentro de las condiciones aceptables de {cr.handle}.</div>}
      </div>
    </Modal>
  );
}

/** Hilo por creador: participantes (con copia), mensajes con protección del canal y la oferta versionada. */
export function Hilo({ convId, token }: { convId: string; token?: string }) {
  const s = useMarket();
  const { u, rol } = useNucleo();
  const c = s.conversaciones.find((x) => x.id === convId);
  const [texto, setTexto] = useState('');
  const [editar, setEditar] = useState(false);
  const [copia, setCopia] = useState({ nombre: '', email: '' });
  const [verVersion, setVerVersion] = useState<number | null>(null);
  if (!c) return <div className="text-[13px] text-mist">Conversación no encontrada.</div>;
  const b = s.briefs.find((x) => x.id === c.briefId)!;
  const cr = s.creadores.find((x) => x.id === c.creadorId)!;
  const cuenta = s.cuentas.find((x) => x.empresaId === b.empresaId);
  const invitado = token ? c.participantes.find((p) => p.token === token) : undefined;
  const esMarca = rol === 'Marca' && u?.empresaId === b.empresaId;
  const lado = invitado?.lado ?? (esMarca ? 'Marca' : rol === 'Agencia' && u?.agenciaId === cr.agenciaId ? 'Agencia' : rol === 'Talento' && u?.talentoId === cr.talentoId ? 'Creador' : esEquipo(rol) ? 'Influ' : null);
  const permisos = invitado?.permisos ?? (esMarca ? permisosEn(cuenta, u) : []);
  const vigente = ofertaVigente(c);
  const estado = vigente && estadoOferta(vigente);
  const porResponder = vigente && (estado === 'Enviada' || estado === 'Contraoferta');
  const meToca = porResponder && (vigente.lado === 'Marca' ? (lado === 'Agencia' || (lado === 'Creador' && !cr.agenciaId)) : lado === 'Marca');
  const puedeAceptar = meToca && (lado !== 'Marca' || permisos.includes('Aprueba ofertas'));
  const puedeOfertar = !aceptada(c) && (lado === 'Agencia' || (lado === 'Creador' && !cr.agenciaId) || (lado === 'Marca' && (permisos.includes('Admin') || permisos.includes('Aprueba ofertas'))));
  const mostrada = verVersion ? c.ofertas.find((o) => o.version === verVersion) : vigente;
  const enviar = () => { if (s.enviarMensaje(c.id, texto, token)) setTexto(''); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[12px] font-semibold text-ash mr-1">Participantes:</span>
        {c.participantes.map((p) => (
          <span key={p.email} className={`text-[12px] px-2.5 py-1 rounded-full border ${p.lado === 'Marca' && !p.enCopia ? 'bg-carbon text-white border-carbon' : 'bg-white border-hairline text-smoke'}`}>
            {p.nombre}{p.lado === 'Marca' && p.permisos.includes('Admin') ? ' · admin' : ''}{p.enCopia ? ' · en copia' : ''}
          </span>
        ))}
        {esMarca && (
          <span className="flex items-center gap-1.5">
            <input value={copia.email} onChange={(e) => setCopia({ ...copia, email: e.target.value })} placeholder="+ Agregar email en copia" className="text-[12px] border border-hairline rounded-full px-3 py-1 outline-none focus:border-blue w-52" />
            {copia.email && <input value={copia.nombre} onChange={(e) => setCopia({ ...copia, nombre: e.target.value })} placeholder="Nombre y área" className="text-[12px] border border-hairline rounded-full px-3 py-1 outline-none focus:border-blue w-36" />}
            {copia.email && <Button size="sm" variant="outlined" onClick={() => { if (s.agregarCopia(c.id, copia.nombre, copia.email)) setCopia({ nombre: '', email: '' }); }}><Mail size={12} /> Sumar</Button>}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
        <Panel>
          <div className="px-5 py-4 flex flex-col gap-3 min-h-[320px] max-h-[520px] overflow-y-auto">
            {c.mensajes.map((m) => {
              if (m.lado === 'Sistema' || m.lado === 'Influ') return <div key={m.id} className="self-center text-[12px] text-ash bg-frost rounded-full px-3 py-1 text-center">{m.lado === 'Influ' ? `Influ · ${m.texto}` : m.texto}</div>;
              const propio = m.lado === lado;
              return (
                <div key={m.id} className={`max-w-[80%] rounded-[12px] px-3.5 py-2.5 ${propio ? 'self-end bg-carbon text-white' : 'self-start bg-white border border-hairline'}`}>
                  <div className={`text-[11px] font-semibold ${propio ? 'text-white/70' : 'text-ash'}`}>{m.autor}</div>
                  <div className="text-[13.5px] leading-snug">{m.texto}</div>
                  <div className={`text-[10px] mt-1 ${propio ? 'text-white/60' : 'text-mist'}`}>{fechaHora(m.fechaHora)}{m.ocultos ? ' · datos de contacto ocultos' : ''}</div>
                </div>
              );
            })}
          </div>
          {lado && (
            <div className="border-t border-hairline px-4 py-3 flex gap-2 items-center">
              <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviar()} placeholder={invitado?.enCopia ? 'Comenta en el hilo…' : 'Escribe un mensaje…'} className="flex-1 text-[14px] border border-hairline rounded-full px-4 py-2 outline-none focus:border-blue" />
              <Button size="sm" onClick={enviar}><Send size={13} /></Button>
            </div>
          )}
          {!aceptada(c) && <div className="px-5 pb-3 text-[11px] text-mist flex items-center gap-1.5"><Lock size={11} /> Hasta aceptar la oferta, el chat oculta correos, teléfonos y usuarios externos.</div>}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={mostrada ? `Oferta · v${mostrada.version}` : 'Oferta'} subtitle={mostrada ? `${mostrada.lado === 'Agencia' ? 'Agencia' : mostrada.lado} · ${mostrada.autor} · vence ${formatDate(mostrada.vence)}` : 'Todavía no hay oferta'}
            right={mostrada && <Estado e={estadoOferta(mostrada)} />}>
            <div className="border-t border-hairline px-5 py-3">
              {mostrada ? <TarjetaOferta o={mostrada} /> : <div className="text-[13px] text-ash py-2">{lado === 'Marca' ? 'Envía la primera oferta: es una tarjeta con campos que se negocia por versiones.' : 'La marca envía la primera oferta.'}</div>}
              <div className="flex gap-2 mt-3 flex-wrap">
                {puedeAceptar && (!verVersion || verVersion === vigente?.version) && <Button onClick={() => s.aceptarOferta(c.id, token)}>Aceptar oferta</Button>}
                {puedeOfertar && <Button variant="outlined" onClick={() => setEditar(true)}>{vigente ? 'Contraofertar' : 'Enviar oferta'}</Button>}
                {meToca && <Button variant="danger" onClick={() => s.rechazarOferta(c.id)}>Rechazar</Button>}
                {meToca && lado === 'Marca' && !permisos.includes('Aprueba ofertas') && <span className="text-[11px] text-ash self-center">Acepta quien tiene el permiso "Aprueba ofertas".</span>}
                {lado === 'Creador' && cr.agenciaId && porResponder && <span className="text-[11px] text-ash self-center">Tu agencia responde las ofertas por ti.</span>}
              </div>
            </div>
            {c.ofertas.length > 1 && (
              <div className="border-t border-hairline px-5 py-2.5 flex gap-1.5 flex-wrap items-center">
                <span className="text-[11px] text-mist">Versiones:</span>
                {c.ofertas.map((o) => <Chip key={o.version} activo={(verVersion ?? vigente?.version) === o.version} onClick={() => setVerVersion(o.version)}>v{o.version} · {estadoOferta(o)}</Chip>)}
              </div>
            )}
          </Panel>
          <Panel title="Registro" subtitle="Quién se sumó, quién comentó y quién aprobó">
            <div className="border-t border-hairline px-5 py-2 max-h-48 overflow-y-auto">
              {c.registro.slice().reverse().map((r, i) => <div key={i} className="text-[12px] py-1 text-smoke"><span className="font-medium text-carbon">{r.quien}</span> {r.que} <span className="text-mist">· {fechaHora(r.fechaHora)}</span></div>)}
            </div>
          </Panel>
        </div>
      </div>
      {editar && <EditorOferta conv={c} onClose={() => setEditar(false)} />}
    </div>
  );
}

/** Lista de conversaciones con su última oferta. */
export function ListaHilos({ convs, ruta }: { convs: Conversacion[]; ruta: (id: string) => string }) {
  const s = useMarket();
  if (!convs.length) return <div className="px-5 py-8 text-center text-[13px] text-mist">Sin conversaciones.</div>;
  return (
    <div className="divide-y divide-hairline border-t border-hairline">
      {convs.map((c) => {
        const b = s.briefs.find((x) => x.id === c.briefId);
        const cr = s.creadores.find((x) => x.id === c.creadorId);
        const o = ofertaVigente(c);
        const ult = c.mensajes[c.mensajes.length - 1];
        return (
          <Link key={c.id} to={ruta(c.id)} className="px-5 py-3 flex items-center gap-3 hover:bg-frost">
            <span className="w-9 h-9 rounded-full bg-ice flex items-center justify-center text-[11px] font-semibold text-blue-link shrink-0">{cr?.handle.slice(1, 3).toUpperCase()}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] text-carbon"><b>{cr?.handle}</b> · {b?.marca} {b?.titulo}</span>
              <span className="block text-[12px] text-ash truncate">{ult?.autor}: {ult?.texto}</span>
            </span>
            {o && <span className="text-[12px] tabular-nums text-ash shrink-0">v{o.version} · {money(totalLineas(o.lineas))}</span>}
            {o ? <Estado e={estadoOferta(o)} /> : <Estado e="Borrador">Sin oferta</Estado>}
          </Link>
        );
      })}
    </div>
  );
}

export const fechaMasDias = (n: number) => d(n);
