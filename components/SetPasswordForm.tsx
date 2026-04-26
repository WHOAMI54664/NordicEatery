"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

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
      router.push("/admin");
    }, 900);
  }

  return (
    <form onSubmit={handleSetPassword} className="glass-card w-full max-w-md p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paprika/10 text-3xl">
        🔐
      </div>

      <h1 className="mt-6 text-center text-3xl font-black text-dark">
        Set your password
      </h1>

      <p className="mt-2 text-center text-sm leading-6 text-dark/60">
        Create a password to access the Nordic Eatery staff area.
      </p>

      {errorMessage && (
        <div className="mt-5 rounded-3xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-5 rounded-3xl bg-green-100 p-4 text-sm font-bold text-green-700">
          {successMessage}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <label>
          <span className="mb-2 block text-sm font-bold text-dark">
            New password
          </span>

          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-field"
            placeholder="Minimum 6 characters"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-dark">
            Confirm password
          </span>

          <input
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="input-field"
            placeholder="Repeat password"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Saving..." : "Set password"}
        </button>
      </div>
    </form>
  );
}