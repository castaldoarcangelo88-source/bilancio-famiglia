import { MEMBERS, QUOTA_BASELINA } from "./data-model.js";

export function calcolaCassaReale(transazioni) {
  const reali = transazioni.filter(t => t.reale);
  const entrate = reali.filter(t => t.tipo === "entrata").reduce((s, t) => s + t.importo, 0);
  const uscite = reali.filter(t => t.tipo === "uscita").reduce((s, t) => s + t.importo, 0);
  return entrate - uscite;
}

export function calcolaConguagli(transazioni) {
  let conguaglio = 0;
  MEMBERS.forEach(m => {
    const prelievi = transazioni
      .filter(t => t.membro === m && t.tipo === "uscita" && t.reale)
      .reduce((s, t) => s + t.importo, 0);
    
    // Se prelievo > quota -> debito (riduce utile ripartibile)
    // Se prelievo < quota -> credito (aumenta utile ripartibile)
    const diff = prelievi - QUOTA_BASELINA;
    conguaglio += diff;
  });
  return conguaglio;
}

export function ripartisciUtile(cassaReale, conguaglio) {
  const utileRipartibile = cassaReale - conguaglio;
  const quota = utileRipartibile / MEMBERS.length;
  return { utileRipartibile, quota };
}