"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { ApiError } from "@/lib/api";
import { getMonthlyFamilyStats } from "@/services/family-stats";
import type { FamilyMonthlyStats } from "@/types/family-stats";

const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
});

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return value;
  }

  return monthFormatter.format(new Date(year, month - 1, 1));
}

export function FamilyStatisticsWorkspace() {
  const [stats, setStats] = useState<FamilyMonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void getMonthlyFamilyStats()
      .then((result) => {
        if (active) {
          setStats(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "加载家庭统计失败，请重试",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const hasActivity = Boolean(
    stats && (stats.completed_meals || stats.dishes_made || stats.total_orders),
  );

  if (loading) {
    return <StatisticsLoading />;
  }

  if (error || !stats) {
    return (
      <section className="section-card statistics-error" role="alert">
        <div>
          <h2 className="section-title">统计暂时无法加载</h2>
          <p className="section-description">{error ?? "请稍后再试。"}</p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setReloadToken((current) => current + 1)}
        >
          重新加载
        </button>
      </section>
    );
  }

  return (
    <section className="family-statistics-page">
      <section className="section-card statistics-overview-card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{formatMonth(stats.month)}吃了什么</h2>
            <p className="section-description">
              根据已完成菜品和本月点菜记录整理，数据只属于当前个人或家庭空间。
            </p>
          </div>
          <span className="chip chip-accent">本月统计</span>
        </div>

        <div className="statistics-overview-grid">
          <StatNumber label="完成的饭" value={stats.completed_meals} suffix="顿" />
          <StatNumber label="共制作" value={stats.dishes_made} suffix="道菜" />
          <StatNumber label="本月点菜" value={stats.total_orders} suffix="次" />
        </div>
      </section>

      {!hasActivity ? (
        <section className="section-card statistics-empty-state">
          <div className="statistics-empty-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2 className="section-title">这个月还没有完成记录</h2>
          <p className="section-description">
            从点菜开始，完成菜品后这里会留下家庭的饮食足迹。
          </p>
          <Link href="/orders" className="button-primary mt-5">
            去点一道菜
          </Link>
        </section>
      ) : (
        <div className="statistics-content-grid">
          <TopRecipes recipes={stats.top_recipes} />
          <TopOrderers orderers={stats.top_orderers} />
        </div>
      )}
    </section>
  );
}

function StatNumber({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="statistics-number">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{suffix}</small>
    </div>
  );
}

function TopRecipes({
  recipes,
}: {
  recipes: FamilyMonthlyStats["top_recipes"];
}) {
  const maxCount = useMemo(
    () => Math.max(...recipes.map((recipe) => recipe.count), 1),
    [recipes],
  );

  return (
    <section className="section-card statistics-list-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">最受欢迎菜</h2>
          <p className="section-description">按本月完成次数排序。</p>
        </div>
        <span className="chip chip-neutral">前 5 名</span>
      </div>

      {recipes.length ? (
        <div className="statistics-rank-list">
          {recipes.map((recipe, index) => (
            <Link
              key={recipe.recipe_id}
              href={`/recipes/${recipe.recipe_id}`}
              className="statistics-rank-row"
            >
              <span className="statistics-rank-number">{index + 1}</span>
              <RecipeThumb
                src={recipe.image_url}
                title={recipe.title}
                category={recipe.category}
                variant="sm"
                className="h-12 w-16 shrink-0 rounded-[10px]"
              />
              <span className="statistics-rank-copy">
                <strong>{recipe.title}</strong>
                <small>{recipe.category}</small>
                <span className="statistics-progress-track" aria-hidden="true">
                  <span style={{ width: `${(recipe.count / maxCount) * 100}%` }} />
                </span>
              </span>
              <span className="statistics-rank-count">{recipe.count} 次</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state mt-5">完成菜品后，这里会显示受欢迎的菜。</div>
      )}
    </section>
  );
}

function TopOrderers({
  orderers,
}: {
  orderers: FamilyMonthlyStats["top_orderers"];
}) {
  const maxCount = useMemo(
    () => Math.max(...orderers.map((orderer) => orderer.count), 1),
    [orderers],
  );

  return (
    <section className="section-card statistics-list-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">点菜最多的人</h2>
          <p className="section-description">看看谁最积极地决定今晚吃什么。</p>
        </div>
        <span className="chip chip-neutral">前 5 名</span>
      </div>

      {orderers.length ? (
        <div className="statistics-orderer-list">
          {orderers.map((orderer) => (
            <div key={orderer.user_id} className="statistics-orderer-row">
              <UserAvatar name={orderer.username} small />
              <div className="statistics-orderer-copy">
                <strong>{orderer.username}</strong>
                <span className="statistics-progress-track" aria-hidden="true">
                  <span style={{ width: `${(orderer.count / maxCount) * 100}%` }} />
                </span>
              </div>
              <span className="statistics-rank-count">{orderer.count} 次</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state mt-5">本月还没有点菜记录。</div>
      )}
    </section>
  );
}

function StatisticsLoading() {
  return (
    <section className="family-statistics-page" aria-live="polite">
      <section className="section-card statistics-loading-card">
        <div className="statistics-loading-title" />
        <div className="statistics-loading-description" />
        <div className="statistics-loading-numbers">
          {[0, 1, 2].map((item) => (
            <div key={item} />
          ))}
        </div>
      </section>
      <div className="statistics-content-grid">
        {[0, 1].map((item) => (
          <section key={item} className="section-card statistics-loading-list">
            <div />
            <div />
            <div />
            <div />
          </section>
        ))}
      </div>
    </section>
  );
}
