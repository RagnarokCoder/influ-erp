import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useInflu, sesionValida } from '../store/useInflu';
import { puedeVer, rutaInicial } from '../lib/permisos';
import { formatDate } from '../lib/format';
import { CLAVE_DEMO, HOY_ISO } from '../data/constantes';

const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

// login.md: dos mitades en escritorio, tarjeta sola en celular; accesos de demo
// con un clic por perfil.
export const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const usuarios = useInflu((s) => s.usuarios);
  const roles = useInflu((s) => s.roles);
  const iniciarSesion = useInflu((s) => s.iniciarSesion);
  const conSesion = useInflu(sesionValida);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [fallas, setFallas] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);
  const [, tick] = useState(0);

  const bloqueado = Date.now() < bloqueadoHasta;
  useEffect(() => {
    if (!bloqueado) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [bloqueado]);

  if (conSesion && !entrando) {
    const u = usuarios.find((x) => x.id === useInflu.getState().usuarioId);
    return <Navigate to={u ? rutaInicial(u.rol) : '/'} replace />;
  }

  const destino = (correoUsado: string) => {
    const u = usuarios.find((x) => x.correo.toLowerCase() === correoUsado.trim().toLowerCase());
    const ir = params.get('ir');
    if (!u) return '/';
    return ir && puedeVer(u.rol, ir.split('?')[0]) ? ir : rutaInicial(u.rol);
  };

  const entrar = (c = correo, k = clave) => {
    if (bloqueado || entrando) return;
    setEntrando(true);
    setMensaje(null);
    setTimeout(() => {
      const error = iniciarSesion(c, k, recordar);
      if (error) {
        const n = fallas + 1;
        setFallas(n);
        if (n >= 5) {
          setBloqueadoHasta(Date.now() + 30_000);
          setFallas(0);
          setMensaje('Demasiados intentos. Espera 30 segundos.');
        } else setMensaje(error);
        setEntrando(false);
        return;
      }
      setFallas(0);
      navigate(destino(c), { replace: true });
      setEntrando(false);
    }, 300);
  };

  const activos = usuarios.filter((u) => u.estatus === 'Activo' && roles.find((r) => r.nombre === u.rol)?.estatus !== 'Inactivo');

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-ice border-r border-hairline p-12 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6.5 h-6.5 rounded-lg bg-blue flex items-center justify-center text-white text-[10px] font-bold">IN</span>
          <div>
            <div className="text-[15px] font-bold text-carbon leading-none">Influ</div>
            <div className="text-[10px] text-ash uppercase tracking-wide mt-0.5">adelanto de pagos</div>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-semibold text-carbon leading-tight">Sistema de gestión</h1>
          <ul className="flex flex-col gap-2.5">
            {['Adelanto de colaboraciones en 24–48 horas', 'CFDI validado contra el SAT', 'Liquidación del remanente sin sorpresas'].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px] text-smoke">
                <span className="w-1.5 h-1.5 rounded-full bg-blue" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-[11px] text-mist">Demo funcional · {formatDate(HOY_ISO)}</div>
      </div>

      <div className="bg-frost flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-hairline overflow-hidden">
          <form className="p-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); entrar(); }}>
            <div>
              <div className="text-[21px] font-semibold text-carbon">Iniciar sesión</div>
              <div className="text-[13px] text-ash mt-0.5">Entra con tu correo de trabajo.</div>
            </div>
            <Input label="Correo" type="email" autoComplete="username" autoFocus value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-ash">Contraseña</label>
              <div className="relative">
                <input
                  type={ver ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="w-full border border-hairline rounded-[8px] pl-3 pr-10 py-2 text-[15px] text-carbon bg-white focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
                />
                <button type="button" onClick={() => setVer((x) => !x)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1" title={ver ? 'Ocultar' : 'Mostrar'}>
                  {ver ? <EyeOff size={15} className="text-ash" strokeWidth={1.6} /> : <Eye size={15} className="text-ash" strokeWidth={1.6} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-ash cursor-pointer">
              <input type="checkbox" className="accent-blue" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
              Recordarme en este equipo
            </label>
            <Button type="submit" className="w-full" disabled={entrando || bloqueado}>{entrando ? 'Entrando…' : 'Entrar'}</Button>
            {(mensaje || bloqueado) && (
              <div className="bg-danger-wash text-danger text-[12px] rounded-[8px] px-3 py-2">
                {bloqueado ? `Demasiados intentos. Espera ${Math.ceil((bloqueadoHasta - Date.now()) / 1000)} segundos.` : mensaje}
              </div>
            )}
            <button
              type="button"
              onClick={() => useInflu.getState().toast(`En el sistema real llega un enlace a tu correo. En el demo la contraseña es ${CLAVE_DEMO}.`, 'warn')}
              className="text-[12px] text-blue-link text-center hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <div className="text-[12px] text-ash text-center -mt-1">
              ¿No tienes cuenta? <Link to="/registro" className="text-blue-link font-medium hover:underline">Regístrate</Link>
              <span className="text-mist"> · </span>
              <Link to="/inicio" className="text-blue-link hover:underline">Conoce Influ</Link>
            </div>
          </form>

          <div className="border-t border-hairline">
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-mist font-semibold">Accesos de demo</span>
              <span className="text-[11px] text-mist">contraseña: {CLAVE_DEMO}</span>
            </div>
            <div className="divide-y divide-hairline max-h-[260px] overflow-y-auto">
              {activos.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setCorreo(u.correo); setClave(CLAVE_DEMO); entrar(u.correo, CLAVE_DEMO); }}
                  className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-frost text-left transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-frost flex items-center justify-center text-[11px] text-ash shrink-0">{iniciales(u.nombre)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-carbon truncate">{u.nombre}</span>
                    <span className="block text-[11px] text-ash">{u.rol}</span>
                  </span>
                  <ChevronRight size={14} className="text-pebble" strokeWidth={1.8} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
