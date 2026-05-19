import { supabase } from "./supabase-client.js";

export async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Errore caricamento categorie:", error);
    return [];
  }

  return data || [];
}

export async function addCategory(name, type, isRecurring = false) {
  const cleanName = name.trim();
  if (!cleanName) return null;

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name: cleanName, type, is_recurring: isRecurring }])
    .select();

  if (error) {
    console.error("Errore aggiunta categoria:", error);
    return null;
  }

  return data[0];
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione categoria:", error);
    return false;
  }

  return true;
}

export async function updateTelegramSettings(chatId, enabled) {
  const { error } = await supabase
    .from("telegram_settings")
    .update({ chat_id: chatId, daily_report: enabled })
    .eq("id", "00000000-0000-0000-0000-000000000001");

  if (error) {
    console.error("Errore update Telegram:", error);
    return false;
  }

  return true;
}

export async function getTelegramSettings() {
  const { data } = await supabase
    .from("telegram_settings")
    .select("*")
    .single();

  return data;
}
