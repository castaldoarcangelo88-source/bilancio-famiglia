import { supabase } from "./supabase-client.js?v=31";

const ANNA_EMAIL = "anna.balsamo84@gmail.com";

const messages = [
  "Anche nei giorni pieni, ricordati che sei il posto in cui il mio cuore si riposa.",
  "Sei piu forte di quanto pensi e piu amata di quanto riesca a immaginare.",
  "Oggi concediti un sorriso: il tuo rende piu bella anche la mia giornata.",
  "Qualunque cosa accada oggi, noi siamo una squadra. Sempre.",
  "La tua presenza rende casa ogni posto in cui siamo insieme.",
  "Non devi fare tutto perfettamente: per me sei gia straordinaria cosi.",
  "Ti sceglierei ancora, nelle giornate facili e soprattutto in quelle complicate.",
  "Spero che oggi tu possa vederti almeno un po' come ti vedo io: meravigliosa.",
  "Grazie per la cura che metti nelle piccole cose. Io la vedo, sempre.",
  "Se oggi sei stanca, appoggiati a me. Non devi portare tutto da sola.",
  "Il tuo coraggio silenzioso e una delle cose che amo di piu di te.",
  "Tra tutti i miei pensieri, tu sei quello che mi fa sorridere senza motivo.",
  "Oggi ricordati di essere gentile anche con te stessa.",
  "La nostra famiglia ha il tuo calore, ed e il regalo piu bello.",
  "Non importa quanto sia lunga la giornata: alla fine ci siamo noi.",
  "Ti amo nelle tue risate, nei tuoi silenzi e in tutto quello che sei.",
  "Ogni giorno con te aggiunge qualcosa di bello alla nostra storia.",
  "Sei la mia certezza preferita in un mondo che cambia continuamente.",
  "Oggi voglio solo ricordarti che sono fiero di te.",
  "La tua dolcezza non e fragilita: e una forza rara.",
  "Nei tuoi occhi ritrovo ogni giorno la ragione per costruire il nostro futuro.",
  "Meriti la stessa cura che offri ogni giorno a tutti noi.",
  "Quando dubiti di te, prendi in prestito la fiducia che io ho in te.",
  "Sei il mio presente piu bello e il futuro che continuo a scegliere.",
  "Oggi non dimenticare quanto bene porti nella vita di chi ti ama.",
  "La felicita, per me, ha spesso il suono della tua voce.",
  "Con te anche le fatiche hanno un senso e le gioie valgono il doppio.",
  "Non servono occasioni speciali per dirti che ti amo.",
  "La tua mano nella mia continua a essere il mio posto preferito.",
  "Qualunque sogno tu abbia, io voglio essere accanto a te mentre lo insegui.",
  "Sei la coccola che la vita ha regalato a me. Oggi questa coccola e per te."
];

function messageIndexForToday() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return [...today].reduce((total, character) => total + character.charCodeAt(0), 0) % messages.length;
}

async function renderDailyMessage() {
  const container = document.getElementById("dailyMessage");
  const text = document.getElementById("dailyMessageText");
  if (!container || !text) return;

  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.email !== ANNA_EMAIL) return;

  text.textContent = messages[messageIndexForToday()];
  container.hidden = false;
}

renderDailyMessage().catch(error => {
  console.warn("Messaggio quotidiano non disponibile:", error.message);
});
