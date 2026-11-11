"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import type { AdminAccount, AdminRole, Institute } from "@/lib/api/admin";
import {
  adminAccountSchema,
  type AdminAccountFormValues,
} from "@/lib/validations/adminValidations";
import { applyApiFormError } from "@/lib/formErrors";
import { getErrorMessage } from "@/lib/api/errors";
import { ADMIN_ROLE_LABELS } from "@/lib/adminRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Create/edit dialog for an admin account. One component for both modes -
 * the schema factory enforces a required password on create and treats a
 * blank one on edit as "keep current"; RBAC decisions (which roles may be
 * assigned, whether the role/institute fields apply) arrive as props from the
 * page, which holds the acting user's rank.
 */
export interface AdminAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode. */
  account: AdminAccount | null;
  /** Roles the actor may assign (rank-filtered by the page). */
  assignableRoles: AdminRole[];
  /** Institute choices; hidden entirely when the flag is false. */
  institutes: Institute[];
  showInstituteField: boolean;
  /** Acting user id - locks the role field on self-edit (server 409 rule). */
  currentUserId: string;
  onSubmit: (values: AdminAccountFormValues) => Promise<void>;
}

export default function AdminAccountDialog({
  open,
  onOpenChange,
  account,
  assignableRoles,
  institutes,
  showInstituteField,
  currentUserId,
  onSubmit,
}: AdminAccountDialogProps) {
  const isCreate = account === null;
  const isSelf = !isCreate && account.id === currentUserId;
  const defaultRole = assignableRoles[0] ?? "INSTITUTE_ADMIN";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminAccountFormValues>({
    resolver: zodResolver(adminAccountSchema(isCreate ? "create" : "edit")),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: defaultRole,
    },
    mode: "onTouched",
  });

  // Re-hydrate every time the dialog opens (create vs different target row).
  useEffect(() => {
    if (!open) return;
    reset(
      isCreate
        ? { name: "", email: "", password: "", role: defaultRole }
        : {
            name: account.name,
            email: account.email,
            password: "",
            role: (account.adminRole as AdminRole) || defaultRole,
            instituteId: account.instituteId || undefined,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account?.id, isCreate]);

  const submit = handleSubmit(async (values) => {
    try {
      const password = values.password?.trim() || undefined;
      if (isCreate && !password) {
        setError("password", { message: "Password is required." });
        return;
      }
      await onSubmit({ ...values, password });
    } catch (error) {
      applyApiFormError(error, setError);
      toast.error(
        getErrorMessage(
          error,
          isCreate
            ? "Couldn't create the admin account."
            : "Couldn't save your changes.",
        ),
      );
    }
  });

  const roleValue = useWatch({ control, name: "role" });
  const instituteValue = useWatch({ control, name: "instituteId" });

  const fieldError = (name: keyof AdminAccountFormValues) =>
    errors[name] ? (
      <p className="text-xs text-red-600" data-testid={`error-${String(name)}`}>
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="admin-account-dialog">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Add admin account" : "Edit admin account"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Provision a new administrator. The role determines what they can manage."
              : "Update this administrator's profile, role, or institute."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="admin-account-name">Full name</Label>
            <Input
              id="admin-account-name"
              data-testid="admin-name"
              placeholder="Jane Admin"
              autoComplete="off"
              {...register("name")}
            />
            {fieldError("name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-account-email">Email</Label>
            <Input
              id="admin-account-email"
              type="email"
              data-testid="admin-email"
              placeholder="jane@example.com"
              autoComplete="off"
              {...register("email")}
            />
            {fieldError("email")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-account-password">Password</Label>
            <Input
              id="admin-account-password"
              type="password"
              data-testid="admin-password"
              placeholder={isCreate ? "Min. 8 characters" : "Leave blank to keep current"}
              autoComplete="new-password"
              {...register("password")}
            />
            {fieldError("password")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-account-role">Role</Label>
            <Select
              value={roleValue}
              onValueChange={(value) =>
                setValue("role", value as AdminRole, { shouldValidate: true })
              }
              disabled={isSelf}
            >
              <SelectTrigger
                id="admin-account-role"
                className="w-full"
                data-testid="admin-role"
                aria-invalid={Boolean(errors.role)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-slate-400">
                You can&apos;t change your own role.
              </p>
            )}
            {fieldError("role")}
          </div>

          {showInstituteField && (
            <div className="space-y-1.5">
              <Label htmlFor="admin-account-institute">Institute</Label>
              <Select
                value={instituteValue}
                onValueChange={(value) =>
                  setValue("instituteId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="admin-account-institute"
                  className="w-full"
                  data-testid="admin-institute"
                >
                  <SelectValue placeholder="Default: my institute" />
                </SelectTrigger>
                <SelectContent>
                  {institutes.map((institute) => (
                    <SelectItem key={institute.id} value={institute.id}>
                      {institute.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("instituteId")}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="admin-account-submit"
            >
              {isSubmitting ? "Saving..." : isCreate ? "Create account" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
