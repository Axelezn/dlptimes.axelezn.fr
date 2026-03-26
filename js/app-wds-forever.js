// js/app-wds-forever.js - Easter Egg "Walt Disney Studios Forever"

const CONFIG = {
    LAND_ORDER: ["Front Lot", "Toon Studio", "Production Courtyard", "Backlot", "Toy Story Playland"]
};

let isSortedByTime = false;
let globalAttractionsData = [];

// --- UTILITAIRES ---

// ⭐ AJOUT : Fonction pour récupérer le nom du logo
const getLogoFileName = (landName) => landName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') + '_logo.png';


const getFutureTime = (addMinutes) => {
    const d = new Date();

    d.setMinutes(d.getMinutes() + addMinutes);
    

    const roundedMinutes = Math.round(d.getMinutes() / 5) * 5;
    d.setMinutes(roundedMinutes);
    d.setSeconds(0);
    d.setMilliseconds(0);
    
    return d.toISOString();
};

// Génère un temps aléatoire (ex: 15, 25, 40, 55...)
const getRandomWait = () => Math.floor(Math.random() * 5 + 1) * 10 + 5; 

// --- DONNÉES NOSTALGIQUES ---
const NOSTALGIA_DATA = [
    // --- FRONT LOT ---
    { id: 'FL1', name: "Disney Studio 1", land: "Front Lot", type: "ATTRACTION", wait: 0 },
    { id: 'FL2', name: "Restaurant En Coulisse", land: "Front Lot", type: "RESTAURANT" },
    { id: 'FL3', name: "Studio Catering Co", land: "Front Lot", type: "RESTAURANT" },

    // --- TOON STUDIO ---
    { id: 'TS1', name: "Art of Disney Animation", land: "Toon Studio", type: "SHOW", nextShow: getFutureTime(30) },
    { id: 'TS2', name: "Animagique", land: "Toon Studio", type: "SHOW", nextShow: getFutureTime(45) },
    { id: 'TS3', name: "Flying Carpets Over Agrabah", land: "Toon Studio", type: "ATTRACTION", wait: 25, fastpass: true },
    { id: 'TS4', name: "Cars Quatre Roues Rallye", land: "Toon Studio", type: "ATTRACTION", wait: 35 },
    { id: 'TS5', name: "Monster Inc. Scream Scene", land: "Toon Studio", type: "ATTRACTION", wait: 0 },
    { id: 'TS6', name: "Crush's Coaster", land: "Toon Studio", type: "ATTRACTION", wait: 40 },
    { id: 'TS7', name: "Toon Studio Catering CO", land: "Toon Studio", type: "RESTAURANT" },

    // --- PRODUCTION COURTYARD ---
    { id: 'PC1', name: "Cinémagique", land: "Production Courtyard", type: "SHOW", nextShow: getFutureTime(60) },
    { id: 'PC2', name: "The Twilight Zone Tower Of Terror", land: "Production Courtyard", type: "ATTRACTION", wait: getRandomWait(), fastpass: true },
    { id: 'PC3', name: "Studio Tram Tour : Behind the magic", land: "Production Courtyard", type: "ATTRACTION", wait: 30 },
    { id: 'PC4', name: "Stitch Live !", land: "Production Courtyard", type: "SHOW", nextShow: getFutureTime(20) },
    { id: 'PC5', name: "Playhouse Disney - Live on Stage !", land: "Production Courtyard", type: "SHOW", nextShow: getFutureTime(50) },
    { id: 'PC6', name: "Place des stars Lounge", land: "Production Courtyard", type: "RESTAURANT" },
    { id: 'PC7', name: "Rendez-vous des Stars Restaurant", land: "Production Courtyard", type: "RESTAURANT" },
    { id: 'PC8', name: "Café Cafés", land: "Production Courtyard", type: "RESTAURANT" },
    { id: 'PC9', name: "La Terrasse", land: "Production Courtyard", type: "RESTAURANT" },
    { id: 'PC10', name: "Hollywood & Lime", land: "Production Courtyard", type: "RESTAURANT" },
    { id: 'PC11', name: "Kool Zone", land: "Production Courtyard", type: "RESTAURANT" },

    // --- BACKLOT ---
    { id: 'BL1', name: "Rock'n'Roller Coaster starring Aerosmith", land: "Backlot", type: "ATTRACTION", wait: getRandomWait(), fastpass: true },
    { id: 'BL2', name: "Moteurs...Action ! Stunt Show Spectacular", land: "Backlot", type: "SHOW", nextShow: getFutureTime(120) },
    { id: 'BL3', name: "Armageddon - Les Effets Spéciaux", land: "Backlot", type: "ATTRACTION", wait: getRandomWait() },
    { id: 'BL4', name: "Café des Cascadeurs", land: "Backlot", type: "RESTAURANT" },
    { id: 'BL5', name: "Backlot Express", land: "Backlot", type: "RESTAURANT" },

    // --- TOY STORY PLAYLAND ---
    { id: 'TSP1', name: "RC Racer", land: "Toy Story Playland", type: "ATTRACTION", wait: 45 },
    { id: 'TSP2', name: "Slinky Dog ZigZag Spin", land: "Toy Story Playland", type: "ATTRACTION", wait: 15 },
    { id: 'TSP3', name: "Toy Soldiers Parachute Drop", land: "Toy Story Playland", type: "ATTRACTION", wait: 35 }
];


