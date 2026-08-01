"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "./types";
import { ROLE_META } from "./data";

interface Session {
  role: Role;
  email: string;
  name: string;
  relationshipType?: string;
  contactId?: string;
  membershipTier?: string;
  accessLevel?: string;
  interests?: string;
  ndaStatus?: string;
  verificationStatus?: string;
  redirectPath?: string;
  source?: "notion" | "fallback";
}

interface SessionCtx {
  session: Session | null;
  login: (role: Role, email: string) => void;
  setAuthenticatedSession: (session: Session) => void;
  logout: () => void;
  ready: boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

const KEY = "sbf-session";

const NAME_BY_ROLE: Record<Role, string> = {
  admin: "Eleanor Voss",
  member: "Marcus Reed",
  investor: "Sofia Lindqvist",
  partner: "Devin Okafor",
  lender: "Hana Yamamoto",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login = (role: Role, email: string) => {
    const next: Session = {
      role,
      email: email || `${role}@sbf.world`,
      name: NAME_BY_ROLE[role],
      relationshipType: ROLE_META[role].label,
      source: "fallback",
    };
    setSession(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const setAuthenticatedSession = (next: Session) => {
    setSession(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    setSession(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <Ctx.Provider value={{ session, login, setAuthenticatedSession, logout, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export { ROLE_META };
