-- ============================================================================
-- FINANS - SCHEMA COMPLETO OTIMIZADO PARA SUPABASE FREE TIER
-- PostgreSQL 15+ | RLS Estrito | Triggers de Integridade | RPCs Enxutas
-- ============================================================================

-- ----------------------------------------------------------------------------
-- [0] LIMPEZA SEGURA DA VERSÃO ANTERIOR E FUNÇÕES
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.delete_my_account() CASCADE;
DROP FUNCTION IF EXISTS public.pay_card_invoice(UUID, SMALLINT, SMALLINT) CASCADE;
DROP FUNCTION IF EXISTS public.get_ai_financial_context(SMALLINT, SMALLINT) CASCADE;
DROP FUNCTION IF EXISTS public.get_workspace_year_data(SMALLINT) CASCADE;
DROP FUNCTION IF EXISTS public.prune_old_ai_messages() CASCADE;
DROP FUNCTION IF EXISTS public.validate_recurring_ownership() CASCADE;
DROP FUNCTION IF EXISTS public.validate_expense_ownership() CASCADE;
DROP FUNCTION IF EXISTS public.cascade_category_rename() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Remove tabelas novas (caso re-execute) e tabelas legadas da v1
DROP TABLE IF EXISTS
  public.notification_logs,
  public.push_subscriptions,
  public.ai_messages,
  public.ai_insights,
  public.expenses,
  public.incomes,
  public.recurring_expenses,
  public.credit_cards,
  public.categories,
  public.user_preferences,
  public.profiles,
  -- Tabelas legadas da v1:
  public.gastos,
  public.receitas,
  public.categorias,
  public.mensalidades,
  public.cartoes
CASCADE;

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- [1] FUNÇÃO UTILITÁRIA DE TIMESTAMPS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- [2] TABELAS DE IDENTIDADE E PREFERÊNCIAS
-- ----------------------------------------------------------------------------

-- Perfil do usuário (sincronizado automaticamente com auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (LENGTH(TRIM(display_name)) > 0),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Preferências sincronizadas entre Desktop, Tablet e Celular (PWA)
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  auto_forward_card_expenses BOOLEAN NOT NULL DEFAULT FALSE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notify_card_goal_75 BOOLEAN NOT NULL DEFAULT TRUE,
  notify_card_goal_100 BOOLEAN NOT NULL DEFAULT TRUE,
  notify_invoice_closing BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ai_pills BOOLEAN NOT NULL DEFAULT TRUE,
  ai_humor_level TEXT NOT NULL DEFAULT 'sarcastic_friendly'
    CHECK (ai_humor_level IN ('mild', 'sarcastic_friendly', 'roast')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- [3] TABELAS FINANCEIRAS PRINCIPAIS
-- ----------------------------------------------------------------------------

-- Categorias de despesas personalizadas por usuário
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  icon TEXT NOT NULL DEFAULT 'tag',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evita categorias duplicadas no mesmo usuário ignorando maiúsculas/espaços
CREATE UNIQUE INDEX idx_categories_user_name_ci
  ON public.categories (user_id, LOWER(TRIM(name)));

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cartões de crédito e metas pessoais de gastos
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  spending_goal NUMERIC(12, 2) CHECK (spending_goal IS NULL OR spending_goal > 0),
  brand_color TEXT NOT NULL DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user ON public.credit_cards (user_id);

CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mensalidades / Despesas fixas recorrentes
CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  billing_day SMALLINT CHECK (billing_day IS NULL OR billing_day BETWEEN 1 AND 31),
  start_month SMALLINT NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT CHECK (start_month BETWEEN 1 AND 12),
  start_year SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT CHECK (start_year BETWEEN 2020 AND 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_user_active
  ON public.recurring_expenses (user_id, is_active);

CREATE INDEX idx_recurring_card
  ON public.recurring_expenses (user_id, credit_card_id)
  WHERE credit_card_id IS NOT NULL;

CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Receitas (entradas)
CREATE TABLE public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (LENGTH(TRIM(source)) > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  competence_month SMALLINT NOT NULL CHECK (competence_month BETWEEN 1 AND 12),
  competence_year SMALLINT NOT NULL CHECK (competence_year BETWEEN 2020 AND 2100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incomes_user_period
  ON public.incomes (user_id, competence_year, competence_month, occurred_at DESC);

-- Despesas (Dinheiro/Pix quando credit_card_id IS NULL; Crédito caso contrário)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Se a categoria for excluída, category_id vira NULL mas category_name preserva o histórico
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL CHECK (LENGTH(TRIM(category_name)) > 0),
  -- Se o cartão for excluído, apaga em cascata os gastos vinculados a ele
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL GENERATED ALWAYS AS (
    CASE WHEN credit_card_id IS NULL THEN 'cash_pix' ELSE 'credit_card' END
  ) STORED,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  competence_month SMALLINT NOT NULL CHECK (competence_month BETWEEN 1 AND 12),
  competence_year SMALLINT NOT NULL CHECK (competence_year BETWEEN 2020 AND 2100),
  is_invoice_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_period
  ON public.expenses (user_id, competence_year, competence_month, occurred_at DESC);

CREATE INDEX idx_expenses_card_period
  ON public.expenses (user_id, credit_card_id, competence_year, competence_month)
  WHERE credit_card_id IS NOT NULL;

CREATE INDEX idx_expenses_category
  ON public.expenses (user_id, category_id)
  WHERE category_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- [4] TABELAS DE INTELIGÊNCIA ARTIFICIAL (Custo & Storage Otimizados)
-- ----------------------------------------------------------------------------

-- Cache de diagnósticos proativos e pílulas da IA (evita chamadas repetidas à API)
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competence_month SMALLINT NOT NULL CHECK (competence_month BETWEEN 1 AND 12),
  competence_year SMALLINT NOT NULL CHECK (competence_year BETWEEN 2020 AND 2100),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('monthly_diagnosis', 'weekly_pill', 'anomaly_alert')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_fingerprint TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, competence_month, competence_year, insight_type)
);

-- Histórico de conversa do assistente (mantido enxuto via trigger de retenção)
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_user_recent
  ON public.ai_messages (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- [5] TABELAS DE NOTIFICAÇÕES PWA (Web Push & Deduplicação)
-- ----------------------------------------------------------------------------

-- Inscrições Web Push (VAPID) por dispositivo do usuário
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registro de deduplicação para nunca disparar o mesmo alerta repetidamente
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dedupe_key)
);

-- ----------------------------------------------------------------------------
-- [6] TRIGGERS DE REGRA DE NEGÓCIO & INTEGRIDADE MULTI-TENANT
-- ----------------------------------------------------------------------------

-- A) Provisiona perfil, preferências e categorias iniciais ao criar conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuário'
  );

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Categorias iniciais amigáveis (o usuário pode editar ou excluir livremente)
  INSERT INTO public.categories (user_id, name, color, icon)
  VALUES
    (NEW.id, 'Alimentação', '#10b981', 'utensils'),
    (NEW.id, 'Moradia',     '#6366f1', 'home'),
    (NEW.id, 'Transporte',  '#3b82f6', 'car'),
    (NEW.id, 'Lazer',       '#ec4899', 'sparkles'),
    (NEW.id, 'Saúde',       '#f43f5e', 'heart-pulse'),
    (NEW.id, 'Outros',      '#8b5cf6', 'tag')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B) Atualiza em cascata todos os lançamentos históricos ao renomear categoria
