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
  lang: { select: "Idioma" },
};

export default pt;
