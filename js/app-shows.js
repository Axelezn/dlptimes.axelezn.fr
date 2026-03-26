// js/app-shows.js - V33 (UX Mobile Améliorée + Filtrage Strict)

// ⭐ CONSTANTES
const CONFIG = {
    DESTINATION_ID: 'e8d0207f-da8a-4048-bec8-117aa946b2c2',
    PARK_ID_DLP: 'dae968d5-630d-4719-8b06-3d107e944401', 
    PARK_ID_WDS: 'ca888437-ebb4-4d50-aed2-d227f7096968', 
    API_URL: `https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live`,
    REFRESH_INTERVAL: 120000,
    EXCLUDED_SHOWS: [
        "Reserved viewing area: Disney Stars on Parade",
        "Reserved viewing area: Nighttime show"
    ]
};

// --- UTILITAIRES ---

const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const translateShowName = (name) => {
    const map = {
        "A Sweet Moment with Mrs. Claus" : "Le Partage Gourmand de la Mère Noël",
        "Disney Princess Holiday Season Celebration": "Les Princesses Disney célèbrent les Fêtes de Fin d'Année",
        "Holiday Gathering" : "Retrouvailles de Fêtes",
        "Let’s Sing Christmas!":"Spectacle musical Chantons Noël !",
        "Mickey's Dazzling Christmas Parade!":"Micket et sa Parade Etincelante de Noël !",
        "Mickey’s PhilharMagic": "Mickey et son Orchestre PhilharMagique",
        "Princess Aurora's Magical Wishes":"Les Voeux Magiques de la Princesse Aurore",
        "The Lion King: Rhythms of the Pride Lands":"Le Roi Lion et les Rythmes de la Terre",
        "Doctor Strange: Mystery of the Mystics!" : "Doctor Strange : Mystères Mystiques",
        "Frozen: A Musical Invitation" : "La Reine des Neiges : Une Invitation Musicale",
        "TOGETHER: a Pixar Musical Adventure" : "TOGETHER : une Aventure Musicale Pixar",
        "Stitch Live!": "Stitch Live!",
    };
    return map[name] || name;
};

const getLocation = (entity) => {
    let loc = { park: "Inconnu", land: "" };
    
    if (entity.parkId === CONFIG.PARK_ID_DLP) loc.park = "Parc Disneyland";
    else if (entity.parkId === CONFIG.PARK_ID_WDS) loc.park = "Walt Disney Studios Park";

    const eid = entity.externalId || '';
    if (eid.startsWith('P1') && eid.endsWith('G103')) loc.land = "Discoveryland Theater";
    else if (eid.startsWith('P1GS21')) loc.land = "Itinéraire Parade";
    else if (eid.startsWith('P1GS34')) loc.land = "Frontierland Theater";
    else if (eid.startsWith('P2GS58')) loc.land = "Studio Theater";
    else if (eid.startsWith('P2YS03')) loc.land = "World Premiere Plaza";
    else if (eid.startsWith('P1GS99')) loc.land = "Central Plaza / Main Street";
    else if (eid.startsWith('P2GS54')) loc.land = "Animation Celebration";
    else if (eid.startsWith('P2GS23')) loc.land ="Animation Celebration";
    else if (eid.startsWith('P2GS63')) loc.land = "Avengers CAMPUS";
    else if (eid.startsWith('P2GS58')) loc.land ="Studio Theater";
    else if (eid.startsWith('P2YS08')) loc.land="Animagique Theater";
    else if (entity.areaName) loc.land = entity.areaName;
    else loc.land = eid.startsWith('P1') ? "Disneyland Park" : "Studios Park";

    return loc;
};

const getShowUrgencyClass = (diff) => {
    if (diff < 15) return 'time-gold-box'; 
    if (diff < 30) return 'time-red-box';
    if (diff < 45) return 'time-orange-box';
    if (diff < 60) return 'time-green-box';
    return 'time-far-box';
};

// --- GÉNÉRATION HTML ---

const createFavButton = (id) => {
    if (typeof window.isFavorite !== 'function') return '';
    const isActive = window.isFavorite(id);
    const heart = isActive ? '❤️' : '🤍';
    const activeClass = isActive ? 'active' : '';
    return `<button class="fav-btn ${activeClass}" onclick="event.stopPropagation(); window.toggleFavorite('${id}'); this.classList.toggle('active'); this.innerText = this.classList.contains('active') ? '❤️' : '🤍';">${heart}</button>`;
};

