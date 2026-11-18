import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, Sparkles, Plus, X } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Archivo from '../components/ui/Archivo';
import { Chips } from '../components/ui/Fila';
import { useInflu, bancoDeClabe, clabeValida, type BorradorAgencia, type BorradorTalento } from '../store/useInflu';
import { rutaInicial } from '../lib/permisos';
import { nacimientoDeRfc } from '../lib/derive';
import { formatDate } from '../lib/format';
import {
  COMISION_FIJA, CONDICIONES_DESDE, ESTADOS_MX, FOTO_MAX_MB, GENEROS, LADAS, NICHOS, PAISES, REDES, REGIMENES, TASA_MENSUAL, TIPOS_CONTENIDO,
  VERSION_AVISO_PRIVACIDAD,
} from '../data/constantes';
import type { AvisoPago, Genero, RegimenFiscal } from '../data/types';

export const Logo = ({ claro }: { claro?: boolean }) => (
  <Link to="/inicio" className={`text-[22px] font-bold tracking-[-0.5px] ${claro ? 'text-white' : 'text-carbon'}`}>influ<span className="text-blue">.</span></Link>
);

const Barra = ({ derecha }: { derecha?: React.ReactNode }) => (
  <div className="h-16 bg-carbon px-4 md:px-10 flex items-center justify-between gap-3">
    <Logo claro />
    {derecha ?? <Link to="/login"><Button size="sm">Ingresar</Button></Link>}
  </div>
);

/** Pasos del registro: los completados en color, el actual en negro. */
const Pasos = ({ pasos, actual }: { pasos: string[]; actual: number }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
    {pasos.map((p, i) => (
      <div key={p} className="flex flex-col gap-1.5">
        <span className={`h-1 rounded-full ${i < actual ? 'bg-blue' : i === actual ? 'bg-carbon' : 'bg-pebble'}`} />
        <span className={`text-[12px] truncate ${i < actual ? 'text-blue-link font-semibold' : i === actual ? 'text-carbon font-semibold' : 'text-mist'}`}>{p}</span>
      </div>
    ))}
  </div>
);

