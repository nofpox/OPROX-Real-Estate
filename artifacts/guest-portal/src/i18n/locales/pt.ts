import type { Translations } from "./en";

const pt: Translations = {
  request: {
    serviceRequest: "Solicitação de Serviço",
    requestType: "Tipo de Solicitação",
    description: "Descrição",
    descPlaceholder: "Descreva o problema brevemente…",
    submit: "Enviar Solicitação",
    submitting: "Enviando...",
    unitNotFound: "Unidade não encontrada",
    invalidUnit: "Por favor, insira um número de unidade válido.",
    errorGeneric: "Ocorreu um erro. Por favor, tente novamente.",
    types: {
      electrical: "Elétrica",
      plumbing: "Encanamento",
      ac: "Ar-condicionado / Aquecimento",
      cleaning: "Limpeza",
      maintenance: "Manutenção",
      noise: "Barulho",
      other: "Outro",
    },
    success: {
      title: "Solicitação Recebida",
      subtitle: "Sua solicitação foi recebida.",
      refCode: "Código de Referência",
      keepCode: "Guarde seu código de referência para acompanhamento",
      newRequest: "Nova Solicitação",
    },
  },
  landing: {
    accessUnit: "Acesse sua unidade",
    enterUnit: "Digite seu número de unidade para começar",
    accessPortal: "Acessar o portal",
    submitRequests: "Enviar solicitações",
    rateStay: "Avaliar sua estadia",
    unitDetails: "Detalhes da unidade",
  },
  lang: { select: "Idioma" },
};

export default pt;
