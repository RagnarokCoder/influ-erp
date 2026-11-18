import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Chips } from '../components/ui/Fila';
import { NICHOS, TIPOS_CONTENIDO, REDES, REGIMENES, GENEROS } from '../data/constantes';
import { useInflu } from '../store/useInflu';
import type { BorradorTalentoAgencia } from '../store/useInflu';
import type { Genero, Handle, Nicho, RegimenFiscal, TipoContenido } from '../data/types';

type FilaRed = { red: Handle['red']; usuario: string; seguidores: number };

const PASOS = [
  { t: 'Cargas los datos fiscales', d: 'Nombre legal, RFC, CURP y régimen del talento o grupo.' },
  { t: 'Chequeos automáticos', d: 'RFC y CURP coinciden, RFC no en la lista 69-B, régimen válido y handles encontrados.' },
  { t: 'Aprobación del equipo Influ', d: 'El equipo preaprueba la cuenta del talento.' },
  { t: 'Listo para pedir adelantos', d: 'El talento aprobado ya puede recibir adelantos.' },
];

/** M5 — Alta de talento desde el panel de agencia. Sin CLABE ni contrato: los pagos van a la agencia. */
export function TalentoAlta() {
  const nav = useNavigate();
  const agregar = useInflu((s) => s.agregarTalento);
  const toast = useInflu((s) => s.toast);

  const [nombreArtistico, setNombreArtistico] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'Persona física' | 'Grupo'>('Persona física');
  const [rfc, setRfc] = useState('');
  const [curp, setCurp] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState<RegimenFiscal | ''>('');
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [nichoOtro, setNichoOtro] = useState('');
  const [tiposContenido, setTiposContenido] = useState<TipoContenido[]>([]);
  const [contenidoOtro, setContenidoOtro] = useState('');
  const [ciudad, setCiudad] = useState('CDMX');
  const [genero, setGenero] = useState<Genero | ''>('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [foto, setFoto] = useState('');
  const [handles, setHandles] = useState<FilaRed[]>([{ red: 'Instagram', usuario: '', seguidores: 0 }]);

  const setHandle = (i: number, campo: keyof FilaRed, valor: string) =>
    setHandles((hs) => hs.map((h, j) => (j === i ? { ...h, [campo]: campo === 'seguidores' ? Number(valor.replace(/\D/g, '')) || 0 : valor } : h)));

  const guardar = () => {
    const b: BorradorTalentoAgencia = {
      nombreArtistico, nombre, tipo, correo, telefono, rfc, curp, regimenFiscal,
      handles, nichos, nichoOtro, tiposContenido, contenidoOtro, ciudad, genero, foto,
    };
    const err = agregar(b);
    if (err) { toast(err, 'error'); return; }
    nav('/talentos');
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1100px] mx-auto flex flex-col gap-5">
      <div>
        <button onClick={() => nav('/talentos')} className="flex items-center gap-1 text-[12px] text-blue-link hover:underline mb-1"><ArrowLeft size={13} /> Mis talentos</button>
        <div className="text-[22px] font-semibold text-carbon">Agregar talento</div>
        <div className="text-[13px] text-ash">Lo sumas a tu roster y Influ lo revisa. Los pagos de sus adelantos llegan a tu agencia.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Panel title="Identidad">
            <div className="border-t border-hairline p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre artístico" isRequired value={nombreArtistico} onChange={(e) => setNombreArtistico(e.target.value)} placeholder="Como aparece en redes" />
              <Input label="Nombre legal" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Opcional por ahora" />
              <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="Persona física">Persona física</option>
                <option value="Grupo">Grupo</option>
              </Select>
            </div>
          </Panel>

          <Panel title="Redes" right={<Button size="sm" variant="ghost" onClick={() => setHandles((hs) => [...hs, { red: 'TikTok', usuario: '', seguidores: 0 }])}><Plus size={13} /> Agregar otra red</Button>}>
            <div className="border-t border-hairline p-5 flex flex-col gap-3">
              {handles.map((h, i) => (
                <div key={i} className="flex items-end gap-2 flex-wrap">
                  <div className="w-[150px]">
                    <Select label={i === 0 ? 'Red' : undefined} value={h.red} onChange={(e) => setHandle(i, 'red', e.target.value)}>
                      {REDES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[160px]"><Input label={i === 0 ? 'Handle' : undefined} value={h.usuario} onChange={(e) => setHandle(i, 'usuario', e.target.value)} placeholder="@usuario" /></div>
                  <div className="w-[140px]"><Input label={i === 0 ? 'Seguidores' : undefined} value={h.seguidores ? h.seguidores.toLocaleString('es-MX') : ''} onChange={(e) => setHandle(i, 'seguidores', e.target.value)} placeholder="0" /></div>
                  {handles.length > 1 && <Button size="sm" variant="ghost" onClick={() => setHandles((hs) => hs.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Datos fiscales">
            <div className="border-t border-hairline p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="RFC" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} placeholder="13 caracteres" />
              <Input label="CURP" value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())} placeholder="18 caracteres" />
              <div className="md:col-span-2">
                <Select label="Régimen fiscal" value={regimenFiscal} onChange={(e) => setRegimenFiscal(e.target.value as RegimenFiscal)}>
                  <option value="">Selecciona…</option>
                  {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
            </div>
          </Panel>

          <Panel title="Perfil de contenido">
            <div className="border-t border-hairline p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium text-ash">Nichos</span>
                <Chips opciones={NICHOS} valor={nichos} onChange={setNichos} />
                {nichos.includes('Otro') && <Input value={nichoOtro} onChange={(e) => setNichoOtro(e.target.value)} placeholder="¿Cuál otro nicho?" />}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium text-ash">Tipo de contenido</span>
                <Chips opciones={TIPOS_CONTENIDO} valor={tiposContenido} onChange={setTiposContenido} />
                {tiposContenido.includes('Otro') && <Input value={contenidoOtro} onChange={(e) => setContenidoOtro(e.target.value)} placeholder="¿Qué otro contenido?" />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
                <Select label="Género" value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
                  <option value="">Selecciona…</option>
                  {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
                <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="10 dígitos" />
                <Input label="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
            </div>
          </Panel>

          <Panel title="Foto">
            <div className="border-t border-hairline p-5">
              <Input label="Archivo de foto" value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="talento.jpg (JPG o PNG)" />
            </div>
          </Panel>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => nav('/talentos')}>Cancelar</Button>
            <Button onClick={guardar}>Guardar y enviar a revisión</Button>
          </div>
        </div>

        <Panel title="Qué pasa después" className="lg:sticky lg:top-4">
          <div className="border-t border-hairline p-5 flex flex-col gap-4">
            {PASOS.map((p, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-ice text-blue-link text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <span><span className="block text-[13px] font-medium text-carbon">{p.t}</span><span className="block text-[11.5px] text-ash">{p.d}</span></span>
              </div>
            ))}
            <div className="text-[11.5px] text-mist border-t border-hairline pt-3">Sin CLABE del talento, sin contrato de representación y sin consentimiento de datos: los pagos van a tu agencia.</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
