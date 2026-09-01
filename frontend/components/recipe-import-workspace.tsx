"use client";

import { useState } from "react";

import { RecipeThumb } from "@/components/recipe-thumb";
import { ApiError } from "@/lib/api";
import {
  importRecipeWorkbook,
  previewRecipeImport,
} from "@/services/recipe-import";
import type {
  RecipeImportIssue,
  RecipeImportPreview,
  RecipeImportResult,
} from "@/types/recipe-import";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function RecipeImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RecipeImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<RecipeImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePreview() {
    if (!file) {
      setErrorMessage("请先选择一个 .xlsx 文件。");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMessage("只支持 .xlsx 格式的 Excel 文件。");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("Excel 文件不能超过 100 MB。");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setPreview(null);
    setImportResult(null);
    try {
      setPreview(await previewRecipeImport(file));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "预览失败，请稍后再试。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setImportResult(null);
    setErrorMessage("");
  }

  async function handleImport() {
    if (!file || !preview || preview.errors.length) {
      return;
    }

    const includeDrafts =
      preview.recipes_importable === 0 &&
      preview.recipes_draft === preview.recipes_total;
    const confirmed = window.confirm(
      includeDrafts
        ? `确认将全部 ${preview.recipes_draft} 道草稿菜谱写入菜谱库吗？`
        : `确认将 ${preview.recipes_importable} 道菜谱写入菜谱库吗？`,
    );
    if (!confirmed) {
      return;
    }

    setIsImporting(true);
    setErrorMessage("");
    try {
      setImportResult(await importRecipeWorkbook(file, includeDrafts));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "导入失败，请稍后再试。",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="section-card-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Excel 预检</p>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">
              先看清楚，再导入
            </h2>
            <p className="section-description mt-2 max-w-2xl">
              系统会先核对菜谱编号、三张数据表的关联，以及网站支持的字段值。只有点击确认后，才会写入菜谱库。
            </p>
          </div>
          <span className="chip chip-accent shrink-0">先预览 · 再确认</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="field flex min-w-0 cursor-pointer items-center gap-3">
            <span className="shrink-0 font-semibold text-emerald-800">选择文件</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="min-w-0 flex-1 text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-800"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="button-primary shrink-0"
            disabled={!file || isLoading}
            onClick={handlePreview}
          >
            {isLoading ? "正在检查..." : "查看导入预览"}
          </button>
        </div>

        {file ? (
          <p className="mt-3 text-xs text-stone-500">
            已选择：{file.name} · {formatFileSize(file.size)}
          </p>
        ) : (
          <p className="mt-3 text-xs text-stone-500">
            支持 .xlsx，单个文件不超过 100 MB。
          </p>
        )}
      </section>

      {errorMessage ? (
        <div className="inline-message inline-message-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {preview ? (
        <PreviewResult
          preview={preview}
          importResult={importResult}
          isImporting={isImporting}
          onImport={handleImport}
        />
      ) : null}
    </div>
  );
}

function PreviewResult({
  preview,
  importResult,
  isImporting,
  onImport,
}: {
  preview: RecipeImportPreview;
  importResult: RecipeImportResult | null;
  isImporting: boolean;
  onImport: () => Promise<void>;
}) {
  const issueCount = preview.errors.length + preview.warnings.length;

  return (
    <>
      <section className="section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">检查结果</p>
            <h2 className="mt-2 break-words text-xl font-semibold text-stone-900">
              {preview.filename}
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              工作表：{preview.sheets.join("、") || "未读取到"}
            </p>
          </div>
          <span
            className={`chip shrink-0 ${preview.errors.length ? "chip-danger" : "chip-success"}`}
          >
            {preview.errors.length ? "需要处理错误" : "结构检查通过"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryMetric label="菜谱" value={preview.recipes_total} />
          <SummaryMetric label="可导入" value={preview.recipes_importable} />
          <SummaryMetric label="食材记录" value={preview.ingredient_rows} />
          <SummaryMetric label="制作步骤" value={preview.step_rows} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="chip chip-neutral">草稿 {preview.recipes_draft}</span>
          <span className={preview.errors.length ? "chip chip-danger" : "chip chip-success"}>
            错误 {preview.errors.length}
          </span>
          <span className={preview.warnings.length ? "chip chip-warning" : "chip chip-success"}>
            提醒 {preview.warnings.length}
          </span>
          {preview.can_import ? (
            <span className="chip chip-success">已满足正式导入条件</span>
          ) : (
            <span className="chip chip-warning">等待导入确认</span>
          )}
        </div>

        {canConfirmImport(preview) && !importResult ? (
          <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-emerald-100 bg-emerald-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {preview.recipes_importable === 0
                  ? `将导入全部 ${preview.recipes_draft} 道草稿菜谱`
                  : `将导入 ${preview.recipes_importable} 道菜谱`}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                导入会按 recipe_key 新增或更新，并同步替换对应的食材和步骤。
              </p>
            </div>
            <button
              type="button"
              className="button-primary shrink-0"
              disabled={isImporting}
              onClick={onImport}
            >
              {isImporting ? "正在导入..." : "确认写入菜谱库"}
            </button>
          </div>
        ) : null}

        {importResult ? <ImportSuccess result={importResult} /> : null}

        {!issueCount ? (
          <div className="inline-message inline-message-success mt-5">
            没有发现结构或字段问题，可以继续进入正式导入步骤。
          </div>
        ) : null}
      </section>

      {preview.errors.length ? (
        <IssueSection title="需要修正" issues={preview.errors} tone="error" />
      ) : null}
      {preview.warnings.length ? (
        <IssueSection title="导入前提醒" issues={preview.warnings} tone="warning" />
      ) : null}

      <section className="section-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">菜谱预览</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              {preview.recipes.length} 道菜的导入摘要
            </h2>
          </div>
          {preview.truncated ? (
            <p className="text-xs text-amber-700">文件较大，仅显示前 200 道菜。</p>
          ) : null}
        </div>

        <div className="mt-5 overflow-x-auto rounded-[14px] border border-stone-200">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-stone-50 text-xs font-semibold text-stone-500">
              <tr>
                <th className="px-3 py-3">图片</th>
                <th className="px-3 py-3">编号 / 菜名</th>
                <th className="px-3 py-3">分类</th>
                <th className="px-3 py-3">人数</th>
                <th className="px-3 py-3">时间</th>
                <th className="px-3 py-3">明细</th>
                <th className="px-3 py-3">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {preview.recipes.map((recipe) => (
                <tr key={recipe.recipe_key} className="align-middle">
                  <td className="px-3 py-3">
                    <RecipeThumb
                      src={recipe.image_url}
                      title={recipe.title}
                      category={recipe.category}
                      variant="sm"
                      className="w-16 shrink-0"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-stone-900">{recipe.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{recipe.recipe_key}</p>
                  </td>
                  <td className="px-3 py-3 text-stone-600">{recipe.category || "未填写"}</td>
                  <td className="px-3 py-3 text-stone-600">
                    {recipe.default_servings ? `${recipe.default_servings} 人` : "未填写"}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {recipe.cooking_time ? `${recipe.cooking_time} 分钟` : "未标注"}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {recipe.ingredient_count} 种食材 · {recipe.step_count} 步
                  </td>
                  <td className="px-3 py-3">
                    <span className={recipe.status === "可导入" ? "chip chip-success" : "chip chip-warning"}>
                      {recipe.status || "未填写"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-stone-50 px-4 py-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
    </div>
  );
}

function IssueSection({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: RecipeImportIssue[];
  tone: "error" | "warning";
}) {
  return (
    <section className="section-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <span className={tone === "error" ? "chip chip-danger" : "chip chip-warning"}>
          {issues.length} 条
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {issues.map((issue, index) => (
          <li
            key={`${issue.sheet}-${issue.row ?? "all"}-${issue.field ?? "general"}-${index}`}
            className="rounded-[12px] bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            <span className="font-semibold text-stone-900">{formatIssueLocation(issue)}</span>
            <span className="ml-2">{issue.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function canConfirmImport(preview: RecipeImportPreview) {
  return (
    preview.errors.length === 0 &&
    (preview.recipes_importable > 0 ||
      (preview.recipes_total > 0 && preview.recipes_draft === preview.recipes_total))
  );
}

function ImportSuccess({ result }: { result: RecipeImportResult }) {
  return (
    <div className="inline-message inline-message-success mt-5">
      已成功导入 {result.imported_count} 道菜谱：新增 {result.created_count} 道，更新 {result.updated_count} 道。
    </div>
  );
}

function formatIssueLocation(issue: RecipeImportIssue) {
  const location = issue.row ? `${issue.sheet} 第 ${issue.row} 行` : issue.sheet;
  return issue.field ? `${location} · ${issue.field}` : location;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
