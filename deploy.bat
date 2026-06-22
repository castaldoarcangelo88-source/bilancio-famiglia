@echo off
setlocal

cd /d C:\Users\Trippa\Desktop\Bilancio_famiglia\bilancio-famiglia

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Deploy Bilancio Famiglia"

for /f %%V in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmss"') do set "CACHE_VERSION=%%V"

echo Aggiornamento versione cache: %CACHE_VERSION%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$files=@('index.html','login.html','modules\ui.js','modules\storage.js','modules\pwa.js','modules\navigation.js'); $utf8=New-Object System.Text.UTF8Encoding($false); foreach($file in $files){ if(Test-Path -LiteralPath $file){ $content=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $file)); $content=[regex]::Replace($content,'\?v=[A-Za-z0-9_-]+','?v=%CACHE_VERSION%'); [IO.File]::WriteAllText((Resolve-Path -LiteralPath $file),$content,$utf8) } }; $sw='service-worker.js'; if(Test-Path -LiteralPath $sw){ $content=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $sw)); $content=[regex]::Replace($content,'\$\{CACHE_PREFIX\}[A-Za-z0-9_-]+','${CACHE_PREFIX}%CACHE_VERSION%'); $content=[regex]::Replace($content,'bilancio-(staging-v1|cache-[A-Za-z0-9_-]+)','bilancio-cache-%CACHE_VERSION%'); [IO.File]::WriteAllText((Resolve-Path -LiteralPath $sw),$content,$utf8) }"
if errorlevel 1 goto :error

git status
git add .
git commit -m "%COMMIT_MSG%"
if errorlevel 1 goto :error

git push origin main
if errorlevel 1 goto :error

echo.
echo Deploy completato.
pause
exit /b 0

:error
echo.
echo Deploy non completato. Controlla il messaggio sopra.
pause
exit /b 1
