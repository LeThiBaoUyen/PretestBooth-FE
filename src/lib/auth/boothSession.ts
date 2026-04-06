const BOOTH_SESSION_TOKEN_KEY = "booth_session_token";
const BOOTH_SESSION_META_KEY = "booth_session_meta";
const BOOTH_CLIENT_ID_KEY = "booth_client_id";

export type BoothBookingType = "PRACTICE" | "EXAM";
export type BoothAccessMode = "SCHEDULED" | "WALK_IN";

export interface BoothSessionMeta {
  boothId: string;
  boothCode: string;
  boothName: string;
  boothBookingType?: BoothBookingType | null;
  boothAccessMode?: BoothAccessMode | null;
  nextExamStartTime?: string | null;
  warnAt?: string | null;
  forceLogoutAt?: string | null;
  noShowGraceUntil?: string | null;
}

const canUseStorage = () => typeof window !== "undefined";

const generateBoothClientId = () => {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `booth-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const boothSessionManager = {
  ensureClientId(): string | null {
    if (!canUseStorage()) return null;

    const existing =
      window.sessionStorage.getItem(BOOTH_CLIENT_ID_KEY) ||
      window.localStorage.getItem(BOOTH_CLIENT_ID_KEY);

    if (existing) {
      window.sessionStorage.setItem(BOOTH_CLIENT_ID_KEY, existing);
      window.localStorage.setItem(BOOTH_CLIENT_ID_KEY, existing);
      return existing;
    }

    const nextClientId = generateBoothClientId();
    window.sessionStorage.setItem(BOOTH_CLIENT_ID_KEY, nextClientId);
    window.localStorage.setItem(BOOTH_CLIENT_ID_KEY, nextClientId);
    return nextClientId;
  },

  getClientId(): string | null {
    if (!canUseStorage()) return null;
    return (
      window.sessionStorage.getItem(BOOTH_CLIENT_ID_KEY) ||
      window.localStorage.getItem(BOOTH_CLIENT_ID_KEY)
    );
  },

  save(sessionToken: string, meta: BoothSessionMeta) {
    if (!canUseStorage()) return;
    this.ensureClientId();
    window.sessionStorage.setItem(BOOTH_SESSION_TOKEN_KEY, sessionToken);
    window.sessionStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(meta));
    window.localStorage.setItem(BOOTH_SESSION_TOKEN_KEY, sessionToken);
    window.localStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(meta));
  },

  getToken(): string | null {
    if (!canUseStorage()) return null;
    return (
      window.sessionStorage.getItem(BOOTH_SESSION_TOKEN_KEY) ||
      window.localStorage.getItem(BOOTH_SESSION_TOKEN_KEY)
    );
  },

  getMeta(): BoothSessionMeta | null {
    if (!canUseStorage()) return null;
    const raw =
      window.sessionStorage.getItem(BOOTH_SESSION_META_KEY) ||
      window.localStorage.getItem(BOOTH_SESSION_META_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as BoothSessionMeta;
    } catch {
      return null;
    }
  },

  setBookingType(boothBookingType: BoothBookingType | null) {
    if (!canUseStorage()) return;
    const current = this.getMeta();
    if (!current) return;

    const nextMeta: BoothSessionMeta = {
      ...current,
      boothBookingType,
    };

    window.sessionStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
    window.localStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
  },

  setAccessMode(boothAccessMode: BoothAccessMode | null) {
    if (!canUseStorage()) return;
    const current = this.getMeta();
    if (!current) return;

    const nextMeta: BoothSessionMeta = {
      ...current,
      boothAccessMode,
    };

    window.sessionStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
    window.localStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
  },

  setWalkInProtection(payload: {
    nextExamStartTime?: string | null;
    warnAt?: string | null;
    forceLogoutAt?: string | null;
    noShowGraceUntil?: string | null;
  }) {
    if (!canUseStorage()) return;
    const current = this.getMeta();
    if (!current) return;

    const nextMeta: BoothSessionMeta = {
      ...current,
      nextExamStartTime: payload.nextExamStartTime ?? null,
      warnAt: payload.warnAt ?? null,
      forceLogoutAt: payload.forceLogoutAt ?? null,
      noShowGraceUntil: payload.noShowGraceUntil ?? null,
    };

    window.sessionStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
    window.localStorage.setItem(BOOTH_SESSION_META_KEY, JSON.stringify(nextMeta));
  },

  clear() {
    if (!canUseStorage()) return;
    window.sessionStorage.removeItem(BOOTH_SESSION_TOKEN_KEY);
    window.sessionStorage.removeItem(BOOTH_SESSION_META_KEY);
    window.localStorage.removeItem(BOOTH_SESSION_TOKEN_KEY);
    window.localStorage.removeItem(BOOTH_SESSION_META_KEY);
  },
};
