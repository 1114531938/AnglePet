export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function token() {
  if (typeof window === "undefined") return null;

  const sessionToken = sessionStorage.getItem("token");
  if (sessionToken) return sessionToken;

  // Move existing persistent logins into this tab's session once.
  const legacyToken = localStorage.getItem("token");
  if (legacyToken) {
    sessionStorage.setItem("token", legacyToken);
    const legacyUsername = localStorage.getItem("username");
    if (legacyUsername) sessionStorage.setItem("username", legacyUsername);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  }
  return legacyToken;
}

export function saveAuth(accessToken: string, username: string) {
  sessionStorage.setItem("token", accessToken);
  sessionStorage.setItem("username", username);
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

export function clearAuth() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("username");
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

export async function request(path: string, options: RequestInit = {}) {
  const authToken = token();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(data.detail || "请求失败");
  }
  return res.json();
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  const authToken = token();
  const res = await fetch(`${API}/me/avatar`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "上传失败" }));
    throw new Error(data.detail || "上传失败");
  }
  return res.json();
}

export async function uploadSticker(characterId: string, file: File, name: string, triggerWords: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  form.append("trigger_words", triggerWords);
  const authToken = token();
  const res = await fetch(`${API}/characters/${characterId}/stickers`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "上传失败" }));
    throw new Error(data.detail || "上传失败");
  }
  return res.json();
}
