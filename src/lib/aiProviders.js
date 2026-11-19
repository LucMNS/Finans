export const AI_PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    models: [
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-flash-latest",
    ],
    placeholder: "AIzaSy...",
    keyUrl: "https://aistudio.google.com/apikey",
    consoleLabel: "Google AI Studio",
    tierHint: "Plano gratuito disponível",
    steps: [
      "Acesse o Google AI Studio e entre com sua conta Google.",
      "Clique em Create API key e gere sua chave.",
      "Copie a chave e cole no campo abaixo.",
    ],
  },
  {
    id: "groq",
    name: "Groq",
    shortName: "Groq",
    models: [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "openai/gpt-oss-20b",
    ],
    placeholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    consoleLabel: "Groq Console",
    tierHint: "Plano gratuito rápido",
    steps: [
      "Entre no Groq Console e abra API Keys.",
      "Clique em Create API Key e escolha um nome.",
      "Copie a chave (gsk_...) e cole abaixo.",
    ],
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    shortName: "OpenAI",
    models: [
      "gpt-4.1-nano",
      "gpt-4o-mini",
      "gpt-4.1-mini",
      "gpt-4o",
    ],
    placeholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    consoleLabel: "OpenAI Platform",
    tierHint: "Cobrança por uso",
    steps: [
      "Acesse a OpenAI Platform e entre na sua conta.",
      "Vá em API keys e clique em Create new secret key.",
      "Copie a chave (sk-...) e cole abaixo.",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    shortName: "Claude",
    models: [
      "claude-haiku-4-5-20251001",
      "claude-3-5-haiku-20241022",
      "claude-3-5-haiku-latest",
      "claude-sonnet-4-5-20250929",
    ],
    placeholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    consoleLabel: "Anthropic Console",
    tierHint: "Cobrança por uso",
    steps: [
      "Entre na Anthropic Console e abra API Keys.",
      "Clique em Create Key e nomeie sua chave.",
      "Copie a chave (sk-ant-...) e cole abaixo.",
    ],
  },
];

export function getProviderMeta(providerId) {
  return AI_PROVIDERS.find((p) => p.id === providerId) || AI_PROVIDERS[0];
}
