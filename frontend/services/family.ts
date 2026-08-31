import { apiRequest } from "@/lib/api";
import type {
  CurrentFamilyResponse,
  CreateFamilyPayload,
  FamilyMembersResponse,
  JoinFamilyPayload,
} from "@/types/family";

export async function getCurrentFamily() {
  return apiRequest<CurrentFamilyResponse>("/api/v1/families/current", {
    method: "GET",
    cache: "no-store",
  });
}

export async function createFamily(payload: CreateFamilyPayload) {
  return apiRequest<CurrentFamilyResponse>("/api/v1/families", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinFamily(payload: JoinFamilyPayload) {
  return apiRequest<CurrentFamilyResponse>("/api/v1/families/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFamilyMembers() {
  const response = await apiRequest<FamilyMembersResponse>(
    "/api/v1/families/members",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.members;
}
