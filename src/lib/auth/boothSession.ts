const BOOTH_SESSION_TOKEN_KEY = "booth_session_token";
const BOOTH_SESSION_META_KEY = "booth_session_meta";

export type BoothBookingType = "PRACTICE" | "EXAM";

export interface BoothSessionMeta {
  boothId: string;
  boothCode: string;
  boothName: string;
  boothBookingType?: BoothBookingType | null;
}

const canUseStorage = () => typeof window !== "undefined";

export const boothSessionManager = {
  save(sessionToken: string, meta: BoothSessionMeta) {
    if (!canUseStorage()) return;
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

  clear() {
    if (!canUseStorage()) return;
    window.sessionStorage.removeItem(BOOTH_SESSION_TOKEN_KEY);
    window.sessionStorage.removeItem(BOOTH_SESSION_META_KEY);
    window.localStorage.removeItem(BOOTH_SESSION_TOKEN_KEY);
    window.localStorage.removeItem(BOOTH_SESSION_META_KEY);
  },
};
