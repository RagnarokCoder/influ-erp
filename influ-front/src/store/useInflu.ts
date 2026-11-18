import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { seed, digitoClabe } from '../data/seed';
import {
  BANCOS, CLAVE_DEMO, HOY_ISO, INFLU, MODALIDAD_RUG, PAC, QUORUM_APROBACION, RUG_EXTERNO, VERSION_AVISO_PRIVACIDAD, VERSION_CONDICIONES,
  CONDICIONES_DESDE, COMISION_FIJA, TASA_MENSUAL, sumarDias,
} from '../data/constantes';
import type {
  Agencia, AnalisisContrato, AvisoPago, Bitacora, ClaveFicha, Contacto, Correo, CxC, CxP, Empresa, Entregable, EstadoCuenta, Evidencia,
  Genero, Handle, Marca, Mensaje, Nicho, Operacion, OrdenPago, Pieza, RegimenFiscal, Rol, RolUsuario, Sesion, Talento, TipoContenido, Toast,
  Ubicacion, Usuario,
} from '../data/types';
import { autoriza, carteraPropia, QUIEN, veImportes } from '../lib/permisos';
import {
  avisosRevision, beneficiario, bloqueoCxP, bloqueoPedir, bloqueosRevision, construirFicha, cxcDe, destinosAviso, empresaDe, en69b,
  faltantesLiberar, hash, liquidacion, montoAdelanto, nacimientoDeRfc, nombreArchivoContrato, ordenDe, porId, redondear, saldoCxC, snapshotsHasta, sugerencia,
  validarCfdi, vencimientoOp, verificarLink, vista, type Datos,
} from '../lib/derive';
import { ahora, formatDate, money } from '../lib/format';

/** Colecciones que el módulo genérico de captura sabe manejar. */
export type Coleccion = 'talentos' | 'agencias' | 'empresas' | 'marcas' | 'usuarios' | 'roles';

interface Estado extends Datos {
  usuarios: Usuario[];
  roles: Rol[];
  bitacora: Bitacora[];
}

type Registro = { id: string } & Record<string, unknown>;

export interface BorradorTalento {
  nombre: string; correo: string; nacionalidad: 'Mexicana' | 'Extranjera' | ''; rfc: string; curp: string; regimenFiscal: RegimenFiscal | ''; genero: Genero | '';
  foto: string; lada: string; telefono: string; clabe: string;
  handles: { red: Handle['red']; usuario: string }[];
  nichos: Nicho[]; nichoOtro: string; tiposContenido: TipoContenido[]; contenidoOtro: string; ubicacion: Ubicacion;
  agenciaId: string; condiciones: boolean; privacidad: boolean;
}

/** Alta de talento desde el panel de agencia (M5). Sin CLABE ni consentimientos: los pagos van a la agencia. */
export interface BorradorTalentoAgencia {
  nombreArtistico: string; nombre: string; tipo: 'Persona física' | 'Grupo';
  correo: string; telefono: string;
  rfc: string; curp: string; regimenFiscal: RegimenFiscal | '';
  handles: { red: Handle['red']; usuario: string; seguidores: number }[];
  nichos: Nicho[]; nichoOtro: string; tiposContenido: TipoContenido[]; contenidoOtro: string;
  ciudad: string; genero: Genero | ''; foto: string;
}

export interface BorradorAgencia {
  nombre: string; razonSocial: string; rfc: string; folioMercantil: string; contacto: string; correo: string; telefono: string;
  ciudad: string; clabe: string; avisoPago: AvisoPago | ''; condiciones: boolean; privacidad: boolean;
}

export interface BorradorSolicitud {
  talentoId: string;
  marcaId: string;
  marcaNueva?: { nombre: string; razonSocial: string; rfc: string; industria: string };
  monto: number;
  fechaPublicacion: string;
  plazoDias: number;
  entregables: Omit<Entregable, 'id'>[];
  contactoPagos: Contacto;
  contactoMarketing?: Contacto;
  cfdiXml: string;
  cfdiPdf: string;
  contrato: string;
}

export interface BorradorEvidencia {
  aprobacionMarca: string;
  alcance: Evidencia['alcance'];
  porcentaje: number;
}

interface Acciones {
  usuarioId: string;
  sesion: Sesion | null;
  setUsuario: (id: string) => void;
  iniciarSesion: (correo: string, clave: string, recordar: boolean) => string | null;
  cerrarSesion: () => void;

  toasts: Toast[];
  toast: (texto: string, tipo?: Toast['tipo']) => void;
  dismissToast: (id: string) => void;

  guardar: (col: Coleccion, row: Registro) => boolean;

  // Registro público y preaprobación (etapa 2 y §2)
  registrarTalento: (b: BorradorTalento) => string | null;
  /** Alta de un talento del roster de la agencia (M5): queda en revisión de Influ. */
  agregarTalento: (b: BorradorTalentoAgencia) => string | null;
  registrarAgencia: (b: BorradorAgencia) => string | null;
  resolverCuenta: (tipo: 'talento' | 'agencia', id: string, decision: 'Preaprobada' | 'Observada' | 'Rechazada', nota: string) => boolean;
  actualizarPerfil: (talentoId: string, cambios: Partial<BorradorTalento>) => boolean;
  reenviarRevision: (tipo: 'talento' | 'agencia', id: string) => boolean;
  confirmarRepresentacion: (talentoId: string) => boolean;
  rechazarRepresentacion: (talentoId: string) => boolean;
  cambiarAvisoPago: (agenciaId: string, aviso: AvisoPago) => boolean;
  verificarContactoPagos: (empresaId: string) => boolean;
  bloquearMarca: (empresaId: string, motivo: string) => boolean;
  desbloquearMarca: (empresaId: string) => boolean;
  actualizarAgencia: (agenciaId: string, cambios: Partial<Pick<Agencia, 'contacto' | 'correo' | 'telefono' | 'clabe'>>) => boolean;

  // Flujo del adelanto (etapas 3 a 14)
  capturarSolicitud: (b: BorradorSolicitud) => string | null;
  avanzarAnalisis: (id: string) => void;
  corregirCampo: (id: string, clave: ClaveFicha, valor: string) => boolean;
  votarAprobacion: (id: string, confirmado: boolean, montoBase?: number) => boolean;
  observarSolicitud: (id: string, nota: string) => boolean;
  responderObservacion: (id: string, archivo: string, tipo: 'consentimiento' | 'contrato') => boolean;
  rechazarSolicitud: (id: string, motivo: string) => boolean;
  firmarDocumento: (id: string) => boolean;
  firmarInstruccion: (id: string) => boolean;
  registrarAperturaContrato: (id: string, accion: 'Apertura' | 'Descarga') => void;
  registrarAperturaCesion: (id: string) => boolean;
  registrarAcuseCesion: (id: string, via: NonNullable<Operacion['cesion']>['acuseVia']) => boolean;
  reenviarCesion: (id: string, automatico?: boolean) => boolean;
  inscribirRug: (id: string, boleta: string) => boolean;
  actualizarRug: (id: string) => boolean;
  cancelarRug: (id: string) => boolean;
  cargarPieza: (opId: string, entregableId: string, indice: number, link: string, capturas?: string[]) => boolean;
  enviarEvidencia: (id: string, e: BorradorEvidencia) => boolean;
  prepararOrden: (opId: string, tipo: OrdenPago['tipo'], cuentaId: string) => boolean;
  autorizarOrden: (ordenId: string) => boolean;
  cargarCep: (ordenId: string, archivo: string) => boolean;
  registrarCobro: (cxcId: string, monto: number, referencia: string, cuentaId: string) => boolean;
  reenviarMensaje: (id: string) => boolean;

  reiniciarDemo: () => void;
}

export type InfluState = Estado & Acciones;

const datosIniciales = (): Estado => JSON.parse(JSON.stringify(seed));

const nuevoId = (prefijo: string) => `${prefijo}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

/** Siguiente folio de una serie: "INF-0188" → "INF-0189". */
function siguienteFolio(folios: string[], prefijo: string, relleno = 4) {
  const max = folios
    .filter((f) => f.startsWith(prefijo))
    .map((f) => Number(f.slice(prefijo.length)))
    .filter((n) => !Number.isNaN(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${prefijo}${String(max + 1).padStart(relleno, '0')}`;
}

