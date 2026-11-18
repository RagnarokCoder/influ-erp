import Button from './Button';
interface Props {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-carbon/30 px-4" onClick={onCancel}>
      <div className="bg-white rounded-[12px] w-full max-w-100 p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-[17px] font-semibold text-carbon">{title}</div>
        <div className="text-[14px] text-ash mt-2 leading-snug">{message}</div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'filled'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
