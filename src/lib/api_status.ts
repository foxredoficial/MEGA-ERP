import { apiFetch } from "./api";

export async function getApiHealth() {
  return apiFetch<{ ok: boolean }>("/api/health", { method: "GET" });
}

export async function getNfeStatus() {
  return apiFetch<{ enabled: boolean; environment: "homolog" | "prod" }>("/api/me/nfe/status", { method: "GET" });
}

