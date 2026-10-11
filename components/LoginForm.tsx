"use client";

import { EditableCopy } from "@/components/site-content/EditableCopy";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const locale = String(params.locale || "en");
  const next = searchParams.get("next") || `/${locale}/admin/kitchen`;

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

          <h1 className="mt-5 text-3xl font-black text-dark"><EditableCopy value={"Staff Login"} textKey="screen.staffLogin.staff-login" page="staffLogin" /></h1>

          <p className="mt-2 text-sm leading-6 text-dark/55">
            <EditableCopy value={"Login for owner, admin and kitchen staff."} textKey="screen.staffLogin.login-for-owner-admin-and-kitchen-staff" page="staffLogin" /></p>
        </div>

        <div className="space-y-4">
          <label>
            <span className="mb-2 block text-sm font-bold text-dark"><EditableCopy value={"Email"} textKey="screen.staffLogin.email" page="staffLogin" /></span>
            <input
                required
                type="email"
                className="input-field"
                placeholder="staff@nordiceatery.se"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
          <span className="mb-2 block text-sm font-bold text-dark">
            <EditableCopy value={"Password"} textKey="screen.staffLogin.password" page="staffLogin" /></span>
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
          {isLoading ? <EditableCopy value={"Logging in..."} textKey="screen.staffLogin.logging-in" page="staffLogin" /> : <EditableCopy value={"Login"} textKey="screen.staffLogin.login" page="staffLogin" />}
        </button>
      </form>
  );
}
