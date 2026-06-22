# Codex Global Instructions

## Ambiente

- Operare prima in staging: `C:\Users\Trippa\Desktop\Bilancio_famiglia`.
- Produzione Git: `C:\Users\Trippa\Desktop\Bilancio_famiglia\bilancio-famiglia`.
- Aggiornare `SESSION_LOG.md` alla fine di ogni intervento.
- Leggere `PROJECTS_INDEX.md`, `GLOBAL_TASKS.md` e questo file prima di modificare il progetto.

## Sicurezza

- Non modificare Supabase senza approvazione esplicita.
- Non esporre service role key, password o token privati.
- Mantenere RLS attiva sulle tabelle pubbliche.
- Non reintrodurre login locale `admin/admin123` in produzione.
- Le modifiche alla privacy devono essere protette sia nella UI sia nelle policy RLS.

## Interfaccia

- Conservare gli ID DOM usati da `modules/ui.js`.
- Mantenere logica contabile e grafica separate.
- Verificare mobile 390x844 e desktop 1440x900 prima del deploy.
- Su mobile usare sidebar drawer; su desktop sidebar persistente.

## Git

- Non usare `git reset --hard`.
- Preferire commit dedicati e `git revert` per rollback.
- Non includere modifiche non collegate al task.
- Preservare sempre la cartella `preview` salvo ordine esplicito del Titolare.
