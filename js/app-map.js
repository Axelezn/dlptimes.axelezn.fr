// js/app-map.js - V13 (Marker Clustering)

// ⭐ CONSTANTES D'IDENTIFICATION & DE L'API
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const COORDS_JSON_URL = 'js/dlp-coords.json'; // Fichier unique pour toutes les coordonnées (Attractions, Shows, POI)
const REFRESH_INTERVAL = 60000; 

// ⭐ COORDONNÉES ET VUE INITIALE
const DLP_CENTER_LAT = 48.8694922;
const DLP_CENTER_LON = 2.7804949;
const INITIAL_ZOOM = 16;

let map;
// 🔴 MODIFICATION : Déclaration sans initialisation immédiate
let markersLayer; 
let allStaticCoordinates = []; // Contient toutes les données statiques (Attractions + Shows)

// --- FONCTIONS UTILITAIRES POUR LES SPECTACLES (Inchangées) ---

/**
 * Calcule l'heure du prochain spectacle et la différence en minutes.
 */
function getNextShowInfo(entity) {
    const allScheduleData = entity.showtimes || entity.schedule?.schedule || [];
    const now = new Date();
    
    // Filtrer les heures futures et trier pour trouver la plus proche
    const futureScheduleData = allScheduleData
        .filter(item => {
            const timeString = item.startTime || item.endTime || item;
            const showTimeDate = new Date(timeString);
            return showTimeDate > now;
        })
        .sort((a, b) => new Date(a.startTime || a.endTime || a) - new Date(b.startTime || b.endTime || b));

    if (futureScheduleData.length === 0) {
        return { time: null, minutes: Infinity, isLive: false };
    }

    const nextTime = futureScheduleData[0].startTime || futureScheduleData[0].endTime || futureScheduleData[0];
    const nextTimeDate = new Date(nextTime);
    
    const formattedTime = nextTimeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const diffInMinutes = Math.floor((nextTimeDate.getTime() - now.getTime()) / 60000);
    
    // Si la différence est négative (show démarré) mais récente (moins de 10 min de retard sur l'API)
    const isLive = diffInMinutes <= 5 && diffInMinutes >= -10; 
    
    return { time: formattedTime, minutes: diffInMinutes, isLive: isLive };
}


/**
 * Détermine la couleur d'urgence pour le pin du spectacle (basée sur le temps restant).
 */
function getShowUrgencyColor(diffInMinutes, isLive) {
    // Les couleurs doivent correspondre aux codes HEX dans le CSS pour le tooltip
    if (isLive) return '#ffc107'; // Jaune/Doré (LIVE/EN COURS)
    if (diffInMinutes < 15) return '#fd7e14'; // Orange (URGENT)
    if (diffInMinutes < 30) return '#ffc107'; // Jaune (Modéré)
    if (diffInMinutes < 60) return '#28a745'; // Vert clair (Bientôt)
    return '#198754'; // Vert foncé (Loin)
}


// --- LOGIQUE DES COULEURS (Inchangée) ---

/**
 * Définit la couleur en fonction du statut et du temps d'attente (pour le PIN et le Tooltip).
 */
function getStatusColor(entity) {
    const status = entity.status;
    
    // 1. Couleurs basées sur le statut (non-attraction/non-show ou non-ouvert)
    switch (status) {
        case 'CLOSED':
        case 'DOWN':
            return '#dc3545'; // Rouge (Fermé/Hors service)
        case 'REFURBISHMENT':
            return '#ffc107'; // Jaune (Rénovation)
        case 'UNKNOWN':
            return '#0d6fdc'; // Bleu (Inconnu)
    }

    // 2. Logique spécifique pour les SPECTACLES OPERATING (Basée sur l'urgence)
    if (entity.entityType === 'SHOW' && status === 'OPERATING') {
        const info = getNextShowInfo(entity);
        if (info.minutes === Infinity) {
            return '#dc3545'; // Rouge (Terminé pour la journée)
        }
        return getShowUrgencyColor(info.minutes, info.isLive);
    }

    // 3. Logique spécifique pour les ATTRACTIONS OPERATING (Basée sur les seuils du tableau)
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
    
    // 4. Couleur par défaut pour OPERATING sans temps d'attente/show
    return '#198754'; // Vert (Par défaut : Ouvert)
}

