import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, ReferenceLine,
  LineChart, Line, PieChart, Pie,
} from 'recharts';
import { HandCoins, Timer, Coins, Clock, BadgeCheck, Landmark, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { adelantosMensuales } from '../data/seed';
import { ahora, diffDays, money, num, pct } from '../lib/format';
import { CATEGORICA, SECUENCIAL_AZUL, ESTADO, TINTA, PROYECCION, ejeX, ejeY, tooltipEstilo, ejeMoneda } from '../lib/charts';
import {
  alertas, bandas, criteriosPiloto, historialMarca, exposicion, horasCobro, inicioDeMes,
  porId, suma, vencimientoOp,
} from '../lib/derive';
import { puedeVer } from '../lib/permisos';
import { HOY_ISO, LIMITE_CONCENTRACION, MESES, META_HORAS_COBRO, d } from '../data/constantes';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';

/** Leyenda en HTML: el orden es el de las series, no el que decida la librería. */
const Leyenda = ({ series }: { series: { nombre: string; color: string }[] }) => (
  <div className="px-5 pb-4 -mt-1 flex items-center justify-center gap-4 flex-wrap">
    {series.map((s) => (
      <span key={s.nombre} className="flex items-center gap-1.5 text-[11px] text-ash">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
        {s.nombre}
      </span>
    ))}
  </div>
);

const Dona = ({ datos, centro, pie, formato }: { datos: { nombre: string; valor: number; color: string }[]; centro: string; pie: string; formato?: (v: number) => string }) => (
  <>
    <div className="relative h-[170px] px-4 pt-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius="66%" outerRadius="92%" startAngle={90} endAngle={-270} stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
            {datos.map((x) => <Cell key={x.nombre} fill={x.color} />)}
          </Pie>
          <Tooltip {...tooltipEstilo} formatter={(v) => (formato ? formato(Number(v)) : num(Number(v)))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[22px] font-semibold tracking-[-0.5px] text-carbon tabular-nums">{centro}</span>
        <span className="text-[11px] text-ash">{pie}</span>
      </div>
    </div>
    <Leyenda series={datos.map((x) => ({ nombre: x.nombre, color: x.color }))} />
  </>
);

const Grafica = ({ alto = 220, children }: { alto?: number; children: React.ReactElement }) => (
  <div className="px-4 pb-4 pt-1" style={{ height: alto }}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
);

const SinDatos = ({ texto, alto = 220 }: { texto: string; alto?: number }) => (
  <div className="flex items-center justify-center text-[12px] text-mist" style={{ height: alto }}>{texto}</div>
);

const Separador = () => <div className="border-t border-hairline" />;

/** Nombre corto único para el eje: "El Palacio de Hierro" → "Palacio". */
const corto = (n: string) => { const p = n.split(' ').filter((x) => !['El', 'La', 'Los', 'Grupo'].includes(x)); return p[0] ?? n; };

/** Índice del último mes con dato real (antes del primer mes proyectado). */
const serie0IdxUltimoReal = (serie: { proyeccion?: boolean }[]) => {
  const primera = serie.findIndex((m) => m.proyeccion);
  return primera === -1 ? serie.length - 1 : primera - 1;
};

// dashboard.md: 4 filas fijas; los indicadores salen de la tabla de
// equivalencias (ANALISIS.md §g).
export const Tablero = () => {
  const navigate = useNavigate();
  const v = useVista();
  const rol = useInflu(rolActual);

  const anio = Number(HOY_ISO.slice(0, 4));
  const mesIdx = Number(HOY_ISO.slice(5, 7)) - 1;
  const mes = MESES[mesIdx];
  const mesCorto = `${mes.toLowerCase()}.`;
  const inicio = inicioDeMes();

  // --- KPI 1 y fila 3: proyección de colocación línea Kapital (demo cambio 14).
  // El mes en curso (oct.) ya es un valor fijo de proyección en adelantosMensuales
  // (14 ops · $1,400,000), no se deriva de las operaciones del sistema.
  const delMes = v.operaciones.filter((o) => o.adelanto && o.adelanto.fechaHora.slice(0, 10) >= inicio);
  const filaMes = adelantosMensuales.find((m) => m.mes === mes);
  const adelantadoMes = filaMes?.imp2026 ?? suma(delMes.map((o) => o.adelanto!.monto)); // demo: proyección cambio 14
  const opsMes = filaMes?.ops2026 ?? delMes.length;                                      // demo: proyección cambio 14
  // La serie incluye los meses proyectados (nov., dic. y ene. '27). Para distinguir
  // la proyección, se parte el dato de 2026 en tramo real y tramo proyectado: el
  // real llega hasta el último mes observado y el proyectado se conecta a él.
  const idxUltimoReal = serie0IdxUltimoReal(adelantosMensuales);
  const serie = adelantosMensuales.map((m, i) => ({
    ...m,
    ops2026real: m.proyeccion ? null : m.ops2026,
    ops2026proy: m.proyeccion || i === idxUltimoReal ? m.ops2026 : null,
    imp2026real: m.proyeccion ? null : m.imp2026,
    imp2026proy: m.proyeccion || i === idxUltimoReal ? m.imp2026 : null,
  }));
  // demo: proyección cambio 14b · 50 operaciones · $4,990,000 en los primeros 3 meses (33% de la línea de $15M).
  const volumenAdelantado = 4_990_000;
  const opsVolumen = 50;
  const saldoLinea = 5_000_000;

  // --- KPI 2 y 5, dona 1: cómo pagan las marcas.
  // demo: proyección cambio 14e · 85% (34 de 40 facturas, 90 días); 47 d reales dentro del plazo pactado de 49 d.
  const aTiempo = 34;
  const totalPagadas = 40;
  const conAtraso = totalPagadas - aTiempo;
  const cumplimiento = 85;
  const promReal = 47;
  const promPlazo = 49;

  // --- KPI 3: comisión por operación liquidada en 90 días
  const liquidadas = v.cxp.filter((p) => p.pago && p.pago.fecha >= d(-90));
  const comisionProm = liquidadas.length ? suma(liquidadas.map((p) => p.pago!.fijo + p.pago!.variable)) / liquidadas.length : null;

  // --- KPI 4 y fila 4: tiempo de cobro (captura → adelanto), 60 días
  const recientes = v.operaciones.filter((o) => o.adelanto && o.adelanto.fechaHora >= `${d(-60)}T00:00`)
    .sort((a, b) => a.adelanto!.fechaHora.localeCompare(b.adelanto!.fechaHora));
  const horas = recientes.map((o) => horasCobro(o)!);
  const promHoras = horas.length ? suma(horas) / horas.length : null;
  const porOperacion = recientes.map((o) => ({ folio: o.folio.replace('INF-', ''), horas: Math.round(horasCobro(o)!), alta: horasCobro(o)! > META_HORAS_COBRO, marca: porId(v.marcas, o.marcaId)?.nombre }));

  // --- KPI 6 y dona 2
  // demo: proyección cambio 14f · cartera con menos volumen: por cobrar $6,200,000,
  // vencido ~2% ($110,000 en 1 factura, vencida 2 días); el resto es saldo vigente.
  const bancos = suma(v.cuentas.map((c) => c.saldo));
  const porCobrar = 6_200_000;
  const vencido = 110_000;
  const vigente = porCobrar - vencido;
  const cobranza = porCobrar; // bancos + cobranza refleja el saldo por cobrar proyectado

  // --- Fila 4
  const expo = exposicion(v.cxc, v.marcas).slice(0, 8).map((x) => ({ ...x, marca: corto(x.marca) }));
  const activas = v.operaciones.filter((o) => o.estatus === 'Activa')
    .sort((a, b) => vencimientoOp(a).localeCompare(vencimientoOp(b)))
    .map((o) => {
      const venc = vencimientoOp(o);
      const desde = o.adelanto!.fechaHora.slice(0, 10);
      const porVencer = Math.max(0, diffDays(HOY_ISO, venc));
      return { folio: o.folio.replace('INF-', ''), Transcurridos: Math.max(0, diffDays(desde, HOY_ISO)), 'Por vencer': porVencer, marca: porId(v.marcas, o.marcaId)?.nombre };
    });
  // demo: proyección cambio 14f · con la cartera sana solo quedan tramos Corriente y 1 a 30 días.
  const antiguedad = v.marcas.map((m) => {
    const b = bandas(v.cxc.filter((c) => c.marcaId === m.id));
    return { marca: corto(m.nombre), Corriente: Math.round(b.corriente + b.d31a60 + b.mas60), '1 a 30': Math.round(b.d1a30), '31 a 60': 0, 'Más de 60': 0 };
  }).filter((x) => x.Corriente + x['1 a 30'] + x['31 a 60'] + x['Más de 60'] > 0)
    .sort((a, b) => (b.Corriente + b['1 a 30'] + b['31 a 60'] + b['Más de 60']) - (a.Corriente + a['1 a 30'] + a['31 a 60'] + a['Más de 60']));

  const avisos = alertas(v, ahora().fechaHora).filter((a) => puedeVer(rol, a.ruta));

  // --- Criterios de éxito del piloto (día 90), MVP Fase 1 §14
  const todos = useInflu((s) => s.talentos);
  const piloto = criteriosPiloto(v, todos, ahora().fechaHora);
  const porMarca = v.marcas.map((m) => ({ m, h: historialMarca(m.id, v) })).filter((x) => x.h.real !== null).sort((a, b) => (b.h.real ?? 0) - (a.h.real ?? 0)).slice(0, 4);
  const criterio = (t: string, valor: string, nota: string) => (
    <div className="flex flex-col gap-0.5 px-4 py-3 border-r border-b border-hairline last:border-r-0">
      <span className="text-[11px] text-ash leading-tight">{t}</span>
      <span className="text-[18px] font-semibold tabular-nums text-carbon">{valor}</span>
      <span className="text-[10.5px] text-mist leading-tight">{nota}</span>
    </div>
  );

  return (
    <div className="px-4 md:px-8 py-5 max-w-[1600px] mx-auto flex flex-col gap-5">
      {/* Fila 1 · KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard compacto label={`Adelantado en ${mesCorto}`} value={money(adelantadoMes)} note={`${opsMes} operaci${opsMes === 1 ? 'ón' : 'ones'}`} icon={HandCoins} />
        <KpiCard compacto label="Días reales de pago" value={`${promReal} d`}
          delta={promReal > promPlazo ? 'sobre plazo' : 'dentro del plazo'} deltaPositive={promReal <= promPlazo}
          note={`pactado ${promPlazo} d`} icon={Timer} />
        <KpiCard compacto label="Comisión por operación" value={comisionProm === null ? '—' : money(comisionProm)} note={`${liquidadas.length} liquidadas, 90 días`} icon={Coins} />
        <KpiCard compacto label="Tiempo de cobro" value={promHoras === null ? '—' : `${num(promHoras, 1)} h`}
          delta={promHoras === null ? undefined : promHoras > META_HORAS_COBRO ? 'sobre meta' : 'en meta'} deltaPositive={promHoras !== null && promHoras <= META_HORAS_COBRO}
          note={`meta ${META_HORAS_COBRO} h`} icon={Clock} />
        <KpiCard compacto label="Marcas a tiempo" value={pct(cumplimiento, 0)} note={`${aTiempo} de ${totalPagadas} facturas, 90 días`} icon={BadgeCheck} />
        <KpiCard compacto label="Bancos + cobranza" value={money(bancos + cobranza)} note={`vencido ${money(vencido)}`} icon={Landmark} />
      </div>

      {/* Piloto con Stay On Social */}
      <Panel title="Criterios de éxito del piloto · día 90" subtitle="Stay On Social. La satisfacción se mide en el checkpoint con la agencia.">
        <div className="border-t border-hairline grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {criterio('Liberadas en 24–48 h', piloto.liberadasEnMeta === null ? '—' : `${piloto.liberadasEnMeta}%`, 'desde la carga de la solicitud')}
          {criterio('Fichas sin correcciones', piloto.fichasSinCorreccion === null ? '—' : `${piloto.fichasSinCorreccion}%`, 'aprobadas sin que el equipo corrija a la IA')}
          {criterio('Publicaciones verificadas', piloto.piezasVerificadas === null ? '—' : `${piloto.piezasVerificadas}%`, 'automáticamente al cargar el link')}
          {criterio('Instrucciones de pago confirmadas en 48 h', piloto.acuse48 === null ? '—' : `${piloto.acuse48}%`, 'al área de pagos de la marca')}
          {criterio('Inscripción en el RUG', piloto.horasRug === null ? '—' : `${num(piloto.horasRug, 1)} h`, 'promedio de la firma a la boleta')}
          {criterio('Preaprobación de cuentas', piloto.horasPreaprobacion === null ? '—' : `${piloto.horasPreaprobacion} h`, 'promedio del registro a la resolución')}
          {criterio('Volumen adelantado', money(volumenAdelantado), `${opsVolumen} operaciones · saldo ${ejeMoneda(saldoLinea)} (33% de la línea)`)}
          {criterio('Pendientes sin resolver por agencias', piloto.pendientesAgencias === null ? '—' : `${piloto.pendientesAgencias}%`, 'talentos que eligieron agencia')}
          {porMarca.slice(0, 2).map(({ m, h }) => criterio(`Plazo real · ${m.nombre}`, `${h.real} d`, `pactado ${h.pactado} d · ${h.operaciones} ops.`))}
        </div>
      </Panel>

      {/* Fila 2 · Donas + avisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
        <Panel title="Pagos de marcas a tiempo" subtitle="Facturas pagadas, 90 días">
          <Separador />
          {totalPagadas ? (
            <Dona
              datos={[{ nombre: 'A tiempo', valor: aTiempo, color: ESTADO.bien }, { nombre: 'Con atraso', valor: conAtraso, color: ESTADO.grave }]}
              centro={pct(cumplimiento, 0)} pie={`${aTiempo} de ${totalPagadas}`} formato={(x) => `${num(x)} facturas`}
            />
          ) : <SinDatos texto="Sin facturas pagadas en 90 días." alto={200} />}
        </Panel>
        <Panel title="Cartera" subtitle="Por cobrar a marcas">
          <Separador />
          {vigente + vencido > 0 ? (
            <Dona
              datos={[{ nombre: 'Vigente', valor: Math.round(vigente), color: CATEGORICA[0] }, { nombre: 'Vencido', valor: Math.round(vencido), color: ESTADO.grave }]}
              centro={ejeMoneda(vigente + vencido)} pie={`vencido ${pct((vencido / (vigente + vencido)) * 100, 0)}`} formato={money}
            />
          ) : <SinDatos texto="Sin saldo por cobrar." alto={200} />}
        </Panel>
        <Panel title="Avisos" right={<span className="text-[11px] text-ash tabular-nums">{avisos.length}</span>} className="md:col-span-2 xl:col-span-1">
          <div className="border-t border-hairline divide-y divide-hairline max-h-[228px] overflow-y-auto">
            {avisos.length === 0 && <div className="text-center text-[12px] text-mist py-8">Sin avisos.</div>}
            {avisos.map((a) => {
              const Icono = a.tipo === 'error' ? XCircle : a.tipo === 'warn' ? AlertTriangle : CheckCircle2;
              return (
                <button key={a.id} title={a.detalle} onClick={() => navigate(a.ruta)} className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-frost text-left">
                  <Icono size={15} strokeWidth={1.8} className={`shrink-0 ${a.tipo === 'error' ? 'text-danger' : a.tipo === 'warn' ? 'text-warning' : 'text-success'}`} />
                  <span className="text-[13px] font-medium text-carbon truncate">{a.titulo}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Fila 3 · Adelantos por mes, año actual vs anterior */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Adelantos por mes" subtitle={`Operaciones, ${anio} vs ${anio - 1} · nov.–ene. proyectado`}>
          <Separador />
          <Grafica alto={230}>
            <BarChart data={serie} margin={{ top: 14, right: 8, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} vertical={false} />
              <XAxis dataKey="mes" {...ejeX} />
              <YAxis {...ejeY} width={34} />
              <Tooltip {...tooltipEstilo} formatter={(x, n) => (x == null ? [] : [`${num(Number(x))} operaciones`, n])} />
              <Bar dataKey="ops2025" name={String(anio - 1)} fill={TINTA.eje} barSize={12} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ops2026real" name={String(anio)} stackId="y26" fill={CATEGORICA[0]} barSize={12} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ops2026proy" name="Proyección" stackId="y26" fill={PROYECCION} barSize={12} radius={[4, 4, 0, 0]} />
            </BarChart>
          </Grafica>
          <Leyenda series={[{ nombre: String(anio - 1), color: TINTA.eje }, { nombre: String(anio), color: CATEGORICA[0] }, { nombre: 'Proyección', color: PROYECCION }]} />
        </Panel>
        <Panel title="Importe adelantado por mes" subtitle={`MXN, ${anio} vs ${anio - 1} · nov.–ene. proyectado`}>
          <Separador />
          <Grafica alto={230}>
            <LineChart data={serie} margin={{ top: 14, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} vertical={false} />
              <XAxis dataKey="mes" {...ejeX} />
              <YAxis {...ejeY} width={38} tickFormatter={ejeMoneda} />
              <Tooltip {...tooltipEstilo} formatter={(x, n) => (x == null ? [] : [money(Number(x)), n])} />
              <Line dataKey="imp2025" name={String(anio - 1)} stroke={TINTA.eje} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              <Line dataKey="imp2026real" name={String(anio)} stroke={CATEGORICA[0]} strokeWidth={2.5} dot={{ r: 3, fill: CATEGORICA[0] }} connectNulls={false} />
              <Line dataKey="imp2026proy" name="Proyección" stroke={PROYECCION} strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 3, fill: '#ffffff', stroke: PROYECCION, strokeWidth: 2 }} connectNulls={false} />
            </LineChart>
          </Grafica>
          <Leyenda series={[{ nombre: String(anio - 1), color: TINTA.eje }, { nombre: String(anio), color: CATEGORICA[0] }, { nombre: 'Proyección', color: PROYECCION }]} />
        </Panel>
      </div>

      {/* Fila 4 · Rejilla 2×2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Tiempo de cobro por operación" subtitle={`Últimos 60 días · meta ${META_HORAS_COBRO} h`}>
          <Separador />
          {porOperacion.length ? (
            <Grafica>
              <BarChart data={porOperacion} margin={{ top: 18, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} vertical={false} />
                <XAxis dataKey="folio" {...ejeX} />
                <YAxis {...ejeY} width={34} tickFormatter={(x) => `${x} h`} />
                <Tooltip {...tooltipEstilo} labelFormatter={(l, p) => `INF-${l} · ${p?.[0]?.payload?.marca ?? ''}`} formatter={(x) => [`${x} h`, 'Captura → adelanto']} />
                <ReferenceLine y={META_HORAS_COBRO} stroke={TINTA.eje} strokeDasharray="4 3" />
                <Bar dataKey="horas" barSize={22} radius={[4, 4, 0, 0]}>
                  {porOperacion.map((x) => <Cell key={x.folio} fill={x.alta ? ESTADO.grave : CATEGORICA[0]} />)}
                  <LabelList dataKey="horas" position="top" formatter={(x) => `${x} h`} style={{ fontSize: 10, fill: TINTA.etiqueta }} />
                </Bar>
              </BarChart>
            </Grafica>
          ) : <SinDatos texto="Sin adelantos liberados en 60 días." />}
          <Leyenda series={[{ nombre: 'Dentro de meta', color: CATEGORICA[0] }, { nombre: 'Sobre la meta', color: ESTADO.grave }]} />
        </Panel>

        <Panel title="Exposición por marca" subtitle={`Saldo por cobrar · límite ${LIMITE_CONCENTRACION}% de la cartera`}>
          <Separador />
          {expo.length ? (
            <Grafica>
              <BarChart data={expo} layout="vertical" margin={{ top: 8, right: 44, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} horizontal={false} />
                <XAxis type="number" {...ejeY} tickFormatter={ejeMoneda} />
                <YAxis type="category" dataKey="marca" {...ejeX} width={72} />
                <Tooltip {...tooltipEstilo} formatter={(x, _n, item) => [`${money(Number(x))} · ${item?.payload?.pct}% de la cartera`, 'Por cobrar']} />
                <Bar dataKey="saldo" barSize={14} minPointSize={2} radius={[0, 4, 4, 0]}>
                  {expo.map((x) => <Cell key={x.marca} fill={x.alta ? ESTADO.grave : ESTADO.bien} />)}
                  <LabelList dataKey="pct" position="right" formatter={(x) => `${x}%`} style={{ fontSize: 10, fill: TINTA.etiqueta }} />
                </Bar>
              </BarChart>
            </Grafica>
          ) : <SinDatos texto="Sin saldo por cobrar." />}
          <Leyenda series={[{ nombre: 'Sobre el límite de concentración', color: ESTADO.grave }, { nombre: 'Dentro del límite', color: ESTADO.bien }]} />
        </Panel>

        <Panel title="Operaciones activas" subtitle="Días desde el adelanto vs días por vencer">
          <Separador />
          {activas.length ? (
            <Grafica>
              <BarChart data={activas} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} horizontal={false} />
                <XAxis type="number" {...ejeY} tickFormatter={(x) => `${x} d`} />
                <YAxis type="category" dataKey="folio" {...ejeX} width={40} />
                <Tooltip {...tooltipEstilo} labelFormatter={(l, p) => `INF-${l} · ${p?.[0]?.payload?.marca ?? ''}`} formatter={(x, n) => [`${x} días`, n]} />
                <Bar dataKey="Transcurridos" stackId="a" fill={CATEGORICA[0]} barSize={14} stroke="#ffffff" strokeWidth={2} />
                <Bar dataKey="Por vencer" stackId="a" fill={SECUENCIAL_AZUL[0]} barSize={14} stroke="#ffffff" strokeWidth={2} radius={[0, 4, 4, 0]} />
              </BarChart>
            </Grafica>
          ) : <SinDatos texto="Sin operaciones activas." />}
          <Leyenda series={[{ nombre: 'Transcurridos', color: CATEGORICA[0] }, { nombre: 'Por vencer', color: SECUENCIAL_AZUL[0] }]} />
        </Panel>

        <Panel title="Antigüedad de saldos" subtitle="Por marca, días vencidos">
          <Separador />
          {antiguedad.length ? (
            <Grafica>
              <BarChart data={antiguedad} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={TINTA.rejilla} vertical={false} />
                <XAxis dataKey="marca" {...ejeX} />
                <YAxis {...ejeY} width={38} tickFormatter={ejeMoneda} />
                <Tooltip {...tooltipEstilo} formatter={(x, n) => [money(Number(x)), n]} />
                {(['Corriente', '1 a 30', '31 a 60', 'Más de 60'] as const).map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={SECUENCIAL_AZUL[i]} barSize={26} stroke="#ffffff" strokeWidth={2} radius={i === 3 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </Grafica>
          ) : <SinDatos texto="Sin saldos por cobrar." />}
          <Leyenda series={['Corriente', '1 a 30', '31 a 60', 'Más de 60'].map((n, i) => ({ nombre: n, color: SECUENCIAL_AZUL[i] }))} />
        </Panel>
      </div>
    </div>
  );
};

