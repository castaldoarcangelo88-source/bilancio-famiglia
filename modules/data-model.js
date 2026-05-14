export const MEMBERS = ["Capo", "Moglie"];

export const CATEGORIES = {
  entrata: {
    ricorrenti: ["Stipendio", "Affitti/Rendite", "Bonus mensili"],
    una_tantum: ["Bonus straordinari", "Vendite beni", "Rimborsi", "Regali ricevuti"]
  },
  uscita: {
    ricorrenti: ["Mutuo/Affitto", "Bollette", "Spesa alimentare", "Assicurazioni", "Istruzione", "Trasporti", "Abbonamenti"],
    una_tantum: ["Sanità", "Manutenzioni", "Viaggi", "Regali", "Investimenti una tantum", "Prelivo personale"]
  }
};

export const QUOTA_BASELINA = 600;
export const STORAGE_KEY = "famiglia_finance_v1";

// ✅ NON generare ID qui - lascia fare a Supabase
export function createTransaction(mese, tipo, cat, membro, importo, ricorrente, reale) {
  return {
    mese, 
    tipo, 
    cat, 
    membro, 
    importo: parseFloat(importo),
    ricorrente: ricorrente || false, 
    reale: reale || false, 
    confermato: reale || false,
    created_at: new Date().toISOString()
  };
}
