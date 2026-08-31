export type WeeklyMenuMealType = "breakfast" | "lunch" | "dinner";

export type WeeklyMenuRecipe = {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
  default_servings: number;
  cooking_time: number | null;
  difficulty: string;
};

export type WeeklyMenuItem = {
  id: number;
  family_id: number;
  menu_date: string;
  meal_type: WeeklyMenuMealType;
  recipe_id: number;
  servings: number;
  created_at: string;
  updated_at: string;
  recipe: WeeklyMenuRecipe;
};

export type WeeklyMenuDay = {
  menu_date: string;
  items: WeeklyMenuItem[];
};

export type WeeklyMenuWeek = {
  week_start: string;
  week_end: string;
  days: WeeklyMenuDay[];
};

export type WeeklyMenuItemCreatePayload = {
  menu_date: string;
  meal_type: WeeklyMenuMealType;
  recipe_id: number;
  servings: number;
};

export type WeeklyMenuItemServingsPayload = {
  servings: number;
};

export type WeeklyMenuItemResponse = {
  item: WeeklyMenuItem;
};
