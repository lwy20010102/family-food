"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BookmarkIcon, SearchIcon } from "@/components/icons";
import { RecipeThumb } from "@/components/recipe-thumb";
import { ApiError } from "@/lib/api";
import { createRecipe, getRecipes, setRecipeFavorite } from "@/services/recipes";
import type {
  RecipeCategory,
  RecipePreferenceFilter,
  RecipeSummary,
} from "@/types/recipe";
import { RecipeEditorForm } from "@/components/recipe-editor-form";

const categoryOptions: Array<RecipeCategory | "全部"> = [
  "全部",
  "肉类",
  "海鲜",
  "蔬菜",
  "主食",
  "汤",
  "早餐",
  "甜品",
  "其他",
];

export function RecipeListWorkspace() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<RecipeCategory | "全部">("全部");
  const [preferenceFilter, setPreferenceFilter] =
    useState<RecipePreferenceFilter>("all");
  const [reloadToken, setReloadToken] = useState(0);
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      if (active) {
        setLoading(true);
        setError(null);
      }

      void (async () => {
        try {
          const items = await getRecipes(
            search,
            category === "全部" ? null : category,
            preferenceFilter,
          );
          if (active) {
            setRecipes(items);
          }
        } catch (err) {
          if (active) {
            setError(
              err instanceof ApiError ? err.message : "加载菜谱失败，请重试",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, category, preferenceFilter, reloadToken]);

  const recipeCount = useMemo(() => recipes.length, [recipes]);

  async function handleToggleFavorite(
    event: React.MouseEvent<HTMLButtonElement>,
    recipe: RecipeSummary,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setFavoriteBusyId(recipe.id);
    setError(null);

    try {
      const result = await setRecipeFavorite(recipe.id, !recipe.is_favorite);
      setRecipes((current) =>
        current.map((item) =>
          item.id === result.recipe_id
            ? { ...item, is_favorite: result.is_favorite }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "更新收藏状态失败，请重试",
      );
    } finally {
      setFavoriteBusyId(null);
    }
  }

  return (
    <section className="recipe-list-layout grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="section-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">全部菜谱</h2>
            <p className="section-description">搜索家常菜、查看做法，选好后可以直接加入今日点菜。</p>
          </div>
          <div className="chip chip-neutral">{recipeCount} 道菜</div>
        </div>

        {error ? (
          <div className="recipe-error mt-4" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => setReloadToken((current) => current + 1)}
            >
              重试
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="label">搜索菜名或食材</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field pl-11"
                placeholder="搜索菜名、食材"
              />
            </div>
          </label>

          <div className="recipe-category-scroll">
            {categoryOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`recipe-category-pill ${
                  category === item
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-white hover:text-emerald-800"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="recipe-preference-filters" aria-label="饮食偏好筛选">
            <span className="recipe-preference-filter-label">偏好筛选</span>
            <div className="recipe-preference-filter-options">
              {(
                [
                  ["all", "全部菜谱"],
                  ["match", "符合偏好"],
                  ["warning", "需要留意"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreferenceFilter(value)}
                  className="recipe-preference-filter"
                  data-active={preferenceFilter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <RecipeGridSkeleton />
          ) : recipes.length === 0 ? (
            <div className="recipe-empty-state">
              <p className="font-medium text-stone-800">
                {search || category !== "全部" || preferenceFilter !== "all"
                  ? "没有找到匹配的菜谱"
                  : "菜谱库还没有内容"}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                {search || category !== "全部" || preferenceFilter !== "all"
                  ? preferenceFilter === "match"
                    ? "可以先清空偏好筛选，查看全部菜谱。"
                    : preferenceFilter === "warning"
                      ? "当前没有需要留意的菜谱。"
                      : "换个关键词或分类试试。"
                  : "先录入一道家常菜，之后点菜会更方便。"}
              </p>
              {!search && category === "全部" && preferenceFilter === "all" ? (
                <Link href="/recipes/manual" className="button-primary button-sm mt-4">
                  录入第一道菜
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="recipe-library-grid">
              {recipes.map((recipe) => (
                <article
                  key={recipe.id}
                  className="recipe-library-card group"
                >
                  <button
                    type="button"
                    className={`recipe-favorite-button ${recipe.is_favorite ? "is-favorite" : ""}`}
                    onClick={(event) => void handleToggleFavorite(event, recipe)}
                    disabled={favoriteBusyId === recipe.id}
                    aria-pressed={recipe.is_favorite}
                    aria-label={recipe.is_favorite ? `取消收藏${recipe.title}` : `收藏${recipe.title}`}
                    title={recipe.is_favorite ? "取消收藏" : "收藏菜谱"}
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    <span>{recipe.is_favorite ? "已收藏" : "收藏"}</span>
                  </button>

                  <Link href={`/recipes/${recipe.id}`} className="block">
                    <RecipeThumb
                      src={recipe.image_url}
                      title={recipe.title}
                      category={recipe.category}
                      className="aspect-[16/10]"
                    />

                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-stone-900">
                            {recipe.title}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {recipe.cooking_time ? `${recipe.cooking_time} 分钟` : "时长未填"}
                            <span className="mx-1 text-stone-300">·</span>
                            {recipe.difficulty}
                          </p>
                        </div>
                        <span className="chip chip-accent shrink-0">{recipe.category}</span>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-stone-500">
                        {recipe.ingredient_count} 种食材 · {recipe.step_count} 步
                      </p>

                      {recipe.preference_match ? (
                        <div className="recipe-preference-note recipe-preference-note-match">
                          <span>符合你的饮食偏好</span>
                          {recipe.preference_reasons?.length ? (
                            <span>{recipe.preference_reasons.join("、")}</span>
                          ) : null}
                        </div>
                      ) : null}

                      {recipe.preference_warnings?.length ? (
                        <div className="recipe-preference-note recipe-preference-note-warning">
                          {recipe.preference_warnings.map((warning) => (
                            <span key={warning}>{warning}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-700">新增菜谱</p>
            <h3 className="mt-1 text-lg font-semibold text-stone-900">手动录入</h3>
          </div>
          <Link href="/family" className="button-secondary">
            家庭空间
          </Link>
        </div>

        <div className="mt-4">
          <RecipeEditorForm
            submitLabel="保存并查看"
            onSubmit={createRecipe}
            onSuccess={(recipe) => {
              router.push(`/recipes/${recipe.id}`);
            }}
          />
        </div>
      </div>
    </section>
  );
}

function RecipeGridSkeleton() {
  return (
    <div className="recipe-library-grid" aria-label="正在加载菜谱" aria-live="polite">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="recipe-library-skeleton">
          <div className="recipe-skeleton-image" />
          <div className="recipe-skeleton-line recipe-skeleton-line-title" />
          <div className="recipe-skeleton-line" />
          <div className="recipe-skeleton-line recipe-skeleton-line-short" />
        </div>
      ))}
    </div>
  );
}
