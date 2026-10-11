import { groupDb } from "@/lib/group-orders/store";
import { UUID } from "@/lib/group-orders/model";
const html = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nordic Eatery</title><body><main><h1>Nordic Eatery</h1>${body}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; form-action 'self'; frame-ancestors 'none'",
      },
    },
  );
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!UUID.test(token)) return html("<p>Invalid link.</p>", 400);
  return html(
    `<p>Cancel your group order availability notification?</p><form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Unsubscribe / Avsluta avisering</button></form>`,
  );
}
export async function POST(request: Request) {
  try {
    const token = (await request.formData()).get("token");
    if (typeof token !== "string" || !UUID.test(token))
      return html("<p>Invalid link.</p>", 400);
    const { error } = await groupDb().rpc("unsubscribe_group_slot_email", {
      p_token: token,
    });
    if (error) throw new Error("unavailable");
    return html("<p>Notification cancelled. Aviseringen har avslutats.</p>");
  } catch {
    return html("<p>Please try again.</p>", 503);
  }
}
