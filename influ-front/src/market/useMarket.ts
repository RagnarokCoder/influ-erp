import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useInflu } from '../store/useInflu';
import { HOY_ISO, d, sumarDias } from '../data/constantes';
import type { RolUsuario, Usuario } from '../data/types';
import { ahora, money } from '../lib/format';
import { seedMarket } from './seed';
import {
  FEE_INFLU, MUESTREO_CADA, PESOS, UMBRAL_MUESTREO, asociada, fee, fueraDeCondiciones, generarBrief, nuevoUuid, protegerCanal,
  revisarContenido, scoreMatch, serieKpis, sinAcentos, token, totalLineas, validarCfdiInflu,
} from './logic';
import type {
  Aviso, BitacoraMk, Brief, BriefEstructurado, Caso, ComponentesScore, Condiciones, Contratacion, Conversacion, CuentaMarca, LineaPrecio,
  Oferta, PermisoMk, Postulacion, Ranking, UsoMk,
} from './types';

type Datos = typeof seedMarket & { pesos: ComponentesScore };

export interface BorradorOferta {
  lineas: LineaPrecio[];
  fechas: { contenido: string; publicacion: string };
  rondas: number;
  usos: { tipos: UsoMk[]; meses: number; territorio: string };
  exclusividad: { dias: number; categoria: string };
  kpis: string;
  consecuencia: string;
}

interface Acciones {
  reiniciar: () => void;
  // Equipo Influ
  invitarMarca: (empresaId: string, condicion: CuentaMarca['condicion']) => string | null;
  cambiarCondicion: (empresaId: string, condicion: CuentaMarca['condicion']) => boolean;
  revisarRanking: (rankingId: string, incluidos: string[]) => boolean;
  ajustarPesos: (p: ComponentesScore) => void;
  registrarFactura: (facturaId: string) => boolean;
  registrarPagoMarca: (facturaId: string) => boolean;
  reintentarDispersion: (ctId: string) => boolean;
  chequeoDiario: () => number;
  revisarPublicacion: (ctId: string, ok: boolean, nota: string) => boolean;
  resolverCaso: (id: string, nota: string) => boolean;
  abrirDisputa: (ctId: string, detalle: string) => boolean;
  crearPropuesta: (empresaId: string, titulo: string) => string | null;
  editarPropuesta: (id: string, creadorIds: string[]) => boolean;
  enviarPropuesta: (id: string) => boolean;
  // Alta de la marca (por invitación)
  completarAlta: (tokenInv: string, datos: { marcas: string[]; equipo: CuentaMarca['equipo']; contactoPagos: CuentaMarca['contactoPagos'] }, paso: 'empresa' | 'equipo' | 'pagos') => boolean;
  guardarEquipo: (empresaId: string, equipo: CuentaMarca['equipo']) => boolean;
  // Marca
  crearBrief: (empresaId: string, marca: string, titulo: string, texto: string) => string | null;
  editarBrief: (id: string, campo: string, cambio: Partial<BriefEstructurado>, antes: string, despues: string) => boolean;
  publicarBrief: (id: string, modo: Brief['modo']) => boolean;
  preseleccionar: (postId: string, si: boolean) => boolean;
  abrirChat: (briefId: string, creadorId: string) => string | null;
  agregarCopia: (convId: string, nombre: string, email: string) => boolean;
  aprobarContenido: (ctId: string) => boolean;
  pedirCambios: (ctId: string, nota: string) => boolean;
  firmarAcuerdo: (ctId: string) => boolean;
  calificar: (ctId: string, estrellas: number, nota: string) => boolean;
  verPropuesta: (tokenP: string) => void;
  aceptarPropuesta: (tokenP: string, por: string, quitar: string[], copias: string[]) => string | null;
  // Chat y oferta
  enviarMensaje: (convId: string, texto: string, comoToken?: string) => boolean;
  enviarOferta: (convId: string, o: BorradorOferta) => boolean;
  aceptarOferta: (convId: string, comoToken?: string) => boolean;
  rechazarOferta: (convId: string) => boolean;
  // Creador y agencia
  asociarRed: (creadorId: string, red: string, si: boolean) => boolean;
  guardarCondiciones: (creadorId: string, c: Condiciones) => boolean;
  postular: (briefId: string, creadorId: string, lineas: LineaPrecio[], fechas: Postulacion['fechas'], usos: UsoMk[], mensaje: string) => boolean;
  confirmarPostulacion: (postId: string, lineas?: LineaPrecio[]) => boolean;
  subirCfdi: (ctId: string, archivo: string, uuid: string, rfcEmisor: string, monto: number) => boolean;
  entregarContenido: (ctId: string, archivo: string, duracion: number, texto: string) => boolean;
  avisarPublicacion: (ctId: string) => boolean;
}

export type MarketState = Datos & Acciones;

const inicial = (): Datos => ({ ...JSON.parse(JSON.stringify(seedMarket)), pesos: { ...PESOS } });

const sig = (ids: string[], prefijo: string, relleno = 2) =>
  `${prefijo}${String(ids.map((x) => Number(x.replace(/\D/g, '')) || 0).reduce((m, n) => Math.max(m, n), 0) + 1).padStart(relleno, '0')}`;

// ---------------------------------------------------------------------------
// Quién está operando (sale del store principal)
// ---------------------------------------------------------------------------

export function yoMk(): { u?: Usuario; rol: RolUsuario; nombre: string } {
  const s = useInflu.getState() as unknown as { usuarios?: Usuario[]; usuarioId?: string };
  const u = s.usuarios?.find((x) => x.id === s.usuarioId);
  return { u, rol: u?.rol ?? 'Dirección General', nombre: u?.nombre ?? 'Sistema' };
}
export const esEquipo = (rol: RolUsuario) => rol === 'Dirección General' || rol === 'Equipo interno';

/** Permisos del usuario de marca: los define el administrador de la cuenta. */
export function permisosEn(cuenta: CuentaMarca | undefined, u: Usuario | undefined): PermisoMk[] {
  if (!u || u.rol !== 'Marca' || !cuenta || u.empresaId !== cuenta.empresaId) return [];
  const n = sinAcentos(u.nombre);
  const fila = cuenta.equipo.find((e) => sinAcentos(e.email) === sinAcentos(u.correo) || n.startsWith(sinAcentos(e.nombre)) || sinAcentos(e.nombre).startsWith(n));
  return fila?.permisos ?? (u.permisosMarca as PermisoMk[] | undefined) ?? [];
}

/** El creador ligado al talento del usuario. */
export const creadorDeUsuario = (s: Datos, u?: Usuario) => (u?.talentoId ? s.creadores.find((c) => c.talentoId === u.talentoId) : undefined);

/** Estado efectivo: una oferta enviada se vence sola. */
export const estadoOferta = (o: Oferta): Oferta['estado'] =>
  (o.estado === 'Enviada' || o.estado === 'Contraoferta') && o.vence < HOY_ISO ? 'Vencida' : o.estado;
export const ofertaVigente = (c: Conversacion) => c.ofertas[c.ofertas.length - 1];
export const aceptada = (c: Conversacion) => c.ofertas.some((o) => o.estado === 'Aceptada');

/** Crédito usado por la empresa: facturas de Influ sin pagar. */
export const creditoUsado = (s: Datos, empresaId: string) =>
  s.facturas.filter((f) => f.empresaId === empresaId && !f.pagada).reduce((t, f) => t + f.total, 0);

/** Lo que falta para que el pago salga solo (MVP Fase 2 §11). */
export function faltaParaDispersar(s: Datos, ct: Contratacion) {
  const f: string[] = [];
  if (!ct.acuerdo.marca || !ct.acuerdo.creador) f.push('acuerdo de colaboración firmado por ambas partes');
  const cuenta = s.cuentas.find((c) => c.empresaId === ct.empresaId);
  const factura = s.facturas.find((x) => x.briefId === ct.briefId);
  if (cuenta?.condicion.tipo === 'Prepago' && !factura?.pagada) f.push('prepago de la marca recibido');
  if (cuenta?.condicion.tipo === 'Plazo' && creditoUsado(s, ct.empresaId) > cuenta.condicion.limite) f.push('crédito disponible de la marca');
  if (!ct.cfdi?.validado) f.push(`CFDI de ${ct.beneficiario.nombre} a Influ validado`);
  return f;
}

