// js/app-studios.js - V11 (Fixe l'extraction du Premier Access : utilise PAID_RETURN_TIME)

// ⭐ CONSTANTES D'IDENTIFICATION ET DE RAFFRAICHISSEMENT
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const STUDIOS_PARK_ID = 'ca888437-ebb4-4d50-aed2-d227f7096968'; 
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const REFRESH_INTERVAL = 90000; 

// ⭐ CONSTANTES DES ATTRACTIONS AVEC RÉSERVATION / FILE VIRTUELLE (WDS) ⭐
const VIRTUAL_QUEUE_ATTRACTIONS_STUDIOS = [
    // Liste à compléter si besoin
];

// --- DÉFINITION DES ZONES (LANDS) pour les Studios ---
function getLandName(attraction) {
    const externalId = attraction.externalId || '';
    
    if (externalId.startsWith('P2AC')) return "Avengers Campus"; 
    if (externalId.startsWith('P2TM')) return "Toon Studio"; 
    if (externalId.startsWith('P2HA')) return "Hollywood Boulevard"; 
    if (externalId.startsWith('P2ZA')) return "Production Courtyard / Front Lot";
    if (externalId.startsWith('P2XA0')) return "Worlds of Pixar";
    
    if (externalId.startsWith('P2E')) return "Worlds of Pixar"; 
    
    if (attraction.name.includes("Studio Theater") || attraction.name.includes("Front Lot")) return "Production Courtyard / Front Lot"; 
    
    return "Autre / Non Classé"; 
}

function getLogoFileName(landName) {
    return landName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') 
        .replace(/\s+/g, '_') + '_logo.png';
}

/**
 * Génère la chaîne HTML complète pour une carte d'attraction, incluant Single Rider et PREMIER ACCESS.
 */
