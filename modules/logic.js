import { MEMBERS, QUOTA_BASELINA } from "./data-model.js";

export function calcolaCassaReale(transazioni) {
  const reali = transazioni.filter(t => t.reale);
  const entrate = reali.filter(t => t.tipo === "entrata").reduce((s, t) => s + t.importo, 0);
  const uscite = reali.filter(t => t.tipo === "uscita").reduce((s, t) => s + t.importo, 0);
  return entrate - uscite;
}

export function calcolaConguagli(transazioni) {
  // Calcola solo movimenti reali
  const reali = transazioni.filter(t => t.reale);
  let totaleConguaglio = 0;
  
  MEMBERS.forEach(membro => {
    // Quanto ha prelevato questo membro (uscite)
    const prelievi = reali.filter(t => t.membro === membro && t.tipo === "uscita").reduce((s, t) => s + t.importo, 0);
    // Quanto ha versato (entrate)
    const versamenti = reali.filter(t => t.membro === membro && t.tipo === "entrata").reduce((s, t) => s + t.importo, 0);
    
    // Differenza rispetto alla soglia base
    const diff = prelievi - QUOTA_BASELINA;
    totaleConguaglio += diff;
  });
  
  return totaleConguaglio;
}

export function ripartisciUtile(cassaReale, conguaglio) {
  const utileRipartibile = cassaReale - conguaglio;
  return { utileRipartibile, quota: utileRipartibile / MEMBERS.length };
}
