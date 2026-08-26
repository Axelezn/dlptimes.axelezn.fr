// js/app-map.js - V36 (Fix: Filtrage strict des Meets inactifs)

const DESTINATION_ID = "e8d0207f-da8a-4048-bec8-117aa946b2c2";
const API_URL = `https://api.themeparks.wiki/v1/entity/${DESTINATION_ID}/live`;

const COORDS_JSON_URL = "./js/json/dlp-coords.json";
const SHOPS_JSON_URL = "./js/json/shops.json";
const DINING_JSON_URL = "./js/json/restaurants.json";
const MEETS_JSON_URL = "./js/json/meets.json";
const REFRESH_INTERVAL = 60000;

const DLP_CENTER_LAT = 48.8694922;
const DLP_CENTER_LON = 2.7804949;
const INITIAL_ZOOM = 16;

const FILTER_TYPES_FULL = ["ALL", "ATTRACTION", "SHOW", "MEET", "SHOP", "RESTAURANT"];
let activeFilters = new Set(["ATTRACTION"]);

let map;
let markersLayer;
let allStaticCoordinates = [];
let staticMeetsData = [];

// --- TRADUCTIONS ---
const TRANSLATIONS = {
    "Meet": "Rencontre avec",
    "and Friends": "et ses amis",
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
    "Mysterious Meetings":"Rencontres Mystérieuses"
};

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

function getNextShowInfo(entity) {
  const allScheduleData = entity.showtimes || entity.schedule?.schedule || entity.horaires || [];
  const now = new Date();

  const futureScheduleData = allScheduleData
    .filter((item) => {
      const timeString = item.startTime || item.endTime || item;
      let showTimeDate = new Date();
      if (typeof timeString === "string" && timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        const [hours, minutes] = timeString.split(":").map(Number);
        showTimeDate.setHours(hours, minutes, 0, 0);
      } else if (typeof timeString === "string") {
        showTimeDate.setTime(new Date(timeString).getTime());
      } else {
        return false;
      }
      return showTimeDate > now;
    })
    .sort((a, b) => {
      const timeA = a.startTime || a.endTime || a;
      const timeB = b.startTime || b.endTime || b;
      if (typeof timeA === "string" && timeA.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        const [hA, mA] = timeA.split(":").map(Number);
        const [hB, mB] = timeB.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      }
      return new Date(timeA) - new Date(timeB);
    });

  if (futureScheduleData.length === 0) return { time: null, minutes: Infinity, isLive: false };

  const nextTimeItem = futureScheduleData[0];
  const nextTime = nextTimeItem.startTime || nextTimeItem.endTime || nextTimeItem;
  let nextTimeDate = new Date();

  if (typeof nextTime === "string" && nextTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
    const [hours, minutes] = nextTime.split(":").map(Number);
    nextTimeDate.setHours(hours, minutes, 0, 0);
  } else {
    nextTimeDate.setTime(new Date(nextTime).getTime());
  }

  const formattedTime = nextTimeDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const diffInMinutes = Math.floor((nextTimeDate.getTime() - now.getTime()) / 60000);
  const isLive = diffInMinutes <= 5 && diffInMinutes >= -10;

  return { time: formattedTime, minutes: diffInMinutes, isLive: isLive };
}

function getShowUrgencyColor(diffInMinutes, isLive) {
  if (isLive) return "#ffc107";
  if (diffInMinutes < 15) return "#fd7e14";
  if (diffInMinutes < 30) return "#ffc107";
  if (diffInMinutes < 60) return "#28a745";
  return "#198754";
}

