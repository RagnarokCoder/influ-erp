import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Pencil, HandCoins, AlertTriangle } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Fila } from '../components/ui/Fila';
import EmptyState from '../components/ui/EmptyState';
import { estadoPortal } from './Operaciones';
import { useVista } from '../store/useInflu';
import { handlePrincipal, iniciales, nombreMostrar, porId } from '../lib/derive';
import { estadoTalento, toneEstado, aprobadoInflu } from '../lib/talento';
import { estadoTone, fechaHora, formatDate, millones, money } from '../lib/format';
import type { Red, Talento } from '../data/types';

const urlRed: Record<string, (h: string) => string> = {
  Instagram: (h) => `https://instagram.com/${h.replace('@', '')}`,
  TikTok: (h) => `https://tiktok.com/@${h.replace('@', '')}`,
  YouTube: (h) => `https://youtube.com/${h.startsWith('@') ? h : `@${h}`}`,
  X: (h) => `https://x.com/${h.replace('@', '')}`,
  Facebook: (h) => `https://facebook.com/${h.replace('@', '')}`,
};
const enlaceRed = (red: Red, h: string) => (urlRed[red] ?? ((x: string) => `https://${red.toLowerCase()}.com/${x.replace('@', '')}`))(h);

function Avatar({ t }: { t: Talento }) {
  const nombre = nombreMostrar(t);
  if (t.foto) return <img src={`/talentos/${t.foto}`} alt={nombre} className="w-14 h-14 rounded-full object-cover bg-pebble shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  return <span className="w-14 h-14 rounded-full bg-ice text-blue-link text-[18px] font-semibold flex items-center justify-center shrink-0">{iniciales(nombre)}</span>;
}

