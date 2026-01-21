// js/tracker.js - V5 (Refactored & Cleaned)

/**
 * Récupère les détails techniques du navigateur client.
 */
const getClientDetails = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
        userAgent: navigator.userAgent || 'Inconnu',
        platform: navigator.platform || 'Inconnue',
        language: navigator.language || 'Inconnue',
        connectionType: conn ? (conn.effectiveType || conn.type) : 'N/A',
    };
};

/**
 * Fonction principale de suivi : Récupère l'IP et envoie le webhook.
 */
const trackVisitor = async () => {
    // Vérification basique de l'URL
    if (!WEBHOOK_URL || !WEBHOOK_URL.startsWith('http')) return;

    const client = getClientDetails();
    let ipAddress = 'Non disponible';

    // 1. Tentative de récupération de l'IP
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
        }
    } catch (e) {
        // Échec silencieux pour l'IP (bloqueurs de pub, etc.)
        // On continue quand même pour envoyer les autres infos
    }

    // 2. Construction du message Discord
    const date = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });
    
    const payload = {
        content: `🔔 Nouvelle visite sur DLP Times à ${date} (CET). (IP: ${ipAddress})`,
        username: "DLP Times Tracker",
        embeds: [{
            title: "Détails de la Visite",
            color: 3447003, // Bleu
            fields: [
                { name: "Adresse IP", value: ipAddress, inline: true },
                { name: "Langue", value: client.language, inline: true },
                { name: "Système", value: client.platform, inline: true },
                { name: "Connexion", value: client.connectionType, inline: true },
                { name: "User Agent", value: `\`${client.userAgent}\``, inline: false },
            ]
        }]
    };

    // 3. Envoi au Webhook
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Tracker: Erreur lors de l\'envoi Discord', error);
    }
};

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', trackVisitor);
