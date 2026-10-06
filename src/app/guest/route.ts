import { NextResponse } from "next/server";

// Guest / demo entry: sets a demo cookie and drops the visitor into the CRM
// without credentials. Clearly a demo mode — see middleware.
export function GET(request: Request) {
  const url = new URL("/dashboard", request.url);
  const res = NextResponse.redirect(url);
  res.cookies.set("crm_demo", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
