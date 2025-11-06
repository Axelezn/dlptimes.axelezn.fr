// js/app-map.js - V10 (Harmonisé avec les styles DLP)

// ⭐ CONSTANTES D'IDENTIFICATION & DE L'API
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const COORDS_JSON_URL = 'js/dlp-coords.json'; 
const REFRESH_INTERVAL = 60000; 

// ⭐ COORDONNÉES ET VUE INITIALE
const DLP_CENTER_LAT = 48.8730;
const DLP_CENTER_LON = 2.7752;
const INITIAL_ZOOM = 15;

let map;
let markersLayer = L.layerGroup(); 

// --- LOGIQUE DES COULEURS ---

/**
 * Définit la couleur en fonction du statut et du temps d'attente (pour le PIN et le Tooltip).
 */
function getStatusColor(entity) {
    const status = entity.status;
    
    // 1. Couleurs basées sur le statut (non-attraction ou non-ouvert)
    switch (status) {
        case 'CLOSED':
        case 'DOWN':
            return '#dc3545'; // Rouge (Fermé/Hors service)
        case 'REFURBISHMENT':
            return '#ffc107'; // Jaune (Rénovation)
        case 'UNKNOWN':
            return '#0d6fdc'; // Bleu (Inconnu)
    }

    // 2. Logique spécifique pour les ATTRACTIONS OPERATING (Basée sur les seuils du tableau)
    if (entity.entityType === 'ATTRACTION' && status === 'OPERATING') {
        const standbyQueue = entity.queue?.STANDBY;

        if (standbyQueue && typeof standbyQueue.waitTime === 'number') {
            const waitTime = standbyQueue.waitTime;
            
            if (waitTime === 0) {
                 return '#198754'; // Vert foncé (Walk-on / 0 min)
            } else if (waitTime <= 20) {
                return '#28a745'; // Vert clair (Attente Faible)
            } else if (waitTime <= 45) {
                return '#ffc107'; // Jaune (Attente Modérée)
            } else if (waitTime <= 75) {
                return '#fd7e14'; // Orange (Attente Élevée)
            } else {
                return '#dc3545'; // Rouge (Attente Très Élevée)
            }
        }
    }
    
    // 3. Couleur par défaut pour OPERATING sans temps d'attente
    return '#198754'; // Vert (Par défaut : Ouvert)
}

// --- LOGIQUE DES ICÔNES ---

function createCustomIcon(entity) {
    const color = getStatusColor(entity);
    let iconClass = 'fas fa-map-marker-alt'; 

    switch (entity.entityType) {
        case 'SHOW':
            iconClass = 'fas fa-theater-masks'; 
            break;
        case 'RESTAURANT':
        case 'DINING':
            iconClass = 'fas fa-utensils'; 
            break;
        case 'SHOP':
            iconClass = 'fas fa-shopping-bag'; 
            break;
        case 'ATTRACTION':
        default:
            break; 
    }

    // Le style du pin est injecté en ligne pour la couleur
    return L.divIcon({
        html: `<div style="color: ${color}; font-size: 24px;"><i class="${iconClass}"></i></div>`,
        className: 'custom-map-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24], 
        popupAnchor: [0, -20]
    });
}

// --- LOGIQUE DES TEMPS D'ATTENTE (Tooltip - 0 min exclu) ---

function getWaitTimeText(entity) {
    if (entity.entityType !== 'ATTRACTION' || entity.status !== 'OPERATING') {
        return null;
    }
    
    const standbyQueue = entity.queue?.STANDBY;

    // Affiche la STANDBY queue uniquement si l'attente est strictement supérieure à 0
    if (standbyQueue && typeof standbyQueue.waitTime === 'number' && standbyQueue.waitTime > 0) {
        return `${standbyQueue.waitTime} min`;
    }
    
    // Affiche le Premier Access si disponible
    const paidQueue = entity.queue?.PAID_RETURN_TIME;
    if (paidQueue && paidQueue.state === 'AVAILABLE') {
        return `PA ${paidQueue.price.amount / 100}€`; 
    }

    return null; 
}

// --- LOGIQUE DES TEMPS D'ATTENTE (Popup) ---

function createPopupContent(entity) {
    const name = entity.name || 'POI Inconnu';
    const status = entity.status || 'Statut Inconnu'; 
    let waitTime = 'N/A';
    
    if (entity.entityType === 'ATTRACTION' && entity.queue) {
        
        const standby = entity.queue.STANDBY;
        const paid = entity.queue.PAID_RETURN_TIME;
        const singleRider = entity.queue.SINGLE_RIDER;
        const virtualQueue = entity.queue.VIRTUAL_QUEUE;
        
        let waitDetails = [];

        if (standby && typeof standby.waitTime === 'number') {
            waitDetails.push(`Classique : ${standby.waitTime} min`);
        }
        if (paid && paid.state === 'AVAILABLE') {
            const price = paid.price?.formatted || `${paid.price.amount / 100}€`;
            const returnTime = paid.returnStart ? ` (${paid.returnStart.substring(11, 16)})` : '';
            waitDetails.push(`Premier Access : ${price}${returnTime}`);
        } else if (paid && paid.state === 'SOLD_OUT') {
             waitDetails.push(`Premier Access : Épuisé`);
        }
        if (singleRider && typeof singleRider.waitTime === 'number') {
            waitDetails.push(`Single Rider : ${singleRider.waitTime} min`);
        }
        if (virtualQueue && virtualQueue.state === 'AVAILABLE') {
             waitDetails.push(`File Virtuelle : Disponible`);
        }
        
        waitTime = waitDetails.length > 0 ? waitDetails.join('<br>') : 'N/A';
    }

    const waitDisplay = entity.entityType === 'ATTRACTION' 
        ? `<p><strong>Attente :</strong><br> ${waitTime}</p>` 
        : '';
        
    const statusDisplay = `<span style="color: ${getStatusColor({status: status})};"><strong>Statut :</strong> ${status}</span>`;

    return `
        <div class="map-popup">
            <h4>${name}</h4>
            ${waitDisplay}
            ${statusDisplay}
        </div>
    `;
}

