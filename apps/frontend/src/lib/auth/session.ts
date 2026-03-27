const COOKIE_NAME = "access_token";

export function setAuthCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

