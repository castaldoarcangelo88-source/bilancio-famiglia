import { supabase } from "./storage.js";

// --- CATEGORIE ---
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

// --- TELEGRAM ---
export async function sendTelegramMessage(msg) {
  // ⚠️ Se non hai avviato il bot su Telegram, riceverai "chat not found"
  if (!CONFIG.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN.includes("INSERISCI")) {
    alert("⚠️ Configura il BOT_TOKEN in config.js");
    return;
  }

  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text: msg, parse_mode: "HTML" })
    });
    const data = await res.json();
    if (data.ok) alert("✅ Notifica inviata!");
    else alert("❌ Errore Telegram: " + data.description);
  } catch (e) {
    alert("❌ Errore connessione: " + e.message);
  }
}

// --- GRAFICI ---
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
    options: {
      responsive: true,
      maintainAspectRatio: false, // ✅ Fondamentale per il contenitore CSS
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } } }
    }
  });
}
