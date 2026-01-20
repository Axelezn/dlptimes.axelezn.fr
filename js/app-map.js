// js/app-map.js - V27 (Refactoring ES6+ & Optimisation)

// ⭐ CONFIGURATION
const CONFIG = {
    DESTINATION_ID: 'e8d0207f-da8a-4048-bec8-117aa946b2c2',
    API_URL: 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live',
    URLS: {
        COORDS: './js/json/dlp-coords.json',
        SHOPS: './js/json/shops.json',
        DINING: './js/json/restaurants.json',
        MEETS: './js/json/meets.json'
    },
    REFRESH_INTERVAL: 60000,
    MAP_CENTER: [48.8694922, 2.7804949],
    INITIAL_ZOOM: 16,
    FILTER_TYPES: ['ALL', 'ATTRACTION', 'SHOW', 'MEET', 'SHOP', 'RESTAURANT']
};

let map;
let markersLayer;
let allStaticCoordinates = [];
let activeFilters = new Set(['ATTRACTION']); // Filtre initial

// --- UTILITAIRES ---

/**
 * Récupère les infos du prochain show/meet.
 */
const getNextShowInfo = (entity) => {
    const allScheduleData = entity.showtimes || entity.schedule?.schedule || entity.horaires || [];
    const now = new Date();

    const futureScheduleData = allScheduleData
        .map(item => {
            const timeString = item.startTime || item.endTime || item;
            let dateObj = new Date();

            // Gestion HH:MM vs Date complète
            if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
                const [hours, minutes] = timeString.split(':').map(Number);
                dateObj.setHours(hours, minutes, 0, 0);
            } else {
                dateObj = new Date(timeString); // Clone si déjà date ou parse string
            }
            return { raw: timeString, date: dateObj };
        })
        .filter(item => item.date > now)
        .sort((a, b) => a.date - b.date);

    if (!futureScheduleData.length) return { time: null, minutes: Infinity, isLive: false };

    const nextItem = futureScheduleData[0];
    const formattedTime = nextItem.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const diffInMinutes = Math.floor((nextItem.date - now) / 60000);
    const isLive = diffInMinutes <= 5 && diffInMinutes >= -10;

    return { time: formattedTime, minutes: diffInMinutes, isLive };
};

/**
 * Détermine la couleur en fonction du statut ou de l'attente.
 */
const getStatusColor = (entity) => {
    const { status, entityType, type = entityType, queue } = entity;

    // Statuts prioritaires
    if (['CLOSED', 'DOWN'].includes(status)) return '#dc3545';
    if (['REFURBISHMENT', 'UPCOMING'].includes(status)) return '#ffc107';
    if (status === 'UNKNOWN') return '#0d6fdc';

    // Shows & Meets
    if (['SHOW', 'MEET'].includes(type) && status === 'OPERATING') {
        const { minutes, isLive } = getNextShowInfo(entity);
        if (minutes === Infinity) return '#dc3545';
        if (isLive) return '#ffc107';
        if (minutes < 15) return '#fd7e14';
        if (minutes < 30) return '#ffc107';
        return minutes < 60 ? '#28a745' : '#198754';
    }

    // Attractions
    if (type === 'ATTRACTION' && status === 'OPERATING') {
        const waitTime = queue?.STANDBY?.waitTime;
        if (typeof waitTime === 'number') {
            if (waitTime === 0) return '#198754';
            if (waitTime <= 20) return '#28a745';
            if (waitTime <= 45) return '#ffc107';
            if (waitTime <= 75) return '#fd7e14';
            return '#dc3545';
        }
    }

    return '#198754'; // Par défaut (Shops, Resto ouverts)
};

/**
 * Crée l'icône Leaflet.
 */
const createCustomIcon = (entity) => {
    const color = getStatusColor(entity);
    const type = entity.entityType || entity.type;
    
    const icons = {
        SHOW: 'fas fa-mask',
        RESTAURANT: 'fas fa-utensils',
        DINING: 'fas fa-utensils',
        SHOP: 'fas fa-shopping-bag',
        MEET: 'fas fa-star',
        ATTRACTION: 'fas fa-map-marker-alt'
    };

    const iconClass = icons[type] || icons.ATTRACTION;

    return L.divIcon({
        html: `<div style="color: ${color}; font-size: 24px;"><i class="${iconClass}"></i></div>`,
        className: 'custom-map-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -20]
    });
};

// --- TEXTES ET POPUPS ---

