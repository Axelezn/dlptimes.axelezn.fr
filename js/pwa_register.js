// js/pwa_register.js (Modifié pour le bouton d'installation)

let deferredPrompt; // Variable pour stocker l'événement d'installation

// 1. Intercepter l'événement qui dit : "Je suis prêt à être installé"
window.addEventListener("beforeinstallprompt", (e) => {
  // Empêcher la bannière par défaut de s'afficher (si elle l'aurait fait)
  e.preventDefault();

  // Stocker l'événement pour qu'il puisse être déclenché plus tard par notre bouton
  deferredPrompt = e;

  // Afficher notre bouton personnalisé
  // NOTE : Le bouton doit exister dans le HTML au moment où ce script s'exécute.
  const installButton = document.getElementById("installButton");
  if (installButton) {
    installButton.style.display = "block";
  }

  console.log("Installation PWA prête et événement stocké.");
});

// 2. Gérer le clic sur le bouton
// L'écouteur doit être configuré après que la page a chargé le bouton
document.addEventListener("DOMContentLoaded", () => {
  const installButton = document.getElementById("installButton");
  if (installButton) {
    installButton.addEventListener("click", (e) => {
      if (deferredPrompt) {
        // Cacher le bouton
        installButton.style.display = "none";

        // Déclencher l'invite d'installation native du navigateur
        deferredPrompt.prompt();

        // Gérer la réponse de l'utilisateur
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("Utilisateur a accepté l'installation.");
          } else {
            console.log("Utilisateur a refusé l'installation.");
          }
          deferredPrompt = null;
        });
      }
    });
  }
});

// 3. Enregistrement du Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Chemin du SW vérifié
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("Service Worker enregistré. Portée:", reg.scope);
      })
      .catch((error) => {
        console.error("Échec de l'enregistrement du Service Worker:", error);
      });
  });
}
