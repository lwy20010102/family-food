import { RecipeImportWorkspace } from "@/components/recipe-import-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function RecipeImportPage() {
  return (
    <WorkspaceShell
      title="导入菜谱"
      description="上传 Excel，先检查菜谱、食材和步骤，再决定是否进入正式导入。"
      actions={[{ href: "/recipes", label: "返回菜谱库" }]}
    >
      <RecipeImportWorkspace />
    </WorkspaceShell>
  );
}
