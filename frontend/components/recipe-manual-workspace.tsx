"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { createRecipe } from "@/services/recipes";
import { RecipeEditorForm } from "@/components/recipe-editor-form";

export function RecipeManualWorkspace() {
  const router = useRouter();

  return (
    <section className="recipe-manual-layout grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">手动录入</h2>
            <p className="section-description">
              识别功能已暂停，现在直接填写菜谱信息保存到你的菜谱库；加入家庭后会自动共享。
            </p>
          </div>
          <Link
            href="/recipes"
            className="button-secondary"
          >
            返回菜谱库
          </Link>
        </div>

        <div className="recipe-manual-note mt-4">
          这一步不再依赖解析结果。把菜名、食材、步骤和小贴士填完整，就能直接保存。
        </div>

        <div className="recipe-manual-helper-grid mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="recipe-manual-helper">
            <p className="recipe-manual-helper-label">保存后</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              会直接进入菜谱详情页，继续修改也在同一套表单里完成。
            </p>
          </div>
          <div className="recipe-manual-helper">
            <p className="recipe-manual-helper-label">后续阶段</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              等你给我视频、文字或图片时，再把识别能力接回来。
            </p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div>
          <h2 className="section-title">菜谱表单</h2>
          <p className="section-description">
            现在只做手动录入，填完即可保存到你的菜谱库。
          </p>
        </div>

        <div className="mt-4">
          <RecipeEditorForm
            submitLabel="保存并查看"
            onSubmit={createRecipe}
            onSuccess={(recipe) => {
              router.push(`/recipes/${recipe.id}`);
              router.refresh();
            }}
          />
        </div>
      </div>
    </section>
  );
}
