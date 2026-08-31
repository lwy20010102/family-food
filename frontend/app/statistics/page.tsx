import { FamilyStatisticsWorkspace } from "@/components/family-statistics-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function StatisticsPage() {
  return (
    <WorkspaceShell
      title="家庭统计"
      description="回顾这个月的饮食记录，看看哪些菜最受欢迎，谁最常参与点菜。"
      actions={[
        { href: "/orders", label: "去点菜", tone: "primary" },
        { href: "/menu", label: "今日菜单" },
      ]}
    >
      <FamilyStatisticsWorkspace />
    </WorkspaceShell>
  );
}
