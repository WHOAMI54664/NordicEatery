"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

type StaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  created_at: string;
};

export function StaffRolesPanel() {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("cook");
  const [isWorking, setIsWorking] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  async function fetchProfiles() {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id || null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setProfiles((data || []) as StaffProfile[]);
    setErrorMessage("");
    setIsLoading(false);
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function callAdminApi(
    url: string,
    body: Record<string, string>
  ) {
    setIsWorking(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.error || "Action failed.");
      setIsWorking(false);
      return false;
    }

    setIsWorking(false);
    return true;
  }

  async function inviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = inviteEmail.trim().toLowerCase();

    const ok = await callAdminApi("/api/admin/staff/invite", {
      email,
      role: inviteRole,
    });

    if (!ok) return;

    setInviteEmail("");
    setInviteRole("cook");
    setIsModalOpen(false);
    setSuccessMessage("Invite sent successfully.");

    await fetchProfiles();
  }

  async function updateRole(profileId: string, role: StaffRole) {
    const ok = await callAdminApi("/api/admin/staff/update-role", {
      profileId,
      role,
    });

    if (!ok) return;

    setSuccessMessage("Role updated.");
    await fetchProfiles();
  }

  async function resetPassword(email: string) {
    const ok = await callAdminApi("/api/admin/staff/reset-password", {
      email,
    });

    if (!ok) return;

    setSuccessMessage(`Password reset link sent to ${email}.`);
  }

  async function deleteUser(profileId: string) {
    const confirmed = window.confirm(
      "Delete this user? This action cannot be undone."
    );

    if (!confirmed) return;

    const ok = await callAdminApi("/api/admin/staff/delete", {
      profileId,
    });

    if (!ok) return;

    setSuccessMessage("User deleted.");
    await fetchProfiles();
  }

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="font-black text-dark">Loading staff...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-dark">Staff members</h2>
          <p className="mt-1 text-sm text-dark/50">
            Invite staff, update roles, reset passwords and delete users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          Add staff member
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-3xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-3xl bg-green-100 p-4 text-sm font-bold text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="glass-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="text-lg font-black text-dark">{profile.email}</p>
              <p className="mt-1 text-sm text-dark/50">
                {profile.full_name || "No name"}{" "}
                {profile.id === currentUserId ? "· You" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="input-field min-w-40 font-black capitalize"
                value={profile.role}
                disabled={isWorking}
                onChange={(event) =>
                  updateRole(profile.id, event.target.value as StaffRole)
                }
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isWorking}
                onClick={() => resetPassword(profile.email)}
                className="btn-secondary whitespace-nowrap disabled:opacity-60"
              >
                Reset password
              </button>

              <button
                type="button"
                disabled={isWorking || profile.id === currentUserId}
                onClick={() => deleteUser(profile.id)}
                className="rounded-full bg-paprika px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 px-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-dark">
                  Add staff member
                </h3>
                <p className="mt-1 text-sm text-dark/50">
                  The user will receive an invite link by email.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-white px-3 py-2 text-sm font-black text-dark shadow-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={inviteStaff} className="mt-6 space-y-4">
              <label>
                <span className="mb-2 block text-sm font-bold text-dark">
                  Email
                </span>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="input-field"
                  placeholder="staff@email.com"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-dark">
                  Role
                </span>
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as StaffRole)
                  }
                  className="input-field capitalize"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={isWorking}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? "Sending invite..." : "Send invite"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}