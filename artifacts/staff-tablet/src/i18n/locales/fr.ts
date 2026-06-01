import type { Translations } from "./en";

const fr: Translations = {
  nav: { units: "Unités", workOrders: "Bons de travail", tasks: "Mes tâches" },
  status: { available: "Disponible", occupied: "Occupé", maintenance: "Maintenance", cleaning: "Nettoyage", pending: "En attente", inProgress: "En cours", completed: "Terminé", cancelled: "Annulé", verified: "Vérifié" },
  priority: { urgent: "Urgent", high: "Élevé", medium: "Moyen", low: "Faible" },
  dashboard: { appSubtitle: "Tableau de bord du personnel", totalUnits: "Total des unités", allProperties: "Toutes les propriétés", logout: "Se déconnecter" },
  workOrders: { title: "Bons de travail", subtitle: "Mes bons de travail", pending: "En attente", inProgress: "En cours", done: "Terminé", all: "Tous", startWork: "Démarrer le travail", complete: "Terminer", completedDone: "Terminé", empty: "Aucun bon de travail", emptyDesc: "Aucun bon de travail assigné", failedLoad: "Échec du chargement", retry: "Réessayer", toastStarted: "Démarré", toastCompleted: "Terminé", toastFailed: "Échec de la mise à jour" },
  tasks: { title: "Mes tâches actuelles", pending: "En attente", active: "Actif", done: "Terminé", startTask: "Démarrer la tâche", endTask: "Terminer la tâche", awaitingApproval: "En attente d'approbation", completedAwaiting: "Terminé — En attente d'approbation", approved: "Approuvé", completeTask: "Terminer la tâche", taskLabel: "Tâche", completionPhoto: "Photo de réalisation", tapPhoto: "Appuyez pour prendre une photo", gpsLocation: "Position GPS", locationGetting: "Obtention de votre position...", locationDone: "Position enregistrée", locationFailed: "Impossible d'obtenir la position", allowLocation: "Veuillez autoriser l'accès à la position dans les paramètres", retryGps: "Réessayer", requirements: "Exigences", photo: "Photo", submitReport: "Soumettre le rapport", submitting: "Envoi en cours...", cancel: "Annuler" },
  unitDetail: { unitStatus: "Statut de l'unité", financialData: "Données financières", serviceRequests: "Demandes de service", setStatus: "Définir le statut", type: "Type", capacity: "Capacité", rate: "Tarif", status: "Statut", amountDue: "Montant dû", dueDate: "Date d'échéance", checkIn: "Entrée", checkOut: "Sortie", saveChanges: "Enregistrer les modifications", noFinancial: "Aucune donnée financière", addFinancial: "Ajouter des données financières", noRequests: "Aucune demande pour cette unité", resolve: "Résoudre", qrTitle: "QR de demande de service", copyLink: "Copier le lien", copied: "Lien copié !", guests: "invités", perNight: "/nuit", loading: "Chargement…", edit: "Modifier", cancel: "Annuler", new: "nouveau", offline: "Hors ligne — synchronisation à la reconnexion" },
  lang: { select: "Langue" },
};

export default fr;