// --- CONTRÔLE DE GÉOLOCALISATION ---

function addGeolocationControl() {
    const GeolocationControl = L.Control.extend({
        onAdd: function(map) {
            // Utiliser 'leaflet-control-custom' pour le style personnalisé dans le HTML
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.innerHTML = '<a href="#" title="Localiser ma position" style="font-size: 1.2em;"><i class="fas fa-crosshairs"></i></a>';
            L.DomEvent.on(container, 'click', function(e) {
                L.DomEvent.stop(e); 
                map.locate({setView: true, maxZoom: 16}); 
            });
            return container;
        }
    });
    new GeolocationControl({position: 'topleft'}).addTo(map);
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
}

function onLocationFound(e) {
    const radius = e.accuracy;
    if (map.userLocationMarker) {
        map.removeLayer(map.userLocationMarker);
        map.removeLayer(map.userLocationCircle);
    }
    map.userLocationMarker = L.marker(e.latlng).addTo(map)
        .bindPopup("Vous êtes ici (Précision : " + radius.toFixed(0) + "m)").openPopup();
    map.userLocationCircle = L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
    alert("Impossible de vous localiser : " + e.message);
}


// --- INITIALISATION DE LA CARTE ET DES DONNÉES ---

function initializeMap() {
    if (!document.getElementById('map')) {
        console.error("Erreur: Le conteneur 'map' est introuvable.");
        return;
    }
    if (map) {
        map.remove();
    }
    
    map = L.map('map').setView([DLP_CENTER_LAT, DLP_CENTER_LON], INITIAL_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer.addTo(map);
    addGeolocationControl(); 

    loadMapData();
    setInterval(loadMapData, REFRESH_INTERVAL);
}

async function loadMapData() {
    console.log("Mise à jour des données de la carte...");
    
    try {
        const coordsResponse = await fetch(COORDS_JSON_URL);
        if (!coordsResponse.ok) {
             throw new Error(`Erreur lors du chargement du JSON des coordonnées: ${coordsResponse.status}`);
        }
        const staticPois = await coordsResponse.json();

        const apiResponse = await fetch(API_URL); 
        if (!apiResponse.ok) {
            throw new Error(`Erreur HTTP: ${apiResponse.status}`);
        }
        const apiData = await apiResponse.json();
        const liveData = apiData.liveData || [];

        const liveDataMap = new Map();
        liveData.forEach(entity => {
            if (entity.name) {
                liveDataMap.set(entity.name.toUpperCase(), entity); 
            }
        });
        
        const mergedPois = staticPois.map(staticPoi => {
            const apiMatch = liveDataMap.get(staticPoi.name.toUpperCase());
            if (apiMatch) {
                return {
                    ...staticPoi, 
                    ...apiMatch, 
                    entityType: staticPoi.type || apiMatch.entityType
                };
            }
            return {...staticPoi, status: 'UNKNOWN'};
        });

        markersLayer.clearLayers(); 
        
        if (mergedPois.length === 0) {
             console.log("Aucun point à afficher.");
             return;
        }

        mergedPois.forEach(entity => {
            const latitude = entity.lat || entity.coordinates?.latitude;
            const longitude = entity.lon || entity.coordinates?.longitude;

            if (typeof latitude === 'number' && typeof longitude === 'number') {
                const customIcon = createCustomIcon(entity);
                const marker = L.marker([latitude, longitude], { icon: customIcon });

                const popupContent = createPopupContent(entity);
                marker.bindPopup(popupContent);
                
                // AJOUT DU TOOLTIP (Temps d'attente constant)
                const waitTimeText = getWaitTimeText(entity);
                if (waitTimeText) {
                    // Récupère la couleur HEX et supprime le '#'
                    const colorHex = getStatusColor(entity).replace('#', ''); 
                    const colorClass = `wait-time-tooltip-${colorHex}`;

                    marker.bindTooltip(waitTimeText, {
                         permanent: true,     
                         direction: 'top',    
                         // Combine la classe de base et la classe de couleur (pour la mise en forme)
                         className: `wait-time-tooltip ${colorClass}` 
                     }).openTooltip();
                }

                markersLayer.addLayer(marker);
            }
        });

        console.log(`Carte mise à jour avec ${mergedPois.length} points d'intérêt.`);

    } catch (error) {
        console.error("Erreur critique lors du chargement des données :", error);
    }
}


// --- LANCEMENT ---
// On s'assure que la carte s'initialise après le chargement du DOM
document.addEventListener('DOMContentLoaded', initializeMap);