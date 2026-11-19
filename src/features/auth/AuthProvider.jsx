import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";

const DEFAULT_PREFERENCES = {
  theme: "dark",
  auto_forward_card_expenses: false,
  notifications_enabled: false,
  notify_card_goal_75: true,
  notify_card_goal_100: true,
  notify_invoice_closing: true,
  notify_ai_pills: true,
  ai_humor_level: "sarcastic_friendly",
};

function deriveFallbackName(user) {
  if (!user) return "Usuário";
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuário"
  );
}

export function AuthProvider({ children }) {
  const { setThemeMode } = useTheme();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  const loadAccountMeta = useCallback(
    async (authUser) => {
      if (!authUser) {
        setProfile(null);
        setPreferences(DEFAULT_PREFERENCES);
        return;
      }

      const fallbackProfile = {
        id: authUser.id,
        display_name: deriveFallbackName(authUser),
        avatar_url: authUser.user_metadata?.avatar_url || null,
      };

      try {
        const [profileRes, prefsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle(),
          supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle(),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setProfile(fallbackProfile);
        }

        if (prefsRes.data) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...prefsRes.data });
          if (prefsRes.data.theme) {
            setThemeMode(prefsRes.data.theme);
          }
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch {
        setProfile(fallbackProfile);
        setPreferences(DEFAULT_PREFERENCES);
      }
    },
    [setThemeMode],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (!active) return;
      setSession(initial);
      await loadAccountMeta(initial?.user ?? null);
      if (active) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      } else if (event === "SIGNED_OUT") {
        setIsRecovering(false);
      }

      if (nextSession?.user) {
        loadAccountMeta(nextSession.user);
      } else {
        setProfile(null);
        setPreferences(DEFAULT_PREFERENCES);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAccountMeta]);

  const updateDisplayName = useCallback(
    async (newName) => {
      const trimmed = String(newName || "").trim();
      if (!trimmed || !session?.user) {
        throw new Error("O nome de exibição não pode estar vazio.");
      }

      const [authRes, profileRes] = await Promise.all([
        supabase.auth.updateUser({ data: { display_name: trimmed } }),
        supabase
          .from("profiles")
          .update({ display_name: trimmed })
          .eq("id", session.user.id)
          .select()
          .maybeSingle(),
      ]);

      if (authRes.error) throw authRes.error;
      if (profileRes.error) throw profileRes.error;

      setProfile((prev) => ({
        ...(prev || { id: session.user.id }),
        display_name: trimmed,
      }));

      return trimmed;
    },
    [session],
  );

  const updatePreferences = useCallback(
    async (patch) => {
      setPreferences((prev) => ({ ...prev, ...patch }));
      if (patch.theme) {
        setThemeMode(patch.theme);
      }

      if (!session?.user) return;
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: session.user.id, ...patch },
          { onConflict: "user_id" },
        );

      if (error) throw error;
    },
    [session, setThemeMode],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      displayName:
        profile?.display_name || deriveFallbackName(session?.user ?? null),
      preferences,
      isLoading,
      isRecovering,
      finishRecovery: () => setIsRecovering(false),
      refreshAccount: () => loadAccountMeta(session?.user ?? null),
      updateDisplayName,
      updatePreferences,
      signOut,
      deleteAccount,
    }),
    [
      session,
      profile,
      preferences,
      isLoading,
      isRecovering,
      loadAccountMeta,
      updateDisplayName,
      updatePreferences,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
