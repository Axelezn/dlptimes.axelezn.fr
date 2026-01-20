// js/app-favorites.js - V3.1 (Correction conflit getTimeClass)

const CONFIG = {
    API_URL: 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live',
    REFRESH_INTERVAL: 60000,
    PARK_ID_DLP: 'dae968d5-630d-4719-8b06-3d107e944401',
    PARK_ID_WDS: 'ca888437-ebb4-4d50-aed2-d227f7096968',
    
    LANDS_DLP: ["Main Street, U.S.A.", "Frontierland", "Adventureland", "Fantasyland", "Discoveryland"],
    LANDS_WDS: ["Hollywood Boulevard", "Production Courtyard / Front Lot", "Toon Studio", "Worlds of Pixar", "Avengers Campus"]
};

// --- UTILITAIRES ---

const getLandName = (attraction) => {
    const { externalId = '', name } = attraction;
    // WDS
    if (externalId.startsWith('P2AC')) return "Avengers Campus"; 
    if (externalId.startsWith('P2TM')) return "Toon Studio"; 
    if (externalId.startsWith('P2HA')) return "Hollywood Boulevard"; 
    if (externalId.startsWith('P2ZA') || name.includes("Studio Theater")) return "Production Courtyard / Front Lot";
    if (externalId.startsWith('P2XA0') || externalId.startsWith('P2E')) return "Worlds of Pixar";
    // DLP
    if (externalId.startsWith('P1RA')) return "Frontierland"; 
    if (externalId.startsWith('P1DA') || externalId.endsWith('G103')) return "Discoveryland"; 
    if (externalId.startsWith('P1AA')) return "Adventureland"; 
    if (externalId.startsWith('P1NA') || name.includes("Princess Pavilion")) return "Fantasyland"; 
    if (externalId.startsWith('P1MA') || externalId.startsWith('P1GS99')) return "Main Street, U.S.A."; 
    
    return "Autre / Non Classé";
};

const getLogoFileName = (landName) => 
    landName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') + '_logo.png';

const getParkName = (parkId) => {
    if (parkId === CONFIG.PARK_ID_DLP) return "Disneyland Park";
    if (parkId === CONFIG.PARK_ID_WDS) return "Walt Disney Studios";
    return "";
};

// --- GÉNÉRATION HTML ---

const createFavoriteCard = (entity) => {
    const { id, name, status, entityType } = entity;
    const type = entityType || entity.type; 
    
    let statusText = status;
    let colorClass = 'status-closed';
    let detailInfo = ''; 

    // 1. GESTION ATTRACTIONS
    if (type === 'ATTRACTION') {
        const waitTime = entity.queue?.STANDBY?.waitTime ?? null;
        
        if (status === 'OPERATING') {
            if (waitTime !== null) {
                statusText = `${waitTime} min`;
                
                // ⭐ CORRECTION : Utilisation de la fonction globale (timetables.js)
                if (typeof getTimeClass === 'function') {
                    colorClass = getTimeClass(name, waitTime);
                } else {
                    // Fallback simple si le fichier n'est pas chargé
                    colorClass = (waitTime <= 20) ? 'time-green' : (waitTime <= 45) ? 'time-orange' : 'time-red';
                }

                if (waitTime === 0) { statusText = 'Ouvert'; colorClass = 'status-opened'; }
            } else {
                statusText = 'Ouvert';
                colorClass = 'status-opened';
            }
        } else if (status === 'DOWN') {
            statusText = 'Panne';
            colorClass = 'status-down';
        } else if (status === 'REFURBISHMENT') {
            statusText = 'Rénov.';
        } else {
            statusText = 'Fermé';
        }
    } 
    // 2. GESTION SPECTACLES (SHOW)
    else if (type === 'SHOW') {
        const now = new Date();
        const schedules = entity.showtimes || [];
        const nextShow = schedules
            .map(s => s.startTime || s.endTime)
            .map(t => new Date(t))
            .filter(d => d > now)
            .sort((a,b) => a - b)[0];

        if (status === 'OPERATING' && nextShow) {
            statusText = nextShow.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            colorClass = 'time-green'; 
            detailInfo = '<span style="font-size:0.8em; color:#bbb;">Prochain</span>';
        } else if (status === 'OPERATING') {
            statusText = 'Terminé';
            colorClass = 'time-default';
        } else {
            statusText = 'Fermé';
        }
    }

    const heartBtn = `
        <button class="fav-btn active" 
                onclick="removeFavorite('${id}')">
            ❤️
        </button>`;

    return `
        <div class="attraction-card" id="card-${id}">
            <div class="attraction-info">
                <h3 style="margin:0 0 5px 0;">${name}</h3>
                <p>${getParkName(entity.parkId)}</p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                ${detailInfo}
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="wait-time ${colorClass}">${statusText}</div>
                    ${heartBtn}
                </div>
            </div>
        </div>
    `;
};

