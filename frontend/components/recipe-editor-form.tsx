"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type {
  RecipeCategory,
  RecipeDetail,
  RecipeDifficulty,
  RecipeIngredientType,
  RecipePayload,
  RecipeSourceType,
} from "@/types/recipe";
import { uploadRecipeImage } from "@/services/recipes";

const categoryOptions: RecipeCategory[] = [
  "肉类",
  "海鲜",
  "蔬菜",
  "主食",
  "汤",
  "早餐",
  "甜品",
  "其他",
];

const difficultyOptions: RecipeDifficulty[] = ["简单", "中等", "困难"];

type IngredientRow = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  type: RecipeIngredientType;
};

type StepRow = {
  id: string;
  step_number: string;
  description: string;
  duration: string;
};

type RecipeEditorState = {
  title: string;
  description: string;
  category: RecipeCategory;
  imageUrl: string;
  defaultServings: string;
  cookingTime: string;
  difficulty: RecipeDifficulty;
  sourceType: RecipeSourceType;
  tipsText: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
};

type IngredientLike = {
  name: string;
  amount: string;
  unit: string;
  type: RecipeIngredientType;
};

type StepLike = {
  step_number: number;
  description: string;
  duration: string | null;
};

type RecipeEditorFormProps = {
  initialRecipe?: RecipeDetail | null;
  initialPayload?: RecipePayload | null;
  submitLabel: string;
  onSubmit: (payload: RecipePayload) => Promise<RecipeDetail>;
  onSuccess?: (recipe: RecipeDetail) => void;
};

function createIngredientRow(
  ingredient?: IngredientLike,
  index = 0,
): IngredientRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: ingredient?.name ?? "",
    amount: ingredient?.amount ?? "",
    unit: ingredient?.unit ?? "",
    type: ingredient?.type ?? "ingredient",
  };
}

function createStepRow(step?: StepLike, index = 0): StepRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    step_number: String(step?.step_number ?? index + 1),
    description: step?.description ?? "",
    duration: step?.duration ?? "",
  };
}

function buildEmptyState(): RecipeEditorState {
  return {
    title: "",
    description: "",
    category: "其他",
    imageUrl: "",
    defaultServings: "2",
    cookingTime: "",
    difficulty: "简单",
    sourceType: "manual",
    tipsText: "",
    ingredients: [createIngredientRow(undefined, 0)],
    steps: [createStepRow(undefined, 0)],
  };
}

function mapRecipeToState(recipe?: RecipeDetail | null): RecipeEditorState {
  return {
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    category: recipe?.category ?? "其他",
    imageUrl: recipe?.image_url ?? "",
    defaultServings: String(recipe?.default_servings ?? 2),
    cookingTime: recipe?.cooking_time ? String(recipe.cooking_time) : "",
    difficulty: recipe?.difficulty ?? "简单",
    sourceType: recipe?.source_type ?? "manual",
    tipsText: recipe?.tips?.join("\n") ?? "",
    ingredients: recipe?.ingredients?.length
      ? recipe.ingredients.map((item, index) => createIngredientRow(item, index))
      : [createIngredientRow(undefined, 0)],
    steps: recipe?.steps?.length
      ? recipe.steps.map((item, index) => createStepRow(item, index))
      : [createStepRow(undefined, 0)],
  };
}

function mapPayloadToState(payload?: RecipePayload | null): RecipeEditorState {
  return {
    title: payload?.title ?? "",
    description: payload?.description ?? "",
    category: payload?.category ?? "其他",
    imageUrl: payload?.image_url ?? "",
    defaultServings: String(payload?.default_servings ?? 2),
    cookingTime: payload?.cooking_time ? String(payload.cooking_time) : "",
    difficulty: payload?.difficulty ?? "简单",
    sourceType: payload?.source_type ?? "manual",
    tipsText: payload?.tips?.join("\n") ?? "",
    ingredients: payload?.ingredients?.length
      ? payload.ingredients.map((item, index) => createIngredientRow(item, index))
      : [createIngredientRow(undefined, 0)],
    steps: payload?.steps?.length
      ? payload.steps.map((item, index) => createStepRow(item, index))
      : [createStepRow(undefined, 0)],
  };
}

