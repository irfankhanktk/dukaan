import { Eye } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { startViewAs } from "@/app/actions/view-as";

/** "View as shopkeeper": the admin's own session with this shop selected (logged in audit_log). */
export function ViewAsButton({
  shopId,
  next = "/dashboard",
  label = "View as shopkeeper",
  variant = "secondary",
  size,
  className,
}: {
  shopId: string;
  /** Dashboard page to open, e.g. "/dashboard/menu" */
  next?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return (
    <form action={startViewAs.bind(null, shopId, next)} className={className}>
      <Button type="submit" variant={variant} size={size}>
        <Eye /> {label}
      </Button>
    </form>
  );
}
