import type { Translations } from "./en";

const pt: Translations = {
  nav: { units: "Unidades", workOrders: "Ordens de Serviço", tasks: "Minhas Tarefas" },
  status: { available: "Disponível", occupied: "Ocupado", maintenance: "Manutenção", cleaning: "Limpeza", pending: "Pendente", inProgress: "Em Andamento", completed: "Concluído", cancelled: "Cancelado", verified: "Verificado" },
  priority: { urgent: "Urgente", high: "Alto", medium: "Médio", low: "Baixo" },
  dashboard: { appSubtitle: "Painel da Equipe", totalUnits: "Total de Unidades", allProperties: "Todas as Propriedades", logout: "Sair" },
  workOrders: { title: "Ordens de Serviço", subtitle: "Minhas Ordens de Serviço", pending: "Pendente", inProgress: "Em Andamento", done: "Concluído", all: "Todos", startWork: "Iniciar Trabalho", complete: "Concluir", completedDone: "Concluído", empty: "Sem Ordens de Serviço", emptyDesc: "Nenhuma ordem de serviço atribuída", failedLoad: "Falha ao carregar", retry: "Tentar novamente", toastStarted: "Iniciado", toastCompleted: "Concluído", toastFailed: "Falha na atualização" },
  tasks: { title: "Minhas Tarefas Atuais", pending: "Pendente", active: "Ativo", done: "Concluído", startTask: "Iniciar Tarefa", endTask: "Finalizar Tarefa", awaitingApproval: "Aguardando Aprovação", completedAwaiting: "Concluído — Aguardando Aprovação", approved: "Aprovado", completeTask: "Concluir Tarefa", taskLabel: "Tarefa", completionPhoto: "Foto de Conclusão", tapPhoto: "Toque para tirar uma foto", gpsLocation: "Localização GPS", locationGetting: "Obtendo sua localização...", locationDone: "Localização registrada", locationFailed: "Não foi possível obter a localização", allowLocation: "Permita o acesso à localização nas configurações do navegador", retryGps: "Tentar novamente", requirements: "Requisitos", photo: "Foto", submitReport: "Enviar Relatório", submitting: "Enviando...", cancel: "Cancelar" },
  unitDetail: { unitStatus: "Status da Unidade", financialData: "Dados Financeiros", serviceRequests: "Solicitações de Serviço", setStatus: "Definir status", type: "Tipo", capacity: "Capacidade", rate: "Taxa", status: "Status", amountDue: "Valor Devido", dueDate: "Data de Vencimento", checkIn: "Check-In", checkOut: "Check-Out", saveChanges: "Salvar Alterações", noFinancial: "Sem dados financeiros", addFinancial: "Adicionar Dados Financeiros", noRequests: "Sem solicitações para esta unidade", resolve: "Resolver", qrTitle: "QR de Solicitação de Serviço", copyLink: "Copiar Link", copied: "Link copiado!", guests: "hóspedes", perNight: "/noite", loading: "Carregando…", edit: "Editar", cancel: "Cancelar", new: "novo", offline: "Offline — sincronizará ao reconectar" },
  lang: { select: "Idioma" },
};

export default pt;
