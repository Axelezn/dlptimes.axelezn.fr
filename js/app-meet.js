// js/app-meet.js - V44 (Fix: Immunisation complète contre la disparition de l'objet queue)

{ // 🛡️ Bloc d'isolation

    const MEET_CONFIG = {
        API_URL: "https://api.themeparks.wiki/v1/entity/e8d0207f-da8a-4048-bec8-117aa946b2c2/live",
        PARK_ID_DLP: 'dae968d5-630d-4719-8b06-3d107e944401', 
        PARK_ID_WDS: 'ca888437-ebb4-4d50-aed2-d227f7096968', 
        REFRESH_INTERVAL: 60000 
    };

    // --- TRADUCTIONS ---
    const TRANSLATIONS = {
        "Meet": "Rencontre avec",
        "and Friends": "et ses amis",
        "with": "avec",
        "Mysterious Meeting": "Rencontre Mystérieuse",
        "An Encounter": "Une rencontre",
        "or his friends": "ou ses amis",
        "Sofia the First": "Princesse Sofia",
        "a Toy Story Character": "un personnage de Toy Story",
        "Bo Peep": "La Bergère",
        "near": "près de",
        "at": "à",
        "Princess Pavilion: A Royal Invitation": "Pavillon des Princesses",
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
        "a Character from The Lion King":"un personnage du Roi Lion",
        "Encounter The Mandalorian":"Rencontrez le Mandalorian",
        "Disney Characters":"des Personnages Disney",
        "Starport":"Starport - Rencontrez un personnage Star Wars",
        "the Characters of Alice in Wonderland":"un personnage d'Alice aux Pays des Merveilles",
        "The White Rabbit":"Le Lapin Blanc",
        "Tigger":"Tigrou",
        "Winnie l'Ourson or friends":"Winnie l'Ourson ou ses amis",
        'MARVEL Super Hero Heroic Encounter':"Marvel Hero Training Center",
        'a Character from' : "un personnage de",
        "or her friends":"ou ses amis",
        "across Europe":"à travers l'Europe",
        "Mysterious Meetings":"Rencontres Mystérieuses",
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
        
        // 🧹 Nettoyage des suffixes anglais de l'API restants
        translated = translated.replace(/,?\s*the Movie Director/gi, "");
        
        return translated;
    };

    const getMinutesUntil = (dateStr) => {
        const now = new Date();
        const showDate = new Date(dateStr);
        if (showDate < now) return null; 
        return Math.floor((showDate - now) / 60000);
    };

    const getNextShowTime = (showtimes) => {
        if (!showtimes) return null;
        const now = new Date();
        const validSchedules = showtimes
            .map(s => s.startTime || s.endTime) 
            .filter(timeStr => new Date(timeStr) >= now)
            .sort((a, b) => new Date(a) - new Date(b));
        return validSchedules.length > 0 ? validSchedules[0] : null;
    };

    const getTimeBoxClass = (minutes) => {
        if (minutes === null) return 'time-past-box'; 
        if (minutes < 15) return 'time-gold-box';
        if (minutes < 30) return 'time-green-box';
        if (minutes < 45) return 'time-orange-box';
        if (minutes < 60) return 'time-red-box';
        return 'time-far-box'; 
    };

    // --- LOGIQUE DE LOCALISATION (PARC + LAND + PRÉCIS) ---
    const getLocation = (entity) => {
        let loc = { park: "Autres", land: "Lieu non précisé", precise: "" };
        const eid = entity.externalId || '';
        const name = entity.name || '';
        const area = entity.areaName || '';
        
        // 1. Détermination du Parc
        if (entity.parkId === MEET_CONFIG.PARK_ID_DLP) loc.park = "Parc Disneyland";
        else if (entity.parkId === MEET_CONFIG.PARK_ID_WDS) loc.park = "Disney Adventure World";

        // 2. Détermination du Land (Catégorie de regroupement)
        if (eid === 'P1M116' || name.includes('Princess Pavilion')) loc.land = "Fantasyland";
        else if (name.includes('Hero Training Center') || eid.includes('AV')) loc.land = "Avengers Campus";
        
        // --- Exceptions forçées par ID ---
        else if (eid === 'P1MG36') loc.land = "Adventureland"; // Le Roi Lion
        else if (eid === 'P1MG55') loc.land = "Adventureland"; // Stitch
        else if (eid === 'P1MG33') loc.land = "Main Street, U.S.A."; // Alice
        else if (eid === 'P2MG31') loc.land = "Worlds of Pixar"; // Bo Peep/Toy Story
        else if (eid === 'P1MG21' || eid=== "P1MG22") loc.land = "Adventureland"; // Bo Peep (nouveau meet)
        else if (eid === 'P1M115' || eid=== "P1MG23") loc.land = "Fantasyland"; // Bo Peep (nouveau meet)
        else if (eid === 'P1MG86') loc.land = "Discoveryland"; // Bo Peep (nouveau meet)
        else if (eid === 'P1MG65') loc.land = "Frontierland"; // Bo Peep (nouveau meet)
        
        // --- Règles générales basées sur le nom de la zone (areaName) ---
        else if (area.includes('Main Street') || area.includes('Town Square') || area.includes('Boarding House')) loc.land = "Main Street, U.S.A.";
        else if (area.includes('Fantasyland') || area.includes('Castle') || area.includes('Pavilion')) loc.land = "Fantasyland";
        else if (area.includes('Adventureland')) loc.land = "Adventureland";
        else if (area.includes('Frontierland') || area.includes('Cowboy')) loc.land = "Frontierland";
        else if (area.includes('Discoveryland') || area.includes('Starport')) loc.land = "Discoveryland";
        else if (area.includes('Pixar') || area.includes('Toon')) loc.land = "Worlds of Pixar";
        else if (area.includes('Production') || area.includes('Theater')) loc.land = "Production Courtyard";
        else if (area.includes('Front Lot') || area.includes('Studio 1')) loc.land = "Front Lot";
        
        else loc.land = loc.park;

        // 3. Emplacement précis (Affiché sous le nom)
        if (area) {
            loc.precise = area;
        } else {
            // Remplissage manuel si l'API ne donne rien
            if (eid === 'P1MG36') loc.precise = "Proche Restaurant Hakuna Matata";
            else if (eid === 'P1MG33') loc.precise = "Proche Storybook Store";
            else if (eid === 'P1MG55') loc.precise = "Proche Boutique Girafe Curieuse";
            else if (eid === 'P2MG31') loc.precise = "Toon Plaza";
            else if (eid === 'P1M116') loc.precise = "Pavillon des Princesses";
            else loc.precise = loc.land; // Fallback
        }

        return loc;
    };

    // --- GÉNÉRATION HTML ---
    const createMeetCard = (char, location) => {
        let nameFR = translateText(char.name);
        
        // 🤠 Règle dynamique : Renommer Dingo selon son costume/emplacement
        if (nameFR.includes('Dingo')) {
            if (location.land === 'Frontierland' || location.precise.toLowerCase().includes('cowboy')) {
                if (!nameFR.includes('Far West')) nameFR = nameFR.replace('Dingo', 'Dingo Far West');
            } else if (location.land === 'Front Lot' || location.park === 'Disney Adventure World') {
                if (!nameFR.includes('Réalisateur')) nameFR = nameFR.replace('Dingo', 'Dingo Réalisateur');
            }
        }

        const preciseLocationFR = translateText(location.precise);
        
        let statusHtml = '';
        let timesHtml = '';
        let nextTime = null;

        const allScheduleData = char.showtimes || [];
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        
        const todaysScheduleData = allScheduleData.filter(item => {
            const date = new Date(item.startTime || item.endTime);
            return date >= startOfDay && date <= endOfDay;
        });

        // 🟢 IDENTIFICATION STRICTE : Est-ce une file virtuelle connue ?
        const isKnownVirtualQueue = (char.externalId === 'P1M116') || (char.name && char.name.includes('Hero Training Center')) || (char.name && char.name.includes('Princess Pavilion'));

        // 🟢 GESTION DES FILES VIRTUELLES (RESERVATIONS)
        if (isKnownVirtualQueue || (char.queue && char.queue.RETURN_TIME)) {
            
            // 🛡️ SÉCURITÉ : Si l'API a fermé l'attraction et retiré l'objet queue, on force le statut "SOLD_OUT"
            const vqState = (char.queue && char.queue.RETURN_TIME) ? char.queue.RETURN_TIME.state : "SOLD_OUT";
            
            let badgeClass = "time-red-box";
            let stateText = "Complet";
            
            if (vqState === "AVAILABLE") {
                stateText = "Réservation Ouverte";
                badgeClass = "time-green-box";
            } 
            else if (vqState === "TEMP_FULL") {
                const now = new Date();
                const timeInMinutes = now.getHours() * 60 + now.getMinutes();
                const time945 = 9 * 60 + 45; // 585 minutes
                const time1400 = 14 * 60;    // 840 minutes
                
                if (timeInMinutes < time945) {
                    stateText = "Complet jusqu'à 9h45";
                    badgeClass = "time-orange-box";
                } else if (timeInMinutes >= time945 && timeInMinutes < time1400) {
                    stateText = "Complet jusqu'à 14h";
                    badgeClass = "time-orange-box";
                } else {
                    stateText = "Complet";
                    badgeClass = "time-red-box";
                }
            } 
            else {
                // Pour SOLD_OUT ou CLOSED (comme dans votre exemple JSON)
                stateText = "Complet";
                badgeClass = "time-red-box";
            }
            
            statusHtml = `<div class="show-countdown"><span class="countdown-gold" style="font-size:0.9em;">📱 Réservation sur l'App</span></div>`;
            timesHtml = `<div class="show-times-container"><span class="show-time-box ${badgeClass}" style="width:100%; text-align:center;">${stateText}</span></div>`;
            
        } else if (todaysScheduleData.length > 0) {
            nextTime = getNextShowTime(todaysScheduleData);
            
            let countdownHtml = '';
            if (nextTime) {
                const mins = getMinutesUntil(nextTime);
                let text = `Dans ${mins} min`;
                
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

            const scheduleList = todaysScheduleData.map(s => {
                const timeStr = s.startTime || s.endTime;
                const showDate = new Date(timeStr);
                const timeLabel = showDate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
                const minutesLeft = getMinutesUntil(timeStr);
                const boxClass = getTimeBoxClass(minutesLeft);
                return `<span class="show-time-box ${boxClass}">${timeLabel}</span>`;
            }).join('');

            statusHtml = countdownHtml;
            timesHtml = `<div class="show-times-container">${scheduleList}</div>`;
        } else {
             statusHtml = `<div class="show-countdown"><span class="countdown-default">Indisponible</span></div>`;
        }

        return `
            <div class="show-card" id="meet-${char.id}">
                <div class="show-info">
                    <h3 style="margin:0 0 5px 0;">${nameFR}</h3>
                    <p class="show-park-land">📍 ${preciseLocationFR}</p>
                </div>
                <div class="show-schedule">
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
            listElement.innerHTML = '<div class="loading-message">👑 Recherche des personnages...</div>';
        }

        try {
            const response = await fetch(MEET_CONFIG.API_URL);
            const json = await response.json();
            
            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

            const characters = (json.liveData || []).filter(item => {
                if (item.entityType !== 'SHOW') return false;
                
                // 🛑 EXCLUSION : On retire complètement "the Movie Director"
                if (item.name && item.name.includes('the Movie Director')) return false;
                
                // 🔍 IDENTIFICATION STRICTE : 
                const isMG = item.externalId && item.externalId.includes('MG');
                const isKnownVirtualQueue = (item.externalId === 'P1M116') || (item.name && item.name.includes('Hero Training Center')) || (item.name && item.name.includes('Princess Pavilion'));
                const hasActiveVirtualQueue = item.queue && item.queue.RETURN_TIME;
                
                const isVirtualQueue = isKnownVirtualQueue || hasActiveVirtualQueue;
                
                // Si ce n'est ni un MG, ni une file virtuelle, on ignore.
                if (!isMG && !isVirtualQueue) return false;
                
                // Si c'est un Meet standard et qu'il est fermé, on ignore (mais on GARDE les files virtuelles même fermées par l'API)
                if (!isVirtualQueue && (item.status === 'CLOSED' || item.status === 'DOWN')) return false;

                const allScheduleData = item.showtimes || [];
                const hasSchedulesToday = allScheduleData.some(s => {
                    const date = new Date(s.startTime || s.endTime);
                    return date >= startOfDay && date <= endOfDay;
                });

                // On affiche si y a des horaires aujourd'hui OU si c'est une file virtuelle (Pavillon/Hero)
                return hasSchedulesToday || isVirtualQueue;
            });

            // --- REGROUPEMENT STRICT PAR PARC PUIS PAR LAND ---
            const grouped = {};
            characters.forEach(char => {
                const loc = getLocation(char);
                const parkName = loc.park;
                const landName = translateText(loc.land);

                if (!grouped[parkName]) grouped[parkName] = {};
                if (!grouped[parkName][landName]) grouped[parkName][landName] = [];
                grouped[parkName][landName].push({ char, loc });
            });

            listElement.innerHTML = '';
            const parkOrder = ["Parc Disneyland", "Disney Adventure World", "Autres"];

            parkOrder.forEach(parkName => {
                if (!grouped[parkName]) return;
                
                // 1. En-tête principal du Parc
                const mainHeader = document.createElement('h2');
                mainHeader.className = 'park-show-header';
                mainHeader.innerText = parkName;
                listElement.appendChild(mainHeader);

                // 2. Sous-groupes par Land à l'intérieur du parc
                const lands = grouped[parkName];
                Object.keys(lands).sort().forEach(landName => {
                    const landGroup = document.createElement('div');
                    landGroup.className = 'park-group'; 
                    
                    const landHeader = document.createElement('h3');
                    landHeader.className = 'land-header';
                    landHeader.innerText = `📍 ${landName}`;
                    landGroup.appendChild(landHeader);

                    const sortedChars = lands[landName].sort((a, b) => a.char.name.localeCompare(b.char.name));
                    sortedChars.forEach(item => {
                        landGroup.innerHTML += createMeetCard(item.char, item.loc);
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
                    c.style.display = match ? 'flex' : 'none'; 
                    if(match) hasVisible = true;
                });
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
        setInterval(loadMeets, MEET_CONFIG.REFRESH_INTERVAL);
        setupSearch();
    });

} // 🛡️ Fin