CREATE OR REPLACE FUNCTION public.cascade_category_rename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.expenses
    SET category_name = TRIM(NEW.name)
    WHERE category_id = NEW.id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cascade_category_rename
  AFTER UPDATE OF name ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.cascade_category_rename();

-- C) Garante que categoria/cartão referenciados pertencem ao mesmo usuário e sincroniza nome
CREATE OR REPLACE FUNCTION public.validate_expense_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_name TEXT;
  v_card_exists BOOLEAN;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_cat_name
    FROM public.categories
    WHERE id = NEW.category_id AND user_id = NEW.user_id;

    IF v_cat_name IS NULL THEN
      RAISE EXCEPTION 'Categoria inválida ou não pertence ao usuário.';
    END IF;

    NEW.category_name := v_cat_name;
  END IF;

  IF NEW.credit_card_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.credit_cards
      WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
    ) INTO v_card_exists;

    IF NOT v_card_exists THEN
      RAISE EXCEPTION 'Cartão inválido ou não pertence ao usuário.';
    END IF;
  ELSE
    -- Garante que gastos no Dinheiro/Pix nunca fiquem marcados como fatura paga
    NEW.is_invoice_paid := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_expense_ownership
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_ownership();

-- C2) Garante que o cartao vinculado em mensalidade pertence ao mesmo usuario
CREATE OR REPLACE FUNCTION public.validate_recurring_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_exists BOOLEAN;
BEGIN
  IF NEW.credit_card_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.credit_cards
      WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
    ) INTO v_card_exists;

    IF NOT v_card_exists THEN
      RAISE EXCEPTION 'Cartão inválido ou não pertence ao usuário.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_recurring_ownership
  BEFORE INSERT OR UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_ownership();

