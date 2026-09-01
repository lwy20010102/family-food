import { apiRequest } from "@/lib/api";
import type {
  RecipeImportPreview,
  RecipeImportResult,
} from "@/types/recipe-import";

export async function previewRecipeImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<RecipeImportPreview>("/api/v1/recipes/import/preview", {
    method: "POST",
    body: formData,
  });
}

export async function importRecipeWorkbook(file: File, includeDrafts: boolean) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("include_drafts", String(includeDrafts));

  return apiRequest<RecipeImportResult>("/api/v1/recipes/import", {
    method: "POST",
    body: formData,
  });
}
