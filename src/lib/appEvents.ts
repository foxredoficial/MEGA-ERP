export type AppEventName = "data:changed";

type Payload = {
  scope?: "finance" | "cash" | "stock" | "sales" | "all";
  at?: number;
};

const target = new EventTarget();
const channelName = "sisfec-erp-app-events";

const bc: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;

function dispatchLocal(name: AppEventName, detail: Payload) {
  target.dispatchEvent(new CustomEvent(name, { detail }));
}

function safeParse(payload: unknown): Payload | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as Payload;
}

if (bc) {
  bc.onmessage = (ev) => {
    const msg = ev.data as { name?: AppEventName; detail?: Payload };
    if (msg?.name !== "data:changed") return;
    dispatchLocal("data:changed", msg.detail ?? { scope: "all", at: Date.now() });
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== channelName || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as { name?: AppEventName; detail?: Payload };
      if (parsed?.name !== "data:changed") return;
      dispatchLocal("data:changed", parsed.detail ?? { scope: "all", at: Date.now() });
    } catch {
      return;
    }
  });
}

export function emitAppEvent(name: AppEventName, detail: Payload = { scope: "all", at: Date.now() }) {
  const payload = { ...detail, at: detail.at ?? Date.now() };
  dispatchLocal(name, payload);

  if (bc) {
    bc.postMessage({ name, detail: payload });
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(channelName, JSON.stringify({ name, detail: payload }));
    } catch {
      return;
    }
  }
}

export function onAppEvent(name: AppEventName, handler: (detail: Payload) => void) {
  const fn = (ev: Event) => {
    const d = safeParse((ev as CustomEvent).detail) ?? { scope: "all", at: Date.now() };
    handler(d);
  };
  target.addEventListener(name, fn);
  return () => target.removeEventListener(name, fn);
}
