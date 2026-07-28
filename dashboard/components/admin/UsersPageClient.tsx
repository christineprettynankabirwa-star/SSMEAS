"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { useApiSession } from "@/components/operations/useApiSession";
import { useAuth } from "@/auth/AuthContext";
import { createUser, deleteUser, getUsers, updateUserRole, type ManagedUser } from "@/services/api";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import UserFormModal from "./UserFormModal";
import UsersTable from "./UsersTable";
import { apiErrorMessage, type CreateUserValues, type ManagedRole } from "./userManagement";

type Feedback = { tone: "success" | "error"; message: string } | null;

export default function UsersPageClient() {
  const ready = useApiSession();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
    } catch (error) {
      setFeedback({ tone: "error", message: apiErrorMessage(error, "Users could not be loaded.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (ready) void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [ready, load]);

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const id = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const addUser = async (values: CreateUserValues) => {
    const created = await createUser({
      full_name: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role,
    });
    setUsers((current) => [created, ...current]);
    setCreating(false);
    setFeedback({ tone: "success", message: "User created successfully." });
  };

  const editRole = async (role: ManagedRole) => {
    if (!editingUser) return;
    const updated = await updateUserRole(editingUser.id, role);
    setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    setEditingUser(null);
    setFeedback({ tone: "success", message: `${updated.full_name}'s role was updated.` });
  };

  const removeUser = async () => {
    if (!deletingUser) return;
    await deleteUser(deletingUser.id);
    const deletedName = deletingUser.full_name;
    setUsers((current) => current.filter((item) => item.id !== deletingUser.id));
    setDeletingUser(null);
    setFeedback({ tone: "success", message: `${deletedName} was deleted.` });
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl space-y-5 p-5 pt-20 sm:p-6 sm:pt-20">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Administration</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">User management</h1>
            <p className="mt-2 text-sm text-slate-600">Manage staff accounts and access levels.</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="h-11 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-cyan-800">
            + Add User
          </button>
        </header>

        {feedback && <div role={feedback.tone === "error" ? "alert" : "status"}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
            feedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" title="Dismiss message" className="ml-4 text-lg leading-none">×</button>
        </div>}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <UsersTable users={users} loading={loading} currentUserId={currentUser?.id} onEdit={setEditingUser} onDelete={setDeletingUser} />
        </div>
      </main>

      {creating && <UserFormModal mode="create" onClose={() => setCreating(false)} onSubmit={addUser} />}
      {editingUser && <UserFormModal mode="edit" user={editingUser} onClose={() => setEditingUser(null)} onSubmit={editRole} />}
      {deletingUser && <ConfirmDeleteModal user={deletingUser} onClose={() => setDeletingUser(null)} onConfirm={removeUser} />}
    </AppShell>
  );
}
