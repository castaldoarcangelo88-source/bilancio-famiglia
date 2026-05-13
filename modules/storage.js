import { STORAGE_KEY } from "./data-model.js";

// 🔑 CREDENZIALI SUPABASE INSERITE
const SUPABASE_URL = "https://igmmekejpqbbctjupsqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbW1la2VqcHFiYmN0anVwc3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODQ4MjgsImV4cCI6MjA5NDI2MDgyOH0.TYFey7KCDrWSikDEsDDIba7E65sD0EhS1CF-tsKRGJs";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export async function loadTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) { 
    console.error("Errore fetch:", error); 
    return []; 
  }
  return data;
}

export async function saveTransaction(t) {
  const { error } = await supabase.from("transactions").insert([t]);
  if (error) console.error("Errore insert:", error);
}

export async function updateTransaction(id, updates) {
  const { error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id);
  if (error) console.error("Errore update:", error);
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) console.error("Errore delete:", error);
}

export function exportCSV(trans) {
  const header = "id,mese,tipo,cat,membro,importo,ricorrente,reale,confermato,created_at";
  const rows = trans.map(t => 
    `${t.id},${t.mese},${t.tipo},"${t.cat}","${t.membro}",${t.importo},${t.ricorrente},${t.reale},${t.confermato},${t.created_at}`
  ).join("\n");
  const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `famiglia_finance_${new Date().toISOString().slice(0,7)}.csv`;
  a.click();
}