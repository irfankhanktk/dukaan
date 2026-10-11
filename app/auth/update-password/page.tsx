import { UpdatePasswordForm } from "@/components/update-password-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>;
}) {
  const { first } = await searchParams;
  return <UpdatePasswordForm firstLogin={first === "1"} />;
}
