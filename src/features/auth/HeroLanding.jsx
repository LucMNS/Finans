import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  Moon,
  Repeat,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../contexts/ThemeContext";

const ROTATING_WORDS = ["clareza", "controle", "previsão", "leveza"];

export function HeroLanding({ onEnterLogin, onEnterSignup }) {
  const { isDark, toggleTheme } = useTheme();
  const wrapperRef = useRef(null);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (event) => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.setProperty("--mouse-x", `${event.clientX}px`);
    wrapperRef.current.style.setProperty("--mouse-y", `${event.clientY}px`);
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-300"
    >
      {/* Grade sutil e aurora responsiva */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(139, 92, 246, 0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 40%, black 35%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 40%, black 35%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(650px circle at var(--mouse-x, 55vw) var(--mouse-y, 35vh), rgba(139, 92, 246, 0.16), rgba(16, 185, 129, 0.08) 45%, transparent 72%)",
          }}
        />
        <Motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 right-[10%] h-80 w-80 rounded-full bg-violet-500/20 blur-[110px]"
        />
        <Motion.div
          animate={{ scale: [1.05, 0.96, 1.05], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-24 left-[8%] h-80 w-80 rounded-full bg-emerald-500/15 blur-[110px]"
        />
      </div>

      {/* Cabeçalho */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
            <Wallet size={20} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
            Finans
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:border-violet-500/40 hover:text-[var(--text-primary)]"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Button variant="ghost" size="sm" onClick={onEnterLogin}>
            Entrar
          </Button>
          <Button size="sm" onClick={onEnterSignup}>
            Criar conta
          </Button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* Texto e Ações */}
        <Motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-6 text-center lg:col-span-6 lg:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-[var(--bg-glass)] px-3.5 py-1.5 text-xs font-bold text-violet-600 shadow-sm backdrop-blur-md dark:text-violet-300">
            <Sparkles size={13} />
            Gestão pessoal com FinanscIA
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-[3.4rem]">
            Seu dinheiro com{" "}
            <span className="relative inline-flex h-[1.18em] min-w-[165px] items-center justify-center overflow-hidden align-bottom lg:justify-start">
              <AnimatePresence mode="wait">
                <Motion.span
                  key={ROTATING_WORDS[wordIndex]}
                  initial={{ y: "65%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-65%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent"
                >
                  {ROTATING_WORDS[wordIndex]}
                </Motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base lg:mx-0">
            Controle receitas, cartões, mensalidades e metas em segundos, com
            análises diretas da FinanscIA.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button size="lg" onClick={onEnterSignup} className="sm:px-7">
              Criar conta grátis
              <ArrowRight size={16} />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={onEnterLogin}
              className="bg-[var(--bg-glass)] backdrop-blur-md sm:px-7"
            >
              Já tenho conta
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 lg:justify-start">
            <Badge tone="income">Saldo livre</Badge>
            <Badge tone="warning">Alertas 75% e 100%</Badge>
            <Badge tone="ai">FinanscIA BYOK</Badge>
          </div>
        </Motion.div>

        {/* Preview Visual Interativo */}
        <Motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-md lg:col-span-6 lg:max-w-none"
        >
          <div className="relative rounded-[2rem] border border-white/30 bg-[var(--bg-glass)] p-5 shadow-[var(--shadow-float)] backdrop-blur-xl dark:border-white/10 sm:p-6">
            <div className="space-y-4">
              {/* Hero card simulado */}
              <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 p-5 text-white shadow-lg shadow-indigo-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/75">
                    Saldo Livre
                  </span>
                  <TrendingUp size={17} className="text-emerald-300" />
                </div>
                <p className="tabular-nums mt-1.5 text-3xl font-extrabold tracking-tight">
                  R$ 4.280,00
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-white/15 pt-3 text-xs font-semibold text-white/85">
                  <span>Receitas: R$ 7.500,00</span>
                  <span>Gastos: R$ 3.220,00</span>
                </div>
              </div>

              {/* Linha de Cartão e Mensalidade */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <CreditCard size={14} className="text-violet-500" />
                      Cartão Roxo
                    </span>
                    <Badge tone="warning">75%</Badge>
                  </div>
                  <p className="tabular-nums mt-2 text-sm font-extrabold text-[var(--text-primary)]">
                    R$ 1.500 / R$ 2.000
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <Motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 0.9, delay: 0.25 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    />
                  </div>
                </Motion.div>

                <Motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <Repeat size={14} className="text-emerald-500" />
                      Mensalidades
                    </span>
                    <Badge tone="income">Ativas</Badge>
                  </div>
                  <p className="tabular-nums mt-2 text-sm font-extrabold text-[var(--text-primary)]">
                    R$ 489,90 / mês
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Pix ou na fatura do cartão
                  </p>
                </Motion.div>
              </div>

              {/* Card FinanscIA */}
              <Motion.div
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/12 to-cyan-500/12 p-3.5 backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                    <Sparkles size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500 dark:text-cyan-300">
                      FinanscIA
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-[var(--text-primary)]">
                      “Cartão em 75% da meta. Que tal segurar o delivery essa
                      semana?”
                    </p>
                  </div>
                </div>
              </Motion.div>
            </div>
          </div>
        </Motion.div>
      </main>
    </div>
  );
}
