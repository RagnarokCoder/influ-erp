import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, ClipboardList, Bell, Home, HandCoins, FolderOpen, Sparkles, Building2, BadgeCheck,
  UserSquare, ShieldCheck, History, UserCheck, FileSearch, Landmark, MailCheck, Banknote, Settings, FileCheck2, FileSignature,
} from "lucide-react";
import type { RolUsuario } from "../data/types";
import { MARKET_NAV } from "../market/rutas";
import { FONDEO_NAV } from "../fondeo/rutas";

export interface ItemNav {
  to: string;
  label: string;
  icon: LucideIcon;
  /** El renglón solo aparece a estos perfiles (la misma ruta puede llamarse distinto en otro grupo). */
  soloRoles?: RolUsuario[];
}
export interface GrupoNav { group: string; items: ItemNav[]; roles?: RolUsuario[] }

const INTERNO: RolUsuario[] = ["Dirección General", "Equipo interno"];
const AG: RolUsuario[] = ["Agencia"];
const TA: RolUsuario[] = ["Talento"];
const PORTAL: RolUsuario[] = ["Agencia", "Talento"];

// Las áreas del alcance (ANALISIS.md §a), con los paneles del flujo de
// pantallas de Fase 1 (22 oct): panel interno, portal del talento y panel de
// agencia. El marketplace (Fase 2) se suma desde src/market.
export const NAV: GrupoNav[] = [
  {
    group: "Dirección",
    items: [{ to: "/tablero", label: "Tablero", icon: LayoutGrid }],
  },
  {
    group: "Panel interno",
    items: [
      { to: "/registros", label: "Registros", icon: UserCheck, soloRoles: INTERNO },
      { to: "/solicitudes", label: "Solicitudes", icon: ClipboardList, soloRoles: INTERNO },
      { to: "/revision", label: "Revisión", icon: FileSearch, soloRoles: INTERNO },
      { to: "/contratos", label: "Contratos", icon: FileSignature, soloRoles: INTERNO },
      { to: "/rug", label: "RUG", icon: Landmark, soloRoles: INTERNO },
      { to: "/cesiones", label: "Instrucciones de pago", icon: MailCheck, soloRoles: INTERNO },
      { to: "/evidencia", label: "Evidencia", icon: FileCheck2, soloRoles: INTERNO },
      { to: "/pagos", label: "Pagos", icon: Banknote, soloRoles: INTERNO },
      { to: "/marcas", label: "Marcas", icon: BadgeCheck, soloRoles: INTERNO },
      { to: "/notificaciones", label: "Alertas", icon: Bell, soloRoles: INTERNO },
    ],
  },
  {
    group: "Cartera",
    items: [
      { to: "/talentos", label: "Talentos", icon: Sparkles, soloRoles: INTERNO },
      { to: "/agencias", label: "Agencias", icon: Building2, soloRoles: INTERNO },
    ],
  },
  {
    group: "Mi cuenta",
    items: [
      { to: "/resumen", label: "Inicio", icon: Home, soloRoles: TA },
      { to: "/resumen", label: "Resumen", icon: Home, soloRoles: AG },
      { to: "/talentos", label: "Mis talentos", icon: Sparkles, soloRoles: AG },
      { to: "/pedir-adelanto", label: "Pedir adelanto", icon: HandCoins, soloRoles: PORTAL },
      { to: "/operaciones", label: "Mis operaciones", icon: FolderOpen, soloRoles: TA },
      { to: "/operaciones", label: "Adelantos", icon: FolderOpen, soloRoles: AG },
      { to: "/perfil", label: "Perfil", icon: UserSquare, soloRoles: TA },
      { to: "/perfil", label: "Configuración", icon: Settings, soloRoles: AG },
      { to: "/notificaciones", label: "Notificaciones", icon: Bell, soloRoles: PORTAL },
    ],
  },
  ...MARKET_NAV,
  FONDEO_NAV,
  {
    group: "Sistema",
    items: [
      { to: "/usuarios", label: "Usuarios", icon: UserSquare },
      { to: "/roles", label: "Roles", icon: ShieldCheck },
      { to: "/bitacora", label: "Bitácora", icon: History },
    ],
  },
];

export const TOTAL_MODULOS = NAV.reduce((t, g) => t + g.items.length, 0);
