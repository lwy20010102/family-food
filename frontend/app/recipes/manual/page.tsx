import Link from "next/link";

import { RecipeManualWorkspace } from "@/components/recipe-manual-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function RecipeManualPage() {
  return (
    <WorkspaceShell
      title="手动录入菜谱"
      description="现在先直接填写菜谱内容，后续再把视频、文字和图片识别接回来。"
      actions={[
        { href: "/recipes", label: "返回菜谱库" },
        { href: "/notifications", label: "通知中心" },
      ]}
    >
      <RecipeManualWorkspace />
    </WorkspaceShell>
  );
}
