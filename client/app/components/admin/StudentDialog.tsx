"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import type { Institute, StudentAccount } from "@/lib/api/admin";
import {
  studentSchema,
  type StudentFormValues,
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
 * Create/edit dialog for a student account. The institute field only appears
 * for SUPER_ADMIN - every other role is pinned to its own institute
 * server-side (`resolveTargetInstitute`), so showing it would be a lie.
 */
export interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode. */
  student: StudentAccount | null;
  /** Institute choices (SUPER_ADMIN only; hidden when flag is false). */
  institutes: Institute[];
  showInstituteField: boolean;
  onSubmit: (values: StudentFormValues) => Promise<void>;
}

export default function StudentDialog({
  open,
  onOpenChange,
  student,
  institutes,
  showInstituteField,
  onSubmit,
}: StudentDialogProps) {
  const isCreate = student === null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema(isCreate ? "create" : "edit")),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    reset(
      isCreate
        ? { name: "", email: "", password: "" }
        : {
            name: student.name,
            email: student.email,
            password: "",
            instituteId: student.instituteId || undefined,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id, isCreate]);

  const instituteValue = useWatch({ control, name: "instituteId" });

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
          isCreate ? "Couldn't create the student." : "Couldn't save your changes.",
        ),
      );
    }
  });

  const fieldError = (name: keyof StudentFormValues) =>
    errors[name] ? (
      <p className="text-xs text-red-600" data-testid={`error-${String(name)}`}>
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="student-dialog">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add student" : "Edit student"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Provision a candidate account in your institute."
              : "Update this student's profile or reset their password."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="student-name">Full name</Label>
            <Input
              id="student-name"
              data-testid="student-name"
              placeholder="Jane Candidate"
              autoComplete="off"
              {...register("name")}
            />
            {fieldError("name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="student-email">Email</Label>
            <Input
              id="student-email"
              type="email"
              data-testid="student-email"
              placeholder="jane@example.com"
              autoComplete="off"
              {...register("email")}
            />
            {fieldError("email")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="student-password">Password</Label>
            <Input
              id="student-password"
              type="password"
              data-testid="student-password"
              placeholder={isCreate ? "Min. 8 characters" : "Leave blank to keep current"}
              autoComplete="new-password"
              {...register("password")}
            />
            {fieldError("password")}
          </div>

          {showInstituteField && (
            <div className="space-y-1.5">
              <Label htmlFor="student-institute">Institute</Label>
              <Select
                value={instituteValue}
                onValueChange={(value) =>
                  setValue("instituteId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="student-institute"
                  className="w-full"
                  data-testid="student-institute"
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
            <Button type="submit" disabled={isSubmitting} data-testid="student-submit">
              {isSubmitting ? "Saving..." : isCreate ? "Create student" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
