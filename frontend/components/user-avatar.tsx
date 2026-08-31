type UserAvatarProps = {
  name: string;
  className?: string;
  small?: boolean;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, className, small }: UserAvatarProps) {
  return (
    <span className={small ? `avatar-sm ${className ?? ""}` : `avatar ${className ?? ""}`.trim()}>
      {getInitials(name)}
    </span>
  );
}
