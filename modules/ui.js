import { createTransaction, SOGLIA_ALLARME_CASSA } from "./data-model.js";
import {
  calcolaRiepilogo,
  isFun,
  isHouseExpense,
  isPersonalExpense,
  isSaving,
  isSavingsWithdrawal,
  isWorkExpense
} from "./logic.js";
import { loadTransactions, saveTransaction, updateTransaction, deleteTransaction, exportCSV } from "./storage.js";
import { loadCategoriesFromDB, addCategoryToDB, deleteCategoryFromDB, sendTelegramMessage, renderBarChart } from "./db-manager.js";
import { supabase } from "./supabase-client.js";

window.currentMonth = monthKeyFromDate(new Date());
let transactions = [];
let allCategories = [];
let cashChecks = {};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const isTestAdmin = localStorage.getItem("bilancio_test_admin") === "true";
    const { data } = await supabase.auth.getSession();
    if (!data.session && !isTestAdmin) {
      window.location.href = "login.html";
      return;
    }

    setAlert("Caricamento dati...", "info");
    allCategories = await loadCategoriesFromDB();
    transactions = await loadTransactions();
    cashChecks = loadCashChecks();

    updateCategorySelect();
    renderCategoriesList();
    updateMonthLabel();
    syncFilterMonth();
    syncCashInputs();
    setupEvents();
    await ensureRecurringForMonth(window.currentMonth);
    render();
    renderCharts();
    clearAlert();
  } catch (error) {
    console.error(error);
    setAlert("Errore di caricamento. Controlla connessione e permessi Supabase.", "danger");
  }
});

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setAlert(message, type = "danger") {
  const box = document.getElementById("alert-box");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
  box.style.background = type === "info" ? "var(--primary)" : "var(--danger)";
}

function clearAlert() {
  const box = document.getElementById("alert-box");
  if (box) box.style.display = "none";
}

function monthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function categoryClass(t) {
  if (isHouseExpense(t)) return "Casa";
  if (isWorkExpense(t)) return "Lavoro";
  if (isSaving(t)) return "Salvadanaio";
  if (isSavingsWithdrawal(t)) return "Prelievo salvadanaio";
  if (isFun(t)) return "Sfizi";
  if (isPersonalExpense(t)) return "Personale";
  return "Entrata";
}

function loadCashChecks() {
  try {
    return JSON.parse(localStorage.getItem("bilancio_cash_checks") || "{}");
  } catch {
    return {};
  }
}

function saveCashChecks() {
  localStorage.setItem("bilancio_cash_checks", JSON.stringify(cashChecks));
}

function normalizeMoneyInput(value) {
  const raw = String(value ?? "").trim();
  const text = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!text) return "";
  const number = Number(text);
  return Number.isFinite(number) ? String(number) : "";
}

function currentCashCheck() {
  return cashChecks[window.currentMonth] || { iniziale: "", contata: "" };
}

function syncCashInputs() {
  const check = currentCashCheck();
  const start = document.getElementById("cashStart");
  const counted = document.getElementById("cashCounted");
  if (start) start.value = check.iniziale ?? "";
  if (counted) counted.value = check.contata ?? "";
}

function updateCategorySelect() {
  const sel = document.getElementById("fCat");
  const tipo = document.getElementById("fTipo").value;
  const filtered = allCategories.filter(c => c.type === tipo);

  if (!filtered.length) {
    sel.innerHTML = '<option value="">Nessuna categoria</option>';
    return;
  }

  sel.innerHTML = '<option value="">Categoria...</option>';
  filtered.forEach(c => {
    const option = document.createElement("option");
    option.value = c.name;
    option.textContent = c.name;
    sel.appendChild(option);
  });
}

function renderCategoriesList() {
  const list = document.getElementById("categoriesList");
  if (!list) return;

  if (!allCategories.length) {
    list.textContent = "Nessuna categoria configurata.";
    return;
  }

  list.innerHTML = allCategories.map(c => `
    <div class="cat-item">
      <span>${escapeHTML(c.name)} (${c.type === "entrata" ? "entrata" : "uscita"})</span>
      <button onclick="window.deleteCat('${escapeHTML(c.id)}')">Elimina</button>
    </div>
  `).join("");
}

