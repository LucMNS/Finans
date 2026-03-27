import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Github, AlertCircle, CheckCircle2 } from 'lucide-react';
import './Login.css';

export default function Login({ modeOverride, onFinishedUpdate }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const handleOAuth = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err) {
      showToast("Erro ao conectar com " + provider + ": " + err.message, "error");
    }
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'register') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: username } }
        });
        if (error) throw error;
        showToast("Conta criada com sucesso! Você já pode entrar.", "success");
        setIsSignUp(false); 
      } else if (type === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      let msg = err.message;
      if (msg.includes("Invalid login credentials")) msg = "E-mail ou senha incorretos.";
      if (msg.includes("User already registered")) msg = "Este e-mail já está em uso.";
      
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return showToast("Por favor, insira seu email no campo para recuperar a senha.", "error");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      showToast("Link de recuperação enviado para seu e-mail!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );

  return (
    <div className="login-wrapper relative">
      
      <AnimatePresence>
        {toast.visible && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 20, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 shadow-red-500/20' : 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20'}`}
          >
            {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`anim-container ${isSignUp ? 'active' : ''}`} id="container">
        
        <div className="form-container sign-up">
          <form onSubmit={(e) => handleSubmit(e, 'register')}>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>Criar conta</h1>
            <div className="social-icons">
              <button type="button" onClick={() => handleOAuth('google')}><GoogleIcon /></button>
              <button type="button" onClick={() => handleOAuth('github')}><Github size={20} /></button>
            </div>
            <span>Ou use seu email para registrar</span>
            <input type="text" placeholder="Nome" required value={username} onChange={e => setUsername(e.target.value)} />
            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Inscreva-se'}</button>
            
            <p className="mobile-only-toggle" onClick={() => setIsSignUp(false)}>Já tem conta? Entrar</p>
          </form>
        </div>

        <div className="form-container sign-in">
          <form onSubmit={(e) => handleSubmit(e, 'login')}>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>Faça seu login</h1>
            <div className="social-icons">
              <button type="button" onClick={() => handleOAuth('google')}><GoogleIcon /></button>
              <button type="button" onClick={() => handleOAuth('github')}><Github size={20} /></button>
            </div>
            <span>Ou use sua senha de e-mail</span>
            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} />
            <a href="#" onClick={(e) => { e.preventDefault(); handleResetPassword(); }}>Esqueceu a senha?</a>
            <button type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Entrar'}</button>

            <p className="mobile-only-toggle" onClick={() => setIsSignUp(true)}>Criar nova conta</p>
          </form>
        </div>

        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Bem-vindo de volta!</h1>
              <p style={{ color: '#fff' }}>Insira seus dados pessoais para usar todos os recursos do site</p>
              <button type="button" className="hidden-btn" onClick={() => setIsSignUp(false)}>Entrar</button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Olá, amigo!</h1>
              <p style={{ color: '#fff' }}>Cadastre-se com seus dados pessoais para começar a gerenciar seu dinheiro</p>
              <button type="button" className="hidden-btn" onClick={() => setIsSignUp(true)}>Inscreva-se</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
