export const MEMBERS = ["Capo", "Anna"];

export const CATEGORIES = {
  entrata: {
    ricorrenti: ["Stipendio", "Affitti/Rendite", "Bonus mensili", "Rimborsi"],
    una_tantum: ["Bonus straordinari", "Vendite beni", "Regali ricevuti", "Altro"]
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
      "Svago",
      "Casa"
    ],
    una_tantum: [
      "Sanità", 
      "Manutenzioni", 
      "Viaggi", 
      "Regali", 
      "Investimenti una tantum", 
      "Prelivo personale",
      "Dottoresse",
      "Svago",
      "Casa"
    ]
  }
};

export const QUOTA_BASELINA = 600; // Prelievo mensile tollerato
export const SOGLIA_ALLARME_CASSA = 500; // Alert se sotto questa cifra
export const STORAGE_KEY = "famiglia_finance_v1";

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
