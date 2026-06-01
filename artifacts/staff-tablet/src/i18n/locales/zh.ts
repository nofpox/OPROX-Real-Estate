import type { Translations } from "./en";

const zh: Translations = {
  nav: { units: "单元", workOrders: "工单", tasks: "我的任务" },
  status: { available: "可用", occupied: "已占用", maintenance: "维修中", cleaning: "清洁中", pending: "待处理", inProgress: "进行中", completed: "已完成", cancelled: "已取消", verified: "已验证" },
  priority: { urgent: "紧急", high: "高", medium: "中", low: "低" },
  dashboard: { appSubtitle: "员工仪表板", totalUnits: "总单元数", allProperties: "所有物业", logout: "退出登录" },
  workOrders: { title: "工单", subtitle: "我的工单", pending: "待处理", inProgress: "进行中", done: "已完成", all: "全部", startWork: "开始工作", complete: "完成", completedDone: "已完成", empty: "暂无工单", emptyDesc: "未分配任何工单", failedLoad: "加载失败", retry: "重试", toastStarted: "已开始", toastCompleted: "已完成", toastFailed: "更新失败" },
  tasks: { title: "我的当前任务", pending: "待处理", active: "进行中", done: "已完成", startTask: "开始任务", endTask: "结束任务", awaitingApproval: "等待审批", completedAwaiting: "已完成 — 等待审批", approved: "已审批", completeTask: "完成任务", taskLabel: "任务", completionPhoto: "完成照片", tapPhoto: "点击拍照", gpsLocation: "GPS位置", locationGetting: "正在获取您的位置...", locationDone: "位置已记录", locationFailed: "无法获取位置", allowLocation: "请在浏览器设置中允许位置访问", retryGps: "重试", requirements: "要求", photo: "照片", submitReport: "提交报告", submitting: "提交中...", cancel: "取消" },
  unitDetail: { unitStatus: "单元状态", financialData: "财务数据", serviceRequests: "服务请求", setStatus: "设置状态", type: "类型", capacity: "容量", rate: "费率", status: "状态", amountDue: "应付金额", dueDate: "到期日", checkIn: "入住", checkOut: "退房", saveChanges: "保存更改", noFinancial: "暂无财务数据", addFinancial: "添加财务数据", noRequests: "该单元暂无请求", resolve: "解决", qrTitle: "服务请求二维码", copyLink: "复制链接", copied: "链接已复制！", guests: "客人", perNight: "/晚", loading: "加载中…", edit: "编辑", cancel: "取消", new: "新", offline: "离线 — 重新连接后将同步" },
  lang: { select: "语言" },
};

export default zh;
