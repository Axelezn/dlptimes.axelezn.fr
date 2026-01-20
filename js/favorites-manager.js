// js/favorites-manager.js
// Version Globale - Accessible partout

const FAV_STORAGE_KEY = 'dlp_user_favorites';

console.log("Chargement du Favorites Manager...");

// Attacher les fonctions à l'objet global 'window'
window.getFavorites = function() {
    try {
        const stored = localStorage.getItem(FAV_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Erreur LocalStorage:", e);
        return [];
    }
};

window.isFavorite = function(id) {
    const favorites = window.getFavorites();
    return favorites.includes(id);
};

window.toggleFavorite = function(id) {
    let favs = window.getFavorites();
    
    if (favs.includes(id)) {
        favs = favs.filter(favId => favId !== id);
        console.log(`Favori retiré: ${id}`);
    } else {
        favs.push(id);
        console.log(`Favori ajouté: ${id}`);
    }
    
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
    
    // Événement pour que l'interface réagisse immédiatement (si besoin)
    window.dispatchEvent(new Event('favoritesUpdated'));
};

console.log("Favorites Manager chargé avec succès.");