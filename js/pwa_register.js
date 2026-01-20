// js/pwa_register.js (Version Nettoyée : Installation PWA uniquement)

let deferredPrompt; 

// =======================================================
// 1. Gestion de l'installation PWA (A2HS)
// =======================================================

// Capture l'événement d'installation
window.addEventListener("beforeinstallprompt", (e) => {
  // Empêche la bannière par défaut du navigateur de s'afficher immédiatement
  e.preventDefault();
  
  // Stocker l'événement pour qu'il puisse être déclenché plus tard
  deferredPrompt = e;

  // Afficher notre bouton personnalisé d'installation
  const installButton = document.getElementById("installButton");
  if (installButton) {
    installButton.style.display = "block";
  }

  console.log("Installation PWA prête et événement stocké.");
});

// Gérer le clic sur le bouton d'installation
document.addEventListener("DOMContentLoaded", () => {
  const installButton = document.getElementById("installButton");
  if (installButton) {
    installButton.addEventListener("click", (e) => {
      if (deferredPrompt) {
        // Cacher le bouton car on lance le processus
        installButton.style.display = "none";

        // Déclencher l'invite d'installation native du navigateur
        deferredPrompt.prompt();

        // Gérer la réponse de l'utilisateur
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("Utilisateur a accepté l'installation.");
          } else {
            console.log("Utilisateur a refusé l'installation.");
            // Optionnel : Réafficher le bouton si refusé, selon votre stratégie UX
          }
          deferredPrompt = null;
        });
      }
    });
  }
});

// =======================================================
// 2. Enregistrement du Service Worker (Simple)
// =======================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("Service Worker enregistré. Portée:", reg.scope);
      })
      .catch((error) => {
        console.error("Échec de l'enregistrement du Service Worker:", error);
      });
  });
} else {
  console.log("Service Worker non supporté par ce navigateur.");
}