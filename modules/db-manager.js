import { supabase } from "./storage.js";
import { CONFIG } from "./config.js";

export async function loadCategoriesFromDB() {
  const { data } = await supabase.from("categories").select("*").order("name");
  return data || [];
}

export async function addCategoryToDB(name, type) {
  await supabase.from("categories").insert([{ name, type, is_recurring: false }]);
}

export async function deleteCategoryFromDB(id) {
  await supabase.from("categories").delete().eq("id", id);
}

export async function sendTelegramMessage(msg) {
  const token = CONFIG.TELEGRAM_BOT_TOKEN;
  const chatId = CONFIG.TELEGRAM_CHAT_ID;
  if (!token || token.includes("INSERISCI")) return alert("Configura il BOT_TOKEN");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
    });
    const data = await response.json();
    if (data.ok) alert("✅ Inviato!");
    else alert("❌ Errore: " + data.description);
  } catch (e) { alert("❌ Errore connessione"); }
}

export function renderChart(canvasId, labels, dataIn, dataOut) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Entrate', data: dataIn, backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Uscite', data: dataOut, backgroundColor: '#ef4444', borderRadius: 6 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
  });
}