function getStatusColor(entity) {
  const status = entity.status;

  if (entity.entityType === "RESTAURANT") {
    if (status === "FERME" || status === "CLOSED") return "#dc3545";
    return "#28a745";
  }

  switch (status) {
    case "CLOSED":
    case "DOWN":
    case "FERME":
      return "#dc3545";
    case "REFURBISHMENT":
      return "#ffc107";
    case "UNKNOWN":
      return "#0d6fdc";
  }

  if ((entity.entityType === "SHOW" || entity.entityType === "MEET") && status === "OPERATING") {
    const info = getNextShowInfo(entity);
    if (info.minutes === Infinity) {
        if (entity.fileAttenteVirtuelle) return "#ffc107"; 
        return "#dc3545";
    }
    return getShowUrgencyColor(info.minutes, info.isLive);
  }

  if (entity.entityType === "ATTRACTION" && status === "OPERATING") {
    const standbyQueue = entity.queue?.STANDBY;
    if (standbyQueue && typeof standbyQueue.waitTime === "number") {
      const waitTime = standbyQueue.waitTime;
      if (waitTime === 0) return "#198754";
      if (waitTime <= 20) return "#28a745";
      if (waitTime <= 45) return "#ffc107";
      if (waitTime <= 75) return "#fd7e14";
      return "#dc3545";
    }
  }
  return "#198754";
}

function createCustomIcon(entity) {
  const color = getStatusColor(entity);
  let iconClass = "fas fa-map-marker-alt";

  switch (entity.entityType || entity.type) {
    case "SHOW": iconClass = "fas fa-mask"; break;
    case "RESTAURANT":
    case "DINING": iconClass = "fas fa-utensils"; break;
    case "SHOP": iconClass = "fas fa-shopping-bag"; break;
    case "MEET": iconClass = "fas fa-star"; break;
    default: iconClass = "fas fa-map-marker-alt"; break;
  }

  return L.divIcon({
    html: `<div style="color: ${color}; font-size: 24px;"><i class="${iconClass}"></i></div>`,
    className: "custom-map-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20],
  });
}

function getWaitTimeText(entity) {
  const status = entity.status;
  const type = entity.entityType || entity.type;

  if (type === "RESTAURANT" || type === "SHOP") return null;

  if (type === "ATTRACTION" && status === "OPERATING") {
    const standbyQueue = entity.queue?.STANDBY;
    if (standbyQueue && typeof standbyQueue.waitTime === "number" && standbyQueue.waitTime > 0) {
      return `${standbyQueue.waitTime} min`;
    }
    if (standbyQueue && typeof standbyQueue.waitTime === "number" && standbyQueue.waitTime === 0) {
      return "0 min";
    }
    return null;
  }

  if (type === "SHOW" || type === "MEET") {
    if (status === "REFURBISHMENT") return "RÉNO";
    
    // 🟢 NOUVEAU : On gère la file virtuelle avant de bloquer le statut "FERMÉ"
    if (type === "MEET" && entity.fileAttenteVirtuelle) {
        const vqState = entity.queue?.RETURN_TIME?.state;
        if (vqState === "AVAILABLE") return "DISPO";
        if (vqState === "TEMP_FULL") return "COMPLET";
        return "COMPLET"; // Si vqState est introuvable (API a caché la queue) ou CLOSED/SOLD_OUT
    }

    if (status === "CLOSED" || status === "DOWN" || status === "FERME") return "FERMÉ";

    const info = getNextShowInfo(entity);
    if (info.isLive) return "LIVE";
    if (info.time) return info.time;

    const requiresReservation = entity.reservationParc === true || entity.fileAttenteVirtuelle === true || entity.features?.includes("BOOKABLE");
    if (type === "MEET" && requiresReservation && info.minutes === Infinity) {
      return "RÉSERVATION";
    }
    if (status === "UNKNOWN" && (entity.horaires || entity.showtimes)) return "AUCUN";
    return "AUCUN";
  }

  if (status === "REFURBISHMENT") return "RÉNO";
  if (status === "CLOSED" || status === "DOWN" || status === "FERME") return "FERMÉ";
  return null;
}