window.addNewCategory = async function() {
  const nameEl = document.getElementById("newCatName");
  const name = nameEl.value.trim();
  const type = document.getElementById("newCatType").value;

  if (!name) {
    alert("Inserisci un nome categoria.");
    return;
  }

  try {
    await addCategoryToDB(name, type);
    allCategories = await loadCategoriesFromDB();
    renderCategoriesList();
    updateCategorySelect();
    nameEl.value = "";
  } catch (error) {
    console.error(error);
    alert("Categoria non salvata. Controlla i permessi Supabase.");
  }
};

window.deleteCat = async function(id) {
  if (!confirm("Eliminare questa categoria?")) return;

  try {
    await deleteCategoryFromDB(id);
    allCategories = await loadCategoriesFromDB();
    renderCategoriesList();
    updateCategorySelect();
  } catch (error) {
    console.error(error);
    alert("Categoria non eliminata. Controlla i permessi Supabase.");
  }
};

window.testTelegram = function() {
  sendTelegramMessage();
};

function renderCharts() {
  const monthTrans = transactions.filter(t => t.mese === window.currentMonth);
  const cats = [...new Set(monthTrans.map(t => t.cat))];

  const entrate = cats.map(c => monthTrans
    .filter(t => t.cat === c && t.tipo === "entrata")
    .reduce((sum, t) => sum + Number(t.importo), 0));
  const uscite = cats.map(c => monthTrans
    .filter(t => t.cat === c && t.tipo === "uscita")
    .reduce((sum, t) => sum + Number(t.importo), 0));

  renderBarChart("monthlyChart", cats.length ? cats : ["Nessun dato"], cats.length ? entrate : [0], cats.length ? uscite : [0]);

  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const weeklyEntrate = Array(7).fill(0);
  const weeklyUscite = Array(7).fill(0);

  monthTrans.forEach(t => {
    const date = new Date(t.created_at);
    if (Number.isNaN(date.getTime())) return;
    const index = date.getDay() === 0 ? 6 : date.getDay() - 1;
    if (t.tipo === "entrata") weeklyEntrate[index] += Number(t.importo);
    if (t.tipo === "uscita") weeklyUscite[index] += Number(t.importo);
  });

  renderBarChart("weeklyChart", days, weeklyEntrate, weeklyUscite);
}

window.updateMonthlyChart = async function() {
  const selectedMonth = document.getElementById("filterMonth").value;
  if (selectedMonth) {
    window.currentMonth = selectedMonth;
    updateMonthLabel();
    syncCashInputs();
    await ensureRecurringForMonth(window.currentMonth);
    render();
  }
  renderCharts();
};

async function shiftMonth(delta) {
  const [y, m] = window.currentMonth.split("-").map(Number);
  const newDate = new Date(y, m - 1 + delta, 1);
  window.currentMonth = monthKeyFromDate(newDate);

  updateMonthLabel();
  syncFilterMonth();
  syncCashInputs();
  await ensureRecurringForMonth(window.currentMonth);
  render();
  renderCharts();
}

function updateMonthLabel() {
  const el = document.getElementById("currentMonth");
  if (el) el.textContent = window.currentMonth;
}

function syncFilterMonth() {
  const el = document.getElementById("filterMonth");
  if (el) el.value = window.currentMonth;
}

