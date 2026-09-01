export type RecipeImportIssue = {
  severity: "error" | "warning";
  sheet: string;
  row: number | null;
  field: string | null;
  message: string;
};

export type RecipeImportPreviewItem = {
  recipe_key: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  default_servings: number | null;
  cooking_time: number | null;
  difficulty: string;
  source_type: string;
  source_url: string | null;
  status: string;
  ingredient_count: number;
  step_count: number;
  data_note: string | null;
};

export type RecipeImportPreview = {
  filename: string;
  file_size_bytes: number;
  sheets: string[];
  recipes_total: number;
  recipes_importable: number;
  recipes_draft: number;
  ingredient_rows: number;
  step_rows: number;
  recipes: RecipeImportPreviewItem[];
  errors: RecipeImportIssue[];
  warnings: RecipeImportIssue[];
  can_import: boolean;
  truncated: boolean;
};

export type RecipeImportResultItem = {
  recipe_key: string;
  title: string;
  action: "created" | "updated";
  ingredient_count: number;
  step_count: number;
};

export type RecipeImportResult = {
  filename: string;
  imported_count: number;
  created_count: number;
  updated_count: number;
  items: RecipeImportResultItem[];
};
