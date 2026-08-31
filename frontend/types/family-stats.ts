export type FamilyStatsRecipe = {
  recipe_id: number;
  title: string;
  category: string;
  image_url: string | null;
  count: number;
};

export type FamilyStatsOrderer = {
  user_id: number;
  username: string;
  count: number;
};

export type FamilyMonthlyStats = {
  month: string;
  completed_meals: number;
  dishes_made: number;
  total_orders: number;
  top_recipes: FamilyStatsRecipe[];
  top_orderers: FamilyStatsOrderer[];
};

export type FamilyMonthlyStatsResponse = {
  stats: FamilyMonthlyStats;
};
