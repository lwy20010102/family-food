import type { User } from "@/types/auth";

export type DishOrderStatus =
  | "pending"
  | "viewed"
  | "confirmed"
  | "rejected"
  | "completed";

export type DishOrderRecipe = {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
  default_servings: number;
  cooking_time: number | null;
  difficulty: string;
};

export type DishOrder = {
  id: number;
  family_id: number;
  user_id: number;
  recipe_id: number;
  order_date: string;
  status: DishOrderStatus;
  created_at: string;
  user: User;
  recipe: DishOrderRecipe;
};

export type DishOrdersResponse = {
  orders: DishOrder[];
};

export type DishOrderCreatePayload = {
  recipe_ids: number[];
};

export type DishOrderStatusUpdatePayload = {
  status: DishOrderStatus;
};

export type DishOrderResponse = {
  order: DishOrder;
};
