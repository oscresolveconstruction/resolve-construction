
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { hash } from "bcryptjs";
import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const db = postgres({
  contractJson,
  url: process.env.DATABASE_URL,
});

const rl = createInterface({ input, output });

try {
  const name = (await rl.question("Owner name: ")).trim();
  const email = (await rl.question("Owner email: "))
    .trim()
    .toLowerCase();

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid name and email.");
  }

  const existing = await db.orm.public.AppUser.first({ email });

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  console.log(
    "Password input will be visible in this terminal. " +
    "Make sure nobody can see your screen."
  );

  const password = await rl.question("Password (12+ characters): ");

  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }

  const passwordHash = await hash(password, 12);

  await db.orm.public.AppUser.create({
    name,
    email,
    passwordHash,
    isActive: true,
  });

  console.log(`Account created successfully for ${email}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Unable to create account."
  );
  process.exitCode = 1;
} finally {
  rl.close();
}
