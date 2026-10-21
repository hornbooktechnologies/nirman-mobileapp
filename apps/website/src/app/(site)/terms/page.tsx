import type { Metadata } from "next";
import { LegalPage } from "@/components/company/LegalPage";
export const metadata: Metadata = { title: "Terms & Conditions", robots: { index: false, follow: true } };
const sections = [
  {
    "id": "service",
    "title": "The service and its provider",
    "text": "NirmanSite is a construction-management product of Hornbook Technologies. It helps customers organise project, worker, attendance, advance, wage, expense, materials, progress and related records. The contracting entity and any separate commercial agreement must be confirmed before launch."
  },
  {
    "id": "accounts",
    "title": "Accounts and authorised access",
    "text": "Use the service only if you are authorised to act for yourself or your organisation. Keep credentials secure, assign access appropriately and notify the team of suspected unauthorised use. Organisations are responsible for managing their users and permissions."
  },
  {
    "id": "records",
    "title": "Your records, your responsibility",
    "text": "Customers are responsible for the accuracy, completeness and lawful use of information they enter, including information about other people. An entry is not independent verification of an underlying event. Review your records and correct errors through supported workflows."
  },
  {
    "id": "payments",
    "title": "Recording is not transferring money",
    "text": "NirmanSite does not provide a payment gateway, hold funds or transfer recorded wages, advances or expenses. A payment marked as paid is a customer-provided record, not a certification from Hornbook. Calculations depend on the entered information and configured rules and must be reviewed before reliance."
  },
  {
    "id": "obligations",
    "title": "Business and statutory obligations",
    "text": "The service does not replace accounting, tax, legal or employment advice, statutory filings or legally required records. Customers remain responsible for their underlying activities, wage payments and compliance. Recording a transaction does not make Hornbook a party to it."
  },
  {
    "id": "requests",
    "title": "Lawful requests and investigations",
    "text": "These terms do not prevent competent authorities from seeking records through lawful processes. Hornbook may be required to preserve or disclose information in response to a valid legal requirement. Customer responsibility does not remove obligations applicable law places on Hornbook. Do not use the service to falsify evidence or conceal unlawful activity."
  },
  {
    "id": "use",
    "title": "Acceptable use",
    "text": "Do not enter fraudulent information, access information without authority, interfere with the service or introduce malicious software. Restrictions or suspension may be necessary for security, misuse or legal requirements, subject to applicable law and the service agreement."
  },
  {
    "id": "rights",
    "title": "Data and software rights",
    "text": "Customers retain their rights in information they provide. Hornbook requires the permissions necessary to operate and support the agreed service and meet legal obligations. Software, branding and product materials belong to their respective rights holders. Data processing is addressed separately in the Privacy Policy."
  },
  {
    "id": "availability",
    "title": "Availability and termination",
    "text": "Software can experience maintenance, interruptions and errors. This draft does not promise uninterrupted availability. Commercial commitments, termination, export access and post-termination retention must be defined in the final terms and service agreement."
  },
  {
    "id": "liability",
    "title": "Liability and disputes",
    "text": "The final agreement must define proportionate limitations, remedies, applicable law and the dispute forum. It must not exclude rights or liabilities that cannot lawfully be excluded. No blanket exemption from Hornbook’s own legal responsibilities is intended. These provisions require legal review."
  },
  {
    "id": "updates",
    "title": "Changes and questions",
    "text": "Final terms should have an effective date and explain notification of material changes. Contact the team about this draft. No unconfirmed response deadline, refund rule or jurisdiction is asserted here."
  }
];
export default function Page() { return <LegalPage kind="TERMS & CONDITIONS" title={"Clear records. Clear responsibilities."} intro={"Understand what NirmanSite does, what a recorded entry means, and where responsibilities sit."} cards={[{"title":"Organise the work","text":"A digital home for construction records."},{"title":"Record, not transfer","text":"A paid entry does not move or independently verify money."},{"title":"Stay responsible","text":"Customers remain responsible for their underlying activities."}]} sections={sections} />; }
