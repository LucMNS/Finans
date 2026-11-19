import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { AI_PROVIDERS, getProviderMeta } from "../../lib/aiProviders";
import {
  getByokConfig,
  removeByokKey,
  saveByokConfig,
  subscribeByokUpdates,
  testAiConnection,
} from "../../services/aiService";

export function ByokSetupCard({ onConfigured, compact = false }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState(() => getByokConfig(user?.id));
  const [selectedProvider, setSelectedProvider] = useState(
    () => getByokConfig(user?.id).provider,
  );
  const [keyInput, setKeyInput] = useState(
    () => getByokConfig(user?.id).keys[getByokConfig(user?.id).provider] || "",
  );
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const sync = () => {
      setConfig(getByokConfig(user?.id));
    };
    sync();
    return subscribeByokUpdates(sync);
  }, [user?.id]);

  const handleSelectProvider = (providerId) => {
    setSelectedProvider(providerId);
    setKeyInput(config.keys[providerId] || "");

    if ((config.keys[providerId] || "").trim()) {
      saveByokConfig(user?.id, (curr) => ({
        ...curr,
        provider: providerId,
      }));
    }
  };

  const providerMeta = getProviderMeta(selectedProvider);
  const savedKeyForProvider = (config.keys[selectedProvider] || "").trim();
  const isActiveProvider =
    config.provider === selectedProvider && Boolean(savedKeyForProvider);

  const handleSave = (event) => {
    event.preventDefault();
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      toast("Cole sua chave de API primeiro.", "warning");
      return;
    }

    saveByokConfig(user?.id, (curr) => ({
      ...curr,
      provider: selectedProvider,
      keys: { ...curr.keys, [selectedProvider]: trimmedKey },
    }));

    toast(`Chave ${providerMeta.shortName} salva neste navegador.`, "success");
    onConfigured?.();
  };

  const handleTest = async () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      toast("Cole a chave antes de testar.", "warning");
      return;
    }
    setTesting(true);
    try {
      await testAiConnection({
        userId: user?.id,
        provider: selectedProvider,
        apiKey: trimmedKey,
      });
      toast(`Conexão com ${providerMeta.shortName} confirmada.`, "success");
    } catch (err) {
      toast(err.message || "Falha ao testar chave.", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = () => {
    removeByokKey(user?.id, selectedProvider);
    setKeyInput("");
    toast(`Chave ${providerMeta.shortName} removida.`, "info");
  };

  return (
    <Card padding={compact ? "p-4 sm:p-5" : "p-5 sm:p-6"} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/15 to-cyan-500/15 text-violet-500">
            <Sparkles size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                FinanscIA (BYOK)
              </h2>
              {isActiveProvider ? (
                <Badge tone="income">
                  <CheckCircle2 size={12} />
                  {providerMeta.shortName} ativo
                </Badge>
              ) : (
                <Badge tone="neutral">Salva só no navegador</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Escolha o provedor e informe sua API Key. O melhor modelo é
              selecionado automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Seletor Multi-Provedor */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AI_PROVIDERS.map((prov) => {
          const active = selectedProvider === prov.id;
          const hasKey = Boolean((config.keys[prov.id] || "").trim());
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => handleSelectProvider(prov.id)}
              className={`flex cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                active
                  ? "border-violet-500 bg-violet-500/10 shadow-sm"
                  : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {prov.shortName}
                </span>
                {hasKey ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                ) : null}
              </div>
              <span className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-muted)]">
                {prov.tierHint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Guia rápido + Link oficial */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-[var(--text-primary)]">
            Como gerar sua chave ({providerMeta.name})
          </p>
          <a
            href={providerMeta.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-bold text-violet-500 shadow-sm transition-colors hover:text-violet-400"
          >
            Abrir {providerMeta.consoleLabel}
            <ExternalLink size={12} />
          </a>
        </div>

        <ol className="mt-2.5 space-y-1 text-xs text-[var(--text-secondary)]">
          {providerMeta.steps.map((step, index) => (
            <li key={step}>
              <span className="mr-1.5 font-bold text-violet-500">
                {index + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Formulário apenas com API Key */}
      <form onSubmit={handleSave} className="space-y-3">
        <Input
          id={`byok-key-${selectedProvider}`}
          label={`API Key (${providerMeta.shortName})`}
          type="password"
          leftIcon={KeyRound}
          placeholder={providerMeta.placeholder}
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm">
            Salvar e ativar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={testing}
            onClick={handleTest}
          >
            <Zap size={14} />
            Testar conexão
          </Button>

          {savedKeyForProvider ? (
            <Button
              type="button"
              size="sm"
              variant="danger-soft"
              onClick={handleRemove}
            >
              <Trash2 size={14} />
              Remover chave
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
