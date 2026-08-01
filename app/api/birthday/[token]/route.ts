import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Public — the token itself (from customers.birthday_capture_token, linked
// in the review-request email) is what authorizes this write.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let body: { birthday?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.birthday || !DATE_RE.test(body.birthday)) {
    return NextResponse.json({ error: "Enter a valid date" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ birthday: body.birthday })
    .eq("birthday_capture_token", token)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
