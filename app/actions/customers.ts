
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";

// Only authenticated, active owners can manage customers.
async function requireOwner() {
  const userId = await getSessionUserId();

  if (!userId) {
    throw new Error("Unauthorized. Please sign in.");
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function getCustomerData(formData: FormData) {
  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const contactName = String(
    formData.get("contactName") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const phone = String(
    formData.get("phone") ?? ""
  ).trim();

  const address = String(
    formData.get("address") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (name.length > 200) {
    throw new Error("Customer name is too long.");
  }

  if (contactName.length > 200) {
    throw new Error("Contact name is too long.");
  }

  if (email.length > 254) {
    throw new Error("Email address is too long.");
  }

  if (phone.length > 50) {
    throw new Error("Phone number is too long.");
  }

  if (address.length > 1000) {
    throw new Error("Address is too long.");
  }

  if (notes.length > 5000) {
    throw new Error("Notes are too long.");
  }

  return {
    name,
    contactName: contactName || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    notes: notes || null,
  };
}

export async function createCustomer(
  formData: FormData
) {
  // Verify authorization before creating a customer.
  await requireOwner();

  const data = getCustomerData(formData);

  await db.orm.public.Customer.create(data);

  revalidatePath("/customers");

  redirect("/customers");
}

export async function updateCustomer(
  formData: FormData
) {
  // Verify authorization before editing a customer.
  await requireOwner();

  const customerId = Number(
    formData.get("customerId")
  );

  if (
    !Number.isSafeInteger(customerId) ||
    customerId <= 0
  ) {
    throw new Error("Invalid customer ID.");
  }

  const existingCustomer =
    await db.orm.public.Customer.first({
      id: customerId,
    });

  if (!existingCustomer) {
    throw new Error("Customer not found.");
  }

  const data = getCustomerData(formData);

  await db.orm.public.Customer
    .where({ id: customerId })
    .update(data);

  revalidatePath("/customers");
  revalidatePath(
    `/customers/${customerId}/edit`
  );

  redirect("/customers");
}
