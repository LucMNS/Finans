import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CreditCard,
  Download,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import {
  disableDeviceNotifications,
  enableDeviceNotifications,
  getNotificationEnvironment,
  sendTestNotification,
} from "../../services/pushService";
import { ByokSetupCard } from "../ai/ByokSetupCard";

export function SettingsPage() {
  const {
    user,
    displayName,
    preferences,
    updateDisplayName,
    updatePreferences,
    signOut,
    deleteAccount,
  } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { toast } = useToast();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();

  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [savingAutoForward, setSavingAutoForward] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [notifEnv, setNotifEnv] = useState(() => getNotificationEnvironment());
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  const handleSaveName = async (event) => {
    event.preventDefault();
    if (!nameInput.trim()) {
      toast("Informe seu nome.", "warning");
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(nameInput);
      toast("Nome atualizado.", "success");
    } catch (err) {
      toast(err.message || "Erro ao atualizar nome.", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleThemeChange = async (mode) => {
    setThemeMode(mode);
    try {
      await updatePreferences({ theme: mode });
    } catch {
      // mantém localmente
    }
  };

  const handleToggleAutoForward = async () => {
    const nextValue = !preferences.auto_forward_card_expenses;
    setSavingAutoForward(true);
    try {
      await updatePreferences({ auto_forward_card_expenses: nextValue });
      toast(
        nextValue
          ? "Avanço automático ativado."
          : "Avanço automático desativado.",
        "success",
      );
    } catch {
      toast("Erro ao salvar preferência.", "error");
    } finally {
      setSavingAutoForward(false);
    }
  };

  const handleToggleMasterNotifications = async () => {
    setSavingNotif(true);
    try {
      if (preferences.notifications_enabled) {
        await disableDeviceNotifications({ userId: user?.id });
        await updatePreferences({ notifications_enabled: false });
        setNotifEnv(getNotificationEnvironment());
        toast("Notificações desativadas neste dispositivo.", "info");
      } else {
        const result = await enableDeviceNotifications({ userId: user?.id });
        setNotifEnv(getNotificationEnvironment());
        if (!result.granted) {
          toast("Permissão negada no navegador.", "warning");
          return;
        }
        await updatePreferences({ notifications_enabled: true });
        toast(
          result.pushSubscribed
            ? "Notificações Web Push ativadas."
            : "Notificações no dispositivo ativadas.",
          "success",
        );
      }
    } catch (err) {
      toast(err.message || "Erro ao configurar notificações.", "error");
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleNotifPref = async (key) => {
    const nextValue = !preferences[key];
    try {
      await updatePreferences({ [key]: nextValue });
    } catch {
      toast("Erro ao salvar preferência.", "error");
    }
  };

  const handleTestNotification = async () => {
    setTestingNotif(true);
    try {
      const res = await sendTestNotification();
      if (res.localOk || res.remoteDelivered > 0) {
        toast("Notificação de teste enviada.", "success");
      } else {
        toast("Ative a permissão de notificações primeiro.", "warning");
      }
    } finally {
      setTestingNotif(false);
    }
  };

  const handleInstallPwa = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast("Finans instalado no dispositivo.", "success");
    }
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast("Sessão encerrada.", "info");
    } catch {
      toast("Erro ao sair.", "error");
      setLoggingOut(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast("Conta excluída.", "success");
    } catch (err) {
      toast(err.message || "Erro ao excluir conta.", "error");
      setDeleting(false);
    }
  };

  const notifStatusBadge =
    notifEnv.permission === "denied"
      ? { tone: "danger", label: "Bloqueado" }
      : preferences.notifications_enabled && notifEnv.permission === "granted"
        ? { tone: "income", label: "Ativo" }
        : { tone: "neutral", label: "Desativado" };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        Configurações
      </h1>

      {/* Perfil */}
      <Card>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
              <User size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Perfil
              </h2>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              id="settings-display-name"
              label="Nome de exibição"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Seu nome"
              required
            />
            <Button type="submit" loading={savingName}>
              <Save size={15} />
              Salvar
            </Button>
          </div>
        </form>
      </Card>

      {/* Aparência */}
      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Tema
        </h2>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[
            { id: "light", label: "Claro", icon: Sun },
            { id: "dark", label: "Escuro", icon: Moon },
            { id: "system", label: "Sistema", icon: Monitor },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border py-3.5 text-xs font-bold transition-all ${
                  active
                    ? "border-violet-500 bg-violet-500/12 text-violet-600 dark:text-violet-300"
                    : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                <Icon size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Avanço Automático */}
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-500">
            <CreditCard size={19} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Avanço Automático de Fatura
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Compras após o fechamento vão para o próximo mês.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={preferences.auto_forward_card_expenses}
          disabled={savingAutoForward}
          onClick={handleToggleAutoForward}
          className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
            preferences.auto_forward_card_expenses
              ? "bg-violet-600"
              : "border border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              preferences.auto_forward_card_expenses
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
      </Card>

      {/* Notificações no Dispositivo (Desktop, Tablet e Celular) & PWA */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-500">
              <Bell size={19} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Notificações no Dispositivo
                </h2>
                <Badge tone={notifStatusBadge.tone}>
                  {notifStatusBadge.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Alertas em tempo real e push no navegador ou app instalado.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={
              Boolean(preferences.notifications_enabled) &&
              notifEnv.permission === "granted"
            }
            disabled={savingNotif || !notifEnv.supportsNotifications}
            onClick={handleToggleMasterNotifications}
            className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
              preferences.notifications_enabled &&
              notifEnv.permission === "granted"
                ? "bg-violet-600"
                : "border border-[var(--border-strong)] bg-[var(--bg-elevated)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                preferences.notifications_enabled &&
                notifEnv.permission === "granted"
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {notifEnv.needsAppleHomeScreen ? (
          <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-300">
            No Safari (iOS/iPadOS), adicione o Finans à Tela de Início para
            liberar notificações.
          </p>
        ) : null}

        {notifEnv.permission === "denied" ? (
          <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-500">
            Permissão bloqueada nas configurações do navegador deste dispositivo.
          </p>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { key: "notify_card_goal_75", label: "Cartão atingir 75% da meta" },
            { key: "notify_card_goal_100", label: "Cartão atingir 100% da meta" },
            { key: "notify_invoice_closing", label: "Fechamento de fatura" },
            { key: "notify_ai_pills", label: "Pílulas de dicas da FinanscIA" },
          ].map((item) => {
            const checked = Boolean(preferences[item.key]);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleNotifPref(item.key)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-3 text-left transition-colors hover:border-[var(--border-strong)]"
              >
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {item.label}
                </span>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    checked ? "bg-emerald-500" : "bg-[var(--border-strong)]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button
            size="sm"
            variant="secondary"
            loading={testingNotif}
            onClick={handleTestNotification}
          >
            <BellRing size={14} />
            Testar notificação
          </Button>

          {canInstall ? (
            <Button size="sm" onClick={handleInstallPwa}>
              <Download size={14} />
              Instalar app (PWA)
            </Button>
          ) : isInstalled ? (
            <Badge tone="income">App instalado</Badge>
          ) : null}
        </div>
      </Card>

      {/* Inteligência Artificial (BYOK) */}
      <ByokSetupCard />

      {/* Sessão / Trocar Conta */}
      <Card className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Sessão
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Encerrar sessão atual ou entrar com outra conta.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setLogoutOpen(true)}
          className="shrink-0"
        >
          <LogOut size={15} />
          Sair / Trocar de conta
        </Button>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-rose-500/25 bg-rose-500/[0.03]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-rose-500">
              Excluir Conta
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Remove sua conta e todos os seus dados permanentemente.
            </p>
          </div>
          <Button
            variant="danger-soft"
            onClick={() => setDeleteOpen(true)}
            className="shrink-0"
          >
            <Trash2 size={15} />
            Excluir conta
          </Button>
        </div>
      </Card>

      <ConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Sair ou trocar de conta?"
        message="Você voltará para a tela de login."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        tone="warning"
        loading={loggingOut}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Excluir conta permanentemente?"
        message="Todos os seus dados financeiros serão apagados sem possibilidade de recuperação."
        confirmLabel="Excluir tudo"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