function createAttractionCardHtml(attraction, land) {
    let waitHtml = '';
    let singleRiderHtml = ''; 
    let dpaHtml = ''; 

    // ⭐ CORRECTION DE L'EXTRACTION DPA VERS PAID_RETURN_TIME ⭐
    const dpaQueue = attraction.queue?.PAID_RETURN_TIME; // <-- CLÉ CORRIGÉE
    const dpaStartTime = dpaQueue?.returnStart;          // <-- CLÉ CORRIGÉE
    const dpaEndTime = dpaQueue?.returnEnd;              // <-- CLÉ CORRIGÉE
    const dpaPriceFormatted = dpaQueue?.price?.formatted; // <-- CLÉ CORRIGÉE

    // Le Premier Access est disponible si l'objet DPA existe et contient les heures
    const isDpaAvailable = dpaQueue && dpaStartTime && dpaEndTime; 
    
    let waitTime = attraction.queue?.STANDBY?.waitTime ?? null;
    let singleRiderTime = attraction.queue?.SINGLE_RIDER?.waitTime ?? null; 
    
    let finalClass = '';
    const attractionName = attraction.name; 

    // 1. GESTION DU TEMPS D'ATTENTE STANDARD
    if (attraction.status === 'OPERATING') {
        
        const isVirtualQueue = VIRTUAL_QUEUE_ATTRACTIONS_STUDIOS.includes(attractionName);

        if (isVirtualQueue && (waitTime === 0 || waitTime === null)) {
             statusText = 'Réservation';
             finalClass = 'status-reservation'; 
             waitHtml = `<div class="wait-time ${finalClass}">${statusText}</div>`;
             
        } else if (waitTime !== null && waitTime >= 0) { 
             finalClass = (typeof getTimeClass === 'function') ? 
                             getTimeClass(attractionName, waitTime) : 'time-default'; 
             
             waitHtml = `
                 <div class="wait-time ${finalClass}">
                     ${waitTime} min
                 </div>
             `;
             
        } else {
             statusText = 'Ouvert';
             finalClass = 'time-default'; 
             waitHtml = `<div class="wait-time ${finalClass}">${statusText}</div>`;
        }
        
        // 2. LOGIQUE SINGLE RIDER
        if (singleRiderTime !== null && singleRiderTime >= 0) {
            let srStatusText = '';
            let srFinalClass = '';
            
            if (singleRiderTime === 0) {
                 srStatusText = 'Single Rider : Fermé';
                 srFinalClass = 'status-closed-single'; 
            } else {
                 srStatusText = `Single Rider : ${singleRiderTime} min`;
                 srFinalClass = 'status-single-rider';
            }
            
            singleRiderHtml = `
                <div class="wait-time single-rider-time ${srFinalClass}">
                    ${srStatusText}
                </div>
            `;
        }
        
        // 3. ⭐ LOGIQUE PREMIER ACCESS (DPA) avec heures corrigées ⭐
        if (isDpaAvailable) {
            // Extraction HH:MM (index 11 à 16)
            const formattedStartTime = dpaStartTime.substring(11, 16);
            const formattedEndTime = dpaEndTime.substring(11, 16);
            
            // Le prix formaté inclut déjà la devise (€)
            const displayPrice = dpaPriceFormatted || 'Prix NC'; 

            dpaHtml = `
                <div class="dpa-details-container">
                    <div class="dpa-toggle-header">
                        <p class="dpa-label">Premier Access ⚡</p>
                        <span class="dpa-toggle-icon">▼</span> 
                    </div>
                    <div class="dpa-details" style="display:none;">
                        <span class="dpa-info dpa-price">Prix : ${displayPrice}</span>
                        <span class="dpa-info dpa-time">Retour pour : ${formattedStartTime} - ${formattedEndTime}</span>
                    </div>
                </div>
            `;
        }


    } 
    
    // GESTION DES ATTRACTIONS FERMÉES/RÉNOVATION
    else {
        let statusText = '';
        if (attraction.status === 'CLOSED' || waitTime === null) {
             statusText = 'Fermé';
        } else if (attraction.status === 'REFURBISHMENT') {
             statusText = 'Rénov.';
        } else {
             statusText = 'Indisp.';
        }
        
        finalClass = 'status-closed'; 
        waitHtml = `<div class="wait-time ${finalClass}">${statusText}</div>`;
    }
    
    return `
        <div class="attraction-card">
            <div class="attraction-info">
                <h3>${attractionName}</h3>
                <p>${land}</p>
                ${dpaHtml} </div>
            <div class="wait-times-container">
                ${waitHtml}
                ${singleRiderHtml}
            </div>
        </div>
    `;
}

// ⭐ FONCTION : Active la bascule (toggle) du Premier Access ⭐ (AUCUN CHANGEMENT)
function setupDpaToggle() {
    document.querySelectorAll('.dpa-toggle-header').forEach(header => {
        header.addEventListener('click', function() {
            const details = this.nextElementSibling;
            const icon = this.querySelector('.dpa-toggle-icon');
            
            if (details.style.display === 'none' || details.style.display === '') {
                // Déplie
                details.style.display = 'flex'; // Utilise flex pour l'alignement
                icon.classList.add('rotated');
            } else {
                // Replie
                details.style.display = 'none';
                icon.classList.remove('rotated');
            }
        });
    });
}


// --- FONCTION PRINCIPALE DE LANCEMENT (AUCUN CHANGEMENT MAJEUR) ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAttractionTimes();
    setInterval(fetchAttractionTimes, REFRESH_INTERVAL);
});

async function fetchAttractionTimes() {
    const listElement = document.getElementById('attractions-list-studios'); 
    
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

        const landOrder = ["Hollywood Boulevard", "Production Courtyard / Front Lot", "Toon Studio", "Worlds of Pixar", "Avengers Campus", "Autre / Non Classé"];
        
        // Génération du HTML
        landOrder.forEach(land => {
            const attractionsInLand = attractionsByLand[land];
            if (attractionsInLand && attractionsInLand.length > 0) {
                
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
        
        // APPEL DE LA FONCTION DE MISE EN PLACE DE LA BASUCULE DPA
        setupDpaToggle(); 

    } catch (error) {
        console.error("Erreur lors de la récupération des données de l'API (Studios Park) :", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Échec Critique : Impossible de charger les données.</div>`;
    }
}