// --- LOGIQUE DES ICÔNES (Inchangée) ---

function createCustomIcon(entity) {
    const color = getStatusColor(entity);
    let iconClass = 'fas fa-map-marker-alt'; 

    switch (entity.entityType) {
        case 'SHOW':
            iconClass = 'fas fa-mask'; // Icône de masque pour les spectacles
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

// --- LOGIQUE DES TEMPS D'ATTENTE (Tooltip) (Inchangée) ---

function getWaitTimeText(entity) {
    const status = entity.status;
    
    // 1. Affichage pour les ATTRACTIONS
    if (entity.entityType === 'ATTRACTION' && status === 'OPERATING') {
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
        
        // Si l'attente est 0
        if (standbyQueue && typeof standbyQueue.waitTime === 'number' && standbyQueue.waitTime === 0) {
             return '0 min'; 
        }
    }

    // 2. Affichage pour les SPECTACLES
    if (entity.entityType === 'SHOW') {
        if (status === 'REFURBISHMENT') return 'RÉNO';
        if (status === 'CLOSED' || status === 'DOWN') return 'FERMÉ';

        const info = getNextShowInfo(entity);
        if (info.isLive) return 'LIVE'; // Spectacle en cours
        if (info.time) return info.time; // Prochain horaire (ex: 14:30)
        
        return 'AUCUN'; // Terminé pour la journée
    }
    
    // 3. Statut de fermeture (pour les POI sans temps d'attente)
    if (status === 'REFURBISHMENT') return 'RÉNO';
    if (status === 'CLOSED' || status === 'DOWN') return 'FERMÉ';

    return null; // Pas de Tooltip pour les autres cas
}

// --- LOGIQUE DES TEMPS D'ATTENTE (Popup) (Inchangée) ---

function createPopupContent(entity) {
    const name = entity.name || 'POI Inconnu';
    const status = entity.status || 'Statut Inconnu'; 
    let details = 'N/A';
    let title = 'Détails';

    // Logique pour les ATTRACTIONS
    if (entity.entityType === 'ATTRACTION' && entity.queue) {
        title = 'Attente';
        const standby = entity.queue.STANDBY;
        const paid = entity.queue.PAID_RETURN_TIME;
        const singleRider = entity.queue.SINGLE_RIDER;
        const virtualQueue = entity.queue.VIRTUAL_QUEUE;
        
        let waitDetails = [];

        if (standby && typeof standby.waitTime === 'number') {
            waitDetails.push(`Classique : <strong>${standby.waitTime} min</strong>`);
        }
        if (paid && paid.state === 'AVAILABLE') {
            const price = paid.price?.formatted || `${paid.price.amount / 100}€`;
            const returnTime = paid.returnStart ? ` (${paid.returnStart.substring(11, 16)})` : '';
            waitDetails.push(`Premier Access : <strong>${price}${returnTime}</strong>`);
        } else if (paid && paid.state === 'SOLD_OUT') {
             waitDetails.push(`Premier Access : <strong>Épuisé</strong>`);
        }
        if (singleRider && typeof singleRider.waitTime === 'number') {
            waitDetails.push(`Single Rider : <strong>${singleRider.waitTime} min</strong>`);
        }
        if (virtualQueue && virtualQueue.state === 'AVAILABLE') {
             waitDetails.push(`File Virtuelle : <strong>Disponible</strong>`);
        }
        
        details = waitDetails.length > 0 ? waitDetails.join('<br>') : 'N/A';
    } 
    // Logique pour les SPECTACLES
    else if (entity.entityType === 'SHOW' && entity.status === 'OPERATING' && entity.showtimes) {
        title = 'Horaires';
        const allScheduleData = entity.showtimes || entity.schedule?.schedule || [];
        const now = new Date();

        // Filtrer et formater toutes les heures futures
        const futureTimes = allScheduleData
            .filter(item => new Date(item.startTime || item) > now)
            .sort((a, b) => new Date(a.startTime || a) - new Date(b.startTime || b))
            .slice(0, 5) // Limiter à 5 pour la clarté du popup
            .map(item => {
                const timeString = item.startTime || item.endTime || item;
                return new Date(timeString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
            });
        
        details = futureTimes.length > 0 
            ? `Prochains : <strong>${futureTimes.join(' | ')}</strong>`
            : 'Aucune représentation à venir aujourd\'hui.';

    }
    // Logique pour les autres POI (Restaurants, Shops)
    else if (entity.entityType === 'RESTAURANT' || entity.entityType === 'SHOP') {
         title = 'Disponibilité';
         details = status === 'OPERATING' ? 'Ouvert' : status;
    }


    const statusColor = getStatusColor(entity);
    const statusDisplay = `<span style="color: ${statusColor};"><strong>Statut :</strong> ${status}</span>`;

    return `
        <div class="map-popup">
            <h4>${name}</h4>
            <p><strong>${title}</strong><br> ${details}</p>
            ${statusDisplay}
        </div>
    `;
}

// --- CONTRÔLE DE GÉOLOCALISATION (Inchangé) ---

function addGeolocationControl() {
    const GeolocationControl = L.Control.extend({
        onAdd: function(map) {
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

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 🟢 MODIFICATION : Initialisation du groupe de clusters
    markersLayer = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // À partir du zoom 16, désactiver le regroupement pour voir les pins individuels
        disableClusteringAtZoom: 18
    });
    map.addLayer(markersLayer); // Ajout du groupe de clusters à la carte

    addGeolocationControl(); 

    loadAllStaticCoordinates().then(() => {
        loadMapData();
        setInterval(loadMapData, REFRESH_INTERVAL);
    });
}

/**
 * Charge toutes les coordonnées statiques à partir du fichier unique.
 */
async function loadAllStaticCoordinates() {
    try {
        const response = await fetch(COORDS_JSON_URL);
        if (!response.ok) throw new Error('Échec du chargement des coordonnées POI.');
        
        allStaticCoordinates = await response.json();
        
    } catch (error) {
        console.error("Erreur lors du chargement des coordonnées statiques:", error);
    }
}


async function loadMapData() {
    console.log("Mise à jour des données de la carte...");
    
    try {
        
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
        
        // Fusionner les données de l'API avec les coordonnées statiques
        const mergedPois = allStaticCoordinates.map(staticPoi => { 
            const apiMatch = liveDataMap.get(staticPoi.name.toUpperCase());
            
            if (apiMatch) {
                return {
                    ...staticPoi, 
                    ...apiMatch, 
                    // Assurer que le type statique est prioritaire pour la classification (ATTRACTION, SHOW, etc.)
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
                
                // AJOUT DU TOOLTIP (Temps d'attente/Prochain Show)
                const waitTimeText = getWaitTimeText(entity);
                if (waitTimeText) {
                    // Récupère la couleur HEX et supprime le '#'
                    const colorHex = getStatusColor(entity).replace('#', ''); 
                    const colorClass = `wait-time-tooltip-${colorHex}`;

                    marker.bindTooltip(waitTimeText, {
                        permanent: true,     
                        direction: 'top',    
                        className: `wait-time-tooltip ${colorClass}` 
                     }).openTooltip();
                }

                // 🟢 markersLayer est maintenant le groupe de clusters
                markersLayer.addLayer(marker); 
            }
        });

        console.log(`Carte mise à jour avec ${mergedPois.length} points d'intérêt.`);

    } catch (error) {
        console.error("Erreur critique lors du chargement des données :", error);
    }
}


// --- LANCEMENT ---
document.addEventListener('DOMContentLoaded', initializeMap);