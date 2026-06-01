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
    success: {
      title: "Demande reçue",
      subtitle: "Votre demande a bien été reçue.",
      refCode: "Code de référence",
      keepCode: "Conservez votre code de référence pour le suivi",
      newRequest: "Nouvelle demande",
    },
  },
  lang: { select: "Langue" },
};

export default fr;
