import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, ArrowRight, KeyRound } from 'lucide-react';

export default function Login({ modeOverride, onFinishedUpdate }) {
  const [mode, setMode] = useState(modeOverride || 'login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: username } }
        });
        if (error) throw error;
        alert("Conta criada! Tente entrar.");
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        alert("Link enviado! Verifique seu e-mail.");
        setMode('login');
      } else if (mode === 'update') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        alert("Senha atualizada!");
        if (onFinishedUpdate) onFinishedUpdate();
      }
    } catch (err) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-page)] p-4 sm:p-6">
      <motion.div layout className="w-full max-w-md bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-[var(--color-border)]">
        <header className="mb-8">
          <h1 className={`text-4xl font-black mb-2 ${mode === 'register' ? 'text-primary-500' : mode === 'update' ? 'text-orange-500' : 'text-emerald-500'}`}>
            {mode === 'register' ? 'Criar Conta' : mode === 'reset' ? 'Recuperar' : mode === 'update' ? 'Nova Senha' : 'Finans.'}
          </h1>
          <p className="font-medium opacity-60">
            {mode === 'update' ? 'Escolha sua nova senha segura.' : 'Gerencie seu dinheiro com inteligência.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode='wait'>
            {mode === 'register' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="relative">
                <User className="absolute left-4 top-4 opacity-30" size={20} />
                <input type="text" placeholder="Nome" required className="w-full p-4 pl-12 rounded-2xl bg-[var(--color-bg-page)] outline-none font-bold focus:ring-2 ring-primary-500 dark:text-white" value={username} onChange={e => setUsername(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          {mode !== 'update' && (
            <div className="relative">
              <Mail className="absolute left-4 top-4 opacity-30" size={20} />
              <input type="email" placeholder="E-mail" required className="w-full p-4 pl-12 rounded-2xl bg-[var(--color-bg-page)] outline-none font-bold focus:ring-2 ring-primary-500 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="relative">
              <Lock className="absolute left-4 top-4 opacity-30" size={20} />
              <input type="password" placeholder={mode === 'update' ? "Nova Senha" : "Senha"} required className="w-full p-4 pl-12 rounded-2xl bg-[var(--color-bg-page)] outline-none font-bold focus:ring-2 ring-primary-500 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}

          <button disabled={loading} className={`w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${mode === 'register' ? 'bg-primary-600 shadow-primary-500/30' : mode === 'update' ? 'bg-orange-600 shadow-orange-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
            {loading ? 'Processando...' : mode === 'register' ? 'Finalizar Cadastro' : mode === 'reset' ? 'Enviar Link' : mode === 'update' ? 'Confirmar Nova Senha' : 'Entrar no Painel'}
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 items-center">
          {mode === 'login' && (
            <button onClick={() => setMode('reset')} className="text-xs font-black opacity-40 hover:opacity-100 flex items-center gap-2 uppercase tracking-widest transition-all">
              <KeyRound size={12} /> Esqueci minha senha
            </button>
          )}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm font-black opacity-60 hover:text-primary-500 transition-all uppercase tracking-widest">
            {mode === 'login' ? 'Criar nova conta' : 'Voltar para o Login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}