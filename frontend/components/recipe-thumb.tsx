"use client";

import { useEffect, useState } from "react";

type RecipeThumbProps = {
  src: string | null;
  title: string;
  category: string;
  className?: string;
  variant?: "sm" | "md" | "lg";
  /**
   * `contain` keeps the whole plate and dish visible. Use `cover` only when
   * a deliberate edge-to-edge crop is preferred for a specific surface.
   */
  fit?: "cover" | "contain";
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
  fit = "contain",
}: RecipeThumbProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, title]);

  const hasImage = Boolean(src) && !failed;

  return (
    <div
      className={`recipe-thumb ${variantClasses[variant]} ${className ?? ""}`.trim()}
      data-fit={fit}
    >
      {hasImage ? (
        <img
          src={src ?? undefined}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full"
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
