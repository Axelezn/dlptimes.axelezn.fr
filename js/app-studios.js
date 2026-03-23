// js/app-studios.js - V27 (Fix: Favoris réactivés + Tri Couleurs + Passage Libre)

const CONFIG = {
    DESTINATION_ID: 'e8d0207f-da8a-4048-bec8-117aa946b2c2',
    PARK_ID: 'ca888437-ebb4-4d50-aed2-d227f7096968',
    API_URL: 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live',
    REFRESH_INTERVAL: 90000,
    LAND_ORDER: ["Hollywood Boulevard", "World Premiere Plaza", "Toon Studio", "Worlds of Pixar", "Avengers Campus", "Autre / Non Classé"],
    VIRTUAL_QUEUE_ATTRACTIONS: [] 
};

let isSortedByTime = false;
let globalAttractionsData = [];

// --- UTILITAIRES ---

const getLandName = (attraction) => {
    const { externalId = '', name } = attraction;
    if (externalId.startsWith('P2AC')) return "Avengers Campus"; 
    if (externalId.startsWith('P2TM')) return "Toon Studio"; 
    if (externalId.startsWith('P2HA')) return "Hollywood Boulevard"; 
    if (externalId.startsWith('P2ZA')) return "World Premiere Plaza";
    if (externalId.startsWith('P2XA0') || externalId.startsWith('P2E')) return "Worlds of Pixar";
    if (name.includes("Studio Theater") || name.includes("Front Lot")) return "World Premiere Plaza";
    return "Autre / Non Classé";
};

const getLogoFileName = (landName) => landName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') + '_logo.png';

const formatReturnTime = (isoString) => {
    try { return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'); } 
    catch { return 'Heure inconnue'; }
};

// ⭐ TRI ET CATÉGORIES (Nettoyage des noms) ⭐
const getSortCategory = (attraction) => {
    const wait = attraction.queue?.STANDBY?.waitTime;
    
    if (attraction.status !== 'OPERATING' || wait === null || wait === undefined) {
        return "Fermé / Indisponible";
    }

    // Si 0 min => Passage libre 
    if (wait === 0) return "Passage libre";

    let cssClass = 'time-green'; 
    if (typeof getTimeClass === 'function') {
        cssClass = getTimeClass(attraction.name, wait);
    }

    // CORRECTION : Les noms doivent être identiques à ceux de TIME_CATEGORY_ORDER
    if (cssClass.includes('gold')) return "Faible Affluence";
    if (cssClass.includes('green')) return "Attente normale"; // Pas de (Vert) ici !
    if (cssClass.includes('orange')) return "Attente Élevée";
    if (cssClass.includes('red')) return "File à éviter";
    
    return "Attente normale";
};

// Ordre d'affichage
const TIME_CATEGORY_ORDER = [
    "Faible Affluence", 
    "Attente normale", 
    "Attente Élevée", 
    "File à éviter", 
    "Passage libre", 
    "Fermé / Indisponible"
];

// --- GÉNÉRATION HTML ---

const createFavButton = (id) => {
    // Vérification que le gestionnaire de favoris est bien chargé
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
    if (status === 'DOWN') return `<div class="wait-time status-down">Panne Technique</div>`;
    if (status === 'CLOSED' || waitTime === null) return `<div class="wait-time status-closed">Fermé</div>`;
    if (status === 'REFURBISHMENT') return `<div class="wait-time status-closed">Rénov.</div>`;
    if (CONFIG.VIRTUAL_QUEUE_ATTRACTIONS.includes(attractionName) && (waitTime === 0 || waitTime === null)) return `<div class="wait-time status-reservation">Réservation</div>`;
    
    // Affichage "Ouvert" si 0 min
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
            <div class="legend-item"><span class="legend-dot dot-red"></span> Bondée</div>
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

// --- RENDER ---

const renderAttractions = () => {
    const listElement = document.getElementById('attractions-list-studios');
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
                if(cat === "Faible Affluence") titleColor = '#ffc72c';
                else if(cat === "Attente normale") titleColor = 'var(--color-green)';
                else if(cat === "Attente Élevée") titleColor = '#ff8c00';
                else if(cat === "File à éviter") titleColor = 'var(--color-red)';
                else if(cat === "Passage libre") titleColor = '#5bc0de';

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

// ⭐ FIX : Renommé pour plus de clarté et ajout de la logique FAVORIS
const setupListeners = () => {
    document.body.addEventListener('click', (e) => {
        // 1. Gestion des DPA (Premier Access)
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

        // 2. Gestion des Favoris (C'est ce qui manquait !)
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

    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchInput.blur(); } });
    window.addEventListener('scroll', () => { if (document.activeElement === searchInput) searchInput.blur(); }, { passive: true });
};

// --- LOGIQUE PRINCIPALE ---

const fetchAttractionTimes = async () => {
    const listElement = document.getElementById('attractions-list-studios');
    if (!listElement) return console.error("Element #attractions-list-studios introuvable");

    if (!globalAttractionsData.length) listElement.innerHTML = '<div class="loading-message">⌛ Chargement...</div>';

    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('API Error');
        const { liveData = [] } = await response.json();
        
        globalAttractionsData = liveData.filter(e => e.entityType === 'ATTRACTION' && e.parkId === CONFIG.PARK_ID);
        
        if (!globalAttractionsData.length) { listElement.innerHTML = '<div class="loading-message">Aucune attraction trouvée.</div>'; return; }

        renderFilters();
        renderAttractions();

    } catch (error) {
        console.error("Erreur API Studios:", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    fetchAttractionTimes();
    setInterval(fetchAttractionTimes, CONFIG.REFRESH_INTERVAL);
    setupListeners(); // Appel de la fonction corrigée
    setupSearch(); 
});