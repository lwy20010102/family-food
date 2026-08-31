import type { ReactNode } from "react";

import { BrandMark } from "@/components/icons";

type AuthShellProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  footer,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen px-4 py-6 text-stone-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[480px] flex-col justify-center">
        <div className="surface-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="workspace-brand-mark text-emerald-700">
              <BrandMark className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-emerald-950">
                FamilyFood
              </p>
              <p className="mt-1 text-xs text-stone-500">家庭点菜平台</p>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          </div>

          <div className="mt-6">{children}</div>

          {footer ? (
            <div className="mt-6 border-t border-stone-200 pt-4">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
