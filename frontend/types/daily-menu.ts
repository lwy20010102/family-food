import type { User } from "@/types/auth";
import type { DishOrder } from "@/types/dish-order";

export type DailyMenuStatus = "draft" | "confirmed";

export type DailyMenuItemStatus =
  | "planned"
  | "cooking"
  | "served"
  | "cancelled";

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
};

export type DailyMenuConfirmPayload = {
  recipe_ids: number[];
  servings: number;
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