// --- UTILITAIRES DE TRI ---

const getSortCategory = (item) => {
    if (item.type === 'RESTAURANT') return "Restaurants";
    if (item.type === 'SHOW') return "Spectacles";
    
    if (item.wait === 0) return "Passage libre";
    if (item.wait < 20) return "Faible Affluence";
    if (item.wait < 40) return "Attente normale";
    if (item.wait >= 40) return "Attente Élevée";
    return "Fermé / Indisponible";
};

const TIME_CATEGORY_ORDER = [
    "Faible Affluence", 
    "Attente normale", 
    "Attente Élevée", 
    "File à éviter", 
    "Passage libre",
    "Spectacles",
    "Restaurants"
];

// --- GÉNÉRATION HTML ---

const createFavButton = (id) => {
    if (typeof window.isFavorite !== 'function') return '';
    const isActive = window.isFavorite(id);
    return `<button class="fav-btn ${isActive ? 'active' : ''}" data-id="${id}" aria-label="Favoris">${isActive ? '❤️' : '🤍'}</button>`;
};

const createCardHtml = (item) => {
    let statusHtml = '';
    let typeLabel = '';
    let fastpassBadge = '';

    // Badge FastPass (Style Vintage)
    if (item.fastpass) {
        fastpassBadge = `<span style="font-size:0.75em; background:#00287a; color:#fff; padding:3px 8px; border-radius:4px; margin-top:5px; display:inline-block; border: 1px solid #ffc72c;">🎟️ FastPass</span>`;
    }

    if (item.type === 'RESTAURANT') {
        typeLabel = '🍴 Restaurant';
        statusHtml = `<div class="wait-time status-opened">Ouvert</div>`;
    } 
    else if (item.type === 'SHOW') {
        typeLabel = '🎭 Spectacle';
        const d = new Date(item.nextShow);
        const timeStr = d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
        statusHtml = `
            <span style="font-size:0.8em; color:#bbb; display:block; text-align:right; margin-bottom:2px;">Prochain</span>
            <div class="wait-time time-green">${timeStr}</div>`;
    } 
    else {
        typeLabel = '🎢 Attraction';
        if (item.wait === 0) {
            statusHtml = `<div class="wait-time status-opened">Ouvert</div>`;
        } else {
            let colorClass = item.wait < 20 ? 'time-green' : (item.wait < 40 ? 'time-orange' : 'time-red');
            statusHtml = `<div class="wait-time ${colorClass}">${item.wait} min</div>`;
        }
    }

    return `
        <div class="attraction-card" id="card-${item.id}">
            <div class="attraction-info">
                <div style="display:flex; justify-content:space-between; align-items:start; padding-right:10px;">
                    <h3 style="margin:0;">${item.name}</h3>
                    ${createFavButton(item.id)}
                </div>
                <p style="color: #ffc72c; margin-top:2px; font-weight: 600; font-size: 0.85em;">${typeLabel}</p>
                <p style="font-size:0.85em; color:#bbb; margin-top:2px;">📍 ${item.land}</p>
                ${fastpassBadge}
            </div>
            <div class="wait-times-container">
                ${statusHtml}
            </div>
        </div>
    `;
};

// --- LOGIQUE FILTRES & TRI ---

