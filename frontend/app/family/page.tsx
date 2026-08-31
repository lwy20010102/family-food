import { FamilyWorkspace } from "@/components/family-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function FamilyPage() {
  return (
    <WorkspaceShell
      title="我的"
      description="管理个人空间、家庭成员和共享邀请码。"
      actions={[
        { href: "/recipes", label: "菜谱库" },
        { href: "/orders", label: "点菜" },
      ]}
    >
      <FamilyWorkspace />
    </WorkspaceShell>
  );
}