const getWaitTimeText = (entity) => {
    const { status, entityType, type = entityType, queue, reservationParc, fileAttenteVirtuelle, features } = entity;

    if (['SHOP', 'RESTAURANT', 'DINING'].includes(type)) return null;
    if (status === 'UPCOMING') return 'BIENTÔT';
    if (['REFURBISHMENT'].includes(status)) return 'RÉNO';
    if (['CLOSED', 'DOWN'].includes(status)) return 'FERMÉ';

    if (type === 'ATTRACTION' && status === 'OPERATING') {
        const standby = queue?.STANDBY?.waitTime;
        if (typeof standby === 'number') return standby > 0 ? `${standby} min` : '0 min';
        
        const paid = queue?.PAID_RETURN_TIME;
        if (paid?.state === 'AVAILABLE') return `PA ${paid.price.amount / 100}€`;
        
        return null;
    }

    if (['SHOW', 'MEET'].includes(type)) {
        const info = getNextShowInfo(entity);
        if (info.isLive) return 'LIVE';
        if (info.time) return info.time;

        // Gestion spécifique "Réservation" pour les Meets
        const requiresRes = reservationParc || fileAttenteVirtuelle || features?.includes('PAID_ACCESS') || features?.includes('BOOKABLE');
        if (type === 'MEET' && requiresRes && info.minutes === Infinity) return 'RÉSERVATION';

        return 'AUCUN';
    }

    return null;
};

const createPopupContent = (entity) => {
    const { name = 'POI Inconnu', status = 'Statut Inconnu', entityType, type = entityType, queue, priceRange } = entity;
    
    let title = 'Détails';
    let details = 'N/A';
    let statusDisplay = `<span style="color: ${getStatusColor(entity)};"><strong>Statut :</strong> ${status}</span>`;

    if (status === 'UPCOMING') {
        title = 'Ouverture';
        details = 'Ouverture prochaine';
        statusDisplay = `<span style="color: ${getStatusColor(entity)};"><strong>Statut :</strong> BIENTÔT</span>`;
    
    } else if (type === 'ATTRACTION' && queue) {
        title = 'Attente';
        const items = [];
        
        if (queue.STANDBY?.waitTime !== undefined) items.push(`Classique : <strong>${queue.STANDBY.waitTime} min</strong>`);
        
        const paid = queue.PAID_RETURN_TIME;
        if (paid?.state === 'AVAILABLE') {
            const time = paid.returnStart ? ` (${paid.returnStart.substring(11, 16)})` : '';
            items.push(`Premier Access : <strong>${paid.price.formatted}${time}</strong>`);
        } else if (paid?.state === 'SOLD_OUT') {
            items.push(`Premier Access : <strong>Épuisé</strong>`);
        }
        
        if (queue.SINGLE_RIDER?.waitTime !== undefined) items.push(`Single Rider : <strong>${queue.SINGLE_RIDER.waitTime} min</strong>`);
        if (queue.VIRTUAL_QUEUE?.state === 'AVAILABLE') items.push(`File Virtuelle : <strong>Disponible</strong>`);
        
        details = items.length ? items.join('<br>') : 'N/A';

    } else if (['SHOW', 'MEET'].includes(type) && (status === 'OPERATING' || status === 'UNKNOWN')) {
        title = 'Horaires';
        // Réutilisation de la logique de tri de getNextShowInfo mais pour l'affichage complet
        const info = getNextShowInfo(entity); // Simplification: on affiche juste le prochain ici ou une liste
        
        // Pour afficher la liste des 5 prochains (logique complète)
        const allData = entity.showtimes || entity.schedule?.schedule || entity.horaires || [];
        const now = new Date();
        const next5 = allData
            .map(t => {
                const ts = t.startTime || t.endTime || t;
                if (typeof ts === 'string' && ts.match(/^\d{2}:\d{2}$/)) {
                    const [h, m] = ts.split(':');
                    const d = new Date(); d.setHours(h, m, 0, 0);
                    return { str: ts, date: d };
                }
                return { str: new Date(ts).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}), date: new Date(ts) };
            })
            .filter(o => o.date > now)
            .sort((a, b) => a.date - b.date)
            .slice(0, 5)
            .map(o => o.str);

        details = next5.length ? `Prochains : <strong>${next5.join(' | ')}</strong>` : 'Aucune représentation à venir.';

        // Détails spécifiques MEET
        if (type === 'MEET') {
            const extras = [];
            const vq = queue?.VIRTUAL_QUEUE?.state;
            
            if (vq === 'AVAILABLE' || entity.fileAttenteVirtuelle) extras.push('File Virtuelle : <strong>Disponible</strong> <i class="fas fa-mobile-alt" style="color:#007bff;"></i>');
            else if (vq === 'SOLD_OUT') extras.push('File Virtuelle : <strong>Épuisée</strong> <i class="fas fa-mobile-alt" style="color:#dc3545;"></i>');

            if (entity.disneyPhotopass || entity.features?.some(f => f.includes('PHOTO_PASS'))) extras.push('PhotoPass : <strong>Oui</strong> <i class="fas fa-camera" style="color:#198754;"></i>');

            if (entity.features?.includes('PAID_ACCESS') || entity.features?.includes('BOOKABLE')) extras.push('Réservation : <strong>Premier Access / Obligatoire</strong> <i class="fas fa-calendar-check" style="color:#ffc107;"></i>');
            else if (entity.reservationParc) extras.push('Réservation : <strong>Obligatoire</strong> <i class="fas fa-calendar-check" style="color:#0d6fdc;"></i>');

            if (extras.length) details += `<hr style="margin:5px 0;border-color:#eee;">` + extras.join('<br>');
        }

    } else if (['RESTAURANT', 'SHOP', 'DINING'].includes(type)) {
        title = 'Disponibilité';
        const isOpen = ['OPERATING', 'OUVERT'].includes(status);
        details = isOpen ? 'Ouvert' : status;
        if (priceRange) details += `<br>Prix : <strong>${priceRange}</strong>`;
    }

    return `
        <div class="map-popup">
            <h4>${name}</h4>
            <p><strong>${title}</strong><br> ${details}</p>
            ${statusDisplay}
        </div>
    `;
};

