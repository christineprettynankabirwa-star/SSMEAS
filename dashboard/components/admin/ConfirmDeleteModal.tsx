"use client";

import { useEffect, useId, useState } from "react";
import type { ManagedUser } from "@/services/api";
import { apiErrorMessage } from "./userManagement";

interface Props {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ConfirmDeleteModal({ user, onClose, onConfirm }: Props) {
  const titleId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onClose]);

  const confirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "The user could not be deleted."));
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !deleting) onClose();
    }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <div aria-hidden="true" className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl text-red-700">!</div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">Delete user?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Are you sure you want to delete <strong className="text-slate-900">{user.full_name}</strong>? This action cannot be undone.
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <footer className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={deleting} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={deleting} className="h-10 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">
            {deleting ? "Deleting..." : "Delete user"}
          </button>
        </footer>
      </section>
    </div>
  );
}
