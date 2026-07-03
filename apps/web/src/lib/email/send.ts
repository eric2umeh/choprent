type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/** Send email via Resend when configured; otherwise log in development. */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "ChopRent <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev]", input.to, input.subject);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        "Email not configured. Add RESEND_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body || res.statusText };
  }

  return { ok: true };
}

export function arrearsReminderEmailHtml(input: {
  tenantName: string;
  unitCode: string;
  balance: number;
  orgName: string;
  portalUrl: string;
}): string {
  const balance = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(input.balance);

  return `
    <p>Dear ${input.tenantName},</p>
    <p>This is a reminder that your rent for <strong>Unit ${input.unitCode}</strong> at ${input.orgName} has an outstanding balance of <strong>${balance}</strong>.</p>
    <p>Please transfer to your shop account or upload your receipt in the tenant portal:</p>
    <p><a href="${input.portalUrl}">${input.portalUrl}</a></p>
    <p>Thank you.</p>
  `;
}
