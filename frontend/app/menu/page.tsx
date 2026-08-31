import Link from "next/link";

import { DailyMenuWorkspace } from "@/components/daily-menu-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function MenuPage() {
  return (
    <WorkspaceShell
      title="今日菜单"
      description="查看今天的点菜，确认最终菜单，自动生成采购清单，设置人数和菜品状态。"
      actions={[
        { href: "/orders", label: "点菜" },
        { href: "/menu#shopping-list", label: "采购清单", tone: "primary" },
      ]}
    >
      <DailyMenuWorkspace />
    </WorkspaceShell>
  );
}
