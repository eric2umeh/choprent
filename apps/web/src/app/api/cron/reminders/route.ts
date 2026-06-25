import { sendArrearsReminders } from "@/lib/reminders/evaluate-arrears";
import { NextResponse } from "next/server";

/** Daily cron: POST with Authorization: Bearer CRON_SECRET */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendArrearsReminders();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
