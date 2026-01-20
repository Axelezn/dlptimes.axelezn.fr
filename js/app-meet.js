// js/app-meet.js - V27 (Fix Recherche: Utilisation de display:block pour éviter le rétrécissement)

{ // 🛡️ Bloc d'isolation

    const MEET_CONFIG = {
        API_URL: "https://api.dlpwait.com/",
        QUERY: `query { 
            entertainment { 
                id 
                active 
                name 
                category 
                region 
                park { name } 
                services { photoPass virtualQueue } 
                virtualQueue { available } 
                schedules { startTime } 
            } 
        }`,
        REFRESH_INTERVAL: 60000 
    };

    // --- TRADUCTIONS ---
    const TRANSLATIONS = {
        "Meet": "Rencontre avec",
        "and Friends": "et ses amis",
        "near": "près de",
        "at": "à",
        "Princess Pavilion": "Pavillon des Princesses",
        "Hero Training Center": "Hero Training Center",
        "Town Square": "Town Square",
        "Boarding House": "Boarding House",
        "Casey's Corner": "Casey's Corner",
        "Phantom Manor": "Phantom Manor",
        "Frontierland": "Frontierland",
        "Adventureland": "Adventureland",
        "Fantasyland": "Fantasyland",
        "Discoveryland": "Discoveryland",
        "Toon Studio": "Toon Studio",
        "Production Courtyard": "Production Courtyard",
        "Front Lot": "Front Lot",
        "Avengers Campus": "Avengers Campus",
        "Mickey Mouse": "Mickey",
        "Minnie Mouse": "Minnie",
        "Donald Duck": "Donald",
        "Daisy Duck": "Daisy",
        "Goofy": "Dingo",
        "Chip and Dale": "Tic et Tac",
        "Winnie the Pooh": "Winnie l'Ourson",
        "Stitch": "Stitch",
        "Captain Hook": "Capitaine Crochet",
        "Jafar": "Jafar",
        "Genie": "Génie",
        "Aladdin": "Aladdin",
        "Jack Skellington": "Jack Skellington",
        "Darth Vader": "Dark Vador",
        "Magic Shot": "Magic Shot",
        "Photo Location": "Point Photo"
    };

    // --- UTILITAIRES ---

    const translateText = (text) => {
        if (!text) return "";
        let translated = text;
        Object.keys(TRANSLATIONS).forEach(key => {
            const regex = new RegExp(`\\b${key}\\b`, 'gi'); 
            translated = translated.replace(regex, TRANSLATIONS[key]);
        });
        translated = translated.replace("Mickey Mouse", "Mickey");
        return translated;
    };

    const getMinutesUntil = (timeStr) => {
        const [h, m] = timeStr.split(':');
        const now = new Date();
        const showDate = new Date();
        showDate.setHours(h, m, 0, 0);
        if (showDate < now) return null; 
        return Math.floor((showDate - now) / 60000);
    };

    const getNextShowTime = (schedules) => {
        if (!schedules) return null;
        const now = new Date();
        const validSchedules = schedules
            .map(s => s.startTime.substring(0, 5)) 
            .filter(time => {
                const [h, m] = time.split(':');
                const d = new Date();
                d.setHours(h, m, 0, 0);
                return d >= now; 
            })
            .sort();
        return validSchedules.length > 0 ? validSchedules[0] : null;
    };

    // ⭐ COULEURS (Vos règles strictes) ⭐
    const getTimeBoxClass = (minutes) => {
        if (minutes === null) return 'time-past-box'; 
        if (minutes < 15) return 'time-gold-box';
        if (minutes < 30) return 'time-green-box';
        if (minutes < 45) return 'time-orange-box';
        if (minutes < 60) return 'time-red-box';
        return 'time-far-box'; // +1h (Blanc)
    };

    // --- GÉNÉRATION HTML ---

    const createFavButton = (id) => {
        if (typeof window.isFavorite !== 'function') return '';
        const isActive = window.isFavorite(id);
        const heart = isActive ? '❤️' : '🤍';
        const activeClass = isActive ? 'active' : '';
        return `<button class="fav-btn ${activeClass}" 
            onclick="event.stopPropagation(); window.toggleFavorite('${id}'); this.classList.toggle('active'); this.innerText = this.classList.contains('active') ? '❤️' : '🤍';">
            ${heart}
        </button>`;
    };

    const createMeetCard = (char) => {
        const hasSchedules = char.schedules && char.schedules.length > 0;
        const hasVQ = char.virtualQueue && char.virtualQueue.available === true;
        
        const nameFR = translateText(char.name);
        const regionFR = translateText(char.region || "Lieu non précisé");
        
        const isPhoto = char.services && char.services.photoPass === true;
        let photoLineHtml = '';
        
        if (isPhoto) {
            photoLineHtml = `
                <div style="
                    background-color: #ffc72c; 
                    color: #00287a; 
                    font-weight: 700; 
                    text-align: center;
                    padding: 6px 10px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                    font-size: 0.9em;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    display: block; 
                    width: 100%;    
                    box-sizing: border-box;
                ">
                    📸 PhotoPass
                </div>
            `;
        }

        let statusHtml = '';
        let timesHtml = '';
        let nextTime = null;

        if (hasVQ) {
            statusHtml = `<div class="show-countdown"><span class="countdown-gold" style="font-size:0.9em;">⚠️ Réservation App Requise</span></div>`;
            timesHtml = `
                <div class="show-times-container" style="justify-content: center; gap: 15px; width: 100%;">
                    <div style="display:flex; flex-direction:column; align-items:center; min-width: 60px;">
                        <span style="font-size:0.75em; color:#bbb; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">Matin</span>
                        <span class="show-time-box status-reservation" style="font-size: 1.1em; padding: 8px 12px;">10:45</span>
                    </div>
                    <div style="width: 1px; background-color: rgba(255,255,255,0.1); height: 40px;"></div>
                    <div style="display:flex; flex-direction:column; align-items:center; min-width: 60px;">
                        <span style="font-size:0.75em; color:#bbb; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">Aprèm</span>
                        <span class="show-time-box status-reservation" style="font-size: 1.1em; padding: 8px 12px;">14:00</span>
                    </div>
                </div>
            `;
        } else if (hasSchedules) {
            nextTime = getNextShowTime(char.schedules);
            
            let countdownHtml = '';
            if (nextTime) {
                const mins = getMinutesUntil(nextTime);
                let text = `Dans ${mins} min`;
                if (!isPhoto) text = `Dans ${mins} min`;
                
                if (mins <= 0) { text = "Maintenant"; } 
                else if (mins > 60) {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    text = `Dans ${h}h ${m}min`;
                }
                
                countdownHtml = `<div class="show-countdown"><span class="countdown-default">${text}</span></div>`;
            } else {
                countdownHtml = `<div class="show-countdown"><span class="countdown-default">Terminé</span></div>`;
            }

            const scheduleList = char.schedules.map(s => {
                const time = s.startTime.substring(0, 5);
                const minutesLeft = getMinutesUntil(time);
                const boxClass = getTimeBoxClass(minutesLeft);
                return `<span class="show-time-box ${boxClass}">${time}</span>`;
            }).join('');

            statusHtml = countdownHtml;
            timesHtml = `<div class="show-times-container">${scheduleList}</div>`;
        } else {
             statusHtml = `<div class="show-countdown"><span class="countdown-default">Indisponible</span></div>`;
        }

        return `
            <div class="show-card" id="meet-${char.id}">
                <div class="show-info">
                    <div style="display:flex; justify-content:space-between; align-items:start; padding-right:5px;">
                        <h3 style="margin:0;">${nameFR}</h3>
                        ${createFavButton(char.id)}
                    </div>
                    <p class="show-park-land">📍 ${regionFR}</p>
                </div>

                <div class="show-schedule">
                    ${photoLineHtml}
                    ${statusHtml}
                    ${timesHtml}
                </div>
            </div>
        `;
    };

    // --- MOTEUR PRINCIPAL ---

    const loadMeets = async () => {
        const listElement = document.getElementById('meet-list');
        if (!listElement) return;

        if (!listElement.querySelector('.park-show-header')) {
            listElement.innerHTML = '<div class="loading-message">👑 Recherche des personnages & PhotoPass...</div>';
        }

        try {
            const response = await fetch(MEET_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: MEET_CONFIG.QUERY })
            });
            
            const json = await response.json();
            if (!json.data || !json.data.entertainment) throw new Error("Données invalides");

            const characters = json.data.entertainment.filter(item => {
                const nameLower = item.name.toLowerCase();
                if (nameLower.includes("heroic encounter") && nameLower.includes("spider")) return false;

                const isPhoto = item.services && item.services.photoPass === true;
                const isChar = (item.category && (item.category.includes("Meet") || item.category.includes("Character"))) || 
                               (item.id.startsWith('P1MG') || item.id.startsWith('P2MG'));
                
                const hasSchedules = item.schedules && item.schedules.length > 0;
                const hasVQ = item.virtualQueue && item.virtualQueue.available === true;
                
                if (!hasSchedules && !hasVQ) return false;

                return (isChar || isPhoto);
            });

            const grouped = {};
            characters.forEach(char => {
                let parkName = char.park ? char.park.name : "Autres";
                if(parkName === "Disneyland Park") parkName = "Parc Disneyland";
                if(parkName === "Walt Disney Studios Park") parkName = "Walt Disney Studios Park";
                let landName = translateText(char.region || "Autre");

                if (!grouped[parkName]) grouped[parkName] = {};
                if (!grouped[parkName][landName]) grouped[parkName][landName] = [];
                grouped[parkName][landName].push(char);
            });

            listElement.innerHTML = '';
            const parkOrder = ["Parc Disneyland", "Walt Disney Studios Park", "Autres"];

            parkOrder.forEach(parkName => {
                if (!grouped[parkName]) return;
                const mainHeader = document.createElement('h2');
                mainHeader.className = 'park-show-header';
                mainHeader.innerText = parkName;
                listElement.appendChild(mainHeader);

                const lands = grouped[parkName];
                Object.keys(lands).sort().forEach(landName => {
                    const landGroup = document.createElement('div');
                    landGroup.className = 'park-group'; 
                    const landHeader = document.createElement('h3');
                    landHeader.className = 'land-header';
                    landHeader.innerText = `📍 ${landName}`;
                    landGroup.appendChild(landHeader);

                    const sortedChars = lands[landName].sort((a, b) => {
                        if (typeof window.isFavorite === 'function') {
                            const favA = window.isFavorite(a.id);
                            const favB = window.isFavorite(b.id);
                            if (favA !== favB) return favB - favA;
                        }
                        return a.name.localeCompare(b.name);
                    });
                    sortedChars.forEach(char => {
                        landGroup.innerHTML += createMeetCard(char);
                    });
                    listElement.appendChild(landGroup);
                });
            });

            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input'));

        } catch (err) {
            console.error(err);
            listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur API: ${err.message}</div>`;
        }
    };

    // --- RECHERCHE AVEC FIX DE TAILLE (Display Block) ---
    const setupSearch = () => {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            
            document.querySelectorAll('.park-group').forEach(group => {
                const cards = group.querySelectorAll('.show-card');
                let hasVisible = false;
                
                cards.forEach(c => {
                    const text = c.innerText.toLowerCase();
                    const match = text.includes(term);
                    
                    // On garde le display flex natif de la carte, ou none
                    c.style.display = match ? 'flex' : 'none'; 
                    if(match) hasVisible = true;
                });
                
                // ⭐ LA CORRECTION MAJEURE EST ICI ⭐
                // On utilise 'block' pour le conteneur. Cela permet aux enfants (les cartes)
                // de prendre toute la largeur définie par leur CSS (width: 100% / max-width: 700px)
                // au lieu de rétrécir comme des items Flex.
                group.style.display = hasVisible ? 'block' : 'none'; 
                
                const header = group.querySelector('.land-header');
                if(header) header.style.display = hasVisible ? 'block' : 'none';
            });
        });
        
        const closeKey = () => searchInput.blur();
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closeKey(); } });
        window.addEventListener('scroll', () => { if (document.activeElement === searchInput) closeKey(); }, { passive: true });
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadMeets();
        setupSearch();
    });

} // 🛡️ Fin