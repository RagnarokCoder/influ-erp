import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Building2, AlertTriangle, Coins, Users, Download, Plus, Search } from 'lucide-react';
import DataModule, { Relacion, RenglonRelacion } from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import KpiCard from '../components/ui/KpiCard';
import EmptyState from '../components/ui/EmptyState';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { ciudadDe, cxcDe, estatusCxC, handlePrincipal, iniciales, nombreMostrar, porId, saldoCxC, seguidores, suma } from '../lib/derive';
import { fechaHora, formatDate, millones, money } from '../lib/format';
import { estadoTalento, toneEstado } from '../lib/talento';
import type { Red, Talento } from '../data/types';

type FilaT = Talento & { adelantado: number; handle: string; nicho: string };
const ESTATUS = ['Activo', 'Suspendido'] as const;

// clientes.md con sus adaptables: Contacto → Handle, Prioridad → Agencia,
// Días de crédito → Nichos, Anticipo → CLABE, Saldo → Adelantado vigente.
// El talento nace con su registro: sin "Nuevo".
const cols: Col<FilaT>[] = [
  {
    key: 'nombre', label: 'Talento',
    render: (t) => <span><span className="text-carbon">{nombreMostrar(t)}</span><span className="block text-[11px] text-ash">{t.handle} · {ciudadDe(t)}</span></span>,
  },
  { key: 'rfc', label: 'RFC', mono: true },
  { key: 'telefono', label: 'Teléfono', ayuda: 'También es su WhatsApp: ahí le avisamos cuando se envía un pago.' },
  { key: 'correo', label: 'Correo' },
  { key: 'nicho', label: 'Nichos', fueraDeForma: true },
  {
    key: 'agenciaId', label: 'Agencia', tipo: 'catalog', catalogo: 'agencias', fueraDeForma: true,
    render: (t) => t.agenciaId ? <span>{useInflu.getState().agencias.find((a) => a.id === t.agenciaId)?.nombre}{t.representacion === 'Pendiente' && <span className="text-warning font-medium"> · por confirmar</span>}</span> : <span className="text-mist">Independiente</span>,
  },
  { key: 'cuenta', label: 'Cuenta', fueraDeForma: true, render: (t) => <Badge tone={t.cuenta === 'Preaprobada' ? 'success' : t.cuenta === 'En revisión' ? 'warning' : 'danger'}>{t.cuenta}</Badge> },
  { key: 'clabe', label: 'CLABE', mono: true, ayuda: '18 dígitos; el banco sale de los tres primeros.' },
  { key: 'adelantado', label: 'Adelantado vigente', tipo: 'money', fueraDeForma: true },
  { key: 'estatus', label: 'Estatus', tipo: 'select', opciones: ESTATUS },
];

export const Talentos = () => {
  const rol = useInflu(rolActual);
  return rol === 'Agencia' ? <MisTalentos /> : <Catalogo />;
};