function createPopupContent(entity) {
  const name = entity.name || entity.titre || "POI Inconnu";
  const status = entity.status || "Statut Inconnu";
  const type = entity.entityType || entity.type;
  let details = "";
  let title = "Détails";

  if (type === "ATTRACTION" && entity.queue) {
    title = "Attente";
    const standby = entity.queue.STANDBY;
    const paid = entity.queue.PAID_RETURN_TIME;
    const singleRider = entity.queue.SINGLE_RIDER;

    let waitDetails = [];
    if (standby && typeof standby.waitTime === "number") waitDetails.push(`Classique : <strong>${standby.waitTime} min</strong>`);
    if (paid && paid.state === "AVAILABLE") waitDetails.push(`Premier Access : <strong>${paid.price?.formatted || paid.price.amount / 100 + "€"}</strong>`);
    if (singleRider && typeof singleRider.waitTime === "number") waitDetails.push(`Single Rider : <strong>${singleRider.waitTime} min</strong>`);

    details = waitDetails.length > 0 ? waitDetails.join("<br>") : "N/A";
  }
  else if (type === "RESTAURANT" || type === "DINING") {
    title = "Infos Resto";

    let restoInfos = [];
    const readableType = entity.subtype || entity.type;
    if (readableType && readableType !== "RESTAURANT") restoInfos.push(`Type : ${readableType}`);

    if (entity.cuisine) restoInfos.push(`Cuisine : <strong>${entity.cuisine}</strong>`);
    if (entity.priceRange) restoInfos.push(`Prix : <strong>${entity.priceRange}</strong>`);
    if (entity.horaires) restoInfos.push(`Horaires : <strong>${entity.horaires}</strong>`);
    else restoInfos.push(`Horaires : Non communiqués`);

    if (entity.reservation) restoInfos.push(`<i class="fas fa-calendar-check" style="color:#00287a;"></i> Réservation conseillée`);
    if (entity.clickAndCollect) restoInfos.push(`<i class="fas fa-mobile-alt" style="color:#e67e22;"></i> Click & Collect`);

    if (entity.menuUrl && entity.menuUrl.length > 5) {
      restoInfos.push(`<div style="margin-top:8px;"><a href="${entity.menuUrl}" class="btn-menu-popup" style="display:inline-block; background:linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); color:#fff; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:0.85em; font-weight:600;">📜 Voir le menu</a></div>`);
    }

    details = restoInfos.join("<br>");
  }
  else if ((type === "SHOW" || type === "MEET") && (entity.status === "OPERATING" || status === "UNKNOWN")) {
    title = "Horaires";
    const info = getNextShowInfo(entity);

    if (info.time) details = `Prochain : <strong>${info.time}</strong>`;
    else details = "Aucun horaire à venir.";

    if (type === "MEET") {
      const meetDetails = [];
      if (entity.region) meetDetails.push(`Lieu : <strong>${entity.region}</strong>`);
      if (entity.fileAttenteVirtuelle) {
          // 🟢 NOUVEAU : Affichage détaillé du statut de la file dans le Popup
          const vqState = entity.queue?.RETURN_TIME?.state;
          
          let vqText = "Oui";
          if (vqState === "AVAILABLE") {
              vqText = "<span style='color:#28a745'>Ouverte</span>";
          } else if (vqState === "TEMP_FULL") {
              const now = new Date();
              const timeInMinutes = now.getHours() * 60 + now.getMinutes();
              if (timeInMinutes < 585) { // Avant 9h45
                  vqText = "<span style='color:#ff8c00'>Complet jusqu'à 9h45</span>";
              } else if (timeInMinutes >= 585 && timeInMinutes < 840) { // Entre 9h45 et 14h00
                  vqText = "<span style='color:#ff8c00'>Complet jusqu'à 14h</span>";
              } else {
                  vqText = "<span style='color:#dc3545'>Complet</span>";
              }
          } else {
              // Si vqState est SOLD_OUT, CLOSED, DOWN etc.
              vqText = "<span style='color:#dc3545'>Complet</span>";
          }
          
          meetDetails.push(`File Virtuelle : <strong>${vqText}</strong>`);
      }
      if (entity.disneyPhotopass) meetDetails.push("PhotoPass : <strong>Oui</strong>");
      if (entity.reservationParc) meetDetails.push("Réservation App : <strong>Oui</strong>");

      if (meetDetails.length > 0) {
        details += `<hr style="margin:5px 0;">` + meetDetails.join("<br>");
      }
    }
  } else {
    details = status === "OPERATING" || status === "OUVERT" ? "Ouvert" : status;
  }

  const color = getStatusColor(entity);
  const statusDisplay = type !== "RESTAURANT" ? `<br><span style="color:${color};"><strong>Statut:</strong> ${status}</span>` : "";

  return `<div class="map-popup"><h4>${name}</h4><p><strong>${title}</strong><br>${details}</p>${statusDisplay}</div>`;
}

