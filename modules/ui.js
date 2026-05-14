import { MEMBERS, CATEGORIES, createTransaction, QUOTA_BASELINA, SOGLIA_ALLARME_CASSA } from "./data-model.js";
import { calcolaCassaReale, calcolaConguagli, ripartisciUtile } from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";

// Stato globale
let currentMonth = new Date().toISOString().slice(0, 7);
let transactions = [];
let eventsInitialized = false;

// Avvio
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏠 App avviata - Mese:", currentMonth);
  
  // ✅ Inizializza categorie PRIMA di tutto
  populateCategories();
  updateMonthLabel();
  
  // Caricamento dati da Supabase
  try {
    transactions = await loadTransactions();
    console.log("✅ Movimenti caricati:", transactions.length);
  } catch (err) {
    console.error("❌ Errore caricamento:", err);
    transactions = [];
  }
  
  // Clona ricorrenze se necessario
  await gestisciRicorrenze();
  
  render();
  
  if (!eventsInitialized) {
    setupEvents();
    eventsInitialized = true;
  }
});

// Logica Ricorrenze
async function gestisciRicorrenze() {
  const [y, m] = currentMonth.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonthStr = prevDate.toISOString().slice(0, 7);
  
  const ricorrenti = transactions.filter(t => t.ricorrente && t.mese === prevMonthStr);
  
  for (const t of ricorrenti) {
    const exists = transactions.some(x => 
      x.mese === currentMonth && 
      x.cat === t.cat && 
      x.membro === t.membro && 
      x.importo === t.importo
    );
    
    if (!exists) {
      const newT = { 
        ...t, 
        id: crypto.randomUUID(), // ✅ Genera UUID valido
        mese: currentMonth, 
        confermato: false,
        reale: false,
        created_at: new Date().toISOString() 
      };
      await saveTransaction(newT);
      transactions.push(newT);
      console.log("🔄 Clonata ricorrenza:", t.cat);
    }
  }
}

// Eventi
function setupEvents() {
  console.log("🔧 Setup eventi...");
  
  // Cambio tipo → aggiorna categorie
  const tipoSelect = document.getElementById("fTipo");
  if (tipoSelect) {
    tipoSelect.addEventListener("change", () => {
      console.log("Tipo cambiato:", tipoSelect.value);
      populateCategories();
    });
  }
  
  // Bottone Aggiungi
  const btnAggiungi = document.getElementById("btnAggiungi");
  if (btnAggiungi) {
    btnAggiungi.addEventListener("click", async () => {
      const tipo = document.getElementById("fTipo").value;
      const cat = document.getElementById("fCat").value;
      const membro = document.getElementById("fMembro").value;
      const importo = parseFloat(document.getElementById("fImporto").value);
      const ricorrente = document.getElementById("fRicorrente").checked;
      const reale = document.getElementById("fReale").checked;
      
      if (!cat || isNaN(importo)) { 
        alert("⚠️ Seleziona categoria e inserisci importo!"); 
        return; 
      }
      
      const t = createTransaction(currentMonth, tipo, cat, membro, importo, ricorrente, reale);
      
      try {
        const saved = await saveTransaction(t);
        if (saved) {
          transactions.push(saved);
          render();
          document.getElementById("fImporto").value = "";
          alert("✅ Movimento aggiunto!");
        }
      } catch (err) {
        console.error("❌ Errore:", err);
        alert("Errore salvataggio: " + err.message);
      }
    });
  }
  
  // Navigazione mesi - ✅ FIX: usa onclick diretto
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  
  if (prevBtn) {
    prevBtn.onclick = async () => {
      console.log("◀️ Mese precedente");
      await shiftMonth(-1);
      await gestisciRicorrenze();
    };
  }
  
  if (nextBtn) {
    nextBtn.onclick = async () => {
      console.log("▶️ Mese successivo");
      await shiftMonth(1);
      await gestisciRicorrenze();
    };
  }
  
  // Export
  const btnExport = document.getElementById("btnExport");
  if (btnExport) {
    btnExport.onclick = () => exportCSV(transactions);
  }
  
  console.log("✅ Eventi configurati");
}

// Cambio mese
async function shiftMonth(delta) {
  console.log("📅 Shift da", currentMonth, "delta:", delta);
  
  const [year, month] = currentMonth.split("-").map(Number);
  const newDate = new Date(year, month - 1 + delta, 1);
  currentMonth = newDate.toISOString().slice(0, 7);
  
  console.log("✅ Nuovo mese:", currentMonth);
  updateMonthLabel();
  render();
}