function mapInitialState(
  initialRecipe?: RecipeDetail | null,
  initialPayload?: RecipePayload | null,
): RecipeEditorState {
  if (initialRecipe) {
    return mapRecipeToState(initialRecipe);
  }

  if (initialPayload) {
    return mapPayloadToState(initialPayload);
  }

  return buildEmptyState();
}

export function RecipeEditorForm({
  initialRecipe,
  initialPayload,
  submitLabel,
  onSubmit,
  onSuccess,
}: RecipeEditorFormProps) {
  const initialState = useMemo(
    () => mapInitialState(initialRecipe, initialPayload),
    [initialPayload, initialRecipe],
  );
  const [title, setTitle] = useState(initialState.title);
  const [description, setDescription] = useState(initialState.description);
  const [category, setCategory] = useState<RecipeCategory>(initialState.category);
  const [imageUrl, setImageUrl] = useState(initialState.imageUrl);
  const [defaultServings, setDefaultServings] = useState(
    initialState.defaultServings,
  );
  const [cookingTime, setCookingTime] = useState(initialState.cookingTime);
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>(
    initialState.difficulty,
  );
  const [sourceType, setSourceType] = useState<RecipeSourceType>(
    initialState.sourceType,
  );
  const [tipsText, setTipsText] = useState(initialState.tipsText);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialState.ingredients,
  );
  const [steps, setSteps] = useState<StepRow[]>(initialState.steps);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const next = mapInitialState(initialRecipe, initialPayload);
    setTitle(next.title);
    setDescription(next.description);
    setCategory(next.category);
    setImageUrl(next.imageUrl);
    setDefaultServings(next.defaultServings);
    setCookingTime(next.cookingTime);
    setDifficulty(next.difficulty);
    setSourceType(next.sourceType);
    setTipsText(next.tipsText);
    setIngredients(next.ingredients);
    setSteps(next.steps);
  }, [initialPayload, initialRecipe]);

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      createIngredientRow(undefined, current.length),
    ]);
  }

  function addStep() {
    setSteps((current) => [...current, createStepRow(undefined, current.length)]);
  }

  function updateIngredient<K extends keyof Omit<IngredientRow, "id">>(
    id: string,
    field: K,
    value: IngredientRow[K],
  ) {
    setIngredients((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function updateStep<K extends keyof Omit<StepRow, "id">>(
    id: string,
    field: K,
    value: StepRow[K],
  ) {
    setSteps((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function removeIngredient(id: string) {
    setIngredients((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  function removeStep(id: string) {
    setSteps((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: RecipePayload = {
      title,
      description,
      category,
      image_url: imageUrl.trim() ? imageUrl.trim() : null,
      default_servings: Number(defaultServings) || 2,
      cooking_time: cookingTime.trim() ? Number(cookingTime) : null,
      difficulty,
      tips: tipsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      source_type: sourceType,
      ingredients: ingredients.map((item, index) => ({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        type: item.type,
        sort_order: index,
      })),
      steps: steps.map((item, index) => ({
        step_number: Number(item.step_number) || index + 1,
        description: item.description,
        duration: item.duration.trim() ? item.duration.trim() : null,
      })),
    };

    try {
      const recipe = await onSubmit(payload);
      setSuccess("已保存");
      onSuccess?.(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setImageUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await uploadRecipeImage(file);
      setImageUrl(response.image_url);
      setSuccess("图片已上传");
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片上传失败，请重试");
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <form className="recipe-editor-form space-y-4" onSubmit={handleSubmit}>
      <div className="recipe-editor-basics grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label">菜名</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field"
            placeholder="红烧肉"
            required
          />
        </label>

        <label className="block">
          <span className="label">分类</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as RecipeCategory)}
            className="select"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">烹饪时间（分钟）</span>
          <input
            type="number"
            min="1"
            value={cookingTime}
            onChange={(event) => setCookingTime(event.target.value)}
            className="field"
            placeholder="40"
          />
        </label>

        <label className="block">
          <span className="label">默认人数</span>
          <input
            type="number"
            min="1"
            value={defaultServings}
            onChange={(event) => setDefaultServings(event.target.value)}
            className="field"
            placeholder="2"
            required
          />
        </label>

        <label className="block">
          <span className="label">难度</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as RecipeDifficulty)}
            className="select"
          >
            {difficultyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="label">从手机相册选择图片</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="field"
            disabled={imageUploading}
          />
          <span className="mt-2 block text-xs text-stone-500">
            支持 JPG、PNG、WEBP、GIF，单张不超过 10 MB
          </span>
        </label>

        <label className="block md:col-span-2">
          <span className="label">图片地址（可选）</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="field"
            placeholder="https://..."
          />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="菜谱图片预览"
              className="mt-3 h-36 w-full rounded-xl object-cover"
            />
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="label">简介</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="textarea"
          placeholder="简单介绍这道菜"
        />
      </label>

      <label className="block">
        <span className="label">小贴士</span>
        <textarea
          value={tipsText}
          onChange={(event) => setTipsText(event.target.value)}
          className="textarea"
          placeholder="每行一条小贴士"
        />
      </label>

      <div className="recipe-form-group">
        <div className="recipe-form-group-header flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-900">食材</h3>
          <button
            type="button"
            onClick={addIngredient}
            className="button-secondary"
          >
            添加食材
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {ingredients.map((item, index) => (
            <div
              key={item.id}
              className="recipe-editor-row grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.9fr)_auto]"
            >
              <input
                type="text"
                value={item.name}
                onChange={(event) =>
                  updateIngredient(item.id, "name", event.target.value)
                }
                className="field"
                placeholder={`食材 ${index + 1}`}
                required
              />
              <input
                type="text"
                value={item.amount}
                onChange={(event) =>
                  updateIngredient(item.id, "amount", event.target.value)
                }
                className="field"
                placeholder="500"
              />
              <input
                type="text"
                value={item.unit}
                onChange={(event) =>
                  updateIngredient(item.id, "unit", event.target.value)
                }
                className="field"
                placeholder="g"
              />
              <select
                value={item.type}
                onChange={(event) =>
                  updateIngredient(
                    item.id,
                    "type",
                    event.target.value as RecipeIngredientType,
                  )
                }
                className="select"
              >
                <option value="ingredient">食材</option>
                <option value="seasoning">调料</option>
              </select>
              <button
                type="button"
                onClick={() => removeIngredient(item.id)}
                className="button-secondary"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="recipe-form-group">
        <div className="recipe-form-group-header flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-900">步骤</h3>
          <button type="button" onClick={addStep} className="button-secondary">
            添加步骤
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {steps.map((item, index) => (
            <div
              key={item.id}
              className="recipe-editor-row grid gap-2 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_auto]"
            >
              <input
                type="number"
                min="1"
                value={item.step_number}
                onChange={(event) =>
                  updateStep(item.id, "step_number", event.target.value)
                }
                className="field"
                placeholder={String(index + 1)}
                required
              />
              <input
                type="text"
                value={item.description}
                onChange={(event) =>
                  updateStep(item.id, "description", event.target.value)
                }
                className="field"
                placeholder={`步骤 ${index + 1}`}
                required
              />
              <input
                type="text"
                value={item.duration}
                onChange={(event) =>
                  updateStep(item.id, "duration", event.target.value)
                }
                className="field"
                placeholder="5分钟"
              />
              <button
                type="button"
                onClick={() => removeStep(item.id)}
                className="button-secondary"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="recipe-form-message recipe-form-message-error">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="recipe-form-message recipe-form-message-success">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || imageUploading}
        className="recipe-editor-submit button-primary w-full"
      >
        {imageUploading ? "图片上传中..." : loading ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
