const en = {
  request: {
    serviceRequest: "Service Request",
    requestType: "Request Type",
    description: "Description",
    descPlaceholder: "Briefly describe the issue…",
    submit: "Submit Request",
    submitting: "Submitting...",
    unitNotFound: "Unit not found",
    errorGeneric: "An error occurred. Please try again.",
    types: {
      electrical: "Electrical",
      plumbing: "Plumbing",
      ac: "AC / Heating",
      cleaning: "Cleaning",
      maintenance: "Maintenance",
      noise: "Noise",
      other: "Other",
    },
    success: {
      title: "Request Received",
      subtitle: "Your request has been received.",
      refCode: "Reference Code",
      keepCode: "Keep your reference code for follow-up",
      newRequest: "New Request",
    },
  },
  lang: { select: "Language" },
};

export type Translations = typeof en;
export default en;