-- D) Mantém no máximo 60 mensagens recentes no chat da IA por usuário (Free Tier friendly)
CREATE OR REPLACE FUNCTION public.prune_old_ai_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_messages
  WHERE id IN (
    SELECT id FROM public.ai_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 60
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prune_old_ai_messages
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.prune_old_ai_messages();

-- ----------------------------------------------------------------------------
-- [7] ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs  ENABLE ROW LEVEL SECURITY;

-- Profiles (chave primária é id = auth.uid())
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- Tabelas vinculadas por user_id
CREATE POLICY "prefs_all_own" ON public.user_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_all_own" ON public.categories
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "cards_all_own" ON public.credit_cards
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "recurring_all_own" ON public.recurring_expenses
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "incomes_all_own" ON public.incomes
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "expenses_all_own" ON public.expenses
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "ai_insights_all_own" ON public.ai_insights
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "ai_messages_all_own" ON public.ai_messages
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "push_subs_all_own" ON public.push_subscriptions
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_logs_all_own" ON public.notification_logs
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- [8] FUNÇÕES RPC OTIMIZADAS (Redução de roundtrips e tokens)
-- ----------------------------------------------------------------------------

-- 1) Carrega todo o workspace de um ano em 1 única requisição
CREATE OR REPLACE FUNCTION public.get_workspace_year_data(p_year SMALLINT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_uid
    ),
    'preferences', (
      SELECT to_jsonb(up) FROM public.user_preferences up WHERE up.user_id = v_uid
    ),
    'categories', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY LOWER(c.name))
      FROM public.categories c WHERE c.user_id = v_uid
    ), '[]'::jsonb),
    'credit_cards', COALESCE((
      SELECT jsonb_agg(to_jsonb(cc) ORDER BY cc.created_at ASC)
      FROM public.credit_cards cc WHERE cc.user_id = v_uid
    ), '[]'::jsonb),
    'recurring_expenses', COALESCE((
      SELECT jsonb_agg(to_jsonb(re) ORDER BY re.is_active DESC, re.amount DESC)
      FROM public.recurring_expenses re WHERE re.user_id = v_uid
    ), '[]'::jsonb),
    'incomes', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.occurred_at DESC)
      FROM public.incomes i
      WHERE i.user_id = v_uid AND i.competence_year = p_year
    ), '[]'::jsonb),
    'expenses', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC)
      FROM public.expenses e
      WHERE e.user_id = v_uid AND e.competence_year = p_year
    ), '[]'::jsonb)
  );
END;
$$;

-- 2) Quita a fatura do mês de um cartão específico de forma atômica
CREATE OR REPLACE FUNCTION public.pay_card_invoice(
  p_card_id UUID,
  p_month SMALLINT,
  p_year SMALLINT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.expenses
  SET is_invoice_paid = TRUE
  WHERE user_id = auth.uid()
    AND credit_card_id = p_card_id
    AND competence_month = p_month
    AND competence_year = p_year
    AND is_invoice_paid = FALSE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- 3) Resumo financeiro compacto para alimentar a IA com mínimo consumo de tokens
