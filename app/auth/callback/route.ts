import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const redirectTo = url.searchParams.get("redirect_to") || "/set-password";

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}