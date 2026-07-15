export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SmartSplit PWA] Service Worker registered successfully: ", reg.scope);
        })
        .catch((err) => {
          console.error("[SmartSplit PWA] Service Worker registration failed: ", err);
        });
    });
  }
}