function setupEvents() {
  if (setupEvents.done) return;
  setupEvents.done = true;

  document.getElementById("fTipo").addEventListener("change", updateCategorySelect);
  document.getElementById("cashStart").addEventListener("input", updateCashPreview);
  document.getElementById("cashCounted").addEventListener("input", updateCashPreview);
  document.getElementById("btnSaveCash").addEventListener("click", saveCashControl);

  function updateCashPreview() {
    cashChecks[window.currentMonth] = {
      iniziale: normalizeMoneyInput(document.getElementById("cashStart").value),
      contata: normalizeMoneyInput(document.getElementById("cashCounted").value)
    };
    render();
  }

  function saveCashControl() {
    cashChecks[window.currentMonth] = {
      iniziale: normalizeMoneyInput(document.getElementById("cashStart").value),
      contata: normalizeMoneyInput(document.getElementById("cashCounted").value)
    };
    saveCashChecks();
    syncCashInputs();
    render();
    const status = document.getElementById("cashStatus");
    status.textContent = "Controllo aggiornato";
    setTimeout(() => {
      if (status.textContent === "Controllo aggiornato") status.textContent = "";
    }, 2500);
  }

  document.getElementById("btnAggiungi").addEventListener("click", async () => {
    const tipo = document.getElementById("fTipo").value;
    const cat = document.getElementById("fCat").value;
    const membro = document.getElementById("fMembro").value;
    const importo = parseFloat(document.getElementById("fImporto").value);
    const ricorrente = document.getElementById("fRicorrente").checked;
    const reale = document.getElementById("fReale").checked;

    if (!cat) {
      alert("Seleziona una categoria.");
      return;
    }

    if (!Number.isFinite(importo) || importo <= 0) {
      alert("Inserisci un importo maggiore di zero.");
      return;
    }

    try {
      const t = createTransaction(window.currentMonth, tipo, cat, membro, importo, ricorrente, reale);
      const saved = await saveTransaction(t);

      if (saved) {
        transactions.unshift(saved);
        render();
        renderCharts();
        document.getElementById("fImporto").value = "";
      }
    } catch (error) {
      console.error(error);
      alert("Movimento non salvato. Controlla connessione e permessi Supabase.");
    }
  });

  document.getElementById("prevMonth").onclick = () => shiftMonth(-1);
  document.getElementById("nextMonth").onclick = () => shiftMonth(1);
  document.getElementById("btnCopiaRicorrenti").onclick = () => copyRecurringFromPreviousMonth(window.currentMonth, true);
  document.getElementById("btnImport").onclick = importCSV;
  document.getElementById("btnExport").onclick = () => exportCSV(transactions);
}

async function ensureRecurringForMonth(month) {
  const monthTrans = transactions.filter(t => t.mese === month);
  if (monthTrans.length) return;
  await copyRecurringFromPreviousMonth(month, false);
}

async function copyRecurringFromPreviousMonth(targetMonth, showMessage) {
  const [year, month] = targetMonth.split("-").map(Number);
  const previousMonth = monthKeyFromDate(new Date(year, month - 2, 1));
  const recurring = transactions.filter(t => t.mese === previousMonth && t.ricorrente);

  if (!recurring.length) {
    if (showMessage) alert("Nessuna voce ricorrente trovata nel mese precedente.");
    return;
  }

  const existingKeys = new Set(transactions
    .filter(t => t.mese === targetMonth)
    .map(t => `${t.tipo}|${t.cat}|${t.membro}|${Number(t.importo)}`));

  const toCopy = recurring.filter(t => !existingKeys.has(`${t.tipo}|${t.cat}|${t.membro}|${Number(t.importo)}`));
  if (!toCopy.length) {
    if (showMessage) alert("Le voci ricorrenti sono gia presenti in questo mese.");
    return;
  }

  try {
    for (const item of toCopy) {
      const copied = createTransaction(targetMonth, item.tipo, item.cat, item.membro, item.importo, true, false);
      const saved = await saveTransaction(copied);
      if (saved) transactions.unshift(saved);
    }

    render();
    renderCharts();
    if (showMessage) alert(`Copiate ${toCopy.length} voci ricorrenti come attese.`);
  } catch (error) {
    console.error(error);
    alert("Ricorrenti non copiati. Controlla permessi o connessione.");
  }
}

function render() {
  const monthTrans = transactions.filter(t => t.mese === window.currentMonth);
  const riepilogo = calcolaRiepilogo(monthTrans, currentCashCheck());

  document.getElementById("kpiCassa").textContent = fmt(riepilogo.cassaCalcolata);
  document.getElementById("kpiDifferenza").textContent = riepilogo.differenzaCassa == null ? "--" : fmt(riepilogo.differenzaCassa);
  document.getElementById("kpiCasa").textContent = fmt(riepilogo.speseCasa);
  document.getElementById("kpiPersonali").textContent = fmt(riepilogo.spesePersonali + riepilogo.speseLavoro);
  document.getElementById("kpiSalvadanaio").textContent = fmt(riepilogo.saldoSalvadanaio);
  document.getElementById("kpiSfizi").textContent = fmt(riepilogo.sfizi);

  if (riepilogo.cassaCalcolata < SOGLIA_ALLARME_CASSA) {
    setAlert(`Attenzione: cassa familiare sotto soglia (${fmt(riepilogo.cassaCalcolata)} < ${fmt(SOGLIA_ALLARME_CASSA)})`);
  } else {
    clearAlert();
  }

  renderTable(monthTrans);
  renderMobileList(monthTrans);
  renderCalculation(riepilogo);
  renderReconciliation(riepilogo);
  renderRollover(riepilogo);
}

