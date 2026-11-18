import DataModule, { Relacion, RenglonRelacion } from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import { useInflu } from '../store/useInflu';
import { RUTAS_POR_ROL, veImportes } from '../lib/permisos';
import { tituloDe } from '../routes/routes_list_titles';
import type { Usuario, RolUsuario } from '../data/types';
import { UserSquare, ShieldCheck, UserX, Users } from 'lucide-react';

const ESTATUS = ['Activo', 'Suspendido'] as const;
// La lista sale de permisos.ts: un perfil nuevo aparece solo (usuarios.md §4).
const PERFILES = Object.keys(RUTAS_POR_ROL) as RolUsuario[];

const cols: Col<Usuario>[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'correo', label: 'Correo' },
  { key: 'rol', label: 'Perfil', tipo: 'select', opciones: PERFILES },
  {
    key: 'talentoId', label: 'Talento relacionado', tipo: 'catalog', catalogo: 'talentos',
    ayuda: 'Solo para el perfil Talento: define la cartera que ve.',
    opcionesDinamicas: (row, cat) => (row.rol === 'Talento' ? cat.talentos : []),
  },
  {
    key: 'agenciaId', label: 'Agencia relacionada', tipo: 'catalog', catalogo: 'agencias',
    ayuda: 'Solo para el perfil Agencia: ve las operaciones de sus talentos.',
    opcionesDinamicas: (row, cat) => (row.rol === 'Agencia' ? cat.agencias : []),
  },
  {
    key: 'empresaId', label: 'Empresa (marca)', tipo: 'catalog', catalogo: 'empresas',
    ayuda: 'Solo para el perfil Marca (marketplace, Fase 2): la empresa a la que pertenece.',
    opcionesDinamicas: (row, cat) => (row.rol === 'Marca' ? cat.empresas : []),
  },
  {
    key: 'permisosMarca', label: 'Permisos de marca', tipo: 'multicatalog', catalogo: 'permisosMarca',
    ayuda: 'Admin, aprueba contenido, aprueba ofertas o solo comenta. Los define el administrador de la marca.',
    opcionesDinamicas: (row, cat) => (row.rol === 'Marca' ? cat.permisosMarca : []),
  },
  { key: 'estatus', label: 'Estatus', tipo: 'select', opciones: ESTATUS },
];

export const Usuarios = () => {
  const usuarios = useInflu((s) => s.usuarios);
  const usuarioId = useInflu((s) => s.usuarioId);

  return (
    <DataModule<Usuario>
      coleccion="usuarios"
      rows={usuarios}
      cols={cols}
      estatuses={ESTATUS}
      nombreSingular="usuario"
      sinBaja
      titulo="Usuarios"
      subtitulo="Quién entra al sistema y con qué perfil. Un usuario suspendido no entra."
      plantilla={{ rol: 'Equipo interno', estatus: 'Activo' }}
      kpis={[
        { label: 'Usuarios', value: String(usuarios.length), icon: Users },
        { label: 'Activos', value: String(usuarios.filter((u) => u.estatus === 'Activo').length), icon: UserSquare },
        { label: 'Suspendidos', value: String(usuarios.filter((u) => u.estatus === 'Suspendido').length), icon: UserX },
        { label: 'Sesión actual', value: usuarios.find((u) => u.id === usuarioId)?.rol ?? '—', icon: ShieldCheck },
      ]}
      avisoForma={(f, original) => original && f.rol && f.rol !== original.rol ? (
        <div className="mt-4 border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning">
          Al guardar, {original.nombre} verá los módulos de {f.rol} y dejará de ver los de {original.rol}.
        </div>
      ) : null}
      detalle={(u) => {
        const rutas = RUTAS_POR_ROL[u.rol];
        return (
          <Relacion titulo={`Módulos que abre · importes ${veImportes(u.rol) ? 'visibles' : 'ocultos'}`}>
            {rutas === '*'
              ? <RenglonRelacion titulo="Todos los módulos" detalle="incluye importes y toda la cartera" />
              : rutas.map((r, i) => <RenglonRelacion key={r} titulo={tituloDe(r)?.title ?? r} detalle={`${tituloDe(r)?.eyebrow ?? ''}${i === 0 ? ' · pantalla de entrada' : ''}`} />)}
          </Relacion>
        );
      }}
    />
  );
};
