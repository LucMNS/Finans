import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Github,
  KeyRound,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

function translateAuthError(message = "") {
  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (message.includes("User already registered")) {
    return "Este e-mail já está cadastrado.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (message.includes("Password should be at least")) {
    return "A senha precisa ter no mínimo 6 caracteres.";
  }
  return message || "Erro na autenticação.";
}

function PasswordStrengthHints({ password }) {
  const checks = useMemo(
    () => [
      { label: "Mínimo 6 caracteres", ok: password.length >= 6 },
      {
        label: "Letras e números",
        ok: /[a-zA-Z]/.test(password) && /\d/.test(password),
      },
    ],
    [password],
  );

  const score = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="grid grid-cols-2 gap-1.5">
        <span
          className={`h-1 rounded-full transition-colors ${
            score >= 1
              ? score === 2
                ? "bg-emerald-500"
                : "bg-amber-500"
              : "bg-[var(--bg-elevated)]"
          }`}
        />
        <span
          className={`h-1 rounded-full transition-colors ${
            score === 2 ? "bg-emerald-500" : "bg-[var(--bg-elevated)]"
          }`}
        />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
              item.ok ? "text-emerald-500" : "text-[var(--text-muted)]"
            }`}
          >
            <Check size={11} className={item.ok ? "opacity-100" : "opacity-35"} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AuthScreen({
  initialMode = "login",
  isRecovering = false,
  onFinishedRecovery,
  onBackHero,
}) {
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const wrapperRef = useRef(null);

  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [subMode, setSubMode] = useState("auth"); // 'auth' | 'forgot'
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const activeView = isRecovering ? "update" : subMode;

  const handleMouseMove = (event) => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.setProperty("--mouse-x", `${event.clientX}px`);
    wrapperRef.current.style.setProperty("--mouse-y", `${event.clientY}px`);
  };

  const handleOAuth = async (provider) => {
    try {
      const options = { redirectTo: window.location.origin };
      if (provider === "google") {
        options.queryParams = { prompt: "select_account" };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });
      if (error) throw error;
    } catch (err) {
      toast(translateAuthError(err.message), "error");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err) {
      toast(translateAuthError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast("Informe seu nome.", "warning");
      return;
    }
    if (password.length < 6) {
      toast("A senha precisa ter no mínimo 6 caracteres.", "warning");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      });
      if (error) throw error;
      toast("Conta criada com sucesso.", "success");
      setIsSignUp(false);
      setPassword("");
    } catch (err) {
      toast(translateAuthError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast("Informe seu e-mail.", "warning");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin },
      );
      if (error) throw error;
      toast("Link de recuperação enviado.", "success");
      setSubMode("auth");
      setIsSignUp(false);
    } catch (err) {
      toast(translateAuthError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      toast("A senha precisa ter no mínimo 6 caracteres.", "warning");
      return;
    }
    if (password !== confirmPassword) {
      toast("As senhas não coincidem.", "error");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast("Senha atualizada.", "success");
      setPassword("");
      setConfirmPassword("");
      onFinishedRecovery?.();
    } catch (err) {
      toast(translateAuthError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const renderSocialButtons = () => (
    <div className="grid grid-cols-2 gap-2.5">
      <Button
        variant="secondary"
        onClick={() => handleOAuth("google")}
        className="w-full"
      >
        <GoogleIcon />
        Google
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleOAuth("github")}
        className="w-full"
      >
        <Github size={16} />
        GitHub
      </Button>
    </div>
  );

  const renderDivider = () => (
    <div className="relative flex items-center py-0.5">
      <div className="flex-grow border-t border-[var(--border-subtle)]" />
      <span className="mx-3 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        ou
      </span>
      <div className="flex-grow border-t border-[var(--border-subtle)]" />
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-10 transition-colors duration-300 sm:px-6"
    >
      {/* Esferas suaves por trás para dar profundidade ao glassmorphism */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[12%] left-[14%] h-72 w-72 rounded-full bg-violet-500/22 blur-[110px]" />
        <div className="absolute right-[12%] bottom-[12%] h-72 w-72 rounded-full bg-emerald-500/18 blur-[110px]" />
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x, 50vw) var(--mouse-y, 45vh), rgba(139, 92, 246, 0.15), rgba(16, 185, 129, 0.06) 45%, transparent 72%)",
          }}
        />
      </div>

      {/* Botão Voltar para Hero (quando disponível) */}
      {onBackHero && !isRecovering ? (
        <button
          type="button"
          onClick={onBackHero}
          className="fixed top-4 left-4 z-30 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-2xl border border-white/25 bg-[var(--bg-glass)] px-3.5 text-xs font-bold text-[var(--text-primary)] shadow-sm backdrop-blur-md transition-colors hover:border-violet-500/40 dark:border-white/10 sm:top-6 sm:left-6"
        >
          <ArrowLeft size={15} />
          Início
        </button>
      ) : null}

      {/* Botão de tema */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
        className="fixed top-4 right-4 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/25 bg-[var(--bg-glass)] text-[var(--text-secondary)] shadow-sm backdrop-blur-md transition-colors hover:border-violet-500/40 hover:text-[var(--text-primary)] dark:border-white/10 sm:top-6 sm:right-6"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Marca no topo no mobile */}
      <div className="relative z-10 mb-5 flex items-center gap-2.5 md:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
          <Wallet size={20} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Finans
        </span>
      </div>

      {/* Modos especiais: Recuperação ou Nova senha */}
      {activeView !== "auth" ? (
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/30 bg-[var(--bg-glass)] p-6 shadow-[var(--shadow-float)] backdrop-blur-xl dark:border-white/10 sm:p-8"
        >
          {activeView === "update" ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                  <ShieldCheck size={20} />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  Nova senha
                </h1>
              </div>

              <div className="space-y-1.5">
                <Input
                  id="update-pass"
                  label="Nova senha"
                  type="password"
                  leftIcon={Lock}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordStrengthHints password={password} />
              </div>

              <Input
                id="update-pass-confirm"
                label="Confirmar senha"
                type="password"
                leftIcon={Lock}
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Salvar senha
                <ArrowRight size={16} />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <button
                type="button"
                onClick={() => setSubMode("auth")}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                  <KeyRound size={20} />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  Recuperar senha
                </h1>
              </div>

              <Input
                id="forgot-email"
                label="E-mail"
                type="email"
                leftIcon={Mail}
                placeholder="voce@exemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Enviar link
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
        </Motion.div>
      ) : (
        <>
          {/* DESKTOP: Painel Duplo Deslizante com Glassmorphism Sutil */}
          <div className="relative z-10 hidden h-[560px] w-full max-w-[880px] overflow-hidden rounded-[2rem] border border-white/35 bg-[var(--bg-glass)] shadow-[var(--shadow-float)] backdrop-blur-xl dark:border-white/12 md:block">
            {/* Form Entrar */}
            <div
              className={`absolute top-0 left-0 flex h-full w-1/2 flex-col justify-center px-10 transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] lg:px-12 ${
                isSignUp
                  ? "pointer-events-none translate-x-full opacity-0 z-10"
                  : "pointer-events-auto translate-x-0 opacity-100 z-20"
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20">
                    <Wallet size={18} />
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    Entrar no Finans
                  </h1>
                </div>

                {renderSocialButtons()}
                {renderDivider()}

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <Input
                    id="desktop-login-email"
                    label="E-mail"
                    type="email"
                    leftIcon={Mail}
                    placeholder="voce@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <Input
                      id="desktop-login-password"
                      label="Senha"
                      type="password"
                      leftIcon={Lock}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSubMode("forgot")}
                        className="cursor-pointer text-xs font-semibold text-violet-500 hover:text-violet-400"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    className="w-full"
                  >
                    Entrar
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </div>
            </div>

            {/* Form Criar Conta */}
            <div
              className={`absolute top-0 left-0 flex h-full w-1/2 flex-col justify-center px-10 transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] lg:px-12 ${
                isSignUp
                  ? "pointer-events-auto translate-x-full opacity-100 z-20"
                  : "pointer-events-none translate-x-0 opacity-0 z-10"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20">
                    <Wallet size={18} />
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    Criar conta
                  </h1>
                </div>

                {renderSocialButtons()}
                {renderDivider()}

                <form onSubmit={handleSignUp} className="space-y-3">
                  <Input
                    id="desktop-signup-name"
                    label="Nome completo"
                    type="text"
                    leftIcon={User}
                    placeholder="Como quer ser chamado"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />

                  <Input
                    id="desktop-signup-email"
                    label="E-mail"
                    type="email"
                    leftIcon={Mail}
                    placeholder="voce@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <Input
                      id="desktop-signup-password"
                      label="Senha"
                      type="password"
                      leftIcon={Lock}
                      placeholder="Mínimo 6 caracteres"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <PasswordStrengthHints password={password} />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    className="w-full"
                  >
                    Criar conta
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </div>
            </div>

            {/* Painel Deslizante com Gradiente */}
            <div
              className={`absolute top-0 left-1/2 z-30 h-full w-1/2 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                isSignUp
                  ? "-translate-x-full rounded-r-[6.5rem]"
                  : "translate-x-0 rounded-l-[6.5rem]"
              }`}
            >
              <div
                className={`relative -left-full flex h-full w-[200%] bg-gradient-to-br from-violet-600/95 via-indigo-600/95 to-emerald-500/95 text-white backdrop-blur-md transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                  isSignUp ? "translate-x-1/2" : "translate-x-0"
                }`}
              >
                <div
                  className={`flex h-full w-1/2 flex-col items-center justify-center px-10 text-center transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                    isSignUp ? "translate-x-0" : "-translate-x-[20%]"
                  }`}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
                    <Wallet size={28} />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Já tem conta?
                  </h2>
                  <p className="mt-3 max-w-xs text-sm text-white/85">
                    Entre para acompanhar seu saldo, faturas e metas no Finans.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="mt-7 cursor-pointer rounded-2xl border border-white/60 bg-white/12 px-8 py-3 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-white hover:text-indigo-700"
                  >
                    Entrar
                  </button>
                </div>

                <div
                  className={`flex h-full w-1/2 flex-col items-center justify-center px-10 text-center transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                    isSignUp ? "translate-x-[20%]" : "translate-x-0"
                  }`}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
                    <Wallet size={28} />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Novo por aqui?
                  </h2>
                  <p className="mt-3 max-w-xs text-sm text-white/85">
                    Crie sua conta e controle receitas, cartões e mensalidades.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="mt-7 cursor-pointer rounded-2xl border border-white/60 bg-white/12 px-8 py-3 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-white hover:text-indigo-700"
                  >
                    Criar conta
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE: Card Glassmorphism Sutil */}
          <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/30 bg-[var(--bg-glass)] p-6 shadow-[var(--shadow-float)] backdrop-blur-xl dark:border-white/10 md:hidden">
            <AnimatePresence mode="wait">
              {isSignUp ? (
                <Motion.div
                  key="mob-signup"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4"
                >
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    Criar conta
                  </h1>

                  {renderSocialButtons()}
                  {renderDivider()}

                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <Input
                      id="mob-signup-name"
                      label="Nome completo"
                      type="text"
                      leftIcon={User}
                      placeholder="Como quer ser chamado"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <Input
                      id="mob-signup-email"
                      label="E-mail"
                      type="email"
                      leftIcon={Mail}
                      placeholder="voce@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <Input
                        id="mob-signup-password"
                        label="Senha"
                        type="password"
                        leftIcon={Lock}
                        placeholder="Mínimo 6 caracteres"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <PasswordStrengthHints password={password} />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      loading={loading}
                      className="w-full"
                    >
                      Criar conta
                      <ArrowRight size={16} />
                    </Button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="w-full cursor-pointer rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Já tem conta?{" "}
                    <span className="font-bold text-violet-500">Entrar</span>
                  </button>
                </Motion.div>
              ) : (
                <Motion.div
                  key="mob-login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4"
                >
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    Entrar
                  </h1>

                  {renderSocialButtons()}
                  {renderDivider()}

                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <Input
                      id="mob-login-email"
                      label="E-mail"
                      type="email"
                      leftIcon={Mail}
                      placeholder="voce@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <Input
                        id="mob-login-password"
                        label="Senha"
                        type="password"
                        leftIcon={Lock}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSubMode("forgot")}
                          className="cursor-pointer text-xs font-semibold text-violet-500"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      loading={loading}
                      className="w-full"
                    >
                      Entrar
                      <ArrowRight size={16} />
                    </Button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="w-full cursor-pointer rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Novo por aqui?{" "}
                    <span className="font-bold text-violet-500">
                      Criar conta
                    </span>
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
