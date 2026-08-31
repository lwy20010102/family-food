import Link from "next/link";

import { DishOrderWorkspace } from "@/components/dish-order-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function OrdersPage() {
  return (
    <WorkspaceShell
      title="点菜"
      description="从菜谱库里选今天想吃的菜；加入家庭后可提交给家人查看并管理状态。"
      actions={[
        { href: "/recipes", label: "菜谱库" },
        { href: "/menu", label: "今日菜单" },
      ]}
    >
      <DishOrderWorkspace />
    </WorkspaceShell>
  );
}
