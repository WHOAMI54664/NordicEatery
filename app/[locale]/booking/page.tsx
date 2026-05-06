import { createClient } from "@/lib/supabase/server";
import BookingClient from "./BookingClient";

export default async function BookingPage({
                                            params,
                                          }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canEdit = false;

  if (user) {
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    canEdit = profile?.role === "owner" || profile?.role === "admin";
  }

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "booking");

  const editableContent = Object.fromEntries(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  return (
      <BookingClient
          locale={locale}
          canEdit={canEdit}
          editableContent={editableContent}
      />
  );
}