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
    success: {
      title: "请求已收到",
      subtitle: "您的请求已收到。",
      refCode: "参考编号",
      keepCode: "请保留您的参考编号以便跟进",
      newRequest: "新请求",
    },
  },
  lang: { select: "语言" },
};

export default zh;
