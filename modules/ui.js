import { MEMBERS, CATEGORIES, createTransaction, QUOTA_BASELINA } from "./data-model.js";
import { calcolaCassaReale, calcolaConguagli, ripartisciUtile } from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";

// Stato globale
let currentMonth = new Date().toISOString().slice(0, 7);
let transactions = [];
let eventsInitialized = false;

// Avvio
document.addEventListener("DOMContentLoaded", async () => {
  populateCategories();
  updateMonthLabel();
  
  // Caricamento dati
  transactions = await loadTransactions();
  
  // ✅ AUTOMATIZZAZIONE: Clona ricorrenze al cambio mese
  await gestisciRicorrenze();
  
  render();
  
  if (!eventsInitialized) {
    setupEvents();
    eventsInitialized = true;
  }
});

// Logica Ricorrenze
async function gestisciRicorrenze() {
  // Trova transazioni ricorrenti del mese scorso
  const [y, m] = currentMonth.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1); // Mese precedente
  const prevMonthStr = prevDate.toISOString().slice(0, 7);
  
  const ricorrenti = transactions.filter(t => t.ricorrente && t.mese === prevMonthStr);
  
  for (const t of ricorrenti) {
    // Evita duplicati
    const exists = transactions.some(x => x.mese === currentMonth && x.cat === t.cat && x.membro === t.membro && x.importo === t.importo);
    if (!exists) {
      const newT = { ...t, mese: currentMonth, confermato: false, reale: false, created_at: new Date().toISOString() };
      await saveTransaction(newT);
      transactions.push(newT);
    }
  }
}

// Eventi
function setupEvents() {
  document.getElementById("fTipo").addEventListener("change", populateCategories);
  
  document.getElementById("btnAggiungi").addEventListener("click", async () => {
    const tipo = document.getElementById("fTipo").value;
    const cat = document.getElementById("fCat").value;
    const membro = document.getElementById("fMembro").value;
    const importo = parseFloat(document.getElementById("fImporto").value);
    const ricorrente = document.getElementById("fRicorrente").checked;
    const reale = document.getElementById("fReale").checked;
    
    if (!cat || !importo) { alert("Compila tutti i campi!"); return; }
    
    const t = createTransaction(currentMonth, tipo, cat, membro, importo, ricorrente, reale);
    const saved = await saveTransaction(t);
    if (saved) {
      transactions.push(saved);
      render();
      document.getElementById("fImporto").value = ""; // Reset solo importo
    }
  });

  document.getElementById("prevMonth").onclick = () => { shiftMonth(-1); gestisciRicorrenze(); };
  document.getElementById("nextMonth").onclick = () => { shiftMonth(1); gestisciRicorrenze(); };
  document.getElementById("btnExport").onclick = () => exportCSV(transactions);
}

// Navigazione Mese
function shiftMonth(delta) {
  const [year, month] = currentMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  currentMonth = d.toISOString().slice(0, 7);
  updateMonthLabel();
  render();
}

// Renderizzazione Principale
function render() {
  const monthTrans = transactions.filter(t => t.mese === currentMonth);
  const cassa = calcolaCassaReale(monthTrans);
  const conguaglio = calcolaConguagli(monthTrans);
  const { utileRipartibile, quota } = ripartisciUtile(cassa, conguaglio);

  // Update DOM
  document.getElementById("kpiCassa").textContent = fmt(cassa);
  document.getElementById("kpiConguaglio").textContent = fmt(conguaglio);
  document.getElementById("kpiUtile").textContent = fmt(utileRipartibile);

  renderTable(monthTrans);
  renderMobileList(monthTrans);
  renderRollover(conguaglio, cassa, utileRipartibile);
  checkAlerts(cassa);
}

// Vista Desktop
function renderTable(list) {
  const tbody = document.querySelector("#transTable tbody");
  if(!tbody) return;
  tbody.innerHTML = list.map(t => `
    <tr style="color:${t.tipo==='entrata'?'green':'red'}">
      <td>${t.tipo.toUpperCase()}</td><td>${t.cat}</td><td>${t.membro}</td>
      <td>€${t.importo}</td>
      <td><span class="badge ${t.confermato?'real':'atteso'}">${t.confermato?'Reale':'Atteso'}</span></td>
      <td>
        <button class="btn-sm" onclick="toggle('${t.id}')">${t.confermato?'Annulla':'Conferma'}</button>
        <button class="btn-sm" style="color:red" onclick="del('${t.id}')">🗑</button>
      </td>
    </tr>
  `).join("");
}

// Vista Mobile (Card)
function renderMobileList(list) {
  const container = document.getElementById("mobile-container");
  if(!container) return;
  container.innerHTML = list.map(t => `
    <div class="m-card ${t.tipo}">
      <div class="m-info">
        <h4>${t.cat} <small>(${t.membro})</small></h4>
        <p>${t.confermato ? '✅ Reale' : '⏳ Atteso'} ${t.ricorrente ? '🔄' : ''}</p>
        <div class="m-actions">
          <button class="m-btn conf" onclick="toggle('${t.id}')">${t.confermato ? 'Annulla' : 'Conferma'}</button>
          <button class="m-btn del" onclick="del('${t.id}')">Elimina</button>
        </div>
      </div>
      <div class="m-amount" style="color:${t.tipo==='entrata'?'var(--success)':'var(--danger)'}">
        ${t.tipo==='entrata'?'+':'-'}€${t.importo}
      </div>
    </div>
  `).join("");
}

// Alert Cassa
function checkAlerts(cassa) {
  const box = document.getElementById("alert-box");
  if (cassa < 0) {
    box.style.display = "block";
    box.textContent = `⚠️ ATTENZIONE: Cassa negativa di €${Math.abs(cassa).toFixed(2)}`;
  } else {
    box.style.display = "none";
  }
}

// Funzioni Globali
window.toggle = async (id) => {
  const t = transactions.find(x => x.id === id);
  if (t) {
    t.confermato = !t.confermato; t.reale = t.confermato;
    await updateTransaction(id, { confermato: t.confermato, reale: t.reale });
    render();
  }
};

window.del = async (id) => {
  if(confirm("Eliminare?")) {
    transactions = transactions.filter(x => x.id !== id);
    await deleteTransaction(id);
    render();
  }
};

// Utility
function populateCategories() {
  const sel = document.getElementById("fCat");
  const tipo = document.getElementById("fTipo").value;
  sel.innerHTML = '<option value="">Categoria...</option>';
  const cats = tipo === "entrata" 
    ? [...CATEGORIES.entrata.ricorrenti, ...CATEGORIES.entrata.una_tantum]
    : [...CATEGORIES.uscita.ricorrenti, ...CATEGORIES.uscita.una_tantum];
  cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
}

function updateMonthLabel() { document.getElementById("currentMonth").textContent = currentMonth; }
function fmt(n) { return `€${n.toFixed(2)}`; }
function renderRollover(conguaglio, cassa, utile) {
  document.getElementById("rolloverList").innerHTML = `
    <li>💰 Cassa: ${fmt(cassa)}</li>
    <li>⚖️ Conguaglio: ${fmt(conguaglio)}</li>
    <li>📉 Utile: ${fmt(utile)}</li>
  `;
}
