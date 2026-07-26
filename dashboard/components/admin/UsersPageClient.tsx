"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { createUser, deleteUser, getUsers, updateUserRole, type ManagedUser, type UserProfile } from "@/services/api";
import { useApiSession } from "@/components/operations/useApiSession";

const roles: UserProfile["role"][] = ["ADMINISTRATOR", "SUPERVISOR", "MAINTENANCE_OFFICER"];

export default function UsersPageClient() {
  const ready = useApiSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setUsers(await getUsers()); } catch { setError("Users could not be loaded."); } }, []);
  useEffect(() => {
    const id = window.setTimeout(() => { if (ready) void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [ready, load]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      await createUser({ full_name: String(form.get("name")), email: String(form.get("email")), password: String(form.get("password")), role: String(form.get("role")) as UserProfile["role"] });
      event.currentTarget.reset(); await load();
    } catch { setError("The user could not be created."); }
  };
  return <AppShell><main className="mx-auto max-w-6xl space-y-6 p-6 pt-20">
    <header><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Administration</p><h1 className="mt-2 text-3xl font-black">User management</h1></header>
    {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-5">
      <input required name="name" placeholder="Full name" className="rounded-lg border p-2"/><input required type="email" name="email" placeholder="Email" className="rounded-lg border p-2"/><input required minLength={8} type="password" name="password" placeholder="Temporary password" className="rounded-lg border p-2"/><select name="role" className="rounded-lg border p-2">{roles.map((role)=><option key={role}>{role}</option>)}</select><button className="rounded-lg bg-cyan-700 font-bold text-white">Create user</button>
    </form>
    <section className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Name","Email","Role","Created","Action"].map((x)=><th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{users.map((user)=><tr key={user.id} className="border-t"><td className="p-4 font-bold">{user.full_name}</td><td className="p-4">{user.email}</td><td className="p-4"><select value={user.role} onChange={async(e)=>{await updateUserRole(user.id,e.target.value as UserProfile["role"]);await load()}} className="rounded border p-2">{roles.map((role)=><option key={role}>{role}</option>)}</select></td><td className="p-4">{new Date(user.created_at).toLocaleDateString("en-UG")}</td><td className="p-4"><button onClick={async()=>{await deleteUser(user.id);await load()}} className="font-bold text-red-700">Delete</button></td></tr>)}</tbody></table></section>
  </main></AppShell>;
}
