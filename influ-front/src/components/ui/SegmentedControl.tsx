interface SegOpt { id: string; label: string; }
interface SegProps { options: SegOpt[]; value: string; onChange: (id: string) => void; }
export default function SegmentedControl({ options, value, onChange }: SegProps) {
  return (
    <div className="inline-flex bg-pebble rounded-full p-0.5 gap-0.5">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
            value === o.id ? 'bg-white text-carbon shadow-sm' : 'text-ash hover:text-carbon'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
