// js/app-park.js - V26 (Fix: 0min classé dans "Normal" + Moyenne sous titre)

const CONFIG = {
    DESTINATION_ID: 'e8d0207f-da8a-4048-bec8-117aa946b2c2',
    PARK_ID: 'dae968d5-630d-4719-8b06-3d107e944401', 
    API_URL: 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live',
    REFRESH_INTERVAL: 90000,
    LAND_ORDER: ["Main Street, U.S.A.", "Frontierland", "Adventureland", "Fantasyland", "Discoveryland", "Autre / Non Classé"],
    VIRTUAL_QUEUE_ATTRACTIONS: ["Meet Mickey Mouse", "Welcome to Starport: A Star Wars Encounter", "Princess Pavilion"],
    SHOOTING_GALLERY_NAME: "Rustler Roundup Shootin' Gallery"
};

let isSortedByTime = false; 
let globalAttractionsData = []; 

// --- UTILITAIRES ---

const getLandName = (attraction) => {
    const { externalId = '', name } = attraction;
    if (externalId.startsWith('P1RA')) return "Frontierland"; 
    if (externalId.startsWith('P1DA')) return "Discoveryland"; 
    if (externalId.startsWith('P1AA')) return "Adventureland"; 
    if (externalId.startsWith('P1NA')) return "Fantasyland"; 
    if (externalId.startsWith('P1MA')) return "Main Street, U.S.A."; 
    if (name.includes("Princess Pavilion")) return "Fantasyland";
    return "Autre / Non Classé";
};

const getLogoFileName = (landName) => landName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') + '_logo.png';

