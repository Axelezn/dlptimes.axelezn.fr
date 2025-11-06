// js/app-shows.js - V14 (Exclusion des Zones Réservées)

// ⭐ CONSTANTES D'IDENTIFICATION
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const DISNEYLAND_PARK_ID = 'dae968d5-630d-4719-8b06-3d107e944401'; 
const STUDIOS_PARK_ID = 'ca888437-ebb4-4d50-aed2-d227f7096968'; 
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const REFRESH_INTERVAL = 120000; // Actualisation toutes les 2 minutes (2 min)

// ⭐ NOUVEAU : Liste des noms de spectacles à exclure (Zones de visionnage réservées)
const EXCLUDED_SHOW_NAMES = [
    "Reserved viewing area: Disney Stars on Parade",
    "Reserved viewing area: Nighttime show",
    // Ajoutez ici tout autre nom de zone que vous souhaitez masquer
];


/**
 * Formate un nombre de minutes en H/Min si la durée dépasse une heure.
 */
function formatMinutes(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
}


// --- DÉFINITION DES ZONES (LANDS/PARCS) ---

/**
 * Détermine le Land/Zone du spectacle et son Parc.
 */
function getLocation(entity) {
    let location = {
        park: "Inconnu",
        land: "Non spécifié" 
    };

    if (entity.parkId === DISNEYLAND_PARK_ID) {
        location.park = "Parc Disneyland";
    } else if (entity.parkId === STUDIOS_PARK_ID) {
        location.park = "Walt Disney Studios Park";
    }

    const externalId = entity.externalId || '';
    
    // ⭐ Mappage des IDs aux Lieux spécifiques
    if (externalId.startsWith('P1') && externalId.endsWith('G103')) {
        location.land = "Discoveryland Theater"; // Phillar Magic 
    } else if (externalId.startsWith('P1GS99')) { // Tales of Magic
        location.land = "Central Plaza / Main Street";
    } else if (externalId.startsWith('P1GS21')) {
        location.land = "Itinéraire Parade : Fantasyland -> Central Plaza";
    } else if (externalId.startsWith('P2GS54')) {
        location.land = "World Premiere Plaza"
    } else if (externalId.startsWith('P2GS63')) {
        location.land = "Avengers Campus"
    } else if (externalId.startsWith('P2GS23')) {
        location.land = "World Premiere Plaza"
    } else if (externalId.startsWith('P2YS03')) {
        location.land = "World Premiere Plaza"
    } else if (externalId.startsWith('P2GS58')) {
        location.land = "Studio Theater"
    }
    // Cas génériques (si aucun cas spécifique n'a été trouvé)
    else if (externalId.startsWith('P1')) {
        location.land = "Disneyland Park Zone";
    } else if (externalId.startsWith('P2')) {
        location.land = "Studios Park Zone";
    }
    
    // Fallback : Utilise le nom de zone de l'API s'il est plus précis que notre fallback générique
    if (location.land === "Disneyland Park Zone" && entity.areaName) {
         location.land = entity.areaName;
    }
    if (location.land === "Studios Park Zone" && entity.areaName) {
         location.land = entity.areaName;
    }

    if (location.land === "Non spécifié") {
        location.land = "";
    }
    
    return location;
}

/**
 * Détermine la classe CSS d'urgence pour un temps d'attente donné.
 */
function getShowUrgencyClass(diffInMinutes) {
    if (diffInMinutes < 15) {
        return 'time-gold-box'; 
    } else if (diffInMinutes < 30) {
        return 'time-red-box';
    } else if (diffInMinutes < 45) {
        return 'time-orange-box';
    } else if (diffInMinutes < 60) {
        return 'time-green-box';
    } else {
        return 'time-far-box';
    }
}


/**
 * Génère la chaîne HTML complète pour une carte de spectacle.
 */