const renderFilters = () => {
    const container = document.querySelector('.search-container');
    if (document.querySelector('.filters-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'filters-toolbar';
    toolbar.innerHTML = `
        <button id="sort-btn" class="btn-sort">
            <span id="sort-icon">📍</span> <span id="sort-text">Trier par Temps</span>
        </button>
    `;
    container.after(toolbar);

    document.getElementById('sort-btn').addEventListener('click', () => {
        isSortedByTime = !isSortedByTime;
        updateSortButtonUI();
        renderNostalgia(); 
    });
};

const updateSortButtonUI = () => {
    const btn = document.getElementById('sort-btn');
    const icon = document.getElementById('sort-icon');
    const text = document.getElementById('sort-text');
    
    if (isSortedByTime) {
        btn.classList.add('active');
        icon.innerText = '⏱️';
        text.innerText = 'Trier par Land';
    } else {
        btn.classList.remove('active');
        icon.innerText = '📍';
        text.innerText = 'Trier par Temps';
    }
};

// --- RENDER ---

const renderNostalgia = () => {
    const listElement = document.getElementById('attractions-list-nostalgia');
    listElement.innerHTML = '';
    let fullHtml = '';

    if (isSortedByTime) {
        // --- TRI PAR TEMPS/TYPE ---
        const byCategory = {};
        TIME_CATEGORY_ORDER.forEach(cat => byCategory[cat] = []);
        
        NOSTALGIA_DATA.forEach(item => {
            const cat = getSortCategory(item);
            if(byCategory[cat]) byCategory[cat].push(item);
        });

        TIME_CATEGORY_ORDER.forEach(cat => {
            if (byCategory[cat].length > 0) {
                let titleColor = '#fff';
                if(cat === "Faible Affluence") titleColor = '#ffc72c';
                else if(cat === "Attente normale") titleColor = 'var(--color-green)';
                else if(cat === "Attente Élevée") titleColor = '#ff8c00';
                else if(cat === "File à éviter") titleColor = 'var(--color-red)';
                else if(cat === "Passage libre") titleColor = '#5bc0de';
                else if(cat === "Spectacles") titleColor = '#bd93f9'; 
                else if(cat === "Restaurants") titleColor = '#f1fa8c'; 

                fullHtml += `<div class="land-group">`;
                fullHtml += `<h2 class="land-header" style="color:${titleColor}; border-bottom-color:${titleColor};">${cat}</h2>`;
                
                byCategory[cat].sort((a, b) => (a.wait || 0) - (b.wait || 0) || a.name.localeCompare(b.name))
                               .forEach(item => fullHtml += createCardHtml(item));
                fullHtml += `</div>`;
            }
        });

    } else {
        // --- TRI PAR LAND (Défaut) ---
        const byLand = NOSTALGIA_DATA.reduce((acc, item) => {
            if (!acc[item.land]) acc[item.land] = [];
            acc[item.land].push(item);
            return acc;
        }, {});

        CONFIG.LAND_ORDER.forEach(land => {
            if (!byLand[land]) return;
            
            fullHtml += `<div class="land-group">`;
            // ⭐ AJOUT DES LOGOS DES LANDS ICI ⭐
            fullHtml += `<div class="land-header-container">
                            <img src="./imgs/logos/${getLogoFileName(land)}" alt="${land}" class="land-logo" onerror="this.style.display='none'">
                            <h2 class="land-header">${land}</h2>
                         </div>`;
            
            // Tri: Attractions > Shows > Restos
            byLand[land].sort((a, b) => {
                const typeOrder = { 'ATTRACTION': 1, 'SHOW': 2, 'RESTAURANT': 3 };
                if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
                return (a.wait || 0) - (b.wait || 0);
            }).forEach(item => fullHtml += createCardHtml(item));
            
            fullHtml += `</div>`;
        });
    }

    listElement.innerHTML = fullHtml;
};

// --- LOGIQUE D'INTERACTION ---

const setupListeners = () => {
    document.body.addEventListener('click', (e) => {
        const favBtn = e.target.closest('.fav-btn');
        if (favBtn && typeof window.toggleFavorite === 'function') {
            e.stopPropagation();
            const id = favBtn.dataset.id;
            window.toggleFavorite(id);
            const isActive = window.isFavorite(id);
            favBtn.classList.toggle('active', isActive);
            favBtn.innerText = isActive ? '❤️' : '🤍';
        }
    });

    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.land-group').forEach(group => {
            const cards = group.querySelectorAll('.attraction-card');
            let hasVisibleCards = false;
            cards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const isMatch = title.includes(term);
                card.style.display = isMatch ? 'flex' : 'none';
                if (isMatch) hasVisibleCards = true;
            });
            group.style.display = hasVisibleCards ? 'flex' : 'none';
            if(hasVisibleCards) group.style.flexDirection = 'column';
        });
    });
};

// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    renderFilters();
    renderNostalgia();
    setupListeners(); 
});