// --- LOGIQUE DE FILTRE ---

const toggleFilter = (type, btn) => {
    const isAll = type === 'ALL';
    const coreTypes = CONFIG.FILTER_TYPES.filter(t => t !== 'ALL');

    if (isAll) {
        // Toggle ALL : soit tout activer, soit reset à ATTRACTION
        const allActive = coreTypes.every(t => activeFilters.has(t));
        activeFilters.clear();
        if (!allActive) coreTypes.forEach(t => activeFilters.add(t));
        else activeFilters.add('ATTRACTION');
    } else {
        // Toggle Individuel
        if (activeFilters.has(type)) {
            if (activeFilters.size > 1) activeFilters.delete(type);
        } else {
            activeFilters.add(type);
        }
    }
    updateFilterUI();
    loadMapData();
    closeMobileFilter();
};

const updateFilterUI = () => {
    const coreTypes = CONFIG.FILTER_TYPES.filter(t => t !== 'ALL');
    const allActive = coreTypes.every(t => activeFilters.has(t));
    
    document.querySelectorAll('.filter-button').forEach(btn => {
        const type = btn.dataset.filterType;
        if (type === 'ALL') {
            btn.classList.toggle('active', allActive);
        } else {
            btn.classList.toggle('active', activeFilters.has(type));
        }
    });
};

const closeMobileFilter = () => {
    const container = document.getElementById('filter-container');
    if (window.innerWidth < 600 && container?.classList.contains('visible')) {
        container.classList.remove('visible');
        document.getElementById('toggle-filter-btn').innerHTML = '&#x2699;';
        document.getElementById('toggle-filter-btn').style.backgroundColor = 'var(--color-primary)';
    }
};

// --- INITIALISATION ---

const addFilterControls = () => {
    const FilterControl = L.Control.extend({
        onAdd: () => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom filter-controls');
            container.id = 'filter-container';
            
            const labels = { ALL:'Tout', ATTRACTION:'Attractions', SHOW:'Spectacles', MEET:'Meets', SHOP:'Boutiques', RESTAURANT:'Restaurants' };

            CONFIG.FILTER_TYPES.forEach(type => {
                const btn = L.DomUtil.create('button', 'filter-button', container);
                btn.textContent = labels[type];
                btn.dataset.filterType = type;
                if (activeFilters.has(type)) L.DomUtil.addClass(btn, 'active');
                
                L.DomEvent.on(btn, 'click', (e) => {
                    L.DomEvent.stop(e);
                    toggleFilter(type, btn);
                });
            });
            return container;
        }
    });
    new FilterControl({position: 'topright'}).addTo(map);
};

