// js/app-favorites.js - V8 (Fix: Compatibilité IDs Restaurants String/Number)

const FAV_CONFIG = {
    // API 1 : Attractions & Shows
    API_PARKS: 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live',
    
    // API 2 : Meets (DLPWait)
    API_MEETS: "https://api.dlpwait.com/",
    
    QUERY_MEETS: `query { 
        entertainment { 
            id 
            active 
            name 
            category 
            region 
            park { name } 
            services { photoPass virtualQueue } 
            virtualQueue { available } 
            schedules { startTime } 
        } 
    }`,

    // API 3 : Restaurants (Local)
    // Assurez-vous que ce chemin est correct par rapport à votre fichier HTML favoris
    API_RESTOS: 'js/json/restaurants.json',
    
    REFRESH_INTERVAL: 60000,
    
    // IDs
    PARK_ID_DLP: 'dae968d5-630d-4719-8b06-3d107e944401',
    PARK_ID_WDS: 'ca888437-ebb4-4d50-aed2-d227f7096968',
    LANDS_DLP: ["Main Street, U.S.A.", "Frontierland", "Adventureland", "Fantasyland", "Discoveryland"],
    LANDS_WDS: ["Hollywood Boulevard", "World Premiere Plaza", "Toon Studio", "Worlds of Pixar", "Avengers Campus", "World of Frozen", "Adventure Way"]
};

// --- UTILITAIRES ---

const getLandName = (attraction) => {
    const { externalId = '', name } = attraction;
    if (externalId.startsWith('P2AC')) return "Avengers Campus"; 
    if (externalId.startsWith('P2TM')) return "Toon Studio"; 
    if (externalId.startsWith('P2HA')) return "Hollywood Boulevard"; 
    if (externalId.startsWith('P2EA')) return "World of Frozen"; 
    if (externalId.startsWith('P2DA')) return "Adventure Way";
    if (externalId.startsWith('P2ZA') || name.includes("Studio Theater")) return "World Premiere Plaza";
    if (externalId.startsWith('P2XA0') || externalId.startsWith('P2E')) return "Worlds of Pixar";
    if (externalId.startsWith('P1RA')) return "Frontierland"; 
    if (externalId.startsWith('P1DA') || externalId.endsWith('G103')) return "Discoveryland"; 
    if (externalId.startsWith('P1AA')) return "Adventureland"; 
    if (externalId.startsWith('P1NA') || name.includes("Princess Pavilion")) return "Fantasyland"; 
    if (externalId.startsWith('P1MA') || externalId.startsWith('P1GS99')) return "Main Street, U.S.A."; 
    return "Autre / Non Classé";
};

const getLogoFileName = (landName) => landName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') + '_logo.png';

const TRANSLATIONS = {
    "Meet": "Rencontre avec", "and Friends": "et ses amis", "near": "près de", "at": "à",
    "Mickey Mouse": "Mickey", "Minnie Mouse": "Minnie", "Donald Duck": "Donald"
};

const translateText = (text) => {
    if (!text) return "";
    let translated = text;
    Object.keys(TRANSLATIONS).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi'); 
        translated = translated.replace(regex, TRANSLATIONS[key]);
    });
    return translated;
};

const getMinutesUntil = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const now = new Date();
    const showDate = new Date();
    showDate.setHours(h, m, 0, 0);
    if (showDate < now) return null;
    return Math.floor((showDate - now) / 60000);
};

const getTimeBoxClass = (minutes) => {
    if (minutes === null) return 'time-past-box'; 
    if (minutes < 15) return 'time-gold-box';
    if (minutes < 30) return 'time-green-box';
    if (minutes < 45) return 'time-orange-box';
    if (minutes < 60) return 'time-red-box';
    return 'time-far-box';
};

