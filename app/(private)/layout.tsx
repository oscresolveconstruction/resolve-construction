import { requireActiveUser } from "../lib/require-active-user";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireActiveUser();

  return <>{children}</>;
}