function addFilterControls() {
  const FilterControl = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom filter-controls");
      container.id = "filter-container";

      const typeNames = { ALL: "Tout", ATTRACTION: "Attractions", SHOW: "Spectacles", MEET: "Meets", SHOP: "Boutiques", RESTAURANT: "Restaurants" };

      FILTER_TYPES_FULL.forEach((type) => {
        const button = L.DomUtil.create("button", "filter-button", container);
        button.textContent = typeNames[type];
        button.setAttribute("data-filter-type", type);

        if (type === "ALL") {
          L.DomEvent.on(button, "click", (e) => { L.DomEvent.stop(e); toggleFilterAll(button); });
        } else {
          if (activeFilters.has(type)) L.DomUtil.addClass(button, "active");
          L.DomEvent.on(button, "click", (e) => { L.DomEvent.stop(e); toggleFilter(type, button); });
        }
      });
      return container;
    },
  });
  new FilterControl({ position: "topright" }).addTo(map);
}

function addMobileFilterToggle() {
  const toggleBtn = document.getElementById("toggle-filter-btn");
  const filterContainer = document.getElementById("filter-container");
  if (toggleBtn && filterContainer) {
    toggleBtn.addEventListener("click", () => {
      filterContainer.classList.toggle("visible");
      toggleBtn.innerHTML = filterContainer.classList.contains("visible") ? "&times;" : "&#x2699;";
    });
  }
}

function toggleFilter(type, buttonElement) {
  const allButton = document.querySelector('[data-filter-type="ALL"]');
  if (activeFilters.has(type)) {
    if (activeFilters.size > 1) {
      activeFilters.delete(type);
      L.DomUtil.removeClass(buttonElement, "active");
      if (allButton) L.DomUtil.removeClass(allButton, "active");
    }
  } else {
    activeFilters.add(type);
    L.DomUtil.addClass(buttonElement, "active");
  }
  loadMapData();
  closeMobileFilterIfOpen();
}

function toggleFilterAll(buttonElement) {
  const coreTypes = ["ATTRACTION", "SHOW", "MEET", "SHOP", "RESTAURANT"];
  const btns = document.querySelectorAll('.filter-button[data-filter-type]:not([data-filter-type="ALL"])');

  if (coreTypes.every((t) => activeFilters.has(t))) {
    activeFilters.clear();
    activeFilters.add("ATTRACTION");
    L.DomUtil.removeClass(buttonElement, "active");
    btns.forEach((b) => { b.getAttribute("data-filter-type") === "ATTRACTION" ? L.DomUtil.addClass(b, "active") : L.DomUtil.removeClass(b, "active"); });
  } else {
    activeFilters.clear();
    coreTypes.forEach((t) => activeFilters.add(t));
    L.DomUtil.addClass(buttonElement, "active");
    btns.forEach((b) => L.DomUtil.addClass(b, "active"));
  }
  loadMapData();
  closeMobileFilterIfOpen();
}

