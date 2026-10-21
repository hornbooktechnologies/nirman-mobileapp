export type WebsiteEnquiryStatus =
  | "SUBMITTED"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CREATED";

export interface WebsiteEnquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  source: string;
  status: WebsiteEnquiryStatus;
  nextFollowUpAt: string | null;
  adminNotes: string | null;
  lastContactedAt: string | null;
  convertedOrganization: { id: string; name: string | null } | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteEnquiryActivity {
  id: string;
  actor: { id: string; name: string | null };
  previousStatus: WebsiteEnquiryStatus;
  status: WebsiteEnquiryStatus;
  note: string | null;
  followUpAt: string | null;
  createdAt: string;
}

export interface UpdateWebsiteEnquiryInput {
  status?: WebsiteEnquiryStatus;
  nextFollowUpAt?: string | null;
  adminNotes?: string | null;
}

export interface WebsiteEnquiryPage {
  success: boolean;
  message: string;
  data: WebsiteEnquiry[];
  meta: { page: number; limit: number; total: number };
}

export interface WebsiteEnquiryQuery {
  page: number;
  limit: number;
  search?: string;
  status?: WebsiteEnquiryStatus;
}
