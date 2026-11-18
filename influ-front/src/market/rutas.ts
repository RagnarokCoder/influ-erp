import type { LucideIcon } from 'lucide-react';
import {
  Megaphone, FileText, Users, MessagesSquare, Clapperboard, BarChart3, Wallet, UserCog, Compass, Send, Upload, Banknote,
  LineChart, Link2, Contact, Inbox, Handshake, Gauge, Shuffle, Presentation, Building, CreditCard, ShieldAlert,
} from 'lucide-react';
import type { RolUsuario } from '../data/types';

// Fase 2 · Marketplace (MVP Fase 2, 29 sep 2026). Menú, títulos y rutas por
// perfil del marketplace. Este archivo NO importa pantallas ni el store: lo
// lee lib/permisos.ts al cargar y un ciclo de imports lo dejaría vacío.
// Todas las rutas del marketplace empiezan con /mk/.

export interface GrupoNav { group: string; items: { to: string; label: string; icon: LucideIcon }[]; roles?: RolUsuario[] }

const INTERNO: RolUsuario[] = ['Dirección General', 'Equipo interno'];

export const MARKET_NAV: GrupoNav[] = [
  {
    group: 'Marketplace · Marca', roles: ['Marca', 'Dirección General'],
    items: [
      { to: '/mk/marca/campanas', label: 'Campañas', icon: Megaphone },
      { to: '/mk/marca/briefs', label: 'Briefs', icon: FileText },
      { to: '/mk/marca/creadores', label: 'Creadores', icon: Users },
      { to: '/mk/marca/mensajes', label: 'Mensajes', icon: MessagesSquare },
      { to: '/mk/marca/contenidos', label: 'Contenidos', icon: Clapperboard },
      { to: '/mk/marca/kpis', label: 'KPIs', icon: BarChart3 },
      { to: '/mk/marca/pagos', label: 'Pagos', icon: Wallet },
      { to: '/mk/marca/equipo', label: 'Equipo', icon: UserCog },
    ],
  },
  {
    group: 'Marketplace · Creador', roles: ['Talento', 'Dirección General'],
    items: [
      { to: '/mk/creador/oportunidades', label: 'Oportunidades', icon: Compass },
      { to: '/mk/creador/postulaciones', label: 'Postulaciones', icon: Send },
      { to: '/mk/creador/mensajes', label: 'Mensajes', icon: MessagesSquare },
      { to: '/mk/creador/entregas', label: 'Entregas', icon: Upload },
      { to: '/mk/creador/cobros', label: 'Cobros', icon: Banknote },
      { to: '/mk/creador/metricas', label: 'Métricas', icon: LineChart },
      { to: '/mk/creador/redes', label: 'Perfil y redes', icon: Link2 },
    ],
  },
  {
    group: 'Marketplace · Agencia', roles: ['Agencia', 'Dirección General'],
    items: [
      { to: '/mk/agencia/roster', label: 'Roster', icon: Contact },
      { to: '/mk/agencia/postulaciones', label: 'Postulaciones', icon: Inbox },
      { to: '/mk/agencia/ofertas', label: 'Ofertas', icon: Handshake },
      { to: '/mk/agencia/cobros', label: 'Cobros', icon: Banknote },
    ],
  },
  {
    group: 'Marketplace · Equipo', roles: INTERNO,
    items: [
      { to: '/mk/equipo/resumen', label: 'Resumen', icon: Gauge },
      { to: '/mk/equipo/matching', label: 'Matching', icon: Shuffle },
      { to: '/mk/equipo/propuestas', label: 'Propuestas', icon: Presentation },
      { to: '/mk/equipo/marcas', label: 'Marcas', icon: Building },
      { to: '/mk/equipo/pagos', label: 'Pagos', icon: CreditCard },
      { to: '/mk/equipo/moderacion', label: 'Moderación', icon: ShieldAlert },
    ],
  },
];

const T = (eyebrow: string, title: string) => ({ eyebrow, title });
export const MARKET_TITLES: Record<string, { eyebrow: string; title: string }> = {
  '/mk/marca/campanas': T('Marketplace · Marca', 'Campañas'),
  '/mk/marca/briefs': T('Marketplace · Marca', 'Briefs'),
  '/mk/marca/creadores': T('Marketplace · Marca', 'Comparador y perfiles de creadores'),
  '/mk/marca/mensajes': T('Marketplace · Marca', 'Chat, oferta y participantes en copia'),
  '/mk/marca/contenidos': T('Marketplace · Marca', 'Revisión y aprobación de contenido'),
  '/mk/marca/kpis': T('Marketplace · Marca', 'Dashboard de KPIs'),
  '/mk/marca/pagos': T('Marketplace · Marca', 'Pagos y estado de cuenta'),
  '/mk/marca/equipo': T('Marketplace · Marca', 'Equipo y alta por invitación'),
  '/mk/creador/oportunidades': T('Marketplace · Creador', 'Oportunidades'),
  '/mk/creador/postulaciones': T('Marketplace · Creador', 'Postulaciones'),
  '/mk/creador/mensajes': T('Marketplace · Creador', 'Chat y ofertas'),
  '/mk/creador/entregas': T('Marketplace · Creador', 'Entrega de contenido'),
  '/mk/creador/cobros': T('Marketplace · Creador', 'Cobros'),
  '/mk/creador/metricas': T('Marketplace · Creador', 'Métricas'),
  '/mk/creador/redes': T('Marketplace · Creador', 'Perfil, redes y condiciones aceptables'),
  '/mk/agencia/roster': T('Marketplace · Agencia', 'Roster'),
  '/mk/agencia/postulaciones': T('Marketplace · Agencia', 'Postulaciones y ofertas del roster'),
  '/mk/agencia/ofertas': T('Marketplace · Agencia', 'Ofertas'),
  '/mk/agencia/cobros': T('Marketplace · Agencia', 'Cobros'),
  '/mk/equipo/resumen': T('Marketplace · Equipo', 'Resumen y criterios de éxito'),
  '/mk/equipo/matching': T('Marketplace · Equipo', 'Revisión del matching'),
  '/mk/equipo/propuestas': T('Marketplace · Equipo', 'Propuestas de venta directa'),
  '/mk/equipo/marcas': T('Marketplace · Equipo', 'Marcas y límites de crédito'),
  '/mk/equipo/pagos': T('Marketplace · Equipo', 'Pagos y dispersión'),
  '/mk/equipo/moderacion': T('Marketplace · Equipo', 'Moderación y disputas'),
};

const rutas = (g: string) => MARKET_NAV.find((x) => x.group === g)!.items.map((i) => i.to);
const MARCA = rutas('Marketplace · Marca');
const CREADOR = rutas('Marketplace · Creador');
const AGENCIA = rutas('Marketplace · Agencia');
const EQUIPO = rutas('Marketplace · Equipo');

/** Rutas del marketplace que abre cada perfil, en orden (la primera es la de entrada si el perfil solo usa Fase 2). */
export const MARKET_RUTAS_POR_ROL: Record<RolUsuario, string[]> = {
  'Dirección General': [...EQUIPO, ...MARCA, ...CREADOR, ...AGENCIA],
  'Equipo interno': EQUIPO,
  Agencia: AGENCIA,
  Talento: CREADOR,
  Marca: MARCA,
  // El fondeador no usa marketplace (Fase 2).
  Fondeador: [],
};
