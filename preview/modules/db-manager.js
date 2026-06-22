import { CONFIG } from "./config.js";
import { CATEGORIES } from "./data-model.js";

const LOCAL_CAT_KEY = "bilancio_categories_test";
const REMOVED_CATEGORIES = ["Conguaglio", "Prestito Anna", "Prestito da Anna", "Rimborso Anna"];

function isLocalTest() {
  return localStorage.getItem("bilancio_test_admin") === "true";
}

function defaultCategories() {
  return Object.entries(CATEGORIES).flatMap(([type, groups]) => {
    return [...groups.ricorrenti, ...groups.una_tantum].map(name => ({
      id: `${type}-${name}`,
      name,
      type,
      is_recurring: groups.ricorrenti.includes(name)
    }));
  }).filter((cat, index, list) => {
    return list.findIndex(other => other.type === cat.type && other.name === cat.name) === index;
  });
}

function readLocalCategories() {
  const raw = localStorage.getItem(LOCAL_CAT_KEY);
  if (raw) {
    const saved = JSON.parse(raw).filter(cat => !REMOVED_CATEGORIES.includes(cat.name));
    const merged = [...saved];
    defaultCategories().forEach(cat => {
      const exists = merged.some(item => item.type === cat.type && item.name === cat.name);
      if (!exists) merged.push(cat);
    });
    writeLocalCategories(merged);
    return merged;
  }

  const seed = defaultCategories();
  localStorage.setItem(LOCAL_CAT_KEY, JSON.stringify(seed));
  return seed;
}

function writeLocalCategories(categories) {
  localStorage.setItem(LOCAL_CAT_KEY, JSON.stringify(categories));
}

// --- CATEGORIE ---
export async function loadCategoriesFromDB() {
  if (isLocalTest()) return readLocalCategories();

  const { supabase } = await import("./supabase-client.js");
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) {
    console.error("Errore caricamento categorie:", error);
    return defaultCategories();
  }
  const filtered = (data || []).filter(cat => !REMOVED_CATEGORIES.includes(cat.name));
  const merged = [...filtered];
  defaultCategories().forEach(cat => {
    const exists = merged.some(item => item.type === cat.type && item.name === cat.name);
    if (!exists) merged.push(cat);
  });
  return merged;
}

export async function addCategoryToDB(name, type) {
  const cleanName = name.trim();
  if (!cleanName) return null;

  if (isLocalTest()) {
    const categories = readLocalCategories();
    const saved = { id: crypto.randomUUID(), name: cleanName, type, is_recurring: false };
    categories.push(saved);
    writeLocalCategories(categories);
    return saved;
  }

  const { supabase } = await import("./supabase-client.js");
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name: cleanName, type, is_recurring: false }])
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}

export async function deleteCategoryFromDB(id) {
  if (isLocalTest()) {
    writeLocalCategories(readLocalCategories().filter(c => c.id !== id));
    return;
  }

  const { supabase } = await import("./supabase-client.js");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// --- TELEGRAM ---
export async function sendTelegramMessage() {
  if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    alert("Telegram disattivato: il Bot Token non deve stare nel browser. Usa una funzione server/Supabase Edge Function.");
    return;
  }

  alert("Telegram va inviato da backend, non dal frontend.");
}

// --- GRAFICI ---
export function renderBarChart(canvasId, labels, dataEntrate, dataUscite) {
  if (!window.Chart) return;

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const oldChart = window.Chart.getChart(canvasId);
  if (oldChart) oldChart.destroy();

  new window.Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Entrate", data: dataEntrate, backgroundColor: "#10b981", borderRadius: 5 },
        { label: "Uscite", data: dataUscite, backgroundColor: "#ef4444", borderRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