function renderTable(list) {
  const tbody = document.querySelector("#transTable tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8">Nessun movimento per questo mese.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(t => `
    <tr style="color:${t.tipo === "entrata" ? "var(--success)" : "var(--danger)"}">
      <td>${escapeHTML(t.tipo.toUpperCase())}</td>
      <td>${escapeHTML(t.cat)}</td>
      <td>${escapeHTML(categoryClass(t))}</td>
      <td>${escapeHTML(t.membro)}</td>
      <td>${fmt(t.importo)}</td>
      <td>${t.ricorrente ? "Si" : "No"}</td>
      <td><span class="badge ${t.confermato ? "real" : "atteso"}">${t.confermato ? "Reale" : "Atteso"}</span></td>
      <td>
        <button class="btn-sm" onclick="window.toggle('${escapeHTML(t.id)}')">${t.confermato ? "Annulla" : "Conferma"}</button>
        <button class="btn-sm" style="color:red" onclick="window.del('${escapeHTML(t.id)}')">Elimina</button>
      </td>
    </tr>`).join("");
}

function renderMobileList(list) {
  const c = document.getElementById("mobile-container");
  if (!c) return;

  if (!list.length) {
    c.innerHTML = '<div class="m-card"><div class="m-info"><h4>Nessun movimento</h4><p>Questo mese e vuoto.</p></div></div>';
    return;
  }

  c.innerHTML = list.map(t => `
    <div class="m-card ${escapeHTML(t.tipo)}">
      <div class="m-info">
        <h4>${escapeHTML(t.cat)} <small>(${escapeHTML(t.membro)})</small></h4>
        <p>${categoryClass(t)} - ${t.ricorrente ? "Ricorrente" : "Una tantum"} - ${t.confermato ? "Reale" : "Atteso"}</p>
        <div class="m-actions">
          <button class="m-btn conf" onclick="window.toggle('${escapeHTML(t.id)}')">${t.confermato ? "Annulla" : "Conferma"}</button>
          <button class="m-btn del" onclick="window.del('${escapeHTML(t.id)}')">Elimina</button>
        </div>
      </div>
      <div class="m-amount" style="color:${t.tipo === "entrata" ? "var(--success)" : "var(--danger)"}">${t.tipo === "entrata" ? "+" : "-"}${fmt(t.importo)}</div>
    </div>`).join("");
}

window.toggle = async (id) => {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  try {
    t.confermato = !t.confermato;
    t.reale = t.confermato;
    await updateTransaction(id, { confermato: t.confermato, reale: t.reale });
    render();
    renderCharts();
  } catch (error) {
    console.error(error);
    alert("Movimento non aggiornato.");
  }
};

window.del = async (id) => {
  if (!confirm("Eliminare questo movimento?")) return;

  try {
    await deleteTransaction(id);
    transactions = transactions.filter(x => x.id !== id);
    render();
    renderCharts();
  } catch (error) {
    console.error(error);
    alert("Movimento non eliminato.");
  }
};

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map(value => value.trim());
}

function toBool(value) {
  return ["true", "1", "si", "sì", "yes"].includes(String(value).trim().toLowerCase());
}

async function importCSV() {
  const input = document.getElementById("csvImport");
  const file = input.files?.[0];

  if (!file) {
    alert("Seleziona un file CSV.");
    return;
  }

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      alert("CSV vuoto o senza righe dati.");
      return;
    }

    const headers = parseCSVLine(lines[0]);
    const imported = [];

    for (const line of lines.slice(1)) {
      const values = parseCSVLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const importo = parseFloat(String(row.importo).replace(",", "."));

      if (!row.mese || !row.tipo || !row.cat || !row.membro || !Number.isFinite(importo) || importo <= 0) {
        continue;
      }

      const transaction = createTransaction(
        row.mese,
        row.tipo,
        row.cat,
        row.membro,
        importo,
        toBool(row.ricorrente),
        toBool(row.reale) || toBool(row.confermato)
      );

      const saved = await saveTransaction(transaction);
      if (saved) imported.push(saved);
    }

    if (!imported.length) {
      alert("Nessun movimento valido importato.");
      return;
    }

    transactions = [...imported, ...transactions];
    input.value = "";
    render();
    renderCharts();
    alert(`Importati ${imported.length} movimenti.`);
  } catch (error) {
    console.error(error);
    alert("Import CSV non riuscito. Controlla formato e colonne.");
  }
}

