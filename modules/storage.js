const LOCAL_TX_KEY = "bilancio_transactions_test";
const LOCAL_TX_VERSION_KEY = "bilancio_transactions_test_version";
const LOCAL_TX_VERSION = "4";
const LOCAL_CASH_KEY = "bilancio_cash_checks";

function isLocalTest() {
  return localStorage.getItem("bilancio_test_admin") === "true";
}

function localSeed() {
  return [
    tx("2026-05", "entrata", "Stipendio", "Arcangelo", 2500, true, true),
    tx("2026-05", "entrata", "Stipendio", "Anna", 1800, true, true),
    tx("2026-05", "uscita", "Mutuo/Affitto", "Arcangelo", 950, true, true),
    tx("2026-05", "uscita", "Bollette", "Anna", 180.5, true, true),
    tx("2026-05", "uscita", "Spesa alimentare", "Arcangelo", 320, true, false),
    tx("2026-05", "uscita", "Trasporti", "Anna", 65, true, true),
    tx("2026-05", "uscita", "Lavoro", "Arcangelo", 140, true, true),
    tx("2026-05", "entrata", "Bonus straordinari", "Arcangelo", 500, false, false),
    tx("2026-05", "uscita", "Sanita", "Anna", 120, false, true),
    tx("2026-05", "uscita", "Prelievo personale", "Arcangelo", 200, false, true),
    tx("2026-05", "uscita", "Prelievo personale", "Anna", 150, false, true),
    tx("2026-05", "uscita", "Salvadanaio", "Arcangelo", 250, false, true),
    tx("2026-05", "entrata", "Prelievo salvadanaio", "Arcangelo", 50, false, true),
    tx("2026-05", "uscita", "Sfizi", "Arcangelo", 80, false, true)
  ];
}

function tx(mese, tipo, cat, membro, importo, ricorrente, reale) {
  return {
    id: crypto.randomUUID(),
    mese,
    tipo,
    cat,
    membro,
    importo,
    ricorrente,
    reale,
    confermato: reale,
    created_at: new Date().toISOString()
  };
}

function readLocalTransactions() {
  const raw = localStorage.getItem(LOCAL_TX_KEY);
  if (raw) {
    let transactions = JSON.parse(raw)
      .filter(t => !["Prestito Anna", "Rimborso Anna"].includes(t.cat))
      .map(t => t.membro === "Capo" ? { ...t, membro: "Arcangelo" } : t);
    if (localStorage.getItem(LOCAL_TX_VERSION_KEY) !== LOCAL_TX_VERSION) {
      const existingKeys = new Set(transactions.map(t => `${t.mese}|${t.tipo}|${t.cat}|${t.membro}|${Number(t.importo)}`));
      const additions = localSeed().filter(t => !existingKeys.has(`${t.mese}|${t.tipo}|${t.cat}|${t.membro}|${Number(t.importo)}`));
      transactions = [...additions, ...transactions];
      writeLocalTransactions(transactions);
      localStorage.setItem(LOCAL_TX_VERSION_KEY, LOCAL_TX_VERSION);
    }
    return transactions;
  }

  const seed = localSeed();
  localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(seed));
  localStorage.setItem(LOCAL_TX_VERSION_KEY, LOCAL_TX_VERSION);
  return seed;
}

function writeLocalTransactions(transactions) {
  localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(transactions));
}

function readLocalCashChecks() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CASH_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalCashCheck(month, check) {
  const checks = readLocalCashChecks();
  checks[month] = check;
  localStorage.setItem(LOCAL_CASH_KEY, JSON.stringify(checks));
}

export async function loadTransactions() {
  if (isLocalTest()) return readLocalTransactions();

  const { supabase } = await import("./supabase-client.js");
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento movimenti:", error);
    return [];
  }

  return data || [];
}

export async function saveTransaction(t) {
  if (isLocalTest()) {
    const transactions = readLocalTransactions();
    const saved = { ...t, id: t.id || crypto.randomUUID(), created_at: t.created_at || new Date().toISOString() };
    transactions.unshift(saved);
    writeLocalTransactions(transactions);
    return saved;
  }

  const { supabase } = await import("./supabase-client.js");
  const { id, ...dataToInsert } = t;
  const { data, error } = await supabase.from("transactions").insert([dataToInsert]).select();
  if (error) throw error;
  return data ? data[0] : null;
}

export async function updateTransaction(id, updates) {
  if (isLocalTest()) {
    const transactions = readLocalTransactions().map(t => t.id === id ? { ...t, ...updates } : t);
    writeLocalTransactions(transactions);
    return;
  }

  const { supabase } = await import("./supabase-client.js");
  const { error } = await supabase.from("transactions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id) {
  if (isLocalTest()) {
    writeLocalTransactions(readLocalTransactions().filter(t => t.id !== id));
    return;
  }

  const { supabase } = await import("./supabase-client.js");
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function loadCashChecks() {
  if (isLocalTest()) return readLocalCashChecks();

  const { supabase } = await import("./supabase-client.js");
  const { data, error } = await supabase
    .from("cash_checks")
    .select("mese,cassa_iniziale,cassa_contata");

  if (error) {
    console.warn("Tabella cash_checks non disponibile, uso salvataggio locale:", error.message);
    return readLocalCashChecks();
  }

  return Object.fromEntries((data || []).map(row => [
    row.mese,
    {
      iniziale: row.cassa_iniziale ?? "",
      contata: row.cassa_contata ?? ""
    }
  ]));
}

export async function saveCashCheck(month, check) {
  writeLocalCashCheck(month, check);

  if (isLocalTest()) return;

  const { supabase } = await import("./supabase-client.js");
  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    mese: month,
    cassa_iniziale: Number(check.iniziale) || 0,
    cassa_contata: check.contata === "" || check.contata == null ? null : Number(check.contata),
    updated_by: userData?.user?.id ?? null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("cash_checks")
    .upsert(payload, { onConflict: "mese" });

  if (error) {
    console.warn("Cash check non salvato su Supabase, resta locale:", error.message);
  }
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCSV(trans) {
  const header = "id,mese,tipo,cat,membro,importo,ricorrente,reale,confermato,created_at";
  const rows = trans.map(t => [
    t.id,
    t.mese,
    t.tipo,
    t.cat,
    t.membro,
    t.importo,
    t.ricorrente,
    t.reale,
    t.confermato,
    t.created_at
  ].map(csvValue).join(",")).join("\n");

  const blob = new Blob([header + "\n" + rows], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bilancio_${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
