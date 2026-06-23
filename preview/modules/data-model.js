export const MEMBERS = ["Arcangelo", "Anna"];

export const HOUSE_CATEGORIES = [
  "Mutuo/Affitto",
  "Bollette",
  "Spesa alimentare",
  "Assicurazioni",
  "Istruzione",
  "Trasporti",
  "Abbonamenti",
  "Piscina",
  "Danza",
  "Dottoresse",
  "Casa"
];

export const WORK_CATEGORIES = [
  "Lavoro",
  "Trasporti lavoro",
  "Materiale lavoro",
  "Spese lavoro"
];

export const SAVINGS_CATEGORIES = ["Salvadanaio", "Risparmio"];
export const SAVINGS_WITHDRAWAL_CATEGORIES = ["Prelievo salvadanaio", "Rientro salvadanaio"];
export const FUN_CATEGORIES = ["Sfizi", "Svago"];

export const PERSONAL_CATEGORIES = [
  "Prelievo personale",
  "Sanita",
  "Manutenzioni",
  "Viaggi",
  "Regali",
  "Investimenti una tantum",
  "Altro"
];

export const CATEGORIES = {
  entrata: {
    ricorrenti: ["Stipendio", "Apporto familiare", "Affitti/Rendite", "Bonus mensili", "Rimborsi"],
    una_tantum: ["Bonus straordinari", "Vendite beni", "Regali ricevuti", "Prelievo salvadanaio", "Altro"]
  },
  uscita: {
    ricorrenti: [
      "Mutuo/Affitto",
      "Bollette",
      "Spesa alimentare",
      "Assicurazioni",
      "Istruzione",
      "Trasporti",
      "Abbonamenti",
      "Piscina",
      "Danza",
      "Dottoresse",
      "Casa",
      "Lavoro"
    ],
    una_tantum: [
      "Sanita",
      "Manutenzioni",
      "Viaggi",
      "Regali",
      "Investimenti una tantum",
      "Prelievo personale",
      "Salvadanaio",
      "Sfizi",
      "Spese lavoro",
      "Dottoresse",
      "Svago",
      "Casa",
      "Altro"
    ]
  }
};

export const SOGLIA_ALLARME_CASSA = 500;
export const STORAGE_KEY = "famiglia_finance_v1";

export function createTransaction(mese, tipo, cat, membro, importo, ricorrente, reale, privata = false, ownerId = null) {
  return {
    mese,
    tipo,
    cat: String(cat || "").trim(),
    membro,
    importo: parseFloat(importo),
    ricorrente: Boolean(ricorrente),
    reale: Boolean(reale),
    confermato: Boolean(reale),
    visibility: privata ? "private" : "shared",
    owner_id: privata ? ownerId : null,
    created_at: new Date().toISOString()
  };
}