// --- LOGIQUE D'AFFICHAGE PAR SECTION ---

const renderLandSection = (containerHtml, landName, attractions) => {
    if (!attractions || attractions.length === 0) return containerHtml;

    containerHtml += `
        <div class="land-header-container">
            <img src="./imgs/logos/${getLogoFileName(landName)}" alt="${landName}" class="land-logo">
            <h2 class="land-header">${landName}</h2>
        </div>
    `;
    
    attractions.sort((a, b) => {
        const waitA = a.queue?.STANDBY?.waitTime ?? 999;
        const waitB = b.queue?.STANDBY?.waitTime ?? 999;
        return waitA - waitB;
    });

    attractions.forEach(attr => {
        containerHtml += createFavoriteCard(attr);
    });

    return containerHtml;
};

// --- LOGIQUE PRINCIPALE ---

window.removeFavorite = (id) => {
    if (typeof window.toggleFavorite === 'function') {
        window.toggleFavorite(id);
        loadFavoritesPage(); 
    }
};

const loadFavoritesPage = async () => {
    const listElement = document.getElementById('favorites-list');
    if (!listElement) return;

    const favoriteIds = typeof window.getFavorites === 'function' ? window.getFavorites() : [];

    if (favoriteIds.length === 0) {
        listElement.innerHTML = `
            <div class="fav-empty-message">
                <h2>Aucun favori 😢</h2>
                <p>Ajoutez des attractions ou spectacles pour les voir ici.</p>
                <a href="./index.html" style="color:var(--color-secondary); display:block; margin-top:20px;">Retour à l'accueil</a>
            </div>`;
        return;
    }

    if (!listElement.innerHTML.trim() || listElement.querySelector('.fav-empty-message')) {
        listElement.innerHTML = '<div class="loading-message">⌛ Chargement de vos favoris...</div>';
    }

    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('API Error');
        
        const { liveData = [] } = await response.json();
        const myFavs = liveData.filter(entity => favoriteIds.includes(entity.id));
        
        const attrDLP = myFavs.filter(e => e.entityType === 'ATTRACTION' && e.parkId === CONFIG.PARK_ID_DLP);
        const attrWDS = myFavs.filter(e => e.entityType === 'ATTRACTION' && e.parkId === CONFIG.PARK_ID_WDS);
        const showsDLP = myFavs.filter(e => e.entityType === 'SHOW' && e.parkId === CONFIG.PARK_ID_DLP);
        const showsWDS = myFavs.filter(e => e.entityType === 'SHOW' && e.parkId === CONFIG.PARK_ID_WDS);

        let html = '';

        if (attrDLP.length > 0) {
            html += `<h1 class="park-show-header" style="margin-top:10px;">Parc Disneyland</h1>`;
            const byLand = attrDLP.reduce((acc, attr) => {
                const land = getLandName(attr);
                if (!acc[land]) acc[land] = [];
                acc[land].push(attr);
                return acc;
            }, {});
            CONFIG.LANDS_DLP.concat(["Autre / Non Classé"]).forEach(land => {
                html = renderLandSection(html, land, byLand[land]);
            });
        }

        if (attrWDS.length > 0) {
            html += `<h1 class="park-show-header" style="margin-top:40px;">Walt Disney Studios</h1>`;
            const byLand = attrWDS.reduce((acc, attr) => {
                const land = getLandName(attr);
                if (!acc[land]) acc[land] = [];
                acc[land].push(attr);
                return acc;
            }, {});
            CONFIG.LANDS_WDS.concat(["Autre / Non Classé"]).forEach(land => {
                html = renderLandSection(html, land, byLand[land]);
            });
        }

        if (showsDLP.length > 0 || showsWDS.length > 0) {
            html += `<div style="margin-top:50px; border-top: 2px solid var(--color-secondary); padding-top:20px;"></div>`;
            html += `<h1 class="park-show-header" style="font-size:2em;">SPECTACLES 🎭</h1>`;

            if (showsDLP.length > 0) {
                html += `<h2 class="land-header" style="margin:20px 0 10px; color:var(--color-secondary);">Parc Disneyland</h2>`;
                showsDLP.sort((a,b) => a.name.localeCompare(b.name)).forEach(show => {
                    html += createFavoriteCard(show);
                });
            }

            if (showsWDS.length > 0) {
                html += `<h2 class="land-header" style="margin:30px 0 10px; color:var(--color-secondary);">Walt Disney Studios</h2>`;
                showsWDS.sort((a,b) => a.name.localeCompare(b.name)).forEach(show => {
                    html += createFavoriteCard(show);
                });
            }
        }

        listElement.innerHTML = html;

    } catch (error) {
        console.error("Erreur Favoris:", error);
        listElement.innerHTML = `<div class="loading-message status-closed">Erreur de chargement.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadFavoritesPage();
    setInterval(loadFavoritesPage, CONFIG.REFRESH_INTERVAL);
});