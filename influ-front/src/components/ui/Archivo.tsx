import { useRef } from 'react';
import { Upload, FileCheck2, X } from 'lucide-react';

interface Props {
  titulo: string;
  ayuda: string;
  /** Nombres de los archivos elegidos. En el demo no se sube nada: se guarda el nombre. */
  archivos: string[];
  onChange: (archivos: string[]) => void;
  acepta?: string;
  multiple?: boolean;
  /** Nombre de ejemplo para el botón "Usar archivo de ejemplo" (demo sin archivos a la mano). */
  ejemplo?: string;
}

// Zona de carga: arrastrar o elegir. La lectura del contenido es simulada; lo
// que cuenta para las reglas es que el archivo exista y tenga la extensión correcta.
export default function Archivo({ titulo, ayuda, archivos, onChange, acepta, multiple, ejemplo }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const agregar = (lista: FileList | null) => {
    if (!lista?.length) return;
    const nombres = Array.from(lista).map((f) => f.name);
    onChange(multiple ? [...archivos, ...nombres.filter((n) => !archivos.includes(n))] : [nombres[0]]);
  };
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); agregar(e.dataTransfer.files); }}
      className={`border border-dashed rounded-[8px] px-4 py-3.5 flex items-start gap-3 ${archivos.length ? 'border-success/40 bg-success-wash/40' : 'border-hairline bg-white'}`}
    >
      <span className={`p-2 rounded-[8px] shrink-0 ${archivos.length ? 'bg-success-wash' : 'bg-ice'}`}>
        {archivos.length ? <FileCheck2 size={16} className="text-success" strokeWidth={1.6} /> : <Upload size={16} className="text-blue-link" strokeWidth={1.6} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-carbon">{titulo}</div>
        <div className="text-[11.5px] text-ash leading-snug">{ayuda}</div>
        {archivos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {archivos.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 text-[11px] bg-white border border-hairline rounded-full pl-2 pr-1 py-0.5 text-carbon max-w-full">
                <span className="truncate">{a}</span>
                <button type="button" onClick={() => onChange(archivos.filter((x) => x !== a))} className="p-0.5 rounded-full hover:bg-frost" title="Quitar">
                  <X size={11} className="text-ash" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={() => ref.current?.click()} className="text-[12px] text-blue-link font-medium hover:underline">
            {archivos.length && !multiple ? 'Cambiar archivo' : 'Elegir archivo'}
          </button>
          {ejemplo && !archivos.includes(ejemplo) && (
            <button type="button" onClick={() => onChange(multiple ? [...archivos, ejemplo] : [ejemplo])} className="text-[12px] text-ash hover:text-carbon hover:underline">
              Usar archivo de ejemplo
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" className="hidden" accept={acepta} multiple={multiple} onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
