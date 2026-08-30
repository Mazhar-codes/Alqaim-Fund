"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [role, setRole] = useState(null); // "member" | "admin"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        setRole(tokenResult.claims.role || "member");
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  /** Returns fetch options with a fresh Firebase ID token attached. */
  const authedFetch = useCallback(
    async (url, options = {}) => {
      if (!firebaseAuth.currentUser) throw new Error("Not signed in");
      const token = await firebaseAuth.currentUser.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    []
  );

  const signOut = () => fbSignOut(firebaseAuth);

  return (
    <AuthContext.Provider value={{ firebaseUser, role, loading, authedFetch, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
