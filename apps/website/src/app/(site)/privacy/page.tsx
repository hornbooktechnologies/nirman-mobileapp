import type { Metadata } from "next";
import { LegalPage } from "@/components/company/LegalPage";
export const metadata: Metadata = { title: "Privacy Policy", robots: { index: false, follow: true } };
const sections = [
  {
    "id": "scope",
    "title": "Who this policy covers",
    "text": "This draft covers the NirmanSite website and app provided by Hornbook Technologies. Enquiries and app information serve different purposes. Before launch, confirm the responsible legal entity and privacy or grievance contact."
  },
  {
    "id": "enquiries",
    "title": "Website enquiries",
    "text": "The form asks for your name, mobile number, email address and an optional description of what you would like help with. Submissions are stored in Hornbook's protected administration system and email notifications are sent to the team so they can respond and, when you proceed, set up your NirmanSite organization."
  },
  {
    "id": "app-data",
    "title": "Information entered into the app",
    "text": "Depending on the features used, app information may include account, organisation, project, worker, attendance, Kharchi, wage, expense, materials, progress and related records. The final policy must match the actual fields, attachments, technical logs and permissions implemented."
  },
  {
    "id": "purpose",
    "title": "Why information is used",
    "text": "Enquiry information supports requirements discussions and related contact. App information supports customer-requested functions and operation of the service. Additional purposes, analytics or promotional communications must be described where applicable. This draft does not authorise unspecified uses."
  },
  {
    "id": "people",
    "title": "Information about other people",
    "text": "Customers should enter information only with appropriate authority and a lawful basis, and provide notices required for their use of worker or third-party information. Do not include worker records, financial documents or sensitive information in website enquiries."
  },
  {
    "id": "access",
    "title": "Access and service providers",
    "text": "Access should be limited to authorised users and personnel or providers who need it for stated purposes. The final policy must identify actual hosting, communications and other processing providers, their roles and relevant international transfers. No unverified hosting location or exclusive-access claim is made."
  },
  {
    "id": "retention",
    "title": "Retention and deletion",
    "text": "Enquiry retention, account closure, operational record retention, backup expiry and deletion procedures must be confirmed before publication. Information may need preservation under a legal obligation or valid request. Immediate deletion is not promised."
  },
  {
    "id": "security",
    "title": "Security and lawful disclosure",
    "text": "Safeguards must reflect the actual architecture and access model. No online system can guarantee absolute security. Information may require preservation or disclosure in response to valid legal requirements. Final wording must reflect implemented safeguards and incident-handling obligations without unsupported certifications."
  },
  {
    "id": "choices",
    "title": "Your choices and requests",
    "text": "Contact the team about your information, corrections, contact preferences or applicable privacy rights. Requests concerning information managed by a customer organisation may need coordination with that organisation. Rights and exceptions depend on applicable law; finalise the process and responsible contact before launch."
  },
  {
    "id": "cookies",
    "title": "Cookies and technical information",
    "text": "The marketing website uses Google Analytics 4 to measure visits and interactions. Google Analytics may use cookies and process usage information such as pages visited, browser and device information. This tag is not loaded on direct account-activation pages, and enquiry field contents are not explicitly sent to Analytics. The final notice must reflect the deployed analytics settings, consent controls, server logs and other integrations."
  },
  {
    "id": "updates",
    "title": "Finalisation and updates",
    "text": "Confirm providers, retention periods, privacy contacts, applicable requirements and an effective date before launch. Publish material changes clearly. This draft is for review, not a declaration that privacy compliance obligations have been completed."
  }
];
export default function Page() { return <LegalPage kind="PRIVACY POLICY" title={"Your information. A clearer picture."} intro={"Understand the difference between starting a conversation with our team and managing records in the app."} cards={[{"title":"You share","text":"An enquiry, or information for your app workflow."},{"title":"A stated purpose","text":"Respond to your request or provide the service."},{"title":"Appropriate access","text":"Access and disclosure follow defined needs and legal obligations."}]} sections={sections} />; }
