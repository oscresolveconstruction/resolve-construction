import "server-only";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "./auth";
import { redirect, notFound } from "next/navigation";

export async function requireActiveUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  // A disabled or deleted account must not access company data.
  if (!user || !user.isActive) {
    notFound();
  }

  return user;
}