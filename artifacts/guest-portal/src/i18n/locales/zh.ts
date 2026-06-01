import type { Translations } from "./en";

const zh: Translations = {
  request: {
    serviceRequest: "服务请求",
    requestType: "请求类型",
    description: "描述",
    descPlaceholder: "简要描述问题…",
    submit: "提交请求",
    submitting: "提交中...",
    unitNotFound: "未找到单元",
    invalidUnit: "请输入有效的单元号。",
    errorGeneric: "发生错误，请重试。",
    types: {
      electrical: "电气",
      plumbing: "管道",
      ac: "空调 / 暖气",
      cleaning: "清洁",
      maintenance: "维修",
      noise: "噪音",
      other: "其他",
    },
    timeSlot: "首选时间段",
    timeSlotPlaceholder: "选择时间窗口",
    timeSlotHint: "请在所选时间段内在场，以便我们的团队为您提供帮助。",
    success: {
      title: "请求已收到",
      subtitle: "您的请求已收到。",
      refCode: "参考编号",
      keepCode: "请保留您的参考编号以便跟进",
      newRequest: "新请求",
    },
    status: { label: "请求状态", pending: "待处理", hint: "每30秒自动刷新" },
    rating: { title: "评价您的体验", subtitle: "我们的服务如何？", commentPlaceholder: "留下评论（可选）…", submit: "提交评分", thankyou: "感谢您的反馈！" },
  },
  landing: {
    accessUnit: "访问您的单元",
    enterUnit: "输入您的单元号以开始",
    accessPortal: "进入门户",
    submitRequests: "提交请求",
    rateStay: "评价您的入住",
    unitDetails: "单元详情",
  },
  lang: { select: "语言" },
};

export default zh;
