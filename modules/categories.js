import { STORAGE_KEY } from "./data-model.js";

const supabase = window.supabase.createClient(
  "https://igmmekejpqbbctjupsqa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbW1la2VqcHFiYmN0anVwc3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODQ4MjgsImV4cCI6MjA5NDI2MDgyOH0.TYFey7KCDrWSikDEsDDIba7E65sD0EhS1CF-tsKRGJs"
);

export async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("❌ Errore caricamento categorie:", error);
    return [];
  }
  return data || [];
}

export async function addCategory(name, type, isRecurring = false) {
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, type, is_recurring: isRecurring }])
    .select();
  
  if (error) {
    console.error("❌ Errore aggiunta categoria:", error);
    return null;
  }
  return data[0];
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("❌ Errore eliminazione:", error);
    return false;
  }
  return true;
}

export async function updateTelegramSettings(chatId, enabled) {
  const { error } = await supabase
    .from("telegram_settings")
    .update({ chat_id: chatId, daily_report: enabled })
    .eq("id", "00000000-0000-0000-0000-000000000001"); // Prima riga
  
  if (error) {
    console.error("❌ Errore update Telegram:", error);
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