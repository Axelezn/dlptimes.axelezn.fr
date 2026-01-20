// js/crowd-meter.js - Indicateur d'affluence globale (Calibré pour 17 attractions)

const CROWD_API_URL = 'https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live';

// Les attractions témoins (Mélange de E-Tickets et de classiques à fort débit)
const REFERENCE_ATTRACTIONS = [
    'P1RA00', // Big Thunder Mountain
    'P1NA10', // Peter Pan's Flight
    'P1DA08', // Hyperspace Mountain
    'P2XA03', // Crush's Coaster
    'P2ZA02', // Tower of Terror
    'P2XA09', // Ratatouille
    'P1RA03', // Phantom Manor
    'P1AA04', // Pirates of the Caribbean
    'P1AA02', // Indiana Jones
    'P1NA07', // It's a Small World
    'P1DA09', // Star Tours
    'P2XA07', // Toy Soldiers Parachute Drop
    'P2XA06', // RC Racer
    'P2AC02', // Spider-Man W.E.B.
    'P2AC01', // Avengers Flight Force
    'P1NA01', // Blanche-Neige
    'P1DA07'  // Orbitron
];

async function loadCrowdLevel() {
    const container = document.getElementById('crowd-widget');
    if (!container) return;

    try {
        const response = await fetch(CROWD_API_URL);
        const data = await response.json();
        const liveData = data.liveData || [];

        // 1. On récupère les temps d'attente
        let totalWait = 0;
        let count = 0;

        liveData.forEach(entity => {
            if (REFERENCE_ATTRACTIONS.includes(entity.externalId) && entity.status === 'OPERATING') {
                const wait = entity.queue?.STANDBY?.waitTime;
                if (typeof wait === 'number') {
                    totalWait += wait;
                    count++;
                }
            }
        });

        // Si tout est fermé
        if (count === 0) {
            container.innerHTML = `<span class="crowd-icon">🌙</span> <span class="crowd-text">Parcs Fermés</span>`;
            container.style.opacity = '1';
            return;
        }

        // 2. Calcul de la moyenne
        const average = Math.round(totalWait / count);
        
        let level = '';
        let icon = '';
        let colorClass = '';

        // 3. Définition des paliers (Calibrés pour une moyenne sur 17 attractions)
        if (average <= 20) {
            level = 'Faible';
            icon = '🟢';
            colorClass = 'crowd-low';
        } else if (average <= 35) {
            level = 'Modérée';
            icon = '🟠';
            colorClass = 'crowd-medium';
        } else if (average <= 55) {
            level = 'Forte';
            icon = '🔴';
            colorClass = 'crowd-high';
        } else {
            level = 'Saturée';
            icon = '⚫'; // Affluence critique
            colorClass = 'crowd-full';
        }

        // 4. Injection HTML
        container.innerHTML = `
            <span class="crowd-icon">${icon}</span>
            <span class="crowd-text">Affluence : <strong class="${colorClass}">${level}</strong></span>
            <span class="crowd-avg">~${average}min</span>
        `;
        
        container.style.opacity = '1';

    } catch (error) {
        console.error("Erreur Crowd Meter", error);
    }
}

document.addEventListener('DOMContentLoaded', loadCrowdLevel);