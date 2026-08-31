import { RecipeDetailWorkspace } from "@/components/recipe-detail-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const id = Number(recipeId);

  return (
    <WorkspaceShell
      title="菜谱详情"
      description="查看菜谱结构并直接编辑。"
      actions={[
        { href: "/recipes", label: "返回菜谱" },
        { href: "/recipes/manual", label: "录入新菜谱", tone: "primary" },
      ]}
    >
      {Number.isNaN(id) ? (
        <section className="section-card">
          <p className="text-sm text-stone-600">菜谱编号无效。</p>
        </section>
      ) : (
        <RecipeDetailWorkspace recipeId={id} />
      )}
    </WorkspaceShell>
  );
}
