"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import type { Institute, Organization } from "@/lib/api/admin";
import {
  instituteSchema,
  type InstituteFormValues,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Create/edit dialog for an institute. The organization field only appears
 * for SUPER_ADMIN (moving between orgs is super-admin territory server-side;
 * others default to their own organization).
 */
export interface InstituteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode. */
  institute: Institute | null;
  /** Organization choices (SUPER_ADMIN only; hidden when flag is false). */
  organizations: Organization[];
  showOrganizationField: boolean;
  onSubmit: (values: InstituteFormValues) => Promise<void>;
}

export default function InstituteDialog({
  open,
  onOpenChange,
  institute,
  organizations,
  showOrganizationField,
  onSubmit,
}: InstituteDialogProps) {
  const isCreate = institute === null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InstituteFormValues>({
    resolver: zodResolver(instituteSchema),
    defaultValues: { name: "", joinCode: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    reset(
      isCreate
        ? { name: "", joinCode: "" }
        : {
            name: institute.name,
            joinCode: institute.joinCode,
            organizationId: institute.organizationId || undefined,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, institute?.id, isCreate]);

  const organizationValue = useWatch({ control, name: "organizationId" });

  const submit = handleSubmit(async (values) => {
    try {
      const joinCode = values.joinCode?.trim().toUpperCase() || undefined;
      await onSubmit({ ...values, joinCode });
    } catch (error) {
      applyApiFormError(error, setError);
      toast.error(
        getErrorMessage(
          error,
          isCreate ? "Couldn't create the institute." : "Couldn't save your changes.",
        ),
      );
    }
  });

  const fieldError = (name: keyof InstituteFormValues) =>
    errors[name] ? (
      <p className="text-xs text-red-600" data-testid={`error-${String(name)}`}>
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="institute-dialog">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add institute" : "Edit institute"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Institutes are the tenant units students register into with a join code."
              : "Rename the institute or rotate its student join code."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="institute-name">Name</Label>
            <Input
              id="institute-name"
              data-testid="institute-name"
              placeholder="State University of Tech"
              autoComplete="off"
              {...register("name")}
            />
            {fieldError("name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="institute-join-code">Join code</Label>
            <Input
              id="institute-join-code"
              data-testid="institute-join-code"
              placeholder={isCreate ? "Blank = auto-generate (A-Z, 0-9)" : "Blank = keep current"}
              autoComplete="off"
              className="uppercase"
              {...register("joinCode")}
            />
            {fieldError("joinCode")}
          </div>

          {showOrganizationField && (
            <div className="space-y-1.5">
              <Label htmlFor="institute-organization">Organization</Label>
              <Select
                value={organizationValue}
                onValueChange={(value) =>
                  setValue("organizationId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="institute-organization"
                  className="w-full"
                  data-testid="institute-organization"
                >
                  <SelectValue placeholder="Default: my institute's organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("organizationId")}
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
              data-testid="institute-submit"
            >
              {isSubmitting ? "Saving..." : isCreate ? "Create institute" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