export function modoRevision(s: Datos): 'Completa' | 'Muestreo' {
  const h = s.historialDistribuciones.slice(-30);
  return h.length >= 10 && h.filter(Boolean).length / h.length >= UMBRAL_MUESTREO ? 'Muestreo' : 'Completa';
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => {
      const toast = (t: string, tipo: 'ok' | 'warn' | 'error' = 'ok') => (useInflu.getState() as unknown as { toast?: (a: string, b: string) => void }).toast?.(t, tipo);
      const error = (t: string) => { toast(t, 'error'); return false; };
      const log = (modulo: string, accion: string, detalle: string, usuario = yoMk().nombre) => {
        const b: BitacoraMk = { id: `BM-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, fechaHora: ahora().fechaHora, usuario, modulo, accion, detalle };
        set({ bitacora: [b, ...get().bitacora] });
      };
      const avisar = (canal: Aviso['canal'], para: string, texto: string) =>
        set({ avisos: [{ id: `AV-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, canal, para, texto, fechaHora: ahora().fechaHora }, ...get().avisos] });
      const soloEquipo = () => esEquipo(yoMk().rol) || error(`Tu perfil (${yoMk().rol}) no autoriza esta operación. La hace el equipo de Influ.`);
      const cuentaDe = (empresaId: string) => get().cuentas.find((c) => c.empresaId === empresaId);
      const nombreEmpresa = (empresaId: string) => {
        const s = useInflu.getState() as unknown as { empresas?: { id: string; razonSocial: string }[] };
        return s.empresas?.find((e) => e.id === empresaId)?.razonSocial ?? cuentaDe(empresaId)?.marcas[0] ?? empresaId;
      };
      const conPermiso = (empresaId: string, p: PermisoMk, que: string) => {
        const { u, rol } = yoMk();
        if (rol !== 'Marca') return error(`${que} lo hace un usuario de la marca con permiso "${p}".`);
        if (u?.empresaId !== empresaId) return error('Esa campaña no es de tu empresa.');
        const ps = permisosEn(cuentaDe(empresaId), u);
        return ps.includes(p) || error(`Tu usuario no tiene el permiso "${p}". El administrador de la cuenta lo asigna en Equipo.`);
      };
      const cambiarCt = (id: string, c: Partial<Contratacion>) => set({ contrataciones: get().contrataciones.map((x) => (x.id === id ? { ...x, ...c } : x)) });
      const cambiarConv = (id: string, c: Partial<Conversacion>) => set({ conversaciones: get().conversaciones.map((x) => (x.id === id ? { ...x, ...c } : x)) });
      const creador = (id: string) => get().creadores.find((c) => c.id === id);
      const brief = (id: string) => get().briefs.find((b) => b.id === id);

      /** ¿El usuario actual es el creador (o su agencia) de esta contratación? */
      const delLadoCreador = (creadorId: string, soloAgencia = false) => {
        const { u, rol } = yoMk();
        const c = creador(creadorId);
        if (rol === 'Agencia' && c?.agenciaId && u?.agenciaId === c.agenciaId) return true;
        if (!soloAgencia && rol === 'Talento' && c?.talentoId && u?.talentoId === c.talentoId) return true;
        return false;
      };

      const distribuir = (r: Ranking, incluidos: string[], usuario?: string) => {
        const s = get();
        const b = brief(r.briefId)!;
        const sugeridos = r.items.filter((i) => i.sugeridoIA).map((i) => i.creadorId);
        const cambios = sugeridos.filter((x) => !incluidos.includes(x)).length + incluidos.filter((x) => !sugeridos.includes(x)).length;
        const fh = ahora().fechaHora;
        const ya = new Set(s.postulaciones.filter((p) => p.briefId === b.id).map((p) => p.creadorId));
        const nuevas: Postulacion[] = b.modo.invitacion ? incluidos.filter((id) => !ya.has(id)).map((creadorId, i) => ({
          id: sig([...s.postulaciones.map((p) => p.id)], 'PO-', 3).replace(/\d+$/, (n) => String(Number(n) + i).padStart(3, '0')),
          briefId: b.id, creadorId, origen: 'Invitado', estado: 'Invitado', lineas: [], fechas: { contenido: b.estructurado.fechas.desde, publicacion: b.estructurado.fechas.hasta }, usos: [], mensaje: '', fecha: fh,
        })) : [];
        set({
          rankings: s.rankings.map((x) => x.id === r.id ? { ...x, items: x.items.map((i) => ({ ...i, incluido: incluidos.includes(i.creadorId) })), revision: usuario ? { usuario, fechaHora: fh, cambios } : x.revision, distribuido: fh } : x),
          briefs: s.briefs.map((x) => x.id === b.id ? { ...x, estado: 'Publicado', distribuido: fh, publicado: x.publicado ?? fh } : x),
          postulaciones: [...s.postulaciones, ...nuevas],
          historialDistribuciones: usuario ? [...s.historialDistribuciones, cambios === 0].slice(-60) : s.historialDistribuciones,
        });
        for (const n of nuevas) avisar('WhatsApp', creador(n.creadorId)?.handle ?? '', `Influ: ${b.marca} te invitó a "${b.titulo}". Ve el brief en Oportunidades.`);
        log('Matching', 'Distribución', `${b.marca} · ${b.titulo}: ${b.modo.invitacion ? `invitados ${nuevas.length}` : 'sin invitaciones'}${b.modo.abierto ? ', abierto a postulaciones' : ''}${usuario ? `; ${cambios ? `${cambios} cambios al ranking de la IA` : 'sin cambios al ranking de la IA'}` : '; revisión por muestreo: salió sin revisión'}.`);
        return nuevas.length;
      };

      const intentarDispersion = (ctId: string) => {
        const s = get();
        const ct = s.contrataciones.find((x) => x.id === ctId)!;
        const falta = faltaParaDispersar(s, ct);
        const fh = ahora().fechaHora;
        if (falta.length) {
          cambiarCt(ctId, { dispersion: { estado: 'Retenida', fechaHora: fh, motivo: `Falta ${falta.join(', ')}`, via: 'SPEI vía API (STP)' } });
          log('Pagos', 'Dispersión retenida', `${creador(ct.creadorId)?.handle}: falta ${falta.join(', ')}.`, 'Sistema');
          toast(`Contenido aprobado, pero el pago queda retenido: falta ${falta.join(', ')}. ${falta.some((x) => x.includes('CFDI')) ? `Lo sube ${ct.beneficiario.nombre}.` : 'Lo resuelve el equipo de Influ.'}`, 'warn');
          return false;
        }
        const referencia = `MKT${HOY_ISO.replace(/-/g, '')}${ct.id.replace(/\D/g, '')}`;
        cambiarCt(ctId, { dispersion: { estado: 'Pagada', fechaHora: fh, referencia, via: 'SPEI vía API (STP)' }, estado: 'Pagada' });
        avisar('WhatsApp', ct.beneficiario.nombre, `Influ: ${nombreEmpresa(ct.empresaId)} aprobó tu contenido. Enviamos ${money(ct.tarifa)} por SPEI (${referencia}).`);
        avisar('Email', ct.beneficiario.nombre, `Pago de ${money(ct.tarifa)} enviado. Publica en tu cuenta asociada en la fecha pactada: la detectamos sola.`);
        log('Pagos', 'Dispersión automática', `${money(ct.tarifa)} a ${ct.beneficiario.nombre} por ${creador(ct.creadorId)?.handle} (SPEI vía API) al aprobar la marca el contenido.`, 'Sistema');
        toast(`Pago automático: ${money(ct.tarifa)} a ${ct.beneficiario.nombre}${ct.beneficiario.tipo === 'Agencia' ? ` por ${creador(ct.creadorId)?.nombre.split(' ')[0]}` : ''}. Sale por SPEI en minutos.`);
        return true;
      };

      return {
        ...inicial(),

        reiniciar: () => set({ ...inicial() }),

        // ------------------------------------------------------------------
        // Equipo Influ
        // ------------------------------------------------------------------

        invitarMarca: (empresaId, condicion) => {
          if (!soloEquipo()) return null;
          if (cuentaDe(empresaId)) { error('Esa empresa ya tiene cuenta o invitación en el marketplace.'); return null; }
          if (condicion.tipo === 'Plazo' && !(condicion.limite > 0 && condicion.dias > 0)) { error('Un plazo necesita días y límite de crédito. Por omisión la condición es prepago.'); return null; }
          const t = token();
          const c: CuentaMarca = { empresaId, marcas: [], estado: 'Invitada', invitada: { por: yoMk().nombre, fechaHora: ahora().fechaHora, token: t }, pasos: { empresa: false, equipo: false, pagos: false }, condicion, contactoPagos: { nombre: '', email: '' }, equipo: [] };
          set({ cuentas: [...get().cuentas, c] });
          log('Marcas', 'Invitación', `${nombreEmpresa(empresaId)}: invitada con ${condicion.tipo === 'Prepago' ? 'prepago' : `plazo de ${condicion.dias} días y límite de ${money(condicion.limite)}`}.`);
          toast(`Invitación creada. La marca configura su cuenta desde el link /invitacion/${t}.`);
          return t;
        },

        cambiarCondicion: (empresaId, condicion) => {
          if (!soloEquipo()) return false;
          const c = cuentaDe(empresaId);
          if (!c) return false;
          if (condicion.tipo === 'Plazo' && !(condicion.limite > 0 && condicion.dias > 0)) return error('El plazo necesita días y un límite de crédito.');
          set({ cuentas: get().cuentas.map((x) => x.empresaId === empresaId ? { ...x, condicion } : x) });
          log('Marcas', 'Condición de pago', `${nombreEmpresa(empresaId)}: ${c.condicion.tipo} → ${condicion.tipo}${condicion.tipo === 'Plazo' ? ` ${condicion.dias} días, límite ${money(condicion.limite)}` : ''}.`);
          toast('Condición de pago actualizada.');
          return true;
        },

        revisarRanking: (rankingId, incluidos) => {
          if (!soloEquipo()) return false;
          const r = get().rankings.find((x) => x.id === rankingId);
          if (!r || r.distribuido) return error('Ese ranking ya se distribuyó.');
          if (!incluidos.length) return error('Elige al menos un creador para distribuir el brief.');
          const conflicto = r.items.find((i) => incluidos.includes(i.creadorId) && i.conflicto);
          if (conflicto) return error(`${creador(conflicto.creadorId)?.handle} tiene un conflicto de exclusividad (${conflicto.conflicto}): no se le distribuye.`);
          const n = distribuir(r, incluidos, yoMk().nombre);
          toast(`Brief distribuido: ${n} invitaciones enviadas.`);
          return true;
        },

        ajustarPesos: (p) => { set({ pesos: p }); log('Matching', 'Pesos', `Pesos del score: ${Object.entries(p).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}.`); toast('Pesos del matching actualizados: aplican a los siguientes rankings.'); },

        registrarFactura: (facturaId) => {
          if (!soloEquipo()) return false;
          const f = get().facturas.find((x) => x.id === facturaId);
          if (!f) return false;
          if (f.uuid) return error('La factura ya tiene UUID registrado.');
          const c = cuentaDe(f.empresaId);
          const emitida = HOY_ISO;
          set({ facturas: get().facturas.map((x) => x.id === facturaId ? { ...x, uuid: nuevoUuid(facturaId + emitida), emitida, vence: c?.condicion.tipo === 'Plazo' ? sumarDias(emitida, c.condicion.dias) : emitida } : x) });
          log('Pagos', 'Factura registrada', `${f.campana}: Influ facturó ${money(f.total)} desde su contabilidad; UUID registrado en la plataforma.`);
          toast(`UUID de la factura de ${f.campana} registrado.`);
          return true;
        },

        registrarPagoMarca: (facturaId) => {
          if (!soloEquipo()) return false;
          const f = get().facturas.find((x) => x.id === facturaId);
          if (!f || f.pagada) return error('Esa factura ya está pagada.');
          set({ facturas: get().facturas.map((x) => x.id === facturaId ? { ...x, pagada: HOY_ISO } : x) });
          log('Pagos', 'Pago de la marca', `${f.campana}: ${money(f.total)} recibidos.`);
          toast(`Pago de ${f.campana} registrado.`);
          // Con el prepago, lo retenido sale solo.
          get().contrataciones.filter((c) => c.briefId === f.briefId && c.dispersion?.estado === 'Retenida').forEach((c) => intentarDispersion(c.id));
          return true;
        },

        reintentarDispersion: (ctId) => (soloEquipo() ? intentarDispersion(ctId) : false),

        chequeoDiario: () => {
          // Lo que en producción corre cada 24 h: publicaciones que no aparecieron.
          const s = get();
          let n = 0;
          for (const ct of s.contrataciones) {
            const conv = s.conversaciones.find((c) => c.id === ct.convId);
            const of = conv?.ofertas.find((o) => o.version === ct.oferta);
            if (ct.dispersion?.estado !== 'Pagada' || ct.publicacion || ct.incumplimiento || !of || of.fechas.publicacion >= HOY_ISO) continue;
            const id = sig(get().casos.map((c) => c.id), 'CS-');
            const caso: Caso = { id, tipo: 'Incumplimiento', contratacionId: ct.id, titulo: `Publicación no detectada · ${creador(ct.creadorId)?.handle}`, detalle: `Debía publicarse el ${of.fechas.publicacion}. Consecuencia pactada: ${of.consecuencia}.`, abierto: ahora().fechaHora, estado: 'Abierto' };
            set({
              casos: [caso, ...get().casos],
              creadores: get().creadores.map((c) => c.id === ct.creadorId ? { ...c, historial: [...c.historial, { campana: brief(ct.briefId)?.titulo ?? '', vistas: 0, aTiempo: false }] } : c),
            });
            cambiarCt(ct.id, { incumplimiento: id, publicacion: { estado: 'No detectada', fechaHora: ahora().fechaHora, checks: [{ ok: false, nivel: 'falla', texto: 'No apareció en la cuenta asociada en la fecha pactada' }] } });
            avisar('Email', nombreEmpresa(ct.empresaId), `Alerta: ${creador(ct.creadorId)?.handle} no publicó en la fecha pactada. Abrimos un caso de incumplimiento.`);
            log('Moderación', 'Incumplimiento', `${creador(ct.creadorId)?.handle}: publicación no detectada; ${of.consecuencia}.`, 'Sistema');
            n++;
          }
          toast(n ? `${n} caso${n === 1 ? '' : 's'} de incumplimiento abierto${n === 1 ? '' : 's'}.` : 'Chequeo diario: todas las publicaciones vencidas aparecieron.', n ? 'warn' : 'ok');
          return n;
        },

        revisarPublicacion: (ctId, ok, nota) => {
          if (!soloEquipo()) return false;
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct?.publicacion) return false;
          cambiarCt(ctId, { publicacion: { ...ct.publicacion, estado: ok ? 'Verificada' : 'Con observaciones', revisadaPor: yoMk().nombre, checks: [...ct.publicacion.checks, { ok, nivel: ok ? 'ok' : 'aviso', texto: `Revisión manual: ${nota || (ok ? 'cumple' : 'no cumple')}` }] } });
          if (!ok) {
            const id = sig(get().casos.map((c) => c.id), 'CS-');
            set({ casos: [{ id, tipo: 'Incumplimiento', contratacionId: ctId, titulo: `Publicación no coincide · ${creador(ct.creadorId)?.handle}`, detalle: nota, abierto: ahora().fechaHora, estado: 'Abierto' }, ...get().casos] });
            cambiarCt(ctId, { incumplimiento: id });
          }
          log('Publicaciones', 'Revisión manual', `${creador(ct.creadorId)?.handle}: ${ok ? 'verificada' : 'con observaciones'}. ${nota}`);
          toast(ok ? 'Publicación verificada: arrancan los KPIs.' : 'Se abrió un caso de incumplimiento con alerta a la marca.', ok ? 'ok' : 'warn');
          return true;
        },

        resolverCaso: (id, nota) => {
          if (!soloEquipo()) return false;
          if (!nota.trim()) return error('Escribe la resolución: queda en la bitácora.');
          const c = get().casos.find((x) => x.id === id);
          set({ casos: get().casos.map((x) => x.id === id ? { ...x, estado: 'Resuelto', resolucion: { nota, usuario: yoMk().nombre, fechaHora: ahora().fechaHora } } : x) });
          log('Moderación', 'Caso resuelto', `${c?.titulo}: ${nota}`);
          toast('Caso resuelto.');
          return true;
        },

        abrirDisputa: (ctId, detalle) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          if (!detalle.trim()) return error('Describe la disputa: la revisa el equipo de Influ.');
          const id = sig(get().casos.map((c) => c.id), 'CS-');
          set({ casos: [{ id, tipo: 'Disputa', contratacionId: ctId, titulo: `Disputa · ${creador(ct.creadorId)?.handle} · ${brief(ct.briefId)?.titulo}`, detalle, abierto: ahora().fechaHora, estado: 'Abierto' }, ...get().casos] });
          log('Moderación', 'Disputa', `${creador(ct.creadorId)?.handle}: ${detalle}`);
          toast('Disputa abierta: el equipo de Influ la revisa.', 'warn');
          return true;
        },

        crearPropuesta: (empresaId, titulo) => {
          if (!soloEquipo()) return null;
          if (!titulo.trim()) { error('Ponle un título a la propuesta.'); return null; }
          const id = sig(get().propuestas.map((p) => p.id), 'PR-');
          set({ propuestas: [{ id, empresaId, token: token(), titulo, lineas: [], estado: 'Borrador', creada: ahora().fechaHora, creadaPor: yoMk().nombre, copias: [] }, ...get().propuestas] });
          log('Propuestas', 'Alta', `${titulo} para ${nombreEmpresa(empresaId)}.`);
          return id;
        },

        editarPropuesta: (id, creadorIds) => {
          if (!soloEquipo()) return false;
          const p = get().propuestas.find((x) => x.id === id);
          if (!p || p.estado === 'Aceptada') return error('La propuesta ya se aceptó.');
          const lineas = creadorIds.map((cid) => {
            const prev = p.lineas.find((l) => l.creadorId === cid);
            if (prev) return prev;
            const c = creador(cid)!;
            const tarifa = Math.round((c.condiciones.tarifas.find((t) => t.formato === 'Paquete reel + 2 stories')?.minimo ?? 50_000) * 1.1 / 1000) * 1000;
            return { creadorId: cid, vistasMin: Math.round(c.vistasMedianas * 0.92), vistasMax: Math.round(c.vistasMedianas * 1.08), cpm: c.cpmHistorico, tarifa, formato: '1 reel + 2 stories' };
          });
          set({ propuestas: get().propuestas.map((x) => x.id === id ? { ...x, lineas } : x) });
          return true;
        },

        enviarPropuesta: (id) => {
          if (!soloEquipo()) return false;
          const p = get().propuestas.find((x) => x.id === id);
          if (!p) return false;
          if (!p.lineas.length) return error('Agrega al menos un creador antes de enviar la propuesta.');
          const c = cuentaDe(p.empresaId);
          if (!c) return error(`${nombreEmpresa(p.empresaId)} no tiene cuenta en el marketplace: invítala primero en Marcas.`);
          set({ propuestas: get().propuestas.map((x) => x.id === id ? { ...x, estado: 'Enviada', enviada: ahora().fechaHora } : x) });
          avisar('Email', c.contactoPagos.email || c.equipo[0]?.email || nombreEmpresa(p.empresaId), `Influ te envió la propuesta "${p.titulo}": /propuesta/${p.token}`);
          log('Propuestas', 'Envío', `${p.titulo}: link enviado a ${nombreEmpresa(p.empresaId)}.`);
          toast(`Propuesta enviada como link: /propuesta/${p.token}`);
          return true;
        },

        // ------------------------------------------------------------------
        // Alta por invitación
        // ------------------------------------------------------------------

        completarAlta: (t, datos, paso) => {
          const c = get().cuentas.find((x) => x.invitada.token === t);
          if (!c) return error('La invitación no existe o ya venció. Pide una nueva al equipo de Influ.');
          if (paso === 'empresa' && !datos.marcas.filter((m) => m.trim()).length) return error('Agrega al menos una marca anunciante.');
          if (paso === 'equipo') {
            if (!datos.equipo.length) return error('Invita al menos a un usuario.');
            if (!datos.equipo.some((e) => e.permisos.includes('Admin'))) return error('Alguien del equipo tiene que ser administrador.');
            if (datos.equipo.some((e) => !e.email.includes('@'))) return error('Revisa los correos del equipo.');
          }
          if (paso === 'pagos' && (!datos.contactoPagos.nombre.trim() || !datos.contactoPagos.email.includes('@'))) return error('El contacto del área de pagos necesita nombre y correo: ahí llega la factura de Influ.');
          const pasos = { ...c.pasos, [paso]: true };
          const lista = pasos.empresa && pasos.equipo && pasos.pagos;
          set({ cuentas: get().cuentas.map((x) => x.invitada.token === t ? { ...x, marcas: datos.marcas.filter((m) => m.trim()), equipo: datos.equipo, contactoPagos: datos.contactoPagos, pasos, estado: lista ? 'Activa' : 'Configurando' } : x) });
          log('Marcas', 'Alta por invitación', `${nombreEmpresa(c.empresaId)}: paso "${paso}" completo${lista ? '; cuenta activa' : ''}.`, datos.equipo[0]?.nombre ?? 'Marca');
          toast(lista ? 'Cuenta lista: ya puedes publicar tu primer brief.' : 'Guardado.');
          return true;
        },

        guardarEquipo: (empresaId, equipo) => {
          if (!conPermiso(empresaId, 'Admin', 'Administrar el equipo')) return false;
          if (!equipo.some((e) => e.permisos.includes('Admin'))) return error('Debe quedar al menos un administrador.');
          if (equipo.some((e) => !e.email.includes('@') || !e.nombre.trim())) return error('Cada usuario necesita nombre y correo.');
          set({ cuentas: get().cuentas.map((x) => x.empresaId === empresaId ? { ...x, equipo } : x) });
          log('Equipo de marca', 'Permisos', `${nombreEmpresa(empresaId)}: ${equipo.map((e) => `${e.nombre} (${e.permisos.join(', ') || 'sin permisos'})`).join('; ')}.`);
          toast('Equipo y permisos guardados.');
          return true;
        },

        // ------------------------------------------------------------------
        // Marca: briefs, selección, contenido
        // ------------------------------------------------------------------

        crearBrief: (empresaId, marca, titulo, texto) => {
          const { rol, u } = yoMk();
          if (rol !== 'Marca' || u?.empresaId !== empresaId) { error('El brief lo crea un usuario de la marca.'); return null; }
          const c = cuentaDe(empresaId);
          if (c?.estado !== 'Activa') { error('Tu cuenta todavía no está activa: completa la configuración de la invitación.'); return null; }
          if (texto.trim().length < 40) { error('Cuéntale un poco más a la IA: qué creadores, qué público, qué entregables, cuándo y cuánto.'); return null; }
          const id = sig(get().briefs.map((b) => b.id), 'BR-');
          const b: Brief = { id, empresaId, marca, titulo: titulo.trim() || 'Nueva campaña', textoOriginal: texto, estructurado: generarBrief(texto, marca), ediciones: [], modo: { invitacion: true, abierto: true }, estado: 'Borrador', creado: ahora().fechaHora, creadoPor: yoMk().nombre };
          set({ briefs: [b, ...get().briefs] });
          log('Briefs', 'Brief con IA', `${marca} · ${b.titulo}: la IA estructuró el texto libre.`);
          toast('Brief estructurado. Revísalo y edita lo que haga falta antes de publicar.');
          return id;
        },

        editarBrief: (id, campo, cambio, antes, despues) => {
          const b = brief(id);
          if (!b || b.estado !== 'Borrador') return error('Solo se edita un brief en borrador.');
          set({ briefs: get().briefs.map((x) => x.id === id ? { ...x, estructurado: { ...x.estructurado, ...cambio }, ediciones: [...x.ediciones, { campo, antes, despues, usuario: yoMk().nombre, fechaHora: ahora().fechaHora }] } : x) });
          return true;
        },

        publicarBrief: (id, modo) => {
          const b = brief(id);
          if (!b) return false;
          if (!conPermiso(b.empresaId, 'Admin', 'Publicar un brief')) return false;
          if (!modo.invitacion && !modo.abierto) return error('Elige cómo se publica: por invitación, abierto a postulaciones o ambos.');
          const e = b.estructurado;
          if (!e.entregables.length || !(e.presupuesto.max > 0) || !e.fechas.desde) return error('El brief necesita entregables, presupuesto y fechas.');
          const s = get();
          const items = s.creadores.filter(asociada).map((c) => ({ c, r: scoreMatch(c, e, s.pesos) })).sort((a, z) => z.r.score - a.r.score).slice(0, 20);
          const top = Math.min(20, Math.max(e.creadores.cantidad * 3, 6));
          const r: Ranking = {
            id: sig(s.rankings.map((x) => x.id), 'RK-'), briefId: id, fechaHora: ahora().fechaHora, modo: modoRevision(s),
            items: items.map(({ c, r: x }, i) => ({ creadorId: c.id, posicion: i + 1, score: x.score, componentes: x.componentes, explicacion: x.explicacion, conflicto: x.conflicto, sobrePresupuesto: x.sobrePresupuesto, incluido: !x.conflicto && i < top, sugeridoIA: !x.conflicto && i < top })),
          };
          const conRevision = r.modo === 'Completa' || s.rankings.length % MUESTREO_CADA === 0;
          set({ rankings: [...s.rankings, r], briefs: s.briefs.map((x) => x.id === id ? { ...x, modo, estado: conRevision ? 'Revisión del matching' : 'Publicado', publicado: ahora().fechaHora } : x) });
          log('Briefs', 'Publicación', `${b.marca} · ${b.titulo}: ${modo.invitacion && modo.abierto ? 'por invitación y abierto' : modo.invitacion ? 'por invitación' : 'abierto a postulaciones'}. Ranking ${r.id} con ${r.items.length} creadores.`);
          if (conRevision) toast('Brief publicado. El equipo de Influ revisa el ranking antes de distribuirlo (lo normal es el mismo día).');
          else { distribuir(get().rankings.find((x) => x.id === r.id)!, r.items.filter((i) => i.incluido).map((i) => i.creadorId)); toast('Brief publicado y distribuido por el matching.'); }
          return true;
        },

        preseleccionar: (postId, si) => {
          const p = get().postulaciones.find((x) => x.id === postId);
          const b = p && brief(p.briefId);
          if (!p || !b || !conPermiso(b.empresaId, 'Admin', 'Preseleccionar') ) return false;
          if (!p.lineas.length) return error('Ese creador todavía no responde con presupuesto.');
          if (p.estado === 'Por confirmar agencia') return error('La agencia del talento todavía no confirma el precio.');
          set({ postulaciones: get().postulaciones.map((x) => x.id === postId ? { ...x, estado: si ? 'Preseleccionado' : 'Descartado' } : x) });
          toast(si ? `${creador(p.creadorId)?.handle} preseleccionado.` : `${creador(p.creadorId)?.handle} descartado.`);
          return true;
        },

        abrirChat: (briefId, creadorId) => {
          const b = brief(briefId);
          if (!b) return null;
          const ya = get().conversaciones.find((c) => c.briefId === briefId && c.creadorId === creadorId);
          if (ya) return ya.id;
          const { rol, u } = yoMk();
          if (rol !== 'Marca' || u?.empresaId !== b.empresaId) { error('El chat lo abre la marca desde su brief.'); return null; }
          const cu = cuentaDe(b.empresaId);
          const cr = creador(creadorId)!;
          const fh = ahora().fechaHora;
          const ag = (useInflu.getState() as unknown as { agencias?: { id: string; nombre: string; correo: string }[] }).agencias?.find((a) => a.id === cr.agenciaId);
          const id = sig(get().conversaciones.map((c) => c.id), 'CV-');
          const yoEq = cu?.equipo.find((e) => sinAcentos(u!.nombre).startsWith(sinAcentos(e.nombre)) || sinAcentos(e.email) === sinAcentos(u!.correo));
          const conv: Conversacion = {
            id, briefId, creadorId, ofertas: [], mensajes: [{ id: 'M1', autor: 'Sistema', lado: 'Sistema', texto: `${b.marca} abrió la conversación sobre "${b.titulo}".`, ocultos: 0, fechaHora: fh }],
            participantes: [
              { nombre: yoEq?.nombre ?? u!.nombre, email: yoEq?.email ?? u!.correo, lado: 'Marca', permisos: permisosEn(cu, u), enCopia: false, token: token(), agregado: { por: 'Sistema', fechaHora: fh } },
              { nombre: cr.nombre, email: `${cr.handle.slice(1)}@creadores.influ.mx`, lado: 'Creador', permisos: [], enCopia: false, token: token(), agregado: { por: 'Sistema', fechaHora: fh } },
              ...(ag ? [{ nombre: ag.nombre, email: ag.correo, lado: 'Agencia' as const, permisos: [], enCopia: false, token: token(), agregado: { por: 'Sistema', fechaHora: fh } }] : []),
            ],
            registro: [{ quien: u!.nombre, que: 'abrió el chat', fechaHora: fh }],
          };
          set({ conversaciones: [...get().conversaciones, conv], postulaciones: get().postulaciones.map((p) => p.briefId === briefId && p.creadorId === creadorId && ['Nueva', 'Invitado', 'Sin respuesta'].includes(p.estado) && p.lineas.length ? { ...p, estado: 'Preseleccionado' } : p) });
          return id;
        },

        agregarCopia: (convId, nombre, email) => {
          const c = get().conversaciones.find((x) => x.id === convId);
          const b = c && brief(c.briefId);
          if (!c || !b) return false;
          const { rol, u } = yoMk();
          if (rol !== 'Marca' || u?.empresaId !== b.empresaId) return error('A la conversación suma participantes la marca.');
          if (!email.includes('@')) return error('Escribe un correo válido.');
          if (c.participantes.some((p) => sinAcentos(p.email) === sinAcentos(email))) return error('Esa persona ya está en la conversación.');
          const eq = cuentaDe(b.empresaId)?.equipo.find((e) => sinAcentos(e.email) === sinAcentos(email));
          const p = { nombre: nombre.trim() || eq?.nombre || email, email, lado: 'Marca' as const, permisos: eq?.permisos ?? ['Comenta' as PermisoMk], enCopia: true, token: token(), agregado: { por: u.nombre, fechaHora: ahora().fechaHora } };
          cambiarConv(convId, { participantes: [...c.participantes, p], registro: [...c.registro, { quien: u.nombre, que: `sumó en copia a ${p.nombre}`, fechaHora: ahora().fechaHora }] });
          avisar('Email', email, `Te sumaron en copia a la conversación con ${creador(c.creadorId)?.handle}. Acceso directo sin cuenta: /hilo/${p.token}`);
          toast(`${p.nombre} recibe copia de los mensajes y un acceso directo al hilo (/hilo/${p.token}).`);
          return true;
        },

        aprobarContenido: (ctId) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          if (!conPermiso(ct.empresaId, 'Aprueba contenido', 'Aprobar contenido')) return false;
          const e = ct.entregas[ct.entregas.length - 1];
          if (e?.estado !== 'En revisión') return error('No hay contenido en revisión.');
          const fh = ahora().fechaHora;
          cambiarCt(ctId, { entregas: ct.entregas.map((x) => x.id === e.id ? { ...x, estado: 'Aprobada', decision: { usuario: yoMk().nombre, fechaHora: fh } } : x), aprobada: { usuario: yoMk().nombre, fechaHora: fh } });
          const conv = get().conversaciones.find((c) => c.id === ct.convId);
          if (conv) cambiarConv(conv.id, { registro: [...conv.registro, { quien: yoMk().nombre, que: `aprobó el contenido (ronda ${e.ronda})`, fechaHora: fh }] });
          log('Contenidos', 'Aprobación', `${creador(ct.creadorId)?.handle} · ronda ${e.ronda}: aprobado por ${yoMk().nombre}.`);
          intentarDispersion(ctId);
          return true;
        },

        pedirCambios: (ctId, nota) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct || !conPermiso(ct.empresaId, 'Aprueba contenido', 'Pedir cambios')) return false;
          if (!nota.trim()) return error('Escribe qué cambios pides: el creador los ve en su entrega.');
          const e = ct.entregas[ct.entregas.length - 1];
          const rondas = get().conversaciones.find((c) => c.id === ct.convId)?.ofertas.find((o) => o.version === ct.oferta)?.rondas ?? 2;
          if (e?.estado !== 'En revisión') return error('No hay contenido en revisión.');
          if (e.ronda >= rondas) return error(`Se agotaron las ${rondas} rondas pactadas en la oferta. Aprueba el contenido o abre una disputa con el equipo de Influ.`);
          cambiarCt(ctId, { entregas: ct.entregas.map((x) => x.id === e.id ? { ...x, estado: 'Cambios pedidos', decision: { usuario: yoMk().nombre, fechaHora: ahora().fechaHora, nota } } : x), estado: 'En producción' });
          avisar('WhatsApp', creador(ct.creadorId)?.handle ?? '', `Influ: la marca pidió cambios (ronda ${e.ronda} de ${rondas}): ${nota}`);
          log('Contenidos', 'Cambios pedidos', `${creador(ct.creadorId)?.handle} · ronda ${e.ronda}: ${nota}`);
          toast(`Cambios pedidos. Queda${rondas - e.ronda === 1 ? '' : 'n'} ${rondas - e.ronda} ronda${rondas - e.ronda === 1 ? '' : 's'}.`, 'warn');
          return true;
        },

        firmarAcuerdo: (ctId) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          const { rol } = yoMk();
          const fh = ahora().fechaHora;
          if (rol === 'Marca') {
            if (!conPermiso(ct.empresaId, 'Aprueba ofertas', 'Firmar el acuerdo')) return false;
            if (ct.acuerdo.marca) return error('La marca ya firmó.');
            cambiarCt(ctId, { acuerdo: { ...ct.acuerdo, marca: fh } });
          } else if (delLadoCreador(ct.creadorId)) {
            const c = creador(ct.creadorId);
            if (c?.agenciaId && rol === 'Talento') return error('Por un talento representado firma su agencia.');
            if (ct.acuerdo.creador) return error('Ya firmaste el acuerdo.');
            cambiarCt(ctId, { acuerdo: { ...ct.acuerdo, creador: fh } });
          } else return error('El acuerdo lo firman la marca y el creador (o su agencia).');
          const n = get().contrataciones.find((x) => x.id === ctId)!;
          if (n.acuerdo.marca && n.acuerdo.creador) cambiarCt(ctId, { estado: 'En producción' });
          log('Acuerdos', 'Firma electrónica', `${creador(ct.creadorId)?.handle}: firmó ${rol === 'Marca' ? 'la marca' : 'el lado del creador'}.`);
          toast(n.acuerdo.marca && n.acuerdo.creador ? 'Acuerdo de colaboración firmado por ambas partes.' : 'Firma registrada. Falta la otra parte.');
          return true;
        },

        calificar: (ctId, estrellas, nota) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          if (!ct.publicacion || ct.publicacion.estado === 'No detectada') return error('Se califica al cierre, con la publicación verificada.');
          if (!(estrellas >= 1 && estrellas <= 5)) return error('Elige de 1 a 5 estrellas.');
          const { rol } = yoMk();
          const lado: 'marca' | 'creador' | null = rol === 'Marca' ? 'marca' : delLadoCreador(ct.creadorId) ? 'creador' : null;
          if (!lado) return error('Califican la marca y el creador (o su agencia).');
          if (lado === 'marca' && !conPermiso(ct.empresaId, 'Admin', 'Calificar')) return false;
          if (ct.calificaciones[lado]) return error('Ya calificaste esta colaboración.');
          const cal = { ...ct.calificaciones, [lado]: { estrellas, nota } };
          const cierra = !!cal.marca && !!cal.creador;
          cambiarCt(ctId, { calificaciones: cal, estado: cierra ? 'Cerrada' : ct.estado });
          if (cierra) {
            const ult = ct.snapshots[ct.snapshots.length - 1];
            set({ creadores: get().creadores.map((c) => c.id === ct.creadorId ? { ...c, historial: [...c.historial, { campana: `${brief(ct.briefId)?.marca} · ${brief(ct.briefId)?.titulo}`, vistas: ult?.vistas ?? 0, aTiempo: ct.publicacion?.estado === 'Verificada' }] } : c) });
            log('Cierre', 'Calificación mutua', `${creador(ct.creadorId)?.handle}: ciclo cerrado; queda como dato de entrenamiento del matching.`, 'Sistema');
          }
          toast(cierra ? 'Colaboración cerrada: el ciclo alimenta el matching.' : 'Calificación registrada. Falta la de la otra parte.');
          return true;
        },

        verPropuesta: (t) => {
          const p = get().propuestas.find((x) => x.token === t);
          if (p && p.estado === 'Enviada') set({ propuestas: get().propuestas.map((x) => x.token === t ? { ...x, estado: 'Vista', vista: ahora().fechaHora } : x) });
        },

        aceptarPropuesta: (t, por, quitar, copias) => {
          const s = get();
          const p = s.propuestas.find((x) => x.token === t);
          if (!p || !['Enviada', 'Vista'].includes(p.estado)) { error('La propuesta ya no está disponible.'); return null; }
          if (!por.trim()) { error('Escribe tu nombre para aceptar.'); return null; }
          const lineas = p.lineas.filter((l) => !quitar.includes(l.creadorId));
          if (!lineas.length) { error('Deja al menos un creador en la propuesta.'); return null; }
          const cu = cuentaDe(p.empresaId)!;
          const fh = ahora().fechaHora;
          const briefId = sig(s.briefs.map((b) => b.id), 'BR-');
          const e = generarBrief(`${lineas.length} creadores. Un reel y dos stories cada uno. Presupuesto entre ${Math.round(totalLineasP(lineas) * 0.9 / 1000)} y ${Math.round(totalLineasP(lineas) / 1000)} mil.`, cu.marcas[0] ?? 'marca');
          const b: Brief = { id: briefId, empresaId: p.empresaId, marca: cu.marcas[0] ?? nombreEmpresa(p.empresaId), titulo: p.titulo.split('·').pop()!.trim(), textoOriginal: `Propuesta de venta directa ${p.id}`, estructurado: e, ediciones: [], modo: { invitacion: true, abierto: false }, estado: 'Publicado', creado: fh, creadoPor: por, publicado: fh, distribuido: fh };
          const marcaPart = cu.equipo.filter((x) => x.permisos.includes('Admin') || x.permisos.includes('Aprueba ofertas'));
          const convs: Conversacion[] = lineas.map((l, i) => {
            const cr = creador(l.creadorId)!;
            const reel = Math.round(l.tarifa * 0.8 / 1000) * 1000;
            return {
              id: sig([...s.conversaciones.map((c) => c.id)], 'CV-').replace(/\d+$/, (n) => String(Number(n) + i).padStart(2, '0')),
              briefId, creadorId: l.creadorId,
              participantes: [
                ...marcaPart.map((m) => ({ nombre: m.nombre, email: m.email, lado: 'Marca' as const, permisos: m.permisos, enCopia: false, token: token(), agregado: { por: 'Sistema', fechaHora: fh } })),
                ...copias.filter((x) => x.includes('@')).map((x) => ({ nombre: x, email: x, lado: 'Marca' as const, permisos: ['Comenta' as PermisoMk], enCopia: true, token: token(), agregado: { por, fechaHora: fh } })),
                { nombre: cr.nombre, email: `${cr.handle.slice(1)}@creadores.influ.mx`, lado: 'Creador' as const, permisos: [], enCopia: false, token: token(), agregado: { por: 'Sistema', fechaHora: fh } },
              ],
              mensajes: [{ id: 'M1', autor: 'Influ', lado: 'Influ', texto: `${por} aceptó la propuesta de venta directa "${p.titulo}". Esta es la oferta para ${cr.handle}.`, ocultos: 0, fechaHora: fh }],
              ofertas: [{ version: 1, autor: 'Influ · venta directa', lado: 'Marca', lineas: [{ formato: 'Reel', red: 'Instagram', cantidad: 1, precio: reel }, { formato: 'Story', red: 'Instagram', cantidad: 2, precio: l.tarifa - reel }], fechas: { contenido: d(14), publicacion: d(21) }, rondas: 2, usos: { tipos: ['Orgánico'], meses: 6, territorio: 'México' }, exclusividad: { dias: 0, categoria: '' }, kpis: `Vistas estimadas ${Math.round(l.vistasMin / 1000)}–${Math.round(l.vistasMax / 1000)} k`, consecuencia: 'Si no publica en la fecha pactada: republicación en 48 h o devolución del pago', estado: 'Enviada', fechaHora: fh, vence: d(7), alertas: fueraDeCondiciones(cr.condiciones, { lineas: [], usos: { tipos: ['Orgánico'], meses: 6, territorio: 'México' }, exclusividad: { dias: 0, categoria: '' }, rondas: 2, fechas: { contenido: d(14), publicacion: d(21) } }) }],
              registro: [{ quien: por, que: 'aceptó la propuesta de venta directa', fechaHora: fh }, ...copias.map((x) => ({ quien: por, que: `sumó en copia a ${x}`, fechaHora: fh }))],
            };
          });
          set({
            briefs: [b, ...s.briefs], conversaciones: [...s.conversaciones, ...convs],
            postulaciones: [...s.postulaciones, ...lineas.map((l, i) => ({ id: `PO-V${p.id.slice(3)}${i}`, briefId, creadorId: l.creadorId, origen: 'Invitado' as const, estado: 'Preseleccionado' as const, lineas: [{ formato: 'Reel' as const, red: 'Instagram' as const, cantidad: 1, precio: l.tarifa }], fechas: { contenido: d(14), publicacion: d(21) }, usos: ['Orgánico' as UsoMk], mensaje: '', fecha: fh }))],
            propuestas: s.propuestas.map((x) => x.token === t ? { ...x, estado: 'Aceptada', lineas, copias, aceptada: { por, fechaHora: fh, briefId } } : x),
          });
          log('Propuestas', 'Aceptación', `${p.titulo}: ${por} aceptó ${lineas.length} creadores${quitar.length ? ` (quitó ${quitar.length})` : ''}; se convirtió en ${lineas.length} ofertas.`, por);
          toast(`Propuesta aceptada: ${lineas.length} ofertas creadas en el chat de cada creador.`);
          return briefId;
        },

        // ------------------------------------------------------------------
        // Chat y oferta estructurada
        // ------------------------------------------------------------------

        enviarMensaje: (convId, texto, comoToken) => {
          const c = get().conversaciones.find((x) => x.id === convId);
          if (!c || !texto.trim()) return false;
          const { u, rol, nombre } = yoMk();
          const cr = creador(c.creadorId);
          let autor = nombre; let lado: 'Marca' | 'Creador' | 'Agencia' | 'Influ';
          const invitado = comoToken ? c.participantes.find((p) => p.token === comoToken) : undefined;
          if (invitado) { autor = invitado.nombre; lado = invitado.lado; }
          else if (rol === 'Marca' && u?.empresaId === brief(c.briefId)?.empresaId) lado = 'Marca';
          else if (rol === 'Agencia' && u?.agenciaId === cr?.agenciaId) lado = 'Agencia';
          else if (rol === 'Talento' && u?.talentoId === cr?.talentoId) lado = 'Creador';
          else if (esEquipo(rol)) lado = 'Influ';
          else return error('No participas en esta conversación.');
          const corto = autor.split(' ').slice(0, 2).map((x, i) => i ? `${x[0]}.` : x).join(' ');
          const proteg = aceptada(c) ? { texto, ocultos: 0 } : protegerCanal(texto, ['@' + (brief(c.briefId)?.marca ?? '').toLowerCase(), cr?.handle ?? '', ...(brief(c.briefId)?.estructurado.menciones ?? [])]);
          const fh = ahora().fechaHora;
          cambiarConv(convId, {
            mensajes: [...c.mensajes, { id: `M${c.mensajes.length + 1}`, autor: corto, lado, texto: proteg.texto, ocultos: proteg.ocultos, fechaHora: fh }],
            registro: [...c.registro, ...(invitado?.enCopia ? [{ quien: autor, que: 'comentó', fechaHora: fh }] : []), ...(proteg.ocultos ? [{ quien: 'Protección del canal', que: `ocultó ${proteg.ocultos} dato${proteg.ocultos === 1 ? '' : 's'} de contacto de ${corto}`, fechaHora: fh }] : [])],
          });
          for (const p of c.participantes.filter((x) => x.enCopia && x.email !== invitado?.email)) avisar('Email', p.email, `Copia · ${corto}: ${proteg.texto.slice(0, 80)}`);
          if (lado === 'Marca') avisar('WhatsApp', cr?.handle ?? '', `Influ: ${brief(c.briefId)?.marca} te escribió en el chat de "${brief(c.briefId)?.titulo}".`);
          if (proteg.ocultos) {
            set({ casos: [{ id: sig(get().casos.map((x) => x.id), 'CS-'), tipo: 'Moderación', convId, titulo: 'Intento de compartir datos de contacto', detalle: `${corto} escribió datos de contacto antes de aceptar la oferta; se ocultaron ${proteg.ocultos}.`, abierto: fh, estado: 'Abierto' }, ...get().casos] });
            toast('Hasta aceptar la oferta, el chat oculta correos, teléfonos y usuarios externos.', 'warn');
          }
          return true;
        },

        enviarOferta: (convId, o) => {
          const c = get().conversaciones.find((x) => x.id === convId);
          const b = c && brief(c.briefId);
          if (!c || !b) return false;
          if (aceptada(c)) return error('La oferta ya se aceptó: para cambios abre una disputa o una nueva oferta en otro brief.');
          const { rol } = yoMk();
          const cr = creador(c.creadorId)!;
          let lado: Oferta['lado'];
          if (rol === 'Marca') {
            if (!yoMk().u?.empresaId || yoMk().u?.empresaId !== b.empresaId) return error('Esa campaña no es de tu empresa.');
            const ps = permisosEn(cuentaDe(b.empresaId), yoMk().u);
            if (!ps.includes('Admin') && !ps.includes('Aprueba ofertas')) return error('Tu usuario solo comenta: envía ofertas el administrador o quien aprueba ofertas.');
            lado = 'Marca';
          } else if (delLadoCreador(c.creadorId)) {
            if (cr.agenciaId && rol === 'Talento') return error('Eres talento representado: la contraoferta la envía tu agencia, que confirma precio y condiciones.');
            lado = rol === 'Agencia' ? 'Agencia' : 'Creador';
          } else return error('Envían ofertas la marca y el creador (o su agencia).');
          const vigente = ofertaVigente(c);
          if (vigente && estadoOferta(vigente) === 'Enviada' && vigente.lado === lado) return error('Ya enviaste una oferta: espera la respuesta de la otra parte.');
          if (!o.lineas.length || o.lineas.some((l) => !(l.precio > 0) || !(l.cantidad > 0))) return error('Cada entregable lleva cantidad y precio.');
          if (!o.fechas.contenido || !o.fechas.publicacion || o.fechas.publicacion < o.fechas.contenido) return error('La publicación va después de la entrega del contenido.');
          if (!o.consecuencia.trim()) return error('Pacta qué pasa si no se publica en la fecha.');
          const alertas = fueraDeCondiciones(cr.condiciones, o);
          const fh = ahora().fechaHora;
          const version = (vigente?.version ?? 0) + 1;
          const nueva: Oferta = { ...o, version, autor: yoMk().nombre, lado, estado: vigente ? 'Contraoferta' : 'Enviada', fechaHora: fh, vence: d(7), alertas };
          const ofertas = c.ofertas.map((x) => (estadoOferta(x) === 'Enviada' || estadoOferta(x) === 'Contraoferta') ? { ...x, estado: 'Contraoferta' as const } : x);
          const quien = lado === 'Agencia' ? (useInflu.getState() as unknown as { agencias?: { id: string; nombre: string }[] }).agencias?.find((a) => a.id === cr.agenciaId)?.nombre ?? 'La agencia' : yoMk().nombre;
          cambiarConv(convId, {
            ofertas: [...ofertas, { ...nueva, estado: vigente ? 'Contraoferta' : 'Enviada' }],
            mensajes: [...c.mensajes, { id: `M${c.mensajes.length + 1}`, autor: 'Sistema', lado: 'Sistema', texto: `${quien} envió ${vigente ? 'una contraoferta' : 'una oferta'} · v${version}${alertas.length ? ` (fuera de las condiciones del talento: ${alertas.length})` : ''}`, ocultos: 0, fechaHora: fh }],
            registro: [...c.registro, { quien: yoMk().nombre, que: `envió la oferta v${version}`, fechaHora: fh }],
          });
          for (const p of c.participantes.filter((x) => x.enCopia)) avisar('Email', p.email, `Copia · ${quien} envió la oferta v${version} por ${money(totalLineas(o.lineas))} + fee ${money(fee(totalLineas(o.lineas)))}.`);
          avisar('WhatsApp', lado === 'Marca' ? cr.handle : b.marca, `Influ: nueva oferta v${version} en "${b.titulo}".`);
          log('Ofertas', vigente ? 'Contraoferta' : 'Oferta', `${cr.handle} · ${b.marca}: v${version} ${money(totalLineas(o.lineas))}${alertas.length ? `; fuera de condiciones: ${alertas.join('; ')}` : ''}.`);
          toast(alertas.length ? `Oferta v${version} enviada, marcada fuera de las condiciones del talento: ${alertas[0]}.` : `Oferta v${version} enviada.`, alertas.length ? 'warn' : 'ok');
          return true;
        },

        aceptarOferta: (convId, comoToken) => {
          const s = get();
          const c = s.conversaciones.find((x) => x.id === convId);
          const b = c && brief(c.briefId);
          if (!c || !b) return false;
          const o = ofertaVigente(c);
          if (!o || !['Enviada', 'Contraoferta'].includes(estadoOferta(o))) return error(o && estadoOferta(o) === 'Vencida' ? 'La oferta venció: envía una nueva.' : 'No hay oferta por aceptar.');
          const cr = creador(c.creadorId)!;
          const invitado = comoToken ? c.participantes.find((p) => p.token === comoToken) : undefined;
          let quien = yoMk().nombre;
          if (o.lado === 'Marca') {
            if (!delLadoCreador(c.creadorId)) return error('Esta oferta la acepta el creador (o su agencia).');
            if (cr.agenciaId && yoMk().rol === 'Talento') return error('Por un talento representado acepta su agencia.');
          } else if (invitado) {
            if (!invitado.permisos.includes('Aprueba ofertas')) return error(`${invitado.nombre} participa comentando: acepta ofertas quien tiene ese permiso.`);
            quien = invitado.nombre;
          } else if (!conPermiso(b.empresaId, 'Aprueba ofertas', 'Aceptar la oferta')) return false;
          const cu = cuentaDe(b.empresaId);
          const tarifa = totalLineas(o.lineas);
          const total = tarifa + fee(tarifa);
          if (cu?.condicion.tipo === 'Plazo' && creditoUsado(s, b.empresaId) + total > cu.condicion.limite) return error(`Con esta oferta ${b.marca} rebasa su límite de crédito de ${money(cu.condicion.limite)}. El equipo de Influ puede ampliarlo o pasar la campaña a prepago.`);
          const fh = ahora().fechaHora;
          const ag = (useInflu.getState() as unknown as { agencias?: { id: string; nombre: string; clabe: string }[]; talentos?: { id: string; nombre: string; clabe: string }[] });
          const agencia = ag.agencias?.find((a) => a.id === cr.agenciaId);
          const tal = ag.talentos?.find((t) => t.id === cr.talentoId);
          const ct: Contratacion = {
            id: sig(s.contrataciones.map((x) => x.id), 'CT-'), convId, briefId: b.id, creadorId: cr.id, empresaId: b.empresaId, oferta: o.version,
            beneficiario: agencia ? { tipo: 'Agencia', nombre: agencia.nombre, clabe: agencia.clabe } : { tipo: 'Creador', nombre: cr.nombre, clabe: tal?.clabe ?? '' },
            tarifa, fee: fee(tarifa), aceptada: fh, acuerdo: {}, entregas: [], snapshots: [], utm: `utm_source=influ&utm_campaign=${sinAcentos(b.titulo).replace(/\W+/g, '-')}&utm_content=${cr.handle.slice(1)}`,
            codigo: `${cr.handle.slice(1, 6).toUpperCase().replace(/\W/g, '')}${Math.round(tarifa / 1000)}`, calificaciones: {}, estado: 'Acuerdo por firmar',
          };
          const fac = s.facturas.find((f) => f.briefId === b.id);
          set({
            conversaciones: s.conversaciones.map((x) => x.id === convId ? { ...x, ofertas: x.ofertas.map((y) => y.version === o.version ? { ...y, estado: 'Aceptada' } : y), mensajes: [...x.mensajes, { id: `M${x.mensajes.length + 1}`, autor: 'Sistema', lado: 'Sistema', texto: `${quien} aceptó la oferta v${o.version}. Acuerdo de colaboración enviado a firma electrónica.`, ocultos: 0, fechaHora: fh }], registro: [...x.registro, { quien, que: `aceptó la oferta v${o.version}`, fechaHora: fh }] } : x),
            contrataciones: [...s.contrataciones, ct],
            postulaciones: s.postulaciones.map((p) => p.briefId === b.id && p.creadorId === cr.id ? { ...p, estado: 'Contratado' } : p),
            facturas: fac ? s.facturas.map((f) => f.id === fac.id ? { ...f, tarifas: f.tarifas + tarifa, fee: f.fee + fee(tarifa), total: f.total + total, creadores: f.creadores + 1 } : f)
              : [...s.facturas, { id: sig(s.facturas.map((f) => f.id), 'FI-'), briefId: b.id, empresaId: b.empresaId, campana: `${b.marca} · ${b.titulo}`, tarifas: tarifa, fee: fee(tarifa), total, creadores: 1 }],
          });
          avisar('Email', b.marca, `Oferta aceptada con ${cr.handle}: ${money(tarifa)} + fee ${money(fee(tarifa))}. Influ es tu único proveedor: una factura por campaña.`);
          avisar('WhatsApp', cr.handle, `Influ: se aceptó la oferta v${o.version} de "${b.titulo}". Firma el acuerdo de colaboración.`);
          log('Ofertas', 'Aceptación', `${cr.handle} · ${b.marca}: v${o.version} ${money(tarifa)} + fee ${money(fee(tarifa))} (${Math.round(FEE_INFLU * 100)}%). Aceptó ${quien}.`, quien);
          toast(`Oferta aceptada. Falta firmar el acuerdo de colaboración${cu?.condicion.tipo === 'Prepago' ? ' y el prepago de la marca' : ''}.`);
          return true;
        },

        rechazarOferta: (convId) => {
          const c = get().conversaciones.find((x) => x.id === convId);
          const o = c && ofertaVigente(c);
          if (!c || !o || !['Enviada', 'Contraoferta'].includes(estadoOferta(o))) return error('No hay oferta vigente.');
          const b = brief(c.briefId)!;
          const puede = o.lado === 'Marca' ? delLadoCreador(c.creadorId) : (yoMk().rol === 'Marca' && yoMk().u?.empresaId === b.empresaId);
          if (!puede) return error('La rechaza la contraparte de quien la envió.');
          const fh = ahora().fechaHora;
          cambiarConv(convId, { ofertas: c.ofertas.map((x) => x.version === o.version ? { ...x, estado: 'Rechazada' } : x), registro: [...c.registro, { quien: yoMk().nombre, que: `rechazó la oferta v${o.version}`, fechaHora: fh }], mensajes: [...c.mensajes, { id: `M${c.mensajes.length + 1}`, autor: 'Sistema', lado: 'Sistema', texto: `${yoMk().nombre} rechazó la oferta v${o.version}.`, ocultos: 0, fechaHora: fh }] });
          toast('Oferta rechazada.', 'warn');
          return true;
        },

        // ------------------------------------------------------------------
        // Creador y agencia
        // ------------------------------------------------------------------

        asociarRed: (creadorId, red, si) => {
          if (!delLadoCreador(creadorId) || yoMk().rol !== 'Talento') return error('Las redes las asocia el propio creador, con su consentimiento.');
          const c = creador(creadorId)!;
          const r = c.redes.find((x) => x.red === red);
          if (!si && c.redes.filter((x) => x.asociada).length === 1 && r?.asociada) toast('Sin redes asociadas no puedes postularte a briefs.', 'warn');
          const usuario = r?.usuario || c.handle;
          const redes = r ? c.redes.map((x) => x.red === red ? { ...x, usuario, asociada: si, fecha: si ? ahora().fechaHora : undefined, seguidores: x.seguidores || Math.round(seguidoresSimulados(usuario)) } : x)
            : [...c.redes, { red: red as never, usuario, asociada: si, fecha: ahora().fechaHora, seguidores: seguidoresSimulados(usuario) }];
          set({ creadores: get().creadores.map((x) => x.id === creadorId ? { ...x, redes } : x) });
          log('Redes', si ? 'Asociación' : 'Revocación', `${c.handle}: ${red} ${si ? 'asociada con consentimiento (perfil, audiencia, publicaciones y métricas)' : 'revocada'}.`);
          if (si) toast(`${red} asociada: tus métricas y publicaciones se leen solas.`);
          return true;
        },

        guardarCondiciones: (creadorId, cond) => {
          if (!delLadoCreador(creadorId)) return error('Las condiciones las define el creador (o su agencia).');
          if (cond.tarifas.some((t) => !(t.minimo >= 0))) return error('Revisa las tarifas mínimas.');
          set({ creadores: get().creadores.map((x) => x.id === creadorId ? { ...x, condiciones: cond } : x) });
          log('Condiciones', 'Actualización', `${creador(creadorId)?.handle}: tarifas y condiciones aceptables actualizadas.`);
          toast('Condiciones guardadas: las ofertas fuera de ellas se marcan antes de llegarte.');
          return true;
        },

        postular: (briefId, creadorId, lineas, fechas, usos, mensaje) => {
          const b = brief(briefId);
          const c = creador(creadorId);
          if (!b || !c) return false;
          if (yoMk().rol !== 'Talento' || !delLadoCreador(creadorId)) return error('La postulación la envía el creador desde su panel.');
          if (!asociada(c)) return error('Asocia al menos una red antes de postularte: es obligatorio en el marketplace.');
          if (b.estado !== 'Publicado') return error('Ese brief ya no recibe postulaciones.');
          const previa = get().postulaciones.find((p) => p.briefId === briefId && p.creadorId === creadorId);
          if (!previa && !b.modo.abierto) return error('Ese brief es solo por invitación.');
          if (previa && !['Invitado', 'Sin respuesta'].includes(previa.estado)) return error('Ya te postulaste a este brief.');
          if (!lineas.length || lineas.some((l) => !(l.precio > 0))) return error('Pon tu precio en cada entregable.');
          if (!fechas.contenido || !fechas.publicacion) return error('Propón fechas de entrega y de publicación.');
          if (!usos.length) return error('Elige qué usos aceptas.');
          const estado: Postulacion['estado'] = c.agenciaId ? 'Por confirmar agencia' : 'Nueva';
          const p: Postulacion = { id: previa?.id ?? sig(get().postulaciones.map((x) => x.id), 'PO-', 3), briefId, creadorId, origen: previa?.origen ?? 'Postulación', estado, lineas, fechas, usos, mensaje, fecha: ahora().fechaHora };
          set({ postulaciones: previa ? get().postulaciones.map((x) => x.id === previa.id ? p : x) : [...get().postulaciones, p] });
          log('Postulaciones', 'Postulación', `${c.handle} → ${b.marca} · ${b.titulo}: ${money(totalLineas(lineas))}${c.agenciaId ? '; la confirma su agencia' : ''}.`);
          toast(c.agenciaId ? 'Postulación enviada a tu agencia: confirma precio y condiciones antes de que llegue a la marca.' : 'Postulación enviada a la marca.');
          return true;
        },

        confirmarPostulacion: (postId, lineas) => {
          const p = get().postulaciones.find((x) => x.id === postId);
          if (!p) return false;
          if (yoMk().rol !== 'Agencia' || !delLadoCreador(p.creadorId, true)) return error('La confirma la agencia que representa al talento.');
          if (p.estado !== 'Por confirmar agencia') return error('Esa postulación ya se confirmó.');
          const nuevas = lineas ?? p.lineas;
          if (nuevas.some((l) => !(l.precio > 0))) return error('Revisa los precios.');
          set({ postulaciones: get().postulaciones.map((x) => x.id === postId ? { ...x, lineas: nuevas, estado: 'Nueva', agencia: { confirmo: yoMk().nombre, fechaHora: ahora().fechaHora, editado: !!lineas } } : x) });
          log('Postulaciones', 'Confirmación de agencia', `${creador(p.creadorId)?.handle} → ${brief(p.briefId)?.marca}: ${money(totalLineas(nuevas))}${lineas ? ' (precio editado por la agencia)' : ''}.`);
          toast('Postulación confirmada: ya la ve la marca.');
          return true;
        },

        subirCfdi: (ctId, archivo, uuid, rfcEmisor, monto) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          if (!delLadoCreador(ct.creadorId)) return error(`El CFDI a Influ lo sube ${ct.beneficiario.nombre}.`);
          if (!/\.xml$/i.test(archivo)) return error('Sube el XML del CFDI.');
          const s = useInflu.getState() as unknown as { agencias?: { id: string; rfc: string }[]; talentos?: { id: string; rfc: string }[] };
          const cr = creador(ct.creadorId)!;
          const esperado = ct.beneficiario.tipo === 'Agencia' ? s.agencias?.find((a) => a.id === cr.agenciaId)?.rfc ?? '' : s.talentos?.find((t) => t.id === cr.talentoId)?.rfc ?? '';
          const motivo = validarCfdiInflu(uuid.trim(), rfcEmisor.trim().toUpperCase(), esperado, monto, ct.tarifa);
          cambiarCt(ctId, { cfdi: { archivo, uuid: uuid.trim().toUpperCase(), rfcEmisor: rfcEmisor.trim().toUpperCase(), monto, validado: !motivo, motivo: motivo ?? undefined, fechaHora: ahora().fechaHora } });
          log('Pagos', 'CFDI a Influ', `${ct.beneficiario.nombre} · ${money(monto)}: ${motivo ?? 'validado contra el SAT'}.`);
          if (motivo) return error(`CFDI rechazado: ${motivo}`);
          toast('CFDI validado contra el SAT.');
          if (ct.aprobada && ct.dispersion?.estado === 'Retenida') intentarDispersion(ctId);
          return true;
        },

        entregarContenido: (ctId, archivo, duracion, texto) => {
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          const c = creador(ct.creadorId)!;
          if (yoMk().rol !== 'Talento' || !delLadoCreador(ct.creadorId)) return error('El contenido lo sube el creador.');
          if (!ct.acuerdo.marca || !ct.acuerdo.creador) return error('Antes de entregar se firma el acuerdo de colaboración (marca y creador o su agencia).');
          if (!archivo) return error('Sube el video o las imágenes.');
          const ult = ct.entregas[ct.entregas.length - 1];
          if (ult?.estado === 'En revisión') return error('Tu entrega anterior sigue en revisión de la marca.');
          if (ult?.estado === 'Aprobada') return error('El contenido ya está aprobado.');
          const of = get().conversaciones.find((x) => x.id === ct.convId)?.ofertas.find((o) => o.version === ct.oferta);
          const rondas = of?.rondas ?? 2;
          const ronda = ct.entregas.length + 1;
          if (ronda > rondas) return error(`Se agotaron las ${rondas} rondas pactadas.`);
          const b = brief(ct.briefId)!;
          const chequeos = revisarContenido(b.estructurado, { duracion, texto });
          const e = { id: `EN-${ct.id}-${ronda}`, ronda, archivo, duracion, texto, chequeos, fechaHora: ahora().fechaHora, estado: 'En revisión' as const };
          cambiarCt(ctId, { entregas: [...ct.entregas, e], estado: 'Contenido en revisión' });
          avisar('Email', b.marca, `${c.handle} entregó contenido de "${b.titulo}" (ronda ${ronda} de ${rondas}).`);
          log('Contenidos', 'Entrega', `${c.handle} · ${b.marca}: ronda ${ronda} de ${rondas}; la IA dejó ${chequeos.filter((x) => !x.ok).length} observaciones.`);
          toast(`Contenido enviado a ${b.marca} (ronda ${ronda} de ${rondas}).`);
          return true;
        },

        avisarPublicacion: (ctId) => {
          // La plataforma consulta la cuenta asociada con más frecuencia cerca de la fecha pactada.
          const ct = get().contrataciones.find((x) => x.id === ctId);
          if (!ct) return false;
          const c = creador(ct.creadorId)!;
          if (!delLadoCreador(ct.creadorId) && !esEquipo(yoMk().rol)) return error('Consulta la cuenta el creador o el equipo de Influ.');
          if (ct.dispersion?.estado !== 'Pagada' && !ct.aprobada) return error('Se publica después de que la marca aprueba el contenido.');
          if (ct.publicacion && ct.publicacion.estado !== 'No detectada') return error('La publicación ya se detectó.');
          if (!asociada(c)) return error('Sin una red asociada no podemos detectar la publicación.');
          const of = get().conversaciones.find((x) => x.id === ct.convId)?.ofertas.find((o) => o.version === ct.oferta);
          const aTiempo = !of || HOY_ISO <= of.fechas.publicacion;
          const aprobada = ct.entregas.find((e) => e.estado === 'Aprobada');
          const checks = [
            { ok: true, nivel: 'ok' as const, texto: `Publicada en ${c.handle} (cuenta asociada)` },
            { ok: aTiempo, nivel: aTiempo ? 'ok' as const : 'aviso' as const, texto: aTiempo ? 'Dentro de la fecha pactada' : `Fuera de la fecha pactada (${of?.fechas.publicacion})` },
            { ok: !!aprobada, nivel: aprobada ? 'ok' as const : 'falla' as const, texto: aprobada ? 'Coincide con el contenido aprobado (imagen, video y texto)' : 'No hay contenido aprobado con qué compararla' },
            { ok: true, nivel: 'ok' as const, texto: 'Menciones, #publicidad y link con UTM presentes' },
          ];
          const ok = checks.every((x) => x.ok);
          cambiarCt(ctId, { publicacion: { estado: ok ? 'Verificada' : 'Con observaciones', fechaHora: ahora().fechaHora, checks }, snapshots: ok ? serieKpis(ct.id, HOY_ISO, Math.round(c.vistasMedianas * 1.02), c.engagement) : [], estado: 'Publicada' });
          avisar('Email', brief(ct.briefId)?.marca ?? '', `${c.handle} publicó: ${ok ? 'verificada; arrancan los KPIs cada 24 h' : 'con observaciones; pasa a revisión manual'}.`);
          log('Publicaciones', 'Detección', `${c.handle}: ${ok ? 'verificada' : 'con observaciones (revisión manual)'}.`, 'Sistema');
          toast(ok ? 'Publicación detectada y verificada. Los KPIs se actualizan cada 24 h durante 30 días.' : 'Publicación detectada con observaciones: la revisa el equipo de Influ.', ok ? 'ok' : 'warn');
          return true;
        },
      };
    },
    {
      name: 'influ-market',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

const totalLineasP = (l: { tarifa: number }[]) => l.reduce((t, x) => t + x.tarifa, 0);
const seguidoresSimulados = (u: string) => 40_000 + ([...u].reduce((t, ch) => t + ch.charCodeAt(0), 0) * 997) % 260_000;

// Reiniciar demo desde el núcleo.
if (typeof window !== 'undefined') window.addEventListener('influ:reiniciar', () => useMarket.getState().reiniciar());
