import { supabase } from "../lib/supabase";

export async function fetchWorkspaceYearData(year) {
  const { data, error } = await supabase.rpc("get_workspace_year_data", {
    p_year: Number(year),
  });

  if (error) throw error;

  return {
    categories: data?.categories ?? [],
    creditCards: data?.credit_cards ?? [],
    recurringExpenses: data?.recurring_expenses ?? [],
    incomes: data?.incomes ?? [],
    expenses: data?.expenses ?? [],
  };
}

export async function createIncome({
  userId,
  source,
  amount,
  occurredAt,
  month,
  year,
  notes,
}) {
  const { data, error } = await supabase
    .from("incomes")
    .insert([
      {
        user_id: userId,
        source: source.trim(),
        amount: Number(amount),
        occurred_at: occurredAt || new Date().toISOString(),
        competence_month: Number(month),
        competence_year: Number(year),
        notes: notes?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeIncome(id) {
  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) throw error;
}

export async function createExpense({
  userId,
  categoryId,
  categoryName,
  creditCardId,
  amount,
  description,
  occurredAt,
  month,
  year,
}) {
  const { data, error } = await supabase
    .from("expenses")
    .insert([
      {
        user_id: userId,
        category_id: categoryId || null,
        category_name: categoryName.trim(),
        credit_card_id: creditCardId || null,
        amount: Number(amount),
        description: description?.trim() || null,
        occurred_at: occurredAt || new Date().toISOString(),
        competence_month: Number(month),
        competence_year: Number(year),
        is_invoice_paid: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function createCategory({ userId, name, color = "#8b5cf6" }) {
  const { data, error } = await supabase
    .from("categories")
    .insert([
      {
        user_id: userId,
        name: name.trim(),
        color,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameCategory({ id, name }) {
  const { data, error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function saveCreditCard({
  id,
  userId,
  name,
  closingDay,
  spendingGoal,
  brandColor = "#7c3aed",
}) {
  const payload = {
    name: name.trim(),
    closing_day: Number(closingDay),
    spending_goal: spendingGoal ? Number(spendingGoal) : null,
    brand_color: brandColor,
  };

  if (id) {
    const { data, error } = await supabase
      .from("credit_cards")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("credit_cards")
    .insert([{ user_id: userId, ...payload }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeCreditCard(id) {
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function payCardInvoice({ cardId, month, year }) {
  const { data, error } = await supabase.rpc("pay_card_invoice", {
    p_card_id: cardId,
    p_month: Number(month),
    p_year: Number(year),
  });

  if (error) throw error;
  return data;
}

export async function saveRecurringExpense({
  id,
  userId,
  name,
  amount,
  billingDay,
  creditCardId,
  startMonth,
  startYear,
}) {
  const payload = {
    name: name.trim(),
    amount: Number(amount),
    billing_day: billingDay ? Number(billingDay) : null,
    credit_card_id: creditCardId || null,
    start_month: Number(startMonth),
    start_year: Number(startYear),
  };

  if (id) {
    const { data, error } = await supabase
      .from("recurring_expenses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert([{ user_id: userId, is_active: true, ...payload }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleRecurringExpense({ id, isActive }) {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .update({ is_active: Boolean(isActive) })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeRecurringExpense(id) {
  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
