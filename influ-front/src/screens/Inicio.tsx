import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Button from '../components/ui/Button';
import { Logo } from './Registro';

const PASOS = [
  ['1. Carga la colaboración', 'Factura y contrato con la marca.'],
  ['2. La revisamos', 'Validamos la factura y el contrato en horas.'],
  ['3. Cobras', 'Recibes el adelanto por transferencia.'],
];

const PREGUNTAS = [
  ['¿Cuánto tarda?', 'Entre 24 y 48 horas desde que cargas la factura y el contrato, una vez que tu cuenta está aprobada y la marca recibió el aviso.'],
  ['¿Quién puede usarlo?', 'Creadores de contenido en México con colaboraciones ya cerradas con una marca, solos o a través de su agencia. Las agencias también pueden pedir el adelanto por sus talentos.'],
  ['¿Qué necesito?', 'La factura (CFDI) que le emitiste a la marca, el contrato firmado con ella y los links de tus publicaciones. Nada más.'],
];

// Pantalla 1: mensaje central, cómo funciona en tres pasos y dos entradas
// (influencer y agencia). Sin tasas ni jerga financiera.
export const Inicio = () => {
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-16 bg-carbon">
        <div className="max-w-[1200px] mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
          <Logo claro />
          <nav className="flex items-center gap-5 text-[14px] text-white">
            <a href="#como-funciona" className="hidden sm:inline hover:opacity-80">Cómo funciona</a>
            <a href="#preguntas" className="hidden sm:inline hover:opacity-80">Preguntas</a>
            <Link to="/login"><Button size="sm">Ingresar</Button></Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        <div className="px-6 md:px-14 py-14 flex flex-col gap-6 justify-center max-w-[640px] lg:ml-auto">
          <span className="self-start bg-ice text-blue-link text-[13px] font-semibold px-3 py-1 rounded-full">Adelanto de pago para creadores</span>
          <h1 className="text-[40px] md:text-[52px] font-bold text-carbon leading-[1.05] tracking-[-1px]">Cobra tus colaboraciones en 24–48 horas, no en 90 días.</h1>
          <p className="text-[17px] text-ash leading-relaxed">Adelantamos el pago de colaboraciones que ya cerraste con una marca. Tú sigues negociando igual.</p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/registro?tipo=talento"><Button>Soy influencer</Button></Link>
            <Link to="/registro?tipo=agencia"><Button variant="outlined">Soy agencia</Button></Link>
          </div>
        </div>
        <div id="como-funciona" className="bg-ice px-6 md:px-14 py-14 flex flex-col gap-3 justify-center">
          <div className="max-w-[460px] w-full flex flex-col gap-3">
            <div className="text-[17px] font-semibold text-carbon">Cómo funciona</div>
            {PASOS.map(([t, d]) => (
              <div key={t} className="bg-white border border-hairline rounded-[12px] px-5 py-3.5">
                <div className="text-[17px] font-semibold text-carbon">{t}</div>
                <div className="text-[14px] text-ash">{d}</div>
              </div>
            ))}
            <div id="preguntas" className="mt-3 flex flex-col">
              {PREGUNTAS.map(([p, r], i) => (
                <div key={p} className="border-b border-hairline">
                  <button onClick={() => setAbierta(abierta === i ? null : i)} className="w-full flex items-center justify-between py-3 text-left text-[15px] text-carbon">
                    {p} <ChevronDown size={16} className={`text-ash transition-transform ${abierta === i ? 'rotate-180' : ''}`} />
                  </button>
                  {abierta === i && <div className="pb-3 text-[13.5px] text-ash leading-relaxed">{r}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <footer className="px-6 py-4 text-[12px] text-mist text-center border-t border-hairline">
        Influ · adelanto de pago para colaboraciones · <Link to="/login" className="text-blue-link hover:underline">Ingresar</Link>
      </footer>
    </div>
  );
};
