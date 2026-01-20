// js/app-restaurants.js - V5 (Style Tuile Attraction + Bouton CSS)

const CONFIG = {
    // Vérifiez bien que votre fichier est ICI. 
    // Si c'est dans "data/", changez le chemin ci-dessous !
    DATA_URL: './js/json/restaurants.json', 
    REFRESH_INTERVAL: 60000 
};

// --- UTILITAIRES ---

const getParkFromLand = (landName) => {
    const dlpLands = ["Main Street, U.S.A.", "Fantasyland", "Discoveryland", "Frontierland", "Adventureland"];
    return dlpLands.includes(landName) ? "Parc Disneyland" : "Walt Disney Studios Park";
};

const getTypeIcon = (type) => {
    if (!type) return "🍴";
    const t = type.toLowerCase();
    if (t.includes("rapide") || t.includes("fast")) return "🍔";
    if (t.includes("table")) return "🍽️";
    if (t.includes("buffet")) return "🥗";
    if (t.includes("emporter") || t.includes("snack")) return "🥡";
    return "🍴";
};

const getPriceDisplay = (price) => {
    if (!price) return "";
    if (price === "€") return '<span style="color:#28a745; font-weight:bold;">€</span><span style="color:#555;">€€</span>';
    if (price === "€€") return '<span style="color:#ffc72c; font-weight:bold;">€€</span><span style="color:#555;">€</span>';
    if (price === "€€€") return '<span style="color:#dc3545; font-weight:bold;">€€€</span>';
    return price;
};

// --- GÉNÉRATION HTML ---

const createFavButton = (id) => {
    if (typeof window.isFavorite !== 'function') return '';
    const isActive = window.isFavorite(id);
    const heart = isActive ? '❤️' : '🤍';
    const activeClass = isActive ? 'active' : '';
    return `<button class="fav-btn ${activeClass}" onclick="event.stopPropagation(); window.toggleFavorite('${id}'); this.classList.toggle('active'); this.innerText = this.classList.contains('active') ? '❤️' : '🤍';">${heart}</button>`;
};

const createRestoCard = (resto) => {
    const icon = getTypeIcon(resto.type);
    const nom = resto.name || resto.titre; 
    
    // --- 1. BADGES ---
    let badges = '';
    if (resto.reservation) {
        badges += `<span style="font-size:0.75em; background:#00287a; color:#fff; padding:3px 6px; border-radius:4px; margin-right:5px; white-space:nowrap; display:inline-block; margin-top:4px;">📱 Réservation</span>`;
    }
    if (resto.clickAndCollect) {
        badges += `<span style="font-size:0.75em; background:#e67e22; color:#fff; padding:3px 6px; border-radius:4px; margin-right:5px; white-space:nowrap; display:inline-block; margin-top:4px;">🛍️ Click&Collect</span>`;
    }

    // --- 2. BOUTON MENU (Classe CSS .btn-menu) ---
    let menuHtml = '';
    // On affiche le bouton seulement s'il y a une URL valide
    if (resto.menuUrl && resto.menuUrl.length > 5) {
        menuHtml = `<a href="${resto.menuUrl}" target="_blank" class="btn-menu">Voir le menu</a>`;
    }

    // --- 3. PRIX & HORAIRES ---
    const prixHtml = getPriceDisplay(resto.priceRange || resto.prix);
    
    // DEBUG : Voir ce que l'on reçoit pour les horaires
    // console.log(`Resto: ${nom} | Horaires: ${resto.horaires}`);

    let horairesText = resto.horaires;
    let horairesClass = "status-single-rider"; // Vert (Style bandeau)
    
    // Si vide ou undefined
    if (!horairesText || horairesText === "") {
        horairesText = "Horaires NC";
        horairesClass = "time-past-box"; // Gris
    }
    
    // Si statut Fermé
    if ((resto.status && resto.status === "CLOSED") || (resto.statut && resto.statut.toLowerCase().includes("fermé"))) {
        horairesText = "Fermé";
        horairesClass = "status-closed-single"; // Rouge
    }

    // --- 4. STRUCTURE HTML (Strictement identique aux attractions) ---
    return `
        <div class="attraction-card" id="resto-${resto.id}">
            <div class="attraction-info">
                <div style="display:flex; justify-content:space-between; align-items:start; padding-right:5px;">
                    <h3 style="margin:0;">${nom}</h3>
                    ${createFavButton(resto.id)}
                </div>
                
                <p style="color:#ffc72c; margin-top:2px; font-weight:600;">
                    ${icon} ${resto.type} 
                    ${resto.cuisine ? `<span style="color:#b0b0d0; font-weight:400;">• ${resto.cuisine}</span>` : ''}
                </p>
                <p style="font-size:0.85em; color:#bbb; margin-top:2px;">📍 ${resto.land}</p>
                
                <div style="margin-top:2px;">${badges}</div>
                
                ${menuHtml}
            </div>

            <div class="wait-times-container">
                <div class="wait-time" style="background-color: #222; border: 1px solid #444; color: #fff; padding: 8px 0; min-width: 65px; display:flex; justify-content:center;">
                    ${prixHtml}
                </div>
                
                <div class="wait-time single-rider-time ${horairesClass}" style="margin-top:5px;">
                    ${horairesText}
                </div>
            </div>
        </div>
    `;
};

// --- MOTEUR ---

const loadRestaurants = async () => {
    const listElement = document.getElementById('restaurants-list');
    if (!listElement) return;

    if (!listElement.querySelector('.park-group')) {
        listElement.innerHTML = '<div class="loading-message">🍔 Préparation de la cuisine...</div>';
    }

    try {
        const response = await fetch(CONFIG.DATA_URL);
        if (!response.ok) throw new Error("Erreur JSON (Vérifiez le chemin du fichier !)");
        const data = await response.json();

        // On trie les données et on les groupe
        const byPark = { "Parc Disneyland": [], "Walt Disney Studios Park": [], "Disney Village": [], "Hôtels": [] };
        
        data.forEach(resto => {
            let park = getParkFromLand(resto.land);
            if (resto.land === "Disney Village") park = "Disney Village";
            if (byPark[park]) byPark[park].push(resto);
            else byPark["Hôtels"].push(resto);
        });

        listElement.innerHTML = '';

        Object.keys(byPark).forEach(parkName => {
            const restos = byPark[parkName];
            if (restos.length > 0) {
                // Tri par nom
                restos.sort((a, b) => (a.name || a.titre).localeCompare(b.name || b.titre));
                
                const cards = restos.map(r => createRestoCard(r)).join('');
                // Notez l'ajout de la classe .park-group ici
                listElement.innerHTML += `<div class="park-group"><h2 class="park-show-header">${parkName}</h2>${cards}</div>`;
            }
        });

        // Relance la recherche si besoin
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input'));

    } catch (e) {
        console.error(e);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur : ${e.message}</div>`;
    }
};

// ... (Le reste du code Search reste inchangé) ...
const setupSearch = () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.park-group').forEach(group => {
            const cards = group.querySelectorAll('.attraction-card');
            let hasVisible = false;
            cards.forEach(c => {
                const text = c.innerText.toLowerCase(); 
                c.style.display = text.includes(term) ? 'flex' : 'none';
                if(text.includes(term)) hasVisible = true;
            });
            group.style.display = hasVisible ? 'block' : 'none';
        });
    });
    const closeKey = () => searchInput.blur();
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closeKey(); } });
    window.addEventListener('scroll', () => { if (document.activeElement === searchInput) closeKey(); }, { passive: true });
};

document.addEventListener('DOMContentLoaded', () => {
    loadRestaurants();
    setupSearch();
});