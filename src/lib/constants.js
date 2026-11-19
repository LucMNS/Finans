export const MONTHS = [
  { value: 1, label: "Janeiro", short: "Jan" },
  { value: 2, label: "Fevereiro", short: "Fev" },
  { value: 3, label: "Março", short: "Mar" },
  { value: 4, label: "Abril", short: "Abr" },
  { value: 5, label: "Maio", short: "Mai" },
  { value: 6, label: "Junho", short: "Jun" },
  { value: 7, label: "Julho", short: "Jul" },
  { value: 8, label: "Agosto", short: "Ago" },
  { value: 9, label: "Setembro", short: "Set" },
  { value: 10, label: "Outubro", short: "Out" },
  { value: 11, label: "Novembro", short: "Nov" },
  { value: 12, label: "Dezembro", short: "Dez" },
];

export function getAvailableYears(selectedYear = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(2024, Number(selectedYear) || 2024);
  const maxYear = Math.max(2036, currentYear + 10, Number(selectedYear) || 2036);
  const years = [];
  for (let y = minYear; y <= maxYear; y += 1) {
    years.push({ value: y, label: String(y) });
  }
  return years;
}

export const CATEGORY_COLORS = [
  "#10b981",
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#3b82f6",
  "#f97316",
  "#84cc16",
  "#d946ef",
];

export const CARD_COLORS = [
  { label: "Violeta", value: "#7c3aed" },
  { label: "Índigo", value: "#4f46e5" },
  { label: "Esmeralda", value: "#059669" },
  { label: "Ciano", value: "#0284c7" },
  { label: "Rosa", value: "#db2777" },
  { label: "Âmbar", value: "#d97706" },
  { label: "Grafite", value: "#334155" },
];

export const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", shortLabel: "Início" },
  { id: "transactions", label: "Movimentações", shortLabel: "Extrato" },
  { id: "cards", label: "Cartões & Metas", shortLabel: "Cartões" },
  { id: "recurring", label: "Mensalidades", shortLabel: "Fixas" },
  { id: "analytics", label: "Análises", shortLabel: "Análises" },
  { id: "ai", label: "FinanscIA", shortLabel: "FinanscIA" },
  { id: "settings", label: "Configurações", shortLabel: "Ajustes" },
];
