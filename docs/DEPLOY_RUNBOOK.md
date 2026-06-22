# Deploy Runbook

## Deploy standard

Eseguire:

```cmd
C:\Users\Trippa\Desktop\Bilancio_famiglia\deploy.bat "Descrizione modifica"
```

Il BAT:

1. Aggiorna i parametri `?v=`.
2. Aggiorna `CACHE_NAME` della PWA.
3. Esegue `git status` e `git add .`.
4. Crea il commit.
5. Esegue push su `origin/main`.

## Controlli dopo deploy

- Produzione: `https://castaldoarcangelo88-source.github.io/bilancio-famiglia/index.html`
- Login: `https://castaldoarcangelo88-source.github.io/bilancio-famiglia/login.html`
- Preview: `https://castaldoarcangelo88-source.github.io/bilancio-famiglia/preview/index.html`

Da telefono/PWA:

1. Chiudere completamente l'app.
2. Riaprire con connessione attiva.
3. Se necessario, ricaricare una volta dal browser.

## Rollback

Per annullare l'ultimo deploy:

```cmd
cd /d C:\Users\Trippa\Desktop\Bilancio_famiglia\bilancio-famiglia
git log -3 --oneline
git revert HEAD
git push origin main
```

Non usare `git reset --hard`.

## Preview

- La cartella `/preview/` e isolata dalla produzione.
- Usa cache PWA con prefisso `bilancio-preview-`.
- La produzione usa cache con prefisso `bilancio-cache-`.
