import Link from "next/link";

import { NotificationWorkspace } from "@/components/notification-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function NotificationsPage() {
  return (
    <WorkspaceShell
      title="通知中心"
      description="查看点菜通知并标记已读；加入家庭后会同步家人的消息。"
      actions={[
        { href: "/orders", label: "点菜" },
        { href: "/menu", label: "今日菜单" },
      ]}
    >
      <NotificationWorkspace />
    </WorkspaceShell>
  );
}