const createShowCardHtml = (show, location) => {
    const showName = translateShowName(show.name); 
    const allScheduleData = show.showtimes || [];
    const now = new Date();

    // ⭐ DÉFINITION DE LA JOURNÉE (00:00 -> 23:59)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Filtrer : On ne garde QUE les horaires compris dans la journée d'aujourd'hui
    const todaysScheduleData = allScheduleData.filter(item => {
        const timeString = item.startTime || item.endTime; 
        const date = new Date(timeString);
        return date >= startOfDay && date <= endOfDay;
    });

    // 🛑 SI AUCUN HORAIRE AUJOURD'HUI, ON N'AFFICHE PAS LA CARTE
    if (show.status === 'OPERATING' && todaysScheduleData.length === 0) {
        return ''; 
    }

    // 2. Horaires Futurs (pour le compte à rebours)
    const futureScheduleData = todaysScheduleData.filter(item => {
        const timeString = item.startTime || item.endTime; 
        return new Date(timeString) > now;
    });

    const status = show.status; 
    let scheduleHtml = '';
    let minDiff = Infinity;
    let countdownHtml = ''; 
    let statusClass = ''; 

    if (status === 'OPERATING') {
        // Calcul du compte à rebours
        if (futureScheduleData.length > 0) {
            for (const item of futureScheduleData) {
                const timeString = item.startTime || item.endTime;
                const diff = Math.floor((new Date(timeString).getTime() - now.getTime()) / 60000);
                if (diff < minDiff) minDiff = diff;
            }
            
            if (minDiff !== Infinity) {
                const formattedCountdown = formatMinutes(minDiff);
                const urgencyClass = getShowUrgencyClass(minDiff);
                let countdownClass = 'countdown-default'; 
                let urgencyMessage = '';

                if (urgencyClass === 'time-gold-box') { countdownClass = 'countdown-gold'; }
                else if (urgencyClass === 'time-red-box') countdownClass = 'countdown-red';
                else if (urgencyClass === 'time-green-box') countdownClass = 'countdown-green';

                let countdownText = `Prochain show dans <span class="countdown-value">${formattedCountdown}</span>`;
                if (minDiff < 5) { countdownText = `<span class="countdown-value">MAINTENANT - Rendez-vous au lieu du spectacle</span>`;}

                countdownHtml = `<div class="show-countdown"><span class="${countdownClass}">${countdownText}</span></div>`;
            }
        } else {
            // Plus de futur, mais il y en avait aujourd'hui
            countdownHtml = `<div class="show-countdown"><span class="countdown-default">Terminé pour aujourd'hui</span></div>`;
        }

        // Liste des horaires
        let isStitchLive = (show.name === 'Stitch Live!');
        
        const timesHtml = todaysScheduleData.map((item) => {
            const timeString = item.startTime || item.endTime;
            let formattedTime = 'Heure Invalide';
            let showTimeDate;
            try {
                showTimeDate = new Date(timeString);
                formattedTime = showTimeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {}
            
            const diff = Math.floor((showTimeDate.getTime() - now.getTime()) / 60000);
            const isPast = showTimeDate < now;
            const boxClass = isPast ? 'time-past-box' : getShowUrgencyClass(diff);
            
            let languageFlag = '';
            if (isStitchLive) {
                const originalIndex = allScheduleData.indexOf(item);
                if (originalIndex !== -1) {
                    // 0 = Anglais, 1 = Français
                    languageFlag = (originalIndex % 2 === 0) ? '🇬🇧 ' : '🇫🇷 '; 
                }
            }

            return `<span class="${boxClass}">${languageFlag}<strong>${formattedTime}</strong></span>`;
        }).join('');

        scheduleHtml = `${countdownHtml}<div class="show-times-container">${timesHtml}</div>`;
        statusClass = `show-status-active`;

    } else if (status === 'REFURBISHMENT') {
        scheduleHtml = '<p class="show-times status-closed">Rénovation</p>';
        statusClass = 'show-status-closed';
    } else {
        // Status DOWN ou CLOSED sans horaires
        let msg = status === 'DOWN' ? 'Panne Technique !' : 'Fermé';
        let css = status === 'DOWN' ? 'status-down' : 'status-closed';
        statusClass = status === 'DOWN' ? 'show-status-down' : 'show-status-closed';
        scheduleHtml = `<p class="show-times ${css}">${msg}</p>`;
    }

    const locationDisplay = (location.park && location.land) ? `${location.park} - ${location.land}` : location.park;

    return `
        <div class="show-card ${statusClass}" id="card-${show.id}">
            <div class="show-info">
                <div style="display:flex; justify-content:space-between; align-items:start; padding-right:10px;">
                    <h3 style="margin:0;">${showName}</h3>
                    ${createFavButton(show.id)}
                </div>
                <p class="show-park-land">${locationDisplay}</p>
            </div>
            <div class="show-schedule">
                ${scheduleHtml}
            </div>
        </div>
    `;
};

// --- LOGIQUE DE RECHERCHE AMÉLIORÉE (UX MOBILE) ---
const setupSearch = () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    // 1. Filtrage en temps réel
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.park-group').forEach(group => {
            const cards = group.querySelectorAll('.show-card');
            let hasVisible = false;
            cards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const match = title.includes(term);
                card.style.display = match ? 'flex' : 'none';
                if (match) hasVisible = true;
            });
            group.style.display = hasVisible ? 'block' : 'none';
        });
    });

    // 2. Touche "Entrée" -> Ferme le clavier (Blur)
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            searchInput.blur(); // 🛑 Ferme le clavier
        }
    });

    // 3. Scroll de la page -> Ferme le clavier
    window.addEventListener('scroll', () => {
        if (document.activeElement === searchInput) {
            searchInput.blur(); // 🛑 Ferme le clavier pour voir les résultats
        }
    }, { passive: true });
};

