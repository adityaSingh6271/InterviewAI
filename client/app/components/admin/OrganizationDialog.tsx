"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import type { Organization } from "@/lib/api/admin";
import {
  organizationSchema,
  type OrganizationFormValues,
} from "@/lib/validations/adminValidations";
import { applyApiFormError } from "@/lib/formErrors";
import { getErrorMessage } from "@/lib/api/errors";
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

/** Create/edit dialog for an organization (SUPER_ADMIN only, single name field). */
export interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode. */
  organization: Organization | null;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
}

export default function OrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSubmit,
}: OrganizationDialogProps) {
  const isCreate = organization === null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: organization?.name ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organization?.id, isCreate]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ name: values.name.trim() });
    } catch (error) {
      applyApiFormError(error, setError);
      toast.error(
        getErrorMessage(
          error,
          isCreate ? "Couldn't create the organization." : "Couldn't save your changes.",
        ),
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="organization-dialog">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Add organization" : "Edit organization"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Organizations group institutes and own their LLM configuration."
              : "Rename this organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="organization-name">Name</Label>
            <Input
              id="organization-name"
              data-testid="organization-name"
              placeholder="Acme Education Group"
              autoComplete="off"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600" data-testid="error-name">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="organization-submit">
              {isSubmitting ? "Saving..." : isCreate ? "Create organization" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