function closeMobileFilterIfOpen() {
  const filterContainer = document.getElementById("filter-container");
  const toggleBtn = document.getElementById("toggle-filter-btn");
  if (window.innerWidth < 600 && filterContainer?.classList.contains("visible")) {
    filterContainer.classList.remove("visible");
    if (toggleBtn) toggleBtn.innerHTML = "&#x2699;";
  }
}

function addGeolocationControl() {
  const GeolocationControl = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom");
      container.innerHTML = '<a href="#" style="font-size:1.2em;"><i class="fas fa-crosshairs"></i></a>';
      L.DomEvent.on(container, "click", (e) => { L.DomEvent.stop(e); map.locate({ setView: true, maxZoom: 16 }); });
      return container;
    },
  });
  new GeolocationControl({ position: "topleft" }).addTo(map);
  map.on("locationfound", (e) => {
    if (map.userMarker) map.removeLayer(map.userMarker);
    map.userMarker = L.marker(e.latlng).addTo(map).bindPopup("Vous êtes ici").openPopup();
  });
}

function initializeMap() {
  if (!document.getElementById("map")) return;
  if (map) map.remove();

  map = L.map("map").setView([DLP_CENTER_LAT, DLP_CENTER_LON], INITIAL_ZOOM);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  // --- NOUVEAU : OUTIL DE DEBUG DES COORDONNÉES ---
  // Un clic droit (contextmenu) sur la carte affiche les coordonnées exactes
  map.on('contextmenu', function(e) {
      const lat = e.latlng.lat.toFixed(6);
      const lon = e.latlng.lng.toFixed(6);
      console.log(`Coordonnées pour JSON -> "lat": ${lat}, "lon": ${lon}`);
      
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`<div style="text-align:center;"><b>📍 Coordonnées :</b><br><br>lat: <b>${lat}</b><br>lon: <b>${lon}</b><br><br><span style="font-size:0.8em; color:gray;">(A copier dans vos fichiers JSON)</span></div>`)
        .openOn(map);
  });
  // ------------------------------------------------

  markersLayer = L.markerClusterGroup({ spiderfyOnMaxZoom: true, disableClusteringAtZoom: 18 });
  map.addLayer(markersLayer);

  addGeolocationControl();
  addFilterControls();
  addMobileFilterToggle();

  loadAllStaticCoordinates().then(() => {
    loadMapData();
    setInterval(loadMapData, REFRESH_INTERVAL);
  });
}

async function loadAllStaticCoordinates() {
  try {
    const [coordsRes, shopsRes, diningRes, meetsRes] = await Promise.all([
      fetch(COORDS_JSON_URL),
      fetch(SHOPS_JSON_URL),
      fetch(DINING_JSON_URL),
      fetch(MEETS_JSON_URL),
    ]);

    const mainCoords = coordsRes.ok ? await coordsRes.json() : [];
    const shopsCoords = shopsRes.ok ? await shopsRes.json() : [];
    
    // On conserve le JSON Meets pour le match par ID
    staticMeetsData = meetsRes.ok ? await meetsRes.json() : [];

    const diningCoords = diningRes.ok ? await diningRes.json().then((d) => d.map((r) => ({ ...r, type: "RESTAURANT", subtype: r.type }))) : [];

    allStaticCoordinates = [...mainCoords, ...shopsCoords, ...diningCoords];
  } catch (error) {
    console.error("Erreur chargement coordonnées:", error);
  }
}

