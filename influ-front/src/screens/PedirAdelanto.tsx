import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, X, FileText, Check } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Archivo from '../components/ui/Archivo';
import Badge from '../components/ui/Badge';
import { useInflu, useVista, usuarioActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { bloqueoPedir, empresaDe, handlePrincipal, porId, textoEntregable } from '../lib/derive';
import { estadoTalento, toneEstado } from '../lib/talento';
import { formatDate, millones, money } from '../lib/format';
import { COMISION_FIJA, FORMATOS, PORCENTAJE_ADELANTO, REDES, TASA_MENSUAL, sumarDias } from '../data/constantes';
import type { Contacto, Entregable, Formato, Red } from '../data/types';

const OTRA = '__otra__';

// M6 (piloto Stay On Social): la agencia pide el adelanto en cuatro pasos —
// talento aprobado, datos de la colaboración, factura y contrato u orden de
// compra, y una revisión final con el adelanto estimado y las declaraciones.
export const PedirAdelanto = () => {
  const navigate = useNavigate();
  const s = useInflu();
  const v = useVista();
  const u = usuarioActual(s)!;
  const esAgencia = u.rol === 'Agencia';
  // El roster completo: los aprobados se pueden elegir; los demás aparecen
  // deshabilitados con el motivo ("Faltan datos fiscales", "En revisión"…).
  const roster = [...v.talentos].sort((a, b) => (b.audienciaTotal ?? 0) - (a.audienciaTotal ?? 0));
  const [talentoId, setTalentoId] = useState(u.rol === 'Talento' ? u.talentoId ?? '' : '');
  const [paso, setPaso] = useState<0 | 1 | 2 | 3>(u.rol === 'Talento' ? 1 : 0);
  const [marcaId, setMarcaId] = useState('');
  const [nueva, setNueva] = useState({ nombre: '', razonSocial: '', rfc: '', industria: '' });
  const [monto, setMonto] = useState(0);
  const [publicacion, setPublicacion] = useState('');
  const [plazo, setPlazo] = useState(0);
  const [entregables, setEntregables] = useState<Omit<Entregable, 'id'>[]>([]);
  const [nuevoE, setNuevoE] = useState<{ red: Red; formato: Formato; cantidad: number }>({ red: 'Instagram', formato: 'Reel', cantidad: 1 });
  const [pagos, setPagos] = useState<Contacto>({ nombre: '', email: '', telefono: '' });
  const [mkt, setMkt] = useState('');
  const [xml, setXml] = useState<string[]>([]);
  const [pdf, setPdf] = useState<string[]>([]);
  const [contrato, setContrato] = useState<string[]>([]);
  const [adicionales, setAdicionales] = useState<string[]>([]);
  const [declaro, setDeclaro] = useState(false);
  const [sinCesion, setSinCesion] = useState(false);

  const tal = porId(v.talentos, talentoId);
  const ag = porId(s.agencias, esAgencia ? u.agenciaId : tal?.agenciaId);
  const marca = porId(s.marcas, marcaId);
  const empresa = empresaDe(s, marcaId);

  // Lo que impide pedir, a la vista antes de capturar (la acción vuelve a validarlo).
  const bloqueo = !autoriza.solicitud(u.rol)
    ? `Tu perfil (${u.rol}) no pide adelantos: los piden el talento o su agencia.`
    : esAgencia && (ag?.cuenta !== 'Preaprobada' || ag.estatus !== 'Activa')
      ? `${ag?.nombre ?? 'Tu agencia'} todavía no está aprobada: el equipo de Influ la revisa antes de operar.`
      : tal ? bloqueoPedir(tal, s.agencias) : null;

  const elegirMarca = (id: string) => {
    setMarcaId(id);
    const e = empresaDe(s, id);
    if (e) {
      if (!plazo) setPlazo(e.plazoHabitual);
      // Marca ya registrada: el contacto del área de pagos viene precargado.
      if (e.contactoPagos) setPagos({ nombre: e.contactoPagos.nombre, email: e.contactoPagos.email, telefono: e.contactoPagos.telefono ?? '' });
      if (e.contactoMarketing) setMkt(`${e.contactoMarketing.nombre} · ${e.contactoMarketing.email}`);
    }
  };

  // Paso 1 · Talento: grilla con el roster. Solo los aprobados por Influ se
  // pueden elegir; los demás quedan deshabilitados con su motivo.
  if (paso === 0) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1150px] mx-auto flex flex-col gap-5">
        <div>
          <div className="text-[21px] font-semibold text-carbon">Pedir un adelanto</div>
          <div className="text-[13px] text-ash">Paso 1 de 4 · ¿Para qué talento es?</div>
        </div>
        {bloqueo && tal && <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2.5 text-[12.5px] text-warning">{bloqueo}</div>}
        <Panel>
          <div className="p-4">
            {roster.length === 0 && <div className="text-[13px] text-mist px-4 py-6 text-center">Todavía no tienes talentos en el roster. Agrégalos en Mis talentos.</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {roster.map((t) => {
                const motivo = bloqueoPedir(t, s.agencias);
                const elegible = !motivo;
                const estado = estadoTalento(t);
                return (
                  <button
                    key={t.id}
                    disabled={!elegible}
                    onClick={() => elegible && setTalentoId(t.id)}
                    title={motivo ?? undefined}
                    className={`flex items-center gap-3 border-2 rounded-[8px] px-3.5 py-3 text-left transition-colors ${
                      !elegible ? 'border-hairline bg-frost/50 opacity-70 cursor-not-allowed'
                        : talentoId === t.id ? 'border-blue bg-ice' : 'border-hairline hover:bg-frost cursor-pointer'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${talentoId === t.id ? 'bg-blue text-white' : 'bg-pebble text-smoke'}`}>
                      {(t.nombreArtistico ?? t.nombre).split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-carbon truncate">{t.nombreArtistico ?? t.nombre}</span>
                      <span className="block text-[11.5px] text-ash truncate">{handlePrincipal(t)}{t.audienciaTotal ? ` · ${millones(t.audienciaTotal)}` : ''}</span>
                    </span>
                    {elegible
                      ? talentoId === t.id && <Check size={16} className="text-blue shrink-0" />
                      : <Badge tone={toneEstado(estado)} className="shrink-0">{estado === 'Faltan datos fiscales' ? 'Faltan datos' : estado === 'En revisión de Influ' ? 'En revisión' : estado}</Badge>}
                  </button>
                );
              })}
            </div>
            <div className="text-[12.5px] text-ash mt-3">Solo se pueden elegir los talentos aprobados por Influ. Los demás necesitan sus datos fiscales y la aprobación del equipo.</div>
            <div className="flex items-center justify-end gap-3 mt-3">
              <button onClick={() => navigate('/resumen')} className="text-[13px] text-blue-link font-medium hover:underline">Cancelar</button>
              <Button disabled={!talentoId || !!bloqueo} onClick={() => setPaso(1)}>Continuar <ChevronRight size={14} /></Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const venc = publicacion && plazo > 0 ? sumarDias(publicacion, plazo) : '';
  const adelanto = Math.round(monto * PORCENTAJE_ADELANTO);
  const remanente = monto - adelanto;
  const comisionFija = Math.round(monto * COMISION_FIJA);
  const [mktNombre, mktEmail] = mkt.split('·').map((x) => x.trim());
  const nombreMarca = marca?.nombre ?? (nueva.nombre || 'marca');
  const slug = nombreMarca.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '_');
  const titulo = paso === 1 ? 'Datos de la colaboración' : paso === 2 ? 'Factura y contrato u orden de compra' : 'Revisión y envío';

  const datosListos = () => {
    const falta = !marcaId ? 'Elige la marca.' : marcaId === OTRA && (!nueva.nombre || !nueva.rfc) ? 'Escribe el nombre de la marca y el RFC de la empresa que paga.'
      : !(monto > 0) ? 'Captura el monto facturado.' : !(plazo > 0) ? 'Captura el plazo de pago.' : !publicacion ? 'Captura la fecha de publicación.'
        : !entregables.length ? 'Agrega los entregables pactados.' : !pagos.nombre || !pagos.email.includes('@') ? 'El email del área de pagos es obligatorio.' : null;
    if (falta) { s.toast(falta, 'error'); return; }
    setPaso(2);
  };

  // Paso 3 → 4: sin CFDI (XML y PDF) el "Continuar" se bloquea, como pide M6.
  const documentosListos = () => {
    if (!xml.length || !pdf.length) { s.toast('Carga el CFDI en XML y PDF: de ahí sale el folio fiscal que validamos con el SAT.', 'error'); return; }
    setPaso(3);
  };

  const enviar = () => {
    if (!declaro || !sinCesion) { s.toast('Marca las dos declaraciones para enviar la solicitud.', 'error'); return; }
    const folio = s.capturarSolicitud({
      talentoId, marcaId: marcaId === OTRA ? '' : marcaId, marcaNueva: marcaId === OTRA ? nueva : undefined, monto,
      fechaPublicacion: publicacion, plazoDias: plazo, entregables, contactoPagos: pagos,
      contactoMarketing: mktNombre ? { nombre: mktNombre, email: mktEmail ?? '' } : undefined,
      cfdiXml: xml[0] ?? '', cfdiPdf: pdf[0] ?? '', contrato: contrato[0] ?? '',
    });
    if (folio) navigate(`/operaciones?id=${folio}`);
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1150px] mx-auto flex flex-col gap-5">
      <div>
        <div className="text-[21px] font-semibold text-carbon">Pedir tu adelanto</div>
        <div className="text-[13px] text-ash">Paso {paso + 1} de 4 · {titulo}{esAgencia && tal ? ` · ${tal.nombreArtistico ?? tal.nombre}` : ''}</div>
      </div>
      {bloqueo && <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2.5 text-[12.5px] text-warning">{bloqueo}</div>}

      {paso === 1 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Panel title="Colaboración">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <Select label="Marca *" value={marcaId} onChange={(e) => elegirMarca(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {s.marcas.map((m) => <option key={m.id} value={m.id}>{`${m.nombre} · ${empresaDe(s, m.id)?.razonSocial ?? ''}`}</option>)}
                    <option value={OTRA}>Otra marca (no está en la lista)</option>
                  </Select>
                  {empresa && <span className="text-[11.5px] text-success">Marca ya registrada: datos precargados</span>}
                  {empresa?.lista69b && <span className="text-[11.5px] text-danger">{empresa.razonSocial} aparece en la lista 69-B del SAT: la validación rechazará el CFDI.</span>}
                </div>
                {marcaId === OTRA && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nombre de la marca" value={nueva.nombre} placeholder="Porsche" onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
                    <Input label="Industria" value={nueva.industria} placeholder="Automotriz" onChange={(e) => setNueva({ ...nueva, industria: e.target.value })} />
                    <Input label="RFC de la empresa que paga" value={nueva.rfc} placeholder="12 caracteres" onChange={(e) => setNueva({ ...nueva, rfc: e.target.value.toUpperCase().slice(0, 12) })} />
                    <Input label="Razón social" value={nueva.razonSocial} placeholder="Como aparece en el CFDI" onChange={(e) => setNueva({ ...nueva, razonSocial: e.target.value })} />
                    <div className="col-span-2 text-[11.5px] text-ash">La marca se da de alta sola con el RFC receptor del CFDI y queda en revisión.</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Monto facturado por tu agencia, sin IVA *" type="number" min={0} value={monto || ''} placeholder="$0 MXN" onChange={(e) => setMonto(Number(e.target.value))} />
                  <Input label="Plazo de pago (días) *" type="number" min={1} max={180} value={plazo || ''} placeholder="60" onChange={(e) => setPlazo(Number(e.target.value))} />
                  <Input label="Fecha de publicación *" type="date" value={publicacion} onChange={(e) => setPublicacion(e.target.value)} />
                  <div className="flex flex-col gap-1.5"><span className="text-[12px] font-medium text-ash">Vencimiento</span><div className="border border-hairline rounded-[8px] px-3 py-2 text-[15px] bg-frost min-h-[42px]">{venc ? formatDate(venc, { day: '2-digit', month: '2-digit', year: 'numeric' }) : <span className="text-mist">publicación + plazo</span>}</div></div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ash">Entregables pactados *</span>
                  <div className="flex flex-wrap gap-1.5">
                    {entregables.map((e, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-carbon text-white rounded-full pl-3 pr-1.5 py-1 text-[12.5px]">
                        {textoEntregable(e)} <button onClick={() => setEntregables(entregables.filter((_, j) => j !== i))}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="w-[70px]"><Input type="number" min={1} value={nuevoE.cantidad} onChange={(e) => setNuevoE({ ...nuevoE, cantidad: Math.max(1, Number(e.target.value)) })} /></div>
                    <div className="w-[120px]"><Select value={nuevoE.formato} onChange={(e) => setNuevoE({ ...nuevoE, formato: e.target.value as Formato })}>{FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}</Select></div>
                    <div className="w-[140px]"><Select value={nuevoE.red} onChange={(e) => setNuevoE({ ...nuevoE, red: e.target.value as Red })}>{REDES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></div>
                    <Button size="sm" variant="outlined" onClick={() => setEntregables([...entregables, nuevoE])}><Plus size={13} /> Agregar</Button>
                  </div>
                </div>
              </div>
            </Panel>
            <Panel title="Área de pagos de la marca">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3.5">
                <Input label="Nombre *" placeholder="Mariana Pérez · Cuentas por pagar" value={pagos.nombre} onChange={(e) => setPagos({ ...pagos, nombre: e.target.value })} />
                <Input label="Email del área de pagos *" type="email" placeholder="pagos@marca.com" value={pagos.email} onChange={(e) => setPagos({ ...pagos, email: e.target.value })} />
                <Input label="Teléfono" placeholder="55 0000 0000" value={pagos.telefono ?? ''} onChange={(e) => setPagos({ ...pagos, telefono: e.target.value })} />
                <Input label="Contacto de marketing (opcional)" placeholder="Nombre · email" value={mkt} onChange={(e) => setMkt(e.target.value)} />
                <div className="text-[11.5px] text-ash">Usamos el email del área de pagos para la instrucción irrevocable de pago y la cobranza. Se guarda en la ficha de la marca para la siguiente operación.</div>
              </div>
            </Panel>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => (esAgencia ? setPaso(0) : navigate('/resumen'))} className="text-[13px] text-blue-link font-medium hover:underline">{esAgencia ? 'Cambiar talento' : 'Cancelar'}</button>
            <Button disabled={!!bloqueo} onClick={datosListos}>Continuar</Button>
          </div>
        </>
      ) : paso === 2 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Panel title="Factura a la agencia (CFDI)" subtitle="La agencia es la cedente: el CFDI lo emite tu agencia a la marca.">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                <Archivo titulo="XML del CFDI *" ayuda="Arrastra el XML: de aquí sale el folio fiscal y los datos para el SAT" acepta=".xml" archivos={xml} onChange={setXml} ejemplo={`CFDI_${slug}_A${1000 + v.operaciones.length}.xml`} />
                <Archivo titulo="PDF del CFDI *" ayuda="La representación impresa de la factura" acepta=".pdf" archivos={pdf} onChange={setPdf} ejemplo={`CFDI_${slug}_A${1000 + v.operaciones.length}.pdf`} />
                <div className="text-[11.5px] text-ash">Validación automática con el SAT: emisor = RFC de tu agencia, receptor = empresa que paga, subtotal = monto, folio sin usar y fuera de la lista 69-B.</div>
              </div>
            </Panel>
            <Panel title="Contrato u orden de compra">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                <Archivo titulo="Contrato u orden de compra" ayuda="PDF, escaneo o foto. Nuestra IA lee partes, entregables, monto, plazo, cesión e incumplimiento." acepta=".pdf,.jpg,.jpeg,.png,.heic" archivos={contrato} onChange={setContrato} ejemplo={`OC_${slug}_${(tal?.nombreArtistico ?? tal?.nombre ?? 'talento').split(' ')[0]}.pdf`} />
                <Archivo titulo="Documentos adicionales (opcional)" ayuda="Brief, anexos de aceptación, otros" acepta=".pdf,.jpg,.jpeg,.png,.heic" archivos={adicionales} onChange={setAdicionales} ejemplo={`Brief_${slug}.pdf`} />
              </div>
            </Panel>
          </div>
          <div className="bg-white border border-hairline rounded-[8px] px-5 py-3.5 text-[13.5px] text-ash flex gap-2">
            <FileText size={16} className="shrink-0 mt-0.5" /> Al continuar validamos la factura con el SAT y nuestra IA lee el contrato. El "Continuar" se bloquea si falta el CFDI.
            {monto > 0 && <span className="ml-auto text-carbon font-medium whitespace-nowrap">Adelanto estimado {money(adelanto)}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setPaso(1)} className="text-[13px] text-blue-link font-medium hover:underline">Volver a los datos</button>
            <Button disabled={!!bloqueo} onClick={documentosListos}>Continuar</Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Panel title="Resumen de la solicitud">
              <div className="border-t border-hairline divide-y divide-hairline text-[13.5px]">
                {[
                  ['Talento', tal?.nombreArtistico ?? tal?.nombre ?? '—'],
                  ['Marca', nombreMarca],
                  ['Monto facturado (sin IVA)', money(monto)],
                  ['Publicación', publicacion ? formatDate(publicacion, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'],
                  ['Vencimiento de la marca', venc ? `${formatDate(venc, { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${plazo} días` : '—'],
                  ['Entregables', entregables.map((e) => textoEntregable(e)).join(', ') || '—'],
                  ['Factura', xml.length && pdf.length ? 'CFDI en XML y PDF' : 'Falta CFDI'],
                  ['Contrato u OC', contrato.length ? 'Cargado' : 'Sin cargar'],
                ].map(([k, val]) => (
                  <div key={k} className="px-5 py-2.5 flex items-start justify-between gap-4">
                    <span className="text-ash">{k}</span>
                    <span className="text-carbon font-medium text-right">{val}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel title="Lo que recibe tu agencia">
                <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-ash">Adelanto estimado (80%)</span>
                    <span className="text-[26px] font-semibold text-carbon tabular-nums">{money(adelanto)}</span>
                  </div>
                  <div className="h-px bg-hairline" />
                  <div className="text-[12.5px] text-ash leading-relaxed">
                    Recibes el <b className="text-carbon">80%</b> ({money(adelanto)}) a la cuenta de tu agencia en cuanto Influ aprueba, el CFDI valida y la marca confirma la instrucción de pago.
                    El <b className="text-carbon">20% restante</b> ({money(remanente)}) se liquida cuando la marca paga, menos la comisión fija de Influ ({COMISION_FIJA * 100}% ≈ {money(comisionFija)}) y la variable de {TASA_MENSUAL * 100}% mensual sobre lo adelantado.
                  </div>
                </div>
              </Panel>
              <Panel title="Declaraciones">
                <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[12.5px] text-carbon">
                    <input type="checkbox" className="accent-blue w-4 h-4 mt-0.5 shrink-0" checked={declaro} onChange={(e) => setDeclaro(e.target.checked)} />
                    <span>Declaro que la factura y el contrato u orden de compra son auténticos y corresponden a una colaboración real ya pactada con la marca.</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer text-[12.5px] text-carbon">
                    <input type="checkbox" className="accent-blue w-4 h-4 mt-0.5 shrink-0" checked={sinCesion} onChange={(e) => setSinCesion(e.target.checked)} />
                    <span>Declaro que este cobro no ha sido cedido, factorizado ni comprometido antes con ningún tercero.</span>
                  </label>
                </div>
              </Panel>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setPaso(2)} className="text-[13px] text-blue-link font-medium hover:underline">Volver a los documentos</button>
            <Button disabled={!!bloqueo || !declaro || !sinCesion} onClick={enviar}>Enviar solicitud a Influ <ChevronRight size={14} /></Button>
          </div>
        </>
      )}
    </div>
  );
};
