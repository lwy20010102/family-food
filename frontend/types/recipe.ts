import type { User } from "@/types/auth";

export type RecipeCategory =
  | "肉类"
  | "海鲜"
  | "蔬菜"
  | "主食"
  | "汤"
  | "早餐"
  | "甜品"
  | "其他";

export type RecipeDifficulty = "简单" | "中等" | "困难";
export type RecipeIngredientType = "ingredient" | "seasoning";
export type RecipeSourceType = "manual" | "ai_text" | "ai_video";
export type RecipePreferenceFilter = "all" | "match" | "warning";

export type RecipeIngredient = {
  id: number;
  name: string;
  amount: string;
  unit: string;
  type: RecipeIngredientType;
  sort_order: number;
};

export type RecipeStep = {
  id: number;
  step_number: number;
  description: string;
  duration: string | null;
};

export type RecipeSummary = {
  id: number;
  family_id: number;
  creator_id: number;
  recipe_key: string | null;
  title: string;
  description: string;
  category: RecipeCategory;
  image_url: string | null;
  default_servings: number;
  cooking_time: number | null;
  difficulty: RecipeDifficulty;
  tips: string[];
  source_type: RecipeSourceType;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  creator: User;
  ingredient_count: number;
  step_count: number;
  is_favorite: boolean;
  preference_match: boolean;
  preference_reasons: string[];
  preference_warnings: string[];
};

export type RecipeDetail = RecipeSummary & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipesResponse = {
  recipes: RecipeSummary[];
};

export type RecipeFavoriteResponse = {
  recipe_id: number;
  is_favorite: boolean;
};

export type RecipeHistoryItem = {
  recipe: RecipeSummary;
  viewed_at: string;
};

export type RecipeHistoryResponse = {
  items: RecipeHistoryItem[];
};

export type RecipeResponse = {
  recipe: RecipeDetail;
};

export type RecipeImageUploadResponse = {
  image_url: string;
  filename: string | null;
};

export type RecipeDeleteResponse = {
  message: string;
};

export type RecipeIngredientInput = {
  name: string;
  amount: string;
  unit: string;
  type: RecipeIngredientType;
  sort_order: number;
};

export type RecipeStepInput = {
  step_number: number;
  description: string;
  duration: string | null;
};

export type RecipePayload = {
  title: string;
  description: string;
  category: RecipeCategory;
  image_url: string | null;
  default_servings: number;
  cooking_time: number | null;
  difficulty: RecipeDifficulty;
  tips: string[];
  source_type: RecipeSourceType;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
};
