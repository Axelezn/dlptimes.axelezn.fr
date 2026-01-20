// js/weather.js - V2 (Prévisions sur 3 heures)

// On ajoute &hourly pour avoir les détails et &timezone pour être calé sur Paris
const WEATHER_API = "https://api.open-meteo.com/v1/forecast?latitude=48.87&longitude=2.78&current_weather=true&hourly=temperature_2m,weathercode&timezone=Europe%2FParis";

const getWeatherIcon = (code) => {
    const icons = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 
        45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 
        55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 
        71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 
        81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
    };
    return icons[code] || '✨';
};

async function loadWeather() {
    const container = document.getElementById('weather-widget');
    if (!container) return;

    try {
        const response = await fetch(WEATHER_API);
        if (!response.ok) throw new Error('Erreur Météo');
        
        const data = await response.json();
        
        // L'heure actuelle (0-23) correspond à l'index dans le tableau 'hourly'
        const currentHour = new Date().getHours();
        
        let htmlContent = '';

        // On boucle sur 3 heures : Maintenant (i=0), +1h (i=1), +2h (i=2)
        for (let i = 0; i < 3; i++) {
            const index = currentHour + i;
            
            // Sécurité si on dépasse la fin du tableau (fin de journée)
            if (!data.hourly.time[index]) break;

            const temp = Math.round(data.hourly.temperature_2m[index]);
            const code = data.hourly.weathercode[index];
            const icon = getWeatherIcon(code);
            
            // Si c'est la première colonne, on écrit "Maintenant", sinon l'heure (ex: 14h)
            const label = (i === 0) ? 'Actuel' : `${(currentHour + i) % 24}h`;

            htmlContent += `
                <div class="weather-col">
                    <span class="w-label">${label}</span>
                    <span class="w-icon">${icon}</span>
                    <span class="w-temp">${temp}°</span>
                </div>
                ${i < 2 ? '<div class="w-sep"></div>' : ''} 
            `;
        }
        
        container.innerHTML = htmlContent;
        container.style.opacity = '1';
        
    } catch (e) {
        console.error(e);
        container.style.display = 'none'; 
    }
}

document.addEventListener('DOMContentLoaded', loadWeather);