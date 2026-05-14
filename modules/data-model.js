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

export function createTransaction(mese, tipo, cat, membro, importo, ricorrente, reale) {
  return {
    // ❌ RIMOSSO: id generato manualmente (non è UUID valido)
    // ✅ Supabase genererà automaticamente l'UUID grazie a DEFAULT gen_random_uuid()
    mese, 
    tipo, 
    cat, 
    membro, 
    importo: parseFloat(importo),
    ricorrente, 
    reale, 
    confermato: reale,
    created_at: new Date().toISOString()
  };
}
