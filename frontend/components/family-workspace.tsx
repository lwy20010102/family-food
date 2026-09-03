"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  ArrowRightIcon,
  BookmarkIcon,
  CopyIcon,
  FamilyIcon,
  HistoryIcon,
  MenuIcon,
  SettingsIcon,
  ShareIcon,
} from "@/components/icons";
import { DietaryPreferencePanel } from "@/components/dietary-preference-panel";
import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { ApiError } from "@/lib/api";
import { getCurrentUser, logoutUser } from "@/services/auth";
import {
  createFamily,
  getCurrentFamily,
  joinFamily,
  updateFamilyMemberMealRole,
  updateMyMealRole,
} from "@/services/family";
import { getFavoriteRecipes, getRecipeHistory, setRecipeFavorite } from "@/services/recipes";
import { getDietaryPreference } from "@/services/dietary-preferences";
import type { User } from "@/types/auth";
import type { DietaryPreference } from "@/types/dietary-preference";
import type { FamilyMember, FamilyPublic, MealRole } from "@/types/family";
import type { RecipeHistoryItem, RecipeSummary } from "@/types/recipe";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const historyDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
});

const historyTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "numeric",
  minute: "2-digit",
});

const mealRoleLabels: Record<MealRole, string> = {
  diner: "干饭人",
  cook: "做饭人",
};

const mealRoleDescriptions: Record<MealRole, string> = {
  diner: "负责选想吃的菜、提交点菜",
  cook: "优先查看今天要做的菜和采购清单",
};

function getHistoryDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getHistoryDayLabel(value: string) {
  const viewedAt = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getHistoryDateKey(value) === getHistoryDateKey(today.toISOString())) {
    return "今天";
  }

  if (
    getHistoryDateKey(value) === getHistoryDateKey(yesterday.toISOString())
  ) {
    return "昨天";
  }

  return historyDateFormatter.format(viewedAt);
}

function groupHistory(items: RecipeHistoryItem[]) {
  const groups = new Map<string, { label: string; items: RecipeHistoryItem[] }>();

  for (const item of items) {
    const key = getHistoryDateKey(item.viewed_at);
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, {
        label: getHistoryDayLabel(item.viewed_at),
        items: [item],
      });
    }
  }

  return Array.from(groups.values());
}

