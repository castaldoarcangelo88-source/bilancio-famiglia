// CONFIGURAZIONE
const SUPABASE_URL = "https://igmmekejpqbbctjupsqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbW1la2VqcHFiYmN0anVwc3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODQ4MjgsImV4cCI6MjA5NDI2MDgyOH0.TYFey7KCDrWSikDEsDDIba7E65sD0EhS1CF-tsKRGJs";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  // Usa la tua chat ID hardcoded qui per testare
  const CHAT_ID = "75236001"; 
  const BOT_TOKEN = "8664363802:AAHySYi_TzchyVM2ADiXQuatipi3WSJ0gEY"; // ⚠️ METTI QUI IL TOKEN DEL TUO BOT

  if(BOT_TOKEN === "8664363802:AAHySYi_TzchyVM2ADiXQuatipi3WSJ0gEY") {
    alert("Configura il BOT_TOKEN nel file db-manager.js");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg })
  });
  alert("Messaggio inviato a Telegram!");
}

// --- GRAFICI ---
export function renderBarChart(canvasId, labels, dataEntrate, dataUscite) {
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  
  // Distruggi vecchio grafico
  const oldChart = Chart.getChart(canvasId);
  if(oldChart) oldChart.destroy();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Entrate', data: dataEntrate, backgroundColor: '#10b981', borderRadius: 5 },
        { label: 'Uscite', data: dataUscite, backgroundColor: '#ef4444', borderRadius: 5 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}