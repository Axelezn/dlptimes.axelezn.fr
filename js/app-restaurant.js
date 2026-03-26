// js/app-restaurants.js - V14 (Fix Recherche: Masquage des titres vides)

{
  // 🛡️ Bloc d'isolation

  const RESTO_CONFIG = {
    DATA_URL: "js/json/restaurants.json",
    REFRESH_INTERVAL: 60000,
  };

  // Stockage global des données
  let globalRestoData = [];

  // État des filtres
  let activeFilters = {
    price: null,
    type: null,
  };

  // --- UTILITAIRES ---

  const getParkCategory = (landName) => {
    if (!landName) return "Autres";
    const dlpLands = ["Main Street, U.S.A.", "Fantasyland", "Discoveryland", "Frontierland", "Adventureland"];
    if (dlpLands.includes(landName)) return "Parc Disneyland";

    const wdsLands = ["Front Lot", "Avengers Campus", "Worlds of Pixar", "Toon Studio", "Production Courtyard", "World Premiere Plaza", "Adventure Way", "Adventure Way", "World Of Frozen"];
    if (wdsLands.includes(landName)) return "Disney Adventure World";

    if (landName === "Disney Village") return "Disney Village";

    if (landName.includes("Hôtel") || landName.includes("Hotel") || landName.includes("Lodge") || landName.includes("Club") || landName.includes("Ranch")) {
      return "Hôtels Disney";
    }
    return "Autres";
  };

  const getTypeIcon = (type) => {
    if (!type) return "🍴";
    const t = type.toLowerCase();
    if (t.includes("rapide") || t.includes("fast")) return "🍔";
    if (t.includes("table")) return "🍽️";
    if (t.includes("buffet")) return "🥗";
    if (t.includes("emporter") || t.includes("snack")) return "🥡";
    if (t.includes("glace")) return "🍦";
    if (t.includes("bar")) return "🍹";
    return "🍴";
  };

  const getPriceDisplay = (price) => {
    if (!price || price === "/") return "";
    if (price === "€") return '<span style="color:#28a745; font-weight:bold;">€</span><span style="color:#555;">€€</span>';
    if (price === "€€") return '<span style="color:#ffc72c; font-weight:bold;">€€</span><span style="color:#555;">€</span>';
    if (price === "€€€") return '<span style="color:#dc3545; font-weight:bold;">€€€</span>';
    return price;
  };

  // --- GÉNÉRATION HTML ---

  const createFavButton = (id) => {
    if (typeof window.isFavorite !== "function") return "";
    const isActive = window.isFavorite(id);
    const heart = isActive ? "❤️" : "🤍";
    const activeClass = isActive ? "active" : "";
    return `<button class="fav-btn ${activeClass}" 
            onclick="event.stopPropagation(); window.toggleFavorite('${id}'); this.classList.toggle('active'); this.innerText = this.classList.contains('active') ? '❤️' : '🤍';">
            ${heart}
        </button>`;
  };

  const createRestoCard = (resto) => {
    const icon = getTypeIcon(resto.type || "");
    const nom = resto.name || resto.titre || "Restaurant";
    const cuisine = resto.cuisine || "";
    const menuUrl = resto.menuUrl || "";

    let badges = "";
    if (resto.reservation) badges += `<span class="badge badge-blue">📱 Réservation</span>`;
    if (resto.clickAndCollect) badges += `<span class="badge badge-orange">🛍️ Click&Collect</span>`;

    let menuHtml = "";
    if (menuUrl.length > 5) {
      menuHtml = `<a href="${menuUrl}" class="btn-menu"> Voir le menu</a>`;
    }

    const prixHtml = getPriceDisplay(resto.priceRange || resto.prix);
    let horairesText = resto.horaires;
    let horairesClass = "status-single-rider";

    if (!horairesText || horairesText === "") {
      horairesText = "Horaires NC";
      horairesClass = "time-past-box";
    }

    if (resto.status && (resto.status === "CLOSED" || resto.status === "FERME" || resto.status === "FERMÉ")) {
      horairesText = "Fermé";
      horairesClass = "status-closed-single";
    }

    return `
            <div class="attraction-card" id="resto-${resto.id}">
                <div class="attraction-info">
                    <div style="display:flex; justify-content:space-between; align-items:start; padding-right:5px;">
                        <h3 style="margin:0;">${nom}</h3>
                        ${createFavButton(resto.id)}
                    </div>
                    
                    <p style="color:#ffc72c; margin-top:2px; font-weight:600;">
                        ${icon} ${resto.type || ""} 
                        ${cuisine ? `<span style="color:#b0b0d0; font-weight:400;">• ${cuisine}</span>` : ""}
                    </p>
                    
                    <div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:5px;">${badges}</div>
                    <div style="margin-top:10px;">${menuHtml}</div>
                </div>

                <div class="wait-times-container">
                    <div class="wait-time" style="background-color: #222; border: 1px solid #444; color: #fff; padding: 8px 0; min-width: 65px; display:flex; justify-content:center;">
                        ${prixHtml}
                    </div>
                    <div class="wait-time single-rider-time ${horairesClass}" style="margin-top:5px;">
                        ${horairesText}
                    </div>
                </div>
            </div>
        `;
  };

  // --- GESTION DES FILTRES ---

  const setupFilters = () => {
    const searchContainer = document.querySelector(".search-container");
    if (!searchContainer || document.getElementById("filters-container")) return;

    const filterDiv = document.createElement("div");
    filterDiv.id = "filters-container";
    filterDiv.className = "filters-scroll-container";

    const filters = [
      { label: "€", type: "price", value: "€" },
      { label: "€€", type: "price", value: "€€" },
      { label: "€€€", type: "price", value: "€€€" },
      { label: "🍔 Rapide", type: "type", value: "rapide" },
      { label: "🍽️ Table", type: "type", value: "table" },
      { label: "🥗 Buffet", type: "type", value: "buffet" },
      { label: "🥡 Snack", type: "type", value: "snack" },
    ];

    filters.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "filter-chip";
      btn.innerText = f.label;
      btn.onclick = () => toggleFilter(f.type, f.value, btn);
      filterDiv.appendChild(btn);
    });

    searchContainer.appendChild(filterDiv);
  };

  const toggleFilter = (type, value, btn) => {
    if (activeFilters[type] === value) {
      activeFilters[type] = null;
      btn.classList.remove("active");
    } else {
      activeFilters[type] = value;
      const siblings = btn.parentElement.querySelectorAll(".filter-chip");
      siblings.forEach((s) => {
        if (type === "price" && s.innerText.includes("€")) s.classList.remove("active");
        if (type === "type" && !s.innerText.includes("€")) s.classList.remove("active");
      });
      btn.classList.add("active");
    }
    renderList(globalRestoData);
  };

  // --- RENDU DE LA LISTE (MOTEUR) ---

  const renderList = (data) => {
    const listElement = document.getElementById("restaurants-list");
    listElement.innerHTML = "";

    // 1. FILTRAGE
    const filteredData = data.filter((resto) => {
      if (activeFilters.price && (resto.priceRange || resto.prix) !== activeFilters.price) return false;
      if (activeFilters.type) {
        const rType = (resto.type || "").toLowerCase();
        if (!rType.includes(activeFilters.type)) return false;
      }
      return true;
    });

    if (filteredData.length === 0) {
      listElement.innerHTML = '<div class="loading-message">Aucun restaurant ne correspond à vos filtres 🥺</div>';
      return;
    }

    // 2. HIERARCHIE
    const hierarchy = {};
    const categoryOrder = ["Parc Disneyland", "Disney Adventure World", "Disney Village", "Hôtels Disney", "Autres"];

    filteredData.forEach((resto) => {
      const land = resto.land || "Inconnu";
      const category = getParkCategory(land);
      if (!hierarchy[category]) hierarchy[category] = {};
      if (!hierarchy[category][land]) hierarchy[category][land] = [];
      hierarchy[category][land].push(resto);
    });

    // 3. AFFICHAGE AVEC WRAPPERS (Important pour le masquage)
    categoryOrder.forEach((catName) => {
      if (hierarchy[catName]) {
        // ⭐ NOUVEAU : On enveloppe tout le parc dans un div container
        const categoryWrapper = document.createElement("div");
        categoryWrapper.className = "category-wrapper";

        const mainHeader = document.createElement("h2");
        mainHeader.className = "park-show-header major-header";
        mainHeader.innerText = catName;
        categoryWrapper.appendChild(mainHeader);

        const landsObj = hierarchy[catName];
        const sortedLands = Object.keys(landsObj).sort();

        sortedLands.forEach((landName) => {
          const landContainer = document.createElement("div");
          landContainer.className = "park-group";

          const landHeader = document.createElement("h3");
          landHeader.className = "land-header";
          landHeader.innerHTML = `📍 ${landName}`;
          landContainer.appendChild(landHeader);

          const restos = landsObj[landName].sort((a, b) => {
            if (typeof window.isFavorite === "function") {
              const favA = window.isFavorite(a.id);
              const favB = window.isFavorite(b.id);
              if (favA !== favB) return favB - favA;
            }
            return (a.name || a.titre).localeCompare(b.name || b.titre);
          });

          restos.forEach((r) => {
            landContainer.innerHTML += createRestoCard(r);
          });

          categoryWrapper.appendChild(landContainer);
        });

        listElement.appendChild(categoryWrapper);
      }
    });
  };

  // --- CHARGEMENT INITIAL ---

  const loadRestaurants = async () => {
    const listElement = document.getElementById("restaurants-list");
    if (!listElement.querySelector(".park-group")) {
      listElement.innerHTML = '<div class="loading-message">🍔 Préparation de la cuisine...</div>';
    }

    try {
      const urlWithNoCache = `${RESTO_CONFIG.DATA_URL}?t=${Date.now()}`;
      const response = await fetch(urlWithNoCache);
      if (!response.ok) throw new Error("Erreur JSON");
      globalRestoData = await response.json();

      setupFilters();
      renderList(globalRestoData);

      // --- GESTION RECHERCHE INTELLIGENTE ---
      const searchInput = document.getElementById("search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const term = e.target.value.toLowerCase().trim();

          // 1. On parcourt chaque catégorie (Parc)
          const categories = document.querySelectorAll(".category-wrapper");
          
          categories.forEach((category) => {
            let hasVisibleLand = false;

            // 2. On parcourt chaque Land dans la catégorie
            const lands = category.querySelectorAll(".park-group");

            lands.forEach((land) => {
              let hasVisibleResto = false;
              const cards = land.querySelectorAll(".attraction-card");

              // 3. On parcourt chaque Resto dans le Land
              cards.forEach((card) => {
                const visible = card.innerText.toLowerCase().includes(term);
                card.style.display = visible ? "flex" : "none";
                if (visible) hasVisibleResto = true;
              });

              // Si le land n'a aucun resto visible, on le cache
              land.style.display = hasVisibleResto ? "flex" : "none";
              if (hasVisibleResto) hasVisibleLand = true;
            });

            // Si la catégorie n'a aucun land visible, on la cache (y compris le titre H2)
            category.style.display = hasVisibleLand ? "block" : "none";
          });
        });
      }
    } catch (e) {
      console.error(e);
      listElement.innerHTML = `<div class="loading-message status-closed">❌ Erreur chargement JSON</div>`;
    }
  };

  document.addEventListener("DOMContentLoaded", loadRestaurants);
} // 🛡️ Fin