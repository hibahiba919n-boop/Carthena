const SESSION_COOKIE = "carthena_session_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const randomId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  const parts = document.cookie.split(";").map((item) => item.trim());
  const match = parts.find((part) => part.startsWith(target));
  return match ? decodeURIComponent(match.slice(target.length)) : null;
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
};

export const getOrCreateSessionId = (): string => {
  const existing = readCookie(SESSION_COOKIE);
  if (existing) return existing;
  const created = randomId();
  writeCookie(SESSION_COOKIE, created);
  return created;
};
