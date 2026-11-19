import { useState } from "react";
import { Check, Edit2, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { CATEGORY_COLORS } from "../../lib/constants";

export function CategoriesModal({ isOpen, onClose, onSelectCategory }) {
  const { categories, addCategory, renameCategory, deleteCategory } =
    useFinancialData();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!newName.trim()) {
      toast("Digite o nome da categoria.", "warning");
      return;
    }
    setCreating(true);
    try {
      const created = await addCategory({ name: newName, color: newColor });
      setNewName("");
      if (created && onSelectCategory) {
        onSelectCategory(created.id);
      }
    } catch (err) {
      toast(err.message || "Categoria já existe.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRename = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setSavingEdit(true);
    try {
      await renameCategory({ id, name: trimmed });
      setEditingId(null);
    } catch (err) {
      toast(err.message || "Erro ao renomear categoria.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err) {
      toast(err.message || "Erro ao excluir categoria.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Categorias"
        description="Renomear atualiza o histórico automaticamente."
        size="md"
      >
        <div className="space-y-5">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-2">
              <Input
                id="new-category-name"
                leftIcon={Tag}
                placeholder="Nova categoria..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button
                type="submit"
                loading={creating}
                className="shrink-0 px-4"
              >
                <Plus size={16} />
                Criar
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  aria-label={`Selecionar cor ${color}`}
                  className={`h-6 w-6 cursor-pointer rounded-full transition-transform ${
                    newColor === color
                      ? "scale-115 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </form>

          <div className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <p className="py-8 text-center text-xs font-medium text-[var(--text-muted)]">
                Nenhuma categoria cadastrada.
              </p>
            ) : (
              categories.map((cat) => {
                const isEditing = editingId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color || "#8b5cf6" }}
                      />

                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveRename(cat.id);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          className="w-full border-b border-violet-500 bg-transparent pb-0.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none"
                        />
                      ) : (
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {cat.name}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => handleSaveRename(cat.id)}
                            aria-label="Salvar categoria"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancelar edição"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditingName(cat.name);
                            }}
                            aria-label={`Editar ${cat.name}`}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-violet-500"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            aria-label={`Excluir ${cat.name}`}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir categoria?"
        message={
          categoryToDelete
            ? `"${categoryToDelete.name}" sairá das opções, mas os gastos antigos serão mantidos.`
            : ""
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleting}
      />
    </>
  );
}