function Catalogo() {
  const [params] = useSearchParams();
  const v = useVista();
  const rol = useInflu(rolActual);
  const vigentes = (id: string) => v.operaciones.filter((o) => o.talentoId === id && ['Activa', 'Por liquidar'].includes(o.estatus));
  const filas: FilaT[] = v.talentos
    .map((t) => ({ ...t, adelantado: suma(vigentes(t.id).map((o) => o.adelanto?.monto ?? 0)), handle: handlePrincipal(t), nicho: t.nichos.map((n) => (n === 'Otro' ? t.nichoOtro ?? n : n)).join(', ') }))
    .sort((a, b) => nombreMostrar(a).localeCompare(nombreMostrar(b)));
  const conAgencia = filas.filter((t) => t.representacion === 'Confirmada');
  const vencidas = v.cxc.filter((c) => estatusCxC(c) === 'Vencido');
  const conVencida = filas.filter((t) => vencidas.some((c) => porId(v.operaciones, c.operacionId)?.talentoId === t.id));
  const agencias = [...new Set(conAgencia.map((t) => porId(v.agencias, t.agenciaId)?.nombre))];

  return (
    <DataModule<FilaT>
      coleccion="talentos" rows={filas} cols={cols} estatuses={ESTATUS} nombreSingular="talento" sinAlta sinBaja
      sinEdicion={!autoriza.catalogo(rol)} busquedaInicial={params.get('q') ?? ''}
      titulo="Catálogo de talentos"
      subtitulo="Perfil de creador, datos fiscales, CLABE y agencia de cada talento. Nace con su registro y se aprueba en Registros."
      kpis={[
        { label: 'Talentos', value: String(filas.length), note: `${filas.filter((t) => t.cuenta === 'Preaprobada').length} aprobados`, icon: Sparkles },
        { label: 'Con agencia', value: String(conAgencia.length), note: agencias.join(', ') || 'todos independientes', icon: Building2 },
        { label: 'Con factura vencida', value: String(conVencida.length), note: money(suma(vencidas.filter((c) => conVencida.some((t) => porId(v.operaciones, c.operacionId)?.talentoId === t.id)).map(saldoCxC))), icon: AlertTriangle },
        { label: 'Adelantado vigente', value: money(suma(filas.map((t) => t.adelantado))), note: 'la marca no ha liquidado', icon: Coins, importe: true },
      ]}
      detalle={(t) => {
        const ops = v.operaciones.filter((o) => o.talentoId === t.id).sort((a, b) => b.capturada.localeCompare(a.capturada));
        const abiertas = v.cxc.filter((c) => porId(v.operaciones, c.operacionId)?.talentoId === t.id && estatusCxC(c) !== 'Pagado');
        return (
          <>
            <Relacion titulo="Perfil de creador">
              {t.handles.map((h) => <RenglonRelacion key={h.red} titulo={`${h.red} · ${h.usuario}`} detalle={h.encontrada ? 'cuenta encontrada' : 'no encontrada'} valor={seguidores(h.seguidores)} />)}
              <RenglonRelacion titulo="Nichos" detalle={t.nicho} />
              <RenglonRelacion titulo="Contenido" detalle={t.tiposContenido.join(', ')} />
              <RenglonRelacion titulo="Crea desde" detalle={`${t.ubicacion.ciudad}, ${t.ubicacion.estado}, ${t.ubicacion.pais}`} />
              <RenglonRelacion titulo="Nacimiento (del RFC) · género" detalle={`${formatDate(t.fechaNacimiento)}${t.nacimientoPorRevisar ? ' · RFC y CURP no coinciden' : ''} · ${t.genero}`} />
              <RenglonRelacion titulo="Representación" detalle={t.confirmada ? `confirmada el ${fechaHora(t.confirmada)}` : t.representacion === 'Pendiente' ? 'esperando a la agencia' : 'opera sin agencia'} valor={t.representacion} tone={t.representacion} />
            </Relacion>
            <Relacion titulo="Historial de campañas y adelantos">
              {ops.length === 0 && <RenglonRelacion titulo="Sin solicitudes todavía" />}
              {ops.map((o) => <RenglonRelacion key={o.id} titulo={`${o.folio} · ${porId(v.marcas, o.marcaId)?.nombre}`} detalle={`${money(o.monto)} · ${formatDate(o.capturada.slice(0, 10))}`} valor={o.estatus} tone={o.estatus} />)}
            </Relacion>
            <Relacion titulo="Por cobrar a marcas">
              {abiertas.length === 0 && <RenglonRelacion titulo="Sin facturas abiertas" />}
              {abiertas.map((c) => <RenglonRelacion key={c.id} titulo={`${c.documento} · ${porId(v.marcas, c.marcaId)?.nombre}`} detalle={`vence ${formatDate(c.vencimiento)}${estatusCxC(c) === 'Vencido' ? ' · vencida' : ''}`} valor={money(saldoCxC(cxcDe(c.operacionId, v.cxc)!))} />)}
            </Relacion>
          </>
        );
      }}
    />
  );
}


// ---------------------------------------------------------------------------
// M3 — "Mis talentos": dashboard del roster completo de la agencia.
// ---------------------------------------------------------------------------

type Filtro = 'Todos' | 'Aprobados' | 'Faltan datos fiscales' | 'Con adelantos';
const REDES_COL: { red: Red; label: string }[] = [
  { red: 'Instagram', label: 'Instagram' }, { red: 'TikTok', label: 'TikTok' }, { red: 'YouTube', label: 'YouTube' },
];

/** Foto del talento o un avatar con sus iniciales. */
function Avatar({ t }: { t: Talento }) {
  const nombre = nombreMostrar(t);
  if (t.foto) return <img src={`/talentos/${t.foto}`} alt={nombre} className="w-9 h-9 rounded-full object-cover bg-pebble shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  return <span className="w-9 h-9 rounded-full bg-ice text-blue-link text-[12px] font-semibold flex items-center justify-center shrink-0">{iniciales(nombre)}</span>;
}

function CeldaRed({ t, red }: { t: Talento; red: Red | 'Otras' }) {
  const hs = red === 'Otras' ? t.handles.filter((h) => !['Instagram', 'TikTok', 'YouTube'].includes(h.red)) : t.handles.filter((h) => h.red === red);
  if (!hs.length) return <span className="text-mist">—</span>;
  return (
    <span className="block">
      {hs.map((h) => (
        <span key={h.red + h.usuario} className="block leading-tight">
          <span className="text-[12.5px] text-carbon">{millones(h.seguidores)}</span>
          <span className="block text-[10.5px] text-mist truncate max-w-[120px]">{red === 'Otras' ? `${h.red} · ` : ''}{h.usuario}</span>
        </span>
      ))}
    </span>
  );
}

