"use client";

import { useEffect, useState } from "react";

type RecipeThumbProps = {
  src: string | null;
  title: string;
  category: string;
  className?: string;
  variant?: "sm" | "md" | "lg";
};

const variantClasses: Record<NonNullable<RecipeThumbProps["variant"]>, string> = {
  sm: "aspect-[4/3]",
  md: "aspect-[16/10]",
  lg: "aspect-[16/9]",
};

export function RecipeThumb({
  src,
  title,
  category,
  className,
  variant = "sm",
}: RecipeThumbProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, title]);

  const hasImage = Boolean(src) && !failed;

  return (
    <div className={`recipe-thumb ${variantClasses[variant]} ${className ?? ""}`.trim()}>
      {hasImage ? (
        <img
          src={src ?? undefined}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="recipe-thumb-fallback">
          <div className="flex items-start justify-between gap-3">
            <span className="chip chip-accent">{category}</span>
            <span className="text-xs font-medium text-emerald-700/70">FamilyFood</span>
          </div>
          <div className="mt-auto">
            <p className="max-w-[14ch] text-lg font-semibold leading-tight">{title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
