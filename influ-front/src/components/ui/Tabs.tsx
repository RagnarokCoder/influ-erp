interface Tab { id: string; label: string; count?: number; }
interface TabsProps { tabs: Tab[]; active: string; onChange: (id: string) => void; }
export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-hairline gap-0 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors whitespace-nowrap ${
            active === t.id ? 'border-blue text-blue-link' : 'border-transparent text-ash hover:text-carbon'
          }`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-[11px] opacity-70">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
