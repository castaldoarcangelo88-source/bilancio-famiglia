import { MEMBERS, QUOTA_BASELINA } from "./data-model.js";

export function calcolaCassaReale(transazioni) {
  const reali = transazioni.filter(t => t.reale);
  const entrate = reali.filter(t => t.tipo === "entrata").reduce((s, t) => s + t.importo, 0);
  const uscite = reali.filter(t => t.tipo === "uscita").reduce((s, t) => s + t.importo, 0);
  return entrate - uscite;
}

export function calcolaConguagli(transazioni) {
  // ✅ Calcola solo i movimenti REALI (confermati)
  const reali = transazioni.filter(t => t.reale);
  
  let totaleConguaglio = 0;
  
  MEMBERS.forEach(membro => {
    // Calcola quanto ha prelevato questo membro (solo uscite reali)
    const prelieviMembro = reali
      .filter(t => t.membro === membro && t.tipo === "uscita")
      .reduce((somma, t) => somma + t.importo, 0);
    
    // Calcola quanto ha versato questo membro (solo entrate reali)
    const versamentiMembro = reali
      .filter(t => t.membro === membro && t.tipo === "entrata")
      .reduce((somma, t) => somma + t.importo, 0);
    
    // Bilancio personale del membro
    const bilancioPersonale = versamentiMembro - prelieviMembro;
    
    // Se ha prelevato più della soglia base, deve restituire la differenza
    // Se ha prelevato meno, ha un credito
    const differenzaDaSoglia = prelieviMembro - QUOTA_BASELINA;
    
    totaleConguaglio += differenzaDaSoglia;
    
    console.log(`📊 ${membro}: Versamenti €${versamentiMembro}, Prelievi €${prelieviMembro}, Differenza soglia: €${differenzaDaSoglia}`);
  });
  
  console.log("💰 Totale Conguaglio:", totaleConguaglio);
  return totaleConguaglio;
}

export function ripartisciUtile(cassaReale, conguaglio) {
  // Utile ripartibile = Cassa reale - Conguaglio
  const utileRipartibile = cassaReale - conguaglio;
  
  // Quota per socio (50% ciascuno)
  const quota = utileRipartibile / MEMBERS.length;
  
  return { utileRipartibile, quota };
}
