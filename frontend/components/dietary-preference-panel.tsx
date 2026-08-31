"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { saveDietaryPreference } from "@/services/dietary-preferences";
import type {
  DietaryPreference,
  DietaryPreferencePayload,
} from "@/types/dietary-preference";

function termsToText(terms: string[]) {
  return terms.join("、");
}

function textToTerms(value: string) {
  const terms: string[] = [];
  const seen = new Set<string>();

  for (const item of value.split(/[\n,，、]/)) {
    const term = item.trim();
    const key = term.toLocaleLowerCase();
    if (term && !seen.has(key)) {
      seen.add(key);
      terms.push(term);
    }
  }

  return terms;
}

export function DietaryPreferencePanel({
  preference,
  onSaved,
}: {
  preference: DietaryPreference | null;
  onSaved: (preference: DietaryPreference) => void;
}) {
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [avoid, setAvoid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLiked(termsToText(preference?.liked ?? []));
    setDisliked(termsToText(preference?.disliked ?? []));
    setAvoid(termsToText(preference?.avoid ?? []));
  }, [preference]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: DietaryPreferencePayload = {
      liked: textToTerms(liked),
      disliked: textToTerms(disliked),
      avoid: textToTerms(avoid),
    };

    try {
      const saved = await saveDietaryPreference(payload);
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "保存饮食偏好失败，请重试",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="preferences" className="section-card dietary-preference-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">饮食偏好</h2>
          <p className="section-description">
            用逗号、顿号或换行分隔。偏好只用于菜谱推荐、筛选和提醒，不会删除任何菜谱。
          </p>
        </div>
        <span className="chip chip-accent">规则匹配</span>
      </div>

      <form className="dietary-preference-form" onSubmit={handleSubmit}>
        <div className="dietary-preference-grid">
          <label className="dietary-preference-field">
            <span className="label">喜欢</span>
            <textarea
              className="textarea"
              value={liked}
              onChange={(event) => setLiked(event.target.value)}
              placeholder="辣、川菜、牛肉"
              disabled={saving}
            />
            <span className="dietary-preference-hint">会优先标记符合的菜谱</span>
          </label>

          <label className="dietary-preference-field">
            <span className="label">不喜欢</span>
            <textarea
              className="textarea"
              value={disliked}
              onChange={(event) => setDisliked(event.target.value)}
              placeholder="香菜、苦瓜"
              disabled={saving}
            />
            <span className="dietary-preference-hint">命中后会在菜谱上提醒你</span>
          </label>

          <label className="dietary-preference-field">
            <span className="label">忌口</span>
            <textarea
              className="textarea"
              value={avoid}
              onChange={(event) => setAvoid(event.target.value)}
              placeholder="花生、海鲜"
              disabled={saving}
            />
            <span className="dietary-preference-hint">请按自己的需要填写</span>
          </label>
        </div>

        {error ? (
          <p className="profile-message profile-message-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dietary-preference-actions">
          <p className="dietary-preference-summary">
            {textToTerms(liked).length + textToTerms(disliked).length + textToTerms(avoid).length
              ? "保存后，菜谱库会显示匹配结果。"
              : "还没有设置偏好，菜谱库会展示全部内容。"}
          </p>
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? "保存中..." : "保存饮食偏好"}
          </button>
        </div>
      </form>
    </section>
  );
}