CREATE OR REPLACE FUNCTION public.get_ai_financial_context(
  p_month SMALLINT,
  p_year SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_curr_index INTEGER := (p_year * 12) + p_month;
  v_prev_month SMALLINT := CASE WHEN p_month = 1 THEN 12 ELSE p_month - 1 END;
  v_prev_year  SMALLINT := CASE WHEN p_month = 1 THEN p_year - 1 ELSE p_year END;
  v_prev_index INTEGER := (v_prev_year * 12) + v_prev_month;
  v_recurring_cash NUMERIC(12, 2);
  v_recurring_card NUMERIC(12, 2);
  v_recurring_prev NUMERIC(12, 2);
  v_income_curr NUMERIC(12, 2);
  v_cash_curr NUMERIC(12, 2);
  v_card_curr NUMERIC(12, 2);
  v_income_prev NUMERIC(12, 2);
  v_expense_prev NUMERIC(12, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE credit_card_id IS NULL), 0),
    COALESCE(SUM(amount) FILTER (WHERE credit_card_id IS NOT NULL), 0)
  INTO v_recurring_cash, v_recurring_card
  FROM public.recurring_expenses
  WHERE user_id = v_uid
    AND is_active = TRUE
    AND ((start_year * 12) + start_month) <= v_curr_index;

  SELECT COALESCE(SUM(amount), 0) INTO v_recurring_prev
  FROM public.recurring_expenses
  WHERE user_id = v_uid
    AND is_active = TRUE
    AND ((start_year * 12) + start_month) <= v_prev_index;

  SELECT COALESCE(SUM(amount), 0) INTO v_income_curr
  FROM public.incomes
  WHERE user_id = v_uid AND competence_month = p_month AND competence_year = p_year;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE credit_card_id IS NULL), 0),
    COALESCE(SUM(amount) FILTER (WHERE credit_card_id IS NOT NULL), 0)
  INTO v_cash_curr, v_card_curr
  FROM public.expenses
  WHERE user_id = v_uid AND competence_month = p_month AND competence_year = p_year;

  SELECT COALESCE(SUM(amount), 0) INTO v_income_prev
  FROM public.incomes
  WHERE user_id = v_uid AND competence_month = v_prev_month AND competence_year = v_prev_year;

  SELECT COALESCE(SUM(amount), 0) + v_recurring_prev INTO v_expense_prev
  FROM public.expenses
  WHERE user_id = v_uid AND competence_month = v_prev_month AND competence_year = v_prev_year;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('month', p_month, 'year', p_year),
    'current_month', jsonb_build_object(
      'income_total', v_income_curr,
      'cash_pix_variable', v_cash_curr,
      'recurring_cash_total', v_recurring_cash,
      'recurring_card_total', v_recurring_card,
      'recurring_active_total', v_recurring_cash + v_recurring_card,
      'cash_pix_total', v_cash_curr + v_recurring_cash,
      'credit_card_total', v_card_curr + v_recurring_card,
      'expenses_total', v_cash_curr + v_recurring_cash + v_card_curr + v_recurring_card,
      'free_balance', v_income_curr - (v_cash_curr + v_recurring_cash + v_card_curr + v_recurring_card)
    ),
    'previous_month', jsonb_build_object(
      'income_total', v_income_prev,
      'expenses_total', v_expense_prev,
      'free_balance', v_income_prev - v_expense_prev
    ),
    'top_categories', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT category_name AS category, SUM(amount) AS total
        FROM public.expenses
        WHERE user_id = v_uid AND competence_month = p_month AND competence_year = p_year
        GROUP BY category_name
        ORDER BY total DESC
        LIMIT 6
      ) t
    ), '[]'::jsonb),
    'credit_cards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', cc.name,
        'closing_day', cc.closing_day,
        'spending_goal', cc.spending_goal,
        'spent', COALESCE(s.spent, 0) + COALESCE(rc.rec_spent, 0),
        'unpaid', COALESCE(s.unpaid, 0),
        'goal_pct', CASE
          WHEN cc.spending_goal > 0 THEN ROUND(((COALESCE(s.spent, 0) + COALESCE(rc.rec_spent, 0)) / cc.spending_goal) * 100, 1)
          ELSE NULL
        END
      ))
      FROM public.credit_cards cc
      LEFT JOIN (
        SELECT
          credit_card_id,
          SUM(amount) AS spent,
          SUM(amount) FILTER (WHERE NOT is_invoice_paid) AS unpaid
        FROM public.expenses
        WHERE user_id = v_uid AND competence_month = p_month AND competence_year = p_year
        GROUP BY credit_card_id
      ) s ON s.credit_card_id = cc.id
      LEFT JOIN (
        SELECT
          credit_card_id,
          SUM(amount) AS rec_spent
        FROM public.recurring_expenses
        WHERE user_id = v_uid
          AND is_active = TRUE
          AND credit_card_id IS NOT NULL
          AND ((start_year * 12) + start_month) <= v_curr_index
        GROUP BY credit_card_id
      ) rc ON rc.credit_card_id = cc.id
      WHERE cc.user_id = v_uid
    ), '[]'::jsonb),
    'active_recurring', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', re.name,
        'amount', re.amount,
        'payment_method', CASE WHEN re.credit_card_id IS NULL THEN 'cash_pix' ELSE 'credit_card' END,
        'credit_card_name', cc.name,
        'start_month', re.start_month,
        'start_year', re.start_year
      ) ORDER BY re.amount DESC)
      FROM public.recurring_expenses re
      LEFT JOIN public.credit_cards cc ON cc.id = re.credit_card_id
      WHERE re.user_id = v_uid
        AND re.is_active = TRUE
        AND ((re.start_year * 12) + re.start_month) <= v_curr_index
    ), '[]'::jsonb),
    'recent_expenses', COALESCE((
      SELECT jsonb_agg(r) FROM (
        SELECT category_name, amount, payment_method, description, occurred_at
        FROM public.expenses
        WHERE user_id = v_uid AND competence_month = p_month AND competence_year = p_year
        ORDER BY occurred_at DESC
        LIMIT 6
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

-- 4) Exclusão completa da conta (remove auth.users e propaga CASCADE para tudo)
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ----------------------------------------------------------------------------
-- [9] BACKFILL PARA USUÁRIOS JÁ EXISTENTES EM auth.users
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(u.email, ''), '@', 1), ''),
    'Usuário'
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_preferences (user_id)
SELECT u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.categories (user_id, name, color, icon)
SELECT u.id, cat.name, cat.color, cat.icon
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Alimentação', '#10b981', 'utensils'),
    ('Moradia',     '#6366f1', 'home'),
    ('Transporte',  '#3b82f6', 'car'),
    ('Lazer',       '#ec4899', 'sparkles'),
    ('Saúde',       '#f43f5e', 'heart-pulse'),
    ('Outros',      '#8b5cf6', 'tag')
) AS cat(name, color, icon)
ON CONFLICT DO NOTHING;
