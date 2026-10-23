"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { websiteEnquiriesService } from "@/features/website-enquiries/services/website-enquiries.service";
import type {
  UpdateWebsiteEnquiryInput,
  WebsiteEnquiryQuery,
} from "@/features/website-enquiries/types/website-enquiries.types";

export const websiteEnquiryKeys = {
  all: ["website-enquiries"] as const,
  list: (query: WebsiteEnquiryQuery) => ["website-enquiries", query] as const,
  activities: (enquiryId: string) =>
    ["website-enquiries", enquiryId, "activities"] as const,
};

export function useWebsiteEnquiries(query: WebsiteEnquiryQuery) {
  return useQuery({
    queryKey: websiteEnquiryKeys.list(query),
    queryFn: ({ signal }) => websiteEnquiriesService.list(query, signal),
  });
}

export function useWebsiteEnquiryActivities(enquiryId?: string) {
  return useQuery({
    queryKey: websiteEnquiryKeys.activities(enquiryId ?? ""),
    queryFn: ({ signal }) =>
      websiteEnquiriesService.activities(enquiryId!, signal),
    enabled: Boolean(enquiryId),
  });
}

export function useUpdateWebsiteEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enquiryId,
      input,
    }: {
      enquiryId: string;
      input: UpdateWebsiteEnquiryInput;
    }) => websiteEnquiriesService.update(enquiryId, input),
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: websiteEnquiryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: websiteEnquiryKeys.activities(variables.enquiryId),
        }),
      ]),
  });
}

export function useConvertWebsiteEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enquiryId,
      organizationId,
    }: {
      enquiryId: string;
      organizationId: string;
    }) => websiteEnquiriesService.convert(enquiryId, organizationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: websiteEnquiryKeys.all }),
  });
}

export function useWebsiteEnquiryActivationLink() {
  return useMutation({
    mutationFn: (enquiryId: string) =>
      websiteEnquiriesService.activationLink(enquiryId),
  });
}
