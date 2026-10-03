type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let installEvent: InstallEvent | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e as InstallEvent;
  window.dispatchEvent(new Event("circuito-installable"));
});
export const canInstall = () => installEvent !== null;
export async function installApp() {
  if (installEvent) {
    await installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    window.dispatchEvent(new Event("circuito-installable"));
  }
}
export async function registerPWA(
  onUpdate: (registration: ServiceWorkerRegistration) => void,
) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}sw.js`,
    { scope: import.meta.env.BASE_URL },
  );
  if (registration.waiting) onUpdate(registration);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller)
        onUpdate(registration);
    });
  });
  // Rechecagem leve ao voltar à janela; sem exigir rede para editar ou consultar.
  window.addEventListener("focus", () => {
    void registration.update().catch(() => {});
  });
}
