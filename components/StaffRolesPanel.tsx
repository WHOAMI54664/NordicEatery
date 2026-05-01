"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

type StaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  created_at: string;
};

function getRoleClass(role: StaffRole) {
  switch (role) {
    case "owner":
      return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
    case "admin":
      return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
    case "cook":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    default:
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

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
      data: { user }
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

  async function callAdminApi(url: string, body: Record<string, string>) {
    setIsWorking(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
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
      role: inviteRole
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
      role
    });

    if (!ok) return;

    setSuccessMessage("Role updated.");
    await fetchProfiles();
  }

  async function resetPassword(email: string) {
    const ok = await callAdminApi("/api/admin/staff/reset-password", {
      email
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
      profileId
    });

    if (!ok) return;

    setSuccessMessage("User deleted.");
    await fetchProfiles();
  }

  const ownersCount = profiles.filter((profile) => profile.role === "owner").length;
  const adminsCount = profiles.filter((profile) => profile.role === "admin").length;
  const cooksCount = profiles.filter((profile) => profile.role === "cook").length;

  if (isLoading) {
    return (
        <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
            <UsersRound className="h-6 w-6 animate-pulse text-[#C7192E]" />
          </div>
          <p className="mt-4 text-sm font-black text-[#25120F]">
            Loading staff...
          </p>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-5 shadow-sm shadow-[#4C2314]/5">
            <p className="text-sm font-black text-[#8A7A70]">Total staff</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {profiles.length}
            </h3>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-5 shadow-sm shadow-[#4C2314]/5">
            <p className="text-sm font-black text-[#8A7A70]">Owners</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#C7192E]">
              {ownersCount}
            </h3>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-5 shadow-sm shadow-[#4C2314]/5">
            <p className="text-sm font-black text-[#8A7A70]">Admins</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#A96800]">
              {adminsCount}
            </h3>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-5 shadow-sm shadow-[#4C2314]/5">
            <p className="text-sm font-black text-[#8A7A70]">Cooks</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-emerald-700">
              {cooksCount}
            </h3>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[#25120F]">
              Staff members
            </h2>
            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
              Invite staff, update roles, reset passwords and delete users.
            </p>
          </div>

          <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
          >
            <Plus className="h-4 w-4" />
            Add staff member
          </button>
        </div>

        {errorMessage ? (
            <div className="rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
              {errorMessage}
            </div>
        ) : null}

        {successMessage ? (
            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700">
              {successMessage}
            </div>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-white/60 shadow-sm shadow-[#4C2314]/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-2 px-5 py-3 text-left">
              <thead>
              <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                <th className="px-4 py-2 font-black">Member</th>
                <th className="px-4 py-2 font-black">Role</th>
                <th className="px-4 py-2 font-black">Created</th>
                <th className="px-4 py-2 text-right font-black">Actions</th>
              </tr>
              </thead>

              <tbody>
              {profiles.map((profile) => (
                  <tr key={profile.id} className="group">
                    <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/80 px-4 py-4 group-hover:bg-[#FFF3E2]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                          <UserRound className="h-5 w-5 text-[#C7192E]" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-[#25120F]">
                              {profile.email}
                            </p>

                            {profile.id === currentUserId ? (
                                <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2.5 py-1 text-[11px] font-black text-[#C7192E]">
                              You
                            </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs font-medium text-[#7B6A61]">
                            {profile.full_name || "No name"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="border-y border-[#EADDCF] bg-white/80 px-4 py-4 group-hover:bg-[#FFF3E2]">
                      <div className="flex items-center gap-3">
                      <span
                          className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${getRoleClass(
                              profile.role
                          )}`}
                      >
                        {profile.role}
                      </span>

                        <select
                            className="h-10 min-w-36 rounded-2xl border border-[#EADDCF] bg-white px-3 text-sm font-black capitalize text-[#25120F] outline-none transition focus:border-[#E51B23]/25 focus:ring-4 focus:ring-[#E51B23]/8"
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
                      </div>
                    </td>

                    <td className="border-y border-[#EADDCF] bg-white/80 px-4 py-4 group-hover:bg-[#FFF3E2]">
                      <p className="text-sm font-bold text-[#25120F]">
                        {formatDate(profile.created_at)}
                      </p>
                    </td>

                    <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/80 px-4 py-4 group-hover:bg-[#FFF3E2]">
                      <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => resetPassword(profile.email)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white px-4 text-xs font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E] disabled:opacity-60"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Reset password
                        </button>

                        <button
                            type="button"
                            disabled={isWorking || profile.id === currentUserId}
                            onClick={() => deleteUser(profile.id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 text-xs font-black text-[#C7192E] transition hover:bg-[#E51B23]/12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {profiles.length === 0 ? (
                <div className="p-5">
                  <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                    <UsersRound className="mx-auto h-10 w-10 text-[#C7192E]" />
                    <p className="mt-4 text-sm font-black text-[#25120F]">
                      No staff members found
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                      Invite your first staff member to start managing roles.
                    </p>
                  </div>
                </div>
            ) : null}
          </div>
        </section>

        {isModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25120F]/40 px-4 backdrop-blur-sm">
              <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6] p-6 shadow-2xl shadow-[#4C2314]/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Staff invite
                    </div>

                    <h3 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#25120F]">
                      Add staff member
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-[#7B6A61]">
                      The user will receive an invite link by email.
                    </p>
                  </div>

                  <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white text-[#25120F] transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={inviteStaff} className="mt-6 space-y-4">
                  <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                  Email
                </span>
                    <input
                        required
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
                        placeholder="staff@email.com"
                    />
                  </label>

                  <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                  Role
                </span>
                    <select
                        value={inviteRole}
                        onChange={(event) =>
                            setInviteRole(event.target.value as StaffRole)
                        }
                        className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-black capitalize text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
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
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWorking ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Sending invite...
                        </>
                    ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Send invite
                        </>
                    )}
                  </button>
                </form>
              </div>
            </div>
        ) : null}
      </div>
  );
}