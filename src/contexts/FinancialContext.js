import { createContext, useContext } from "react";

export const FinancialContext = createContext(null);

export function useFinancialData() {
  const ctx = useContext(FinancialContext);
  if (!ctx) {
    throw new Error(
      "useFinancialData deve ser usado dentro de FinancialProvider.",
    );
  }
  return ctx;
}