// Render
function render() {
  const monthTrans = transactions.filter(t => t.mese === currentMonth);
  const cassa = calcolaCassaReale(monthTrans);
  const conguaglio = calcolaConguagli(monthTrans);
  const { utileRipartibile, quota } = ripartisciUtile(cassa, conguaglio);

  // KPI
  const kpiCassa = document.getElementById("kpiCassa");
  const kpiConguaglio = document.getElementById("kpiConguaglio");
  const kpiUtile = document.getElementById("kpiUtile");
  
  if (kpiCassa) kpiCassa.textContent = fmt(cassa);
  if (kpiConguaglio) kpiConguaglio.textContent = fmt(conguaglio);
  if (kpiUtile) kpiUtile.textContent = fmt(utileRipartibile);

  renderTable(monthTrans);
  renderMobileList(monthTrans);
  renderRollover(conguaglio, cassa, utileRipartibile);
  checkAlerts(cassa);
}

// Tabella Desktop
function renderTable(list) {
  const tbody = document.querySelector("#transTable tbody");
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">Nessun movimento</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(t => `
    <tr style="color:${t.tipo==='entrata'?'var(--success)':'var(--danger)'}">
      <td>${t.tipo.toUpperCase()}</td>
      <td>${t.cat}</td>
      <td>${t.membro}</td>
      <td>€${t.importo.toFixed(2)}</td>
      <td><span class="badge ${t.confermato?'real':'atteso'}">${t.confermato?'Reale':'Atteso'}</span></td>
      <td>
        <button class="btn-sm" onclick="window.toggleConf('${t.id}')">${t.confermato?'Annulla':'Conferma'}</button>
        <button class="btn-sm" style="color:red" onclick="window.deleteTrans('${t.id}')">🗑</button>
      </td>
    </tr>
  `).join("");
}

// Lista Mobile
function renderMobileList(list) {
  const container = document.getElementById("mobile-container");
  if (!container) return;
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nessun movimento</p>';
    return;
  }
  
  container.innerHTML = list.map(t => `
    <div class="m-card ${t.tipo}">
      <div class="m-info">
        <h4>${t.cat} <small>(${t.membro})</small></h4>
        <p>${t.confermato ? '✅ Reale' : '⏳ Atteso'} ${t.ricorrente ? '🔄' : ''}</p>
        <div class="m-actions">
          <button class="m-btn conf" onclick="window.toggleConf('${t.id}')">${t.confermato ? 'Annulla' : 'Conferma'}</button>
          <button class="m-btn del" onclick="window.deleteTrans('${t.id}')">Elimina</button>
        </div>
      </div>
      <div class="m-amount" style="color:${t.tipo==='entrata'?'var(--success)':'var(--danger)'}">
        ${t.tipo==='entrata'?'+':'-'}€${t.importo.toFixed(2)}
      </div>
    </div>
  `).join("");
}

// Alert
function checkAlerts(cassa) {
  const box = document.getElementById("alert-box");
  if (!box) return;
  
  if (cassa < SOGLIA_ALLARME_CASSA) {
    box.style.display = "block";
    box.innerHTML = `⚠️ <strong>ATTENZIONE:</strong> Cassa sotto soglia (€${cassa.toFixed(2)} < €${SOGLIA_ALLARME_CASSA})`;
  } else {
    box.style.display = "none";
  }
}

// Funzioni Globali
window.toggleConf = async (id) => {
  const t = transactions.find(x => x.id === id);
  if (t) {
    t.confermato = !t.confermato;
    t.reale = t.confermato;
    await updateTransaction(id, { confermato: t.confermato, reale: t.reale });
    render();
  }
};

window.deleteTrans = async (id) => {
  if (!confirm("Eliminare questo movimento?")) return;
  
  transactions = transactions.filter(x => x.id !== id);
  await deleteTransaction(id);
  render();
};

// Utility
function populateCategories() {
  const sel = document.getElementById("fCat");
  const tipoSelect = document.getElementById("fTipo");
  
  if (!sel || !tipoSelect) {
    console.error("❌ Elementi select non trovati!");
    return;
  }
  
  const tipo = tipoSelect.value;
  console.log("📋 Popolando categorie per:", tipo);
  
  sel.innerHTML = '<option value="">Categoria...</option>';
  
  const cats = tipo === "entrata" 
    ? [...CATEGORIES.entrata.ricorrenti, ...CATEGORIES.entrata.una_tantum]
    : [...CATEGORIES.uscita.ricorrenti, ...CATEGORIES.uscita.una_tantum];
  
  console.log("Categorie trovate:", cats.length);
  
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function updateMonthLabel() {
  const el = document.getElementById("currentMonth");
  if (el) el.textContent = currentMonth;
}

function fmt(n) { 
  return `€${n.toFixed(2)}`; 
}

function renderRollover(conguaglio, cassa, utile) {
  const ul = document.getElementById("rolloverList");
  if (!ul) return;
  
  ul.innerHTML = `
    <li>💰 Cassa: ${fmt(cassa)}</li>
    <li>⚖️ Conguaglio: ${fmt(conguaglio)}</li>
    <li>📉 Utile: ${fmt(utile)}</li>
  `;
}