async function loadMapData() {
  try {
    const apiRes = await fetch(API_URL).catch(() => null);

    const apiData = (apiRes && apiRes.ok) ? await apiRes.json() : { liveData: [] };

    const liveDataMap = new Map();
    (apiData.liveData || []).forEach((e) => {
      // ⭐ RETOUR AU NOM POUR LES ATTRACTIONS/RESTAURANTS ⭐
      if (e.name) liveDataMap.set(e.name.toUpperCase(), e);
    });

    // 1. POI standards fusionnés (Attractions, Shows via themeparks.wiki, Boutiques, Restos)
    const mergedPois = allStaticCoordinates.map((staticPoi) => {
      const poiName = staticPoi.titre || staticPoi.name;
      const apiMatch = liveDataMap.get(poiName?.toUpperCase());

      if (apiMatch) {
        return { ...staticPoi, ...apiMatch, entityType: staticPoi.type || apiMatch.entityType, name: poiName };
      }
      return { ...staticPoi, status: staticPoi.status || "UNKNOWN", entityType: staticPoi.type, name: poiName };
    });

    // 2. Traitement dynamique des Meets via ThemeParks API
    const liveMeets = (apiData.liveData || []).filter(item => {
        const isMG = item.externalId && item.externalId.includes('MG');
        const isKnownVirtualQueue = (item.externalId === 'P1M116') || (item.name && item.name.includes('Hero Training Center')) || (item.name && item.name.includes('Princess Pavilion'));
        const hasActiveVirtualQueue = item.queue && item.queue.RETURN_TIME;
        const isVirtualQueue = isKnownVirtualQueue || hasActiveVirtualQueue;
        
        return item.entityType === 'SHOW' && (isMG || isVirtualQueue);
    });

    liveMeets.forEach(meet => {
        const isKnownVirtualQueue = (meet.externalId === 'P1M116') || (meet.name && meet.name.includes('Hero Training Center')) || (meet.name && meet.name.includes('Princess Pavilion'));
        const hasActiveVirtualQueue = meet.queue && meet.queue.RETURN_TIME;
        const isVirtualQueue = isKnownVirtualQueue || hasActiveVirtualQueue;
        
        const allScheduleData = meet.showtimes || [];
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        
        const hasSchedulesToday = allScheduleData.some(item => {
            const date = new Date(item.startTime || item.endTime);
            return date >= startOfDay && date <= endOfDay;
        });
        
        // On contourne la vérification des horaires si c'est une file virtuelle
        if (!hasSchedulesToday && !isVirtualQueue) return;

        const matchedStatic = staticMeetsData.find(sm => sm.id === meet.externalId);

        if (matchedStatic && matchedStatic.localisation) {
            mergedPois.push({
                id: meet.id,
                name: translateText(meet.name),
                entityType: "MEET",
                status: meet.status || "OPERATING",
                lat: matchedStatic.localisation.lat,
                lon: matchedStatic.localisation.lon,
                showtimes: meet.showtimes,
                queue: meet.queue, // On transmet la file virtuelle pour le popup et le tooltip
                fileAttenteVirtuelle: !!isVirtualQueue,
                region: translateText(meet.areaName || "")
            });
        }
    });

    markersLayer.clearLayers();

    const filteredPois = mergedPois.filter((e) => activeFilters.has(e.entityType || e.type));

    filteredPois.forEach((entity) => {
      // Sécurité supplémentaire au rendu
      if (entity.id && typeof entity.id === 'string' && entity.id.includes("-old")) return;

      const lat = entity.lat || entity.coordinates?.latitude || entity.localisation?.lat;
      const lon = entity.lon || entity.coordinates?.longitude || entity.localisation?.lon;

      if (lat && lon) {
        const marker = L.marker([lat, lon], { icon: createCustomIcon(entity) });
        marker.bindPopup(createPopupContent(entity));

        const tooltipText = getWaitTimeText(entity);
        if (tooltipText) {
          const colorClass = `wait-time-tooltip-${getStatusColor(entity).replace("#", "")}`;
          marker.bindTooltip(tooltipText, { permanent: true, direction: "top", className: `wait-time-tooltip ${colorClass}` }).openTooltip();
        }
        markersLayer.addLayer(marker);
      }
    });
  } catch (error) {
    console.error("Erreur mise à jour carte:", error);
  }
}

document.addEventListener("DOMContentLoaded", initializeMap);