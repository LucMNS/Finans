import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, BarChart3, Sun, Moon, Plus, Wallet, 
  Trash2, LogOut, Menu, X, TrendingUp, ChevronDown, Calendar, 
  PieChart as PieChartIcon, Settings, User, Save, List, Search,
  Power, Edit2, CreditCard, CheckCircle2, Banknote, AlertCircle,
  ToggleRight, ToggleLeft
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import { supabase } from '../lib/supabase';

// --- CONSTANTES E CORES ---
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const anos = ["2024", "2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034"];
const CHART_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#f97316', '#8b5cf6', '#14b8a6', 
  '#eab308', '#d946ef', '#0ea5e9', '#ef4444', '#84cc16', '#06b6d4', '#f43f5e', '#a855f7', 
  '#059669', '#4f46e5', '#ea580c', '#db2777', '#2563eb', '#c026d3', '#0284c7', '#dc2626', 
  '#4338ca', '#b45309', '#9d174d', '#0f766e', '#4d7c0f', '#64748b'
];

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
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 bg-[var(--color-bg-page)] dark:bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-sm hover:border-primary-500 transition-all font-black text-[10px] sm:text-xs uppercase">
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-primary-500 shrink-0" />}
          <span className="truncate">{value || "Selecione..."}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-2xl z-[150] overflow-hidden">
            <div className="max-h-60 overflow-y-auto p-1 sm:p-2 custom-scrollbar">
              {options.length === 0 ? <p className="text-[10px] font-black uppercase p-4 opacity-40 text-center">Vazio</p> : 
                options.map((opt) => (
                  <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`w-full text-left px-3 py-3 sm:px-4 rounded-lg sm:rounded-xl transition-all font-bold text-[10px] sm:text-xs uppercase ${String(value) === String(opt) ? 'bg-primary-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{opt}</button>
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeMonthIndex, setActiveMonthIndex] = useState(new Date().getMonth()); 

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

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState({ oldName: '', newName: '' });

  const [autoForwardExpenses, setAutoForwardExpenses] = useState(() => {
    const saved = localStorage.getItem('finans_autoForward');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('finans_autoForward', JSON.stringify(autoForwardExpenses));
  }, [autoForwardExpenses]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000); 
  };

  const requestConfirmation = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
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

  const analisesData = useMemo(() => meses.map((m, i) => ({
    name: m,
    renda: data.receitas.filter(r=>r.mes===i && Number(r.ano)===Number(selectedYear)).reduce((a,b)=>a+b.valor,0),
    gastos: data.gastos.filter(g=>g.mes===i && Number(g.ano)===Number(selectedYear)).reduce((a,b)=>a+b.valor,0)
  })), [data, selectedYear]);

  useEffect(() => { setActiveIndex(0); }, [selectedMonth, selectedYear, distView]);

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

    if (autoForwardExpenses && selectedCardId !== 'dinheiro') {
      const card = data.cartoes.find(c => c.id === selectedCardId);
      if (card && diaHoje > card.dia_fechamento) {
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

  const deleteCartao = (id) => { 
    requestConfirmation(
      "Excluir Cartão?",
      "Isso apagará o cartão e TODOS os gastos vinculados a ele. Essa ação não pode ser desfeita.",
      async () => {
        await supabase.from('gastos').delete().eq('cartao_id', id);
        await supabase.from('cartoes').delete().eq('id', id); 
        showToast("Cartão e histórico apagados.", "success");
        fetchDados(); 
      }
    );
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

  const handleUpdateCategoria = async (oldName, newName) => {
    if (!newName || newName === oldName) {
      setEditingCat({ oldName: '', newName: '' });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('categorias').update({ nome: newName }).eq('user_id', user.id).eq('nome', oldName);
      await supabase.from('gastos').update({ categoria: newName }).eq('user_id', user.id).eq('categoria', oldName);
      if (gCat === oldName) setGCat(newName);
      showToast("Categoria e histórico atualizados!", "success");
      fetchDados();
    } catch (err) {
      showToast("Erro ao atualizar categoria.", "error");
    }
    setEditingCat({ oldName: '', newName: '' });
  };

  const removeCategoriaConfirm = (n) => { 
    requestConfirmation(
      "Excluir Categoria?",
      `Tem certeza que deseja excluir "${n}"? Ela vai sumir das opções, mas seus gastos antigos continuarão intactos.`,
      async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser(); 
        await supabase.from('categorias').delete().eq('user_id', authUser.id).eq('nome', n); 
        showToast("Categoria excluída.", "success");
        if (gCat === n) setGCat(''); 
        fetchDados(); 
      }
    );
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

  const handleDeleteAccount = () => { 
    requestConfirmation(
      "Excluir Conta Permanentemente?",
      "TEM CERTEZA? Essa ação vai deletar sua conta e TODOS os seus dados de forma irreversível.",
      async () => {
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
      }
    );
  };

  const isMobile = window.innerWidth < 768;

  const handleChartClick = (_, index) => {
    if (typeof index === 'number') setActiveIndex(index);
  };

  const handleAnaliseClick = (_, index) => {
    if (typeof index === 'number') setActiveMonthIndex(index);
  };

  const handleBarChartInteraction = (state) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      setActiveIndex(state.activeTooltipIndex);
    }
  };

  const handleAnaliseInteraction = (state) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      setActiveMonthIndex(state.activeTooltipIndex);
    }
  };

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g style={{ outline: 'none', pointerEvents: 'none', userSelect: 'none' }}>
        <text x={cx} y={cy - 4} textAnchor="middle" fill={fill} className="text-[10px] sm:text-[11px] font-black uppercase">
          {payload.name.length > 12 ? payload.name.substring(0, 12) + '...' : payload.name}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#a1a1aa" className="text-[9px] sm:text-[10px] font-bold">
          {formatar(value)}
        </text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={6} style={{ outline: 'none' }} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16} fill={fill} cornerRadius={4} style={{ outline: 'none' }} />
      </g>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)] transition-all relative">
      
      <style>{`
        .recharts-wrapper, .recharts-wrapper svg, .recharts-surface, .recharts-sector, .recharts-pie-sector, .recharts-bar-rectangle, g {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>

      <AnimatePresence>
        {isCatModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2"><Settings size={20} className="text-primary-500"/> Categorias</h2>
                <button onClick={() => setIsCatModalOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:scale-110 transition-all"><X size={16}/></button>
              </div>
              
              <div className="flex gap-2 mb-6">
                <input value={novaCatInput} onChange={e=>setNovaCatInput(e.target.value)} placeholder="Criar nova categoria..." className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-xs sm:text-sm" />
                <button onClick={addCategoria} className="p-3 sm:p-4 bg-primary-600 text-white rounded-xl sm:rounded-2xl hover:scale-105 transition-all flex items-center justify-center"><Plus size={18}/></button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {data.cats.length === 0 ? <p className="text-center text-xs text-zinc-500 py-4 font-bold">Nenhuma categoria criada.</p> : null}
                {data.cats.map(c => (
                  <div key={c} className="flex justify-between items-center p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl border border-[var(--color-border)] transition-all group">
                    {editingCat.oldName === c ? (
                      <div className="flex flex-1 gap-2 mr-2">
                        <input 
                          autoFocus
                          value={editingCat.newName} 
                          onChange={(e) => setEditingCat({...editingCat, newName: e.target.value})} 
                          className="flex-1 bg-transparent outline-none font-black text-xs sm:text-sm text-primary-500 border-b border-primary-500/30 pb-1"
                        />
                      </div>
                    ) : (
                      <span className="font-black text-xs sm:text-sm truncate uppercase">{c}</span>
                    )}
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                      {editingCat.oldName === c ? (
                        <button onClick={() => handleUpdateCategoria(editingCat.oldName, editingCat.newName)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"><Save size={14}/></button>
                      ) : (
                        <button onClick={() => setEditingCat({oldName: c, newName: c})} className="p-2 text-zinc-400 hover:text-primary-500 rounded-xl transition-all"><Edit2 size={14}/></button>
                      )}
                      <button onClick={() => removeCategoriaConfirm(c)} className="p-2 text-zinc-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[2rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-lg sm:text-xl font-black mb-2">{confirmModal.title}</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mb-8">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase bg-[var(--color-bg-page)] border border-[var(--color-border)] hover:bg-zinc-800 transition-all text-white">Cancelar</button>
                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase bg-red-500 hover:bg-red-600 transition-all text-white shadow-lg shadow-red-500/20">Avançar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 20, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border backdrop-blur-md font-bold text-[10px] sm:text-sm text-white w-[90%] sm:w-auto text-center justify-center ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 shadow-red-500/20' : 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20'}`}>
            {toast.type === 'error' ? <AlertCircle size={18} className="text-red-500 shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="fixed top-4 left-4 z-[110] p-3 bg-primary-600 text-white rounded-xl sm:rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"> {isMenuOpen ? <X size={20}/> : <Menu size={20}/>} </button>
      <AnimatePresence> {isMenuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85] lg:hidden" />} </AnimatePresence>
      
      {isMenuOpen && (
        <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed inset-y-0 left-0 w-64 sm:w-72 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-4 sm:p-6 pt-20 z-[90] flex flex-col shadow-2xl">
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<LayoutDashboard size={18}/>} label="Painel" active={activeTab === 'painel'} onClick={() => {setActiveTab('painel'); setIsMenuOpen(false);}} />
            <SidebarItem icon={<BarChart3 size={18}/>} label="Análises" active={activeTab === 'analises'} onClick={() => {setActiveTab('analises'); setIsMenuOpen(false);}} />
            <SidebarItem icon={<Settings size={18}/>} label="Configurações" active={activeTab === 'configuracoes'} onClick={() => {setActiveTab('configuracoes'); setIsMenuOpen(false);}} />
          </nav>
          <div className="pt-6 border-t border-[var(--color-border)] space-y-2">
            <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold text-xs sm:text-sm">{isDarkMode ? <Sun size={16}/> : <Moon size={16}/>} Modo {isDarkMode ? 'Luz' : 'Trevas'}</button>
            <button onClick={onLogout} className="flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs sm:text-sm transition-all"><LogOut size={16}/> Sair</button>
          </div>
        </motion.aside>
      )}

      <main className={`flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 transition-all duration-300 ${isMenuOpen ? 'lg:pl-80' : 'pl-4 sm:pl-8 lg:pl-28'}`}>
        
        <header className="mb-6 sm:mb-8 mt-16 lg:mt-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
          <div> 
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              {activeTab === 'configuracoes' ? 'Configurações de Conta' : `${saudacao}, ${userName}!`}
            </h1> 
          </div>
          
          {activeTab !== 'configuracoes' && (
            <div className="flex flex-row flex-wrap gap-2 w-full lg:w-auto">
              {activeTab === 'painel' && (
                <SeletorAnimado value={meses[selectedMonth]} options={meses} onChange={(val) => setSelectedMonth(meses.indexOf(val))} icon={Calendar} className="flex-1 sm:flex-none lg:w-40 min-w-[120px]" />
              )}
              <SeletorAnimado value={selectedYear} options={anos} onChange={(val) => setSelectedYear(Number(val))} className="w-20 sm:w-28 lg:w-32" />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'painel' ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-8 lg:space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 overflow-visible">
                <CardInput title="Adicionar Renda" color="text-emerald-500">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                    <input value={rFonte} onChange={e=>setRFonte(e.target.value)} placeholder="Fonte" className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-xs sm:text-sm min-w-0" />
                    <input value={rValor} onChange={e=>setRValor(e.target.value)} placeholder="R$ 0" className="w-full sm:w-32 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-black text-xs sm:text-sm min-w-0" />
                    <button onClick={addReceita} className="p-3 sm:p-4 w-full sm:w-auto bg-emerald-500 text-white rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus size={18}/></button>
                  </div>
                </CardInput>
                <CardInput title="Novo Gasto" color="text-primary-500">
                  <div className="flex flex-col w-full gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                      <SeletorAnimado value={gCat} options={data.cats} onChange={setGCat} className="flex-1 sm:w-40 min-w-0" />
                      <input value={gValor} onChange={e=>setGValor(e.target.value)} placeholder="Valor" className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-xs sm:text-sm min-w-0" />
                      <SeletorAnimado value={selectedCardId === 'dinheiro' ? "Dinheiro" : data.cartoes.find(c => c.id === selectedCardId)?.nome} options={["Dinheiro", ...data.cartoes.map(c => c.nome)]} onChange={(v) => setSelectedCardId(v === "Dinheiro" ? "dinheiro" : data.cartoes.find(c => c.nome === v).id)} icon={CreditCard} className="flex-1 sm:w-40 min-w-0" />
                      <button onClick={addGasto} className="p-3 sm:p-4 w-full sm:w-auto bg-primary-600 text-white rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus size={18}/></button>
                    </div>
                    <div className="flex items-center justify-end border-t border-[var(--color-border)] pt-3 sm:pt-4">
                      <button onClick={() => setIsCatModalOpen(true)} type="button" className="text-[10px] sm:text-xs font-black text-primary-500 uppercase flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                        <Settings size={14} /> Gerenciar Categorias
                      </button>
                    </div>
                  </div>
                </CardInput>
              </div>

              <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2"><CreditCard size={14} className="text-primary-500" /> Mensalidades</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input value={mNome} onChange={e=>setMNome(e.target.value)} placeholder="Ex: Netflix, Aluguel..." className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-xs sm:text-sm" />
                      <input value={mValor} onChange={e=>setMValor(e.target.value)} placeholder="R$ 0" className="w-full sm:w-32 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-black text-xs sm:text-sm" />
                      <button onClick={addOrUpdateMensalidade} className="p-3 sm:p-4 w-full sm:w-auto bg-primary-600 text-white rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"> {editingMensId ? <Save size={16}/> : <Plus size={16}/>} </button>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3 max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
                    {data.mensalidades.map(m => (
                      <div key={m.id} className={`flex justify-between items-center p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl border transition-all ${m.ativa ? 'border-primary-500/20' : 'opacity-40 grayscale'}`}>
                        <div className="truncate"> <p className="font-black text-[10px] sm:text-xs truncate uppercase">{m.nome}</p> <p className="text-[9px] sm:text-[10px] font-black text-primary-500">{formatar(m.valor)}/mês</p> </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button onClick={() => toggleMensalidade(m.id, m.ativa)} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${m.ativa ? 'bg-primary-600 text-white' : 'bg-zinc-200'}`}><Power size={12}/></button>
                          <button onClick={() => {setEditingMensId(m.id); setMNome(m.nome); setMValor(m.valor.toString());}} className="p-1.5 sm:p-2 text-zinc-400 hover:text-primary-500"><Edit2 size={12}/></button>
                          <button onClick={() => deleteMensalidade(m.id)} className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2"><CreditCard size={14} className="text-primary-500" /> Cartão de Crédito</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 h-fit">
                    <input value={cNome} onChange={e=>setCNome(e.target.value)} placeholder="Nome do Cartão" className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-xs sm:text-sm min-w-0" />
                    <input value={cFechamento} onChange={e=>setCFechamento(e.target.value)} placeholder="Dia Fech." className="w-full sm:w-32 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-black text-xs sm:text-sm min-w-0" />
                    <button onClick={addCartao} className="p-3 sm:p-4 w-full sm:w-auto bg-primary-600 text-white rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center shrink-0"><Plus size={16}/></button>
                  </div>
                  <div className="space-y-2 sm:space-y-3 max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
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
                        <div key={c.id} className={`flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${isPago ? 'bg-emerald-500/10 border-emerald-500/50' : isVencido ? 'bg-red-500/10 border-red-500/50 animate-pulse-subtle' : 'bg-[var(--color-bg-page)] border-primary-500/10'}`}>
                          <div className="flex-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start"> 
                            <div>
                              <p className={`font-black text-[9px] sm:text-[10px] uppercase ${isPago ? 'text-emerald-500' : isVencido ? 'text-red-500' : ''}`}>{c.nome} {isPago ? '(PAGO)' : isVencido ? '(FECHADO)' : ''}</p> 
                              <p className="text-[11px] sm:text-[12px] font-black">{formatar(totalC)}</p> 
                            </div>
                            <p className="text-[8px] opacity-40 font-bold uppercase mt-0 sm:mt-1">Fecha dia {c.dia_fechamento}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end mt-1 sm:mt-0"> 
                            {!isPago && totalC > 0 && ( <button onClick={() => pagarFatura(c.id)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 sm:gap-2 shadow-lg hover:scale-105 transition-all ${isVencido ? 'bg-red-500' : 'bg-emerald-500'}`}> <CheckCircle2 size={12}/> Pagar </button> )}
                            <button onClick={() => deleteCartao(c.id)} className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button> 
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <ResumoItem label="Saldo Livre" value={formatar(incomeTotal - totalExpenses)} color="text-emerald-500" icon={<Wallet size={18}/>}/>
                <ResumoItem label="Dinheiro/Pix" value={formatar(despesasDinheiro)} color="text-purple-500" icon={<Banknote size={18}/>}/>
                <ResumoItem label="Cartão" value={formatar(despesasCredito)} color="text-purple-500" icon={<CreditCard size={18}/>}/>
                <ResumoItem label="Despesas" value={formatar(totalExpenses)} color="text-red-500" icon={<TrendingUp size={18}/>}/>
              </div>

              <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm relative overflow-visible lg:col-span-1">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 pr-2"> 
                   <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60">Gráfico por Categoria</h3>
                   <div className="flex bg-[var(--color-bg-page)] p-1 rounded-xl border border-[var(--color-border)] w-full sm:w-auto justify-center">
                     <button onClick={() => setDistView('horizontal')} className={`flex-1 sm:flex-none p-2 flex justify-center rounded-lg transition-all ${distView === 'horizontal' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Barra Horizontal"><List size={14}/></button>
                     <button onClick={() => setDistView('vertical')} className={`flex-1 sm:flex-none p-2 flex justify-center rounded-lg transition-all ${distView === 'vertical' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Barra Vertical"><BarChart3 size={14}/></button>
                     <button onClick={() => setDistView('pie')} className={`flex-1 sm:flex-none p-2 flex justify-center rounded-lg transition-all ${distView === 'pie' ? 'bg-primary-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} title="Rodela"><PieChartIcon size={14}/></button>
                   </div>
                 </div>

                 {distView !== 'pie' && dadosPizza.length > 0 && dadosPizza[activeIndex] && (
                   <div className="absolute top-[88px] right-6 sm:top-[90px] sm:right-10 lg:top-[110px] lg:right-12 bg-[var(--color-bg-page)]/90 backdrop-blur-md border border-[var(--color-border)] px-4 py-2 rounded-2xl shadow-xl z-20 flex flex-col items-end pointer-events-none transition-all">
                     <span className="text-[10px] sm:text-xs font-black uppercase" style={{ color: CHART_COLORS[activeIndex % CHART_COLORS.length] }}>
                       {dadosPizza[activeIndex].name}
                     </span>
                     <span className="text-xs sm:text-sm font-bold text-zinc-300">
                       {formatar(dadosPizza[activeIndex].value)}
                     </span>
                   </div>
                 )}
                 
                 <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[350px] sm:max-h-[450px]">
                   <div style={{
                     height: distView === 'horizontal' ? Math.max(250, dadosPizza.length * 40) : (isMobile ? 250 : 300),
                     minWidth: distView === 'vertical' ? Math.max(isMobile ? 300 : 400, dadosPizza.length * 45) : '100%'
                   }}>
                     <ResponsiveContainer width="100%" height="100%">
                        {distView === 'pie' ? ( 
                          <PieChart> 
                            <Pie 
                              data={dadosPizza} 
                              innerRadius={isMobile ? 65 : 80} 
                              outerRadius={isMobile ? 90 : 105} 
                              dataKey="value" 
                              stroke="none" 
                              paddingAngle={5} 
                              cornerRadius={6}
                              activeIndex={activeIndex < dadosPizza.length ? activeIndex : 0} 
                              activeShape={renderActiveShape} 
                              onMouseEnter={handleChartClick} 
                              onClick={handleChartClick}
                              onTouchStart={handleChartClick}
                            > 
                              {dadosPizza.map((e, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} className="cursor-pointer" />
                              ))} 
                            </Pie> 
                          </PieChart> 
                        ) : 
                        distView === 'horizontal' ? ( 
                          <BarChart layout="vertical" data={dadosPizza} margin={{ left: 0, right: 30, top: 20, bottom: 20 }}
                            onMouseMove={handleBarChartInteraction}
                            onClick={handleBarChartInteraction}
                            onTouchStart={handleBarChartInteraction}
                            onTouchMove={handleBarChartInteraction}
                          > 
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} /> 
                            <XAxis type="number" hide /> 
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900'}} width={90} interval={0} tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v} padding={{ top: 10, bottom: 10 }} /> 
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={() => null} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}> 
                              {dadosPizza.map((e, i) => (
                                <Cell 
                                  key={i} 
                                  fill={CHART_COLORS[i % CHART_COLORS.length]} 
                                  fillOpacity={1}
                                  stroke={activeIndex === i ? (isDarkMode ? '#ffffff' : '#18181b') : 'transparent'}
                                  strokeWidth={activeIndex === i ? 2 : 0}
                                  className="transition-all duration-300"
                                />
                              ))} 
                            </Bar> 
                          </BarChart> 
                        ) : ( 
                          <BarChart data={dadosPizza} margin={{ top: 20, bottom: 20, left: -20, right: 10 }}
                            onMouseMove={handleBarChartInteraction}
                            onClick={handleBarChartInteraction}
                            onTouchStart={handleBarChartInteraction}
                            onTouchMove={handleBarChartInteraction}
                          > 
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} /> 
                            <XAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900'}} interval={0} padding={{ left: 20, right: 20 }} tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '...' : v} /> 
                            <YAxis type="number" hide /> 
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={() => null} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={20}> 
                              {dadosPizza.map((e, i) => (
                                <Cell 
                                  key={i} 
                                  fill={CHART_COLORS[i % CHART_COLORS.length]} 
                                  fillOpacity={1}
                                  stroke={activeIndex === i ? (isDarkMode ? '#ffffff' : '#18181b') : 'transparent'}
                                  strokeWidth={activeIndex === i ? 2 : 0}
                                  className="transition-all duration-300"
                                />
                              ))} 
                            </Bar> 
                          </BarChart> 
                        )}
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6"> 
                   {dadosPizza.map((d, i) => ( 
                     <div key={d.name} 
                          onClick={() => setActiveIndex(i)}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`flex justify-between items-center text-[9px] sm:text-[10px] font-black border-b border-zinc-100 dark:border-zinc-800 pb-2 cursor-pointer transition-all ${activeIndex === i ? 'bg-primary-500/10 rounded-lg px-2 -mx-2 border-transparent' : ''}`}> 
                       <div className="flex items-center gap-1.5 truncate pr-2">
                         <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                         <span className="truncate" title={d.name}>{d.name}</span> 
                       </div>
                       <span className="text-primary-500 shrink-0">{d.percString}</span> 
                     </div> 
                   ))} 
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
                <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3"> 
                    <h3 className="text-[10px] sm:text-xs font-black uppercase opacity-60">Histórico Principal</h3> 
                    <div className="relative w-full sm:w-48 group"> <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-500 transition-colors" /> <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] rounded-xl outline-none text-[10px] sm:text-xs font-bold border border-transparent transition-all" /> </div>
                  </div>
                  <div className="space-y-4 sm:space-y-6 max-h-64 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    {Object.keys(historicoPrincipal).map(dataString => (
                      <div key={dataString} className="space-y-2 sm:space-y-3">
                        <div className="sticky top-0 z-10 py-1 bg-[var(--color-bg-card)]/80 backdrop-blur-md"> <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary-500">{dataString === new Date().toLocaleDateString('pt-BR') ? "Hoje" : dataString}</h4> </div>
                        {historicoPrincipal[dataString].map(it => (
                          <div key={it.id} className="flex justify-between items-center p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl group transition-all">
                            <div className="flex items-center gap-2 sm:gap-3"> <div className={`w-1 h-6 sm:h-8 rounded-full ${it.fonte ? 'bg-emerald-500' : 'bg-red-500'}`} /> <div className="truncate"> <p className="font-black text-[10px] sm:text-xs truncate">{it.fonte || it.categoria}</p> <p className="text-[8px] sm:text-[9px] opacity-40 font-bold uppercase">{it.hora}</p> </div> </div>
                            <div className="flex items-center gap-2 sm:gap-3"> <span className={`font-black text-[10px] sm:text-xs ${it.fonte ? 'text-emerald-500' : ''}`}>{it.fonte ? '+' : '-'} {formatar(it.valor)}</span> <button onClick={() => deleteItem(it.fonte ? 'receitas':'gastos', it.id)} className="text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={14} className="sm:w-4 sm:h-4" /></button> </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3"> 
                    <h3 className="text-[10px] sm:text-xs font-black uppercase opacity-60">Fatura de Crédito</h3> 
                    <div className="relative w-full sm:w-48 group"> <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-500 transition-colors" /> <input value={searchTermCredito} onChange={(e) => setSearchTermCredito(e.target.value)} placeholder="Buscar crédito..." className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] rounded-xl outline-none text-[10px] sm:text-xs font-bold border border-transparent transition-all" /> </div>
                  </div>
                  <div className="space-y-4 sm:space-y-6 max-h-64 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    {Object.keys(historicoCredito).map(dataString => (
                      <div key={dataString} className="space-y-2 sm:space-y-3">
                        <div className="sticky top-0 z-10 py-1 bg-[var(--color-bg-card)]/80 backdrop-blur-md"> <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary-500">{dataString}</h4> </div>
                        {historicoCredito[dataString].map(it => (
                          <div key={it.id} className="flex justify-between items-center p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl border border-primary-500/5 group">
                            <div className="flex items-center gap-2 sm:gap-3 truncate"> 
                              <div className="w-1 h-6 sm:h-8 rounded-full bg-primary-500 shrink-0" /> 
                              <div className="truncate"> 
                                <p className="font-black text-[10px] sm:text-xs truncate">{it.categoria}</p> 
                                <p className="text-[7px] sm:text-[8px] font-bold text-primary-500 uppercase truncate">{data.cartoes.find(c => c.id === it.cartao_id)?.nome} • {it.hora} {it.fatura_paga ? '(PAGO)' : ''}</p> 
                              </div> 
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3"> <span className="font-black text-[10px] sm:text-xs">- {formatar(it.valor)}</span> <button onClick={() => deleteItem('gastos', it.id)} className="text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={14} className="sm:w-4 sm:h-4" /></button> </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'analises' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 text-center relative">
              
              {analisesData.length > 0 && analisesData[activeMonthIndex] && (
                <div className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-[var(--color-bg-page)]/90 backdrop-blur-md border border-[var(--color-border)] px-4 py-3 rounded-2xl shadow-xl z-20 flex flex-col items-end pointer-events-none transition-all">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-zinc-300 mb-2">
                    {analisesData[activeMonthIndex].name} de {selectedYear}
                  </span>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-emerald-500 uppercase">Renda</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-500">{formatar(analisesData[activeMonthIndex].renda)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-red-500 uppercase">Gastos</span>
                      <span className="text-xs sm:text-sm font-black text-red-500">{formatar(analisesData[activeMonthIndex].gastos)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[var(--color-bg-card)] p-4 sm:p-8 lg:p-12 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-xl text-center">
                 <h3 className="text-lg sm:text-2xl font-black mb-12 sm:mb-16 text-left uppercase tracking-tighter">Análise Mensal</h3>
                 <div className="h-[400px] sm:h-[500px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analisesData} layout={isMobile ? "vertical" : "horizontal"} margin={{ left: isMobile ? -20 : 0, bottom: 20 }}
                        onMouseMove={handleAnaliseInteraction}
                        onClick={handleAnaliseInteraction}
                        onTouchStart={handleAnaliseInteraction}
                        onTouchMove={handleAnaliseInteraction}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={!isMobile} horizontal={isMobile} strokeOpacity={0.05} /> 
                        <XAxis type={isMobile ? "number" : "category"} dataKey={isMobile ? undefined : "name"} hide={isMobile} tick={{fontSize: 9, fontWeight: '900'}} padding={{ left: 20, right: 20 }} interval={0} tickFormatter={(v) => v.substring(0,3)} /> 
                        <YAxis type={isMobile ? "category" : "number"} dataKey={isMobile ? "name" : undefined} hide={!isMobile} tick={{fontSize: 9, fontWeight: '900'}} axisLine={false} tickLine={false} width={70} interval={0} padding={{ top: 10, bottom: 10 }} /> 
                        
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={() => null} />
                        
                        <Bar dataKey="renda" fill="#10b981" radius={isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={isMobile ? 12 : 20}>
                          {analisesData.map((e, i) => (
                            <Cell 
                              key={`renda-${i}`} 
                              fillOpacity={1} 
                              stroke={activeMonthIndex === i ? (isDarkMode ? '#ffffff' : '#18181b') : 'transparent'}
                              strokeWidth={activeMonthIndex === i ? 2 : 0}
                              className="transition-all duration-300" 
                            />
                          ))}
                        </Bar> 
                        <Bar dataKey="gastos" fill="#ef4444" radius={isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={isMobile ? 12 : 20}>
                          {analisesData.map((e, i) => (
                            <Cell 
                              key={`gastos-${i}`} 
                              fillOpacity={1} 
                              stroke={activeMonthIndex === i ? (isDarkMode ? '#ffffff' : '#18181b') : 'transparent'}
                              strokeWidth={activeMonthIndex === i ? 2 : 0}
                              className="transition-all duration-300" 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
              <div className="bg-[var(--color-bg-card)] p-6 sm:p-12 rounded-3xl lg:rounded-[3rem] border border-[var(--color-border)] shadow-xl text-center">
                <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 flex items-center justify-center gap-3"> <User className="text-primary-500" /> Perfil </h3>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="flex-1 p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl outline-none font-bold text-sm sm:text-base focus:ring-2 ring-primary-500" />
                  <button onClick={handleUpdateName} disabled={isUpdating || newUserName === userName} className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-primary-600 text-white rounded-xl sm:rounded-2xl font-black transition-all"> {isUpdating ? "Salvando..." : "Salvar"} </button>
                </div>
              </div>
              
              <div className="bg-[var(--color-bg-card)] p-6 sm:p-12 rounded-3xl lg:rounded-[3rem] border border-[var(--color-border)] shadow-xl text-left">
                <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 flex items-center gap-3"> <Settings className="text-primary-500" /> Preferências </h3>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-border)]">
                  <div>
                    <h4 className="font-bold text-sm">Avanço Automático de Fatura</h4>
                    <p className="text-xs text-zinc-400 mt-2 max-w-md">Se ativado, gastos lançados em um cartão após o seu dia de fechamento serão registrados automaticamente na fatura do mês seguinte.</p>
                  </div>
                  <button
                    onClick={() => setAutoForwardExpenses(!autoForwardExpenses)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoForwardExpenses ? 'bg-primary-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoForwardExpenses ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-red-500/10 p-6 sm:p-8 rounded-3xl lg:rounded-[3rem] border border-red-500/20 text-center"> 
                <button onClick={handleDeleteAccount} className="w-full sm:w-auto px-6 py-3 sm:py-4 bg-red-500 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase">Excluir Minha Conta</button> 
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex items-center gap-3 sm:gap-4 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105' : 'opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}> {icon} <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest">{label}</span> </button> ); }
function ResumoItem({ label, value, color, icon }) { return ( <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 rounded-3xl lg:rounded-[2.5rem] border border-[var(--color-border)] shadow-sm text-center flex flex-col justify-center h-full"> <div className={`mb-3 sm:mb-4 mx-auto p-2 sm:p-3 w-fit rounded-lg sm:rounded-xl bg-[var(--color-bg-page)] ${color}`}>{icon}</div> <p className="text-[8px] sm:text-[9px] font-black uppercase mb-1 opacity-40">{label}</p> <p className="text-sm sm:text-lg lg:text-xl font-black tracking-tight">{value}</p> </div> ); }
function CardInput({ title, children, color }) { return ( <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2rem] border border-[var(--color-border)] shadow-sm w-full relative"> <h3 className={`text-[10px] sm:text-[11px] font-black uppercase mb-4 sm:mb-6 tracking-widest flex items-center gap-2 ${color}`}><Plus size={14}/> {title}</h3> <div className="flex gap-2 sm:gap-3">{children}</div> </div> ); }