function createShowCardHtml(show, location) {
    const showName = show.name;
    
    // ... (Logique de filtrage des heures futures, inchangée) ...
    const allScheduleData = show.showtimes || show.schedule?.schedule || [];
    const now = new Date();
    
    const futureScheduleData = allScheduleData.filter(item => {
        const timeString = item.startTime || item.endTime || item;
        const showTimeDate = new Date(timeString);
        return showTimeDate > now;
    });

    const scheduleLength = futureScheduleData.length;
    const status = show.status; 
    let scheduleHtml = '';
    
    let minDiff = Infinity;
    let countdownHtml = ''; 
    let statusClass = ''; 

    if (status === 'OPERATING' && scheduleLength > 0) {
        
        // --- LOGIQUE DE CALCUL DU STATUT IMMINENT (Pour le bandeau) ---
        for (const item of futureScheduleData) {
            const timeString = item.startTime || item.endTime || item;
            const showTimeDate = new Date(timeString);
            const diffInMinutes = Math.floor((showTimeDate.getTime() - now.getTime()) / 60000);
            if (diffInMinutes < minDiff) {
                minDiff = diffInMinutes;
            }
        }
        
        // 2. Déterminer la classe et le texte du compte à rebours (pour le bandeau)
        if (minDiff !== Infinity) {
            const formattedCountdown = formatMinutes(minDiff);
            let countdownText = `Prochain show dans <span class="countdown-value">${formattedCountdown}</span>`;
            
            const urgencyClass = getShowUrgencyClass(minDiff);
            let countdownClass; 
            let urgencyMessage = '';

            if (urgencyClass === 'time-gold-box') {
                countdownClass = 'countdown-gold';
                urgencyMessage = ' - DÉPÊCHEZ-VOUS !';
            } else if (urgencyClass === 'time-red-box') {
                countdownClass = 'countdown-red';
            } else if (urgencyClass === 'time-orange-box') {
                countdownClass = 'countdown-orange';
            } else if (urgencyClass === 'time-green-box') {
                countdownClass = 'countdown-green';
            } else {
                countdownClass = 'countdown-default';
            }
            
            if (minDiff < 5) {
                countdownText = `<span class="countdown-value">MAINTENANT</span>`;
                urgencyMessage = ' - Rendez-vous au lieu du spectacle !';
            }

            countdownHtml = `
                <div class="show-countdown">
                    <span class="${countdownClass}">
                        ${countdownText}${urgencyMessage}
                    </span>
                </div>
            `;
        }
        // ---------------------------------------------

        // 3. Générer le HTML des heures
        const timesHtml = futureScheduleData.map(item => { 
            const timeString = item.startTime || item.endTime || item; 
            let formattedTime = 'Heure Invalide';
            let showTimeDate;
            try {
                showTimeDate = new Date(timeString);
                formattedTime = showTimeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
            } catch (e) {}
            
            const diffInMinutes = Math.floor((showTimeDate.getTime() - now.getTime()) / 60000);
            const boxClass = getShowUrgencyClass(diffInMinutes);
            
            return `<span class="${boxClass}"><strong>${formattedTime}</strong></span>`;
        }).join('');

        scheduleHtml = `${countdownHtml}<div class="show-times-container">${timesHtml}</div>`;
        statusClass = `show-status-active`; 

    } else if (status === 'REFURBISHMENT') {
        scheduleHtml = '<p class="show-times status-closed">Rénovation</p>';
        statusClass = 'show-status-closed';
    } else {
        scheduleHtml = '<p class="show-times status-closed">Fermé / Aucune représentation aujourd\'hui</p>';
        statusClass = 'show-status-closed';
    }

    // Affiche le lieu dans le format "Parc - Zone"
    const locationDisplay = (location.park && location.land) 
        ? `${location.park} - ${location.land}` 
        : location.park; 

    return `
        <div class="show-card ${statusClass}">
            <div class="show-info">
                <h3>${showName}</h3>
                
                <p class="show-park-land">${locationDisplay}</p>
                
            </div>
            <div class="show-schedule">
                ${scheduleHtml}
            </div>
        </div>
    `;
}

// --- FONCTION PRINCIPALE DE LANCEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    fetchShowTimes();
    setInterval(fetchShowTimes, REFRESH_INTERVAL);
});

async function fetchShowTimes() {
    const listElement = document.getElementById('shows-list'); 
    
    if (!listElement) {
        console.error("Erreur Critique: L'élément HTML de la liste des shows ('shows-list') est introuvable.");
        return; 
    }
    
    if (!listElement.querySelector('.loading-message')) {
        listElement.innerHTML = '<div class="loading-message">⌛ Chargement des horaires des spectacles...</div>';
    }

    try {
        const response = await fetch(API_URL); 
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const liveData = data.liveData || [];

        // Filtre essentiel : type SHOW, dans les deux parcs, et NE DOIT PAS être dans la liste d'exclusion
        const allShows = liveData.filter(entity => 
            entity.entityType === 'SHOW' && 
            (entity.parkId === DISNEYLAND_PARK_ID || entity.parkId === STUDIOS_PARK_ID) &&
            // ⭐ AJOUT DU FILTRE D'EXCLUSION ⭐
            !EXCLUDED_SHOW_NAMES.includes(entity.name)
        );
        
        // ⭐ FILTRAGE CRITIQUE : Supprimer les shows qui n'ont plus d'horaires à venir (sauf rénovation) ⭐
        const now = new Date();
        const activeShows = allShows.filter(show => {
            if (show.status === 'REFURBISHMENT') {
                return true; 
            }
            
            const scheduleData = show.showtimes || show.schedule?.schedule || [];
            
            return scheduleData.some(item => {
                const timeString = item.startTime || item.endTime || item;
                const showTimeDate = new Date(timeString);
                return showTimeDate > now;
            });
        });
        
        listElement.innerHTML = ''; 
        
        if (activeShows.length === 0) {
            listElement.innerHTML = '<div class="loading-message status-closed">Aucun spectacle en cours ou à venir aujourd\'hui.</div>';
            return;
        }

        // --- Groupement et Affichage par Parc ---
        const showsByPark = activeShows.reduce((acc, show) => {
            const location = getLocation(show);
            const parkName = location.park;
            
            if (!acc[parkName]) { 
                acc[parkName] = { 
                    location: location,
                    shows: [] 
                }; 
            }
            acc[parkName].shows.push(show);
            return acc;
        }, {});

        const parkOrder = ["Parc Disneyland", "Walt Disney Studios Park", "Inconnu"];

        parkOrder.forEach(park => {
            const parkData = showsByPark[park];
            if (parkData && parkData.shows.length > 0) {
                
                listElement.innerHTML += `<h2 class="park-show-header">${park}</h2>`;
                
                parkData.shows.sort((a, b) => a.name.localeCompare(b.name));
                
                parkData.shows.forEach(show => {
                    listElement.innerHTML += createShowCardHtml(show, getLocation(show));
                });
            }
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des données de l'API (Shows) :", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Échec Critique : Impossible de charger les données des spectacles.</div>`;
    }
}