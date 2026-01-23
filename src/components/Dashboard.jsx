import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, BarChart3, Sun, Moon, Plus, Wallet, 
  Trash2, LogOut, Menu, X, TrendingUp, ChevronDown, Calendar, PieChart as PieChartIcon 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';

// --- COMPONENTE DE ABA ANIMADA ---
function SeletorAnimado({ value, options, onChange, icon: Icon, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--color-bg-page)] dark:bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:border-primary-500 transition-all font-black text-xs uppercase"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-primary-500 shrink-0" />}
          <span className="truncate">{value}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-[150] overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
              {options.map((opt) => (
                <button 
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase ${String(value) === String(opt) ? 'bg-primary-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  {opt}
                </button>
              ))}
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

  const [data, setData] = useState({ 
    receitas: [], 
    gastos: [], 
    cats: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'iFood'] 
  });

  const fetchDados = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: recs } = await supabase.from('receitas').select('*').eq('user_id', authUser.id);
    const { data: gasts } = await supabase.from('gastos').select('*').eq('user_id', authUser.id);
    setData(prev => ({ ...prev, receitas: recs || [], gastos: gasts || [] }));
  };

  useEffect(() => { fetchDados(); }, [userName]);

  const [rFonte, setRFonte] = useState(''); const [rValor, setRValor] = useState('');
  const [gCat, setGCat] = useState('Alimentação'); const [gValor, setGValor] = useState('');
  const [novaCatInput, setNovaCatInput] = useState('');

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const anos = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  }, []);

  const addReceita = async () => {
    const v = parseFloat(rValor.replace(/\./g, '').replace(',', '.'));
    if (!v || !rFonte) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const novoItem = { id: Date.now(), fonte: rFonte, valor: v, mes: selectedMonth, ano: selectedYear };
    setData(prev => ({ ...prev, receitas: [novoItem, ...prev.receitas] }));
    setRFonte(''); setRValor('');
    await supabase.from('receitas').insert([{ user_id: authUser.id, fonte: novoItem.fonte, valor: v, data: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), mes: selectedMonth, ano: selectedYear }]);
  };

  const addGasto = async () => {
    const v = parseFloat(gValor.replace(/\./g, '').replace(',', '.'));
    if (!v) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const novoItem = { id: Date.now(), categoria: gCat, valor: v, mes: selectedMonth, ano: selectedYear };
    setData(prev => ({ ...prev, gastos: [novoItem, ...prev.gastos] }));
    setGValor('');
    await supabase.from('gastos').insert([{ user_id: authUser.id, categoria: novoItem.categoria, valor: v, cor: `hsl(${Math.random()*360}, 70%, 50%)`, data: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), mes: selectedMonth, ano: selectedYear }]);
  };

  const deleteItem = async (type, id) => {
    setData(prev => ({ ...prev, [type]: prev[type].filter(item => item.id !== id) }));
    await supabase.from(type).delete().eq('id', id);
  };

  const formatar = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const receitasMes = data.receitas.filter(r => r.mes === selectedMonth && r.ano === Number(selectedYear));
  const gastosMes = data.gastos.filter(g => g.mes === selectedMonth && g.ano === Number(selectedYear));
  const totalR = receitasMes.reduce((a, b) => a + b.valor, 0);
  const totalG = gastosMes.reduce((a, b) => a + b.valor, 0);

  const dadosPizza = useMemo(() => {
    const map = gastosMes.reduce((acc, curr) => { acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor; return acc; }, {});
    return Object.keys(map).map(c => ({ name: c, value: map[c], perc: totalG > 0 ? ((map[c]/totalG)*100).toFixed(0) + '%' : '0%' }));
  }, [gastosMes, totalG]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)] transition-all">
      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="fixed top-4 left-4 z-[110] p-3 bg-primary-600 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all">
        {isMenuOpen ? <X size={20}/> : <Menu size={20}/>}
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85] lg:hidden" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed inset-y-0 left-0 w-72 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-6 pt-20 z-[90] flex flex-col shadow-2xl">
            <nav className="flex-1 space-y-2">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Painel" active={activeTab === 'painel'} onClick={() => {setActiveTab('painel'); setIsMenuOpen(false);}} />
              <SidebarItem icon={<BarChart3 size={20}/>} label="Análises" active={activeTab === 'analises'} onClick={() => {setActiveTab('analises'); setIsMenuOpen(false);}} />
            </nav>
            <div className="pt-6 border-t border-[var(--color-border)] space-y-2">
              <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold text-sm">
                {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>} {isDarkMode ? 'Modo Luz' : 'Modo Trevas'}
              </button>
              <button onClick={onLogout} className="flex items-center gap-3 w-full p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-sm transition-all">
                <LogOut size={18}/> Sair
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className={`flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 transition-all duration-300 ${isMenuOpen ? 'lg:pl-80' : 'pl-4 sm:pl-10 lg:pl-16'}`}>
        <header className="mb-8 mt-14 lg:mt-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{saudacao}, {userName}!</h1>
            <p className="text-sm sm:text-base opacity-70 font-medium">Controle sua jornada financeira hoje.</p>
          </div>
          {activeTab === 'painel' && (
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <SeletorAnimado value={meses[selectedMonth]} options={meses} onChange={(val) => setSelectedMonth(meses.indexOf(val))} icon={Calendar} className="flex-1 lg:w-40" />
              <SeletorAnimado value={selectedYear} options={anos} onChange={(val) => setSelectedYear(Number(val))} className="w-24 sm:w-32" />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'painel' ? (
            <motion.div key="p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 sm:space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <CardInput title="Adicionar Renda" color="text-emerald-500">
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <input value={rFonte} onChange={e=>setRFonte(e.target.value)} placeholder="Fonte" className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm" />
                    <input value={rValor} onChange={e=>setRValor(e.target.value)} placeholder="R$ 0" className="sm:w-32 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-black text-sm" />
                    <button onClick={addReceita} className="p-4 bg-emerald-500 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center"><Plus/></button>
                  </div>
                </CardInput>

                <CardInput title="Novo Gasto" color="text-primary-500">
                  <div className="flex flex-col w-full gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <SeletorAnimado value={gCat} options={data.cats} onChange={setGCat} className="sm:w-48" />
                      <input value={gValor} onChange={e=>setGValor(e.target.value)} placeholder="Valor" className="flex-1 p-4 bg-[var(--color-bg-page)] rounded-2xl outline-none font-bold text-sm" />
                      <button onClick={addGasto} className="p-4 bg-primary-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex justify-center"><Plus/></button>
                    </div>
                    <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
                      <input value={novaCatInput} onChange={e=>setNovaCatInput(e.target.value)} placeholder="Nova categoria..." className="flex-1 text-xs bg-transparent border-b border-[var(--color-border)] outline-none" />
                      <button onClick={() => { if(novaCatInput) setData(prev=>({...prev, cats:[...prev.cats, novaCatInput]})); setNovaCatInput('') }} className="text-[10px] font-black text-primary-500 uppercase shrink-0">+ Adicionar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.cats.map(c => (
                        <span key={c} className="px-3 py-1 bg-[var(--color-bg-icon)] text-[9px] sm:text-[10px] font-black rounded-full flex items-center gap-2">
                          {c} <button onClick={() => setData(prev=>({...prev, cats: prev.cats.filter(cat=>cat!==c)}))}><X size={10} className="hover:text-red-500"/></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </CardInput>
              </div>

              {/* GRID DE RESUMO COM ANIMAÇÃO SNAPPY E BORDA VISÍVEL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                <ResumoItem label="Saldo Disponível" value={formatar(totalR - totalG)} color="text-emerald-500" icon={<Wallet size={20}/>}/>
                <ResumoItem label="Despesas" value={formatar(totalG)} color="text-red-500" icon={<Trash2 size={20}/>}/>
                <ResumoItem label="Saúde Financeira" value={`${totalR > 0 ? ((totalG/totalR)*100).toFixed(0) : 0}%`} color="text-primary-500" icon={<PieChartIcon size={20}/>}/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-xs font-black uppercase mb-6 tracking-widest opacity-60">Histórico</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {[...data.receitas, ...data.gastos].filter(it => it.mes === selectedMonth && it.ano === Number(selectedYear)).sort((a,b)=>b.id-a.id).map(it => (
                      <div key={it.id} className="flex justify-between items-center p-4 sm:p-5 bg-[var(--color-bg-page)] rounded-2xl sm:rounded-3xl group border border-transparent hover:border-primary-500 transition-all">
                        <div className="flex items-center gap-3 sm:gap-4 truncate">
                          <div className={`w-1 h-8 sm:w-1.5 sm:h-10 rounded-full shrink-0 ${it.fonte ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <p className="font-black text-xs sm:text-sm truncate">{it.fonte || it.categoria}</p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                          <span className={`font-black text-xs sm:text-base ${it.fonte ? 'text-emerald-500' : ''}`}>{it.fonte ? '+' : '-'} {formatar(it.valor)}</span>
                          <button onClick={() => deleteItem(it.fonte ? 'receitas':'gastos', it.id)} className="text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-[var(--color-border)] flex flex-col items-center shadow-sm">
                   <h3 className="text-xs font-black uppercase mb-8 tracking-widest opacity-60 self-start">Distribuição</h3>
                   <div className="h-48 sm:h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dadosPizza} innerRadius={50} outerRadius={70} sm:innerRadius={70} sm:outerRadius={95} dataKey="value" stroke="none">
                            {dadosPizza.map((e, i) => <Cell key={i} fill={`hsl(${i*45}, 70%, 60%)`} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 'bold' }} />
                        </PieChart>
                     </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full">
                     {dadosPizza.map(d => (
                       <div key={d.name} className="flex justify-between text-[10px] font-black border-b border-zinc-100 dark:border-zinc-800 pb-2">
                         <span className="truncate">{d.name}</span> <span className="text-primary-500">{d.perc}</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10">
              <div className="bg-[var(--color-bg-card)] p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border border-[var(--color-border)] shadow-xl text-center">
                 <h3 className="text-xl sm:text-2xl font-black mb-8 sm:mb-12">Análise Temporal</h3>
                 <div className="h-64 sm:h-96">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={meses.map((m, i) => ({ 
                        name: m.substring(0,3), 
                        gastos: data.gastos.filter(g=>g.mes===i && g.ano === Number(selectedYear)).reduce((a,b)=>a+b.valor,0),
                        renda: data.receitas.filter(r=>r.mes===i && r.ano === Number(selectedYear)).reduce((a,b)=>a+b.valor,0)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900'}} />
                        <YAxis hide />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                        <Bar dataKey="renda" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// COMPONENTE DE RESUMO COM EFEITO RÁPIDO E BORDA VERDE NÍTIDA
function ResumoItem({ label, value, color, icon }) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "linear" }}
      className="bg-[var(--color-bg-card)] p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-transparent hover:border-emerald-500 shadow-sm hover:shadow-2xl transition-all cursor-default group"
    >
      <div className={`mb-4 p-3 w-fit rounded-xl bg-[var(--color-bg-page)] ${color} group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase opacity-40 mb-1 group-hover:opacity-100 transition-opacity duration-200">{label}</p>
      <p className="text-xl sm:text-2xl font-black tracking-tight">{value}</p>
    </motion.div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all cursor-pointer ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105' : 'opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-100'}`}>
      {icon} <span className="font-black text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );
}

function CardInput({ title, children, color }) {
  return (
    <div className="bg-[var(--color-bg-card)] p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-[var(--color-border)] shadow-sm">
      <h3 className={`text-[10px] font-black uppercase mb-6 tracking-widest flex items-center gap-2 ${color}`}><Plus size={14}/> {title}</h3>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}