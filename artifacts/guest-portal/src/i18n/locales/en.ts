const en = {
  request: {
    serviceRequest: "Service Request",
    requestType: "Request Type",
    description: "Description",
    descPlaceholder: "Briefly describe the issue…",
    submit: "Submit Request",
    submitting: "Submitting...",
    unitNotFound: "Unit not found",
    invalidUnit: "Please enter a valid unit number.",
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
  landing: {
    accessUnit: "Access Your Unit",
    enterUnit: "Enter your unit number to get started",
    accessPortal: "Access Portal",
    submitRequests: "Submit Requests",
    rateStay: "Rate Your Stay",
    unitDetails: "Unit Details",
  },
  lang: { select: "Language" },
};

export type Translations = typeof en;
export default en;