const addGeolocation = () => {
    const GeoControl = L.Control.extend({
        onAdd: () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = '<a href="#" title="Ma position" style="font-size: 1.2em;"><i class="fas fa-crosshairs"></i></a>';
            L.DomEvent.on(div, 'click', (e) => {
                L.DomEvent.stop(e);
                map.locate({setView: true, maxZoom: 16});
            });
            return div;
        }
    });
    new GeoControl({position: 'topleft'}).addTo(map);
    
    map.on('locationfound', e => {
        if (map.userMarker) map.removeLayer(map.userMarker);
        if (map.userCircle) map.removeLayer(map.userCircle);
        map.userMarker = L.marker(e.latlng).addTo(map).bindPopup("Vous êtes ici").openPopup();
        map.userCircle = L.circle(e.latlng, e.accuracy).addTo(map);
    });
    map.on('locationerror', e => console.error("Loc error:", e.message));
};

const initializeMap = () => {
    if (!document.getElementById('map')) return;
    if (map) map.remove();

    map = L.map('map').setView(CONFIG.MAP_CENTER, CONFIG.INITIAL_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    
    markersLayer = L.markerClusterGroup({ spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true, disableClusteringAtZoom: 18 });
    map.addLayer(markersLayer);

    addGeolocation();
    addFilterControls();
    
    // Mobile toggle
    const toggleBtn = document.getElementById('toggle-filter-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const c = document.getElementById('filter-container');
            c.classList.toggle('visible');
            const isOpen = c.classList.contains('visible');
            toggleBtn.innerHTML = isOpen ? '&times;' : '&#x2699;';
            toggleBtn.style.backgroundColor = isOpen ? 'var(--color-red)' : 'var(--color-primary)';
        });
    }

    loadDataAndRender();
    setInterval(loadMapData, CONFIG.REFRESH_INTERVAL);
};

// --- CHARGEMENT DES DONNÉES ---

const loadDataAndRender = async () => {
    try {
        const urls = Object.values(CONFIG.URLS);
        const responses = await Promise.all(urls.map(url => fetch(url)));
        const jsons = await Promise.all(responses.map(r => r.ok ? r.json() : []));

        // Aplatir et typer les données statiques
        allStaticCoordinates = jsons.flat().map(item => {
            // Détection automatique du type si le JSON vient de meets.json (par index ou structure)
            // Ici on assume que le dernier fichier chargé est MEETS et qu'on doit typer
            if (item.horaires || item.titre) item.type = 'MEET'; // Fallback simple
            return item;
        });
        
        // Pour être sûr du typage MEET, on peut aussi utiliser l'index si l'ordre est garanti,
        // mais la détection par propriété est plus robuste ici.

        loadMapData();
    } catch (e) {
        console.error("Erreur chargement statique:", e);
    }
};

const loadMapData = async () => {
    console.log("Mise à jour carte...");
    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('API Error');
        
        const { liveData = [] } = await response.json();
        const liveMap = new Map(liveData.filter(e => e.name).map(e => [e.name.toUpperCase(), e]));

        const mergedPois = allStaticCoordinates.map(staticPoi => {
            const name = staticPoi.name || staticPoi.titre;
            const apiMatch = liveMap.get(name?.toUpperCase());
            
            const poi = { ...staticPoi, ...apiMatch, name };
            poi.entityType = staticPoi.type || apiMatch?.entityType;
            
            // Normalisation lat/lon
            poi.lat = poi.lat || poi.coordinates?.latitude || poi.localisation?.lat;
            poi.lon = poi.lon || poi.coordinates?.longitude || poi.localisation?.lon;
            
            if (!poi.status) poi.status = 'UNKNOWN';
            return poi;
        });

        markersLayer.clearLayers();

        mergedPois
            .filter(poi => {
                let key = poi.entityType;
                if (key === 'DINING') key = 'RESTAURANT';
                return activeFilters.has(key);
            })
            .forEach(poi => {
                if (poi.lat && poi.lon) {
                    const marker = L.marker([poi.lat, poi.lon], { icon: createCustomIcon(poi) });
                    marker.bindPopup(createPopupContent(poi));
                    
                    const tooltip = getWaitTimeText(poi);
                    if (tooltip) {
                        const colorClass = `wait-time-tooltip-${getStatusColor(poi).replace('#', '')}`;
                        marker.bindTooltip(tooltip, { permanent: true, direction: 'top', className: `wait-time-tooltip ${colorClass}` });
                    }
                    markersLayer.addLayer(marker);
                }
            });

    } catch (e) {
        console.error("Erreur Update Map:", e);
    }
};

// Lancement
document.addEventListener('DOMContentLoaded', initializeMap);