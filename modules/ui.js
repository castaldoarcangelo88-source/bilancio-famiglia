import { MEMBERS, createTransaction, QUOTA_BASELINA, SOGLIA_ALLARME_CASSA } from "./data-model.js";
import { calcolaCassaReale, calcolaConguagli, ripartisciUtile } from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";
import { loadCategoriesFromDB, addCategoryToDB, deleteCategoryFromDB, sendTelegramMessage, renderChart } from "./db-manager.js";

// ✅ Stato globale
const state = {
  currentMonth: new Date().toISOString().slice(0, 7),
  transactions: [],
  categories: []
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 App avviata - Mese:", state.currentMonth);
  
  try {
    state.categories = await loadCategoriesFromDB();
    renderCategorySelect();
    renderCategoryList();
    
    state.transactions = await loadTransactions();
    console.log("✅ Movimenti caricati:", state.transactions.length);
    
    updateMonthLabel();
    render();
    renderCharts();
    setupEvents();
  } catch (err) {
    console.error("❌ Errore avvio:", err);
    alert("Errore caricamento dati. Ricarica la pagina.");
  }
});

// --- NAVIGAZIONE MESI ---
function shiftMonth(delta) {
  let [y, m] = state.currentMonth.split('-').map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  state.currentMonth = `${y}-${String(m).padStart(2, '0')}`;
  
  updateMonthLabel();
  render();
  renderCharts();
}

function updateMonthLabel() {
  const el = document.getElementById("currentMonth");
  if (el) el.textContent = state.currentMonth;
}

// --- RENDER ---
function render() {
  const monthData = state.transactions.filter(t => t.mese === state.currentMonth);
  const cassa = calcolaCassaReale(monthData);
  const conguaglio = calcolaConguagli(monthData);
  const { utileRipartibile } = ripartisciUtile(cassa, conguaglio);

  document.getElementById("kpiCassa").textContent = fmt(cassa);
  document.getElementById("kpiConguaglio").textContent = fmt(conguaglio);
  document.getElementById("kpiUtile").textContent = fmt(utileRipartibile);

  const box = document.getElementById("alert-box");
  if (box) {
    if (cassa < SOGLIA_ALLARME_CASSA) {
      box.style.display = "block";
      box.innerHTML = `⚠️ <b>ATTENZIONE:</b> Cassa €${cassa.toFixed(2)} < Soglia €${SOGLIA_ALLARME_CASSA}`;
    } else {
      box.style.display = "none";
    }
  }

  renderTable(monthData);
  renderMobileList(monthData);
  renderRollover(conguaglio, cassa, utileRipartibile);
}

function renderCharts() {
  const monthData = state.transactions.filter(t => t.mese === state.currentMonth);
  const cats = [...new Set(monthData.map(t => t.cat))];
  
  const inArr = cats.map(c => monthData.filter(t => t.cat === c && t.tipo === 'entrata').reduce((s,t)=>s+t.importo,0));
  const outArr = cats.map(c => monthData.filter(t => t.cat === c && t.tipo === 'uscita').reduce((s,t)=>s+t.importo,0));
  
  renderChart('monthlyChart', cats, inArr, outArr);
  renderChart('weeklyChart', ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0]);
}

// --- UI HELPERS ---
function renderCategorySelect() {
  const sel = document.getElementById("fCat");
  if (!sel) return;
  const type = document.getElementById("fTipo").value;
  sel.innerHTML = '<option value="">Categoria...</option>';
  state.categories.filter(c => c.type === type).forEach(c => {
    sel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
}

function renderCategoryList() {
  const list = document.getElementById("categoriesList");
  if (!list) return;
  list.innerHTML = state.categories.map(c => `
    <div class="cat-item">
      <span>${c.name} <small>(${c.type})</small></span>
      <button class="btn-del" onclick="window.deleteCat('${c.id}')">🗑</button>
    </div>
  `).join('');
}

function renderTable(list) {
  const tb = document.querySelector("#transTable tbody");
  if (!tb) return;
  tb.innerHTML = list.length === 0 
    ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">Nessun movimento</td></tr>'
    : list.map(t => `
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
  c.innerHTML = list.length === 0
    ? '<p style="text-align:center;color:#999;padding:20px">Nessun movimento</p>'
    : list.map(t => `
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

function renderRollover(cong, cassa, utile) {
  const ul = document.getElementById("rolloverList");
  if (!ul) return;
  ul.innerHTML = `
    <li>💰 Cassa: ${fmt(cassa)}</li>
    <li>⚖️ Conguaglio: ${fmt(cong)}</li>
    <li>📉 Utile: ${fmt(utile)}</li>
  `;
}

// --- EVENTI ---
function setupEvents() {
  const tipoSel = document.getElementById("fTipo");
  if (tipoSel) tipoSel.addEventListener("change", renderCategorySelect);
  
  const btnAdd = document.getElementById("btnAggiungi");
  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const tipo = document.getElementById("fTipo").value;
      const cat = document.getElementById("fCat").value;
      const membro = document.getElementById("fMembro").value;
      const importo = parseFloat(document.getElementById("fImporto").value);
      const reale = document.getElementById("fReale").checked;
      
      if (!cat || isNaN(importo)) return alert("⚠️ Compila categoria e importo!");
      
      const t = createTransaction(state.currentMonth, tipo, cat, membro, importo, false, reale);
      try {
        const saved = await saveTransaction(t);
        if (saved) {
          state.transactions.unshift(saved); // Aggiungi in cima
          render();
          renderCharts();
          document.getElementById("fImporto").value = "";
        }
      } catch (err) {
        alert("Errore salvataggio: " + err.message);
      }
    });
  }

  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  if (prevBtn) prevBtn.onclick = () => shiftMonth(-1);
  if (nextBtn) nextBtn.onclick = () => shiftMonth(1);
  
  const btnExp = document.getElementById("btnExport");
  if (btnExp) btnExp.onclick = () => exportCSV(state.transactions);
}

// --- GLOBAL FUNCTIONS ---
window.deleteCat = async (id) => {
  if (confirm("Eliminare categoria?")) {
    await deleteCategoryFromDB(id);
    state.categories = await loadCategoriesFromDB();
    renderCategoryList();
    renderCategorySelect();
  }
};

window.addNewCategory = async () => {
  const name = document.getElementById("newCatName").value;
  const type = document.getElementById("newCatType").value;
  if (!name) return alert("Inserisci un nome!");
  await addCategoryToDB(name, type);
  state.categories = await loadCategoriesFromDB();
  renderCategoryList();
  renderCategorySelect();
  document.getElementById("newCatName").value = "";
};

window.testTelegram = () => {
  const cassa = document.getElementById("kpiCassa").textContent;
  const msg = `📊 <b>Test Bilancio Famiglia</b>\n\n💰 Cassa attuale: ${cassa}\n📅 Mese: ${state.currentMonth}\n\n✅ Tutto OK!`;
  sendTelegramMessage(msg);
};

window.toggle = async (id) => {
  const t = state.transactions.find(x => x.id === id);
  if (t) {
    t.confermato = !t.confermato;
    t.reale = t.confermato;
    await updateTransaction(id, { confermato: t.confermato, reale: t.reale });
    render();
  }
};

window.del = async (id) => {
  if (confirm("Eliminare movimento?")) {
    state.transactions = state.transactions.filter(x => x.id !== id);
    await deleteTransaction(id);
    render();
  }
};

function fmt(n) { return `€${n.toFixed(2)}`; }