function MisTalentos() {
  const nav = useNavigate();
  const v = useVista();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const conAdelanto = (id: string) => v.operaciones.some((o) => o.talentoId === id);
  const roster = v.talentos.filter((t) => t.representacion === 'Confirmada');
  const aprobados = roster.filter((t) => t.cuenta === 'Preaprobada');
  const conAdel = roster.filter((t) => conAdelanto(t.id));

  const filas = useMemo(() => {
    const txt = q.trim().toLowerCase();
    return roster
      .filter((t) => {
        if (filtro === 'Aprobados' && t.cuenta !== 'Preaprobada') return false;
        if (filtro === 'Faltan datos fiscales' && t.rfc !== '') return false;
        if (filtro === 'Con adelantos' && !conAdelanto(t.id)) return false;
        if (!txt) return true;
        return nombreMostrar(t).toLowerCase().includes(txt) || t.handles.some((h) => h.usuario.toLowerCase().includes(txt));
      })
      .sort((a, b) => (b.audienciaTotal ?? 0) - (a.audienciaTotal ?? 0))
      .slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, q, filtro]);

  const exportar = () => {
    const cab = ['Talento', 'Handle principal', 'Audiencia', 'Estado', 'Adelantos'];
    const lineas = roster.map((t) => [nombreMostrar(t), handlePrincipal(t), String(t.audienciaTotal ?? 0), estadoTalento(t), String(v.operaciones.filter((o) => o.talentoId === t.id).length)]);
    const csv = [cab, ...lineas].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = 'mis-talentos.csv'; a.click(); URL.revokeObjectURL(url);
      useInflu.getState().toast('Roster exportado a CSV.');
    } catch { useInflu.getState().toast('No se pudo exportar.', 'error'); }
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1280px] mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[22px] font-semibold text-carbon">Mis talentos</div>
          <div className="text-[13px] text-ash">Tu roster completo: redes, audiencia, estado de aprobación y adelantos.</div>
        </div>
        <Button onClick={() => nav('/talentos/nuevo')}><Plus size={15} /> Agregar talento</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Talentos" value={String(roster.length)} note={`${aprobados.length} aprobados por Influ`} icon={Users} />
        <KpiCard label="Audiencia combinada" value={millones(suma(roster.map((t) => t.audienciaTotal ?? 0)))} note="suma de audiencia reportada" icon={Sparkles} />
        <KpiCard label="Aprobados por Influ" value={`${aprobados.length} de ${roster.length}`} note="pueden pedir adelantos" icon={Building2} />
        <KpiCard label="Con adelantos" value={String(conAdel.length)} note="tienen al menos una operación" icon={Coins} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o handle…" className="pl-9 w-full" />
        </div>
        <div className="w-[200px]">
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
            {(['Todos', 'Aprobados', 'Faltan datos fiscales', 'Con adelantos'] as Filtro[]).map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>
        <Button variant="ghost" onClick={exportar}><Download size={14} /> Exportar</Button>
      </div>

      <div className="bg-white border border-hairline rounded-[8px] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hairline bg-frost/60">
              {['Talento', 'Instagram', 'TikTok', 'YouTube', 'Otras redes', 'Audiencia', 'Estado', 'Adelantos', ''].map((h, i) => (
                <th key={h || i} className="px-3 py-2.5 text-left text-[12px] text-ash font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={9}><EmptyState icon={Sparkles} title="Sin talentos" message="Ajusta la búsqueda o el filtro, o agrega un talento nuevo." /></td></tr>}
            {filas.map((t) => {
              const estado = estadoTalento(t);
              const ops = v.operaciones.filter((o) => o.talentoId === t.id).length;
              const aprobado = t.cuenta === 'Preaprobada';
              return (
                <tr key={t.id} className="border-b border-hairline last:border-0 hover:bg-haze cursor-pointer align-top" onClick={() => nav(`/talentos/${t.id}`)}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar t={t} />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] text-carbon truncate">{nombreMostrar(t)}{t.tipo === 'Grupo' && <span className="ml-1 text-[10.5px] text-mist">Grupo</span>}</span>
                        <span className="block text-[11px] text-mist truncate">{handlePrincipal(t)}</span>
                      </span>
                    </div>
                  </td>
                  {REDES_COL.map((c) => <td key={c.red} className="px-3 py-2.5"><CeldaRed t={t} red={c.red} /></td>)}
                  <td className="px-3 py-2.5"><CeldaRed t={t} red="Otras" /></td>
                  <td className="px-3 py-2.5 text-[13px] text-carbon tabular-nums whitespace-nowrap">{millones(t.audienciaTotal)}</td>
                  <td className="px-3 py-2.5"><Badge tone={toneEstado(estado)}>{estado}</Badge></td>
                  <td className="px-3 py-2.5 text-[13px] tabular-nums">{ops || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      {aprobado
                        ? <Button size="sm" onClick={() => nav(`/pedir-adelanto?talento=${t.id}`)}>Pedir adelanto</Button>
                        : <Button size="sm" variant="outlined" onClick={() => nav(`/talentos/${t.id}`)}>Completar datos</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11.5px] text-mist text-right">{filas.length} de {roster.length} talentos · página 1</div>
    </div>
  );
}
