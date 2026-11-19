# Finans

Aplicação web progressiva (PWA) para gestão financeira pessoal, controle de cartões de crédito, mensalidades e análises com inteligência artificial.

![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

---

## Visão Geral e Funcionalidades

- **Autenticação e Conta:** Login por e-mail/senha, OAuth com Google (`select_account`) e GitHub, recuperação de senha e exclusão completa da conta via RPC.
- **Dashboard Temporal:** Filtros globais de mês e ano (`2024` a `2036+`) com cálculo de Saldo Livre, Receitas, Dinheiro/Pix, Cartão de Crédito e Despesas Totais.
- **Receitas, Despesas e Categorias:** Lançamentos rápidos em gaveta responsiva, histórico pesquisável agrupado por data e gerenciador separado de categorias com renomeação em cascata no banco.
- **Mensalidades:** Cadastro de contas fixas com botão de pausa/ativação, seleção de cobrança (Débito Automático ou Cartão de Crédito) e controle de mês/ano de início.
- **Cartões de Crédito e Metas:** Acompanhamento de fatura (`Aberta`, `Fechada`, `Paga`), barra de meta pessoal com alertas em `75%` e `100%`, quitação de fatura e opção de avanço automático após o dia de fechamento.
- **Análises Visuais:** Distribuição de gastos por categoria (rosca, barras horizontais e colunas) e comparativo anual mês a mês entre receitas e despesas.
- **FinanscIA (BYOK):** Assistente financeiro com suporte multi-provedor (**Google Gemini**, **Groq**, **OpenAI** e **Anthropic**), chave salva apenas no `localStorage`, seleção automática do modelo mais rápido e fallback dinâmico.
- **PWA e Notificações:** Instalação em celular, tablet e desktop com Service Worker customizado e alertas no dispositivo para metas de cartão, fechamento de fatura e dicas da FinanscIA.

---

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Front-end e UI** | React 19, Vite 7, Tailwind CSS v4, Lucide React |
| **Gráficos e Animações** | Recharts 3, Framer Motion |
| **Back-end e Banco de Dados** | Supabase (PostgreSQL, Auth, Row Level Security, RPCs e Edge Functions) |
| **Inteligência Artificial** | Arquitetura BYOK direta no navegador (Google Gemini, Groq, OpenAI e Anthropic) |
| **PWA e Notificações** | `vite-plugin-pwa` (`injectManifest`), Service Worker customizado e Web Push (VAPID) |

---

## Arquitetura do Projeto

```text
src/
├── components/
│   ├── charts/        # Gráficos minimalistas (rosca, barras e comparativo anual)
│   ├── layout/        # AppShell, Sidebar, TopBar, MobileBottomNav e ThemeProvider
│   └── ui/            # Button, Card, Input, Modal, AdaptiveSheet, SelectPill e Toast
├── contexts/          # Contextos React (Auth, Financial, Theme e Toast)
├── features/
│   ├── ai/            # FinanscIA e configuração de chave BYOK
│   ├── analytics/     # Tela de análises visuais e resumo anual
│   ├── auth/          # HeroLanding, AuthScreen (Login/Cadastro) e AuthProvider
│   ├── cards/         # Cartões de crédito, metas e pagamento de faturas
│   ├── dashboard/     # Visão geral e KPIs mensais
│   ├── finance/       # Provider de estado financeiro e sincronização anual
│   ├── recurring/     # Mensalidades com forma de cobrança e início
│   ├── settings/      # Perfil, tema, notificações, BYOK e exclusão de conta
│   └── transactions/  # Extratos, lançamento rápido e gerenciador de categorias
├── hooks/             # Hooks utilitários (instalação PWA)
├── lib/               # Regras financeiras, provedores de IA, formatadores e Supabase
├── services/          # Camadas de API (financeiro, FinanscIA e Web Push)
└── sw.js              # Service Worker customizado para cache offline e Push

supabase/
├── functions/         # Edge Functions opcionais (ai-assistant e send-push)
├── migrations/        # Scripts incrementais de atualização do banco
└── schema.sql         # Schema completo com tabelas, triggers, RLS, RPCs e backfill
```

---

## Configuração e Execução Local

### 1. Clonar o repositório e instalar dependências

```bash
git clone <url-do-repositorio>
cd controle-financeiro
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo para `.env` e preencha com as credenciais do seu projeto Supabase:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica_do_supabase
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_vapid
```

### 3. Criar o banco de dados no Supabase

1. Acesse o **SQL Editor** no painel do seu projeto Supabase.
2. Copie e execute o conteúdo completo de `supabase/schema.sql`.
3. O script cria todas as tabelas, políticas de RLS, triggers de integridade, funções RPC e aplica backfill para contas existentes em `auth.users`.

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Para gerar o build de produção com o Service Worker PWA:

```bash
npm run build
npm run preview
```

---

<p align="center">
  Desenvolvido por <a href="https://github.com/LucMNS"><b>LucMNS</b></a>
</p>