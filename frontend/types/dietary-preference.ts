export type DietaryPreference = {
  id: number;
  user_id: number;
  liked: string[];
  disliked: string[];
  avoid: string[];
  created_at: string;
  updated_at: string;
};

export type DietaryPreferencePayload = Pick<
  DietaryPreference,
  "liked" | "disliked" | "avoid"
>;

export type DietaryPreferenceResponse = {
  preference: DietaryPreference | null;
};