/** M4 — Perfil del talento visto por la agencia. */
export function TalentoPerfil() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useVista();
  const t = porId(v.talentos, id);

  if (!t) {
    return (
      <div className="px-4 md:px-10 py-8 max-w-[1100px] mx-auto">
        <button onClick={() => nav('/talentos')} className="flex items-center gap-1 text-[12px] text-blue-link hover:underline mb-3"><ArrowLeft size={13} /> Mis talentos</button>
        <EmptyState title="Talento no encontrado" message="Puede que ya no esté en tu roster." />
      </div>
    );
  }

  const estado = estadoTalento(t);
  const faltan = t.rfc === '';
  const aprobado = aprobadoInflu(t);
  const ops = v.operaciones.filter((o) => o.talentoId === t.id).sort((a, b) => b.capturada.localeCompare(a.capturada));
  const nicho = t.nichos.map((n) => (n === 'Otro' ? t.nichoOtro ?? n : n)).join(' · ');
  const pend = (x: string | undefined | '') => (x && x.trim() ? x : 'Pendiente');

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1100px] mx-auto flex flex-col gap-5">
      <button onClick={() => nav('/talentos')} className="flex items-center gap-1 text-[12px] text-blue-link hover:underline"><ArrowLeft size={13} /> Mis talentos</button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar t={t} />
          <div>
            <div className="text-[22px] font-semibold text-carbon">{nombreMostrar(t)}{t.tipo === 'Grupo' && <span className="ml-2 text-[12px] text-mist font-normal">Grupo</span>}</div>
            <div className="text-[13px] text-ash">{handlePrincipal(t)} · {nicho || 'sin nichos'} · Audiencia {millones(t.audienciaTotal)}</div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge tone={toneEstado(estado)}>{estado}</Badge>
              {t.handles.map((h) => <Badge key={h.red + h.usuario} tone="neutral">{h.red} · {millones(h.seguidores)}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav('/talentos/nuevo')}><Pencil size={14} /> Editar</Button>
          <Button disabled={!aprobado} title={aprobado ? undefined : 'Disponible cuando Influ aprueba al talento'} onClick={() => nav(`/pedir-adelanto?talento=${t.id}`)}><HandCoins size={15} /> Pedir adelanto</Button>
        </div>
      </div>

      {faltan && (
        <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
          <span className="flex items-start gap-2 text-[13px] text-warning"><AlertTriangle size={16} className="shrink-0 mt-px" /> Faltan los datos fiscales de {nombreMostrar(t)}. Sin ellos no se puede pedir un adelanto.</span>
          <Button size="sm" onClick={() => nav('/talentos/nuevo')}>Completar datos</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Redes sociales">
          <div className="border-t border-hairline overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-hairline bg-frost/60">{['Red', 'Handle', 'Seguidores', 'Perfil'].map((h) => <th key={h} className="px-4 py-2 text-left text-[12px] text-ash font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {t.handles.map((h) => (
                  <tr key={h.red + h.usuario} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2 text-[13px] text-carbon">{h.red}</td>
                    <td className="px-4 py-2 text-[13px]">{h.usuario}</td>
                    <td className="px-4 py-2 text-[13px] tabular-nums">{millones(h.seguidores)}</td>
                    <td className="px-4 py-2"><a href={enlaceRed(h.red, h.usuario)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-blue-link hover:underline">Abrir <ExternalLink size={12} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-[11px] text-mist border-t border-hairline">Fuente: proveedor de datos públicos · actualizado {formatDate('2026-10-25')}</div>
        </Panel>

        <Panel title="Datos fiscales" right={faltan ? <Badge tone="warning">Faltan datos fiscales</Badge> : <Badge tone={toneEstado(estado)}>{estado}</Badge>}>
          <div className="border-t border-hairline px-5 py-1">
            <Fila t="Nombre legal" v={pend(t.nombre)} />
            <Fila t="Tipo" v={t.tipo ?? 'Persona física'} />
            <Fila t="RFC" v={pend(t.rfc)} />
            <Fila t="CURP" v={pend(t.curp)} />
            <Fila t="Régimen fiscal" v={faltan ? 'Pendiente' : t.regimenFiscal} />
            <Fila t="Fecha de nacimiento" v={t.fechaNacimiento ? formatDate(t.fechaNacimiento) : 'Pendiente'} nota={t.nacimientoPorRevisar ? 'RFC y CURP no coinciden' : undefined} />
            {t.resoluciones.length > 0 && <Fila t="Resolución" v={`${t.resoluciones[t.resoluciones.length - 1].decision} · ${t.resoluciones[t.resoluciones.length - 1].usuario}`} nota={fechaHora(t.resoluciones[t.resoluciones.length - 1].fechaHora)} />}
          </div>
        </Panel>

        <Panel title="Perfil de contenido">
          <div className="border-t border-hairline px-5 py-1">
            <Fila t="Nichos" v={nicho || 'Pendiente'} />
            <Fila t="Tipo de contenido" v={t.tiposContenido.join(' · ') || 'Pendiente'} />
            <Fila t="Ciudad" v={`${t.ubicacion.ciudad}, ${t.ubicacion.estado}`} />
            <Fila t="Género" v={t.genero} />
            <Fila t="Teléfono" v={pend(t.telefono)} />
            <Fila t="Correo" v={pend(t.correo)} />
          </div>
        </Panel>

        <Panel title={`Adelantos (${ops.length})`}>
          <div className="border-t border-hairline">
            {ops.length === 0 && <div className="px-5 py-8"><EmptyState title="Sin adelantos" message={aprobado ? 'Pide el primer adelanto cuando tengas una factura.' : 'Disponible cuando Influ apruebe al talento.'} /></div>}
            {ops.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-hairline last:border-0">
                <div className="min-w-0">
                  <div className="text-[13.5px] text-carbon">{o.folio} · {porId(v.marcas, o.marcaId)?.nombre}</div>
                  <div className="text-[11.5px] text-mist">{money(o.monto)} · {formatDate(o.capturada.slice(0, 10))}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={estadoTone(o.estatus)}>{estadoPortal(o)}</Badge>
                  <Button size="sm" variant="outlined" onClick={() => nav(`/operaciones?id=${o.id}`)}>Ver expediente</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
