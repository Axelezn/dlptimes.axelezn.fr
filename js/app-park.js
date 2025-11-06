// js/app-park.js - V13 (UX Premier Access : Ligne entière cliquable & nouveau format d'affichage)

// ⭐ CONSTANTES D'IDENTIFICATION ET DE RAFFRAICHISSEMENT
const DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const DISNEYLAND_PARK_ID = 'dae968d5-630d-4719-8b06-3d107e944401'; 
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`; 
const REFRESH_INTERVAL = 90000; // Actualisation toutes les 90 secondes (1.5 minute)

// ⭐ CONSTANTES DES ATTRACTIONS AVEC RÉSERVATION / FILE VIRTUELLE
const VIRTUAL_QUEUE_ATTRACTIONS = [
    "Meet Mickey Mouse",
    "Welcome to Starport: A Star Wars Encounter",
    "Princess Pavilion" 
];

// ⭐ NOUVELLE CONSTANTE : STAND DE TIR PAYANT ⭐
const SHOOTING_GALLERY_NAME = "Rustler Roundup Shootin' Gallery";


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
    return landName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') 
        .replace(/\s+/g, '_') + '_logo.png';
}

// ⭐ FONCTION MODIFIÉE : Gère l'affichage/masquage des détails Premier Access
function setupDpaToggleListeners() {
    document.querySelectorAll('.attraction-card').forEach(card => {
        // Cibler l'en-tête entier (dpa-toggle-header) pour le clic
        const toggleHeader = card.querySelector('.dpa-toggle-header'); 
        const detailsContainer = card.querySelector('.dpa-details-container');
        
        if (toggleHeader && detailsContainer) {
            toggleHeader.onclick = () => { // Le clic est sur l'en-tête
                const details = detailsContainer.querySelector('.dpa-details');
                const toggleIcon = toggleHeader.querySelector('.dpa-toggle-icon'); // L'icône est dans l'en-tête
                
                const isHidden = details.style.display === 'none';
                
                details.style.display = isHidden ? 'flex' : 'none'; 
                toggleIcon.classList.toggle('rotated', isHidden); 
            };
        }
    });
}

/**
 * Formate l'heure de retour pour le Premier Access.
 * @param {string} isoString L'heure au format ISO (e.g., "2025-11-06T13:20:00+01:00")
 * @returns {string} L'heure formatée (e.g., "13h20")
 */
function formatReturnTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        }).replace(':', 'h');
    } catch (e) {
        return 'Heure inconnue';
    }
}


/**
 * Génère la chaîne HTML complète pour une carte d'attraction, incluant Single Rider si disponible et Premier Access.
 */
function createAttractionCardHtml(attraction, land) {
    let waitHtml = '';
    let singleRiderHtml = ''; 
    let dpaToggleHtml = ''; 
    
    let waitTime = attraction.queue?.STANDBY?.waitTime ?? null;
    let singleRiderTime = attraction.queue?.SINGLE_RIDER?.waitTime ?? null; 
    let dpaData = attraction.queue?.PAID_RETURN_TIME; 
    
    let finalClass = '';
    const attractionName = attraction.name; 
    
    // ⭐ 1. GESTION DU STAND DE TIR PAYANT ⭐
    if (attractionName === SHOOTING_GALLERY_NAME && attraction.status === 'OPERATING') {
        waitHtml = `<div class="wait-time status-payant">Ouvert : 3€</div>`;
    } 
    
    // ⭐ 2. GESTION DES ATTRACTIONS OUVERTES (Standard, Réservation ou Autre) ⭐
    else if (attraction.status === 'OPERATING') {
        
        const isVirtualQueue = VIRTUAL_QUEUE_ATTRACTIONS.includes(attractionName);

        if (isVirtualQueue && (waitTime === 0 || waitTime === null)) {
            statusText = 'Sur réservation';
            finalClass = 'status-reservation'; 
            waitHtml = `<div class="wait-time ${finalClass}">${statusText}</div>`;
        
        } else if (waitTime === 0) { 
            statusText = 'Ouvert';
            finalClass = 'status-opened'; 
            waitHtml = `<div class="wait-time ${finalClass}">${statusText}</div>`;

        } else if (waitTime !== null && waitTime > 0) { 
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
        
        // ⭐ 3. LOGIQUE SINGLE RIDER ⭐
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

    } 
    
    // ⭐ 4. GESTION DES ATTRACTIONS FERMÉES/RÉNOVATION ⭐
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
    
    // ⭐ 5. LOGIQUE PREMIER ACCESS (DPA) ⭐
    if (dpaData && dpaData.state === 'AVAILABLE') {
        const price = dpaData.price?.formatted || 'Prix inconnu';
        const returnStart = formatReturnTime(dpaData.returnStart);
        const returnEnd = formatReturnTime(dpaData.returnEnd);
        
        // Structure de la section DPA (Notez la nouvelle structure des détails)
        dpaToggleHtml = `
            <div class="dpa-details-container">
                <div class="dpa-toggle-header">
                    <p class="dpa-label">Premier Access ⚡</p>
                    <span class="dpa-toggle-icon">▼</span>
                </div>
                <div class="dpa-details" style="display:none;">
                    
                    <span class="dpa-info dpa-price-label">Prix : </span>
                    <span class="dpa-info dpa-price">${price}</span>
                    
                    <span class="dpa-info dpa-time-label">Retour pour : </span>
                    <span class="dpa-info dpa-time">${returnStart} - ${returnEnd}</span>

                </div>
            </div>
        `;
    }
    
    return `
        <div class="attraction-card">
            <div class="attraction-info">
                <h3>${attractionName}</h3>
                <p>${land}</p>
                ${dpaToggleHtml}
            </div>
            <div class="wait-times-container">
                ${waitHtml}
                ${singleRiderHtml}
            </div>
        </div>
    `;
}

// --- FONCTION PRINCIPALE DE LANCEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAttractionTimes();
    setInterval(fetchAttractionTimes, REFRESH_INTERVAL);
});

async function fetchAttractionTimes() {
    // ... (Logique de chargement, de tri et d'affichage inchangée) ...
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
                
                // Entête du Land
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

        // Setup des listeners DPA après le rechargement du DOM
        setupDpaToggleListeners();

    } catch (error) {
        console.error("Erreur lors de la récupération des données de l'API (Disneyland Park) :", error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Échec Critique : Impossible de charger les données.</div>`;
    }
}