const RFC_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const RFC_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
const CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const FOLIO_MERCANTIL = /^N-\d{10}$/;
const HANDLE = /^@[\w.]{2,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normal = (s: string) => s.trim().toLowerCase();
const digitos = (s: string) => s.replace(/\D/g, '');

/** CLABE de 18 dígitos con dígito verificador válido. */
export function clabeValida(c: string) {
  const x = digitos(c);
  return x.length === 18 && digitoClabe(x.slice(0, 17)) === x[17];
}
export const bancoDeClabe = (c: string) => BANCOS[digitos(c).slice(0, 3)] ?? '';

/** UUID aleatorio con formato de folio fiscal (lectura simulada del XML). */
const nuevoUuid = () => {
  const h = (n: number) => Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-A${h(3)}-${h(12)}`;
};

/** Proveedor de datos públicos simulado: la cuenta existe y trae sus seguidores. */
const buscarHandle = (red: Handle['red'], usuario: string): Handle => ({
  red, usuario: usuario.trim(), encontrada: HANDLE.test(usuario.trim()), seguidores: HANDLE.test(usuario.trim()) ? 8_000 + (hash(usuario) % 300_000) : undefined,
});

/** "estatus Activa → Suspendida; plazo habitual 60 → 90" (bitacora.md §7.3 regla 7). */
function diferencias(antes: Record<string, unknown>, despues: Record<string, unknown>, campos: [string, string, ((v: unknown) => string)?][]) {
  return campos
    .filter(([k]) => despues[k] !== undefined && String(antes[k] ?? '') !== String(despues[k] ?? ''))
    .map(([k, etiqueta, f]) => `${etiqueta} ${f ? f(antes[k]) : String(antes[k] || '—')} → ${f ? f(despues[k]) : String(despues[k] || '—')}`)
    .join('; ');
}

const MODULO: Record<Coleccion, string> = {
  talentos: 'Talentos', agencias: 'Agencias', empresas: 'Marcas', marcas: 'Marcas', usuarios: 'Usuarios', roles: 'Roles',
};
const SOL = 'Solicitudes de adelanto';

export const useInflu = create<InfluState>()(
  persist(
    (set, get) => {
      const usuario = () => get().usuarios.find((x) => x.id === get().usuarioId);
      const yo = () => {
        const u = usuario();
        return { nombre: u?.nombre ?? 'Sistema', rol: (u?.rol ?? 'Dirección General') as RolUsuario };
      };
      const SISTEMA = { nombre: 'Sistema', rol: 'Sistema' as const };
      const fhAhora = () => ahora().fechaHora;

      // Todo movimiento queda con usuario, fecha y hora, sin posibilidad de eliminarse.
      const log = (modulo: string, accion: string, detalle: string, firma?: { nombre: string; rol: Bitacora['rol'] }) => {
        const u = firma ?? yo();
        const b: Bitacora = { id: nuevoId('BIT'), fechaHora: fhAhora(), usuario: u.nombre, rol: u.rol, modulo, accion, detalle };
        set({ bitacora: [b, ...get().bitacora] });
      };

      const correo = (c: Omit<Correo, 'id' | 'fechaHora' | 'estatus'> & { estatus?: Correo['estatus'] }) =>
        set({ correos: [{ id: nuevoId('MAIL'), fechaHora: fhAhora(), estatus: 'Enviado', ...c }, ...get().correos] });

      const toast = (texto: string, tipo: Toast['tipo'] = 'ok') => get().toast(texto, tipo);
      const error = (texto: string) => { toast(texto, 'error'); return false; };

      /** Permiso del perfil. Sin permiso: toast y nada de bitácora. */
      const puede = (llave: keyof typeof autoriza) => {
        if (autoriza[llave](yo().rol)) return true;
        return error(`Tu perfil (${yo().rol}) no autoriza esta operación. La autoriza ${QUIEN[llave]}.`);
      };

      /** Regla 20: el talento y la agencia solo operan su cartera. */
      const deSuCartera = (op: Operacion) => {
        const u = usuario();
        if (!u || !carteraPropia(u.rol)) return true;
        const mia = u.rol === 'Talento' ? op.talentoId === u.talentoId : op.agenciaId === u.agenciaId;
        return mia || error(`${op.folio} no es de tu cartera.`);
      };

      /** Pendiente #4: firma, links y evidencia los carga quien pidió el adelanto. */
      const esSolicitante = (op: Operacion, que: string) => {
        const u = usuario();
        if (!u || !carteraPropia(u.rol) || u.rol === op.solicitante) return true;
        const quien = op.solicitante === 'Agencia' ? porId(get().agencias, op.agenciaId)?.nombre ?? 'la agencia' : nombreTal(op.talentoId);
        return error(`${op.folio}: ${que} ${quien}, que pidió el adelanto.`);
      };

      const nombreTal = (id: string) => porId(get().talentos, id)?.nombre ?? '';
      const nombreMar = (id: string) => porId(get().marcas, id)?.nombre ?? '';
      const tag = (op: Operacion) => `${op.folio} ${nombreTal(op.talentoId)} / ${nombreMar(op.marcaId)}`;
      const cambiarOp = (id: string, cambios: Partial<Operacion>) =>
        set({ operaciones: get().operaciones.map((o) => (o.id === id ? { ...o, ...cambios } : o)) });
      const op$ = (id: string) => porId(get().operaciones, id);

      /** Etapa 10: un aviso de pago por WhatsApp a quien eligió la agencia en su preferencia. */
      const avisarPago = (op: Operacion, tipo: Mensaje['tipo'], monto: number) => {
        const s = get();
        const tal = porId(s.talentos, op.talentoId);
        const ag = porId(s.agencias, op.agenciaId);
        const avisar = destinosAviso(op, s.agencias);
        const destinos = [
          ...(avisar.talento && tal ? [{ destinatario: 'Talento' as const, nombre: tal.nombre, telefono: tal.telefono }] : []),
          ...(avisar.agencia && ag ? [{ destinatario: 'Agencia' as const, nombre: ag.nombre, telefono: ag.telefono }] : []),
        ];
        const nuevos: Mensaje[] = destinos.map((x) => ({
          id: nuevoId('MSG'), operacionId: op.id, ...x, tipo, fechaHora: fhAhora(),
          estatus: digitos(x.telefono).length >= 10 ? 'Enviado' : 'Fallido',
          contenido: `Influ: enviamos ${tipo === 'Adelanto enviado' ? 'el adelanto' : 'el remanente'} de ${op.folio} (${nombreMar(op.marcaId)}, ${nombreTal(op.talentoId).split(' ')[0]}) por ${money(monto)} MXN por SPEI. Llega en minutos a la CLABE registrada.`,
        }));
        set({ mensajes: [...nuevos, ...get().mensajes], operaciones: get().operaciones.map((o) => (o.id === op.id ? { ...o, avisar } : o)) });
        if (nuevos.length) log('Notificaciones', 'Aviso de pago', `${op.folio}: WhatsApp "${tipo.toLowerCase()}" a ${nuevos.map((m) => m.nombre).join(' y ')} (preferencia: ${ag?.avisoPago ?? 'talento independiente'}).`, SISTEMA);
        return nuevos;
      };

      /** Reglas del catálogo genérico. */
      const validar = (col: Coleccion, row: Registro): string | null => {
        const s = get();
        if (col === 'talentos') {
          const t = row as unknown as Talento;
          if (!t.nombre?.trim() || !t.rfc?.trim() || !t.curp?.trim()) return 'El talento necesita nombre, RFC y CURP.';
          if (!RFC_FISICA.test(t.rfc.trim().toUpperCase())) return 'El RFC de persona física lleva 13 caracteres con formato válido.';
          if (!CURP.test(t.curp.trim().toUpperCase())) return 'La CURP lleva 18 caracteres con formato válido.';
          const otro = s.talentos.find((x) => x.id !== t.id && x.rfc === t.rfc.trim().toUpperCase());
          if (otro) return `El RFC ${t.rfc.toUpperCase()} ya es de ${otro.nombre}.`;
          if (!clabeValida(t.clabe ?? '')) return 'La CLABE lleva 18 dígitos y su dígito verificador no cuadra. Revísala con el estado de cuenta.';
          if (digitos(t.telefono ?? '').length !== 10) return 'El teléfono lleva 10 dígitos: también es su WhatsApp para los avisos de pago.';
        }
        if (col === 'agencias') {
          const a = row as unknown as Agencia;
          if (!a.nombre?.trim() || !a.rfc?.trim()) return 'La agencia necesita nombre y RFC.';
          if (!RFC_MORAL.test(a.rfc.trim().toUpperCase())) return 'El RFC de la empresa lleva 12 caracteres con formato válido.';
          if (!FOLIO_MERCANTIL.test(a.folioMercantil?.trim() ?? '')) return 'El folio mercantil va como N-2024011563 (Registro Público de Comercio).';
          if (!clabeValida(a.clabe ?? '')) return 'La CLABE lleva 18 dígitos y su dígito verificador no cuadra.';
        }
        if (col === 'empresas') {
          const e = row as unknown as Empresa;
          if (!e.razonSocial?.trim() || !e.rfc?.trim()) return 'La empresa necesita razón social y RFC.';
          if (!RFC_MORAL.test(e.rfc.trim().toUpperCase())) return 'El RFC de la empresa lleva 12 caracteres con formato válido.';
          const otra = s.empresas.find((x) => x.id !== e.id && x.rfc === e.rfc.trim().toUpperCase());
          if (otra) return `El RFC ${e.rfc.toUpperCase()} ya es de ${otra.razonSocial}.`;
          if (!(Number(e.plazoHabitual) >= 1 && Number(e.plazoHabitual) <= 180)) return 'El plazo habitual va de 1 a 180 días.';
        }
        if (col === 'marcas') {
          const m = row as unknown as Marca;
          if (!m.nombre?.trim() || !m.empresaId) return 'La marca necesita nombre y la empresa que paga.';
        }
        if (col === 'usuarios') {
          const u = row as unknown as Usuario;
          if (!u.nombre?.trim() || !u.correo?.trim() || !u.rol) return 'El usuario necesita nombre, correo y perfil.';
          if (!EMAIL.test(u.correo)) return 'Escribe un correo válido.';
          const otro = s.usuarios.find((x) => x.id !== u.id && normal(x.correo) === normal(u.correo));
          if (otro) return `Ese correo ya lo usa ${otro.nombre}.`;
          if (u.rol === 'Talento' && !u.talentoId) return 'El usuario con perfil Talento necesita su talento relacionado.';
          if (u.rol === 'Agencia' && !u.agenciaId) return 'El usuario con perfil Agencia necesita su agencia relacionada.';
          if (u.rol === 'Marca' && !u.empresaId) return 'El usuario con perfil Marca necesita su empresa.';
          if (u.id === s.usuarioId && u.estatus === 'Suspendido') return 'No puedes suspender el usuario con el que estás en sesión.';
          const direccion = s.usuarios.map((x) => (x.id === u.id ? u : x)).filter((x) => x.rol === 'Dirección General' && x.estatus === 'Activo');
          if (direccion.length === 0) return 'Debe quedar al menos un usuario activo de Dirección General.';
        }
        if (col === 'roles') {
          const r = row as unknown as Rol;
          if (r.nombre === 'Dirección General' && r.estatus === 'Inactivo') return 'El perfil Dirección General no se desactiva.';
        }
        return null;
      };

      const permisoColeccion: Record<Coleccion, keyof typeof autoriza> = {
        talentos: 'catalogo', agencias: 'agencia', empresas: 'catalogo', marcas: 'catalogo', usuarios: 'usuarios', roles: 'roles',
      };

      const CAMPOS_DIF: Record<Coleccion, [string, string, ((v: unknown) => string)?][]> = {
        talentos: [['nombre', 'nombre'], ['telefono', 'teléfono'], ['correo', 'correo'], ['clabe', 'CLABE'], ['estatus', 'estatus']],
        agencias: [['nombre', 'nombre'], ['contacto', 'contacto'], ['correo', 'correo'], ['telefono', 'teléfono'], ['folioMercantil', 'folio mercantil'],
          ['clabe', 'CLABE'], ['estatus', 'estatus']],
        empresas: [['razonSocial', 'razón social'], ['rfc', 'RFC'], ['plazoHabitual', 'plazo habitual'], ['estatus', 'estatus']],
        marcas: [['nombre', 'nombre'], ['industria', 'industria'], ['estatus', 'estatus']],
        usuarios: [['nombre', 'nombre'], ['correo', 'correo'], ['rol', 'perfil'],
          ['talentoId', 'talento', (v) => porId(get().talentos, String(v))?.nombre ?? '—'],
          ['agenciaId', 'agencia', (v) => porId(get().agencias, String(v))?.nombre ?? '—'],
          ['empresaId', 'empresa', (v) => porId(get().empresas, String(v))?.razonSocial ?? '—'], ['estatus', 'estatus']],
        roles: [['estatus', 'estatus']],
      };

      /** Paso de la orden de pago que dispara el SPEI: 80% o remanente. */
      const ejecutarAdelanto = (op: Operacion, orden: OrdenPago) => {
        const s = get();
        const fh = fhAhora();
        const base = op.adelanto?.base ?? redondear(orden.monto / 0.8);
        const nuevaCxc: CxC = { id: `CXC-${op.folio.slice(-4)}`, operacionId: op.id, marcaId: op.marcaId, documento: op.cfdi.serieFolio, importe: op.monto, abonos: [], vencimiento: vencimientoOp(op) };
        const nuevaCxp: CxP = { id: `CXP-${op.folio.slice(-4)}`, operacionId: op.id, documento: `LIQ-${op.folio.slice(-4)}` };
        const actualizada: Operacion = { ...op, adelanto: { monto: orden.monto, base, fechaHora: fh, cuentaId: orden.cuentaId, referencia: orden.cep!.claveRastreo, usuario: yo().nombre }, estatus: 'Activa' };
        set({
          operaciones: s.operaciones.map((o) => (o.id === op.id ? actualizada : o)),
          cuentas: s.cuentas.map((c) => (c.id === orden.cuentaId ? { ...c, saldo: redondear(c.saldo - orden.monto) } : c)),
          cxc: [nuevaCxc, ...s.cxc],
          cxp: [nuevaCxp, ...s.cxp],
        });
        log(SOL, 'Liberación de adelanto', `${op.folio} ${money(orden.monto)} por SPEI a ${orden.beneficiario.nombre} (CEP ${orden.cep!.claveRastreo}). Queda esperando el pago de ${nombreMar(op.marcaId)} con vencimiento ${formatDate(vencimientoOp(op))}.`);
        return avisarPago(actualizada, 'Adelanto enviado', orden.monto);
      };

      const ejecutarRemanente = (op: Operacion, orden: OrdenPago) => {
        const s = get();
        const p = s.cxp.find((x) => x.operacionId === op.id)!;
        const l = liquidacion(op, cxcDe(op.id, s.cxc));
        const t = ahora();
        set({
          cxp: s.cxp.map((x) => (x.id === p.id ? { ...x, pago: { cuentaId: orden.cuentaId, fecha: t.fecha, hora: t.hora, usuario: yo().nombre, importe: orden.monto, fijo: l.fijo, variable: l.variable, meses: l.meses } } : x)),
          cuentas: s.cuentas.map((x) => (x.id === orden.cuentaId ? { ...x, saldo: redondear(x.saldo - orden.monto) } : x)),
          operaciones: s.operaciones.map((o) => (o.id === op.id ? { ...o, estatus: 'Liquidada' } : o)),
        });
        log(SOL, 'Liquidación de remanente', `${p.documento} ${money(orden.monto)} a ${orden.beneficiario.nombre}: retenido ${money(l.retenido)} − fijo ${money(l.fijo)} − variable ${money(l.variable)} (${l.meses} ${l.meses === 1 ? 'mes' : 'meses'}).${l.aCargo ? ` Quedan ${money(l.aCargo)} a cargo.` : ''}`);
        log(SOL, 'Cierre de operación', `${op.folio}: estado "pagada". Queda la tarea de cancelar o actualizar la inscripción en el RUG.`, SISTEMA);
        return orden.monto > 0 ? avisarPago(op, 'Remanente enviado', orden.monto) : [];
      };

      return {
        ...datosIniciales(),
        usuarioId: 'USR-01',
        sesion: null,
        toasts: [],

        // ------------------------------------------------------------------
        // Sesión (login.md)
        // ------------------------------------------------------------------

        setUsuario: (id) => {
          const antes = yo();
          const nuevo = get().usuarios.find((u) => u.id === id);
          if (!nuevo || id === get().usuarioId) return;
          set({ usuarioId: id, sesion: get().sesion ? { ...get().sesion!, usuarioId: id } : null });
          log('Sistema', 'Cambio de perfil', `${antes.nombre} (${antes.rol}) → ${nuevo.nombre} (${nuevo.rol}).`, { nombre: nuevo.nombre, rol: nuevo.rol });
        },

        iniciarSesion: (correoUsado, clave, recordar) => {
          const c = normal(correoUsado);
          if (!c || !c.includes('@')) return 'Escribe tu correo.';
          const u = get().usuarios.find((x) => normal(x.correo) === c);
          if (!u) return 'No encontramos ese correo. Revisa que sea el de tu trabajo.';
          if (clave !== CLAVE_DEMO) return 'La contraseña no es correcta.';
          const rolInactivo = get().roles.find((r) => r.nombre === u.rol)?.estatus === 'Inactivo';
          if (u.estatus === 'Suspendido' || rolInactivo) return 'Tu usuario está suspendido. Pide a Dirección que lo reactive.';
          try { if (!recordar) sessionStorage.setItem('influ-sesion', '1'); } catch { /* navegador sin sessionStorage */ }
          set({ usuarioId: u.id, sesion: { usuarioId: u.id, desde: fhAhora(), recordar } });
          log('Sistema', 'Inicio de sesión', `${u.nombre} (${u.rol}).`, { nombre: u.nombre, rol: u.rol });
          toast(`Hola, ${u.nombre.split(' ')[0]}.`);
          return null;
        },

        cerrarSesion: () => {
          log('Sistema', 'Cierre de sesión', `${yo().nombre} (${yo().rol}).`);
          try { sessionStorage.removeItem('influ-sesion'); } catch { /* sin sessionStorage */ }
          set({ sesion: null });
        },

        toast: (texto, tipo = 'ok') => {
          const t: Toast = { id: nuevoId('TST'), texto, tipo };
          set({ toasts: [...get().toasts, t] });
          setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), tipo === 'error' ? 5200 : 3600);
        },
        dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

        // ------------------------------------------------------------------
        // Catálogos genéricos
        // ------------------------------------------------------------------

        guardar: (col, row) => {
          if (!puede(permisoColeccion[col])) return false;
          const s = get();
          const lista = s[col] as unknown as Registro[];
          const existe = !!row.id && lista.some((r) => r.id === row.id);
          if (col === 'talentos' && !existe) return error('El talento nace con su registro en Influ: compártele la liga de registro.');
          if (col === 'agencias' && !existe) return error('La agencia nace con su registro en Influ, con su folio mercantil.');
          if (col === 'roles' && !existe) return error('Un perfil nuevo se agrega en la configuración de permisos, no desde esta pantalla.');
          const msg = validar(col, row);
          if (msg) return error(msg);

          const limpio: Registro = { ...row };
          // Lo calculado en pantalla no se guarda (02 §"Lo calculable no se guarda").
          for (const k of ['adelantado', 'confirmados', 'diasReales', 'porCobrar', 'modulos', 'aprueba', 'importes', 'handle', 'nicho', 'empresa', 'operaciones']) delete limpio[k];
          if (col === 'talentos' || col === 'empresas' || col === 'agencias') limpio.rfc = String(row.rfc).trim().toUpperCase();
          if (col === 'talentos') { limpio.curp = String(row.curp).trim().toUpperCase(); limpio.banco = bancoDeClabe(String(row.clabe)); limpio.clabe = digitos(String(row.clabe)); }
          if (col === 'agencias') { limpio.banco = bancoDeClabe(String(row.clabe)); limpio.clabe = digitos(String(row.clabe)); }
          if (col === 'empresas') {
            limpio.plazoHabitual = Number(row.plazoHabitual);
            // Una empresa en la lista 69-B queda bloqueada: sus CFDI se rechazan solos.
            limpio.lista69b = row.lista69b === true || row.lista69b === 'Sí' || en69b(String(row.rfc));
            if (limpio.lista69b) limpio.estatus = 'Bloqueada';
            if (!existe) limpio.origen = 'Catálogo';
          }
          if (col === 'usuarios') {
            if (row.rol !== 'Talento') limpio.talentoId = undefined;
            if (row.rol !== 'Agencia') limpio.agenciaId = undefined;
            if (row.rol !== 'Marca') { limpio.empresaId = undefined; limpio.permisosMarca = undefined; }
          }

          const etiqueta = String(limpio.nombre ?? limpio.razonSocial ?? limpio.id ?? '');
          if (existe) {
            const antes = lista.find((r) => r.id === row.id)!;
            set({ [col]: lista.map((r) => (r.id === row.id ? { ...r, ...limpio } : r)) } as never);
            if (col === 'empresas' && limpio.estatus === 'Bloqueada') set({ marcas: get().marcas.map((m) => (m.empresaId === row.id ? { ...m, estatus: 'Bloqueada' } : m)) });
            const dif = diferencias(antes, limpio, CAMPOS_DIF[col]);
            const accion = col === 'agencias' && antes.estatus !== limpio.estatus && limpio.estatus === 'Suspendida' ? 'Suspensión' : 'Modificación';
            log(MODULO[col], accion, `${etiqueta}${dif ? `: ${dif}.` : ': sin cambios.'}`);
            toast('Registro actualizado');
          } else {
            const prefijos: Record<string, string> = { empresas: 'EMP-', marcas: 'MAR-', usuarios: 'USR-' };
            const id = siguienteFolio(lista.map((r) => r.id), prefijos[col] ?? `${col.slice(0, 3).toUpperCase()}-`, 2);
            const alta = { ...limpio, id, ...((col === 'marcas' || col === 'empresas') && !limpio.estatus ? { estatus: 'Activa' } : {}) };
            // Las altas de usuarios entran arriba (usuarios.md §3.3); las de catálogo, al final.
            set({ [col]: col === 'usuarios' ? [alta, ...lista] : [...lista, alta] } as never);
            log(MODULO[col], 'Alta', etiqueta);
            toast('Registro capturado');
          }
          return true;
        },

        // ------------------------------------------------------------------
        // Registro (etapa 2) y preaprobación de cuentas nuevas (§2)
        // ------------------------------------------------------------------

        registrarTalento: (b) => {
          const s = get();
          if (!b.nombre.trim()) return 'Escribe tu nombre legal, como aparece en tu identificación.';
          if (!EMAIL.test(b.correo.trim())) return 'Escribe un correo válido: con él entras a Influ.';
          if (s.usuarios.some((u) => normal(u.correo) === normal(b.correo))) return 'Ese correo ya tiene cuenta en Influ. Entra con él desde "Ingresar".';
          const rfc = b.rfc.trim().toUpperCase();
          const curp = b.curp.trim().toUpperCase();
          if (!RFC_FISICA.test(rfc)) return 'El RFC de persona física lleva 13 caracteres con formato válido.';
          if (s.talentos.some((t) => t.rfc === rfc)) return `El RFC ${rfc} ya está registrado.`;
          const extranjero = b.nacionalidad === 'Extranjera';
          if (!extranjero && !CURP.test(curp)) return 'La CURP lleva 18 caracteres con formato válido.';
          if (!b.regimenFiscal) return 'Elige tu régimen fiscal.';
          if (!b.genero) return 'Elige tu género (puedes elegir "Prefiero no decir").';
          if (!/\.(jpe?g|png)$/i.test(b.foto)) return 'Sube tu foto de perfil en JPG o PNG (hasta 5 MB).';
          if (digitos(b.telefono).length !== 10) return 'El número de teléfono lleva 10 dígitos: ahí te avisamos por WhatsApp cuando se envíe un pago.';
          if (!clabeValida(b.clabe)) return 'La CLABE lleva 18 dígitos y su dígito verificador no cuadra. Cópiala de tu estado de cuenta.';
          const handles = b.handles.filter((x) => x.usuario.trim());
          if (!handles.length) return 'Registra al menos un handle de tus redes.';
          const malo = handles.find((x) => !HANDLE.test(x.usuario.trim()));
          if (malo) return `El handle de ${malo.red} va como @usuario, sin espacios.`;
          if (!b.nichos.length) return 'Elige al menos un nicho en el que te especializas.';
          if (b.nichos.includes('Otro') && !b.nichoOtro.trim()) return 'Escribe cuál es tu otro nicho.';
          if (!b.tiposContenido.length) return 'Elige al menos un tipo de contenido.';
          if (b.tiposContenido.includes('Otro') && !b.contenidoOtro.trim()) return 'Escribe qué otro tipo de contenido haces.';
          if (!b.ubicacion.pais || !b.ubicacion.estado || !b.ubicacion.ciudad) return 'Indica desde dónde creas tu contenido: país, estado y ciudad.';
          const ag = b.agenciaId ? porId(s.agencias, b.agenciaId) : undefined;
          if (b.agenciaId && (ag?.cuenta !== 'Preaprobada' || ag.estatus !== 'Activa')) return 'Esa agencia no está activa en Influ. Regístrate como independiente o elige otra.';
          if (!b.condiciones) return `Para crear tu cuenta acepta las condiciones: ${COMISION_FIJA * 100}% fijo + ${TASA_MENSUAL * 100}% mensual.`;
          if (!b.privacidad) return `Para crear tu cuenta acepta el aviso de privacidad (${VERSION_AVISO_PRIVACIDAD}).`;

          const nac = nacimientoDeRfc(rfc, curp);
          const id = siguienteFolio(s.talentos.map((t) => t.id), 'TAL-', 2);
          const fh = fhAhora();
          const t: Talento = {
            id, nombre: b.nombre.trim(), correo: b.correo.trim(), nacionalidad: extranjero ? 'Extranjera' : 'Mexicana',
            lada: b.lada || '+52', telefono: b.telefono.trim(), rfc, curp: extranjero ? '' : curp,
            regimenFiscal: b.regimenFiscal, fechaNacimiento: extranjero ? '' : nac.fecha, nacimientoPorRevisar: !extranjero && !nac.coincide || undefined, genero: b.genero, foto: b.foto,
            handles: handles.map((x) => buscarHandle(x.red, x.usuario)), nichos: b.nichos, nichoOtro: b.nichoOtro.trim() || undefined,
            tiposContenido: b.tiposContenido, contenidoOtro: b.contenidoOtro.trim() || undefined, ubicacion: b.ubicacion,
            agenciaId: ag?.id ?? '', representacion: ag ? 'Pendiente' : 'Independiente', clabe: digitos(b.clabe), banco: bancoDeClabe(b.clabe),
            consentimientos: [
              { tipo: 'Condiciones comerciales', version: VERSION_CONDICIONES, fechaHora: fh },
              { tipo: 'Aviso de privacidad', version: VERSION_AVISO_PRIVACIDAD, fechaHora: fh },
            ],
            alta: fh, cuenta: 'En revisión', resoluciones: [], estatus: 'Activo',
          };
          const u: Usuario = { id: siguienteFolio(s.usuarios.map((x) => x.id), 'USR-', 2), nombre: t.nombre, correo: t.correo, rol: 'Talento', talentoId: id, estatus: 'Activo' };
          set({ talentos: [...s.talentos, t], usuarios: [u, ...s.usuarios], usuarioId: u.id, sesion: { usuarioId: u.id, desde: fh, recordar: true } });
          const firma = { nombre: t.nombre, rol: 'Talento' as const };
          log('Registros', 'Registro', `${t.nombre} (${t.handles.map((x) => x.usuario).join(', ')} · ${t.nichos.join(', ')}). ${ag ? `Eligió a ${ag.nombre}: espera su confirmación.` : 'Independiente.'} Aceptó condiciones ${VERSION_CONDICIONES} y aviso de privacidad ${VERSION_AVISO_PRIVACIDAD}. Queda en revisión.${t.nacimientoPorRevisar ? ' RFC y CURP no coinciden en la fecha de nacimiento: marcado para revisión.' : ''}`, firma);
          toast(`Cuenta creada. El equipo de Influ la preaprueba${ag ? ` y ${ag.nombre} confirma que te representa` : ''} antes de tu primer adelanto.`, 'warn');
          return null;
        },

        agregarTalento: (b) => {
          const s = get();
          const u = usuario();
          const agenciaId = u?.rol === 'Agencia' ? u.agenciaId : s.agencias[0]?.id;
          if (!agenciaId) return 'No se encontró tu agencia.';
          if (!b.nombreArtistico.trim()) return 'Escribe el nombre artístico (como aparece en redes).';
          const handles = b.handles.filter((x) => x.usuario.trim());
          if (!handles.length) return 'Registra al menos una red con su handle.';
          const malo = handles.find((x) => !HANDLE.test(x.usuario.trim()));
          if (malo) return `El handle de ${malo.red} va como @usuario, sin espacios.`;

          const id = siguienteFolio(s.talentos.map((t) => t.id), 'TAL-', 2);
          const fh = fhAhora();
          const rfc = b.rfc.trim().toUpperCase();
          const curp = b.curp.trim().toUpperCase();
          const nac = rfc && curp ? nacimientoDeRfc(rfc, curp) : { fecha: '', coincide: true };
          const t: Talento = {
            id, nombre: b.nombre.trim(), nombreArtistico: b.nombreArtistico.trim(),
            correo: b.correo.trim(), lada: '+52', telefono: b.telefono.trim(),
            rfc, curp, regimenFiscal: b.regimenFiscal || '626 · Régimen Simplificado de Confianza',
            fechaNacimiento: nac.fecha, nacimientoPorRevisar: rfc && curp && !nac.coincide || undefined,
            genero: b.genero || 'Prefiero no decir', foto: b.foto.trim(),
            audienciaTotal: handles.reduce((m, h) => Math.max(m, h.seguidores || 0), 0), tipo: b.tipo,
            handles: handles.map((x) => ({ red: x.red, usuario: x.usuario.trim(), encontrada: HANDLE.test(x.usuario.trim()), seguidores: x.seguidores || undefined })),
            nichos: b.nichos, nichoOtro: b.nichoOtro.trim() || undefined,
            tiposContenido: b.tiposContenido, contenidoOtro: b.contenidoOtro.trim() || undefined,
            ubicacion: { pais: 'México', estado: b.ciudad === 'CDMX' ? 'Ciudad de México' : b.ciudad || 'Ciudad de México', ciudad: b.ciudad || 'CDMX' },
            agenciaId, representacion: 'Confirmada', confirmada: fh,
            clabe: '', banco: '', consentimientos: [], alta: fh, cuenta: 'En revisión', resoluciones: [], estatus: 'Activo',
          };
          set({ talentos: [...s.talentos, t] });
          const ag = porId(s.agencias, agenciaId);
          log('Talentos', 'Alta de talento', `${t.nombreArtistico} (${t.handles.map((x) => x.usuario).join(', ')}) agregado por ${ag?.nombre ?? 'la agencia'}. Queda en revisión del equipo de Influ.`);
          toast(`${t.nombreArtistico} agregado. Queda en revisión del equipo de Influ.`, 'warn');
          return null;
        },

        registrarAgencia: (b) => {
          const s = get();
          if (!b.razonSocial.trim()) return 'Escribe la razón social de la agencia.';
          const rfc = b.rfc.trim().toUpperCase();
          if (!RFC_MORAL.test(rfc)) return 'El RFC de la empresa lleva 12 caracteres con formato válido.';
          if (s.agencias.some((a) => a.rfc === rfc)) return `El RFC ${rfc} ya está registrado.`;
          if (!FOLIO_MERCANTIL.test(b.folioMercantil.trim().toUpperCase())) return 'El folio mercantil va como N-2024011563: lo encuentras en tu acta constitutiva o en la constancia del RPC.';
          if (!b.contacto.trim() || !EMAIL.test(b.correo.trim())) return 'Captura el contacto principal: nombre y correo.';
          if (s.usuarios.some((u) => normal(u.correo) === normal(b.correo))) return 'Ese correo ya tiene cuenta en Influ. Entra con él desde "Ingresar".';
          if (digitos(b.telefono).length !== 10) return 'El teléfono del contacto lleva 10 dígitos.';
          if (!clabeValida(b.clabe)) return 'La CLABE lleva 18 dígitos y su dígito verificador no cuadra: ahí recibe la agencia los adelantos que pida.';
          if (!b.avisoPago) return 'Elige a quién avisamos por WhatsApp cuando se libera un pago.';
          if (!b.condiciones) return 'Para crear la cuenta acepta las condiciones pactadas con Influ.';
          if (!b.privacidad) return `Acepta el aviso de privacidad (${VERSION_AVISO_PRIVACIDAD}).`;

          const id = siguienteFolio(s.agencias.map((a) => a.id), 'AG-', 2);
          const fh = fhAhora();
          const a: Agencia = {
            id, nombre: b.nombre.trim() || b.razonSocial.trim().split(',')[0], razonSocial: b.razonSocial.trim(), rfc, contacto: b.contacto.trim(),
            correo: b.correo.trim(), telefono: b.telefono.trim(), ciudad: b.ciudad.trim(), folioMercantil: b.folioMercantil.trim().toUpperCase(),
            clabe: digitos(b.clabe), banco: bancoDeClabe(b.clabe), condiciones: { fija: COMISION_FIJA, mensual: TASA_MENSUAL, desde: CONDICIONES_DESDE },
            avisoPago: b.avisoPago, consentimientos: [
              { tipo: 'Condiciones comerciales', version: VERSION_CONDICIONES, fechaHora: fh },
              { tipo: 'Aviso de privacidad', version: VERSION_AVISO_PRIVACIDAD, fechaHora: fh },
            ],
            alta: fh, cuenta: 'En revisión', resoluciones: [], estatus: 'Activa',
          };
          const u: Usuario = { id: siguienteFolio(s.usuarios.map((x) => x.id), 'USR-', 2), nombre: a.contacto, correo: a.correo, rol: 'Agencia', agenciaId: id, estatus: 'Activo' };
          set({ agencias: [...s.agencias, a], usuarios: [u, ...s.usuarios], usuarioId: u.id, sesion: { usuarioId: u.id, desde: fh, recordar: true } });
          log('Registros', 'Registro', `${a.nombre} (${a.rfc}), folio mercantil ${a.folioMercantil}. Aviso de pago: ${a.avisoPago.toLowerCase()}. Queda en revisión hasta la preaprobación.`, { nombre: a.contacto, rol: 'Agencia' });
          toast(`Cuenta de ${a.nombre} creada. Queda en revisión hasta que el equipo de Influ la preapruebe.`, 'warn');
          return null;
        },

        resolverCuenta: (tipo, id, decision, nota) => {
          if (!puede('preaprobacion')) return false;
          const s = get();
          const x = tipo === 'talento' ? porId(s.talentos, id) : porId(s.agencias, id);
          if (!x) return false;
          if (x.cuenta !== 'En revisión') return error(`${x.nombre} está ${x.cuenta.toLowerCase()}: solo se resuelve una cuenta en revisión.`);
          if (decision !== 'Preaprobada' && !nota.trim()) return error(decision === 'Observada' ? 'Escribe qué tiene que corregir o completar: lo ve en su panel.' : 'Escribe el motivo del rechazo: lo ve en su panel.');
          const r = { decision, usuario: yo().nombre, fechaHora: fhAhora(), nota: nota.trim() || undefined };
          const cuenta: EstadoCuenta = decision;
          if (tipo === 'talento') set({ talentos: s.talentos.map((t) => (t.id === id ? { ...t, cuenta, resoluciones: [...t.resoluciones, r] } : t)) });
          else set({ agencias: s.agencias.map((a) => (a.id === id ? { ...a, cuenta, resoluciones: [...a.resoluciones, r] } : a)) });
          correo({ para: x.correo, asunto: `Tu cuenta en Influ quedó ${decision.toLowerCase()}`, tipo: 'Resolución de cuenta' });
          log('Registros', decision === 'Preaprobada' ? 'Preaprobación' : decision === 'Observada' ? 'Observación de cuenta' : 'Rechazo de cuenta', `${x.nombre} (${tipo}): ${decision.toLowerCase()}${r.nota ? `. ${r.nota}` : '.'}`);
          const t = tipo === 'talento' ? (x as Talento) : null;
          toast(decision === 'Preaprobada'
            ? `${x.nombre} preaprobada.${t?.representacion === 'Pendiente' ? ` Falta que ${porId(s.agencias, t.agenciaId)?.nombre} confirme la representación.` : ' Ya puede pedir adelantos.'}`
            : `${x.nombre} ${decision.toLowerCase()}. Le avisamos por correo y en su panel.`, decision === 'Preaprobada' ? 'ok' : 'warn');
          return true;
        },

        actualizarPerfil: (talentoId, c) => {
          const s = get();
          const u = usuario();
          const t = porId(s.talentos, talentoId);
          if (!t) return false;
          if (u?.rol === 'Talento' && u.talentoId !== talentoId) return error('Solo puedes editar tu propio perfil.');
          if (u?.rol !== 'Talento' && !autoriza.catalogo(yo().rol)) return error('El perfil lo edita el talento o el equipo interno.');
          const rfc = (c.rfc ?? t.rfc).trim().toUpperCase();
          const curp = (c.curp ?? t.curp).trim().toUpperCase();
          if (!RFC_FISICA.test(rfc)) return error('El RFC de persona física lleva 13 caracteres con formato válido.');
          if (!CURP.test(curp)) return error('La CURP lleva 18 caracteres con formato válido.');
          if (c.clabe !== undefined && !clabeValida(c.clabe)) return error('La CLABE lleva 18 dígitos y su dígito verificador no cuadra.');
          if (c.telefono !== undefined && digitos(c.telefono).length !== 10) return error('El número de teléfono lleva 10 dígitos.');
          const handles = c.handles ? c.handles.filter((x) => x.usuario.trim()) : null;
          if (handles && !handles.length) return error('Registra al menos un handle.');
          if (handles?.some((x) => !HANDLE.test(x.usuario.trim()))) return error('Cada handle va como @usuario, sin espacios.');
          if (c.nichos && !c.nichos.length) return error('Elige al menos un nicho.');
          if (c.tiposContenido && !c.tiposContenido.length) return error('Elige al menos un tipo de contenido.');
          const nac = nacimientoDeRfc(rfc, curp);
          const nuevo: Talento = {
            ...t, rfc, curp, fechaNacimiento: nac.fecha, nacimientoPorRevisar: !nac.coincide || undefined,
            ...(c.nombre !== undefined && { nombre: c.nombre.trim() }), ...(c.regimenFiscal && { regimenFiscal: c.regimenFiscal }),
            ...(c.genero && { genero: c.genero }), ...(c.foto && { foto: c.foto }), ...(c.telefono !== undefined && { telefono: c.telefono.trim() }),
            ...(c.clabe !== undefined && { clabe: digitos(c.clabe), banco: bancoDeClabe(c.clabe) }),
            ...(handles && { handles: handles.map((x) => buscarHandle(x.red, x.usuario)) }), ...(c.nichos && { nichos: c.nichos }),
            ...(c.nichoOtro !== undefined && { nichoOtro: c.nichoOtro || undefined }), ...(c.tiposContenido && { tiposContenido: c.tiposContenido }),
            ...(c.contenidoOtro !== undefined && { contenidoOtro: c.contenidoOtro || undefined }), ...(c.ubicacion && { ubicacion: c.ubicacion }),
          };
          set({ talentos: s.talentos.map((x) => (x.id === talentoId ? nuevo : x)) });
          log('Talentos', 'Perfil actualizado', `${t.nombre}: ${diferencias(t as never, nuevo as never, [['rfc', 'RFC'], ['curp', 'CURP'], ['telefono', 'teléfono'], ['clabe', 'CLABE'], ['regimenFiscal', 'régimen'], ['genero', 'género']]) || 'perfil de creador'}.`);
          toast(t.cuenta === 'Observada' ? 'Perfil guardado. Reenvíalo a revisión cuando termines.' : 'Perfil actualizado.');
          return true;
        },

        reenviarRevision: (tipo, id) => {
          const s = get();
          const x = tipo === 'talento' ? porId(s.talentos, id) : porId(s.agencias, id);
          if (!x) return false;
          if (x.cuenta !== 'Observada') return error('Solo se reenvía una cuenta observada.');
          const r = { decision: 'Reenviada' as const, usuario: yo().nombre, fechaHora: fhAhora() };
          if (tipo === 'talento') set({ talentos: s.talentos.map((t) => (t.id === id ? { ...t, cuenta: 'En revisión', resoluciones: [...t.resoluciones, r] } : t)) });
          else set({ agencias: s.agencias.map((a) => (a.id === id ? { ...a, cuenta: 'En revisión', resoluciones: [...a.resoluciones, r] } : a)) });
          log('Registros', 'Reenvío a revisión', `${x.nombre}: corrigió lo observado y reenvió su cuenta.`);
          toast('Listo: tu cuenta vuelve a revisión del equipo de Influ.');
          return true;
        },

        confirmarRepresentacion: (talentoId) => {
          if (!puede('representacion')) return false;
          const s = get();
          const t = porId(s.talentos, talentoId);
          const u = usuario();
          if (!t) return false;
          if (t.agenciaId !== u?.agenciaId) return error(`${t.nombre} no eligió a tu agencia.`);
          if (t.representacion !== 'Pendiente') return error(`${t.nombre} ya está ${t.representacion.toLowerCase()}.`);
          const ag = porId(s.agencias, t.agenciaId);
          if (ag?.cuenta !== 'Preaprobada') return error(`${ag?.nombre ?? 'Tu agencia'} todavía no está preaprobada por el equipo de Influ.`);
          set({ talentos: s.talentos.map((x) => x.id === talentoId ? { ...x, representacion: 'Confirmada', confirmada: fhAhora() } : x) });
          log('Talentos', 'Confirmación de representación', `${t.nombre}: ${ag.nombre} confirma que lo representa.${t.cuenta === 'Preaprobada' ? ' Se habilita su primer adelanto.' : ' Falta la preaprobación de Influ.'}`);
          toast(t.cuenta === 'Preaprobada' ? `${t.nombre} confirmado. Ya puede pedir su primer adelanto.` : `${t.nombre} confirmado. Falta la preaprobación del equipo de Influ.`);
          return true;
        },

        // Provisional: pendiente #11. El talento rechazado queda como independiente.
        rechazarRepresentacion: (talentoId) => {
          if (!puede('representacion')) return false;
          const s = get();
          const t = porId(s.talentos, talentoId);
          const u = usuario();
          if (!t) return false;
          if (t.agenciaId !== u?.agenciaId || t.representacion !== 'Pendiente') return error(`${t.nombre} no está pendiente con tu agencia.`);
          const ag = porId(s.agencias, t.agenciaId);
          set({ talentos: s.talentos.map((x) => x.id === talentoId ? { ...x, agenciaId: '', representacion: 'Independiente' } : x) });
          log('Talentos', 'Rechazo de representación', `${t.nombre}: ${ag?.nombre} no lo representa. Queda como independiente.`);
          toast(`${t.nombre} queda como independiente.`, 'warn');
          return true;
        },

        cambiarAvisoPago: (agenciaId, aviso) => {
          if (!puede('preferencias')) return false;
          const a = porId(get().agencias, agenciaId);
          if (!a || usuario()?.agenciaId !== agenciaId) return error('Solo la agencia cambia su preferencia.');
          set({ agencias: get().agencias.map((x) => (x.id === agenciaId ? { ...x, avisoPago: aviso } : x)) });
          log('Agencias', 'Preferencia de aviso de pago', `${a.nombre}: WhatsApp ${a.avisoPago.toLowerCase()} → ${aviso.toLowerCase()}.`);
          toast(`Avisaremos por WhatsApp ${aviso === 'Ambos' ? 'al talento y a la agencia' : aviso === 'Agencia' ? 'a la agencia' : 'al talento'} cuando se libere un pago.`);
          return true;
        },

        /** El equipo valida una sola vez el contacto del área de pagos de la empresa. */
        verificarContactoPagos: (empresaId) => {
          if (!puede('catalogo')) return false;
          const e = porId(get().empresas, empresaId);
          if (!e?.contactoPagos) return error('La empresa no tiene contacto del área de pagos.');
          if (e.contactoPagos.verificado) return error('Ese contacto ya está verificado.');
          set({ empresas: get().empresas.map((x) => (x.id === empresaId ? { ...x, contactoPagos: { ...x.contactoPagos!, verificado: true } } : x)) });
          log('Marcas', 'Contacto verificado', `${e.razonSocial}: área de pagos ${e.contactoPagos.nombre} · ${e.contactoPagos.email}.`);
          toast('Contacto del área de pagos verificado.');
          return true;
        },

        /** Cambio 10: bloquea una marca. Las solicitudes con esa marca se rechazan sin validar el CFDI ni analizar el contrato. */
        bloquearMarca: (empresaId, motivo) => {
          if (!puede('catalogo')) return false;
          const e = porId(get().empresas, empresaId);
          if (!e) return error('No se encontró la empresa de la marca.');
          if (e.estatus === 'Bloqueada') return error('La marca ya está bloqueada.');
          if (!motivo.trim()) return error('Indica el motivo del bloqueo (No paga, Paga impuntual u otro).');
          const fh = fhAhora();
          const bloqueo = { motivo: motivo.trim(), fechaHora: fh, usuario: yo().nombre };
          set({
            empresas: get().empresas.map((x) => (x.id === empresaId ? { ...x, estatus: 'Bloqueada' as const, bloqueo } : x)),
            marcas: get().marcas.map((m) => (m.empresaId === empresaId ? { ...m, estatus: 'Bloqueada' as const } : m)),
          });
          log('Marcas', 'Marca bloqueada', `${e.razonSocial}: ${motivo.trim()}. Las nuevas solicitudes con esta marca quedan rechazadas con el motivo interno "Marca bloqueada".`);
          toast('Marca bloqueada. Las solicitudes nuevas con esta marca se rechazan.', 'warn');
          return true;
        },

        desbloquearMarca: (empresaId) => {
          if (!puede('catalogo')) return false;
          const e = porId(get().empresas, empresaId);
          if (!e) return error('No se encontró la empresa de la marca.');
          if (e.estatus !== 'Bloqueada') return error('La marca no está bloqueada.');
          set({
            empresas: get().empresas.map((x) => (x.id === empresaId ? { ...x, estatus: 'Activa' as const, bloqueo: undefined } : x)),
            marcas: get().marcas.map((m) => (m.empresaId === empresaId ? { ...m, estatus: 'Activa' as const } : m)),
          });
          log('Marcas', 'Marca desbloqueada', `${e.razonSocial}: vuelve a operar con normalidad.`);
          toast('Marca desbloqueada.');
          return true;
        },

        actualizarAgencia: (agenciaId, c) => {
          const a = porId(get().agencias, agenciaId);
          if (!a || (usuario()?.agenciaId !== agenciaId && !autoriza.agencia(yo().rol))) return error('Solo la agencia o el equipo interno editan estos datos.');
          if (c.clabe !== undefined && !clabeValida(c.clabe)) return error('La CLABE lleva 18 dígitos y su dígito verificador no cuadra.');
          if (c.correo !== undefined && !EMAIL.test(c.correo)) return error('Escribe un correo válido.');
          const nuevo = { ...a, ...c, ...(c.clabe !== undefined && { clabe: digitos(c.clabe), banco: bancoDeClabe(c.clabe) }) };
          set({ agencias: get().agencias.map((x) => (x.id === agenciaId ? nuevo : x)) });
          log('Agencias', 'Datos actualizados', `${a.nombre}: ${diferencias(a as never, nuevo as never, [['contacto', 'contacto'], ['correo', 'correo'], ['telefono', 'teléfono'], ['clabe', 'CLABE']]) || 'sin cambios'}.`);
          toast('Datos guardados.');
          return true;
        },

        // ------------------------------------------------------------------
        // Etapas 3–4: solicitud y validación automática del CFDI
        // ------------------------------------------------------------------

        capturarSolicitud: (b) => {
          if (!puede('solicitud')) return null;
          const s = get();
          const u = usuario()!;
          const tal = porId(s.talentos, u.rol === 'Talento' ? u.talentoId : b.talentoId);
          const fallo = (m: string) => { error(m); return null; };
          if (!tal) return fallo('Elige el talento de la colaboración.');
          if (u.rol === 'Agencia') {
            const ag = porId(s.agencias, u.agenciaId);
            if (ag?.cuenta !== 'Preaprobada' || ag.estatus !== 'Activa') return fallo(`${ag?.nombre ?? 'Tu agencia'} todavía no está preaprobada: el equipo de Influ la revisa antes de operar.`);
            if (tal.agenciaId !== ag.id || tal.representacion !== 'Confirmada') return fallo(`${tal.nombre} no tiene representación confirmada con ${ag.nombre}. Apruébala en Mis talentos.`);
          }
          const bloqueo = bloqueoPedir(tal, s.agencias);
          if (bloqueo) return fallo(bloqueo);

          // Marca: del catálogo (con sus datos precargados) o alta nueva desde el CFDI.
          let marca = porId(s.marcas, b.marcaId);
          let empresa = marca ? porId(s.empresas, marca.empresaId) : undefined;
          let nuevaEmpresa: Empresa | null = null;
          let nuevaMarca: Marca | null = null;
          if (!marca) {
            const n = b.marcaNueva;
            if (!n?.nombre.trim() || !n.rfc.trim()) return fallo('Elige la marca o escribe su nombre y el RFC de la empresa que paga.');
            const rfc = n.rfc.trim().toUpperCase();
            if (!RFC_MORAL.test(rfc)) return fallo('El RFC de la empresa lleva 12 caracteres con formato válido.');
            empresa = s.empresas.find((e) => e.rfc === rfc);
            if (!empresa) {
              nuevaEmpresa = { id: siguienteFolio(s.empresas.map((e) => e.id), 'EMP-', 2), razonSocial: n.razonSocial.trim() || n.nombre.trim(), rfc, lista69b: en69b(rfc), plazoHabitual: b.plazoDias || 60, origen: 'CFDI', estatus: 'En revisión' };
              empresa = nuevaEmpresa;
            }
            nuevaMarca = { id: siguienteFolio(s.marcas.map((m) => m.id), 'MAR-', 2), nombre: n.nombre.trim(), empresaId: empresa.id, industria: n.industria.trim() || 'Sin clasificar', estatus: 'En revisión' };
            marca = nuevaMarca;
          }
          // Cambio 10: una marca bloqueada no valida el CFDI ni analiza el contrato. La solicitud se rechaza con el motivo interno "Marca bloqueada".
          if (empresa?.estatus === 'Bloqueada' || marca?.estatus === 'Bloqueada') {
            log('Solicitudes de adelanto', 'Solicitud rechazada', `${marca?.nombre}: marca bloqueada. No se validó el CFDI ni se analizó el contrato.`, SISTEMA);
            return fallo('No hemos podido procesar tu solicitud de adelanto con esta marca. Prueba con otra.');
          }
          if (!(b.monto > 0)) return fallo('Captura el monto facturado.');
          if (!(b.plazoDias >= 1 && b.plazoDias <= 180)) return fallo('Captura el plazo de pago acordado con la marca, en días (1 a 180).');
          if (!b.fechaPublicacion) return fallo('Captura la fecha de publicación del contenido.');
          if (b.fechaPublicacion > sumarDias(HOY_ISO, 60)) return fallo('La fecha de publicación va dentro de los próximos 60 días.');
          const entregables = b.entregables.filter((e) => e.cantidad > 0);
          if (!entregables.length) return fallo('Agrega los entregables pactados con la marca (red, formato y cantidad).');
          if (!b.contactoPagos.nombre.trim()) return fallo('Captura el nombre del contacto del área de pagos de la marca.');
          if (!EMAIL.test(b.contactoPagos.email.trim())) return fallo('El email del área de pagos es obligatorio: ahí notificamos la cesión y hacemos la cobranza.');
          if (b.contactoMarketing?.email && !EMAIL.test(b.contactoMarketing.email)) return fallo('El email del contacto de marketing no es válido.');
          if (!/\.xml$/i.test(b.cfdiXml)) return fallo('Sube el XML del CFDI.');
          if (!/\.pdf$/i.test(b.cfdiPdf)) return fallo('Sube el PDF del CFDI.');
          if (!/\.(pdf|jpe?g|png|heic)$/i.test(b.contrato)) return fallo('Sube el contrato firmado con la marca (PDF, escaneo o foto).');

          // Regla 6: una colaboración no se adelanta dos veces.
          const dup = s.operaciones.find((o) => o.estatus !== 'Rechazada' && o.talentoId === tal.id && o.marcaId === marca!.id && o.monto === b.monto && o.fechaPublicacion === b.fechaPublicacion);
          if (dup) return fallo(`Esta colaboración ya tiene solicitud: ${dup.folio} (${dup.estatus}). Una factura no se adelanta dos veces.`);

          const folio = siguienteFolio(s.operaciones.map((o) => o.folio), 'INF-');
          const agId = tal.agenciaId && tal.representacion === 'Confirmada' ? tal.agenciaId : '';
          const ag = porId(s.agencias, agId);
          const emisor = u.rol === 'Agencia' && ag ? { rfc: ag.rfc, nombre: ag.razonSocial, regimen: '601 · General de Ley Personas Morales' } : { rfc: tal.rfc, nombre: tal.nombre, regimen: tal.regimenFiscal };
          const ents: Entregable[] = entregables.map((e, i) => ({ ...e, id: `E${i + 1}` }));
          const subtotal = redondear(b.monto / 1.16);
          const piezasTot = ents.reduce((t, e) => t + e.cantidad, 0);
          const fh = fhAhora();
          // Lectura simulada del XML: el PAC devuelve los datos estructurados del CFDI.
          const cfdi: Operacion['cfdi'] = {
            archivoXml: b.cfdiXml, archivoPdf: b.cfdiPdf, uuid: nuevoUuid(), serieFolio: `A${1000 + Number(folio.slice(-3))}`, emisor,
            receptor: { rfc: empresa!.rfc, nombre: empresa!.razonSocial, usoCfdi: 'G03 · Gastos en general' },
            conceptos: ents.map((e) => ({ descripcion: `Colaboración de contenido · ${e.cantidad} ${e.formato} ${e.red}`, cantidad: e.cantidad, importe: redondear(subtotal * e.cantidad / piezasTot) })),
            metodoPago: 'PPD', formaPago: '99 · Por definir', subtotal, iva: redondear(b.monto - subtotal), total: b.monto, fechaEmision: HOY_ISO, fechaTimbrado: fh,
          };
          const rfcsValidos = [tal.rfc, ag?.rfc ?? ''].filter(Boolean);
          const v = validarCfdi(cfdi, rfcsValidos, empresa, b.monto, s.operaciones.map((o) => o.cfdi.uuid.toUpperCase()));
          const paginas = /\.(jpe?g|png|heic)$/i.test(b.contrato) ? 3 : 4 + (hash(b.contrato) % 8);
          const lectura: AnalisisContrato['lectura'] = {
            monto: b.monto, plazoDias: b.plazoDias, razonSocial: empresa!.razonSocial, rfcMarca: empresa!.rfc, rfcTalento: emisor.rfc, firmas: true,
            kpiCondicionado: 0, penaCompensable: 0, prohibeCesion: false, retencionAmplia: false, confidencial: false, pagoACuentaTalento: false,
          };
          const op: Operacion = {
            id: folio, folio, talentoId: tal.id, agenciaId: agId, solicitante: u.rol === 'Agencia' ? 'Agencia' : 'Talento',
            marcaId: marca.id, monto: b.monto, fechaPublicacion: b.fechaPublicacion, plazoDias: b.plazoDias, entregables: ents,
            contactoPagos: { nombre: b.contactoPagos.nombre.trim(), email: b.contactoPagos.email.trim(), telefono: b.contactoPagos.telefono?.trim() || undefined },
            contactoMarketing: b.contactoMarketing?.nombre?.trim() ? { nombre: b.contactoMarketing.nombre.trim(), email: b.contactoMarketing.email.trim() } : undefined,
            capturada: fh, capturadaPor: u.nombre, cfdi,
            contrato: { archivo: b.contrato, formato: /\.pdf$/i.test(b.contrato) ? 'PDF' : 'Foto', paginas },
            validacion: { uuidVigente: v.uuidVigente, rfcEmisor: v.rfcEmisor, lista69b: v.lista69b, montoFecha: v.montoFecha, marcaVinculada: v.marcaVinculada, motivo: v.motivo, pac: PAC, fechaHora: fh },
            // Si el CFDI falla, el flujo se corta: la IA no lee el contrato.
            analisis: { estado: v.motivo ? 'Lista' : 'En curso', pagina: 0, inicio: fh, campos: [], lectura, montoBaseSugerido: 0 },
            votos: [], avisar: destinosAviso({ agenciaId: agId }, s.agencias),
            rechazo: v.motivo ? { motivo: v.motivo, fechaHora: fh, usuario: 'Sistema' } : undefined,
            estatus: v.motivo ? 'Rechazada' : 'En revisión',
          };
          // El contacto del área de pagos se guarda en la ficha de la empresa para la siguiente operación.
          const empresas = (nuevaEmpresa ? [...s.empresas, nuevaEmpresa] : s.empresas).map((e) => (e.id === empresa!.id ? {
            ...e, contactoPagos: e.contactoPagos?.email === op.contactoPagos.email ? e.contactoPagos : { ...op.contactoPagos, verificado: false },
            contactoMarketing: op.contactoMarketing ?? e.contactoMarketing,
          } : e));
          set({ operaciones: [op, ...s.operaciones], empresas, marcas: nuevaMarca ? [...s.marcas, nuevaMarca] : s.marcas });
          if (nuevaMarca) log('Marcas', 'Alta automática desde CFDI', `${nuevaMarca.nombre} (${empresa!.razonSocial}, ${empresa!.rfc}): nace con la solicitud ${folio}. Queda en revisión.`, SISTEMA);
          log(SOL, 'Captura', `${folio} ${tal.nombre} / ${marca.nombre} ${money(b.monto)}, plazo ${b.plazoDias} días, ${ents.map((e) => `${e.cantidad} ${e.formato.toLowerCase()} ${e.red}`).join(' + ')}. Área de pagos: ${op.contactoPagos.email}.`);
          if (v.motivo) {
            log(SOL, 'Validación del CFDI', `${folio} ${cfdi.serieFolio} ${marca.nombre} ${money(b.monto)}: rechazada. ${v.motivo}`, SISTEMA);
            toast(`${folio} rechazada automáticamente: ${v.motivo}`, 'warn');
          } else {
            log(SOL, 'Validación del CFDI', `${folio} ${cfdi.serieFolio} ${marca.nombre} ${money(b.monto)}: UUID vigente, RFC emisor, lista 69-B, monto y fecha en regla; marca vinculada por el RFC receptor (${PAC}).`, SISTEMA);
            toast(`${folio} enviada. La factura pasó la validación del SAT y nuestra IA ya está leyendo el contrato.`);
          }
          return folio;
        },

        /** La IA lee una página por tick; al terminar arma la ficha y consulta el RUG. */
        avanzarAnalisis: (id) => {
          const s = get();
          const op = porId(s.operaciones, id);
          if (!op || op.analisis.estado !== 'En curso') return;
          if (op.analisis.pagina + 1 < op.contrato.paginas) {
            cambiarOp(id, { analisis: { ...op.analisis, pagina: op.analisis.pagina + 1 } });
            return;
          }
          const tal = porId(s.talentos, op.talentoId)!;
          const empresa = empresaDe(s, op.marcaId)!;
          const ficha = construirFicha({
            monto: op.monto, plazoDias: op.plazoDias, fechaPublicacion: op.fechaPublicacion, capturada: op.capturada, entregables: op.entregables,
            empresa, talento: tal, agencia: porId(s.agencias, op.agenciaId), rfcEmisorCfdi: op.cfdi.emisor.rfc, evidencia: !!op.evidencia,
            lectura: op.analisis.lectura, paginas: op.contrato.paginas,
          });
          const fh = fhAhora();
          const registros = RUG_EXTERNO[tal.rfc] ?? [];
          // Doble factoraje también dentro de Influ: el mismo CFDI ya inscrito en otra operación.
          const internos = s.operaciones.filter((o) => o.id !== id && o.cfdi.uuid === op.cfdi.uuid && o.rug?.folio)
            .map((o) => ({ acreedor: INFLU.razonSocial, folio: o.rug!.folio!, fecha: o.rug!.fechaInscripcion!.slice(0, 10), descripcion: `${o.folio} · mismo CFDI` }));
          cambiarOp(id, {
            analisis: { ...op.analisis, ...ficha, estado: 'Lista', pagina: op.contrato.paginas, fin: fh },
            consultaRug: { fechaHora: fh, registros: [...registros, ...internos] },
          });
          log(SOL, 'Análisis del contrato', `${op.folio}: ficha ${ficha.semaforo.toLowerCase()} con ${ficha.campos.length} datos citados. Monto base sugerido ${money(ficha.montoBaseSugerido)}. Consulta previa del RUG: ${registros.length + internos.length ? `${registros.length + internos.length} garantía(s) previa(s)` : 'sin registros previos'} para ${tal.rfc}.`, SISTEMA);
        },

        corregirCampo: (id, clave, valor) => {
          if (!puede('ficha')) return false;
          const op = op$(id);
          if (!op || op.analisis.estado !== 'Lista') return false;
          const campo = op.analisis.campos.find((c) => c.clave === clave);
          if (!campo) return false;
          if (!valor.trim() || valor.trim() === campo.valor) return error('Escribe el dato correcto: queda registrado para medir la precisión de la IA.');
          const campos = op.analisis.campos.map((c) => (c.clave === clave ? { ...c, valor: valor.trim(), correccion: { anterior: c.correccion?.anterior ?? c.valor, usuario: yo().nombre, fechaHora: fhAhora() } } : c));
          cambiarOp(id, { analisis: { ...op.analisis, campos } });
          log(SOL, 'Corrección de la ficha', `${op.folio} · ${campo.etiqueta} (cl. ${campo.cita.clausula} · p. ${campo.cita.pagina}): "${campo.valor}" → "${valor.trim()}".`);
          toast('Corrección registrada en la ficha.');
          return true;
        },

        // ------------------------------------------------------------------
        // Etapa 5: aprobación colectiva, sin umbral de monto
        // ------------------------------------------------------------------

        votarAprobacion: (id, confirmado, montoBase) => {
          if (!puede('revision')) return false;
          const s = get();
          const op = porId(s.operaciones, id);
          if (!op) return false;
          if (op.estatus !== 'En revisión') return error(`${op.folio} está ${op.estatus.toLowerCase()}; solo se vota una solicitud en revisión.`);
          const bloqueos = bloqueosRevision(op);
          if (bloqueos.length) return error(`${op.folio} no puede aprobarse: ${bloqueos[0]} Obsérvala o recházala.`);
          const avisos = avisosRevision(op);
          if (avisos.length && !confirmado) return error(`${op.folio} tiene ${avisos.length} alerta(s) amarilla(s). Confírmalas antes de votar.`);
          const quien = yo().nombre;
          if (op.votos.some((v) => v.usuario === quien)) return error(`Ya votaste ${op.folio}. Falta el voto de otro integrante del equipo.`);
          const base = montoBase ?? op.montoBase ?? op.analisis.montoBaseSugerido;
          if (!(base > 0) || base > op.monto) return error(`El monto base va de $1 a ${money(op.monto)} (total del CFDI).`);

          const fh = fhAhora();
          const votos = [...op.votos, { usuario: quien, fechaHora: fh }];
          const confirmaciones = avisos.length ? avisos.join(' ') : op.confirmaciones;
          const cola = avisos.length ? ` Alertas verificadas: ${avisos.length}.` : '';
          const ajuste = base !== op.analisis.montoBaseSugerido ? ` Monto base ajustado a ${money(base)} (sugerido ${money(op.analisis.montoBaseSugerido)}).` : '';
          if (votos.length >= QUORUM_APROBACION) {
            cambiarOp(id, { votos, confirmaciones, montoBase: base, docusign: { enviado: fh }, estatus: 'Por firmar' });
            const b = beneficiario(op, s);
            log(SOL, 'Aprobación', `${tag(op)} ${money(op.monto)}: aprobación colectiva, voto ${votos.length} de ${QUORUM_APROBACION}.${cola}${ajuste} Documento único enviado por DocuSign a ${b.nombre}.`);
            toast(`${op.folio} aprobada en conjunto (${votos.length} votos). El documento único salió por DocuSign a ${b.nombre}.`);
          } else {
            cambiarOp(id, { votos, confirmaciones, montoBase: base });
            log(SOL, 'Voto de aprobación', `${tag(op)} ${money(op.monto)}: voto ${votos.length} de ${QUORUM_APROBACION}.${cola || ` Ficha ${op.analisis.semaforo?.toLowerCase()}.`}${ajuste}`);
            toast(`${op.folio}: voto ${votos.length} de ${QUORUM_APROBACION} registrado. Falta el voto de otro integrante del equipo.`, 'warn');
          }
          return true;
        },

        observarSolicitud: (id, nota) => {
          if (!puede('revision')) return false;
          const op = op$(id);
          if (!op) return false;
          if (op.estatus !== 'En revisión') return error(`${op.folio} está ${op.estatus.toLowerCase()}; solo se observa una solicitud en revisión.`);
          if (!nota.trim()) return error('Escribe qué tiene que corregir o subir: lo ve quien pidió el adelanto.');
          cambiarOp(id, { estatus: 'Observada', observacion: { nota: nota.trim(), fechaHora: fhAhora(), usuario: yo().nombre } });
          log(SOL, 'Observación', `${tag(op)}: ${nota.trim()}`);
          toast(`${op.folio} observada. Le avisamos a quien pidió el adelanto.`, 'warn');
          return true;
        },

        responderObservacion: (id, archivo, tipo) => {
          if (!puede('solicitud')) return false;
          const op = op$(id);
          if (!op || !deSuCartera(op) || !esSolicitante(op, 'la respuesta la sube')) return false;
          if (op.estatus !== 'Observada') return error(`${op.folio} no tiene observaciones pendientes.`);
          if (!/\.(pdf|jpe?g|png|eml)$/i.test(archivo)) return error('Sube el documento en PDF, imagen o correo (.eml).');
          const fh = fhAhora();
          const observacion = { ...op.observacion!, respondida: fh };
          if (tipo === 'consentimiento') {
            cambiarOp(id, { consentimientoMarca: archivo, observacion, estatus: 'En revisión' });
            log(SOL, 'Consentimiento de la marca', `${op.folio}: ${archivo}. Vuelve a revisión del equipo.`);
          } else {
            // Contrato corregido: la IA lo vuelve a leer completo.
            cambiarOp(id, { contrato: { ...op.contrato, archivo }, observacion, estatus: 'En revisión', votos: [], analisis: { ...op.analisis, estado: 'En curso', pagina: 0, inicio: fh, fin: undefined, campos: [], lectura: { ...op.analisis.lectura, monto: op.monto, plazoDias: op.plazoDias, prohibeCesion: false } } });
            log(SOL, 'Contrato corregido', `${op.folio}: ${archivo}. La IA vuelve a leer el contrato.`);
          }
          toast(`${op.folio} vuelve a revisión del equipo.`);
          return true;
        },

        rechazarSolicitud: (id, motivo) => {
          if (!puede('revision')) return false;
          const op = op$(id);
          if (!op) return false;
          if (!['En revisión', 'Observada', 'Por firmar'].includes(op.estatus)) return error(`${op.folio} ya está ${op.estatus.toLowerCase()}; no se rechaza.`);
          if (!motivo.trim()) return error('Escribe el motivo del rechazo: lo ve quien pidió el adelanto.');
          cambiarOp(id, { estatus: 'Rechazada', rechazo: { motivo: motivo.trim(), fechaHora: fhAhora(), usuario: yo().nombre } });
          log(SOL, 'Rechazo', `${tag(op)} ${money(op.monto)}: ${motivo.trim()}`);
          toast(`${op.folio} rechazada`, 'warn');
          return true;
        },

        // ------------------------------------------------------------------
        // Etapas 6–7: firma, notificación de la cesión y RUG
        // ------------------------------------------------------------------

        firmarDocumento: (id) => {
          if (!puede('solicitud')) return false;
          const op = op$(id);
          if (!op || !deSuCartera(op) || !esSolicitante(op, 'la firma')) return false;
          if (op.estatus !== 'Por firmar') return error(`${op.folio} no tiene documento por firmar: está ${op.estatus.toLowerCase()}.`);
          const fh = fhAhora();
          // Al firmar el documento único (contrato de factoraje con los anexos A, B
          // y C en un solo sobre de DocuSign): queda la cola del RUG. La instrucción
          // irrevocable de pago es un documento aparte que se firma enseguida en el
          // paso Aceptación de marca (cambio 1).
          cambiarOp(id, {
            docusign: { ...op.docusign!, firmado: fh, firmo: yo().nombre }, estatus: 'Firmada',
            rug: { estado: 'En cola', modalidad: MODALIDAD_RUG, enCola: fh },
          });
          log('Contratos', 'Firma del documento único', `${op.folio}: contrato de factoraje con sus anexos A (copia de la factura), B (pagaré no negociable) y C (acuerdo de firma electrónica) firmado en un solo sobre de DocuSign.`);
          log('RUG', 'En cola', `${op.folio}: datos precargados para inscribir la cesión (modalidad ${MODALIDAD_RUG.toLowerCase()}).`, SISTEMA);
          toast(`${op.folio} firmado. Ahora firma la instrucción irrevocable de pago en el paso Aceptación de marca.`);
          return true;
        },

        firmarInstruccion: (id) => {
          if (!puede('solicitud')) return false;
          const op = op$(id);
          if (!op || !deSuCartera(op) || !esSolicitante(op, 'la firma la')) return false;
          if (op.estatus !== 'Firmada') return error(`${op.folio}: la instrucción se firma después de firmar el documento único.`);
          if (op.cesion) return error(`${op.folio}: la instrucción irrevocable de pago ya está firmada.`);
          const fh = fhAhora();
          cambiarOp(id, { cesion: { email: op.contactoPagos.email, firmada: { fechaHora: fh, firmo: yo().nombre }, enviada: fh, reenvios: [] } });
          correo({ operacionId: id, para: op.contactoPagos.email, asunto: `Instrucción irrevocable de pago · CFDI ${op.cfdi.serieFolio}`, tipo: 'Notificación de cesión' });
          log('Instrucciones de pago', 'Instrucción de pago firmada y enviada', `${op.folio}: ${yo().nombre} firmó la instrucción irrevocable de pago (formato v1.0). Enviada a ${op.contactoPagos.email}, con copia a la agencia y a Influ: pagar a ${INFLU.razonSocial}, CLABE ${INFLU.clabe}.`);
          toast(`${op.folio}: instrucción irrevocable firmada y enviada a ${nombreMar(op.marcaId)}. El adelanto se libera cuando la marca la confirme.`);
          return true;
        },

        registrarAperturaContrato: (id, accion) => {
          const op = op$(id);
          if (!op) return;
          log('Contratos', accion === 'Descarga' ? 'Descarga del documento' : 'Apertura del documento', `${op.folio}: ${accion === 'Descarga' ? 'descarga' : 'apertura'} de ${nombreArchivoContrato(op)} (documento único con anexos A, B y C).`);
        },

        registrarAperturaCesion: (id) => {
          const op = op$(id);
          if (!op?.cesion || op.cesion.abierta) return false;
          cambiarOp(id, { cesion: { ...op.cesion, entregada: op.cesion.entregada ?? op.cesion.enviada, abierta: fhAhora() } });
          log('Instrucciones de pago', 'Apertura', `${op.folio}: ${op.cesion.email} abrió la instrucción de pago.`, SISTEMA);
          toast(`${op.folio}: la marca abrió la instrucción de pago.`);
          return true;
        },

        registrarAcuseCesion: (id, via) => {
          const op = op$(id);
          if (!op?.cesion) return false;
          if (op.cesion.acuse) return error(`${op.folio} ya tiene confirmación.`);
          const fh = fhAhora();
          cambiarOp(id, { cesion: { ...op.cesion, entregada: op.cesion.entregada ?? op.cesion.enviada, abierta: op.cesion.abierta ?? fh, acuse: fh, acuseVia: via } });
          log('Instrucciones de pago', 'Confirmación de la marca', `${op.folio}: ${nombreMar(op.marcaId)} confirmó la instrucción irrevocable de pago (${via}). Queda la fecha y hora; el adelanto ya puede liberarse.`, SISTEMA);
          toast(`${op.folio}: ${nombreMar(op.marcaId)} confirmó la instrucción de pago.`);
          return true;
        },

        reenviarCesion: (id, automatico = false) => {
          if (!automatico && !puede('cesion')) return false;
          const op = op$(id);
          if (!op?.cesion) return false;
          if (op.cesion.acuse) return automatico ? false : error(`${op.folio} ya tiene confirmación.`);
          const fh = fhAhora();
          cambiarOp(id, { cesion: { ...op.cesion, reenvios: [...op.cesion.reenvios, { fechaHora: fh, automatico, usuario: automatico ? 'Sistema' : yo().nombre }] } });
          correo({ operacionId: id, para: op.cesion.email, asunto: `Reenvío · Instrucción irrevocable de pago · CFDI ${op.cfdi.serieFolio}`, tipo: 'Reenvío de cesión' });
          log('Instrucciones de pago', automatico ? 'Reenvío automático' : 'Reenvío', `${op.folio}: ${automatico ? 'sin confirmar en 2 días hábiles; ' : ''}reenviada a ${op.cesion.email}.${automatico ? ' Alerta al equipo.' : ''}`, automatico ? SISTEMA : undefined);
          if (!automatico) toast(`${op.folio}: instrucción de pago reenviada a ${op.cesion.email}.`);
          return true;
        },

        /** La IA lee el folio y la fecha de la boleta del RUG. */
        inscribirRug: (id, boleta) => {
          if (!puede('rug')) return false;
          const s = get();
          const op = porId(s.operaciones, id);
          if (!op) return false;
          if (op.rug?.estado !== 'En cola') return error(`${op.folio} no está en la cola del RUG.`);
          if (!/\.(pdf|png|jpe?g)$/i.test(boleta)) return error('Sube la boleta del RUG (PDF o imagen) con su sello de tiempo.');
          const fh = fhAhora();
          let n = 5000 + (hash(`${op.folio}${boleta}`) % 9000);
          const usados = new Set(s.operaciones.map((o) => o.rug?.folio).filter(Boolean));
          while (usados.has(`RUG-2026-${String(n).padStart(6, '0')}`)) n++;
          const folio = `RUG-2026-${String(n).padStart(6, '0')}`;
          cambiarOp(id, { rug: { ...op.rug, estado: 'Inscrita', folio, fechaInscripcion: fh, vigencia: sumarDias(HOY_ISO, 365), boleta, usuario: yo().nombre } });
          log('RUG', 'Inscripción en el RUG', `${op.folio}: cesión inscrita con folio ${folio} (leído de ${boleta}), vigente al ${formatDate(sumarDias(HOY_ISO, 365))}.`);
          toast(`${op.folio} inscrita en el RUG con ${folio}.`);
          return true;
        },

        actualizarRug: (id) => {
          if (!puede('rug')) return false;
          const op = op$(id);
          if (!op?.rug || op.rug.estado !== 'Inscrita') return error('Solo se actualiza una inscripción vigente.');
          const vigencia = sumarDias(HOY_ISO, 365);
          const accion = op.estatus === 'Liquidada' ? 'Actualizada' : undefined;
          cambiarOp(id, { rug: { ...op.rug, vigencia, ...(accion && { estado: 'Actualizada', cierre: { accion, fechaHora: fhAhora(), usuario: yo().nombre } }) } });
          log('RUG', 'Actualización en el RUG', `${op.folio} (${op.rug.folio}): vigencia extendida al ${formatDate(vigencia)}.`);
          toast(`${op.rug.folio} actualizada: vigente al ${formatDate(vigencia)}.`);
          return true;
        },

        cancelarRug: (id) => {
          if (!puede('rug')) return false;
          const op = op$(id);
          if (!op?.rug || op.rug.estado !== 'Inscrita') return error('Solo se cancela una inscripción vigente.');
          if (op.estatus !== 'Liquidada') return error(`${op.folio} sigue abierta: la inscripción se cancela al cerrar la operación.`);
          cambiarOp(id, { rug: { ...op.rug, estado: 'Cancelada', cierre: { accion: 'Cancelada', fechaHora: fhAhora(), usuario: yo().nombre } } });
          log('RUG', 'Cancelación en el RUG', `${op.folio} (${op.rug.folio}): cancelada al cerrar la operación.`);
          toast(`${op.rug.folio} cancelada.`);
          return true;
        },

        // ------------------------------------------------------------------
        // Etapa 8: links de publicación, métricas y evidencia
        // ------------------------------------------------------------------

        cargarPieza: (opId, entregableId, indice, link, capturas) => {
          if (!puede('solicitud')) return false;
          const s = get();
          const op = porId(s.operaciones, opId);
          if (!op || !deSuCartera(op) || !esSolicitante(op, 'los links los carga')) return false;
          if (op.estatus !== 'Firmada' || op.evidencia) return error(`${op.folio} recibe los links después de la firma y antes de enviar la evidencia.`);
          const e = op.entregables.find((x) => x.id === entregableId);
          const tal = porId(s.talentos, op.talentoId)!;
          if (!e) return false;
          const fh = fhAhora();
          const marca = nombreMar(op.marcaId);
          let verificacion: Pieza['verificacion'];
          if (!link.trim()) return error('Pega el link de la publicación.');
          if (e.formato === 'Story') {
            // Cambio 21: las historias también van por link; la copia del contenido se guarda al recibirlo (24 h).
            const fechaOk = op.fechaPublicacion <= HOY_ISO;
            verificacion = { existe: true, cuenta: true, fecha: fechaOk, mencion: true, ok: fechaOk, motivo: fechaOk ? 'Link de la story recibido · copia guardada para el análisis' : 'La story todavía no se publica.', fechaHora: fh };
          } else {
            verificacion = verificarLink(link, e.red, tal, marca, op.fechaPublicacion);
          }
          void capturas;
          const base = Math.max(...tal.handles.map((x) => x.seguidores ?? 0), 10_000);
          const clave = `${op.folio}-${e.id}-${indice}-${link}`;
          const snaps = verificacion.ok ? snapshotsHasta(clave, fh, e.formato, base) : [];
          const existente = s.piezas.find((p) => p.operacionId === opId && p.entregableId === entregableId && p.indice === indice);
          const pieza: Pieza = {
            id: existente?.id ?? nuevoId('PZ'), operacionId: opId, entregableId, indice, red: e.red, formato: e.formato,
            link: link.trim(), capturas: undefined,
            publicada: op.fechaPublicacion, verificacion, snapshots: snaps, fotos: {},
          };
          set({ piezas: existente ? s.piezas.map((p) => (p.id === existente.id ? pieza : p)) : [...s.piezas, pieza] });
          log(SOL, 'Link de publicación', `${op.folio} · ${e.formato} ${indice} ${e.red}: ${verificacion.ok ? `verificada (cuenta, fecha y mención). ${snaps[0]?.vistas.toLocaleString('es-MX') ?? 0} vistas al cargar.` : `sin verificar: ${verificacion.motivo}`}`);
          if (verificacion.ok) toast(`${e.formato} ${indice}: verificada · ${verificacion.motivo}`);
          else toast(`${e.formato} ${indice}: ${verificacion.motivo}`, 'warn');
          return verificacion.ok;
        },

        enviarEvidencia: (id, e) => {
          if (!puede('solicitud')) return false;
          const s = get();
          const op = porId(s.operaciones, id);
          if (!op || !deSuCartera(op) || !esSolicitante(op, 'la evidencia la sube')) return false;
          if (op.estatus !== 'Firmada') return error(`${op.folio} recibe evidencia después de firmar el documento.`);
          if (op.evidencia) return error(`${op.folio} ya tiene evidencia.`);
          const piezas = s.piezas.filter((p) => p.operacionId === id);
          const sug = sugerencia(op, piezas);
          if (!sug.verificados) return error('Carga y verifica al menos una publicación antes de enviar la evidencia.');
          if (!e.aprobacionMarca) return error('Sube la aprobación de la marca (email o brief aprobado).');
          if (e.alcance === 'Campaña completa' && !sug.completa) return error(`Solo ${sug.verificados} de ${sug.total} entregables están verificados: confirma "Parcial" o carga los links que faltan.`);
          if (e.alcance === 'Hitos parciales' && !(e.porcentaje >= 1 && e.porcentaje <= 99)) return error('Indica qué porcentaje de lo pactado ya está cumplido (1 a 99).');
          const evidencia: Evidencia = {
            aprobacionMarca: e.aprobacionMarca, sugerencia: { verificados: sug.verificados, total: sug.total }, alcance: e.alcance,
            porcentaje: e.alcance === 'Campaña completa' ? 100 : Math.round(e.porcentaje), fechaHora: fhAhora(), usuario: yo().nombre,
          };
          cambiarOp(id, { evidencia });
          const nueva = { ...op, evidencia };
          log(SOL, 'Evidencia', `${op.folio} ${nombreMar(op.marcaId)}: ${sug.verificados} de ${sug.total} entregables verificados; sugerencia ${sug.completa ? 'completa' : 'parcial'}, confirmó ${evidencia.alcance.toLowerCase()}${evidencia.alcance === 'Hitos parciales' ? ` (${evidencia.porcentaje}%)` : ''}. Adelanto de ${money(montoAdelanto(nueva))}.`);
          const faltan = faltantesLiberar(nueva);
          toast(`Evidencia de ${op.folio} enviada. ${faltan.length ? `Antes de liberar falta: ${faltan.join(', ')}.` : `El equipo prepara la orden de pago por ${money(montoAdelanto(nueva))}.`}`);
          return true;
        },

        // ------------------------------------------------------------------
        // Etapas 9 y 13: órdenes de pago manuales con doble control (§9)
        // ------------------------------------------------------------------

        prepararOrden: (opId, tipo, cuentaId) => {
          if (!puede('dispersion')) return false;
          const s = get();
          const op = porId(s.operaciones, opId);
          if (!op) return false;
          if (ordenDe(opId, tipo, s.ordenes)) return error(`${op.folio} ya tiene orden de ${tipo === 'Adelanto' ? 'adelanto' : 'liquidación'}.`);
          const cuenta = porId(s.cuentas, cuentaId);
          if (!cuenta) return error('Selecciona la cuenta de origen del SPEI.');
          const b = beneficiario(op, s);
          if (!clabeValida(b.clabe)) return error(`La CLABE de ${b.nombre} no pasa el dígito verificador. Corrígela antes de pagar.`);
          let monto: number;
          if (tipo === 'Adelanto') {
            if (op.estatus !== 'Firmada') return error(`${op.folio} está ${op.estatus.toLowerCase()}: el 80% se libera con el documento firmado.`);
            const faltan = faltantesLiberar(op);
            if (faltan.length) return error(`${op.folio} no se libera: falta ${faltan.join(', ')}.`);
            monto = montoAdelanto(op);
          } else {
            const p = s.cxp.find((x) => x.operacionId === opId);
            if (!p || p.pago) return error(`${op.folio} no tiene remanente por pagar.`);
            const bloqueo = bloqueoCxP(p, s.operaciones, s.cxc, s.marcas);
            if (bloqueo) return error(bloqueo);
            monto = liquidacion(op, cxcDe(opId, s.cxc)).neto;
          }
          if (cuenta.saldo < monto) return error(`${cuenta.banco} ${cuenta.cuenta} no tiene saldo para ${money(monto)}.`);
          const orden: OrdenPago = {
            id: nuevoId('OP'), operacionId: opId, tipo, beneficiario: { tipo: b.tipo, nombre: b.nombre, clabe: b.clabe, banco: b.banco }, monto,
            referencia: `${op.folio}-${tipo === 'Adelanto' ? 'A' : 'L'}`,
            concepto: tipo === 'Adelanto' ? `Adelanto 80% · CFDI ${op.cfdi.serieFolio}` : `Liquidación 20% neta · CFDI ${op.cfdi.serieFolio}`,
            cuentaId, preparo: { usuario: yo().nombre, fechaHora: fhAhora() }, estatus: 'Por autorizar',
          };
          set({ ordenes: [orden, ...s.ordenes] });
          log('Pagos', 'Orden de pago preparada', `${orden.referencia} ${money(monto)} a ${b.nombre} (CLABE ···${b.clabe.slice(-4)}, ${b.banco}) desde ${cuenta.banco} ${cuenta.cuenta}. Espera la autorización de otra persona.`);
          toast(`Orden ${orden.referencia} preparada por ${money(monto)}. La autoriza otra persona del equipo.`);
          return true;
        },

        autorizarOrden: (ordenId) => {
          if (!puede('dispersion')) return false;
          const o = porId(get().ordenes, ordenId);
          if (!o) return false;
          if (o.estatus !== 'Por autorizar') return error(`${o.referencia} ya está ${o.estatus.toLowerCase()}.`);
          if (o.preparo.usuario === yo().nombre) return error(`Tú preparaste ${o.referencia}: la autoriza otra persona del equipo (doble control).`);
          set({ ordenes: get().ordenes.map((x) => (x.id === ordenId ? { ...x, autorizo: { usuario: yo().nombre, fechaHora: fhAhora() }, estatus: 'Autorizada' } : x)) });
          log('Pagos', 'Orden de pago autorizada', `${o.referencia} ${money(o.monto)} a ${o.beneficiario.nombre}. Preparó ${o.preparo.usuario}; autoriza ${yo().nombre}. Se transfiere en la banca en línea y se sube el CEP.`);
          toast(`${o.referencia} autorizada. Haz la transferencia en la banca en línea y sube el CEP de Banxico.`);
          return true;
        },

        cargarCep: (ordenId, archivo) => {
          if (!puede('dispersion')) return false;
          const s = get();
          const o = porId(s.ordenes, ordenId);
          if (!o) return false;
          if (o.estatus !== 'Autorizada') return error(o.estatus === 'Pagada' ? `${o.referencia} ya tiene CEP.` : `${o.referencia} necesita la autorización de una segunda persona antes del CEP.`);
          if (!/\.(pdf|xml)$/i.test(archivo)) return error('Sube el CEP de Banxico (PDF o XML).');
          const op = porId(s.operaciones, o.operacionId)!;
          const cuenta = porId(s.cuentas, o.cuentaId)!;
          if (cuenta.saldo < o.monto) return error(`${cuenta.banco} ${cuenta.cuenta} no tiene saldo para ${money(o.monto)}.`);
          const fh = fhAhora();
          const claveRastreo = `INF${HOY_ISO.replace(/-/g, '')}${op.folio.slice(-5).replace('-', '0')}${o.tipo === 'Remanente' ? 'R' : ''}`;
          const pagada: OrdenPago = { ...o, cep: { archivo, claveRastreo, fechaHora: fh, usuario: yo().nombre }, estatus: 'Pagada' };
          set({ ordenes: s.ordenes.map((x) => (x.id === ordenId ? pagada : x)) });
          log('Pagos', 'CEP cargado', `${o.referencia}: ${archivo}, clave de rastreo ${claveRastreo}.`);
          const enviados = o.tipo === 'Adelanto' ? ejecutarAdelanto(op, pagada) : ejecutarRemanente(op, pagada);
          const fallidos = enviados.filter((m) => m.estatus === 'Fallido');
          if (fallidos.length) toast(`${op.folio}: ${money(o.monto)} pagados. El WhatsApp a ${fallidos.map((m) => m.nombre).join(', ')} no se entregó; reenvíalo desde Alertas.`, 'warn');
          else toast(`${op.folio}: ${money(o.monto)} pagados a ${o.beneficiario.nombre}.${enviados.length ? ` Aviso por WhatsApp a ${enviados.map((m) => m.nombre).join(' y ')}.` : ''}${o.tipo === 'Remanente' ? ' Operación cerrada.' : ''}`);
          return true;
        },

        // ------------------------------------------------------------------
        // Etapa 12: la marca paga a Influ; registro y conciliación
        // ------------------------------------------------------------------

        registrarCobro: (cxcId, monto, referencia, cuentaId) => {
          if (!puede('cobro')) return false;
          const s = get();
          const c = porId(s.cxc, cxcId);
          if (!c) return false;
          const saldo = saldoCxC(c);
          if (!(monto > 0) || monto > saldo + 0.01) return error(`El abono debe ser mayor a cero y no exceder el saldo de ${money(saldo)}.`);
          const cuenta = porId(s.cuentas, cuentaId);
          if (!cuenta) return error('Selecciona la cuenta donde entró el cobro.');
          const op = porId(s.operaciones, c.operacionId)!;
          const ref = referencia.trim() || 'Abono';
          // Conciliación: la referencia de la carta (folio) o el monto exacto del saldo.
          const conciliado = ref.toUpperCase().includes(op.folio.slice(-4)) || Math.abs(monto - saldo) < 0.01;
          const liquida = monto >= saldo - 0.01;
          const nuevoSaldo = redondear(saldo - monto);
          set({
            cxc: s.cxc.map((x) => (x.id === cxcId ? { ...x, abonos: [...x.abonos, { fecha: HOY_ISO, monto, referencia: ref, cuentaId, conciliado }] } : x)),
            cuentas: s.cuentas.map((x) => (x.id === cuentaId ? { ...x, saldo: redondear(x.saldo + monto) } : x)),
            operaciones: liquida ? s.operaciones.map((o) => (o.id === op.id ? { ...o, estatus: 'Por liquidar' } : o)) : s.operaciones,
          });
          correo({ operacionId: op.id, para: op.contactoPagos.email, asunto: `Pago recibido · ${c.documento} · ${money(monto)}`, tipo: 'Pago recibido' });
          log('Pagos', liquida ? 'Pago de la marca' : 'Abono parcial de la marca', `${c.documento} ${money(monto)} (${ref}) a ${cuenta.banco} ${cuenta.cuenta}, ${conciliado ? 'conciliado' : 'por conciliar'}. Saldo ${money(nuevoSaldo)}.${liquida ? ` ${op.folio} queda por liquidar.` : ''} Aviso de pago recibido a ${op.contactoPagos.email}.`);
          toast(liquida ? `${op.folio}: ${nombreMar(op.marcaId)} pagó ${c.documento}. La liquidación del 20% queda lista para orden de pago.` : `${op.folio}: abono de ${money(monto)} de ${nombreMar(op.marcaId)}. Falta ${money(nuevoSaldo)}.`);
          return true;
        },

        reenviarMensaje: (id) => {
          if (!puede('mensajes')) return false;
          const m = porId(get().mensajes, id);
          if (!m) return false;
          if (m.estatus !== 'Fallido') return error('Ese aviso ya se entregó.');
          if (digitos(m.telefono).length < 10) return error(`${m.nombre} no tiene un WhatsApp válido. Corrígelo en su ficha antes de reenviar.`);
          set({ mensajes: get().mensajes.map((x) => (x.id === id ? { ...x, estatus: 'Enviado', fechaHora: fhAhora() } : x)) });
          const op = porId(get().operaciones, m.operacionId);
          log('Notificaciones', 'Reenvío de aviso', `${op?.folio}: WhatsApp "${m.tipo.toLowerCase()}" reenviado a ${m.nombre} (${m.telefono}).`);
          toast(`Aviso reenviado a ${m.nombre}.`);
          return true;
        },

        reiniciarDemo: () => {
          set({ ...datosIniciales(), toasts: [] });
          // El marketplace (Fase 2) tiene su propio store: escucha este evento.
          try { window.dispatchEvent(new Event('influ:reiniciar')); } catch { /* sin window */ }
          get().toast('Demo reiniciada');
        },
      };
    },
    {
      name: 'influ',
      // Cada vez que un dato cambie de forma, sube la versión: el estado viejo se reinicia a la semilla.
      // v3: comisión 8%, agencias con nombres ficticios y una sola factura vencida (cambios 4 y 8).
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: () => ({ ...datosIniciales(), usuarioId: 'USR-01', sesion: null }) as unknown as InfluState,
      partialize: (s) => {
        const { toasts: _toasts, ...resto } = s;
        return resto as InfluState;
      },
    },
  ),
);

export function usuarioActual(state: InfluState) {
  return state.usuarios.find((u) => u.id === state.usuarioId);
}

export function rolActual(state: InfluState): RolUsuario {
  return usuarioActual(state)?.rol ?? 'Dirección General';
}

/** El perfil actual ve importes. */
export function useVeImportes() {
  return veImportes(useInflu(rolActual));
}

/** Estado filtrado a la cartera que el usuario puede ver (regla 20). */
export function useVista() {
  const s = useInflu();
  const u = usuarioActual(s);
  return useMemo(() => vista(s, u), [s, u]);
}

/** La sesión vale si se pidió recordar o si sigue abierta la pestaña donde se inició. */
export function sesionValida(s: InfluState) {
  if (!s.sesion) return false;
  if (s.sesion.recordar) return true;
  try { return sessionStorage.getItem('influ-sesion') === '1'; } catch { return true; }
}
