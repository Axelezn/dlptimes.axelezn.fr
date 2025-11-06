// js/app-studios.js - V7 (Final - Fix ID)

// ⭐ CONSTANTES D'IDENTIFICATION ET DE RAFFRAICHISSEMENT
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const STUDIOS_PARK_ID = 'ca888437-ebb4-4d50-aed2-d227f7096968'; 
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const REFRESH_INTERVAL = 90000; 

// --- DÉFINITION DES ZONES (LANDS) pour les Studios ---
function getLandName(attraction) {
    const externalId = attraction.externalId || '';
    
    // Logique basée sur les IDs externes
    if (externalId.startsWith('P2AC')) return "Avengers Campus"; 
    if (externalId.startsWith('P2TM')) return "Toon Studio"; 
    if (externalId.startsWith('P2HA')) return "Hollywood Boulevard"; 
    if (externalId.startsWith('P2ZA')) return "Production Courtyard / Front Lot";
    if (externalId.startsWith('P2XA0')) return "Worlds of Pixar";
    //if (externalId.startsWith('P2XA03')) return "World of Pixar";
    //if (externalId.startsWith('P2XA09')) return "World of Pixar";
    
    // P2E est souvent Worlds of Pixar (Ratatouille, Crush)
    if (externalId.startsWith('P2E')) return "Worlds of Pixar"; 
    
    if (attraction.name.includes("Studio Theater") || attraction.name.includes("Front Lot")) return "Production Courtyard / Front Lot"; 
    
    return "Autre / Non Classé"; 
}

// ⭐ FONCTION UTILITAIRE : Normalise le nom du Land pour le chemin du fichier PNG
// (Copie exacte de app-park.js)
function getLogoFileName(landName) {
    return landName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') 
        .replace(/\s+/g, '_') + '_logo.png';
}

/**
 * Génère la chaîne HTML complète pour une carte d'attraction (Copie de app-park.js).
 */
function createAttractionCardHtml(attraction, land) {
    let waitHtml = '';
    let waitTime = attraction.queue?.STANDBY?.waitTime ?? null;
    let finalClass = '';

    if (attraction.status === 'OPERATING' && waitTime !== null && waitTime >= 0) {
        finalClass = (typeof getTimeClass === 'function') ? 
                            getTimeClass(attraction.name, waitTime) : 'time-default'; 
        
        waitHtml = `
            <div class="wait-time ${finalClass}">
                ${waitTime} min
            </div>
        `;

    } else {
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
    fetchAttractionTimes();
    setInterval(fetchAttractionTimes, REFRESH_INTERVAL);
});

async function fetchAttractionTimes() {
    // ⭐ CIBLE WDS : attractions-list-studios. C'est le point clé de la correction. ⭐
    const listElement = document.getElementById('attractions-list-studios'); 
    
    // Vérification de sécurité (qui ne devrait plus être nécessaire avec le HTML ci-dessus)
    if (listElement === null) {
        console.error("Erreur Critique: L'élément HTML de la liste WDS ('attractions-list-studios') est introuvable.");
        return; 
    }
    
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
            entity.entityType === 'ATTRACTION' && entity.parkId === STUDIOS_PARK_ID
        );
        
        listElement.innerHTML = ''; 
        
        if (attractions.length === 0) {
            listElement.innerHTML = '<div class="loading-message">Aucune attraction trouvée ou ouverte actuellement.</div>';
            return;
        }

        const attractionsByLand = attractions.reduce((acc, attraction) => {
            const land = getLandName(attraction);
            if (!acc[land]) { acc[land] = []; }
            acc[land].push(attraction);
            return acc;
        }, {});

        // Ordre des Lands pour les Studios
        const landOrder = ["Hollywood Boulevard", "Production Courtyard / Front Lot", "Toon Studio", "Worlds of Pixar", "Avengers Campus", "Autre / Non Classé"];
        
        // Génération du HTML
        landOrder.forEach(land => {
            const attractionsInLand = attractionsByLand[land];
            if (attractionsInLand && attractionsInLand.length > 0) {
                
                // Ajout du conteneur de logo et du titre Land
                const logoFileName = getLogoFileName(land);
                listElement.innerHTML += `
                    <div class="land-header-container">
                        <img src="./imgs/logos/${logoFileName}" alt="Logo ${land}" class="land-logo">
                        <h2 class="land-header">${land}</h2>
                    </div>
                `;
                
                // Tri
                attractionsInLand.sort((a, b) => {
                    const statusA = a.status === 'OPERATING' ? 0 : 1;
                    const statusB = b.status === 'OPERATING' ? 0 : 1;
                    if (statusA !== statusB) return statusA - statusB;

                    const waitA = a.queue?.STANDBY?.waitTime ?? 999;
                    const waitB = b.queue?.STANDBY?.waitTime ?? 999;
                    return waitA - waitB;
                });
                
                // Cartes d'attraction
                attractionsInLand.forEach(attraction => {
                    listElement.innerHTML += createAttractionCardHtml(attraction, land);
                });
            }
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des données de l'API (Studios Park) :", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Échec Critique : Impossible de charger les données.</div>`;
    }
}