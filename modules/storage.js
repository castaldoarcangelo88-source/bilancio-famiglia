import { CONFIG } from "./config.js";

// ✅ Unica inizializzazione di Supabase
export const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export async function loadTransactions() {
  const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (error) { console.error("DB Error:", error); return []; }
  return data || [];
}

export async function saveTransaction(t) {
  const { data, error } = await supabase.from("transactions").insert([t]).select();
  if (error) throw error;
  return data ? data[0] : null;
}

export async function updateTransaction(id, updates) {
  const { error } = await supabase.from("transactions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export function exportCSV(trans) {
  const header = "id,mese,tipo,cat,membro,importo,ricorrente,reale,confermato,created_at";
  const rows = trans.map(t => `${t.id},${t.mese},${t.tipo},"${t.cat}","${t.membro}",${t.importo},${t.ricorrente},${t.reale},${t.confermato},${t.created_at}`).join("\n");
  const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bilancio_${new Date().toISOString().slice(0,7)}.csv`;
  a.click();
}