const formatReturnTime = (isoString) => {
    try { return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'); } 
    catch { return 'Heure inconnue'; }
};

// ⭐ FIX ICI : 0 min => Catégorie Normale (Vert) ⭐
const getSortCategory = (attraction) => {
    const wait = attraction.queue?.STANDBY?.waitTime;
    
    // Si fermé ou pas de temps
    if (attraction.status !== 'OPERATING' || wait === null || wait === undefined) {
        return "Fermé / Indisponible";
    }

    // EXCEPTION : Si 0 min, on le force dans le vert
    if (wait === 0) return "Attente normale (Vert)";

    // Sinon, on suit la logique des couleurs
    let cssClass = 'time-green'; 
    if (typeof getTimeClass === 'function') {
        cssClass = getTimeClass(attraction.name, wait);
    }

    // Mapping Classe CSS -> Titre du groupe
    if (cssClass.includes('gold')) return "Faible Affluence (Gold)";
    if (cssClass.includes('green')) return "Attente normale (Vert)";
    if (cssClass.includes('orange')) return "Attente Élevée (Orange)";
    if (cssClass.includes('red')) return "File à éviter (Rouge)";
    
    return "Attente normale (Vert)"; // Fallback
};

const TIME_CATEGORY_ORDER = [
    "Faible Affluence (Gold)", 
    "Attente normale (Vert)", 
    "Attente Élevée (Orange)", 
    "File à éviter (Rouge)", 
    "Fermé / Indisponible"
];

// --- GÉNÉRATION HTML ---

const createFavButton = (id) => {
    if (typeof window.isFavorite !== 'function') return '';
    const isActive = window.isFavorite(id);
    const heart = isActive ? '❤️' : '🤍';
    const activeClass = isActive ? 'active' : '';
    return `<button class="fav-btn ${activeClass}" data-id="${id}" aria-label="Favoris">${heart}</button>`;
};

const createDpaHtml = (queue) => {
    const dpaQueue = queue?.PAID_RETURN_TIME;
    if (dpaQueue?.state === 'AVAILABLE') {
        const price = dpaQueue.price?.formatted || 'Prix NC';
        const start = formatReturnTime(dpaQueue.returnStart);
        const end = formatReturnTime(dpaQueue.returnEnd);
        return `<div class="dpa-details-container"><div class="dpa-toggle-header"><p class="dpa-label">Premier Access ⚡</p><span class="dpa-toggle-icon">▼</span></div><div class="dpa-details" style="display:none;"><span class="dpa-info dpa-price-label">Prix : </span><span class="dpa-info dpa-price">${price}</span><span class="dpa-info dpa-time-label">Retour : </span><span class="dpa-info dpa-time">${start} - ${end}</span></div></div>`;
    } 
    if (dpaQueue?.state === 'SOLD_OUT') return `<div class="dpa-details-container"><p class="dpa-label status-closed-single">Premier Access : Épuisé</p></div>`;
    return '';
};

const createWaitTimeHtml = (status, waitTime, attractionName) => {
    if (attractionName === CONFIG.SHOOTING_GALLERY_NAME && status === 'OPERATING') return `<div class="wait-time status-payant">Ouvert : 3€</div>`;
    if (status === 'DOWN') return `<div class="wait-time status-down">Panne</div>`;
    if (status === 'CLOSED' || waitTime === null) return `<div class="wait-time status-closed">Fermé</div>`;
    if (status === 'REFURBISHMENT') return `<div class="wait-time status-closed">Rénov.</div>`;
    if (CONFIG.VIRTUAL_QUEUE_ATTRACTIONS.includes(attractionName) && (waitTime === 0 || waitTime === null)) return `<div class="wait-time status-reservation">Sur réservation</div>`;
    if (waitTime === 0) return `<div class="wait-time status-opened">Ouvert</div>`;
    
    let colorClass = 'time-green'; 
    if (typeof getTimeClass === 'function') {
        colorClass = getTimeClass(attractionName, waitTime);
    }

    return `<div class="wait-time ${colorClass}">${waitTime} min</div>`;
};

const createSingleRiderHtml = (srTime) => {
    if (srTime === null || srTime < 0) return '';
    return `<div class="wait-time single-rider-time ${srTime === 0 ? 'status-closed-single' : 'status-single-rider'}">${srTime === 0 ? 'Single Rider : Fermé' : `Single Rider : ${srTime} min`}</div>`;
};

const createAttractionCardHtml = (attraction, land) => {
    const { id, name, status, queue } = attraction;
    const waitTime = (queue?.STANDBY?.waitTime !== undefined) ? queue.STANDBY.waitTime : null;
    let dpaHtml = createDpaHtml(queue);
    if (status !== 'OPERATING' && queue?.PAID_RETURN_TIME) dpaHtml = `<div class="dpa-details-container"><p class="dpa-label status-closed-single">Premier Access : Fermé</p></div>`;

    return `
        <div class="attraction-card" id="card-${id}">
            <div class="attraction-info">
                <div style="display:flex; justify-content:space-between; align-items:start; padding-right:10px;">
                    <h3 style="margin:0;">${name}</h3>
                    ${createFavButton(id)}
                </div>
                <p>${land}</p>
                ${dpaHtml}
            </div>
            <div class="wait-times-container">
                ${createWaitTimeHtml(status, waitTime, name)}
                ${createSingleRiderHtml(queue?.SINGLE_RIDER?.waitTime ?? null)}
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
        <div class="legend-container">
            <p style="margin:0; font-weight:600; font-size:0.9em;">Affluence : </p>
            <div class="legend-item"><span class="legend-dot dot-gold"></span> Très faible</div>
            <div class="legend-item"><span class="legend-dot dot-green"></span> Normale</div>
            <div class="legend-item"><span class="legend-dot dot-orange"></span> Elevée</div>
            <div class="legend-item"><span class="legend-dot dot-red"></span>Bondée</div>
        </div>
    `;
    container.after(toolbar);

    document.getElementById('sort-btn').addEventListener('click', () => {
        isSortedByTime = !isSortedByTime;
        updateSortButtonUI();
        renderAttractions(); 
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

// --- LOGIQUE D'AFFICHAGE (RENDER) ---

const renderAttractions = () => {
    const listElement = document.getElementById('attractions-list');
    listElement.innerHTML = '';

    if (!globalAttractionsData.length) {
        listElement.innerHTML = '<div class="loading-message">Aucune donnée disponible.</div>';
        return;
    }

    let fullHtml = '';

    if (isSortedByTime) {
        // --- TRI PAR TEMPS ---
        const byTime = {};
        TIME_CATEGORY_ORDER.forEach(cat => byTime[cat] = []); 
        
        globalAttractionsData.forEach(attr => {
            const cat = getSortCategory(attr);
            if(byTime[cat]) byTime[cat].push(attr);
            else { 
                if(!byTime["Fermé / Indisponible"]) byTime["Fermé / Indisponible"] = [];
                byTime["Fermé / Indisponible"].push(attr);
            }
        });

        TIME_CATEGORY_ORDER.forEach(cat => {
            if (byTime[cat] && byTime[cat].length > 0) {
                let titleColor = '#fff';
                if(cat.includes('Gold')) titleColor = '#ffc72c';
                else if(cat.includes('Vert')) titleColor = 'var(--color-green)';
                else if(cat.includes('Orange')) titleColor = '#ff8c00';
                else if(cat.includes('Rouge')) titleColor = 'var(--color-red)';

                fullHtml += `<div class="land-group">`;
                fullHtml += `<h2 class="land-header" style="color:${titleColor}; border-bottom-color:${titleColor};">${cat}</h2>`;
                
                byTime[cat].sort((a, b) => {
                    const wa = a.queue?.STANDBY?.waitTime ?? 999;
                    const wb = b.queue?.STANDBY?.waitTime ?? 999;
                    if(wa !== wb) return wa - wb;
                    return a.name.localeCompare(b.name);
                }).forEach(attr => {
                    fullHtml += createAttractionCardHtml(attr, getLandName(attr));
                });
                fullHtml += `</div>`;
            }
        });

    } else {
        // --- TRI PAR LAND ---
        const byLand = globalAttractionsData.reduce((acc, attr) => {
            const land = getLandName(attr);
            if (!acc[land]) acc[land] = [];
            acc[land].push(attr);
            return acc;
        }, {});

        CONFIG.LAND_ORDER.forEach(land => {
            if (!byLand[land]) return;

            fullHtml += `<div class="land-group">`;
            fullHtml += `<div class="land-header-container"><img src="./imgs/logos/${getLogoFileName(land)}" alt="${land}" class="land-logo"><h2 class="land-header">${land}</h2></div>`;

            byLand[land].sort((a, b) => {
                if (typeof window.isFavorite === 'function') {
                    const favA = window.isFavorite(a.id);
                    const favB = window.isFavorite(b.id);
                    if (favA !== favB) return favB - favA;
                }
                const statusA = a.status === 'OPERATING' ? 0 : 1;
                const statusB = b.status === 'OPERATING' ? 0 : 1;
                if (statusA !== statusB) return statusA - statusB;
                return (a.queue?.STANDBY?.waitTime ?? 999) - (b.queue?.STANDBY?.waitTime ?? 999);
            }).forEach(attr => fullHtml += createAttractionCardHtml(attr, land));
            
            fullHtml += `</div>`;
        });
    }

    listElement.innerHTML = fullHtml;
    
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input'));
};

// --- LOGIQUE D'INTERACTION ---

const setupListeners = () => {
    document.body.addEventListener('click', (e) => {
        const header = e.target.closest('.dpa-toggle-header');
        if (header) {
            const details = header.nextElementSibling;
            const icon = header.querySelector('.dpa-toggle-icon');
            if (details) {
                const isHidden = details.style.display === 'none';
                details.style.display = isHidden ? 'flex' : 'none';
                icon?.classList.toggle('rotated', isHidden);
            }
            return;
        }

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
};

const setupSearch = () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.land-group').forEach(group => {
            const cards = group.querySelectorAll('.attraction-card');
            let hasVisible = false;
            cards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const match = title.includes(term);
                card.style.display = match ? 'flex' : 'none';
                if (match) hasVisible = true;
            });
            group.style.display = hasVisible ? 'flex' : 'none';
            if(hasVisible) group.style.flexDirection = 'column';
        });
    });

    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchInput.blur(); } });
    window.addEventListener('scroll', () => { if (document.activeElement === searchInput) searchInput.blur(); }, { passive: true });
};

// --- LOGIQUE PRINCIPALE ---

const fetchAttractionTimes = async () => {
    const listElement = document.getElementById('attractions-list');
    if (!listElement) return;

    if (!globalAttractionsData.length) listElement.innerHTML = '<div class="loading-message">⌛ Chargement...</div>';

    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('API Error');
        const { liveData = [] } = await response.json();
        
        globalAttractionsData = liveData
            .filter(e => e.entityType === 'ATTRACTION' && e.parkId === CONFIG.PARK_ID)
            .map(e => ({ ...e }));
        
        renderFilters();
        renderAttractions();

    } catch (error) {
        console.error(error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    fetchAttractionTimes();
    setInterval(fetchAttractionTimes, CONFIG.REFRESH_INTERVAL);
    setupListeners();
    setupSearch();
});