const Caja = ({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-hairline rounded-[12px] p-5 flex flex-col gap-3.5 ${className}`}>
    <div className="text-[16px] font-semibold text-carbon">{titulo}</div>
    {children}
  </div>
);

const CajaError = ({ texto }: { texto: string | null }) => texto ? <div className="bg-danger-wash text-danger text-[12px] rounded-[8px] px-3 py-2">{texto}</div> : null;
const Ok = ({ children }: { children: React.ReactNode }) => <span className="text-[11.5px] text-success flex items-center gap-1"><CheckCircle2 size={12} /> {children}</span>;
const Etiqueta = ({ children, nota }: { children: React.ReactNode; nota?: string }) => (
  <div className="text-[12px] font-medium text-ash">{children}{nota && <span className="font-normal text-mist"> · {nota}</span>}</div>
);

// Pantallas 2 a 4 del flujo de Fase 1 (22 oct). Toda cuenta nueva queda en
// revisión hasta que el equipo de Influ la aprueba.
export const Registro = () => {
  const [params, setParams] = useSearchParams();
  const tipo = params.get('tipo');
  if (tipo === 'talento') return <FormaTalento />;
  if (tipo === 'agencia') return <FormaAgencia />;
  return (
    <div className="min-h-screen bg-frost flex flex-col">
      <Barra />
      <div className="flex-1 flex flex-col items-center px-4 py-14 gap-8">
        <div className="text-center">
          <h1 className="text-[30px] font-bold text-carbon">¿Cómo vas a usar Influ?</h1>
          <p className="text-[15px] text-ash mt-1">Elige tu tipo de cuenta para empezar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-[880px]">
          {[
            { id: 'talento', icon: Sparkles, titulo: 'Soy influencer', texto: 'Pide adelantos de tus colaboraciones, solo o a través de tu agencia.' },
            { id: 'agencia', icon: Building2, titulo: 'Soy agencia', texto: 'Administra a tus talentos, sus campañas y sus adelantos.' },
          ].map((x) => (
            <div key={x.id} className={`bg-white border-2 rounded-[12px] p-8 flex flex-col items-center text-center gap-3 ${x.id === 'talento' ? 'border-blue' : 'border-hairline'}`}>
              <x.icon size={30} className="text-carbon" strokeWidth={1.5} />
              <div className="text-[19px] font-bold text-carbon">{x.titulo}</div>
              <div className="text-[13.5px] text-ash leading-snug max-w-[320px]">{x.texto}</div>
              <Button variant={x.id === 'talento' ? 'filled' : 'outlined'} onClick={() => setParams({ tipo: x.id })}>Crear cuenta</Button>
            </div>
          ))}
        </div>
        <div className="text-[13px] text-ash">¿Ya tienes cuenta? <Link to="/login" className="text-blue-link font-medium hover:underline">Ingresar</Link></div>
      </div>
    </div>
  );
};

const PASOS_TALENTO = ['Identidad', 'Datos fiscales', 'Contacto y cobro', 'Perfil de creador', 'Agencia y condiciones'];

const vacioTalento: BorradorTalento = {
  nombre: '', correo: '', nacionalidad: 'Mexicana', rfc: '', curp: '', regimenFiscal: '', genero: '', foto: '', lada: '+52', telefono: '', clabe: '',
  handles: [{ red: 'Instagram', usuario: '' }, { red: 'TikTok', usuario: '' }, { red: 'YouTube', usuario: '' }],
  nichos: [], nichoOtro: '', tiposContenido: [], contenidoOtro: '', ubicacion: { pais: 'México', estado: '', ciudad: '' },
  agenciaId: '', condiciones: false, privacidad: false,
};

/** Formulario de perfil del creador, compartido con la pantalla Perfil. */
export function CamposCreador({ b, set }: { b: BorradorTalento; set: (x: Partial<BorradorTalento>) => void }) {
  const ciudades = ESTADOS_MX[b.ubicacion.estado] ?? [];
  const usadas = b.handles.map((h) => h.red);
  const validos = b.handles.filter((h) => /^@[\w.]{2,30}$/.test(h.usuario.trim()));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Etiqueta nota="al menos uno">Tus handles *</Etiqueta>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {b.handles.map((h, i) => (
            <div key={`${h.red}-${i}`} className="flex flex-col gap-1">
              <span className="text-[11.5px] text-ash flex items-center justify-between">{h.red}
                {i > 2 && <button type="button" onClick={() => set({ handles: b.handles.filter((_, j) => j !== i) })}><X size={11} /></button>}
              </span>
              <input value={h.usuario} placeholder="@usuario" onChange={(e) => set({ handles: b.handles.map((x, j) => (j === i ? { ...x, usuario: e.target.value.replace(/\s/g, '') } : x)) })}
                className="border border-hairline rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:border-blue" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11.5px]">
          {validos.length > 0 && <Ok>Cuentas encontradas</Ok>}
          <span className="text-mist">·</span>
          {REDES.filter((r) => !usadas.includes(r)).slice(0, 4).map((r) => (
            <button key={r} type="button" onClick={() => set({ handles: [...b.handles, { red: r, usuario: '' }] })} className="text-blue-link hover:underline inline-flex items-center gap-0.5"><Plus size={11} />{r}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Etiqueta>Nichos en los que te especializas *</Etiqueta>
        <Chips opciones={NICHOS} valor={b.nichos} onChange={(nichos) => set({ nichos })} />
        {b.nichos.includes('Otro') && <input value={b.nichoOtro} onChange={(e) => set({ nichoOtro: e.target.value })} placeholder="¿Cuál?" className="border border-hairline rounded-[8px] px-3 py-1.5 text-[13px] max-w-[260px]" />}
      </div>
      <div className="flex flex-col gap-1.5">
        <Etiqueta>Tipo de contenido que haces *</Etiqueta>
        <Chips opciones={TIPOS_CONTENIDO} valor={b.tiposContenido} onChange={(tiposContenido) => set({ tiposContenido })} />
        {b.tiposContenido.includes('Otro') && <input value={b.contenidoOtro} onChange={(e) => set({ contenidoOtro: e.target.value })} placeholder="¿Cuál?" className="border border-hairline rounded-[8px] px-3 py-1.5 text-[13px] max-w-[260px]" />}
      </div>
      <div className="flex flex-col gap-1.5">
        <Etiqueta>Desde dónde creas tu contenido *</Etiqueta>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Select value={b.ubicacion.pais} onChange={(e) => set({ ubicacion: { pais: e.target.value, estado: '', ciudad: '' } })}>
            {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          {b.ubicacion.pais === 'México' ? (
            <>
              <Select value={b.ubicacion.estado} onChange={(e) => set({ ubicacion: { ...b.ubicacion, estado: e.target.value, ciudad: ESTADOS_MX[e.target.value]?.[0] ?? '' } })}>
                <option value="">Estado…</option>
                {Object.keys(ESTADOS_MX).map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
              <Select value={b.ubicacion.ciudad} onChange={(e) => set({ ubicacion: { ...b.ubicacion, ciudad: e.target.value } })}>
                <option value="">Ciudad…</option>
                {ciudades.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
            </>
          ) : (
            <>
              <Input placeholder="Estado o provincia" value={b.ubicacion.estado} onChange={(e) => set({ ubicacion: { ...b.ubicacion, estado: e.target.value } })} />
              <Input placeholder="Ciudad" value={b.ubicacion.ciudad} onChange={(e) => set({ ubicacion: { ...b.ubicacion, ciudad: e.target.value } })} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Datos personales y de cobro, compartidos con la pantalla Perfil. */
export function CamposPersonales({ b, set, conCorreo = true }: { b: BorradorTalento; set: (x: Partial<BorradorTalento>) => void; conCorreo?: boolean }) {
  const esMexicana = b.nacionalidad === 'Mexicana';
  const nac = b.rfc.length >= 10 ? nacimientoDeRfc(b.rfc, b.curp) : null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Caja titulo="Tus datos">
        <Input label="Nombre legal" isRequired placeholder="Como aparece en tu identificación" value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} />
        {conCorreo && <Input label="Correo" isRequired type="email" placeholder="tu@correo.com" value={b.correo} onChange={(e) => set({ correo: e.target.value })} />}
        <Select label="Nacionalidad *" value={b.nacionalidad} onChange={(e) => set({ nacionalidad: e.target.value as BorradorTalento['nacionalidad'], ...(e.target.value !== 'Mexicana' ? { curp: '' } : {}) })}>
          <option value="Mexicana">Mexicana</option>
          <option value="Extranjera">Extranjera</option>
        </Select>
        <div className={b.nacionalidad === 'Mexicana' ? 'grid grid-cols-2 gap-3' : ''}>
          <Input label="RFC" isRequired placeholder="13 caracteres" value={b.rfc} onChange={(e) => set({ rfc: e.target.value.toUpperCase().slice(0, 13) })} />
          {b.nacionalidad === 'Mexicana' && <Input label="CURP" isRequired placeholder="18 caracteres" value={b.curp} onChange={(e) => set({ curp: e.target.value.toUpperCase().slice(0, 18) })} />}
        </div>
        <Select label="Régimen fiscal *" value={b.regimenFiscal} onChange={(e) => set({ regimenFiscal: e.target.value as RegimenFiscal })}>
          <option value="">Selecciona…</option>
          {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Etiqueta>Fecha de nacimiento</Etiqueta>
            <div className="border border-hairline rounded-[8px] px-3 py-2 text-[15px] bg-frost text-carbon min-h-[42px]">{nac?.fecha ? formatDate(nac.fecha, { day: '2-digit', month: '2-digit', year: 'numeric' }) : <span className="text-mist">{esMexicana ? 'Sale de tu RFC' : '—'}</span>}</div>
            {nac?.fecha && (!esMexicana || nac.coincide || b.curp.length < 18 ? <Ok>Se obtiene de tu RFC</Ok> : <span className="text-[11.5px] text-warning">Tu RFC y tu CURP no coinciden: el equipo lo revisa.</span>)}
          </div>
          <Select label="Género *" value={b.genero} onChange={(e) => set({ genero: e.target.value as Genero })}>
            <option value="">Selecciona…</option>
            {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </div>
      </Caja>
      <Caja titulo="Contacto y cobro">
        <div className="flex flex-col gap-1.5">
          <Etiqueta>Foto de perfil</Etiqueta>
          <Archivo titulo={b.foto || 'Sube tu foto'} ayuda={`JPG o PNG, hasta ${FOTO_MAX_MB} MB · recorte cuadrado`} acepta=".jpg,.jpeg,.png" archivos={b.foto ? [b.foto] : []} onChange={(x) => set({ foto: x[0] ?? '' })} ejemplo="foto_perfil.jpg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Etiqueta>Número de teléfono *</Etiqueta>
          <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
            <Select value={b.lada} onChange={(e) => set({ lada: e.target.value })}>{LADAS.map((l) => <option key={l} value={l}>{l}</option>)}</Select>
            <Input placeholder="55 0000 0000" value={b.telefono} onChange={(e) => set({ telefono: e.target.value.replace(/[^\d ]/g, '').slice(0, 12) })} />
          </div>
          <span className="text-[11px] text-mist">También es tu WhatsApp: ahí te avisamos cuando se envía un pago.</span>
        </div>
        <div className="flex flex-col gap-1">
          <Input label="CLABE" isRequired placeholder="18 dígitos" value={b.clabe} onChange={(e) => set({ clabe: e.target.value.replace(/\D/g, '').slice(0, 18) })} />
          {b.clabe.length === 18 && (clabeValida(b.clabe) ? <Ok>CLABE válida · {bancoDeClabe(b.clabe) || 'banco'}</Ok> : <span className="text-[11.5px] text-danger">El dígito verificador no cuadra.</span>)}
        </div>
      </Caja>
    </div>
  );
}

function FormaTalento() {
  const navigate = useNavigate();
  const s = useInflu();
  const agencias = s.agencias.filter((a) => a.cuenta === 'Preaprobada' && a.estatus === 'Activa');
  const [b, setB] = useState<BorradorTalento>(vacioTalento);
  const [vista, setVista] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const set = (x: Partial<BorradorTalento>) => setB((o) => ({ ...o, ...x }));
  const agencia = agencias.find((a) => a.id === b.agenciaId);

  // Lo de la vista 1 se revisa antes de pasar al perfil; el resto, al crear la cuenta.
  const continuar = () => {
    const falta = !b.nombre.trim() ? 'Escribe tu nombre legal.' : !b.correo.includes('@') ? 'Escribe tu correo.' : b.rfc.length !== 13 ? 'El RFC lleva 13 caracteres.'
      : b.nacionalidad === 'Mexicana' && b.curp.length !== 18 ? 'La CURP lleva 18 caracteres.' : !b.regimenFiscal ? 'Elige tu régimen fiscal.' : !b.genero ? 'Elige tu género.' : !b.foto ? 'Sube tu foto de perfil.'
        : b.telefono.replace(/\D/g, '').length !== 10 ? 'El teléfono lleva 10 dígitos.' : !clabeValida(b.clabe) ? 'Revisa tu CLABE: el dígito verificador no cuadra.' : null;
    setError(falta);
    if (!falta) { setVista(2); window.scrollTo(0, 0); }
  };
  const crear = () => {
    const e = s.registrarTalento(b);
    setError(e);
    if (!e) navigate(rutaInicial('Talento'), { replace: true });
  };

  return (
    <div className="min-h-screen bg-frost flex flex-col">
      <Barra derecha={<span className="flex items-center gap-2 text-white text-[13px]"><span className="bg-white/15 rounded-full px-2.5 py-0.5 text-[11px]">Registro</span> Nuevo talento</span>} />
      <div className="max-w-[1100px] w-full mx-auto px-4 md:px-10 py-6 flex flex-col gap-5">
        <Pasos pasos={PASOS_TALENTO} actual={vista === 1 ? 2 : 3} />
        {vista === 1 ? (
          <>
            <CamposPersonales b={b} set={set} />
            <CajaError texto={error} />
            <div className="flex items-center justify-between gap-3">
              <Link to="/registro" className="text-[13px] text-blue-link font-medium hover:underline">Volver</Link>
              <Button onClick={continuar}>Continuar</Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
              <Caja titulo="Perfil de creador"><CamposCreador b={b} set={set} /></Caja>
              <Caja titulo="Agencia y condiciones">
                <div className="flex flex-col gap-1">
                  <Select label="Agencia que te representa" value={b.agenciaId} onChange={(e) => set({ agenciaId: e.target.value })}>
                    <option value="">Ninguna · soy independiente</option>
                    {agencias.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </Select>
                  <span className="text-[11.5px] text-ash">{agencia ? 'Tu agencia confirma la representación.' : 'Si te representa una agencia, ella confirma desde su panel.'}</span>
                </div>
                {agencia && (
                  <div className="flex gap-2 border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning">
                    <Clock size={14} className="shrink-0 mt-0.5" /> Pides adelantos cuando el equipo de Influ aprueba tu cuenta y {agencia.nombre} confirma que te representa. Las dos van en paralelo.
                  </div>
                )}
                <label className="flex items-start gap-2.5 text-[13.5px] text-carbon cursor-pointer">
                  <input type="checkbox" className="accent-blue mt-1 w-4 h-4" checked={b.condiciones} onChange={(e) => set({ condiciones: e.target.checked })} />
                  <span>Acepto las condiciones: {COMISION_FIJA * 100}% fijo + {String(TASA_MENSUAL * 100).replace('.', ',')}% mensual</span>
                </label>
                <label className="flex items-start gap-2.5 text-[13.5px] text-carbon cursor-pointer">
                  <input type="checkbox" className="accent-blue mt-1 w-4 h-4" checked={b.privacidad} onChange={(e) => set({ privacidad: e.target.checked })} />
                  <span>Acepto el aviso de privacidad ({VERSION_AVISO_PRIVACIDAD}) <span className="block text-[11.5px] text-ash">Incluye los datos de tu perfil de creador.</span></span>
                </label>
                <CajaError texto={error} />
                <Button onClick={crear}>Crear cuenta</Button>
                <button onClick={() => setVista(1)} className="text-[12.5px] text-blue-link hover:underline">Volver a mis datos</button>
              </Caja>
            </div>
            <div className="text-[12px] text-ash">Al crear la cuenta queda en revisión hasta la aprobación del equipo de Influ. Mientras tanto puedes completar tu perfil, pero no pedir adelantos.</div>
          </>
        )}
      </div>
    </div>
  );
}

const AVISOS: { id: AvisoPago; label: string }[] = [{ id: 'Talento', label: 'Al talento' }, { id: 'Agencia', label: 'A la agencia' }, { id: 'Ambos', label: 'A ambos' }];

function FormaAgencia() {
  const navigate = useNavigate();
  const s = useInflu();
  const [b, setB] = useState<BorradorAgencia>({ nombre: '', razonSocial: '', rfc: '', folioMercantil: '', contacto: '', correo: '', telefono: '', ciudad: '', clabe: '', avisoPago: 'Ambos', condiciones: false, privacidad: false });
  const [error, setError] = useState<string | null>(null);
  const set = (x: Partial<BorradorAgencia>) => setB((o) => ({ ...o, ...x }));
  const crear = () => {
    const e = s.registrarAgencia(b);
    setError(e);
    if (!e) navigate(rutaInicial('Agencia'), { replace: true });
  };
  const listo = [!!b.razonSocial && !!b.rfc && !!b.folioMercantil, !!b.contacto && !!b.correo, b.condiciones, !!b.avisoPago];
  const actual = listo.findIndex((x) => !x);

  return (
    <div className="min-h-screen bg-frost flex flex-col">
      <Barra derecha={<span className="flex items-center gap-2 text-white text-[13px]"><span className="bg-white/15 rounded-full px-2.5 py-0.5 text-[11px]">Registro</span> Nueva agencia</span>} />
      <div className="max-w-[1100px] w-full mx-auto px-4 md:px-10 py-6 flex flex-col gap-5">
        <Pasos pasos={['Empresa', 'Contacto', 'Condiciones', 'Preferencias']} actual={actual === -1 ? 3 : actual} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Caja titulo="Datos de la agencia">
            <Input label="Razón social" isRequired placeholder="Stay On Social, S.A. de C.V." value={b.razonSocial} onChange={(e) => set({ razonSocial: e.target.value })} />
            <Input label="Nombre comercial" placeholder="Como la conocen los talentos" value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="RFC" isRequired placeholder="12 caracteres" value={b.rfc} onChange={(e) => set({ rfc: e.target.value.toUpperCase().slice(0, 12) })} />
              <Input label="Folio mercantil" isRequired placeholder="N-2024011563" value={b.folioMercantil} onChange={(e) => set({ folioMercantil: e.target.value.toUpperCase() })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Etiqueta>Contacto principal *</Etiqueta>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Nombre" value={b.contacto} onChange={(e) => set({ contacto: e.target.value })} />
                <Input placeholder="correo@agencia.mx" type="email" value={b.correo} onChange={(e) => set({ correo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Teléfono" isRequired placeholder="55 0000 0000" value={b.telefono} onChange={(e) => set({ telefono: e.target.value })} />
              <Input label="Ciudad" placeholder="Ciudad de México" value={b.ciudad} onChange={(e) => set({ ciudad: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Input label="CLABE para recibir adelantos" isRequired placeholder="18 dígitos" value={b.clabe} onChange={(e) => set({ clabe: e.target.value.replace(/\D/g, '').slice(0, 18) })} />
              {b.clabe.length === 18 && (clabeValida(b.clabe) ? <Ok>CLABE válida · {bancoDeClabe(b.clabe)}</Ok> : <span className="text-[11.5px] text-danger">El dígito verificador no cuadra.</span>)}
            </div>
            <div className="flex flex-col gap-1.5">
              <Etiqueta>Condiciones pactadas con Influ</Etiqueta>
              <div className="border border-hairline rounded-[8px] px-3 py-2 text-[14px] bg-frost">{COMISION_FIJA * 100}% fijo + {String(TASA_MENSUAL * 100).replace('.', ',')}% mensual · vigentes desde {formatDate(CONDICIONES_DESDE, { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            </div>
          </Caja>
          <Caja titulo="Preferencias">
            <div>
              <div className="text-[13px] font-semibold text-ash">Aviso de pago por WhatsApp</div>
              <div className="text-[13px] text-ash">Cuando se libera un pago, avisamos por WhatsApp a:</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {AVISOS.map((a) => (
                <button key={a.id} type="button" onClick={() => set({ avisoPago: a.id })}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] border ${b.avisoPago === a.id ? 'bg-carbon text-white border-carbon' : 'bg-white text-smoke border-hairline hover:bg-frost'}`}>{a.label}</button>
              ))}
            </div>
            <label className="flex items-start gap-2.5 text-[13px] text-carbon cursor-pointer">
              <input type="checkbox" className="accent-blue mt-0.5 w-4 h-4" checked={b.condiciones} onChange={(e) => set({ condiciones: e.target.checked })} />
              <span>Acepto las condiciones pactadas con Influ para los talentos que represento.</span>
            </label>
            <label className="flex items-start gap-2.5 text-[13px] text-carbon cursor-pointer">
              <input type="checkbox" className="accent-blue mt-0.5 w-4 h-4" checked={b.privacidad} onChange={(e) => set({ privacidad: e.target.checked })} />
              <span>Acepto el aviso de privacidad ({VERSION_AVISO_PRIVACIDAD}).</span>
            </label>
            <CajaError texto={error} />
            <Button onClick={crear}>Guardar y continuar</Button>
            <Link to="/registro" className="text-[12.5px] text-blue-link hover:underline text-center">Volver</Link>
          </Caja>
        </div>
        <div className="text-[12px] text-ash">Al guardar, la cuenta queda en revisión hasta la aprobación del equipo de Influ.</div>
      </div>
    </div>
  );
}