// --- PRINCIPAL ---
const fetchShowTimes = async () => {
    const listElement = document.getElementById('shows-list');
    if (!listElement) return;
    if (!listElement.innerHTML.trim()) listElement.innerHTML = '<div class="loading-message">⌛ Chargement...</div>';

    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        
        const allShows = (data.liveData || []).filter(entity => 
            entity.entityType === 'SHOW' && 
            (entity.parkId === CONFIG.PARK_ID_DLP || entity.parkId === CONFIG.PARK_ID_WDS) &&
            !CONFIG.EXCLUDED_SHOWS.includes(entity.name) 
        );

        // FILTRE GLOBAL : On garde ce qui a des horaires AUJOURD'HUI (même passés) ou qui est en Réno/Panne
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const activeShows = allShows.filter(show => {
            if (show.status === 'REFURBISHMENT' || show.status === 'DOWN') return true; 
            const scheduleData = show.showtimes || [];
            return scheduleData.some(item => {
                const d = new Date(item.startTime || item.endTime);
                return d >= startOfDay && d <= endOfDay;
            });
        });

        listElement.innerHTML = '';
        
        if (activeShows.length === 0) {
            listElement.innerHTML = '<div class="loading-message status-closed">Aucun spectacle programmé pour aujourd\'hui.</div>';
            return;
        }

        const showsByPark = activeShows.reduce((acc, show) => {
            const loc = getLocation(show);
            const p = loc.park;
            if (!acc[p]) acc[p] = { location: loc, shows: [] };
            acc[p].shows.push(show);
            return acc;
        }, {});

        const parkOrder = ["Parc Disneyland", "Disney Adventure World", "Inconnu"];

        parkOrder.forEach(park => {
            const parkData = showsByPark[park];
            if (parkData && parkData.shows.length > 0) {
                let cardsHtml = '';
                
                // Tri Favoris
                parkData.shows.sort((a, b) => {
                    if (typeof window.isFavorite === 'function') {
                        const favA = window.isFavorite(a.id);
                        const favB = window.isFavorite(b.id);
                        if (favA !== favB) return favB - favA;
                    }
                    return a.name.localeCompare(b.name);
                });

                parkData.shows.forEach(show => {
                    cardsHtml += createShowCardHtml(show, getLocation(show));
                });
                
                // N'affiche le titre du parc que s'il y a des cartes visibles
                if (cardsHtml.trim() !== '') {
                    listElement.innerHTML += `<div class="park-group"><h2 class="park-show-header">${park}</h2>${cardsHtml}</div>`;
                }
            }
        });
        
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input'));

    } catch (error) {
        console.error(error);
        listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    fetchShowTimes();
    setInterval(fetchShowTimes, CONFIG.REFRESH_INTERVAL);
    setupSearch();
});