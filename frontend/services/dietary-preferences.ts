import { apiRequest } from "@/lib/api";
import type {
  DietaryPreference,
  DietaryPreferencePayload,
  DietaryPreferenceResponse,
} from "@/types/dietary-preference";

export async function getDietaryPreference() {
  const response = await apiRequest<DietaryPreferenceResponse>(
    "/api/v1/dietary-preferences",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.preference;
}

export async function saveDietaryPreference(payload: DietaryPreferencePayload) {
  const response = await apiRequest<DietaryPreferenceResponse>(
    "/api/v1/dietary-preferences",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return response.preference as DietaryPreference;
}
