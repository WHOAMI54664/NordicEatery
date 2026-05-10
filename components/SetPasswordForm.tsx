"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SetPasswordForm() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale || "en");

  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    async function restoreSessionFromUrl() {
      const hash = window.location.hash;

      if (hash) {
        const hashParams = new URLSearchParams(hash.replace("#", ""));

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setErrorMessage(error.message);
            return;
          }

          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setIsSessionReady(true);
      } else {
        setErrorMessage(
            "Auth session missing. Please open the newest invite link again."
        );
      }
    }

    restoreSessionFromUrl();
  }, [supabase]);

  async function redirectByRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profile?.role === "cook") {
        router.push(`/${locale}/admin/kitchen`);
        return;
      }
    }

    router.push(`/${locale}/admin`);
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!isSessionReady) {
      setErrorMessage(
          "Auth session missing. Please open the newest invite link again."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Password has been set successfully.");

    setTimeout(() => {
      redirectByRole();
    }, 900);
  }

  return (
      <form
          onSubmit={handleSetPassword}
          className="glass-card w-full max-w-md rounded-[2rem] p-5 sm:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-paprika/10 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
          🔐
        </div>

        <h1 className="mt-5 text-center text-2xl font-black text-dark sm:mt-6 sm:text-3xl">
          Set your password
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-dark/60">
          Create a password to access the Nordic Eatery staff area
        </p>

        {errorMessage && (
            <div className="mt-5 rounded-2xl bg-paprika/10 p-3 text-sm font-bold text-paprika sm:rounded-3xl sm:p-4">
              {errorMessage}
            </div>
        )}

        {successMessage && (
            <div className="mt-5 rounded-2xl bg-green-100 p-3 text-sm font-bold text-green-700 sm:rounded-3xl sm:p-4">
              {successMessage}
            </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block">
          <span className="mb-2 block text-sm font-bold text-dark">
            New password
          </span>

            <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field w-full text-base"
                placeholder="Minimum 6 characters"
            />
          </label>

          <label className="block">
          <span className="mb-2 block text-sm font-bold text-dark">
            Confirm password
          </span>

            <input
                required
                minLength={6}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input-field w-full text-base"
                placeholder="Repeat password"
            />
          </label>

          <button
              type="submit"
              disabled={isLoading || !isSessionReady}
              className="btn-primary min-h-12 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isLoading ? "Saving..." : "Set password"}
          </button>
        </div>
      </form>
  );
}