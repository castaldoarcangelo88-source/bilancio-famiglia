function amount(t) {
  return Number(t.importo) || 0;
}

export function isHouseExpense(t) {
  return t.tipo === "uscita";
}

export function isWorkExpense(t) {
  return false;
}

export function isSaving(t) {
  return t.tipo === "accantonamento";
}

export function isSavingsWithdrawal(t) {
  return t.tipo === "prelievo";
}

export function isFun(t) {
  return false;
}

export function isPersonalExpense(t) {
  return false;
}

export function onlyReal(transazioni) {
  return transazioni.filter(t => t.reale || t.confermato);
}

export function calcolaRiepilogo(transazioni, cassa = {}) {
  const cassaIniziale = Number(cassa.iniziale) || 0;
  const cassaContata = cassa.contata === "" || cassa.contata == null ? null : Number(cassa.contata);
  const reali = onlyReal(transazioni);
  const attesi = transazioni.filter(t => !(t.reale || t.confermato));

  const entrateFamiglia = reali
    .filter(t => t.tipo === "entrata")
    .reduce((sum, t) => sum + amount(t), 0);
  const usciteFamiglia = reali
    .filter(t => t.tipo === "uscita")
    .reduce((sum, t) => sum + amount(t), 0);
  const salvadanaioVersato = reali.filter(isSaving).reduce((sum, t) => sum + amount(t), 0);
  const salvadanaioPrelevato = reali.filter(isSavingsWithdrawal).reduce((sum, t) => sum + amount(t), 0);
  const entrateAttese = attesi
    .filter(t => t.tipo === "entrata" || t.tipo === "prelievo")
    .reduce((sum, t) => sum + amount(t), 0);
  const usciteAttese = attesi
    .filter(t => t.tipo === "uscita" || t.tipo === "accantonamento")
    .reduce((sum, t) => sum + amount(t), 0);

  const speseCasa = reali.filter(isHouseExpense).reduce((sum, t) => sum + amount(t), 0);
  const speseLavoro = reali.filter(isWorkExpense).reduce((sum, t) => sum + amount(t), 0);
  const spesePersonali = reali.filter(isPersonalExpense).reduce((sum, t) => sum + amount(t), 0);
  const saldoSalvadanaio = salvadanaioVersato - salvadanaioPrelevato;
  const sfizi = reali.filter(isFun).reduce((sum, t) => sum + amount(t), 0);

  const perPersona = reali.reduce((acc, t) => {
    if (!acc[t.membro]) acc[t.membro] = { entrate: 0, uscite: 0 };
    if (t.tipo === "entrata" || t.tipo === "prelievo") acc[t.membro].entrate += amount(t);
    if (t.tipo === "uscita" || t.tipo === "accantonamento") acc[t.membro].uscite += amount(t);
    return acc;
  }, {});

  const cassaCalcolata = cassaIniziale + entrateFamiglia - usciteFamiglia - salvadanaioVersato + salvadanaioPrelevato;
  const cassaPrevista = cassaCalcolata + entrateAttese - usciteAttese;
  const differenzaCassa = cassaContata == null || Number.isNaN(cassaContata) ? null : cassaContata - cassaCalcolata;

  return {
    cassaIniziale,
    cassaContata,
    cassaCalcolata,
    cassaPrevista,
    differenzaCassa,
    entrateFamiglia,
    usciteFamiglia,
    entrateAttese,
    usciteAttese,
    speseCasa,
    speseLavoro,
    spesePersonali,
    salvadanaioVersato,
    salvadanaioPrelevato,
    saldoSalvadanaio,
    sfizi,
    movimentiAttesi: entrateAttese + usciteAttese,
    perPersona
  };
}
