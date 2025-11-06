// js/app-park.js - V6 (Intégration des logos de Land)

// ⭐ CONSTANTES D'IDENTIFICATION ET DE RAFFRAICHISSEMENT
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const DISNEYLAND_PARK_ID = 'dae968d5-630d-4719-8b06-3d107e944401'; 
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const REFRESH_INTERVAL = 90000; // Actualisation toutes les 90 secondes (1.5 minute)

// --- DÉFINITION DES LANDS ---
function getLandName(attraction) {
    const externalId = attraction.externalId || '';
    
    if (externalId.startsWith('P1RA')) return "Frontierland"; 
    if (externalId.startsWith('P1DA')) return "Discoveryland"; 
    if (externalId.startsWith('P1AA')) return "Adventureland"; 
    if (externalId.startsWith('P1NA')) return "Fantasyland"; 
    if (externalId.startsWith('P1MA')) return "Main Street, U.S.A."; 
    
    if (attraction.name.includes("Princess Pavilion")) return "Fantasyland";
    
    return "Autre / Non Classé"; 
}

// ⭐ FONCTION UTILITAIRE : Normalise le nom du Land pour le chemin du fichier PNG
function getLogoFileName(landName) {
    // Supprime les espaces, les apostrophes, et convertit en minuscules
    // Ex: "Main Street, U.S.A." devient "main_street_usa_logo.png"
    return landName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') 
        .replace(/\s+/g, '_') + '_logo.png';
}

/**
 * Génère la chaîne HTML complète pour une carte d'attraction (SANS "Attente : ").
 */
function createAttractionCardHtml(attraction, land) {
    let waitHtml = '';
    let waitTime = attraction.queue?.STANDBY?.waitTime ?? null;
    let finalClass = '';

    if (attraction.status === 'OPERATING' && waitTime !== null && waitTime >= 0) {
        // Nécessite que config.js soit chargé pour getTimeClass
        finalClass = (typeof getTimeClass === 'function') ? 
                            getTimeClass(attraction.name, waitTime) : 'time-default'; 
        
        waitHtml = `
            <div class="wait-time ${finalClass}">
                ${waitTime} min
            </div>
        `;

    } else {
        // État Fermé, Rénovation, Indisponible
        let statusText = '';
        if (attraction.status === 'CLOSED' || waitTime === null) {
             statusText = 'Fermé';
        } else if (attraction.status === 'REFURBISHMENT') {
             statusText = 'Rénov.';
        } else {
             statusText = 'Indisp.';
        }
        
        finalClass = 'status-closed'; 
        waitHtml = `
            <div class="wait-time ${finalClass}">
                ${statusText}
            </div>
        `;
    }

    return `
        <div class="attraction-card">
            <div class="attraction-info">
                <h3>${attraction.name}</h3>
                <p>${land}</p>
            </div>
            ${waitHtml}
        </div>
    `;
}

// --- FONCTION PRINCIPALE DE LANCEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Appel initial immédiat
    fetchAttractionTimes();
    
    // 2. Actualisation automatique
    setInterval(fetchAttractionTimes, REFRESH_INTERVAL);
});

async function fetchAttractionTimes() {
    const listElement = document.getElementById('attractions-list'); 
    
    if (!listElement.querySelector('.loading-message')) {
        listElement.innerHTML = '<div class="loading-message">⌛ Chargement des temps d\'attente...</div>';
    }

    try {
        const response = await fetch(API_URL); 
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const liveData = data.liveData || [];

        const attractions = liveData.filter(entity => 
            entity.entityType === 'ATTRACTION' && entity.parkId === DISNEYLAND_PARK_ID
        );
        
        listElement.innerHTML = ''; // Nettoyer l'ancienne liste
        
        if (attractions.length === 0) {
            listElement.innerHTML = '<div class="loading-message">Aucune attraction trouvée ou ouverte actuellement.</div>';
            return;
        }

        // Groupement par Land
        const attractionsByLand = attractions.reduce((acc, attraction) => {
            const land = getLandName(attraction);
            if (!acc[land]) { acc[land] = []; }
            acc[land].push(attraction);
            return acc;
        }, {});

        const landOrder = ["Main Street, U.S.A.", "Frontierland", "Adventureland", "Fantasyland", "Discoveryland", "Autre / Non Classé"];
        
        // Génération du HTML
        landOrder.forEach(land => {
            const attractionsInLand = attractionsByLand[land];
            if (attractionsInLand && attractionsInLand.length > 0) {
                
                // ⭐ Ajout du conteneur de logo et du titre Land ⭐
                const logoFileName = getLogoFileName(land);
                listElement.innerHTML += `
                    <div class="land-header-container">
                        <img src="./imgs/logos/${logoFileName}" alt="Logo ${land}" class="land-logo">
                        <h2 class="land-header">${land}</h2>
                    </div>
                `;
                
                // Trier les attractions (en priorisant les ouvertes)
                attractionsInLand.sort((a, b) => {
                    const statusA = a.status === 'OPERATING' ? 0 : 1;
                    const statusB = b.status === 'OPERATING' ? 0 : 1;
                    if (statusA !== statusB) return statusA - statusB;

                    const waitA = a.queue?.STANDBY?.waitTime ?? 999;
                    const waitB = b.queue?.STANDBY?.waitTime ?? 999;
                    return waitA - waitB;
                });
                
                // Ajouter toutes les cartes d'attraction
                attractionsInLand.forEach(attraction => {
                    listElement.innerHTML += createAttractionCardHtml(attraction, land);
                });
            }
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des données de l'API (Disneyland Park) :", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Échec Critique : Impossible de charger les données.</div>`;
    }
}