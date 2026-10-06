import { NextResponse } from "next/server";

// Exit guest / demo mode: clear the demo cookie and return to the login page.
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.set("crm_demo", "", { path: "/", maxAge: 0 });
  return res;
}
