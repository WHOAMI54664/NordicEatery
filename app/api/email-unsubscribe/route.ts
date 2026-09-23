import { createAdminClient } from "@/lib/supabase/admin";
const validToken = (token: unknown): token is string => typeof token === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
const html = (body: string, status = 200) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nordic Eatery</title><body><main><h1>Nordic Eatery</h1>${body}</main></body></html>`, {status, headers:{"Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store", "Referrer-Policy":"no-referrer"}});
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return html("<p>Invalid link.</p>",400);
  return html(`<p>Stop opening notifications and email news?</p><form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Unsubscribe / Avsluta prenumeration</button></form>`);
}
export async function POST(request: Request) {
  const token = (await request.formData()).get("token");
  if (!validToken(token)) return html("<p>Invalid link.</p>",400);
  const {error} = await createAdminClient().rpc("unsubscribe_opening_email",{p_token:token});
  return error ? html("<p>Please try again.</p>",503) : html("<p>You have been unsubscribed. Du har avslutat prenumerationen.</p>");
}
