import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BadgeCheck, ShieldAlert, AlertTriangle, Coins, Search, Ban, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import DataModule, { Relacion, RenglonRelacion } from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { Fila } from '../components/ui/Fila';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { empresaDe, estatusCxC, historialMarca, porId, saldoCxC, suma } from '../lib/derive';
import { ejeX, ejeY, leyendaEstilo, tooltipEstilo, TINTA } from '../lib/charts';
import { estadoTone, money } from '../lib/format';
import type { Empresa } from '../data/types';

type FilaE = Omit<Empresa, 'lista69b'> & { lista69b: 'Sí' | 'No'; marcasTxt: string; diasReales: number | null; porCobrar: number };
const ESTATUS = ['Activa', 'En revisión', 'Bloqueada'] as const;

// clientes.md con sus adaptables: la empresa que paga, separada de la marca
// anunciante. Contacto → Área de pagos, Prioridad → Lista 69-B, Días de
// crédito → Plazo habitual, Anticipo → Días reales de pago, Saldo → Por cobrar.
const cols: Col<FilaE>[] = [
  { key: 'razonSocial', label: 'Empresa', render: (e) => <span><span className="text-carbon">{e.razonSocial}</span><span className="block text-[11px] text-ash">{e.marcasTxt}</span></span> },
  { key: 'rfc', label: 'RFC', mono: true },
  { key: 'contactoPagos', label: 'Área de pagos', fueraDeForma: true, render: (e) => e.contactoPagos ? <span className="text-[12px]">{e.contactoPagos.email}{e.contactoPagos.verificado && <span className="text-success"> ✓</span>}</span> : <span className="text-mist">—</span> },
  {
    key: 'lista69b', label: 'Lista 69-B', tipo: 'select', opciones: ['No', 'Sí'],
    ayuda: 'Una empresa en la lista 69-B del SAT queda bloqueada: sus CFDI se rechazan solos.',
    render: (m) => m.lista69b === 'Sí' ? <Badge tone="danger">En lista 69-B</Badge> : <span className="text-mist">—</span>,
  },
  { key: 'plazoHabitual', label: 'Plazo habitual', tipo: 'number', ayuda: 'Días de pago que suele pactar.' },
  { key: 'diasReales', label: 'Días reales de pago', tipo: 'number', fueraDeForma: true, render: (m) => m.diasReales === null ? <span className="text-mist">—</span> : <span className={m.diasReales > m.plazoHabitual ? 'text-danger font-medium' : ''}>{m.diasReales}</span> },
  { key: 'porCobrar', label: 'Por cobrar', tipo: 'money', fueraDeForma: true },
  { key: 'origen', label: 'Alta', fueraDeForma: true },
  { key: 'estatus', label: 'Estatus', tipo: 'select', opciones: ESTATUS },
];

