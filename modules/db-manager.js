import { CONFIG } from "./config.js";

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

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

// --- TELEGRAM (Sicuro) ---
export async function sendTelegramMessage(msg) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN === "INSERISCI_TOKEN_QUI") {
    alert("⚠️ Configura il Telegram Bot Token in config.js");
    return;
  }

  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ 
        chat_id: CONFIG.TELEGRAM_CHAT_ID, 
        text: msg,
        parse_mode: "HTML"
      })
    });
    
    const result = await response.json();
    if (result.ok) {
      alert("✅ Messaggio inviato a Telegram!");
    } else {
      alert("❌ Errore Telegram: " + result.description);
    }
  } catch (error) {
    alert("❌ Errore di connessione: " + error.message);
  }
}

// --- GRAFICI ---
export function renderBarChart(canvasId, labels, dataEntrate, dataUscite) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  const oldChart = Chart.getChart(canvasId);
  if (oldChart) oldChart.destroy();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Entrate', data: dataEntrate, backgroundColor: '#10b981', borderRadius: 5 },
        { label: 'Uscite', data: dataUscite, backgroundColor: '#ef4444', borderRadius: 5 }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
