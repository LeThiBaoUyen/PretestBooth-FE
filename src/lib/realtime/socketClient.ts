import { io, type Socket } from "socket.io-client";
import { getTokenManager } from "@/lib/auth/tokenManager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function resolveSocketBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

class RealtimeClient {
  private socket: Socket | null = null;

  private getAccessToken() {
    try {
      return getTokenManager().getAccessToken();
    } catch {
      return null;
    }
  }

  private ensureConnected() {
    if (typeof window === "undefined") {
      return null;
    }

    const token = this.getAccessToken();
    if (!token) {
      this.disconnect();
      return null;
    }

    if (!this.socket) {
      this.socket = io(`${resolveSocketBaseUrl()}/realtime`, {
        autoConnect: true,
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: { token },
      });
      return this.socket;
    }

    const currentToken = (this.socket.auth as any)?.token;
    if (currentToken !== token) {
      this.socket.disconnect();
      this.socket.auth = { token };
      this.socket.connect();
      return this.socket;
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe<T>(event: string, handler: (payload: T) => void) {
    const socket = this.ensureConnected();
    if (!socket) {
      return () => undefined;
    }

    socket.on(event, handler as (...args: any[]) => void);

    return () => {
      socket.off(event, handler as (...args: any[]) => void);
    };
  }

  joinBooth(boothId: string) {
    const socket = this.ensureConnected();
    if (!socket) {
      return;
    }

    socket.emit("realtime.join.booth", boothId);
  }
}

export const realtimeClient = new RealtimeClient();
