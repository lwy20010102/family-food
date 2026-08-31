"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeftIcon,
  BookmarkIcon,
  MinusIcon,
  PlusIcon,
  TimerIcon,
  RotateCcwIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "@/components/icons";
import { RecipeThumb } from "@/components/recipe-thumb";
import { ApiError } from "@/lib/api";
import { createDishOrders } from "@/services/dish-orders";
import {
  deleteRecipe,
  getRecipe,
  setRecipeFavorite,
  updateRecipe,
} from "@/services/recipes";
import type { RecipeDetail, RecipePayload } from "@/types/recipe";
import { RecipeEditorForm } from "@/components/recipe-editor-form";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type RecipeDetailWorkspaceProps = {
  recipeId: number;
};

type TimerState = {
  stepId: number;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
};

function parseExactAmount(amount: string) {
  const normalized = amount.trim().replaceAll(",", "");
  if (!normalized) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { value: Number(normalized), suffix: "" };
  }

  const amountWithUnit = normalized.match(
    /^(\d+(?:\.\d+)?)\s*([a-zA-Z\u3400-\u9fff]+)$/,
  );
  if (amountWithUnit) {
    return {
      value: Number(amountWithUnit[1]),
      suffix: amountWithUnit[2],
    };
  }

  const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction && Number(fraction[2]) !== 0) {
    return {
      value: Number(fraction[1]) / Number(fraction[2]),
      suffix: "",
    };
  }

  return null;
}

