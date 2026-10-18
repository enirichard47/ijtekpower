/**
 * IJTEK Power Solutions — site configuration
 * ------------------------------------------------------------------
 * Fill in ONLY details that IJTEK Power Solutions has verified.
 * Anything left as an empty string stays hidden on the website, so
 * no placeholder phone numbers or addresses are ever shown to visitors.
 *
 * Formats
 *   phone     International format, digits only after "+", e.g. "+2348012345678"
 *   whatsapp  Same format as phone (used to build a https://wa.me/ link)
 *   email     A monitored inbox, e.g. "hello@your-domain.com"
 */
window.IJTEK_CONFIG = {
  contact: {
    phone: "",          // e.g. "+2348012345678"
    phoneDisplay: "",   // optional human-friendly version, e.g. "+234 801 234 5678"
    whatsapp: "",       // REQUIRED: the audit form and all quote/enquiry buttons send to this number, e.g. "+2348012345678"
    email: "",          // e.g. "hello@your-domain.com"
    address: "No. 22, Alhaji Yusuf Street, Igbogbo, Ikorodu, Lagos, Nigeria",
    serviceAreas: "",   // e.g. "Lagos, Abuja and surrounding states" — only confirmed areas
    hours: "",          // e.g. "Monday – Saturday, 8:00 am – 6:00 pm"
  },

  // Full profile URLs. Empty values are not shown.
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
  },

  // Real customer testimonials only, shared with the customer's permission.
  // The section shows a "coming soon" note while this list is empty.
  // Example entry:
  //   {
  //     quote: "What the customer said, in their own words.",
  //     name: "Customer name (or initials, if they prefer)",
  //     detail: "Homeowner, Ikorodu",            // optional: role, property type or area
  //     service: "Solar installation",            // optional
  //   },
  testimonials: [],

};