// --- Helpers Restaurants ---
const getTypeIcon = (type) => {
    if (!type) return "🍴";
    const t = type.toLowerCase();
    if (t.includes("rapide")) return "🍔";
    if (t.includes("table")) return "🍽️";
    if (t.includes("buffet")) return "🥗";
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

const createAttractionCard = (entity) => {
    const { id, name, status, entityType } = entity;
    const type = entityType || entity.type; 
    let statusText = status;
    let colorClass = 'status-closed';
    let detailInfo = ''; 

    if (type === 'ATTRACTION') {
        const waitTime = entity.queue?.STANDBY?.waitTime ?? null;
        if (status === 'OPERATING') {
            if (waitTime !== null) {
                statusText = `${waitTime} min`;
                if (typeof getTimeClass === 'function') {
                    colorClass = getTimeClass(name, waitTime);
                } else {
                    colorClass = (waitTime <= 20) ? 'time-green' : (waitTime <= 45) ? 'time-orange' : 'time-red';
                }
                if (waitTime === 0) { statusText = 'Ouvert'; colorClass = 'status-opened'; }
            } else { statusText = 'Ouvert'; colorClass = 'status-opened'; }
        } else if (status === 'DOWN') { statusText = 'Panne'; colorClass = 'status-down'; }
        else if (status === 'REFURBISHMENT') { statusText = 'Rénov.'; }
        else { statusText = 'Fermé'; }
    } 
    else if (type === 'SHOW') {
        const now = new Date();
        const schedules = entity.showtimes || [];
        const nextShow = schedules.map(s => s.startTime || s.endTime).map(t => new Date(t)).filter(d => d > now).sort((a,b) => a - b)[0];
        if (status === 'OPERATING' && nextShow) {
            statusText = nextShow.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            colorClass = 'time-green'; 
            detailInfo = '<span style="font-size:0.8em; color:#bbb;">Prochain</span>';
        } else if (status === 'OPERATING') { statusText = 'Terminé'; colorClass = 'time-default'; }
        else { statusText = 'Fermé'; }
    }

    return `
        <div class="attraction-card" id="card-${id}">
            <div class="attraction-info">
                <h3 style="margin:0 0 5px 0;">${name}</h3>
                <p>${type === 'SHOW' ? 'Spectacle' : 'Attraction'}</p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                ${detailInfo}
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="wait-time ${colorClass}">${statusText}</div>
                    <button class="fav-btn active" onclick="removeFavorite('${id}')">❤️</button>
                </div>
            </div>
        </div>`;
};

const createMeetCard = (char) => {
    const hasSchedules = char.schedules && char.schedules.length > 0;
    const hasVQ = char.virtualQueue && char.virtualQueue.available === true;
    const nameFR = translateText(char.name);
    const regionFR = translateText(char.region || "Lieu non précisé");
    
    const isPhoto = char.services && char.services.photoPass === true;
    let photoLineHtml = '';
    if (isPhoto) {
        photoLineHtml = `<div style="background-color: #ffc72c; color: #00287a; font-weight: 700; text-align: center; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: block; width: 100%; box-sizing: border-box;">📸 PhotoPass</div>`;
    }

    let statusHtml = '';
    let timesHtml = '';

    if (hasVQ) {
        statusHtml = `<div class="show-countdown"><span class="countdown-gold" style="font-size:0.9em;">⚠️ Réservation App Requise</span></div>`;
        timesHtml = `<div class="show-times-container"><span class="show-time-box status-reservation">VQ</span></div>`;
    } else if (hasSchedules) {
        const now = new Date();
        const validSchedules = char.schedules.map(s => s.startTime.substring(0, 5)).filter(time => getMinutesUntil(time) !== null).sort();
        const nextTime = validSchedules.length > 0 ? validSchedules[0] : null;

        if (nextTime) {
            const mins = getMinutesUntil(nextTime);
            let text = `Dans ${mins} min`;
            if (!isPhoto) text = `Dans ${mins} min`;
            if (mins <= 0) text = "Maintenant";
            statusHtml = `<div class="show-countdown"><span class="countdown-default">${text}</span></div>`;
        } else {
            statusHtml = `<div class="show-countdown"><span class="countdown-default">Terminé</span></div>`;
        }
        const scheduleList = char.schedules.map(s => {
            const time = s.startTime.substring(0, 5);
            const boxClass = getTimeBoxClass(getMinutesUntil(time));
            return `<span class="show-time-box ${boxClass}">${time}</span>`;
        }).join('');
        timesHtml = `<div class="show-times-container">${scheduleList}</div>`;
    } else {
        statusHtml = `<div class="show-countdown"><span class="countdown-default">Indisponible</span></div>`;
    }

    return `
        <div class="show-card" id="card-${char.id}">
            <div class="show-info">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h3 style="margin:0;">${nameFR}</h3>
                    <button class="fav-btn active" onclick="removeFavorite('${char.id}')">❤️</button>
                </div>
                <p class="show-park-land">📍 ${regionFR}</p>
            </div>
            <div class="show-schedule">${photoLineHtml}${statusHtml}${timesHtml}</div>
        </div>`;
};

const createRestoCard = (resto) => {
    const icon = getTypeIcon(resto.type);
    const nom = resto.name || resto.titre; 
    const prixHtml = getPriceDisplay(resto.priceRange || resto.prix);
    let badges = '';
    if (resto.reservation) badges += `<span style="font-size:0.75em; background:#00287a; color:#fff; padding:3px 6px; border-radius:4px; margin-right:5px; white-space:nowrap; display:inline-block; margin-top:4px;">📱 Réservation</span>`;
    if (resto.clickAndCollect) badges += `<span style="font-size:0.75em; background:#e67e22; color:#fff; padding:3px 6px; border-radius:4px; margin-right:5px; white-space:nowrap; display:inline-block; margin-top:4px;">🛍️ Click&Collect</span>`;
    let horairesText = resto.horaires || "Horaires NC";
    let horairesClass = (!resto.horaires) ? "time-past-box" : "status-single-rider"; 
    if ((resto.status && resto.status === "CLOSED") || (resto.statut && resto.statut.toLowerCase().includes("fermé"))) {
        horairesText = "Fermé"; horairesClass = "status-closed-single";
    }

    return `
        <div class="attraction-card" id="card-${resto.id}">
            <div class="attraction-info">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h3 style="margin:0;">${nom}</h3>
                    <button class="fav-btn active" onclick="removeFavorite('${resto.id}')">❤️</button>
                </div>
                <p style="color:#ffc72c; margin-top:2px; font-weight:600;">${icon} ${resto.type}</p>
                <p style="font-size:0.85em; color:#bbb; margin-top:2px;">📍 ${resto.land}</p>
                <div style="margin-top:2px;">${badges}</div>
            </div>
            <div class="wait-times-container">
                <div class="wait-time" style="background-color: #222; border: 1px solid #444; color: #fff; padding: 8px 0; min-width: 65px; display:flex; justify-content:center;">${prixHtml}</div>
                <div class="wait-time single-rider-time ${horairesClass}" style="margin-top:5px;">${horairesText}</div>
            </div>
        </div>`;
};

const renderLandSection = (containerHtml, landName, attractions) => {
    if (!attractions || attractions.length === 0) return containerHtml;
    containerHtml += `<div class="land-header-container"><img src="./imgs/logos/${getLogoFileName(landName)}" alt="${landName}" class="land-logo"><h2 class="land-header">${landName}</h2></div>`;
    attractions.sort((a, b) => (a.queue?.STANDBY?.waitTime ?? 999) - (b.queue?.STANDBY?.waitTime ?? 999));
    attractions.forEach(attr => { containerHtml += createAttractionCard(attr); });
    return containerHtml;
};

// --- MAIN ---
window.removeFavorite = (id) => {
    if (typeof window.toggleFavorite === 'function') {
        window.toggleFavorite(id);
        const card = document.getElementById(`card-${id}`);
        if(card) card.remove();
        const listElement = document.getElementById('favorites-list');
        if(listElement && listElement.querySelectorAll('.attraction-card, .show-card').length === 0) {
             listElement.innerHTML = `<div class="fav-empty-message"><h2>Aucun favori 😢</h2><p>Ajoutez des attractions.</p><a href="./index.html" style="color:var(--color-secondary); display:block; margin-top:20px;">Retour à l'accueil</a></div>`;
        }
    }
};

const loadFavoritesPage = async () => {
    const listElement = document.getElementById('favorites-list');
    if (!listElement) return;

    const favoriteIds = typeof window.getFavorites === 'function' ? window.getFavorites() : [];
    if (favoriteIds.length === 0) {
        listElement.innerHTML = `<div class="fav-empty-message"><h2>Aucun favori 😢</h2><p>Ajoutez des attractions, spectacles ou restaurants.</p><a href="./index.html" style="color:var(--color-secondary); display:block; margin-top:20px;">Retour à l'accueil</a></div>`;
        return;
    }

    if (!listElement.innerHTML.trim() || listElement.querySelector('.fav-empty-message')) {
        listElement.innerHTML = '<div class="loading-message">⌛ Chargement...</div>';
    }

    try {
        console.log("🔍 Fetching Data for Favorites...");
        
        // Fetch séparé pour éviter que l'un ne bloque tout
        const parksPromise = fetch(FAV_CONFIG.API_PARKS).then(r => r.json()).catch(e => ({ liveData: [] }));
        
        const meetsPromise = fetch(FAV_CONFIG.API_MEETS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: FAV_CONFIG.QUERY_MEETS })
        }).then(r => {
            if(!r.ok) throw new Error("Meets API error: " + r.status);
            return r.json();
        }).catch(e => {
            console.error("❌ Meets Fetch Error:", e);
            return { data: { entertainment: [] } }; // Fallback vide
        });

        // ⭐ Modification ici pour rendre le fetch restaurants robuste ⭐
        const restosPromise = fetch(FAV_CONFIG.API_RESTOS)
            .then(r => {
                if(!r.ok) throw new Error("File introuvable"); 
                return r.json();
            })
            .catch(e => {
                console.warn("⚠️ Impossible de charger restaurants.json (vérifiez le chemin)", e);
                return []; 
            });

        const [dataParks, dataMeets, dataRestos] = await Promise.all([parksPromise, meetsPromise, restosPromise]);

        // ⭐ LE CORRECTIF EST ICI (String conversion) ⭐
        const myFavAttractions = (dataParks.liveData || []).filter(e => favoriteIds.includes(String(e.id)));
        const myFavMeets = (dataMeets.data?.entertainment || []).filter(e => favoriteIds.includes(String(e.id)));
        const myFavRestos = (dataRestos || []).filter(e => favoriteIds.includes(String(e.id))); // Force string ID

        console.log(`✅ Found: ${myFavAttractions.length} Attractions, ${myFavMeets.length} Meets, ${myFavRestos.length} Restos`);

        const attrDLP = myFavAttractions.filter(e => e.entityType === 'ATTRACTION' && e.parkId === FAV_CONFIG.PARK_ID_DLP);
        const attrWDS = myFavAttractions.filter(e => e.entityType === 'ATTRACTION' && e.parkId === FAV_CONFIG.PARK_ID_WDS);
        const shows = myFavAttractions.filter(e => e.entityType === 'SHOW'); 
        
        let html = '';

        if (attrDLP.length > 0) {
            html += `<h1 class="park-show-header" style="margin-top:10px;">Parc Disneyland</h1>`;
            const byLand = attrDLP.reduce((acc, attr) => {
                const land = getLandName(attr);
                if (!acc[land]) acc[land] = []; acc[land].push(attr); return acc;
            }, {});
            FAV_CONFIG.LANDS_DLP.concat(["Autre / Non Classé"]).forEach(land => { html = renderLandSection(html, land, byLand[land]); });
        }

        if (attrWDS.length > 0) {
            html += `<h1 class="park-show-header" style="margin-top:40px;">Disney Adventure World</h1>`;
            const byLand = attrWDS.reduce((acc, attr) => {
                const land = getLandName(attr);
                if (!acc[land]) acc[land] = []; acc[land].push(attr); return acc;
            }, {});
            FAV_CONFIG.LANDS_WDS.concat(["Autre / Non Classé"]).forEach(land => { html = renderLandSection(html, land, byLand[land]); });
        }

        if (shows.length > 0) {
            html += `<div style="margin-top:50px; border-top: 2px solid var(--color-secondary); padding-top:20px;"></div><h1 class="park-show-header">SPECTACLES 🎭</h1>`;
            shows.forEach(show => { html += createAttractionCard(show); });
        }

        if (myFavMeets.length > 0) {
            html += `<div style="margin-top:50px; border-top: 2px solid var(--color-secondary); padding-top:20px;"></div><h1 class="park-show-header">RENCONTRES 📸</h1>`;
            myFavMeets.sort((a,b) => a.name.localeCompare(b.name));
            myFavMeets.forEach(meet => { html += createMeetCard(meet); });
        }

        if (myFavRestos.length > 0) {
            html += `<div style="margin-top:50px; border-top: 2px solid var(--color-secondary); padding-top:20px;"></div><h1 class="park-show-header">RESTAURANTS 🍽️</h1>`;
            myFavRestos.sort((a,b) => (a.name || a.titre).localeCompare(b.name || b.titre));
            myFavRestos.forEach(resto => { html += createRestoCard(resto); });
        }

        listElement.innerHTML = html;

    } catch (error) {
        console.error("Critical Error Favoris:", error);
        listElement.innerHTML = `<div class="loading-message status-closed">Erreur de chargement. Vérifiez la console.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadFavoritesPage();
    setInterval(loadFavoritesPage, FAV_CONFIG.REFRESH_INTERVAL);
});