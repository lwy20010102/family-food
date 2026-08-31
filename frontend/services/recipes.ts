import { apiRequest } from "@/lib/api";
import type {
  RecipeDeleteResponse,
  RecipeFavoriteResponse,
  RecipeHistoryResponse,
  RecipePayload,
  RecipeResponse,
  RecipePreferenceFilter,
  RecipesResponse,
} from "@/types/recipe";

function buildRecipeQuery(
  search?: string,
  category?: string | null,
  preference?: RecipePreferenceFilter,
) {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set("q", search.trim());
  }

  if (category) {
    params.set("category", category);
  }

  if (preference && preference !== "all") {
    params.set("preference", preference);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getRecipes(
  search?: string,
  category?: string | null,
  preference: RecipePreferenceFilter = "all",
) {
  const response = await apiRequest<RecipesResponse>(
    `/api/v1/recipes${buildRecipeQuery(search, category, preference)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.recipes;
}

export async function getFavoriteRecipes() {
  const response = await apiRequest<RecipesResponse>(
    "/api/v1/recipes/favorites",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.recipes;
}

export async function getRecipeHistory() {
  const response = await apiRequest<RecipeHistoryResponse>(
    "/api/v1/recipes/history",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.items;
}

export async function getRecipe(recipeId: number) {
  const response = await apiRequest<RecipeResponse>(
    `/api/v1/recipes/${recipeId}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.recipe;
}

export async function setRecipeFavorite(recipeId: number, isFavorite: boolean) {
  const response = await apiRequest<RecipeFavoriteResponse>(
    `/api/v1/recipes/${recipeId}/favorite`,
    {
      method: isFavorite ? "PUT" : "DELETE",
    },
  );

  return response;
}

export async function createRecipe(payload: RecipePayload) {
  const response = await apiRequest<RecipeResponse>("/api/v1/recipes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.recipe;
}

export async function updateRecipe(recipeId: number, payload: RecipePayload) {
  const response = await apiRequest<RecipeResponse>(
    `/api/v1/recipes/${recipeId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return response.recipe;
}

export async function deleteRecipe(recipeId: number) {
  const response = await apiRequest<RecipeDeleteResponse>(
    `/api/v1/recipes/${recipeId}`,
    {
      method: "DELETE",
    },
  );

  return response.message;
}