export const Marcas = () => {
  const [params, setParams] = useSearchParams();
  const vistaTab = params.get('vista') === 'empresas' ? 'empresas' : 'fichas';
  return (
    <div className="flex flex-col">
      <div className="px-4 md:px-10 pt-6 max-w-[1600px] w-full mx-auto flex gap-1.5">
        {[['fichas', 'Fichas de marca'], ['empresas', 'Catálogo de empresas']].map(([id, t]) => (
          <button key={id} onClick={() => setParams({ vista: id })} className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border ${vistaTab === id ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline'}`}>{t}</button>
        ))}
      </div>
      {vistaTab === 'fichas' ? <Fichas /> : <Empresas />}
    </div>
  );
};

/** Pantalla 21: contactos del área de pagos y marketing, historial y plazo pactado contra real. */
function Fichas() {
  const [params, setParams] = useSearchParams();
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const [busca, setBusca] = useState('');
  const [soloBloqueadas, setSoloBloqueadas] = useState(false);
  // Cambio 10: modal de motivo de bloqueo y confirmación de desbloqueo.
  const [modal, setModal] = useState<null | { tipo: 'bloquear' | 'desbloquear'; empresaId: string }>(null);
  const [motivo, setMotivo] = useState<'No paga' | 'Paga impuntual' | 'Otro'>('No paga');
  const [nota, setNota] = useState('');
  const lista = v.marcas.map((m) => ({ m, h: historialMarca(m.id, v), e: empresaDe(v, m.id) }))
    .filter((x) => !busca || `${x.m.nombre} ${x.e?.razonSocial}`.toLowerCase().includes(busca.toLowerCase()))
    .filter((x) => !soloBloqueadas || x.e?.estatus === 'Bloqueada')
    .sort((a, b) => b.h.monto - a.h.monto);
  const sel = lista.find((x) => x.m.id === params.get('id')) ?? lista[0];
  if (!sel) return null;
  const { m, h, e } = sel;
  const abiertas = v.cxc.filter((c) => c.marcaId === m.id && estatusCxC(c) !== 'Pagado');
  const bloqueada = e?.estatus === 'Bloqueada';

  const abrirBloqueo = () => { setMotivo('No paga'); setNota(''); if (e) setModal({ tipo: 'bloquear', empresaId: e.id }); };
  const confirmar = () => {
    if (!modal) return;
    if (modal.tipo === 'bloquear') {
      const texto = motivo === 'Otro' ? nota.trim() : motivo;
      if (s.bloquearMarca(modal.empresaId, texto)) setModal(null);
    } else {
      if (s.desbloquearMarca(modal.empresaId)) setModal(null);
    }
  };
  return (
    <div className="px-4 md:px-10 py-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
      <div className="bg-white border border-hairline rounded-[8px] overflow-hidden">
        <div className="px-3 py-3 border-b border-hairline">
          <div className="flex items-center gap-1.5 bg-frost border border-hairline rounded-full px-2.5 py-1.5">
            <Search size={12} className="text-ash" />
            <input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar marca..." className="bg-transparent text-[12px] outline-none w-full" />
          </div>
          <label className="flex items-center gap-1.5 mt-2.5 text-[11.5px] text-ash cursor-pointer select-none">
            <input type="checkbox" checked={soloBloqueadas} onChange={(ev) => setSoloBloqueadas(ev.target.checked)} className="accent-danger" />
            Solo bloqueadas
          </label>
        </div>
        <div className="max-h-[620px] overflow-y-auto divide-y divide-hairline">
          {lista.map((x) => (
            <button key={x.m.id} onClick={() => setParams({ vista: 'fichas', id: x.m.id })} className={`w-full text-left px-3 py-2.5 ${x.m.id === m.id ? 'bg-ice' : 'hover:bg-frost'}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] ${x.m.id === m.id ? 'text-blue-link font-medium' : 'text-carbon'}`}>{x.m.nombre}</span>
                {x.e?.estatus === 'Bloqueada' && <Badge tone="danger">Bloqueada</Badge>}
              </div>
              <div className="text-[11px] text-mist flex justify-between"><span>{x.h.operaciones} operaciones</span><span>{money(x.h.monto)}</span></div>
            </button>
          ))}
          {lista.length === 0 && <div className="px-3 py-4 text-center text-[12px] text-mist">Sin marcas bloqueadas.</div>}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[22px] font-semibold text-carbon">{e?.razonSocial}</div>
            <div className="text-[13px] text-ash">Anunciante {m.nombre} · {m.industria} · {e?.origen === 'CFDI' ? 'alta automática desde CFDI' : e?.origen === 'Invitación' ? 'alta por invitación' : 'alta en catálogo'} · RFC {e?.rfc} <Badge tone={estadoTone(m.estatus)}>{m.estatus}</Badge></div>
          </div>
          {e && autoriza.catalogo(rol) && (
            bloqueada
              ? <Button size="sm" variant="outlined" onClick={() => setModal({ tipo: 'desbloquear', empresaId: e.id })}><ShieldCheck size={14} />Desbloquear</Button>
              : <Button size="sm" variant="danger" onClick={abrirBloqueo}><Ban size={14} />Bloquear marca</Button>
          )}
        </div>
        {bloqueada && (
          <div className="rounded-[8px] border border-danger/30 bg-danger-wash px-4 py-3 text-[12.5px] text-danger">
            <div className="font-medium flex items-center gap-1.5"><Ban size={13} />Marca bloqueada{e?.bloqueo?.motivo ? ` · ${e.bloqueo.motivo}` : ''}</div>
            {e?.bloqueo && <div className="text-[11.5px] text-danger/80 mt-0.5">Bloqueada por {e.bloqueo.usuario} · {e.bloqueo.fechaHora}</div>}
            <div className="text-[11.5px] text-ash mt-1.5">Cuando llega una solicitud con una marca bloqueada, no se valida el CFDI ni se analiza el contrato: la solicitud se rechaza con el motivo interno «Marca bloqueada». El talento o la agencia solo ve «No hemos podido procesar tu solicitud de adelanto con esta marca. Prueba con otra.»</div>
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            <Panel title="Contactos">
              <div className="border-t border-hairline px-5 py-1">
                <Fila t="Área de pagos" v={e?.contactoPagos?.nombre ?? '—'} fuerte />
                <Fila t="Email" v={<span className="inline-flex items-center gap-2">{e?.contactoPagos?.email ?? '—'} {e?.contactoPagos && (e.contactoPagos.verificado ? <Badge tone="neutral">Verificado</Badge> : <Badge tone="warning">Sin verificar</Badge>)}</span>} fuerte />
                <Fila t="Teléfono" v={e?.contactoPagos?.telefono ?? '—'} fuerte />
                <Fila t="Marketing" v={e?.contactoMarketing ? `${e.contactoMarketing.nombre} · ${e.contactoMarketing.email}` : '—'} />
              </div>
              {e?.contactoPagos && !e.contactoPagos.verificado && autoriza.catalogo(rol) && (
                <div className="px-5 pb-4"><Button size="sm" variant="outlined" onClick={() => s.verificarContactoPagos(e.id)}>Validar contacto (una sola vez)</Button></div>
              )}
            </Panel>
            <Panel title="Historial">
              <div className="border-t border-hairline px-5 py-1">
                <Fila t="Operaciones" v={h.operaciones} fuerte />
                <Fila t="Monto total" v={money(h.monto)} fuerte />
                <Fila t="Plazo pactado promedio" v={h.pactado ? `${h.pactado} días` : '—'} fuerte />
                <Fila t="Plazo real promedio" v={h.real ? `${h.real} días` : '—'} fuerte tono={h.real && h.pactado && h.real > h.pactado ? 'danger' : undefined} />
                <Fila t="Por cobrar" v={money(suma(abiertas.map(saldoCxC)))} nota={`${abiertas.length} facturas abiertas`} />
                <Fila t="Lista 69-B" v={e?.lista69b ? 'Sí · bloqueada' : 'No'} tono={e?.lista69b ? 'danger' : undefined} />
              </div>
            </Panel>
          </div>
          <Panel title="Plazo pactado vs. real" subtitle="Días de la publicación al pago, por operación pagada">
            <div className="border-t border-hairline px-3 py-4 h-[300px]">
              {h.filas.length === 0 ? <div className="text-[12px] text-mist text-center pt-16">Sin operaciones todavía.</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={h.filas.map((f, i) => ({ op: `Op. ${i + 1}`, folio: f.folio, pactado: f.pactado, real: f.real }))}>
                    <CartesianGrid vertical={false} stroke={TINTA.rejilla} />
                    <XAxis dataKey="op" {...ejeX} />
                    <YAxis {...ejeY} width={32} />
                    <Tooltip {...tooltipEstilo} labelFormatter={(_, p) => p?.[0]?.payload?.folio ?? ''} formatter={(x, n) => [x === null ? 'sin pagar' : `${x} días`, n === 'pactado' ? 'Plazo pactado' : 'Plazo real']} />
                    <Legend wrapperStyle={leyendaEstilo} formatter={(n) => (n === 'pactado' ? 'Plazo pactado' : 'Plazo real')} />
                    <Bar dataKey="pactado" fill="#0071e3" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="real" fill="#1d1d1f" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.tipo === 'desbloquear' ? 'Desbloquear marca' : 'Bloquear marca'}
        subtitle={e?.razonSocial}
        footer={modal && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            {modal.tipo === 'bloquear'
              ? <Button size="sm" variant="danger" disabled={motivo === 'Otro' && !nota.trim()} onClick={confirmar}>Bloquear marca</Button>
              : <Button size="sm" onClick={confirmar}>Desbloquear</Button>}
          </>
        )}
      >
        {modal?.tipo === 'bloquear' ? (
          <div className="flex flex-col gap-4">
            <Select label="Motivo del bloqueo" value={motivo} onChange={(ev) => setMotivo(ev.target.value as typeof motivo)}>
              <option value="No paga">No paga</option>
              <option value="Paga impuntual">Paga impuntual</option>
              <option value="Otro">Otro</option>
            </Select>
            {motivo === 'Otro' && <Input label="Nota" placeholder="Describe el motivo del bloqueo" value={nota} onChange={(ev) => setNota(ev.target.value)} />}
            <p className="text-[12px] text-ash">Las solicitudes nuevas con esta marca se rechazarán sin validar el CFDI ni analizar el contrato, con el motivo interno «Marca bloqueada». El talento o la agencia solo verá «No hemos podido procesar tu solicitud de adelanto con esta marca. Prueba con otra.»</p>
          </div>
        ) : (
          <p className="text-[13px] text-carbon">La marca <span className="font-medium">{e?.razonSocial}</span> volverá a operar con normalidad y sus solicitudes se procesarán de nuevo.</p>
        )}
      </Modal>
    </div>
  );
}

function Empresas() {
  const v = useVista();
  const rol = useInflu(rolActual);
  const filas: FilaE[] = v.empresas.map((e): FilaE => {
    const marcas = v.marcas.filter((m) => m.empresaId === e.id);
    const reales = marcas.map((m) => historialMarca(m.id, v).real).filter((x): x is number => x !== null);
    return {
      ...e, lista69b: e.lista69b ? 'Sí' : 'No', marcasTxt: marcas.map((m) => m.nombre).join(', '),
      diasReales: reales.length ? Math.round(suma(reales) / reales.length) : null,
      porCobrar: suma(v.cxc.filter((c) => marcas.some((m) => m.id === c.marcaId) && estatusCxC(c) !== 'Pagado').map(saldoCxC)),
    };
  }).sort((a, b) => b.porCobrar - a.porCobrar || a.razonSocial.localeCompare(b.razonSocial));
  const en69b = filas.filter((m) => m.lista69b === 'Sí');
  const vencidas = v.cxc.filter((c) => estatusCxC(c) === 'Vencido');

  return (
    <DataModule<FilaE>
      coleccion="empresas" rows={filas} cols={cols} estatuses={ESTATUS} nombreSingular="empresa" femenino sinBaja
      sinAlta={!autoriza.catalogo(rol)} sinEdicion={!autoriza.catalogo(rol)} plantilla={{ plazoHabitual: 60, lista69b: 'No', estatus: 'Activa' }}
      titulo="Empresas que pagan" tituloDetalle={(e) => e.razonSocial}
      subtitulo="La empresa que paga, separada de la marca anunciante. El área de pagos recibe la instrucción irrevocable de pago y la cobranza."
      kpis={[
        { label: 'Empresas', value: String(filas.length), note: `${v.marcas.length} marcas anunciantes`, icon: BadgeCheck },
        { label: 'En lista 69-B', value: String(en69b.length), note: en69b.map((m) => m.razonSocial.split(',')[0]).join(', ') || 'ninguna', icon: ShieldAlert },
        { label: 'Con factura vencida', value: String(new Set(vencidas.map((c) => empresaDe(v, c.marcaId)?.id)).size), note: money(suma(vencidas.map(saldoCxC))), icon: AlertTriangle },
        { label: 'Por cobrar', value: money(suma(filas.map((m) => m.porCobrar))), icon: Coins, importe: true },
      ]}
      detalle={(e) => (
        <Relacion titulo="Marcas anunciantes">
          {v.marcas.filter((m) => m.empresaId === e.id).map((m) => {
            const h = historialMarca(m.id, v);
            return <RenglonRelacion key={m.id} titulo={m.nombre} detalle={`${m.industria} · ${h.operaciones} operaciones · real ${h.real ?? '—'} días`} valor={money(h.monto)} />;
          })}
          {porId(v.empresas, e.id)?.contactoPagos && <RenglonRelacion titulo="Área de pagos" detalle={`${e.contactoPagos?.nombre} · ${e.contactoPagos?.email}`} valor={e.contactoPagos?.verificado ? 'Verificado' : 'Sin verificar'} tone={e.contactoPagos?.verificado ? 'Activa' : 'Pendiente'} />}
        </Relacion>
      )}
    />
  );
}
