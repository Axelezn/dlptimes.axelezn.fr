// js/config.js

// Définition des seuils de couleur par ATTRACTION (en minutes)
// Les maxTime doivent être ordonnés du plus petit au plus grand.
const ATTRACTION_THRESHOLDS = {
    
    // ====================================================================
    // ⭐ SEUIL PAR DÉFAUT (Pour toutes les attractions non listées ci-dessous) ⭐
    // ====================================================================
    "DEFAULT": [
        { maxTime: 15, className: 'time-gold' },    // Très court (0-15 min)
        { maxTime: 30, className: 'time-green' },   // Bon (16-30 min)
        { maxTime: 45, className: 'time-orange' },  // Moyen (31-45 min)
        { maxTime: Infinity, className: 'time-red' } // Long (+45 min)
    ],

    // ====================================================================
    // 🏰 PARC DISNEYLAND - SEUILS SUGGERÉS
    // ====================================================================
    
    // FRONTIERLAND
    "Big Thunder Mountain": [
        { maxTime: 20, className: 'time-gold' },    // Excellent pour ce niveau de popularité
        { maxTime: 40, className: 'time-green' },   // Acceptable
        { maxTime: 65, className: 'time-orange' },  // Long mais faisable
        { maxTime: Infinity, className: 'time-red' } // À éviter
    ],
    "Phantom Manor": [
        { maxTime: 10, className: 'time-gold' },    
        { maxTime: 20, className: 'time-green' },   
        { maxTime: 30, className: 'time-orange' },  // 30 min, c'est votre limite (Orange)
        { maxTime: Infinity, className: 'time-red' } // Au-delà, c'est Rouge
    ],
    "Thunder Mesa Riverboat Landing": [
        { maxTime: 5, className: 'time-gold' },    
        { maxTime: 15, className: 'time-green' },
        { maxTime: Infinity, className: 'time-orange' } // Très rarement long
    ],

    // ADVENTURELAND
    "Indiana Jones and the Temple of Peril": [
        { maxTime: 10, className: 'time-gold' },    
        { maxTime: 25, className: 'time-green' },   
        { maxTime: 45, className: 'time-orange' },  
        { maxTime: Infinity, className: 'time-red' } 
    ],
    "Pirates of the Caribbean": [
        { maxTime: 15, className: 'time-gold' },    
        { maxTime: 30, className: 'time-green' },   
        { maxTime: 50, className: 'time-orange' },  
        { maxTime: Infinity, className: 'time-red' } 
    ],

    // FANTASYLAND
    "Peter Pan's Flight": [
        { maxTime: 20, className: 'time-gold' },    
        { maxTime: 45, className: 'time-green' },   
        { maxTime: 60, className: 'time-orange' }, 
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Princess Pavilion": [
        { maxTime: 60, className: 'time-gold' },    // C'est un point de rencontre, les files sont très longues
        { maxTime: 90, className: 'time-green' },   
        { maxTime: 120, className: 'time-orange' }, 
        { maxTime: Infinity, className: 'time-red' }
    ],
    "it's a small world": [
        { maxTime: 5, className: 'time-gold' },
        { maxTime: 15, className: 'time-green' },
        { maxTime: Infinity, className: 'time-orange' } 
    ],
    "Dumbo the Flying Elephant": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 30, className: 'time-green' },
        { maxTime: 45, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],

    // DISCOVERYLAND
    "Star Wars Hyperspace Mountain": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 40, className: 'time-green' },   // 30 min est Orange ou Vert selon vous. J'ai mis Vert ici.
        { maxTime: 60, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Buzz Lightyear Laser Blast": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 35, className: 'time-green' },
        { maxTime: 50, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Star Tours: The Adventures Continue": [
        { maxTime: 10, className: 'time-gold' },
        { maxTime: 25, className: 'time-green' },
        { maxTime: 40, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Autopia": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 30, className: 'time-green' },
        { maxTime: 45, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],

    // ====================================================================
    // 🎬 WALT DISNEY STUDIOS PARK - SEUILS SUGGERÉS
    // ====================================================================
    
    // AVENGER CAMPUS
    "Avengers Assemble: Flight Force": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 35, className: 'time-green' },
        { maxTime: 55, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Spider-Man W.E.B. Adventure": [
        { maxTime: 10, className: 'time-gold' },
        { maxTime: 30, className: 'time-green' },
        { maxTime: 50, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    
    // WORLDS OF PIXAR
    "Crush's Coaster": [
        { maxTime: 35, className: 'time-gold' },    // Très rare, à faire
        { maxTime: 65, className: 'time-green' },   // Bon pour Crush's Coaster
        { maxTime: 90, className: 'time-orange' },  // Long
        { maxTime: Infinity, className: 'time-red' } // Très long
    ],
    "Ratatouille: The Adventure": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 35, className: 'time-green' },
        { maxTime: 55, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    
    // HOLLYWOOD BOULEVARD / PRODUCTION COURTYARD
    "The Twilight Zone Tower of Terror": [
        { maxTime: 10, className: 'time-gold' },
        { maxTime: 30, className: 'time-green' },
        { maxTime: 50, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    
    // TOON STUDIO
    "RC Racer": [
        { maxTime: 20, className: 'time-gold' },
        { maxTime: 40, className: 'time-green' },
        { maxTime: 60, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ],
    "Toy Soldiers Parachute Drop": [
        { maxTime: 15, className: 'time-gold' },
        { maxTime: 30, className: 'time-green' },
        { maxTime: 45, className: 'time-orange' },
        { maxTime: Infinity, className: 'time-red' }
    ]
    
    // N'oubliez pas d'ajouter les attractions restantes (Cars ROAD TRIP, Slinky Dog, etc.)
    // ou elles utiliseront le seuil "DEFAULT".
};

// Fonction pour déterminer la classe CSS basée sur le temps d'attente et le nom de l'attraction
function getTimeClass(attractionName, waitTime) {
    if (waitTime === null || waitTime < 0) return 'time-default'; 
    
    let thresholds = ATTRACTION_THRESHOLDS[attractionName];
    
    if (!thresholds) {
        thresholds = ATTRACTION_THRESHOLDS["DEFAULT"];
        if (!thresholds) return 'time-default';
    }
    
    for (const threshold of thresholds) {
        if (waitTime <= threshold.maxTime) {
            return threshold.className;
        }
    }
    return 'time-red';
}