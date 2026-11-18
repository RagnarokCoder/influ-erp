import { useNavigate } from 'react-router-dom';
import { Building2, FileSearch, AlertTriangle, Coins } from 'lucide-react';
import DataModule, { Relacion, RenglonRelacion } from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { estatusCxC, handlePrincipal, porId, saldoCxC, suma } from '../lib/derive';
import { fechaHora, formatDate, money } from '../lib/format';
import type { Agencia } from '../data/types';

type Fila = Agencia & { confirmados: number; adelantado: number };
const ESTATUS = ['Activa', 'Suspendida'] as const;

// clientes.md con sus adaptables: Prioridad → Folio mercantil, Días de crédito →
// Talentos confirmados, Anticipo → Aviso de pago, Saldo → Adelantado vigente.
// La agencia nace con su registro y se aprueba en Registros.
const cols: Col<Fila>[] = [
  { key: 'nombre', label: 'Agencia', render: (a) => <span><span className="text-carbon">{a.nombre}</span><span className="block text-[11px] text-ash">{a.ciudad}</span></span> },
  { key: 'rfc', label: 'RFC', mono: true },
  { key: 'contacto', label: 'Contacto principal' },
  { key: 'correo', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'folioMercantil', label: 'Folio mercantil', mono: true, ayuda: 'Registro Público de Comercio, como N-2024011563.' },
  { key: 'confirmados', label: 'Talentos confirmados', tipo: 'number', fueraDeForma: true },
  { key: 'avisoPago', label: 'Aviso de pago', fueraDeForma: true },
  { key: 'cuenta', label: 'Cuenta', fueraDeForma: true, render: (a) => <Badge tone={a.cuenta === 'Preaprobada' ? 'success' : a.cuenta === 'En revisión' ? 'warning' : 'danger'}>{a.cuenta}</Badge> },
  { key: 'clabe', label: 'CLABE', mono: true },
  { key: 'adelantado', label: 'Adelantado vigente', tipo: 'money', fueraDeForma: true },
  { key: 'estatus', label: 'Estatus', tipo: 'select', opciones: ESTATUS },
];

export const Agencias = () => {
  const navigate = useNavigate();
  const v = useVista();
  const rol = useInflu(rolActual);
  const filas: Fila[] = v.agencias.map((a) => ({
    ...a,
    confirmados: v.talentos.filter((t) => t.agenciaId === a.id && t.representacion === 'Confirmada').length,
    adelantado: suma(v.operaciones.filter((o) => o.agenciaId === a.id && ['Activa', 'Por liquidar'].includes(o.estatus)).map((o) => o.adelanto?.monto ?? 0)),
  }));
  const enRevision = filas.filter((a) => a.cuenta === 'En revisión');
  const vencidas = v.cxc.filter((c) => estatusCxC(c) === 'Vencido');
  const conVencida = filas.filter((a) => vencidas.some((c) => porId(v.operaciones, c.operacionId)?.agenciaId === a.id));

  return (
    <DataModule<Fila>
      coleccion="agencias" rows={filas} cols={cols} estatuses={ESTATUS} nombreSingular="agencia" femenino sinAlta sinBaja
      sinEdicion={!autoriza.agencia(rol)}
      titulo="Catálogo de agencias"
      subtitulo="Piloto con Stay On Social. Se preaprueban en Registros; una agencia suspendida no pide adelantos."
      kpis={[
        { label: 'Agencias', value: String(filas.length), note: `${filas.filter((a) => a.cuenta === 'Preaprobada' && a.estatus === 'Activa').length} activas`, icon: Building2 },
        { label: 'En revisión', value: String(enRevision.length), note: enRevision.map((a) => a.nombre).join(', ') || 'ninguna', icon: FileSearch },
        { label: 'Con factura vencida', value: String(conVencida.length), note: conVencida.map((a) => a.nombre).join(', ') || 'al corriente', icon: AlertTriangle },
        { label: 'Adelantado vigente', value: money(suma(filas.map((a) => a.adelantado))), note: 'operaciones de sus talentos', icon: Coins, importe: true },
      ]}
      accion={(a) => a.cuenta === 'En revisión' ? <Button size="sm" variant="outlined" onClick={() => navigate('/registros')}>Aprobar</Button> : null}
      avisoForma={(f, original) => original && f.estatus === 'Suspendida' && original.estatus !== 'Suspendida' ? (
        <div className="mt-4 border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning">
          Al guardar, {original.nombre} deja de pedir adelantos y de confirmar talentos. Sus operaciones en curso siguen su recorrido.
        </div>
      ) : null}
      detalle={(a) => {
        const talentos = v.talentos.filter((t) => t.agenciaId === a.id);
        const ops = v.operaciones.filter((o) => o.agenciaId === a.id).sort((x, y) => y.capturada.localeCompare(x.capturada));
        const porCobrar = v.cxc.filter((c) => porId(v.operaciones, c.operacionId)?.agenciaId === a.id && estatusCxC(c) !== 'Pagado');
        return (
          <>
            <Relacion titulo="Aprobación y condiciones">
              <RenglonRelacion titulo="Folio mercantil" detalle={a.razonSocial} valor={a.folioMercantil} />
              <RenglonRelacion titulo="Condiciones pactadas" detalle={`vigentes desde ${formatDate(a.condiciones.desde)}`} valor={`${a.condiciones.fija * 100}% + ${a.condiciones.mensual * 100}%/mes`} />
              <RenglonRelacion titulo="Registro" detalle={fechaHora(a.alta)} valor={a.cuenta} tone={a.cuenta === 'Preaprobada' ? 'Activa' : a.cuenta} />
              {a.resoluciones.map((r) => <RenglonRelacion key={r.fechaHora} titulo={r.decision} detalle={`${r.usuario} · ${fechaHora(r.fechaHora)}${r.nota ? ` · ${r.nota}` : ''}`} />)}
            </Relacion>
            <Relacion titulo={`Talentos · ${talentos.length}`}>
              {talentos.length === 0 && <RenglonRelacion titulo="Sin talentos registrados" />}
              {talentos.map((t) => <RenglonRelacion key={t.id} titulo={t.nombre} detalle={`${handlePrincipal(t)} · cuenta ${t.cuenta.toLowerCase()}`} valor={t.representacion} tone={t.representacion} />)}
            </Relacion>
            <Relacion titulo={`Operaciones · ${ops.length} · por cobrar ${money(suma(porCobrar.map(saldoCxC)))}`}>
              {ops.slice(0, 8).map((o) => <RenglonRelacion key={o.id} titulo={`${o.folio} · ${porId(v.marcas, o.marcaId)?.nombre}`} detalle={`${porId(v.talentos, o.talentoId)?.nombre} · ${money(o.monto)}`} valor={o.estatus} tone={o.estatus} />)}
            </Relacion>
          </>
        );
      }}
    />
  );
};
