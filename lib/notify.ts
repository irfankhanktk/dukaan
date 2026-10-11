import "server-only";

/**
 * Email notifications via Resend's HTTP API (no SDK). Optional: when RESEND_API_KEY or
 * REQUEST_NOTIFY_EMAIL is unset we log a warning and skip. Never throws — callers must not
 * fail the user's action because an email could not be sent.
 */

type NewRequestEmail = {
  owner_name: string;
  shop_name: string;
  business_type: string;
  city: string | null;
  area: string | null;
  whatsapp_number: string;
  preferred_time: string | null;
  source: string;
  adminUrl: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY not set — skipping email:", subject);
    return false;
  }
  const from = process.env.RESEND_FROM || "Dukaan <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[notify] Resend error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] email send failed:", err);
    return false;
  }
}

/** Tells the platform owner a new shop request arrived. */
export async function notifyNewShopRequest(req: NewRequestEmail): Promise<boolean> {
  const to = process.env.REQUEST_NOTIFY_EMAIL;
  if (!to) {
    console.warn("[notify] REQUEST_NOTIFY_EMAIL not set — skipping new request email");
    return false;
  }
  const rows: [string, string][] = [
    ["Shop", req.shop_name],
    ["Owner", req.owner_name],
    ["Business type", req.business_type],
    ["City", req.city ?? "—"],
    ["Area", req.area ?? "—"],
    ["WhatsApp", `+${req.whatsapp_number}`],
    ["Preferred time", req.preferred_time ?? "—"],
    ["Source", req.source],
  ];
  const text = [
    "New shop request on Dukaan",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open requests: ${req.adminUrl}`,
    `WhatsApp: https://wa.me/${req.whatsapp_number}`,
  ].join("\n");
  const html = `
<div style="font-family:system-ui,sans-serif;color:#1F1D1A">
  <h2 style="color:#0F5C4A;margin:0 0 12px">New shop request</h2>
  <table cellpadding="6" style="border-collapse:collapse">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#6B665D">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`,
      )
      .join("")}
  </table>
  <p style="margin-top:16px">
    <a href="${escapeHtml(req.adminUrl)}" style="background:#0F5C4A;color:#fff;padding:10px 16px;border-radius:12px;text-decoration:none">Open requests</a>
    &nbsp;
    <a href="https://wa.me/${escapeHtml(req.whatsapp_number)}" style="color:#15803D">WhatsApp them</a>
  </p>
</div>`;
  return sendEmail({
    to,
    subject: `New shop request: ${req.shop_name} (${req.city ?? "no city"})`,
    text,
    html,
  });
}