function fmt(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function renderCalculation(riepilogo) {
  const list = document.getElementById("calculationList");
  if (!list) return;

  list.innerHTML = `
    <li><span>Cassa iniziale</span><strong>${fmt(riepilogo.cassaIniziale)}</strong></li>
    <li><span>Entrate familiari</span><strong>${fmt(riepilogo.entrateFamiglia)}</strong></li>
    <li><span>Spese casa</span><strong>${fmt(riepilogo.speseCasa)}</strong></li>
    <li><span>Spese personali</span><strong>${fmt(riepilogo.spesePersonali)}</strong></li>
    <li><span>Spese lavoro</span><strong>${fmt(riepilogo.speseLavoro)}</strong></li>
    <li><span>Salvadanaio versato</span><strong>${fmt(riepilogo.salvadanaioVersato)}</strong></li>
    <li><span>Salvadanaio prelevato</span><strong>${fmt(riepilogo.salvadanaioPrelevato)}</strong></li>
    <li><span>Saldo salvadanaio</span><strong>${fmt(riepilogo.saldoSalvadanaio)}</strong></li>
    <li><span>Sfizi usati</span><strong>${fmt(riepilogo.sfizi)}</strong></li>
    <li><span>Uscite familiari totali</span><strong>${fmt(riepilogo.usciteFamiglia)}</strong></li>
    <li><span>Cassa calcolata</span><strong>${fmt(riepilogo.cassaCalcolata)}</strong></li>
    <li><span>Cassa prevista</span><strong>${fmt(riepilogo.cassaPrevista)}</strong></li>
  `;
}

function renderReconciliation(riepilogo) {
  const list = document.getElementById("reconcileList");
  if (!list) return;

  const diff = riepilogo.differenzaCassa;
  const diffText = diff == null ? "Inserisci la cassa contata" : fmt(diff);
  const diffClass = diff == null || Math.abs(diff) < 0.01 ? "positive" : "negative";

  list.innerHTML = `
    <div class="settlement-row">
      <div><strong>Cassa calcolata</strong><small>Cassa iniziale + entrate - uscite</small></div>
      <div>${fmt(riepilogo.cassaCalcolata)}</div>
    </div>
    <div class="settlement-row">
      <div><strong>Cassa contata</strong><small>Soldi realmente trovati</small></div>
      <div>${riepilogo.cassaContata == null ? "--" : fmt(riepilogo.cassaContata)}</div>
    </div>
    <div class="settlement-row">
      <div><strong>Differenza</strong><small>Se non e zero, manca una transazione o un importo e sbagliato</small></div>
      <div class="${diffClass}">${diffText}</div>
    </div>
    <div class="settlement-row">
      <div><strong>Movimenti attesi</strong><small>Entrate o uscite inserite ma non confermate</small></div>
      <div>${fmt(riepilogo.movimentiAttesi)}</div>
    </div>
    <div class="settlement-row">
      <div><strong>Chi ha registrato</strong><small>Tracciamento operativo, non casse separate</small></div>
      <div>${Object.entries(riepilogo.perPersona).map(([nome, v]) => `${escapeHTML(nome)}: +${fmt(v.entrate)} / -${fmt(v.uscite)}`).join("<br>") || "--"}</div>
    </div>
  `;
}

function renderRollover(riepilogo) {
  document.getElementById("rolloverList").innerHTML = `
    <li>Cassa calcolata: ${fmt(riepilogo.cassaCalcolata)}</li>
    <li>Differenza da cassa contata: ${riepilogo.differenzaCassa == null ? "--" : fmt(riepilogo.differenzaCassa)}</li>
    <li>Saldo salvadanaio: ${fmt(riepilogo.saldoSalvadanaio)}</li>
    <li>Movimenti attesi: ${fmt(riepilogo.movimentiAttesi)}</li>
  `;
}
