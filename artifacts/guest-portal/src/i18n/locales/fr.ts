import type { Translations } from "./en";

const fr: Translations = {
  request: {
    serviceRequest: "Demande de service",
    requestType: "Type de demande",
    description: "Description",
    descPlaceholder: "Décrivez brièvement le problème…",
    submit: "Soumettre la demande",
    submitting: "Envoi en cours...",
    unitNotFound: "Unité introuvable",
    invalidUnit: "Veuillez entrer un numéro d'unité valide.",
    errorGeneric: "Une erreur s'est produite. Veuillez réessayer.",
    types: {
      electrical: "Électricité",
      plumbing: "Plomberie",
      ac: "Climatisation / Chauffage",
      cleaning: "Nettoyage",
      maintenance: "Maintenance",
      noise: "Bruit",
      other: "Autre",
    },
    timeSlot: "Créneau horaire souhaité",
    timeSlotPlaceholder: "Sélectionnez une plage horaire",
    timeSlotHint: "Veuillez être présent pendant le créneau sélectionné afin que notre équipe puisse vous aider.",
    success: {
      title: "Demande reçue",
      subtitle: "Votre demande a bien été reçue.",
      refCode: "Code de référence",
      keepCode: "Conservez votre code de référence pour le suivi",
      newRequest: "Nouvelle demande",
    },
    status: { label: "Statut de la demande", pending: "En attente", hint: "Actualisation automatique toutes les 30 secondes" },
    rating: { title: "Évaluez votre expérience", subtitle: "Comment était notre service ?", commentPlaceholder: "Laissez un commentaire (optionnel)…", submit: "Soumettre l'évaluation", thankyou: "Merci pour votre retour !" },
  },
  landing: {
    accessUnit: "Accéder à votre unité",
    enterUnit: "Entrez votre numéro d'unité pour commencer",
    accessPortal: "Accéder au portail",
    submitRequests: "Soumettre des demandes",
    rateStay: "Évaluer votre séjour",
    unitDetails: "Détails de l'unité",
  },
  lang: { select: "Langue" },
};

export default fr;