export function FamilyWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [family, setFamily] = useState<FamilyPublic | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<RecipeSummary[]>([]);
  const [historyItems, setHistoryItems] = useState<RecipeHistoryItem[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mealRole, setMealRole] = useState<MealRole>("diner");
  const [savingMealRole, setSavingMealRole] = useState(false);
  const [savingMemberRoleId, setSavingMemberRoleId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      let loadedUser: User | null = null;

      try {
        loadedUser = await getCurrentUser();
        if (!active) {
          return;
        }

        setUser(loadedUser);
        if (!loadedUser) {
          return;
        }

        const [familyResult, favoritesResult, historyResult, preferenceResult] =
          await Promise.allSettled([
            getCurrentFamily(),
            getFavoriteRecipes(),
            getRecipeHistory(),
            getDietaryPreference(),
          ]);

        if (!active) {
          return;
        }

        if (familyResult.status === "fulfilled") {
          setFamily(familyResult.value.family);
          setMembers(familyResult.value.members);
          setMealRole(
            familyResult.value.members.find((member) => member.user.id === loadedUser?.id)
              ?.meal_role ?? "diner",
          );
        } else {
          setError("加载家庭信息失败，请重试");
        }

        if (favoritesResult.status === "fulfilled") {
          setFavoriteRecipes(favoritesResult.value);
        } else {
          setError("加载我的收藏失败，请重试");
        }

        if (historyResult.status === "fulfilled") {
          setHistoryItems(historyResult.value);
        } else {
          setError("加载浏览历史失败，请重试");
        }

        if (preferenceResult.status === "fulfilled") {
          setDietaryPreference(preferenceResult.value);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setUser(loadedUser);
        setError(
          err instanceof ApiError ? err.message : "加载个人中心失败，请重试",
        );
      } finally {
        if (active) {
          setLoading(false);
          setActivityLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createFamily({ name: familyName });
      setFamily(response.family);
      setMembers(response.members);
      setMealRole(
        response.members.find((member) => member.user.id === user?.id)?.meal_role ?? "diner",
      );
      setFamilyName("");
      setMessage("家庭已创建，邀请码可以分享给家人");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "创建家庭失败，请重试");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedInviteCode = inviteCode.replace(/\s+/g, "").toUpperCase();

    if (!/^[A-Z0-9]{4,16}$/.test(normalizedInviteCode)) {
      setJoinError("请输入家庭创建者分享的邀请码，只包含字母和数字");
      return;
    }

    setJoining(true);
    setError(null);
    setMessage(null);
    setJoinError(null);
    setInviteCode(normalizedInviteCode);

    try {
      const response = await joinFamily({ invite_code: normalizedInviteCode });
      setFamily(response.family);
      setMembers(response.members);
      setMealRole(
        response.members.find((member) => member.user.id === user?.id)?.meal_role ?? "diner",
      );
      setInviteCode("");
      setMessage(`已加入${response.family?.name ?? "家庭"}`);
    } catch (err) {
      setJoinError(
        err instanceof ApiError
          ? err.message
          : "网络连接失败，请检查网络后重试",
      );
    } finally {
      setJoining(false);
    }
  }

  async function handleSaveMealRole() {
    if (!family || !user || savingMealRole) {
      return;
    }

    setSavingMealRole(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMember = await updateMyMealRole({ meal_role: mealRole });
      setMembers((current) =>
        current.map((member) =>
          member.id === updatedMember.id ? { ...member, meal_role: updatedMember.meal_role } : member,
        ),
      );
      setMessage(`家庭身份已更新为${mealRoleLabels[updatedMember.meal_role]}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存家庭身份失败，请重试");
    } finally {
      setSavingMealRole(false);
    }
  }

  async function handleUpdateMemberMealRole(memberId: number, nextMealRole: MealRole) {
    if (savingMemberRoleId !== null) {
      return;
    }

    const previousMember = members.find((member) => member.id === memberId);
    if (!previousMember || previousMember.meal_role === nextMealRole) {
      return;
    }

    setSavingMemberRoleId(memberId);
    setError(null);
    setMessage(null);
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, meal_role: nextMealRole } : member,
      ),
    );

    try {
      const updatedMember = await updateFamilyMemberMealRole(memberId, {
        meal_role: nextMealRole,
      });
      setMembers((current) =>
        current.map((member) =>
          member.id === updatedMember.id
            ? { ...member, meal_role: updatedMember.meal_role }
            : member,
        ),
      );
      setMessage(`${updatedMember.nickname} 已设置为${mealRoleLabels[updatedMember.meal_role]}`);
    } catch (err) {
      setMembers((current) =>
        current.map((member) =>
          member.id === memberId
            ? { ...member, meal_role: previousMember.meal_role }
            : member,
        ),
      );
      setError(err instanceof ApiError ? err.message : "设置成员身份失败，请重试");
    } finally {
      setSavingMemberRoleId(null);
    }
  }

  async function copyInviteCode(code: string) {
    setError(null);

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setMessage("邀请码已复制，可以发给家庭成员");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("复制失败，请手动复制邀请码");
    }
  }

  async function shareInviteCode(code: string, familyNameToShare: string) {
    setError(null);

    if (!navigator.share) {
      await copyInviteCode(code);
      setMessage("当前设备不支持系统分享，邀请码已复制");
      return;
    }

    try {
      await navigator.share({
        title: `加入${familyNameToShare}`,
        text: `来加入我的家庭「${familyNameToShare}」，邀请码：${code}`,
      });
      setMessage("分享内容已准备好");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError("分享失败，请重试或复制邀请码");
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);

    try {
      await logoutUser();
      setUser(null);
      setFamily(null);
      setMembers([]);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "退出登录失败，请重试");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleRemoveFavorite(recipe: RecipeSummary) {
    if (favoriteBusyId === recipe.id) {
      return;
    }

    setFavoriteBusyId(recipe.id);
    setError(null);

    try {
      await setRecipeFavorite(recipe.id, false);
      setFavoriteRecipes((current) =>
        current.filter((item) => item.id !== recipe.id),
      );
      setMessage("已从我的收藏移除");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "取消收藏失败，请重试",
      );
    } finally {
      setFavoriteBusyId(null);
    }
  }

  if (loading || user === undefined) {
    return (
      <section className="section-card profile-loading" aria-live="polite">
        <div className="profile-loading-avatar" />
        <div className="profile-loading-copy">
          <div />
          <div />
        </div>
      </section>
    );
  }

  if (user === null) {
    return (
      <section className="section-card profile-login-card">
        <div>
          <h2 className="section-title">登录后查看我的空间</h2>
          <p className="section-description">
            登录后可以管理个人菜谱，也可以创建或加入家庭共享内容。
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login" className="button-primary">
            登录
          </Link>
          <Link href="/register" className="button-secondary">
            注册
          </Link>
        </div>
        {error ? (
          <p className="mt-4 profile-message profile-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="profile-page">
      <section className="section-card profile-identity">
        <div className="profile-identity-main">
          <UserAvatar name={user.username} className="profile-avatar" />
          <div className="min-w-0">
            <h2 className="profile-identity-name">{user.username}</h2>
            <p className="profile-identity-workspace">
              {family?.name ?? "个人空间"}
            </p>
            <p className="profile-identity-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-identity-actions">
          <div className="profile-identity-status">
            <span className="profile-identity-status-dot" aria-hidden="true" />
            <span>{family ? "已加入家庭" : "个人空间"}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="button-secondary button-sm"
          >
            {loggingOut ? "退出中..." : "退出登录"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="profile-message profile-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="profile-message profile-message-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="profile-layout">
        <ProfileFunctionList
          hasFamily={Boolean(family)}
          favoriteCount={favoriteRecipes.length}
          historyCount={historyItems.length}
          preferenceCount={
            (dietaryPreference?.liked.length ?? 0) +
            (dietaryPreference?.disliked.length ?? 0) +
            (dietaryPreference?.avoid.length ?? 0)
          }
        />

        <div className="profile-main-content">
          <DietaryPreferencePanel
            preference={dietaryPreference}
            onSaved={(nextPreference) => {
              setDietaryPreference(nextPreference);
              setMessage("饮食偏好已保存，菜谱库会显示匹配提示");
            }}
          />

          {family ? (
            <>
              <section id="family" className="section-card profile-family-card">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">我的家庭</h2>
                    <p className="section-description">
                      管理家庭信息，把邀请码分享给需要加入的家人。
                    </p>
                  </div>
                  <span className="chip chip-accent">{members.length} 位成员</span>
                </div>

                <div className="family-info-grid">
                  <div className="family-info-item">
                    <span className="family-info-label">家庭名称</span>
                    <strong>{family.name}</strong>
                    <span>共享菜谱、点菜和今日菜单</span>
                  </div>

                  <div className="family-info-item family-invite-item">
                    <span className="family-info-label">家庭邀请码</span>
                    <strong className="family-invite-code">{family.invite_code}</strong>
                    <div className="family-invite-actions">
                      <button
                        type="button"
                        onClick={() => void copyInviteCode(family.invite_code)}
                        className="button-secondary button-sm"
                      >
                        <CopyIcon className="mr-2 h-4 w-4" />
                        {copied ? "已复制" : "复制"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void shareInviteCode(family.invite_code, family.name)
                        }
                        className="button-secondary button-sm"
                      >
                        <ShareIcon className="mr-2 h-4 w-4" />
                        分享
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section id="members" className="section-card profile-members-card">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">家庭成员</h2>
                    <p className="section-description">
                      查看家庭成员和家庭创建者。
                    </p>
                  </div>
                  <FamilyIcon className="h-5 w-5 text-emerald-600" />
                </div>

                <div className="profile-member-list">
                  {members.map((member) => (
                    <div key={member.id} className="profile-member-row">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={member.nickname} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-stone-900">
                            {member.nickname}
                            {member.user.id === user.id ? "（我）" : ""}
                          </p>
                          <p className="mt-1 truncate text-sm text-stone-600">
                            {member.user.email}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            加入于 {dateFormatter.format(new Date(member.joined_at))}
                          </p>
                        </div>
                      </div>
                      <div className="profile-member-badges">
                        <span className="chip chip-neutral">
                          {member.role === "owner" ? "创建者" : "成员"}
                        </span>
                        {family.creator_id === user.id && member.user.id !== user.id ? (
                          <label className="profile-member-role-control">
                            <span className="sr-only">设置{member.nickname}的家庭身份</span>
                            <select
                              className="select profile-member-role-select"
                              value={member.meal_role}
                              onChange={(event) =>
                                void handleUpdateMemberMealRole(
                                  member.id,
                                  event.target.value as MealRole,
                                )
                              }
                              disabled={savingMemberRoleId !== null}
                            >
                              {(Object.keys(mealRoleLabels) as MealRole[]).map((option) => (
                                <option key={option} value={option}>
                                  {mealRoleLabels[option]}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <span className={`chip ${member.meal_role === "cook" ? "chip-warm" : "chip-accent"}`}>
                            {mealRoleLabels[member.meal_role]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="meal-role" className="section-card profile-role-card">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">我的家庭身份</h2>
                    <p className="section-description">
                      选择你在这个家庭里的主要分工，首页会自动显示最需要的内容。
                    </p>
                  </div>
                  <span className="chip chip-neutral">可随时修改</span>
                </div>

                <div className="meal-role-options" role="group" aria-label="选择家庭身份">
                  {(Object.keys(mealRoleLabels) as MealRole[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`meal-role-option ${mealRole === option ? "is-active" : ""}`}
                      aria-pressed={mealRole === option}
                      onClick={() => setMealRole(option)}
                      disabled={savingMealRole}
                    >
                      <span className="meal-role-option-title">{mealRoleLabels[option]}</span>
                      <span className="meal-role-option-description">{mealRoleDescriptions[option]}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="button-primary mt-4"
                  onClick={() => void handleSaveMealRole()}
                  disabled={savingMealRole || mealRole === members.find((member) => member.user.id === user.id)?.meal_role}
                >
                  {savingMealRole ? "保存中..." : "保存我的身份"}
                </button>
              </section>
            </>
          ) : (
            <>
              <section id="family" className="section-card-soft profile-personal-card">
                <div className="flex items-start gap-3">
                  <div className="profile-personal-icon" aria-hidden="true">
                    <MenuIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="section-title">个人空间已启用</h2>
                    <p className="section-description">
                      不加入家庭也可以完整使用菜谱、点菜、今日菜单和采购清单。
                    </p>
                  </div>
                </div>
              </section>

              <div className="profile-setup-grid">
                <form className="section-card" onSubmit={handleCreate}>
                  <h2 className="section-title">创建家庭</h2>
                  <p className="section-description">
                    创建后可以和家人共享内容；个人空间里的内容会一起带入。
                  </p>
                  <label className="mt-4 block">
                    <span className="label">家庭名称</span>
                    <input
                      type="text"
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                      className="field"
                      placeholder="幸福一家人"
                      minLength={2}
                      required
                    />
                  </label>
                  <button type="submit" disabled={creating} className="button-primary mt-4">
                    {creating ? "创建中..." : "创建家庭"}
                  </button>
                </form>

                <form className="section-card" onSubmit={handleJoin}>
                  <h2 className="section-title">加入家庭</h2>
                  <p className="section-description">
                    输入家人分享的邀请码，加入已有家庭。
                  </p>
                  <label className="mt-4 block">
                    <span className="label">邀请码</span>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(event) => {
                        setInviteCode(
                          event.target.value.replace(/\s+/g, "").toUpperCase(),
                        );
                        setJoinError(null);
                      }}
                      className="field uppercase tracking-[0.2em]"
                      placeholder="ABC123"
                      minLength={4}
                      maxLength={16}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={joining}
                      aria-invalid={Boolean(joinError)}
                      aria-describedby={joinError ? "join-family-error" : undefined}
                      required
                    />
                  </label>
                  {joinError ? (
                    <p
                      id="join-family-error"
                      className="mt-3 profile-message profile-message-error"
                      role="alert"
                    >
                      {joinError}
                    </p>
                  ) : null}
                  <button type="submit" disabled={joining} className="button-primary mt-4">
                    {joining ? "加入中..." : "加入家庭"}
                  </button>
                </form>
              </div>
            </>
          )}

          <ProfileActivity
            favorites={favoriteRecipes}
            history={historyItems}
            loading={activityLoading}
            favoriteBusyId={favoriteBusyId}
            onRemoveFavorite={(recipe) => void handleRemoveFavorite(recipe)}
          />
        </div>
      </div>
    </section>
  );
}

function ProfileFunctionList({
  hasFamily,
  favoriteCount,
  historyCount,
  preferenceCount,
}: {
  hasFamily: boolean;
  favoriteCount: number;
  historyCount: number;
  preferenceCount: number;
}) {
  return (
    <nav className="section-card profile-function-list" aria-label="我的功能">
      <div className="profile-function-heading">
        <h2 className="section-title">我的功能</h2>
        <p className="section-description">常用的个人与家庭入口。</p>
      </div>

      <div className="profile-function-items">
        <a href="#family" className="profile-function-item" data-active="true">
          <span className="profile-function-icon">
            <FamilyIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="profile-function-title">我的家庭</span>
            <span className="profile-function-description">
              {hasFamily ? "家庭信息与邀请码" : "创建或加入家庭"}
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </a>

        <a href={hasFamily ? "#members" : "#family"} className="profile-function-item">
          <span className="profile-function-icon">
            <FamilyIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="profile-function-title">家庭成员</span>
            <span className="profile-function-description">
              {hasFamily ? "查看成员与创建者" : "加入家庭后查看"}
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </a>
        {hasFamily ? (
          <a href="#meal-role" className="profile-function-item">
            <span className="profile-function-icon">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="profile-function-title">我的家庭身份</span>
              <span className="profile-function-description">选择干饭人或做饭人</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0" />
          </a>
        ) : null}

        <a href="#favorites" className="profile-function-item">
          <span className="profile-function-icon">
            <BookmarkIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="profile-function-title">我的收藏</span>
            <span className="profile-function-description">
              {favoriteCount ? `${favoriteCount} 道已收藏菜谱` : "还没有收藏"}
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </a>
        <a href="#history" className="profile-function-item">
          <span className="profile-function-icon">
            <HistoryIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="profile-function-title">浏览历史</span>
            <span className="profile-function-description">
              {historyCount ? `最近看过 ${historyCount} 道菜` : "还没有浏览记录"}
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </a>
        <a href="#preferences" className="profile-function-item">
          <span className="profile-function-icon">
            <SettingsIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="profile-function-title">饮食偏好</span>
            <span className="profile-function-description">
              {preferenceCount ? `${preferenceCount} 项偏好已设置` : "设置喜欢和忌口"}
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </a>
      </div>
    </nav>
  );
}

function ProfileActivity({
  favorites,
  history,
  loading,
  favoriteBusyId,
  onRemoveFavorite,
}: {
  favorites: RecipeSummary[];
  history: RecipeHistoryItem[];
  loading: boolean;
  favoriteBusyId: number | null;
  onRemoveFavorite: (recipe: RecipeSummary) => void;
}) {
  const historyGroups = groupHistory(history);

  return (
    <>
      <section id="favorites" className="section-card profile-activity-card">
        <div className="section-head">
          <div>
            <h2 className="section-title">我的收藏</h2>
            <p className="section-description">把喜欢的菜谱留在手边。</p>
          </div>
          <span className="chip chip-neutral">{favorites.length} 道菜</span>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-stone-500">正在加载收藏...</p>
        ) : favorites.length === 0 ? (
          <div className="empty-state mt-5">
            还没有收藏菜谱，去菜谱库看看今晚想吃什么。
          </div>
        ) : (
          <div className="profile-activity-grid">
            {favorites.map((recipe) => (
              <article key={recipe.id} className="profile-recipe-card">
                <Link href={`/recipes/${recipe.id}`} className="block min-w-0">
                  <RecipeThumb
                    src={recipe.image_url}
                    title={recipe.title}
                    category={recipe.category}
                    className="aspect-[16/10]"
                  />
                  <p className="mt-3 truncate text-sm font-semibold text-stone-900">
                    {recipe.title}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {recipe.category} · {recipe.difficulty}
                  </p>
                </Link>
                <button
                  type="button"
                  className="profile-recipe-remove"
                  onClick={() => onRemoveFavorite(recipe)}
                  disabled={favoriteBusyId === recipe.id}
                >
                  {favoriteBusyId === recipe.id ? "处理中..." : "取消收藏"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="history" className="section-card profile-activity-card">
        <div className="section-head">
          <div>
            <h2 className="section-title">浏览历史</h2>
            <p className="section-description">最近查看过的菜谱会按日期整理。</p>
          </div>
          <span className="chip chip-neutral">{history.length} 条记录</span>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-stone-500">正在加载浏览历史...</p>
        ) : historyGroups.length === 0 ? (
          <div className="empty-state mt-5">查看菜谱详情后，这里会留下最近记录。</div>
        ) : (
          <div className="profile-history-groups">
            {historyGroups.map((group) => (
              <div key={group.label} className="profile-history-group">
                <h3 className="profile-history-date">{group.label}</h3>
                <div className="profile-history-list">
                  {group.items.map((item) => (
                    <Link
                      key={item.recipe.id}
                      href={`/recipes/${item.recipe.id}`}
                      className="profile-history-row"
                    >
                      <RecipeThumb
                        src={item.recipe.image_url}
                        title={item.recipe.title}
                        category={item.recipe.category}
                        variant="sm"
                        className="h-12 w-16 shrink-0 rounded-[10px]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-stone-900">
                          {item.recipe.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-stone-500">
                          {item.recipe.category}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {historyTimeFormatter.format(new Date(item.viewed_at))}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
