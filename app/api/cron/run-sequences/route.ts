import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { renderTemplate } from "@/lib/email/render";
import { buildMergeVars } from "@/lib/crm/merge-vars";
import type { Customer, SequenceStep } from "@/lib/types";

type DueSendRow = {
  id: string;
  customers: Pick<Customer, "name" | "email" | "birthday_capture_token"> | null;
  sequence_steps: Pick<SequenceStep, "subject" | "body"> | null;
  orders: {
    reference: string;
    order_items: { item_name: string }[];
    fulfilment_date: string | null;
    fulfilment_time: string | null;
    fulfilment_location: string | null;
  } | null;
};

// Meant to be hit on a daily schedule (Vercel Cron once deployed, or a
// manual curl during dev — see scripts/send-mock-order.sh). Sends any
// sequence step that's come due, plus today's birthday rewards.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  let sequenceSent = 0;
  let sequenceFailed = 0;

  const { data: dueSends, error: dueError } = await supabase
    .from("sequence_sends")
    .select(
      "id, customers(name, email, birthday_capture_token), sequence_steps(subject, body), orders(reference, order_items(item_name), fulfilment_date, fulfilment_time, fulfilment_location)"
    )
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .returns<DueSendRow[]>();

  if (dueError) {
    return NextResponse.json({ error: "Could not load due sequence sends" }, { status: 500 });
  }

  for (const send of dueSends ?? []) {
    const { customers: customer, sequence_steps: step, orders: order } = send;
    if (!customer?.email || !step) {
      await supabase.from("sequence_sends").update({ status: "failed" }).eq("id", send.id);
      sequenceFailed++;
      continue;
    }

    try {
      const mergeVars = buildMergeVars({
        customer,
        order: order ? { reference: order.reference } : undefined,
        items: order?.order_items.map((i) => ({ name: i.item_name })),
        fulfilment: order
          ? { date: order.fulfilment_date, time: order.fulfilment_time, location: order.fulfilment_location }
          : undefined,
      });
      await sendEmail({
        to: customer.email,
        subject: renderTemplate(step.subject, mergeVars),
        text: renderTemplate(step.body, mergeVars),
      });
      await supabase
        .from("sequence_sends")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", send.id);
      sequenceSent++;
    } catch (err) {
      console.error("[cron] failed to send sequence step", err);
      await supabase.from("sequence_sends").update({ status: "failed" }).eq("id", send.id);
      sequenceFailed++;
    }
  }

  let birthdaysSent = 0;
  const { data: birthdayStep } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("is_birthday", true)
    .eq("active", true)
    .maybeSingle();

  if (birthdayStep) {
    const today = new Date();
    const currentYear = today.getFullYear();

    const { data: candidates } = await supabase
      .from("customers")
      .select("*")
      .not("birthday", "is", null)
      .not("email", "is", null)
      .returns<Customer[]>();

    for (const customer of candidates ?? []) {
      const birthday = new Date(customer.birthday!);
      const isToday =
        birthday.getUTCMonth() === today.getUTCMonth() && birthday.getUTCDate() === today.getUTCDate();
      if (!isToday || customer.birthday_reward_sent_year === currentYear) continue;

      try {
        const mergeVars = buildMergeVars({ customer });
        await sendEmail({
          to: customer.email!,
          subject: renderTemplate(birthdayStep.subject, mergeVars),
          text: renderTemplate(birthdayStep.body, mergeVars),
        });
        await supabase
          .from("customers")
          .update({ birthday_reward_sent_year: currentYear })
          .eq("id", customer.id);
        birthdaysSent++;
      } catch (err) {
        console.error("[cron] failed to send birthday email", err);
      }
    }
  }

  return NextResponse.json({ sequenceSent, sequenceFailed, birthdaysSent });
}
