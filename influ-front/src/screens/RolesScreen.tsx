import DataModule, { Relacion, RenglonRelacion } from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import { useInflu } from '../store/useInflu';
import { RUTAS_POR_ROL, autoriza, ETIQUETA_AUTORIZA, veImportes, carteraPropia } from '../lib/permisos';
import { tituloDe } from '../routes/routes_list_titles';
import { NAV, TOTAL_MODULOS } from '../routes/routes_list';
import type { Rol, RolUsuario } from '../data/types';
import { ShieldCheck, EyeOff, Users, Lock } from 'lucide-react';

const ESTATUS = ['Activo', 'Inactivo'] as const;

type Fila = Rol & { modulos: string; aprueba: string; importes: 'Visibles' | 'Ocultos' };

const etiquetaMenu = (ruta: string) => NAV.flatMap((g) => g.items).find((i) => i.to === ruta)?.label ?? ruta;

// Una sola fuente de verdad (roles.md §3.5): lo que dice la pantalla se deriva de permisos.ts.
function derivar(r: Rol): Fila {
  const rutas = RUTAS_POR_ROL[r.nombre];
  const modulos = rutas === '*' ? 'Todos los módulos' : rutas.map(etiquetaMenu).join(', ');
  const llaves = (Object.keys(autoriza) as (keyof typeof autoriza)[]).filter((k) => autoriza[k](r.nombre as RolUsuario));
  return {
    ...r,
    modulos: `${carteraPropia(r.nombre) ? 'Cartera propia · ' : rutas === '*' ? 'Toda la cartera · ' : ''}${modulos}`,
    aprueba: llaves.length ? llaves.map((k) => ETIQUETA_AUTORIZA[k]).join(', ') : '—',
    importes: veImportes(r.nombre) ? 'Visibles' : 'Ocultos',
  };
}

const cols: Col<Fila>[] = [
  { key: 'nombre', label: 'Perfil', soloLectura: true },
  { key: 'modulos', label: 'Información a la que accede', soloLectura: true, render: (r) => <span className="whitespace-normal block max-w-[360px]">{r.modulos}</span> },
  { key: 'aprueba', label: 'Operaciones que autoriza', soloLectura: true, render: (r) => <span className="whitespace-normal block max-w-[360px] text-ash">{r.aprueba}</span> },
  { key: 'importes', label: 'Importes y costos', soloLectura: true, render: (r) => <span className={r.importes === 'Visibles' ? 'text-success' : 'text-ash'}>{r.importes}</span> },
  { key: 'estatus', label: 'Estatus', tipo: 'select', opciones: ESTATUS },
];

export const RolesScreen = () => {
  const roles = useInflu((s) => s.roles);
  const usuarios = useInflu((s) => s.usuarios);
  const filas = roles.map(derivar);

  return (
    <DataModule<Fila>
      coleccion="roles"
      rows={filas}
      cols={cols}
      estatuses={ESTATUS}
      nombreSingular="perfil"
      sinAlta
      sinBaja
      titulo="Perfiles de acceso"
      subtitulo="Qué módulos abre cada perfil, qué cartera ve, si ve importes y qué autoriza."
      kpis={[
        { label: 'Perfiles', value: String(roles.length), icon: ShieldCheck },
        { label: 'Sin importes', value: String(filas.filter((r) => r.importes === 'Ocultos').length), note: 'todos cobran, pagan o dirigen', icon: EyeOff },
        { label: 'Usuarios asignados', value: String(usuarios.length), icon: Users },
        { label: 'Módulos del sistema', value: String(TOTAL_MODULOS), note: 'score de riesgo automático: fuera del MVP', icon: Lock },
      ]}
      detalle={(r) => {
        const rutas = RUTAS_POR_ROL[r.nombre];
        return (
          <>
            <Relacion titulo="Usuarios con este perfil">
              {usuarios.filter((u) => u.rol === r.nombre).map((u) => (
                <RenglonRelacion key={u.id} titulo={u.nombre} detalle={u.correo} valor={u.estatus} tone={u.estatus} />
              ))}
            </Relacion>
            <Relacion titulo="Módulos permitidos">
              {rutas === '*'
                ? <RenglonRelacion titulo="Acceso completo" detalle="todos los módulos y toda la cartera" />
                : rutas.map((x) => <RenglonRelacion key={x} titulo={tituloDe(x)?.title ?? x} detalle={tituloDe(x)?.eyebrow} />)}
            </Relacion>
          </>
        );
      }}
    />
  );
};
