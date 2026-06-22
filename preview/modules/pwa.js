if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
      await registration.update();
    } catch (error) {
      console.warn("PWA non disponibile:", error.message);
    }
  });
}

const INSTALL_DISMISSED_KEY = "bilancio_install_dismissed_at";
const INSTALL_REMINDER_DELAY = 7 * 24 * 60 * 60 * 1000;
let deferredInstallPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function canShowInstallNotice() {
  const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY)) || 0;
  return !isStandalone() && Date.now() - dismissedAt > INSTALL_REMINDER_DELAY;
}

function closeInstallNotice() {
  document.getElementById("pwa-install-notice")?.remove();
}

function dismissInstallNotice() {
  localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  closeInstallNotice();
}

function showInstallNotice(mode) {
  if (!canShowInstallNotice() || document.getElementById("pwa-install-notice")) return;

  const notice = document.createElement("div");
  notice.id = "pwa-install-notice";
  notice.className = "pwa-install-notice";
  notice.setAttribute("role", "dialog");
  notice.setAttribute("aria-label", "Installa Bilancio Famiglia");

  const message = mode === "ios"
    ? "Installa Bilancio Famiglia dalla condivisione del browser."
    : "Installa Bilancio Famiglia sul dispositivo.";

  notice.innerHTML = `
    <strong>Bilancio Famiglia</strong>
    <span>${message}</span>
    <div class="pwa-install-actions">
      ${mode === "android" ? '<button type="button" id="pwa-install-button">Installa</button>' : ""}
      <button type="button" id="pwa-install-close" aria-label="Chiudi">Chiudi</button>
    </div>
  `;

  document.body.appendChild(notice);
  document.getElementById("pwa-install-close").addEventListener("click", dismissInstallNotice);

  if (mode === "android") {
    document.getElementById("pwa-install-button").addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      closeInstallNotice();
    });
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallNotice("android");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  localStorage.removeItem(INSTALL_DISMISSED_KEY);
  closeInstallNotice();
});

window.addEventListener("load", () => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) showInstallNotice("ios");
});
