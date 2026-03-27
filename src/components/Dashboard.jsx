import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, BarChart3, Sun, Moon, Plus, Wallet, 
  Trash2, LogOut, Menu, X, TrendingUp, ChevronDown, Calendar, 
  PieChart as PieChartIcon, Settings, User, Save, List, Search,
  Power, Edit2, CreditCard, CheckCircle2, Banknote, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';

// --- CONSTANTES ---
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const anos = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

function SeletorAnimado({ value, options, onChange, icon: Icon, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ zIndex: isOpen ? 100 : 1 }}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--color-bg-page)] dark:bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:border-primary-500 transition-all font-black text-xs uppercase">
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-primary-500 shrink-0" />}
          <span className="truncate">{value || "Selecione..."}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-[150] overflow-hidden">
            <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
              {options.length === 0 ? <p className="text-[10px] font-black uppercase p-4 opacity-40 text-center">Vazio</p> : 
                options.map((opt) => (
                  <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase ${String(value) === String(opt) ? 'bg-primary-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{opt}</button>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard({ userName, toggleDarkMode, isDarkMode, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('painel');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [distView, setDistView] = useState('horizontal');
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermCredito, setSearchTermCredito] = useState("");

  const [data, setData] = useState({ receitas: [], gastos: [], cats: [], mensalidades: [], cartoes: [] });

  const [mNome, setMNome] = useState(''); const [mValor, setMValor] = useState('');
  const [editingMensId, setEditingMensId] = useState(null);
  const [cNome, setCNome] = useState(''); const [cFechamento, setCFechamento] = useState('');
  const [rFonte, setRFonte] = useState(''); const [rValor, setRValor] = useState('');
  const [gCat, setGCat] = useState(''); const [gValor, setGValor] = useState('');
  const [novaCatInput, setNovaCatInput] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('dinheiro');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newUserName, setNewUserName] = useState(userName);

  // --- SISTEMA DE NOTIFICAÇÕES (TOAST) ---
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000); 
  };

  const fetchDados = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: recs } = await supabase.from('receitas').select('*').eq('user_id', authUser.id);
    const { data: gasts } = await supabase.from('gastos').select('*').eq('user_id', authUser.id);
    const { data: catList } = await supabase.from('categorias').select('nome').eq('user_id', authUser.id);
    const { data: mensList } = await supabase.from('mensalidades').select('*').eq('user_id', authUser.id);
    const { data: cardList } = await supabase.from('cartoes').select('*').eq('user_id', authUser.id);
    setData({ receitas: recs || [], gastos: gasts || [], cats: catList ? catList.map(c => c.nome) : [], mensalidades: mensList || [], cartoes: cardList || [] });
  };
  useEffect(() => { fetchDados(); }, [userName]);

  const saudacao = useMemo(() => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }, []);

  const incomeTotal = useMemo(() => data.receitas.filter(r => r.mes === selectedMonth && Number(r.ano) === Number(selectedYear)).reduce((a, b) => a + b.valor, 0), [data, selectedMonth, selectedYear]);
  
  const despesasDinheiro = useMemo(() => {
    const gD = data.gastos.filter(g => g.mes === selectedMonth && Number(g.ano) === Number(selectedYear) && !g.cartao_id).reduce((a, b) => a + b.valor, 0);
    const mens = data.mensalidades.filter(m => m.ativa).reduce((a, b) => a + b.valor, 0);
    return gD + mens;
  }, [data, selectedMonth, selectedYear]);

  const despesasCredito = useMemo(() => {
    return data.gastos.filter(g => g.mes === selectedMonth && Number(g.ano) === Number(selectedYear) && g.cartao_id).reduce((a, b) => a + b.valor, 0);
  }, [data, selectedMonth, selectedYear]);

  const totalExpenses = despesasDinheiro + despesasCredito;

  const dadosPizza = useMemo(() => {
    const gMes = data.gastos.filter(g => g.mes === selectedMonth && Number(g.ano) === Number(selectedYear));
    const map = gMes.reduce((acc, curr) => { acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor; return acc; }, {});
    const totalM = data.mensalidades.filter(m => m.ativa).reduce((a, b) => a + b.valor, 0);
    if (totalM > 0) map['Mensalidades'] = (map['Mensalidades'] || 0) + totalM;
    return Object.keys(map).map(c => ({ name: c, value: map[c], percString: totalExpenses > 0 ? ((map[c]/totalExpenses)*100).toFixed(0) + '%' : '0%' })).sort((a, b) => b.value - a.value);
  }, [data, totalExpenses, selectedMonth, selectedYear]);

  // --- AÇÕES ATUALIZADAS COM TOAST ---
  const pagarFatura = async (cartaoId) => {
    await supabase.from('gastos').update({ fatura_paga: true }).eq('cartao_id', cartaoId).eq('mes', selectedMonth).eq('ano', Number(selectedYear));
    showToast("Fatura paga com sucesso!", "success");
    fetchDados();
  };

  const addReceita = async () => {
    const v = parseFloat(rValor.replace(/\./g, '').replace(',', '.'));
    if (!v || !rFonte) return showToast("Preencha a fonte e o valor da renda!", "error");
    const { data: { user } } = await supabase.auth.getUser();
    const agora = new Date();
    await supabase.from('receitas').insert([{ user_id: user.id, fonte: rFonte, valor: v, data: agora.toLocaleDateString('pt-BR'), hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), mes: selectedMonth, ano: Number(selectedYear) }]);
    showToast("Renda adicionada!", "success");
    setRFonte(''); setRValor(''); fetchDados();
  };

  const addGasto = async () => {
    const v = parseFloat(gValor.replace(/\./g, '').replace(',', '.'));
    if (!v || !gCat) return showToast("Selecione uma categoria e preencha o valor do gasto!", "error");
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const agora = new Date();
    const diaHoje = agora.getDate();
    
    let targetMonth = selectedMonth;
    let targetYear = Number(selectedYear);

    if (selectedCardId !== 'dinheiro') {
      const card = data.cartoes.find(c => c.id === selectedCardId);
      if (diaHoje > card.dia_fechamento) {
        targetMonth = (selectedMonth + 1) % 12;
        if (targetMonth === 0) targetYear += 1;
      }
    }

    await supabase.from('gastos').insert([{ 
      user_id: authUser.id, categoria: gCat, valor: v, 
      cartao_id: selectedCardId === 'dinheiro' ? null : selectedCardId, 
      cor: `hsl(${Math.random()*360}, 70%, 50%)`, 
      data: agora.toLocaleDateString('pt-BR'), 
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
      mes: targetMonth, ano: targetYear, fatura_paga: false 
    }]);
    showToast("Gasto registrado!", "success");
    setGValor(''); fetchDados();
  };

  const addOrUpdateMensalidade = async () => {
    const v = parseFloat(mValor.replace(/\./g, '').replace(',', '.'));
    if (!v || !mNome) return showToast("Preencha o nome e o valor da mensalidade!", "error");
    const { data: { user } } = await supabase.auth.getUser();
    if (editingMensId) {
      await supabase.from('mensalidades').update({ nome: mNome, valor: v }).eq('id', editingMensId);
      showToast("Mensalidade atualizada!", "success");
    } else {
      await supabase.from('mensalidades').insert([{ user_id: user.id, nome: mNome, valor: v, ativa: true }]);
      showToast("Nova mensalidade criada!", "success");
    }
    setMNome(''); setMValor(''); setEditingMensId(null); fetchDados();
  };

  const deleteCartao = async (id) => { 
    if (!window.confirm("Isso apagará o cartão e TODOS os gastos vinculados a ele. Continuar?")) return;
    await supabase.from('gastos').delete().eq('cartao_id', id);
    await supabase.from('cartoes').delete().eq('id', id); 
    showToast("Cartão e histórico apagados.", "success");
    fetchDados(); 
  };

  const addCartao = async () => {
    if (!cNome || !cFechamento) return showToast("Preencha o nome e o dia de fechamento!", "error");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('cartoes').insert([{ user_id: user.id, nome: cNome, dia_fechamento: parseInt(cFechamento) }]);
    showToast("Cartão adicionado!", "success");
    setCNome(''); setCFechamento(''); fetchDados();
  };

  const addCategoria = async () => { 
    if (!novaCatInput) return showToast("Digite um nome para a categoria!", "error"); 
    const { data: { user } } = await supabase.auth.getUser(); 
    await supabase.from('categorias').insert([{ user_id: user.id, nome: novaCatInput }]); 
    showToast("Categoria adicionada!", "success");
    setNovaCatInput(''); fetchDados(); 
  };

  const removeCategoria = async (n) => { 
    const { data: { user: authUser } } = await supabase.auth.getUser(); 
    await supabase.from('categorias').delete().eq('user_id', authUser.id).eq('nome', n); 
    fetchDados(); 
  };
  
  const deleteItem = async (t, id) => { 
    await supabase.from(t).delete().eq('id', id); 
    showToast("Registro excluído.", "success");
    fetchDados(); 
  };

  const toggleMensalidade = async (id, status) => { 
    await supabase.from('mensalidades').update({ ativa: !status }).eq('id', id); 
    fetchDados(); 
  };
  
  const deleteMensalidade = async (id) => { 
    await supabase.from('mensalidades').delete().eq('id', id); 
    showToast("Mensalidade excluída.", "success");
    fetchDados(); 
  };

  const formatar = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const sortRecent = (list) => list.sort((a, b) => {
    const parse = (it) => { const [d, m, y] = it.data.split('/').map(Number); const [h, min] = it.hora.split(':').map(Number); return new Date(y, m - 1, d, h, min).getTime(); };
    return parse(b) - parse(a);
  });

  const historicoPrincipal = useMemo(() => {
    const list = [...data.receitas, ...data.gastos.filter(g => !g.cartao_id)].filter(it => it.mes === selectedMonth && Number(it.ano) === Number(selectedYear)).filter(it => (it.fonte || it.categoria).toLowerCase().includes(searchTerm.toLowerCase()));
    const grupos = {}; sortRecent(list).forEach(item => { if (!grupos[item.data]) grupos[item.data] = []; grupos[item.data].push(item); });
    return grupos;
  }, [data, selectedMonth, selectedYear, searchTerm]);

  const historicoCredito = useMemo(() => {
    const list = data.gastos.filter(g => g.cartao_id).filter(it => it.mes === selectedMonth && Number(it.ano) === Number(selectedYear)).filter(it => it.categoria.toLowerCase().includes(searchTermCredito.toLowerCase()));
    const grupos = {}; sortRecent(list).forEach(item => { if (!grupos[item.data]) grupos[item.data] = []; grupos[item.data].push(item); });
    return grupos;
  }, [data, selectedMonth, selectedYear, searchTermCredito]);

  const handleUpdateName = async () => { 
    if(!newUserName) return showToast("O nome não pode ser vazio!", "error");
    setIsUpdating(true);
    try {
      await supabase.auth.updateUser({ data: { display_name: newUserName } }); 
      showToast("Perfil salvo! Recarregando...", "success");
      setTimeout(() => window.location.reload(), 1500); 
    } catch (err) {
      showToast("Erro ao salvar: " + err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => { 
    if (!window.confirm("TEM CERTEZA? Essa ação vai deletar sua conta e TODOS os seus dados permanentemente.")) return; 
    try {
      const { data: { user } } = await supabase.auth.getUser(); 
      await supabase.from('receitas').delete().eq('user_id', user.id); 
      await supabase.from('gastos').delete().eq('user_id', user.id); 
      await supabase.from('categorias').delete().eq('user_id', user.id); 
      await supabase.from('mensalidades').delete().eq('user_id', user.id); 
      await supabase.from('cartoes').delete().eq('user_id', user.id); 
      showToast("Conta excluída. Redirecionando...", "success");
      setTimeout(() => onLogout(), 1500);
    } catch (err) {
      showToast("Erro ao excluir a conta.", "error");
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)] transition-all relative">
      
      {/* Container de Notificação (Toast) */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 20, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 shadow-red-500/20' : 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20'}`}>
            {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="fixed top-4 left-4 z-[110] p-3 bg-primary-600 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"> {isMenuOpen ? <X size={20}/> : <Menu size={20}/>} </button>
      <AnimatePresence> {isMenuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85] lg:hidden" />} </AnimatePresence>
      
      {isMenuOpen && (
        <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed inset-y-0 left-0 w-72 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-6 pt-20 z-[90] flex flex-col shadow-2xl">
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<LayoutDashboard size={20}/>} label="Painel" active={activeTab === 'painel'} onClick={() => {setActiveTab('painel'); setIsMenuOpen(false);}} />
            <SidebarItem icon={<BarChart3 size={20}/>} label="Análises" active={activeTab === 'analises'} onClick={() => {setActiveTab('analises'); setIsMenuOpen(false);}} />
            <SidebarItem icon={<Settings size={20}/>} label="Configurações" active={activeTab === 'configuracoes'} onClick={() => {setActiveTab('configuracoes'); setIsMenuOpen(false);}} />
          </nav>
          <div className="pt-6 border-t border-[var(--color-border)] space-y-2">
            <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold text-sm">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>} Modo {isDarkMode ? 'Luz' : 'Trevas'}</button>
            <button onClick={onLogout} className="flex items-center gap-3 w-full p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-sm transition-all"><LogOut size={18}/> Sair</button>
          </div>
        </motion.aside>
      )}

      <main className={`flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 transition-all duration-300 ${isMenuOpen ? 'lg:pl-80' : 'pl-4 sm:pl-10 lg:pl-16'}`}>
        <header className="mb-8 mt-14 lg:mt-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div> <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{saudacao}, {userName}!</h1> </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <SeletorAnimado value={meses[selectedMonth]} options={meses} onChange={(val) => setSelectedMonth(meses.indexOf(val))} icon={Calendar} className="flex-1 lg:w-40" />
            <SeletorAnimado value={selectedYear} options={anos} onChange={(val) => setSelectedYear(Number(val))} className="w-24 sm:w-32" />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'painel' ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 overflow-visible">
                <CardInput title="Adicionar Renda" color="text-emerald-500">
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <input value={rFonte} onChange={e=>setRFonte(e.target.value)} placeholder="Fonte" className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm min-w-0" />
                    <input value={rValor} onChange={e=>setRValor(e.target.value)} placeholder="R$ 0" className="sm:w-32 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-black text-sm min-w-0" />
                    <button onClick={addReceita} className="p-4 bg-emerald-500 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus/></button>
                  </div>
                </CardInput>
                <CardInput title="Novo Gasto" color="text-primary-500">
                  <div className="flex flex-col w-full gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <SeletorAnimado value={gCat} options={data.cats} onChange={setGCat} className="flex-1 sm:w-40 min-w-0" />
                      <input value={gValor} onChange={e=>setGValor(e.target.value)} placeholder="Valor" className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm min-w-0" />
                      <SeletorAnimado value={selectedCardId === 'dinheiro' ? "Dinheiro" : data.cartoes.find(c => c.id === selectedCardId)?.nome} options={["Dinheiro", ...data.cartoes.map(c => c.nome)]} onChange={(v) => setSelectedCardId(v === "Dinheiro" ? "dinheiro" : data.cartoes.find(c => c.nome === v).id)} icon={CreditCard} className="flex-1 sm:w-40 min-w-0" />
                      <button onClick={addGasto} className="p-4 bg-primary-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus/></button>
                    </div>
                    <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-4 flex-wrap">
                      <input value={novaCatInput} onChange={e=>setNovaCatInput(e.target.value)} placeholder="Nova categoria..." className="flex-1 text-xs bg-transparent border-b border-[var(--color-border)] outline-none min-w-[150px]" />
                      <button onClick={addCategoria} className="text-[10px] font-black text-primary-500 uppercase shrink-0">+ Adicionar</button>
                      <div className="flex flex-wrap gap-2 w-full mt-2"> {data.cats.map(c => ( <span key={c} className="px-3 py-1 bg-[var(--color-bg-icon)] text-[9px] font-black rounded-full flex items-center gap-2"> {c} <button onClick={() => removeCategoria(c)}><X size={10}/></button> </span> ))} </div>
                    </div>
                  </div>
                </CardInput>
              </div>

              <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-8 flex items-center gap-2"><CreditCard size={14} className="text-primary-500" /> Mensalidades</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input value={mNome} onChange={e=>setMNome(e.target.value)} placeholder="Ex: Netflix, Aluguel..." className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm" />
                      <input value={mValor} onChange={e=>setMValor(e.target.value)} placeholder="R$ 0" className="sm:w-32 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-black text-sm" />
                      <button onClick={addOrUpdateMensalidade} className="p-4 bg-primary-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"> {editingMensId ? <Save size={18}/> : <Plus size={18}/>} </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {data.mensalidades.map(m => (
                      <div key={m.id} className={`flex justify-between items-center p-4 bg-[var(--color-bg-page)] rounded-2xl border transition-all ${m.ativa ? 'border-primary-500/20' : 'opacity-40 grayscale'}`}>
                        <div className="truncate"> <p className="font-black text-xs truncate uppercase">{m.nome}</p> <p className="text-[10px] font-black text-primary-500">{formatar(m.valor)}/mês</p> </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleMensalidade(m.id, m.ativa)} className={`p-2 rounded-xl transition-all ${m.ativa ? 'bg-primary-600 text-white' : 'bg-zinc-200'}`}><Power size={14}/></button>
                          <button onClick={() => {setEditingMensId(m.id); setMNome(m.nome); setMValor(m.valor.toString());}} className="p-2 text-zinc-400 hover:text-primary-500"><Edit2 size={14}/></button>
                          <button onClick={() => deleteMensalidade(m.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-8 flex items-center gap-2"><CreditCard size={14} className="text-primary-500" /> Cartão de Crédito</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="flex flex-col sm:flex-row gap-3 h-fit">
                    <input value={cNome} onChange={e=>setCNome(e.target.value)} placeholder="Nome do Cartão" className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm min-w-0" />
                    <input value={cFechamento} onChange={e=>setCFechamento(e.target.value)} placeholder="Dia Fech." className="sm:w-32 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-black text-sm min-w-0" />
                    <button onClick={addCartao} className="p-4 bg-primary-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus size={18}/></button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {data.cartoes.map(c => {
                      const gastosMes = data.gastos.filter(g => g.cartao_id === c.id && Number(g.mes) === selectedMonth && Number(g.ano) === Number(selectedYear));
                      const totalC = gastosMes.reduce((acc, curr) => acc + curr.valor, 0);
                      const totalPendente = gastosMes.filter(g => !g.fatura_paga).reduce((acc, curr) => acc + curr.valor, 0);
                      const isPago = totalC > 0 && totalPendente === 0;

                      const agora = new Date();
                      const isMesAtual = selectedMonth === agora.getMonth() && Number(selectedYear) === agora.getFullYear();
                      const isMesPassado = (Number(selectedYear) < agora.getFullYear()) || (Number(selectedYear) === agora.getFullYear() && selectedMonth < agora.getMonth());
                      const isVencido = (isMesAtual && agora.getDate() > c.dia_fechamento && !isPago && totalC > 0) || (isMesPassado && !isPago && totalC > 0);

                      return (
                        <div key={c.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${isPago ? 'bg-emerald-500/10 border-emerald-500/50' : isVencido ? 'bg-red-500/10 border-red-500/50 animate-pulse-subtle' : 'bg-[var(--color-bg-page)] border-primary-500/10'}`}>
                          <div className="flex-1"> 
                            <p className={`font-black text-[10px] uppercase ${isPago ? 'text-emerald-500' : isVencido ? 'text-red-500' : ''}`}>{c.nome} {isPago ? '(PAGO)' : isVencido ? '(FECHADO)' : ''}</p> 
                            <p className="text-[12px] font-black">{formatar(totalC)}</p> 
                            <p className="text-[8px] opacity-40 font-bold uppercase">Fecha dia {c.dia_fechamento}</p>
                          </div>
                          <div className="flex gap-2"> 
                            {!isPago && totalC > 0 && ( <button onClick={() => pagarFatura(c.id)} className={`px-4 py-2 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition-all ${isVencido ? 'bg-red-500' : 'bg-emerald-500'}`}> <CheckCircle2 size={14}/> Pagar Fatura </button> )}
                            <button onClick={() => deleteCartao(c.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16}/></button> 
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <ResumoItem label="Saldo Disponível" value={formatar(incomeTotal - totalExpenses)} color="text-emerald-500" icon={<Wallet size={20}/>}/>
                <ResumoItem label="Dinheiro / Pix" value={formatar(despesasDinheiro)} color="text-purple-500" icon={<Banknote size={20}/>}/>
                <ResumoItem label="Fatura Cartão" value={formatar(despesasCredito)} color="text-purple-500" icon={<CreditCard size={20}/>}/>
                <ResumoItem label="Despesas Totais" value={formatar(totalExpenses)} color="text-red-500" icon={<TrendingUp size={20}/>}/>
              </div>

              <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm relative overflow-visible lg:col-span-1">
                 <div className="flex justify-between items-center mb-8 pr-2"> <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Gráfico</h3>
                   <div className="flex bg-[var(--color-bg-page)] p-1 rounded-xl border border-[var(--color-border)]">
                     <button onClick={() => setDistView('horizontal')} className={`p-2 rounded-lg transition-all ${distView === 'horizontal' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Barra Horizontal"><List size={14}/></button>
                     <button onClick={() => setDistView('vertical')} className={`p-2 rounded-lg transition-all ${distView === 'vertical' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Barra Vertical"><BarChart3 size={14}/></button>
                     <button onClick={() => setDistView('pie')} className={`p-2 rounded-lg transition-all ${distView === 'pie' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Rodela"><PieChartIcon size={14}/></button>
                   </div>
                 </div>
                 <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      {distView === 'pie' ? ( <PieChart> <Pie data={dadosPizza} innerRadius={65} outerRadius={90} dataKey="value" stroke="none" paddingAngle={5} cornerRadius={6}> {dadosPizza.map((e, i) => <Cell key={i} fill={`hsl(${i*50}, 70%, 55%)`} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />)} </Pie> <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '12px' }} /> </PieChart> ) : 
                      distView === 'horizontal' ? ( <BarChart layout="vertical" data={dadosPizza} margin={{ left: 10, right: 30 }}> <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} /> <XAxis type="number" hide /> <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900'}} width={80} /> <Tooltip cursor={{fill: 'var(--color-bg-page)', opacity: 0.5}} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '12px', fontWeight: '900' }} /> <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}> {dadosPizza.map((e, i) => <Cell key={i} fill={`hsl(${i*50}, 70%, 55%)`} />)} </Bar> </BarChart> ) : 
                      ( <BarChart data={dadosPizza} margin={{ top: 20, bottom: 20 }}> <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} /> <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900'}} /> <YAxis hide /> <Tooltip cursor={{fill: 'var(--color-bg-page)', opacity: 0.5}} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '12px', fontWeight: '900' }} /> <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={30}> {dadosPizza.map((e, i) => <Cell key={i} fill={`hsl(${i*50}, 70%, 55%)`} />)} </Bar> </BarChart> )}
                   </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"> {dadosPizza.map(d => ( <div key={d.name} className="flex justify-between text-[10px] font-black border-b border-zinc-100 dark:border-zinc-800 pb-2"> <span>{d.name}</span> <span className="text-primary-500">{d.percString}</span> </div> ))} </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                  <div className="flex justify-between items-center mb-8 gap-4 flex-wrap"> 
                    <h3 className="text-xs font-black uppercase opacity-60">Histórico Principal</h3> 
                    <div className="relative w-full sm:w-48 group"> <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-500 transition-colors" /> <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] rounded-xl outline-none text-[10px] font-bold border border-transparent transition-all" /> </div>
                  </div>
                  <div className="space-y-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(historicoPrincipal).map(dataString => (
                      <div key={dataString} className="space-y-3">
                        <div className="sticky top-0 z-10 py-1 bg-[var(--color-bg-card)]/80 backdrop-blur-md"> <h4 className="text-[9px] font-black uppercase tracking-widest text-primary-500">{dataString === new Date().toLocaleDateString('pt-BR') ? "Hoje" : dataString}</h4> </div>
                        {historicoPrincipal[dataString].map(it => (
                          <div key={it.id} className="flex justify-between items-center p-4 bg-[var(--color-bg-page)] rounded-2xl group transition-all">
                            <div className="flex items-center gap-3"> <div className={`w-1 h-8 rounded-full ${it.fonte ? 'bg-emerald-500' : 'bg-red-500'}`} /> <div className="truncate"> <p className="font-black text-xs truncate">{it.fonte || it.categoria}</p> <p className="text-[9px] opacity-40 font-bold uppercase">{it.hora}</p> </div> </div>
                            <div className="flex items-center gap-3"> <span className={`font-black text-xs ${it.fonte ? 'text-emerald-500' : ''}`}>{it.fonte ? '+' : '-'} {formatar(it.valor)}</span> <button onClick={() => deleteItem(it.fonte ? 'receitas':'gastos', it.id)} className="text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button> </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                  <div className="flex justify-between items-center mb-8 gap-4 flex-wrap"> 
                    <h3 className="text-xs font-black uppercase opacity-60">Fatura de Crédito</h3> 
                    <div className="relative w-full sm:w-48 group"> <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-500 transition-colors" /> <input value={searchTermCredito} onChange={(e) => setSearchTermCredito(e.target.value)} placeholder="Buscar crédito..." className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] rounded-xl outline-none text-[10px] font-bold border border-transparent transition-all" /> </div>
                  </div>
                  <div className="space-y-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(historicoCredito).map(dataString => (
                      <div key={dataString} className="space-y-3">
                        <div className="sticky top-0 z-10 py-1 bg-[var(--color-bg-card)]/80 backdrop-blur-md"> <h4 className="text-[9px] font-black uppercase tracking-widest text-primary-500">{dataString}</h4> </div>
                        {historicoCredito[dataString].map(it => (
                          <div key={it.id} className="flex justify-between items-center p-4 bg-[var(--color-bg-page)] rounded-2xl border border-primary-500/5 group">
                            <div className="flex items-center gap-3 truncate"> 
                              <div className="w-1 h-8 rounded-full bg-primary-500 shrink-0" /> 
                              <div className="truncate"> 
                                <p className="font-black text-xs truncate">{it.categoria}</p> 
                                <p className="text-[8px] font-bold text-primary-500 uppercase">{data.cartoes.find(c => c.id === it.cartao_id)?.nome} • {it.hora} {it.fatura_paga ? '(PAGO)' : ''}</p> 
                              </div> 
                            </div>
                            <div className="flex items-center gap-3"> <span className="font-black text-xs">- {formatar(it.valor)}</span> <button onClick={() => deleteItem('gastos', it.id)} className="text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button> </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'analises' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 text-center">
              <div className="bg-[var(--color-bg-card)] p-6 sm:p-12 rounded-[2.5rem] border border-[var(--color-border)] shadow-xl text-center">
                 <h3 className="text-xl sm:text-2xl font-black mb-8 text-center uppercase tracking-tighter">Análise Mensal</h3>
                 <div className={`${isMobile ? 'h-[600px]' : 'h-96'} w-full`}>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={meses.map((m, i) => ({ name: m, renda: data.receitas.filter(r=>r.mes===i && Number(r.ano)===Number(selectedYear)).reduce((a,b)=>a+b.valor,0), gastos: data.gastos.filter(g=>g.mes===i && Number(g.ano)===Number(selectedYear)).reduce((a,b)=>a+b.valor,0) }))} layout={isMobile ? "vertical" : "horizontal"}>
                        <CartesianGrid strokeDasharray="3 3" vertical={!isMobile} horizontal={isMobile} strokeOpacity={0.05} /> <XAxis dataKey="name" hide={isMobile} tick={{fontSize: 10, fontWeight: '900'}} /> <YAxis hide /> <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '20px', border: 'none'}} />
                        <Bar dataKey="renda" fill="#10b981" radius={[4, 4, 0, 0]} /> <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-8">
              <div className="bg-[var(--color-bg-card)] p-8 sm:p-12 rounded-[3rem] border border-[var(--color-border)] shadow-xl text-center">
                <h3 className="text-2xl font-black mb-8 flex items-center justify-center gap-3"> <User className="text-primary-500" /> Perfil </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold focus:ring-2 ring-primary-500" />
                  <button onClick={handleUpdateName} disabled={isUpdating || newUserName === userName} className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black transition-all"> {isUpdating ? "Salvando..." : "Salvar"} </button>
                </div>
              </div>
              <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/20 text-center"> <button onClick={handleDeleteAccount} className="px-6 py-3 bg-red-500 text-white rounded-xl font-black text-xs uppercase">Excluir Minha Conta</button> </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all cursor-pointer ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105' : 'opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}> {icon} <span className="font-black text-[10px] uppercase tracking-widest">{label}</span> </button> ); }
function ResumoItem({ label, value, color, icon }) { return ( <div className="bg-[var(--color-bg-card)] p-6 rounded-[2.5rem] border border-[var(--color-border)] shadow-sm text-center"> <div className={`mb-4 mx-auto p-3 w-fit rounded-xl bg-[var(--color-bg-page)] ${color}`}>{icon}</div> <p className="text-[9px] font-black uppercase mb-1 opacity-40">{label}</p> <p className="text-xl font-black tracking-tight">{value}</p> </div> ); }
function CardInput({ title, children, color }) { return ( <div className="bg-[var(--color-bg-card)] p-6 sm:p-8 rounded-[2rem] border border-[var(--color-border)] shadow-sm w-full relative"> <h3 className={`text-[10px] font-black uppercase mb-6 tracking-widest flex items-center gap-2 ${color}`}><Plus size={14}/> {title}</h3> <div className="flex gap-3">{children}</div> </div> ); }