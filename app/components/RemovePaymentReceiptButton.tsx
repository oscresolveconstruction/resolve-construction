"use client";

import { useState } from "react";
import { removePaymentReceipt } from "../actions/payments";

type Props = {
  projectId: number;
  paymentId: number;
};

export default function RemovePaymentReceiptButton({
  projectId,
  paymentId,
}: Props) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    const confirmed = window.confirm(
      "Are you sure you want to remove this payment receipt? The payment itself will not be deleted."
    );

    if (!confirmed) return;

    setIsRemoving(true);

    try {
      const formData = new FormData();
      formData.set("projectId", String(projectId));
      formData.set("paymentId", String(paymentId));

      await removePaymentReceipt(formData);

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not remove the receipt."
      );
      setIsRemoving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isRemoving}
      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isRemoving ? "Removing..." : "Remove Receipt"}
    </button>
  );
}