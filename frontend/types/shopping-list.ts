import type { DailyMenu } from "@/types/daily-menu";

export type ShoppingListItem = {
  id: number;
  name: string;
  amount: string;
  unit: string;
  is_purchased: boolean;
};

export type ShoppingList = {
  id: number;
  family_id: number;
  menu_date: string;
  created_at: string;
  items: ShoppingListItem[];
};

export type ShoppingListTodayResponse = {
  shopping_list: ShoppingList | null;
  menu: DailyMenu | null;
};

export type ShoppingListItemUpdatePayload = {
  is_purchased: boolean;
};

export type ShoppingListItemResponse = {
  item: ShoppingListItem;
};

export type ShoppingListResetResponse = {
  shopping_list: ShoppingList | null;
};
