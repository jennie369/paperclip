// Auth compat shim — cung cấp useAuth() cho CC pages
// Dùng supabase client trực tiếp thay vì Gemral AuthContext

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
