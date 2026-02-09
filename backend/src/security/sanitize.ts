export function sanitizePreferencesForClient(prefs: unknown) {
  if (!prefs || typeof prefs !== "object") return {};
  let copy: any = null;
  try {
    copy = JSON.parse(JSON.stringify(prefs));
  } catch {
    copy = {};
  }

  if (copy?.fiscal && typeof copy.fiscal === "object") {
    delete copy.fiscal.token;
    delete copy.fiscal.baseUrl;
    delete copy.fiscal.provider;
  }
  return copy;
}

