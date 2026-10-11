import "server-only";
import { createAdminClient } from "./supabase/admin";

/**
 * Write an audit_log entry from server code. Table writes a super admin makes through
 * their own session are logged automatically by the audit trigger in the database;
 * use this for actions the trigger cannot see (auth users, service-key writes, view-as).
 */
export async function logAudit(entry: {
  actorId: string;
  actorRole?: string;
  shopId?: string | null;
  action: string; // e.g. 'owner.create', 'owner.password_reset', 'shop.view_as'
  entity?: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole ?? "super_admin",
    shop_id: entry.shopId ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
  if (error) console.error("audit log write failed:", error.message);
}
