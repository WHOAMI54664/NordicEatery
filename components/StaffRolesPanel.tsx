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
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  async function fetchProfiles() {
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

  async function updateRole(profileId: string, role: StaffRole) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", profileId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

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
      {errorMessage && (
        <div className="mb-6 rounded-3xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-lg font-black text-dark">{profile.email}</p>
              <p className="mt-1 text-sm text-dark/50">
                {profile.full_name || "No name"}{" "}
                {profile.id === currentUserId ? "· You" : ""}
              </p>
            </div>

            <select
              className="input-field max-w-48 font-black capitalize"
              value={profile.role}
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
        ))}
      </div>
    </div>
  );
}