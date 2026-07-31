"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import type { ManagedUser } from "@/services/api";
import {
  MANAGED_ROLES,
  apiErrorMessage,
  roleLabel,
  titleCaseName,
  validateUserDetails,
  type CreateUserValues,
  type ManagedRole,
  type UserFormField,
} from "./userManagement";

type CreateProps = {
  mode: "create";
  user?: never;
  onSubmit: (values: CreateUserValues) => Promise<void>;
};
type EditProps = {
  mode: "edit";
  user: ManagedUser;
  onSubmit: (values: CreateUserValues) => Promise<void>;
};
type Props = (CreateProps | EditProps) & { onClose: () => void };

const emptyValues: CreateUserValues = {
  fullName: "",
  email: "",
  password: "",
  role: "SUPERVISOR",
};

export default function UserFormModal(props: Props) {
  const titleId = useId();
  const [values, setValues] = useState<CreateUserValues>(() =>
    props.mode === "create"
      ? emptyValues
      : { fullName: props.user.full_name, email: props.user.email, password: "", role: props.user.role as ManagedRole },
  );
  const [errors, setErrors] = useState<Partial<Record<UserFormField | "form", string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) props.onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props, submitting]);

  const setField = <K extends keyof CreateUserValues>(field: K, value: CreateUserValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };
  const fieldClass = (field: UserFormField) =>
    `h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
      errors[field] ? "border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-cyan-700 focus:ring-cyan-100"
    }`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = { ...values, fullName: titleCaseName(values.fullName), email: values.email.trim().toLowerCase() };
    const validationErrors = validateUserDetails(normalized, props.mode === "create");
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await props.onSubmit(normalized);
    } catch (error) {
      const message = apiErrorMessage(error, props.mode === "create" ? "The user could not be created." : "The user could not be updated.");
      setErrors(message.toLowerCase().includes("email") ? { email: message } : { form: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) props.onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-slate-900">{props.mode === "create" ? "Add user" : "Edit user"}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {props.mode === "create" ? "Create an account and assign its access level." : `Update ${props.user.full_name}'s SSMEAS account.`}
            </p>
          </div>
          <button type="button" onClick={props.onClose} disabled={submitting} title="Close dialog" aria-label="Close dialog" className="h-9 w-9 rounded-md text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900">×</button>
        </header>

        <form onSubmit={submit} noValidate className="space-y-5 px-6 py-5">
          {errors.form && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</p>}
          <div>
            <label htmlFor={`${titleId}-name`} className="mb-1.5 block text-sm font-semibold text-slate-800">Full Name</label>
            <input id={`${titleId}-name`} value={values.fullName} autoFocus
              onChange={(event) => setField("fullName", event.target.value)}
              onBlur={() => setField("fullName", titleCaseName(values.fullName))}
              placeholder="e.g. Sarah Namusoke" autoComplete="name" className={fieldClass("fullName")} aria-invalid={Boolean(errors.fullName)} />
            {errors.fullName && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor={`${titleId}-email`} className="mb-1.5 block text-sm font-semibold text-slate-800">Email Address</label>
            <input id={`${titleId}-email`} type="email" value={values.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="name@ssmeas.local" autoComplete="email" className={fieldClass("email")} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor={`${titleId}-password`} className="mb-1.5 block text-sm font-semibold text-slate-800">
              {props.mode === "create" ? "Temporary Password" : "New SSMEAS Password"}
              {props.mode === "edit" && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
            </label>
            <div className="relative">
              <input id={`${titleId}-password`} type={showPassword ? "text" : "password"} value={values.password}
                onChange={(event) => setField("password", event.target.value)}
                placeholder={props.mode === "create" ? "At least 8 characters" : "Leave blank to keep current password"}
                autoComplete="new-password" className={`${fieldClass("password")} pr-16`} aria-invalid={Boolean(errors.password)} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-2 px-2 text-xs font-bold text-cyan-800 hover:text-cyan-950"
                aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor={`${titleId}-role`} className="mb-1.5 block text-sm font-semibold text-slate-800">Role</label>
            <select id={`${titleId}-role`} value={values.role} onChange={(event) => setField("role", event.target.value as ManagedRole)}
              className={fieldClass("role")} aria-invalid={Boolean(errors.role)}>
              {MANAGED_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
            {errors.role && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.role}</p>}
          </div>

          <footer className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={props.onClose} disabled={submitting} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Saving..." : props.mode === "create" ? "Create user" : "Save changes"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
