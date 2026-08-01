import { NextResponse } from "next/server";
import { BradPortalError } from "@/lib/bradPortal";

const BRAD_EMAIL = "brad@keatyrealestate.com";
export const bradRoute = (loader: () => Promise<unknown>) => async (request: Request) => {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (email !== BRAD_EMAIL) return NextResponse.json({ success: false, error: "Brad partner access is required." }, { status: 403 });
  try { return NextResponse.json({ success: true, data: await loader() }); }
  catch (error) {
    const message = error instanceof BradPortalError ? error.message : "Brad portal integration needs attention.";
    return NextResponse.json({ success: false, error: message }, { status: error instanceof BradPortalError && error.source === "config" ? 503 : 502 });
  }
};
