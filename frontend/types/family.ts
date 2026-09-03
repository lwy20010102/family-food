import type { User } from "@/types/auth";

export type FamilyPublic = {
  id: number;
  name: string;
  invite_code: string;
  creator_id: number;
  created_at: string;
  updated_at: string;
};

export type FamilyRole = "owner" | "member";
export type MealRole = "diner" | "cook";

export type FamilyMember = {
  id: number;
  role: FamilyRole;
  meal_role: MealRole;
  nickname: string;
  joined_at: string;
  user: User;
};

export type CurrentFamilyResponse = {
  family: FamilyPublic | null;
  members: FamilyMember[];
};

export type FamilyMembersResponse = {
  members: FamilyMember[];
};

export type CreateFamilyPayload = {
  name: string;
};

export type JoinFamilyPayload = {
  invite_code: string;
};

export type UpdateMealRolePayload = {
  meal_role: MealRole;
};
