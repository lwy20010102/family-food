import { WeeklyMenuWorkspace } from "@/components/weekly-menu-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function WeeklyMenuPage() {
  return (
    <WorkspaceShell
      title="本周吃什么"
      description="提前安排一周三餐，到了每天照着计划做，也可以随时调整。"
      actions={[
        { href: "/recipes", label: "挑选菜谱" },
        { href: "/menu", label: "今日菜单", tone: "primary" },
      ]}
    >
      <WeeklyMenuWorkspace />
    </WorkspaceShell>
  );
}
