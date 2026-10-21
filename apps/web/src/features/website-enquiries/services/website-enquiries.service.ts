import { api, apiClient } from "@/lib/api/api-client";
import type {
  WebsiteEnquiryPage,
  WebsiteEnquiryQuery,
  WebsiteEnquiry,
  WebsiteEnquiryActivity,
  UpdateWebsiteEnquiryInput,
} from "@/features/website-enquiries/types/website-enquiries.types";

const base = "/platform/website-enquiries";

export const websiteEnquiriesService = {
  async list(query: WebsiteEnquiryQuery, signal?: AbortSignal) {
    return (await apiClient.get<WebsiteEnquiryPage>(base, { params: query, signal })).data;
  },
  update(enquiryId: string, input: UpdateWebsiteEnquiryInput) {
    return api.patch<WebsiteEnquiry>(`${base}/${encodeURIComponent(enquiryId)}`, input);
  },
  activities(enquiryId: string, signal?: AbortSignal) {
    return apiClient.get<{ success: boolean; data: WebsiteEnquiryActivity[] }>(
      `${base}/${encodeURIComponent(enquiryId)}/activities`,
      { signal },
    ).then((response) => response.data.data);
  },
  convert(enquiryId: string, organizationId: string) {
    return api.patch<{ id: string; status: "CREATED"; organizationId: string }>(
      `${base}/${encodeURIComponent(enquiryId)}/convert`,
      { organizationId },
    );
  },
};
