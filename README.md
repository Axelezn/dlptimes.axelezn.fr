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


## ⚙️ Configuration des Seuils de Temps (Le plus important !)

La logique de la coloration est entièrement définie par vous dans le fichier `js/timetables.js`.

### Fichier de Configuration : `js/config.js`

Ce fichier contient l'objet `ATTRACTION_THRESHOLDS`. Pour personnaliser le code couleur :

1.  Ouvrez `js/timetables.js`.
2.  Localisez l'attraction que vous souhaitez modifier (par exemple, `"Phantom Manor"`).
3.  Ajustez les valeurs `maxTime` pour définir quand une couleur doit s'appliquer :
   PS : Le google sheets comprenant les temps affichés sur le site : https://docs.google.com/spreadsheets/d/1zDkrmjTPWf4SfTwpzgjGZ6f5tJvsdmCm3YgGSXC029Y/edit?usp=drive_link

```javascript
// Exemple de seuils pour Phantom Manor
"Phantom Manor": [
    { maxTime: 10, className: 'time-gold' },    // 0 à 10 min -> OR
    { maxTime: 20, className: 'time-green' },   // 11 à 20 min -> VERT
    { maxTime: 30, className: 'time-orange' },  // 21 à 30 min -> ORANGE
    { maxTime: Infinity, className: 'time-red' } // 31 min et + -> ROUGE (Votre préférence)
],
