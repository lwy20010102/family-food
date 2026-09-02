import type { User } from "@/types/auth";
import type { DishOrder } from "@/types/dish-order";

export type DailyMenuStatus = "draft" | "confirmed";

export type DailyMenuItemStatus =
  | "planned"
  | "cooking"
  | "served"
  | "cancelled";

export type DailyMenuFeedbackPreference = "want" | "avoid";
export type DailyMenuFeedbackChoice = DailyMenuFeedbackPreference | "none";

export type DailyMenuItem = {
  id: number;
  daily_menu_id: number;
  recipe_id: number;
  status: DailyMenuItemStatus;
  sort_order: number;
  recipe: DishOrder["recipe"];
};

export type DailyMenu = {
  id: number;
  family_id: number;
  menu_date: string;
  status: DailyMenuStatus;
  servings: number;
  meal_time: string;
  confirmed_by_id: number | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  confirmed_by: User | null;
  items: DailyMenuItem[];
};

export type DailyMenuTodayResponse = {
  menu: DailyMenu | null;
  orders: DishOrder[];
  feedbacks: DailyMenuFeedback[];
  menu_views: DailyMenuView[];
  menu_versions: DailyMenuVersion[];
};

export type DailyMenuFeedback = {
  id: number;
  family_id: number;
  user_id: number;
  recipe_id: number;
  feedback_date: string;
  preference: DailyMenuFeedbackPreference;
  created_at: string;
  updated_at: string;
  user: User;
};

export type DailyMenuConfirmPayload = {
  recipe_ids: number[];
  servings: number;
  meal_time: string;
};

export type DailyMenuResponse = {
  menu: DailyMenu;
};

export type DailyMenuItemStatusUpdatePayload = {
  status: DailyMenuItemStatus;
};

export type DailyMenuItemResponse = {
  item: DailyMenuItem;
};

export type DailyMenuFeedbackResponse = {
  feedback: DailyMenuFeedback | null;
};

export type DailyMenuView = {
  id: number;
  daily_menu_id: number;
  family_id: number;
  user_id: number;
  viewed_at: string;
  user: User;
};

export type DailyMenuViewResponse = {
  view: DailyMenuView | null;
};

export type DailyMenuVersion = {
  id: number;
  daily_menu_id: number;
  family_id: number;
  menu_date: string;
  version_number: number;
  servings: number;
  meal_time: string;
  recipe_ids: number[];
  recipe_titles: string[];
  confirmed_by_id: number | null;
  confirmed_at: string | null;
  created_at: string;
  confirmed_by: User | null;
};
