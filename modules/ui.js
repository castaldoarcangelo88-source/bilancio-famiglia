import { MEMBERS, CATEGORIES, createTransaction, QUOTA_BASELINA } from "./data-model.js";
import { calcolaCassaReale, calcolaConguagli, ripartisciUtile } from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";

// ✅ Variabile locale per il mese corrente (NON window)
let currentMonth = new Date().toISOString().slice(0, 7);
let transactions = [];
let eventsInitialized = false;

// Inizializzazione
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏠 App avviata - Mese corrente:", currentMonth);
  
  populateCategories();
  updateMonthLabel();
  
  showLoading(true);
  try {
    transactions = await loadTransactions();
    console.log("✅ Movimenti caricati:", transactions.length);
  } catch (err) {
    console.error("❌ Errore caricamento:", err);
  }
  showLoading(false);
  
  render();
  
  if (!eventsInitialized) {
    setupEvents();
    eventsInitialized = true;
  }
});

function populateCategories() {
  const tipoSelect = document.getElementById("fTipo");
  const catSelect = document.getElementById("fCat");
  
  if (!tipoSelect || !catSelect) {
    console.error("❌ Elementi form non trovati");
    return;
  }
  
  const tipo = tipoSelect.value;
  catSelect.innerHTML = '<option value="">Seleziona categoria</option>';
  
  const categorie = tipo === "entrata" 
    ? [...CATEGORIES.entrata.ricorrenti, ...CATEGORIES.entrata.una_tantum]
    : [...CATEGORIES.uscita.ricorrenti, ...CATEGORIES.uscita.una_tantum];
  
  categorie.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    catSelect.appendChild(option);
  });
}

function updateMonthLabel() {
  const el = document.getElementById("currentMonth");
  if (el) {
    el.textContent = currentMonth;
    console.log("📅 Etichetta mese aggiornata a:", currentMonth);
  }
}

function showLoading(state) {
  document.body.style.opacity = state ? "0.5" : "1";
  document.body.style.pointerEvents = state ? "none" : "auto";
}

function setupEvents() {
  console.log("🔧 Setup eventi...");
  
  const tipoSelect = document.getElementById("fTipo");
  if (tipoSelect) {
    tipoSelect.addEventListener("change", populateCategories);
  }
  
  const form = document.getElementById("transForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const tipo = document.getElementById("fTipo").value;
      const cat = document.getElementById("fCat").value;
      const membro = document.getElementById("fMembro").value;
      const importo = parseFloat(document.getElementById("fImporto").value);
      const ricorrente = document.getElementById("fRicorrente").checked;
      const reale = document.getElementById("fReale").checked;
      
      if (!cat) {
        alert("Seleziona una categoria!");
        return;
      }
      
      const t = createTransaction(currentMonth, tipo, cat, membro, importo, ricorrente, reale);
      
      try {
        const saved = await saveTransaction(t);
        if (saved) {
          transactions.push(saved);
          render();
          form.reset();
          populateCategories();
          alert("✅ Movimento aggiunto!");
        }
      } catch (err) {
        console.error("❌ Errore salvataggio:", err);
        alert("Errore nel salvataggio: " + err.message);
      }
    });
  }
  
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  
  if (prevBtn) {
    prevBtn.onclick = function() {
      console.log("◀️ Click mese precedente");
      shiftMonth(-1);
    };
  }
  
  if (nextBtn) {
    nextBtn.onclick = function() {
      console.log("▶️ Click mese successivo");
      shiftMonth(1);
    };
  }
  
  const exportBtn = document.getElementById("btnExport");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportCSV(transactions);
    });
  }
  
  console.log("✅ Eventi configurati");
}

function shiftMonth(delta) {
  console.log("📅 shiftMonth chiamata con delta:", delta);
  console.log("📅 Mese attuale PRIMA:", currentMonth);
  
  // Split anno e mese
  const parts = currentMonth.split("-");
  console.log("📅 Parts:", parts);
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  
  console.log("📅 Year:", year, "Month:", month);
  
  let newMonth = month + delta;
  let newYear = year;
  
  console.log("📅 NewMonth prima normalizzazione:", newMonth);
  
  // Gestione overflow/underflow mesi
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }
  
  console.log("📅 NewMonth dopo normalizzazione:", newMonth, "NewYear:", newYear);
  
  // Formatta nuovo mese (YYYY-MM)
  const monthStr = String(newMonth).padStart(2, '0');
  currentMonth = `${newYear}-${monthStr}`;
  
  console.log("✅ Mese aggiornato a:", currentMonth);
  
  updateMonthLabel();
  render();
}

function render() {
  console.log(" Render per mese:", currentMonth);
  
  const monthTrans = transactions.filter(t => t.mese === currentMonth);
  
  const cassa = calcolaCassaReale(monthTrans);
  const conguaglio = calcolaConguagli(monthTrans);
  const { utileRipartibile, quota } = ripartisciUtile(cassa, conguaglio);

  const kpiCassa = document.getElementById("kpiCassa");
  const kpiConguaglio = document.getElementById("kpiConguaglio");
  const kpiUtile = document.getElementById("kpiUtile");
  const kpiQuota = document.getElementById("kpiQuota");
  
  if (kpiCassa) kpiCassa.textContent = `€ ${cassa.toFixed(2)}`;
  if (kpiConguaglio) kpiConguaglio.textContent = `€ ${conguaglio.toFixed(2)}`;
  if (kpiUtile) kpiUtile.textContent = `€ ${utileRipartibile.toFixed(2)}`;
  if (kpiQuota) kpiQuota.textContent = `€ ${quota.toFixed(2)}`;

  renderTable(monthTrans);
  renderRollover(conguaglio, cassa, utileRipartibile);
}

function renderTable(list) {
  const tbody = document.querySelector("#transTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Nessun movimento per questo mese</td></tr>';
    return;
  }
  
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.mese}</td>
      <td style="color:${t.tipo === 'entrata' ? 'green' : 'red'};font-weight:bold">${t.tipo.toUpperCase()}</td>
      <td>${t.cat}</td>
      <td>${t.membro}</td>
      <td>€ ${t.importo.toFixed(2)}</td>
      <td><span class="badge ${t.confermato ? 'real' : 'atteso'}">${t.confermato ? 'Reale' : 'Atteso'}</span>${t.ricorrente ? ' 🔄' : ''}</td>
      <td>
        <button class="btn-sm" onclick="window.toggleConf('${t.id}')">${t.confermato ? 'Annulla' : 'Conferma'}</button>
        <button class="btn-sm" style="color:red" onclick="window.deleteTrans('${t.id}')">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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

function renderRollover(conguaglio, cassa, utile) {
  const ul = document.getElementById("rolloverList");
  if (!ul) return;
  
  ul.innerHTML = `
    <li>🔹 Cassa reale: € ${cassa.toFixed(2)}</li>
    <li>🔹 Conguaglio (soglia €${QUOTA_BASELINA}): € ${conguaglio.toFixed(2)}</li>
    <li>🔹 Utile ripartibile: € ${utile.toFixed(2)}</li>
    <li>🔹 Quota per socio: € ${(utile / 2).toFixed(2)}</li>
    ${cassa < 0 ? '<li style="color:red;font-weight:bold">⚠️ Cassa negativa!</li>' : ''}
  `;
}
