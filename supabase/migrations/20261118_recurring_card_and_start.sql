-- ============================================================================
-- MIGRACAO SEGURA: MENSALIDADES COM CARTAO DE CREDITO E DATA DE INICIO
-- Execute no SQL Editor do Supabase sem apagar seus dados existentes.
-- ============================================================================

-- 1) Adiciona colunas em recurring_expenses preservando registros atuais
ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_month SMALLINT NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT,
  ADD COLUMN IF NOT EXISTS start_year SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;

-- Garante constraints de mes/ano validos caso ainda nao existam
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recurring_expenses_start_month_check'
  ) THEN
    ALTER TABLE public.recurring_expenses
      ADD CONSTRAINT recurring_expenses_start_month_check
      CHECK (start_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recurring_expenses_start_year_check'
  ) THEN
    ALTER TABLE public.recurring_expenses
      ADD CONSTRAINT recurring_expenses_start_year_check
      CHECK (start_year BETWEEN 2020 AND 2100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_card
  ON public.recurring_expenses (user_id, credit_card_id)
  WHERE credit_card_id IS NOT NULL;

-- 2) Trigger de seguranca garantindo que o cartao vinculado pertence ao usuario
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

DROP TRIGGER IF EXISTS trg_validate_recurring_ownership ON public.recurring_expenses;
CREATE TRIGGER trg_validate_recurring_ownership
  BEFORE INSERT OR UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_ownership();

-- 3) Atualiza get_ai_financial_context para considerar start_month/start_year e cartao nas mensalidades
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