function formatQuantity(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function formatIngredientAmount(
  amount: string,
  unit: string,
  servings: number,
  defaultServings: number,
) {
  const exactAmount = parseExactAmount(amount);
  if (exactAmount === null || defaultServings < 1) {
    return `${amount}${unit}`;
  }

  return `${formatQuantity((exactAmount.value * servings) / defaultServings)}${unit || exactAmount.suffix}`;
}

function parseDurationSeconds(text: string | null | undefined) {
  if (!text) {
    return null;
  }

  const matches = Array.from(
    text.matchAll(/(\d+(?:\.\d+)?)\s*(小时|时|分钟|分|秒|h|m|s)/gi),
  );
  if (!matches.length) {
    return null;
  }

  const seconds = matches.reduce((total, match) => {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "小时" || unit === "时" || unit === "h") {
      return total + value * 60 * 60;
    }
    if (unit === "分钟" || unit === "分" || unit === "m") {
      return total + value * 60;
    }
    return total + value;
  }, 0);

  return seconds > 0 ? Math.round(seconds) : null;
}

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const minutePart = String(minutes).padStart(2, "0");
  const secondPart = String(remainingSeconds).padStart(2, "0");
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${minutePart}:${secondPart}`
    : `${minutePart}:${secondPart}`;
}

export function RecipeDetailWorkspace({ recipeId }: RecipeDetailWorkspaceProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingToOrder, setAddingToOrder] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [servings, setServings] = useState(2);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [timerNotice, setTimerNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await getRecipe(recipeId);
        if (active) {
          setRecipe(data);
          setServings(data.default_servings);
          setTimer(null);
          setTimerNotice(null);
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

    return () => {
      active = false;
    };
  }, [recipeId, reloadToken]);

  useEffect(() => {
    if (!timer?.running) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (!current || !current.running) {
          return current;
        }

        if (current.remainingSeconds <= 1) {
          return {
            ...current,
            remainingSeconds: 0,
            running: false,
          };
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer?.running]);

  useEffect(() => {
    if (timer?.remainingSeconds === 0 && !timer.running) {
      const step = recipe?.steps.find((item) => item.id === timer.stepId);
      setTimerNotice(`${step?.step_number ? `步骤 ${step.step_number} ` : ""}计时结束，可以继续下一步了。`);
    }
  }, [recipe, timer]);

  async function handleUpdate(payload: RecipePayload) {
    const next = await updateRecipe(recipeId, payload);
    setRecipe(next);
    setServings(next.default_servings);
    setTimer(null);
    setTimerNotice(null);
    return next;
  }

  function startTimer(stepId: number, seconds: number) {
    setTimer({
      stepId,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      running: true,
    });
    setTimerNotice(null);
  }

  function pauseTimer() {
    setTimer((current) => (current ? { ...current, running: false } : current));
  }

  function continueTimer() {
    setTimer((current) =>
      current && current.remainingSeconds > 0
        ? { ...current, running: true }
        : current,
    );
    setTimerNotice(null);
  }

  function resetTimer() {
    setTimer((current) =>
      current
        ? { ...current, remainingSeconds: current.totalSeconds, running: false }
        : current,
    );
    setTimerNotice(null);
  }

  function endTimer() {
    setTimer(null);
    setTimerNotice("计时已结束，可以继续下一步了。");
  }

  async function handleDelete() {
    const confirmed = window.confirm("确定删除这道菜谱吗？");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteRecipe(recipeId);
      router.push("/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddToOrder() {
    if (!recipe) {
      return;
    }

    setAddingToOrder(true);
    setError(null);
    setMessage(null);

    try {
      await createDishOrders({ recipe_ids: [recipe.id] });
      setMessage("已加入今天的点菜单");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "加入点菜单失败，请重试");
    } finally {
      setAddingToOrder(false);
    }
  }

  async function handleToggleFavorite() {
    if (!recipe || favoriteBusy) {
      return;
    }

    setFavoriteBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await setRecipeFavorite(recipe.id, !recipe.is_favorite);
      setRecipe((current) =>
        current
          ? { ...current, is_favorite: result.is_favorite }
          : current,
      );
      setMessage(result.is_favorite ? "已收藏这道菜" : "已取消收藏");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "更新收藏状态失败，请重试",
      );
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="section-card">
        <p className="text-sm text-stone-500">正在加载菜谱...</p>
      </section>
    );
  }

  if (!recipe) {
    return (
      <section className="section-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">菜谱详情</h2>
            <p className="section-description">{error ?? "菜谱不存在"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setReloadToken((current) => current + 1)}
            >
              重试
            </button>
            <Link href="/recipes" className="button-secondary">
              返回列表
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="recipe-detail-layout grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="section-card recipe-detail-overview overflow-hidden">
        <RecipeThumb
          src={recipe.image_url}
          title={recipe.title}
          category={recipe.category}
          variant="lg"
          className="aspect-[16/11]"
        />

        <div className="mt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <span className="chip chip-accent">{recipe.category}</span>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
                {recipe.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                {recipe.description || "暂无简介"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleToggleFavorite()}
                disabled={favoriteBusy}
                className={recipe.is_favorite ? "button-primary" : "button-secondary"}
                aria-pressed={recipe.is_favorite}
              >
                <BookmarkIcon className="mr-2 h-4 w-4" />
                {favoriteBusy
                  ? "更新中..."
                  : recipe.is_favorite
                    ? "已收藏"
                    : "收藏菜谱"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="button-danger"
              >
                {deleting ? "删除中..." : "删除菜谱"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-neutral">创建者 · {recipe.creator.username}</span>
            <span className="recipe-meta-item">
              {recipe.cooking_time ? `${recipe.cooking_time} 分钟` : "时长未填"}
            </span>
            <span className="recipe-meta-item">难度 · {recipe.difficulty}</span>
            <span className="recipe-meta-item">默认 {recipe.default_servings} 人份</span>
            <span className="recipe-meta-item">
              更新于 {dateFormatter.format(new Date(recipe.updated_at))}
            </span>
          </div>

          {recipe.preference_match ? (
            <div className="recipe-preference-detail-note recipe-preference-note-match">
              <strong>符合你的饮食偏好</strong>
              {recipe.preference_reasons?.length ? (
                <span>{recipe.preference_reasons.join("、")}</span>
              ) : null}
            </div>
          ) : null}

          {recipe.preference_warnings?.length ? (
            <div className="recipe-preference-detail-note recipe-preference-note-warning">
              <strong>饮食偏好提醒</strong>
              {recipe.preference_warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          ) : null}

          <div className="recipe-serving-panel">
            <div>
              <p className="recipe-serving-label">按人数准备</p>
              <p className="recipe-serving-description">
                明确数字会按比例换算，“适量”等文字保持原样。
              </p>
            </div>
            <div className="recipe-serving-control" aria-label="调整制作人数">
              <button
                type="button"
                className="recipe-serving-button"
                onClick={() => setServings((current) => Math.max(1, current - 1))}
                disabled={servings <= 1}
                aria-label="减少人数"
                title="减少人数"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <strong aria-live="polite">{servings}</strong>
              <span>人份</span>
              <button
                type="button"
                className="recipe-serving-button"
                onClick={() => setServings((current) => Math.min(20, current + 1))}
                disabled={servings >= 20}
                aria-label="增加人数"
                title="增加人数"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? (
            <p
              className="mt-4 inline-message inline-message-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="recipe-detail-content space-y-4">
        <section className="section-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="section-title">食材与做法</h3>
              <p className="section-description">按准备顺序查看食材和制作步骤。</p>
            </div>
          </div>

          <div className="mt-4 space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="recipe-detail-section-title">食材</p>
                <span className="chip chip-accent">按 {servings} 人份</span>
              </div>
              <div className="mt-3 space-y-2">
                {recipe.ingredients.map((item) => (
                  <div
                    key={item.id}
                    className="recipe-ingredient-row"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.type === "seasoning" ? "调料" : "食材"}
                      </p>
                    </div>
                    <span className="chip chip-neutral">
                      {formatIngredientAmount(
                        item.amount,
                        item.unit,
                        servings,
                        recipe.default_servings,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="recipe-detail-section-title">制作步骤</p>
              <div className="mt-3 space-y-2">
                {recipe.steps.map((item) => {
                  const timerSeconds = parseDurationSeconds(item.duration) ?? parseDurationSeconds(item.description);
                  const activeTimer = timer?.stepId === item.id ? timer : null;

                  return (
                    <div key={item.id} className="recipe-step-row">
                      <span className="recipe-step-number">{item.step_number}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-stone-800">{item.description}</p>
                        <div className="recipe-step-meta">
                          {item.duration ? (
                            <p className="text-xs text-stone-500">{item.duration}</p>
                          ) : null}
                          {timerSeconds ? (
                            <button
                              type="button"
                              className="recipe-step-timer-button"
                              onClick={() => startTimer(item.id, timerSeconds)}
                              disabled={Boolean(timer?.running && timer.stepId !== item.id)}
                            >
                              <TimerIcon className="mr-1.5 h-3.5 w-3.5" />
                              {activeTimer ? "重新计时" : "开始计时"}
                            </button>
                          ) : null}
                        </div>

                        {activeTimer ? (
                          <div className="recipe-step-timer-panel">
                            <div>
                              <p className="recipe-step-timer-caption">步骤 {item.step_number} 计时</p>
                              <strong className="recipe-step-timer-display">
                                {formatTimer(activeTimer.remainingSeconds)}
                              </strong>
                            </div>
                            <div className="recipe-step-timer-actions">
                              {activeTimer.running ? (
                                <button type="button" className="button-secondary button-sm" onClick={pauseTimer}>
                                  <PauseIcon className="mr-1.5 h-3.5 w-3.5" />暂停
                                </button>
                              ) : activeTimer.remainingSeconds > 0 ? (
                                <button type="button" className="button-primary button-sm" onClick={continueTimer}>
                                  <PlayIcon className="mr-1.5 h-3.5 w-3.5" />继续
                                </button>
                              ) : null}
                              <button type="button" className="button-secondary button-sm" onClick={resetTimer}>
                                <RotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />重置
                              </button>
                              <button type="button" className="button-ghost button-sm" onClick={endTimer}>
                                <SquareIcon className="mr-1.5 h-3.5 w-3.5" />结束
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {timerNotice ? (
                <p className="recipe-timer-notice" role="status">{timerNotice}</p>
              ) : null}
            </div>

            {recipe.tips.length ? (
              <div>
                <p className="recipe-detail-section-title">小贴士</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recipe.tips.map((tip) => (
                    <span key={tip} className="chip chip-accent">
                      {tip}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="section-card recipe-detail-editor">
          <div>
            <h3 className="section-title">编辑菜谱</h3>
            <p className="section-description">直接修改后保存，列表会保持同步。</p>
          </div>

          <div className="mt-4">
            <RecipeEditorForm
              initialRecipe={recipe}
              submitLabel="保存修改"
              onSubmit={handleUpdate}
              onSuccess={(next) => setRecipe(next)}
            />
          </div>
        </section>
      </div>

      <div className="recipe-detail-action-bar">
        <Link href="/recipes" className="button-secondary">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          返回列表
        </Link>
        <div className="recipe-detail-action-buttons flex flex-wrap gap-2">
          <Link href="/orders" className="button-secondary">
            查看点菜单
          </Link>
          <button
            type="button"
            onClick={handleAddToOrder}
            disabled={addingToOrder}
            className="button-primary"
          >
            {addingToOrder ? "加入中..." : "加入点菜单"}
          </button>
        </div>
        {message ? <p className="recipe-action-message" role="status">{message}</p> : null}
      </div>
    </section>
  );
}
