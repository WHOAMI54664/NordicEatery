"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/kitchen";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="glass-card mx-auto max-w-md p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-paprika text-2xl font-black text-white">
          M
        </div>

        <h1 className="mt-5 text-3xl font-black text-dark">
          Staff Login
        </h1>

        <p className="mt-2 text-sm leading-6 text-dark/55">
          Login for owner, admin and kitchen staff.
        </p>
      </div>

      <div className="space-y-4">
        <label>
          <span className="mb-2 block text-sm font-bold text-dark">
            Email
          </span>
          <input
            required
            type="email"
            className="input-field"
            placeholder="staff@mikesfood.se"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-dark">
            Password
          </span>
          <input
            required
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl bg-paprika/10 p-3 text-sm font-bold text-paprika">
          {errorMessage}
        </div>
      )}

      <button
        disabled={isLoading}
        type="submit"
        className="btn-primary mt-6 w-full"
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}