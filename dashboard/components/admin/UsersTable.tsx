"use client";

import { useMemo, useState } from "react";
import type { ManagedUser } from "@/services/api";
import { MANAGED_ROLES, roleBadgeClass, roleLabel } from "./userManagement";

type SortKey = "name" | "role" | "created";
type SortDirection = "asc" | "desc";
const PAGE_SIZE = 8;

interface Props {
  users: ManagedUser[];
  loading: boolean;
  currentUserId?: string;
  onEdit: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}

export default function UsersTable({ users, loading, currentUserId, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter((user) =>
        (!normalizedQuery || user.full_name.toLowerCase().includes(normalizedQuery) || user.email.toLowerCase().includes(normalizedQuery))
        && (role === "ALL" || user.role === role))
      .sort((left, right) => {
        const leftValue = sortKey === "name" ? left.full_name : sortKey === "role" ? roleLabel(left.role) : left.created_at;
        const rightValue = sortKey === "name" ? right.full_name : sortKey === "role" ? roleLabel(right.role) : right.created_at;
        const comparison = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [query, role, sortDirection, sortKey, users]);

  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = visibleUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstResult = visibleUsers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(currentPage * PAGE_SIZE, visibleUsers.length);

  const sort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };
  const sortIndicator = (key: SortKey) => key === sortKey ? (sortDirection === "asc" ? " ↑" : " ↓") : "";

  return (
    <section aria-label="Users">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
          <label htmlFor="user-search" className="sr-only">Search users by name or email</label>
          <input id="user-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search by name or email" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" />
        </div>
        <div className="sm:w-56">
          <label htmlFor="role-filter" className="sr-only">Filter users by role</label>
          <select id="role-filter" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100">
            <option value="ALL">All roles</option>
            {MANAGED_ROLES.map((managedRole) => <option value={managedRole} key={managedRole}>{roleLabel(managedRole)}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold"><button type="button" onClick={() => sort("name")} className="hover:text-slate-950">Name{sortIndicator("name")}</button></th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold"><button type="button" onClick={() => sort("role")} className="hover:text-slate-950">Role{sortIndicator("role")}</button></th>
              <th className="px-5 py-3 font-semibold"><button type="button" onClick={() => sort("created")} className="hover:text-slate-950">Created{sortIndicator("created")}</button></th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pageUsers.map((user) => (
              <tr key={user.id} className="bg-white transition hover:bg-slate-50/80">
                <td className="px-5 py-4 font-semibold text-slate-900">{user.full_name}{user.id === currentUserId && <span className="ml-2 text-xs font-normal text-slate-500">(You)</span>}</td>
                <td className="px-5 py-4 text-slate-600">{user.email}</td>
                <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${roleBadgeClass(user.role)}`}>{roleLabel(user.role)}</span></td>
                <td className="px-5 py-4 text-slate-600">{new Date(user.created_at).toLocaleDateString("en-UG")}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => onEdit(user)} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">Edit</button>
                    <button type="button" onClick={() => onDelete(user)} disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? "You cannot delete your own account" : `Delete ${user.full_name}`}
                      aria-label={`Delete ${user.full_name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-base text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !pageUsers.length && <div className="px-5 py-14 text-center"><p className="font-semibold text-slate-700">No users found</p><p className="mt-1 text-sm text-slate-500">Adjust the search or role filter.</p></div>}
        {loading && <div className="px-5 py-14 text-center text-sm text-slate-500">Loading users...</div>}
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {firstResult}–{lastResult} of {visibleUsers.length} users</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="h-9 rounded-md border border-slate-300 px-3 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <span className="min-w-24 text-center">Page {currentPage} of {pageCount}</span>
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            className="h-9 rounded-md border border-slate-300 px-3 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      </footer>
    </section>
  );
}
