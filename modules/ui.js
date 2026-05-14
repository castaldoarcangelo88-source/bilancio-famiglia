import { MEMBERS, createTransaction, QUOTA_BASELINA, SOGLIA_ALLARME_CASSA } from "./data-model.js";
import { calcolaCassaReale, calcolaConguagli, ripartisciUtile } from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";
import { loadCategoriesFromDB, addCategoryToDB, deleteCategoryFromDB, sendTelegramMessage, renderBarChart } from "./db-manager.js";

// ✅ Variabile GLOBALE per il mese (persistente)
window.currentMonth = new Date().toISOString().slice(0, 7);
let transactions = [];
let allCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Avvio app - Mese:", window.currentMonth);
  
  // 1. Carica Categorie
  allCategories = await loadCategoriesFromDB();
  updateCategorySelect();
  renderCategoriesList();

  // 2. Carica Transazioni
  transactions = await loadTransactions();
  
  // 3. Renderizza
  updateMonthLabel();
  render();
  renderCharts();
  
  // 4. Setup Eventi
  setupEvents();
});

// --- GESTIONE CATEGORIE ---
function updateCategorySelect() {
  const sel = document.getElementById("fCat");
  const tipo = document.getElementById("fTipo").value;
  sel.innerHTML = '<option value="">Categoria...</option>';
  
  const filtered = allCategories.filter(c => c.type === tipo);
  filtered.forEach(c => {
    sel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
}

function renderCategoriesList() {
  const list = document.getElementById("categoriesList");
  if (!list) return;
  list.innerHTML = allCategories.map(c => `
    <div class="cat-item">
      <span>${c.name} (${c.type === 'entrata' ? '🟢' : '🔴'})</span>
      <button onclick="window.deleteCat('${c.id}')">🗑</button>
    </div>
  `).join('');
}

window.addNewCategory = async function() {
  const name = document.getElementById("newCatName").value;
  const type = document.getElementById("newCatType").value;
  if (!name) return alert("Inserisci un nome!");
  
  await addCategoryToDB(name, type);
  allCategories = await loadCategoriesFromDB();
  renderCategoriesList();
  updateCategorySelect();
  document.getElementById("newCatName").value = "";
};

window.deleteCat = async function(id) {
  if (confirm("Eliminare questa categoria?")) {
    await deleteCategoryFromDB(id);
    allCategories = await loadCategoriesFromDB();
    renderCategoriesList();
    updateCategorySelect();
  }
};

// --- TELEGRAM ---
window.testTelegram = function() {
  const msg = ` <b>Test Bilancio Famiglia</b>\n📅 Data: ${new Date().toLocaleDateString('it-IT')}\n💰 Cassa attuale: €${document.getElementById("kpiCassa").textContent}`;
  sendTelegramMessage(msg);
};

// --- GRAFICI ---
function renderCharts() {
  const meseTrans = transactions.filter(t => t.mese === window.currentMonth);
  const cats = [...new Set(meseTrans.map(t => t.cat))];
  
  const entrate = cats.map(c => meseTrans.filter(t => t.cat === c && t.tipo === 'entrata').reduce((a,b) => a + b.importo, 0));
  const uscite = cats.map(c => meseTrans.filter(t => t.cat === c && t.tipo === 'uscita').reduce((a,b) => a + b.importo, 0));
  
  renderBarChart('monthlyChart', cats, entrate, uscite);
  
  // Grafico settimanale (semplice)
  const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  renderBarChart('weeklyChart', days, [0,0,0,0,0,0,0], [0,0,0,0,0,0,0]);
}

window.updateMonthlyChart = function() {
  renderCharts();
};

// --- NAVIGAZIONE MESI (FIX DEFINITIVO) ---
function shiftMonth(delta) {
  console.log("📅 Shift month delta:", delta, "da:", window.currentMonth);
  
  const [y, m] = window.currentMonth.split("-").map(Number);
  const newDate = new Date(y, m - 1 + delta, 1);
  window.currentMonth = newDate.toISOString().slice(0, 7);
  
  console.log("✅ Nuovo mese:", window.currentMonth);
  updateMonthLabel();
  render();
  renderCharts(); // Aggiorna grafici per il nuovo mese
}

function updateMonthLabel() {
  const el = document.getElementById("currentMonth");
  if (el) el.textContent = window.currentMonth;
}

// --- EVENTI ---
function setupEvents() {
  document.getElementById("fTipo").addEventListener("change", updateCategorySelect);
  
  document.getElementById("btnAggiungi").addEventListener("click", async () => {
    const tipo = document.getElementById("fTipo").value;
    const cat = document.getElementById("fCat").value;
    const membro = document.getElementById("fMembro").value;
    const importo = parseFloat(document.getElementById("fImporto").value);
    const reale = document.getElementById("fReale").checked;
    
    if (!cat || isNaN(importo)) return alert("⚠️ Compila categoria e importo!");
    
    const t = createTransaction(window.currentMonth, tipo, cat, membro, importo, false, reale);
    const saved = await saveTransaction(t);
    if (saved) {
      transactions.push(saved);
      render();
      renderCharts();
      document.getElementById("fImporto").value = "";
    }
  });

  // ✅ Navigazione mesi - onclick diretto
  document.getElementById("prevMonth").onclick = () => shiftMonth(-1);
  document.getElementById("nextMonth").onclick = () => shiftMonth(1);
  document.getElementById("btnExport").onclick = () => exportCSV(transactions);
}

// --- RENDER ---
function render() {
  const monthTrans = transactions.filter(t => t.mese === window.currentMonth);
  const cassa = calcolaCassaReale(monthTrans);
  const conguaglio = calcolaConguagli(monthTrans);
  const { utileRipartibile } = ripartisciUtile(cassa, conguaglio);

  document.getElementById("kpiCassa").textContent = fmt(cassa);
  document.getElementById("kpiConguaglio").textContent = fmt(conguaglio);
  document.getElementById("kpiUtile").textContent = fmt(utileRipartibile);

  // Alert Cassa
  const box = document.getElementById("alert-box");
  if (cassa < SOGLIA_ALLARME_CASSA) {
    box.style.display = "block";
    box.innerHTML = `⚠️ <b>ATTENZIONE:</b> Cassa sotto soglia (€${cassa.toFixed(2)} < €${SOGLIA_ALLARME_CASSA})`;
  } else {
    box.style.display = "none";
  }

  renderTable(monthTrans);
  renderMobileList(monthTrans);
  renderRollover(conguaglio, cassa, utileRipartibile);
}

function renderTable(list) {
  const tbody = document.querySelector("#transTable tbody");
  if (!tbody) return;
  tbody.innerHTML = list.map(t => `
    <tr style="color:${t.tipo==='entrata'?'var(--success)':'var(--danger)'}">
      <td>${t.tipo.toUpperCase()}</td><td>${t.cat}</td><td>${t.membro}</td>
      <td>€${t.importo.toFixed(2)}</td>
      <td><span class="badge ${t.confermato?'real':'atteso'}">${t.confermato?'Reale':'Atteso'}</span></td>
      <td>
        <button class="btn-sm" onclick="window.toggle('${t.id}')">${t.confermato?'Annulla':'Conferma'}</button>
        <button class="btn-sm" style="color:red" onclick="window.del('${t.id}')">🗑</button>
      </td>
    </tr>`).join('');
}

function renderMobileList(list) {
  const c = document.getElementById("mobile-container");
  if (!c) return;
  c.innerHTML = list.map(t => `
    <div class="m-card ${t.tipo}">
      <div class="m-info">
        <h4>${t.cat} <small>(${t.membro})</small></h4>
        <div class="m-actions">
          <button class="m-btn conf" onclick="window.toggle('${t.id}')">${t.confermato?'Annulla':'Conferma'}</button>
          <button class="m-btn del" onclick="window.del('${t.id}')">Elimina</button>
        </div>
      </div>
      <div class="m-amount" style="color:${t.tipo==='entrata'?'var(--success)':'var(--danger)'}">${t.tipo==='entrata'?'+':'-'}€${t.importo.toFixed(2)}</div>
    </div>`).join('');
}

window.toggle = async (id) => {
  const t = transactions.find(x => x.id === id);
  if (t) { 
    t.confermato = !t.confermato; 
    t.reale = t.confermato; 
    await updateTransaction(id, {confermato: t.confermato, reale: t.reale}); 
    render(); 
  }
};

window.del = async (id) => {
  if (confirm("Eliminare questo movimento?")) { 
    transactions = transactions.filter(x => x.id !== id); 
    await deleteTransaction(id); 
    render(); 
  }
};

function fmt(n) { return `€${n.toFixed(2)}`; }
function renderRollover(conguaglio, cassa, utile) {
  document.getElementById("rolloverList").innerHTML = `
    <li>💰 Cassa: ${fmt(cassa)}</li>
    <li>⚖️ Conguaglio: ${fmt(conguaglio)}</li>
    <li>📉 Utile: ${fmt(utile)}</li>
  `;
}
