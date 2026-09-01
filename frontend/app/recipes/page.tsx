import { RecipeListWorkspace } from "@/components/recipe-list-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function RecipesPage() {
  return (
    <WorkspaceShell
      title="菜谱"
      description="搜索菜名或食材，打开做法，也可以手动录入新的家常菜。"
      actions={[
        { href: "/recipes/import", label: "导入 Excel", tone: "secondary" },
        { href: "/recipes/manual", label: "手动录入", tone: "primary" },
        { href: "/recipes", label: "刷新列表" },
      ]}
    >
      <RecipeListWorkspace />
    </WorkspaceShell>
  );
}
