import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { useVista } from '../store/useInflu';
import { piezasDe, porId, serieVistas, snapshotDia, ultimo } from '../lib/derive';
import { ejeX, ejeY, ejePiezas, tooltipEstilo, TINTA } from '../lib/charts';
import { fechaHora } from '../lib/format';
import { DIAS_METRICAS } from '../data/constantes';

const n = (x: number | undefined) => (x === undefined ? '—' : x.toLocaleString('es-MX'));

// Pantalla 11 (nueva, solo panel interno): métricas al cargar el link, cada 24 h
// por 30 días y fotos oficiales a los 7 y 30 días. Sin conexión a la cuenta solo
// se recolectan las vistas de los Reels (datos públicos del link); las stories no
// reportan vistas.
export const Metricas = () => {
  const [params, setParams] = useSearchParams();
  const v = useVista();
  const conPiezas = v.operaciones.filter((o) => piezasDe(o.id, v.piezas).length).sort((a, b) => b.capturada.localeCompare(a.capturada));
  const op = conPiezas.find((o) => o.id === params.get('id')) ?? conPiezas[0];
  if (!op) return <div className="px-4 md:px-10 py-8"><EmptyState icon={BarChart3} title="Sin métricas todavía" message="Aparecen cuando cargas los links de tus publicaciones en la evidencia de campaña." /></div>;

  const piezas = piezasDe(op.id, v.piezas);
  const serie = serieVistas(piezas);
  const dia = serie.length - 1;
  const d3 = serie[Math.min(3, dia)]?.vistas ?? 0;
  const crec = dia > 3 && d3 ? Math.round(((serie[dia].vistas - d3) / d3) * 100) : null;
  const marca = porId(v.marcas, op.marcaId)?.nombre;
  const reels = piezas.filter((p) => p.formato !== 'Story');
  const stories = piezas.filter((p) => p.formato === 'Story');
  // Sin conexión a la cuenta solo hay vistas de Reels: el total de "Vistas" (y el
  // engagement) se calcula sobre reels, no sobre todas las piezas.
  const vistasReels = reels.reduce((s, p) => s + (ultimo(p)?.vistas ?? 0), 0);
  const likesReels = reels.reduce((s, p) => s + (ultimo(p)?.likes ?? 0), 0);
  const comentariosReels = reels.reduce((s, p) => s + (ultimo(p)?.comentarios ?? 0), 0);
  const engagementReels = vistasReels ? Math.round(((likesReels + comentariosReels) / vistasReels) * 1000) / 10 : 0;
  const fila = (nombre: string, ps: typeof piezas, soloReels = true) => ({
    nombre,
    d1: soloReels ? (ps.reduce((s, p) => s + (snapshotDia(p, 1)?.vistas ?? 0), 0) || undefined) : undefined,
    d7: soloReels && ps.every((p) => snapshotDia(p, 7)) ? ps.reduce((s, p) => s + snapshotDia(p, 7)!.vistas, 0) : undefined,
    d30: soloReels && ps.every((p) => snapshotDia(p, 30)) ? ps.reduce((s, p) => s + snapshotDia(p, 30)!.vistas, 0) : undefined,
  });
  const tabla = [
    ...reels.map((p) => fila(`${p.formato} ${p.indice}${p.red !== 'Instagram' ? ` · ${p.red}` : ''}`, [p])),
    ...(stories.length ? [fila(`Stories (${stories.length})`, stories, false)] : []),
  ];

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1300px] mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[22px] font-semibold text-carbon">Métricas de la campaña</div>
          <div className="text-[13px] text-ash">{marca} · Actualizadas cada 24 h · Día {dia}{dia >= 7 ? ' (foto oficial D7)' : ''}{dia >= DIAS_METRICAS ? ' · seguimiento terminado' : ''}</div>
        </div>
        {conPiezas.length > 1 && (
          <div className="w-[300px]">
            <Select value={op.id} onChange={(e) => setParams({ id: e.target.value })}>
              {conPiezas.map((o) => <option key={o.id} value={o.id}>{`#${o.folio.slice(-4)} · ${porId(v.marcas, o.marcaId)?.nombre}`}</option>)}
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Vistas" value={n(vistasReels)} delta={crec !== null ? `${crec >= 0 ? '+' : ''}${crec}% vs. día 3` : undefined} deltaPositive={(crec ?? 0) >= 0} />
        <KpiCard label="Me gusta" value={n(likesReels)} />
        <KpiCard label="Comentarios" value={n(comentariosReels)} />
        <KpiCard label="Engagement" value={`${String(engagementReels).replace('.', ',')}%`} note="(me gusta + comentarios) / vistas" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-start">
        <Panel title="Vistas acumuladas" subtitle="Un snapshot por día; los snapshots nunca se sobreescriben. La barra oscura es la foto oficial.">
          <div className="border-t border-hairline px-3 py-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie.filter((x) => x.dia >= 1 || serie.length === 1).map((x) => ({ ...x, d: `D${x.dia}` }))} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke={TINTA.rejilla} />
                <XAxis dataKey="d" {...ejeX} />
                <YAxis {...ejeY} tickFormatter={ejePiezas} width={42} />
                <Tooltip {...tooltipEstilo} formatter={(x) => [n(Number(x)), 'Vistas']} />
                <Bar dataKey="vistas" radius={[4, 4, 0, 0]}>
                  {serie.filter((x) => x.dia >= 1 || serie.length === 1).map((x) => <Cell key={x.dia} fill={x.dia === 7 || x.dia === 30 ? '#1d1d1f' : '#0071e3'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Por publicación">
          <div className="border-t border-hairline overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-hairline">{['Pieza', '24 h', '7 d', '30 d'].map((h) => <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium ${h === 'Pieza' ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
              <tbody>
                {tabla.map((f) => (
                  <tr key={f.nombre} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-[13px]">{f.nombre}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums">{n(f.d1)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums">{n(f.d7)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums">{n(f.d30)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 text-[11.5px] text-ash border-t border-hairline">Reels: datos públicos del link · Primera toma {fechaHora(piezas[0]?.snapshots[0]?.fechaHora)} · Última {fechaHora(ultimo(piezas[0])?.fechaHora)}</div>
        </Panel>
      </div>
    </div>
  );
};
