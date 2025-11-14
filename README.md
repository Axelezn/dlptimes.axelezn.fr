# 🏰⏱️ Disneyland Paris - Temps d'Attente Personnalisés

## ⚡ Aperçu du Projet
Ce projet est une application web simple et auto-hébergée, conçue pour afficher les temps d'attente en direct des attractions du Parc Disneyland et du Walt Disney Studios Park, en utilisant les données de l'API publique de Themeparks.wiki.

La particularité de cette application est sa **coloration conditionnelle personnalisée**. Vous décidez vous-même, attraction par attraction, si un temps d'attente "vaut le coup" (Vert, Or) ou s'il est "à éviter" (Rouge).

### Fonctionnalités Clés
* **Actualisation Automatique :** Les données sont mises à jour toutes les 2 minutes.
* **Regroupement par Land/Zone :** Affichage clair et organisé par zone du parc.
* **Couleurs Personnalisées (Le "Vaut le Coup") :**
    * **🟡 OR:** Temps d'attente très court, *MUST DO* absolu.
    * **🟢 VERT:** Bon temps, l'attraction vaut le coup.
    * **🟠 ORANGE:** Temps moyen à long, à considérer.
    * **🔴 ROUGE:** Temps d'attente trop long, à éviter.

## 🛠️ Installation et Utilisation

Ce projet ne nécessite aucune compilation ou dépendance externe côté serveur (Backend). Il est entièrement basé sur du HTML, CSS et JavaScript pur (Vanilla JS).

### Pré-requis
* Un navigateur web moderne.

### Étapes
1.  **Cloner le dépôt :**
    ```bash
    git clone [https://github.com/Axelezn/dlptimes.axelezn.fr.git]
    cd disneyland-wait-times
    ```
2.  **Lancer l'application :**
    * Ouvrez le fichier `index.html` directement dans votre navigateur.
3.  **Hébergement (Optionnel) :**
    * Le projet peut être hébergé facilement via GitHub Pages, Netlify ou tout serveur web statique.

## ⚙️ Configuration des Seuils de Temps (Le plus important !)

La logique de la coloration est entièrement définie par vous dans le fichier `js/config.js`.

### Fichier de Configuration : `js/config.js`

Ce fichier contient l'objet `ATTRACTION_THRESHOLDS`. Pour personnaliser le code couleur :

1.  Ouvrez `js/config.js`.
2.  Localisez l'attraction que vous souhaitez modifier (par exemple, `"Phantom Manor"`).
3.  Ajustez les valeurs `maxTime` pour définir quand une couleur doit s'appliquer :

```javascript
// Exemple de seuils pour Phantom Manor
"Phantom Manor": [
    { maxTime: 10, className: 'time-gold' },    // 0 à 10 min -> OR
    { maxTime: 20, className: 'time-green' },   // 11 à 20 min -> VERT
    { maxTime: 30, className: 'time-orange' },  // 21 à 30 min -> ORANGE
    { maxTime: Infinity, className: 'time-red' } // 31 min et + -> ROUGE (Votre préférence)
],
