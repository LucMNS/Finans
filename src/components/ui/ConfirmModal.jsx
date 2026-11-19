import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
}) {
  const isDanger = tone === "danger";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showClose={false}
      closeOnBackdrop={!loading}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isDanger
              ? "border-rose-500/25 bg-rose-500/12 text-rose-500"
              : "border-amber-500/25 bg-amber-500/12 text-amber-500"
          }`}
        >
          {isDanger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        {message ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            className="w-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
