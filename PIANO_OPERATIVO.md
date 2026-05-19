# Piano operativo - Bilancio Famiglia

## Analisi veloce

App web statica per gestione bilancio familiare con:
- login Supabase
- inserimento movimenti
- categorie da database
- KPI principali
- grafici Chart.js
- esportazione CSV
- test notifica Telegram

Problemi principali trovati:
- due copie del progetto: cartella principale e `bilancio-famiglia/`
- credenziali e token esposti in file frontend
- testi con caratteri rovinati in HTML/JS/CSV
- funzioni duplicate o non usate tra moduli
- report settimanale presente ma non collegato ai dati reali
- filtro mensile visibile ma poco efficace
- nessun piano chiaro di manutenzione o backup dati

## Priorita operative

### P0 - Urgente: sicurezza e costi

1. Ruotare il token Telegram e togliere il token dal frontend.
2. Controllare le policy Supabase: ogni tabella deve essere protetta da RLS.
3. Decidere una sola cartella ufficiale del progetto.
4. Evitare di salvare password/token in file versionabili.

Risultato atteso: nessun accesso indesiderato a database o bot Telegram.

### P1 - Stabilita app

1. Sistemare i caratteri rovinati in `index.html`, `login.html`, moduli JS e CSV.
2. Centralizzare Supabase in un solo modulo.
3. Eliminare duplicati tra `categories.js`, `db-manager.js` e `storage.js`.
4. Aggiungere messaggi errore chiari quando database o categorie non caricano.
5. Bloccare inserimenti con importo zero o negativo.

Risultato atteso: app piu affidabile e facile da usare ogni giorno.

### P2 - Funzioni ad alto impatto

1. Import CSV da `test_data.csv`.
2. Report settimanale basato su dati reali.
3. Filtro mensile realmente collegato al grafico.
4. Riepilogo per persona: quanto ha speso, quanto deve compensare.
5. Dashboard "da controllare": movimenti attesi/non confermati.

Risultato atteso: meno lavoro manuale e decisioni piu rapide.

### P3 - Usabilita

1. Migliorare layout mobile del form.
2. Aggiungere conferme visive dopo salvataggio/modifica.
3. Rendere esportazione CSV piu completa e ordinata.
4. Aggiungere ricerca/filtro movimenti per categoria o membro.

Risultato atteso: uso piu veloce da telefono.

## Decisione consigliata

Usare come base la cartella principale:
`C:\Users\Trippa\Desktop\Bilancio_famiglia`

Mettere la copia `bilancio-famiglia/` in archivio solo dopo aver verificato che non contiene modifiche utili.

## Piano operativo rapido

### Fase 1 - 30 minuti

1. Ruotare token Telegram.
2. Verificare RLS Supabase.
3. Decidere cartella unica.
4. Correggere caratteri rovinati nei file principali.

### Fase 2 - 60/90 minuti

1. Pulire moduli duplicati.
2. Sistemare errori e validazioni.
3. Collegare report settimanale e filtro mensile ai dati reali.

### Fase 3 - 2/3 ore

1. Import CSV.
2. Riepilogo per persona.
3. Dashboard movimenti da confermare.
4. Backup/export piu robusto.

## Prossima azione consigliata

Partire da P0 e P1 insieme:
- sicurezza
- cartella unica
- correzione caratteri
- pulizia moduli duplicati

Sono le attivita con miglior rapporto impatto/tempo.

## Stato aggiornato

Completato:
- rimosso il token Telegram dai file frontend
- aggiunto `.gitignore` per password, token e file locali
- aggiunto client Supabase centralizzato in `modules/supabase-client.js`
- corretto testo rovinato nei file principali
- sistemato `test_data.csv`
- migliorata validazione importi
- collegato il checkbox ricorrente al salvataggio
- reso il filtro mensile effettivo
- reso il grafico settimanale basato sui movimenti del mese
- aggiunto redirect a `login.html` se manca una sessione attiva
- aggiunto accesso locale temporaneo per test: utente `admin`, password `admin123`
- sistemata navigazione mese avanti/indietro con calcolo mese locale
- aggiunta cassa prevista: cassa reale piu entrate attese meno uscite attese
- aggiunte spese casa e spese personali separate
- rimosso il conguaglio come logica base
- ridefinita l'entita contabile: unica cassa familiare
- Arcangelo e Anna sono tracciati come chi apporta/spende, non come casse separate
- tutte le entrate reali aumentano la cassa familiare
- tutte le uscite reali riducono la cassa familiare
- rimossi debito Anna e fondi personali come logica base
- aggiunta riconciliazione: cassa iniziale, cassa calcolata, cassa contata, differenza
- aggiunti salvadanaio e sfizi come destinazioni dell'avanzo familiare
- aggiunto `Prelievo salvadanaio` per richiamare soldi dal salvadanaio con transazione scritta
- aggiunte categorie `Salvadanaio`, `Prelievo salvadanaio`, `Sfizi`, `Lavoro`, `Apporto familiare`
- aggiunta copia automatica delle voci ricorrenti quando si entra in un mese vuoto
- aggiunto pulsante per copiare manualmente i ricorrenti del mese precedente
- aggiunta modalita test locale con dati di esempio per `admin/admin123`
- aggiunto import CSV da interfaccia
- marcata `bilancio-famiglia/` come copia archiviata

Da fare:
- ruotare il token Telegram dal pannello BotFather
- verificare RLS e policy Supabase
- decidere se eliminare o spostare definitivamente la copia `bilancio-famiglia/`
- spostare Telegram su Supabase Edge Function o altro backend
- rendere persistenti eventuali nuove colonne logiche su Supabase se vuoi classificazioni piu avanzate lato database
