"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  KeyRound,
} from "lucide-react";

import type { LlmConfig } from "@/lib/api/admin";
import {
  llmConfigSchema,
  type LlmConfigFormValues,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

/**
 * Create/edit dialog for an organization LLM config.
 * - API key is write-only: required on create, "leave blank to keep" on edit, never echoed back.
 * - Key Format Validation verifies heuristics (e.g. sk- / gsk_ prefixes and length) for safer entry.
 * - Advanced settings expose custom Base URL (for Ollama/proxy endpoints), Temperature, and Max Tokens.
 */
export interface LlmConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode. */
  config: LlmConfig | null;
  onSubmit: (values: LlmConfigFormValues) => Promise<void>;
}

export default function LlmConfigDialog({
  open,
  onOpenChange,
  config,
  onSubmit,
}: LlmConfigDialogProps) {
  const isCreate = config === null;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LlmConfigFormValues>({
    resolver: zodResolver(llmConfigSchema(isCreate ? "create" : "edit")),
    defaultValues: {
      provider: "",
      modelName: "",
      apiKey: "",
      isActive: false,
      baseUrl: "",
      temperature: undefined,
      maxTokens: undefined,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    const settings = config?.settings as Record<string, unknown> | null | undefined;
    const hasAdvancedSettings = Boolean(
      settings?.baseUrl ||
        typeof settings?.temperature === "number" ||
        typeof settings?.maxTokens === "number",
    );
    setShowAdvanced(hasAdvancedSettings);

    reset(
      isCreate
        ? {
            provider: "",
            modelName: "",
            apiKey: "",
            isActive: false,
            baseUrl: "",
            temperature: undefined,
            maxTokens: undefined,
          }
        : {
            provider: config.provider,
            modelName: config.modelName,
            apiKey: "",
            isActive: config.isActive,
            baseUrl: (settings?.baseUrl as string) || "",
            temperature:
              typeof settings?.temperature === "number"
                ? settings.temperature
                : undefined,
            maxTokens:
              typeof settings?.maxTokens === "number"
                ? settings.maxTokens
                : undefined,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config?.id, isCreate]);

  const isActiveValue = useWatch({ control, name: "isActive" });
  const providerValue = useWatch({ control, name: "provider" });
  const apiKeyValue = useWatch({ control, name: "apiKey" });

  // Heuristic verification for provider API key formats
  const keyValidationStatus = useMemo(() => {
    const rawKey = apiKeyValue?.trim() || "";
    const provider = providerValue?.trim().toLowerCase() || "";

    if (!rawKey) {
      if (!isCreate) {
        return {
          status: "info" as const,
          label: "Current Key Preserved",
          message: "API key stored securely; leave blank to keep.",
          icon: Lock,
        };
      }
      return null;
    }

    if (rawKey.length < 8) {
      return {
        status: "danger" as const,
        label: "Too Short",
        message: "API key must be at least 8 characters.",
        icon: AlertTriangle,
      };
    }

    if (provider.includes("openai")) {
      if (rawKey.startsWith("sk-") || rawKey.startsWith("sk-proj-")) {
        return {
          status: "success" as const,
          label: "Valid OpenAI Format",
          message: "Key matches standard OpenAI secret format.",
          icon: CheckCircle2,
        };
      }
      return {
        status: "warning" as const,
        label: "Notice",
        message: "Standard OpenAI keys usually start with 'sk-' or 'sk-proj-'.",
        icon: AlertTriangle,
      };
    }

    if (provider.includes("groq")) {
      if (rawKey.startsWith("gsk_")) {
        return {
          status: "success" as const,
          label: "Valid Groq Format",
          message: "Key matches standard Groq API format.",
          icon: CheckCircle2,
        };
      }
      return {
        status: "warning" as const,
        label: "Notice",
        message: "Groq API keys typically begin with 'gsk_'.",
        icon: AlertTriangle,
      };
    }

    if (provider.includes("anthropic") || provider.includes("claude")) {
      if (rawKey.startsWith("sk-ant-")) {
        return {
          status: "success" as const,
          label: "Valid Anthropic Format",
          message: "Key matches standard Anthropic format.",
          icon: CheckCircle2,
        };
      }
      return {
        status: "warning" as const,
        label: "Notice",
        message: "Anthropic keys typically start with 'sk-ant-'.",
        icon: AlertTriangle,
      };
    }

    if (provider.includes("gemini")) {
      if (rawKey.length >= 25) {
        return {
          status: "success" as const,
          label: "Valid Gemini Format",
          message: "Key length aligns with Google AI Studio format.",
          icon: CheckCircle2,
        };
      }
    }

    return {
      status: "success" as const,
      label: "Format Verified",
      message: "Key format satisfies length requirement.",
      icon: CheckCircle2,
    };
  }, [apiKeyValue, providerValue, isCreate]);

  const submit = handleSubmit(async (values: LlmConfigFormValues) => {
    try {
      const apiKey = values.apiKey?.trim() || undefined;
      if (isCreate && !apiKey) {
        setError("apiKey", { message: "API key is required." });
        return;
      }
      await onSubmit({ ...values, apiKey });
    } catch (error) {
      applyApiFormError(error, setError);
      toast.error(
        getErrorMessage(
          error,
          isCreate
            ? "Couldn't create the configuration."
            : "Couldn't save your changes.",
        ),
      );
    }
  });

  const fieldError = (name: keyof LlmConfigFormValues) =>
    errors[name] ? (
      <p className="text-xs text-red-600" data-testid={`error-${String(name)}`}>
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-testid="llm-config-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>
                {isCreate ? "Add LLM Configuration" : "Edit LLM Configuration"}
              </DialogTitle>
              <DialogDescription>
                {isCreate
                  ? "Configure provider credentials and AI hyperparameters for this organization."
                  : "Update provider, model parameters, or rotate encrypted API credentials."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-1" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="llm-provider">Provider</Label>
              <Input
                id="llm-provider"
                data-testid="llm-provider"
                placeholder="openai, groq, anthropic, ollama"
                autoComplete="off"
                {...register("provider")}
              />
              {fieldError("provider")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model name</Label>
              <Input
                id="llm-model"
                data-testid="llm-model"
                placeholder="gpt-4o-mini, llama-3.3-70b-versatile"
                autoComplete="off"
                {...register("modelName")}
              />
              {fieldError("modelName")}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="llm-api-key" className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>API Key</span>
              </Label>
              {keyValidationStatus && (
                <Badge
                  variant={keyValidationStatus.status}
                  className="text-[11px] font-medium py-0 h-5"
                >
                  <keyValidationStatus.icon className="w-3 h-3 mr-1" />
                  {keyValidationStatus.label}
                </Badge>
              )}
            </div>
            <Input
              id="llm-api-key"
              type="password"
              data-testid="llm-api-key"
              placeholder={
                isCreate ? "Min. 8 characters" : "Leave blank to keep current key"
              }
              autoComplete="off"
              {...register("apiKey")}
            />
            {fieldError("apiKey")}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Stored encrypted; never echoed back after saving.</span>
              {keyValidationStatus?.message && (
                <span className="text-[11px] text-slate-500 italic">
                  {keyValidationStatus.message}
                </span>
              )}
            </div>
          </div>

          {/* Advanced Hyperparameters Accordion */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#0C356A]" />
                <span>Advanced Endpoint & Hyperparameters</span>
                {(useWatch({ control, name: "baseUrl" }) ||
                  useWatch({ control, name: "temperature" }) !== undefined ||
                  useWatch({ control, name: "maxTokens" }) !== undefined) && (
                  <Badge variant="soft" className="text-[10px] py-0 px-1.5 h-4">
                    Configured
                  </Badge>
                )}
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-3.5 space-y-3 bg-white border-t border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="llm-base-url" className="text-xs">
                      Custom Base URL (Optional)
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      Ollama / Local / Proxy endpoints
                    </span>
                  </div>
                  <Input
                    id="llm-base-url"
                    data-testid="llm-base-url"
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    className="text-xs"
                    autoComplete="off"
                    {...register("baseUrl")}
                  />
                  {fieldError("baseUrl")}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="llm-temp" className="text-xs">
                      Temperature (0.0 - 2.0)
                    </Label>
                    <Input
                      id="llm-temp"
                      data-testid="llm-temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      placeholder="0.7 (default)"
                      className="text-xs"
                      {...register("temperature", {
                        setValueAs: (v) =>
                          v === "" || v === null || isNaN(Number(v))
                            ? undefined
                            : Number(v),
                      })}
                    />
                    {fieldError("temperature")}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="llm-tokens" className="text-xs">
                      Max Completion Tokens
                    </Label>
                    <Input
                      id="llm-tokens"
                      data-testid="llm-max-tokens"
                      type="number"
                      step="128"
                      min="50"
                      max="32000"
                      placeholder="2048 (default)"
                      className="text-xs"
                      {...register("maxTokens", {
                        setValueAs: (v) =>
                          v === "" || v === null || isNaN(Number(v))
                            ? undefined
                            : parseInt(v, 10),
                      })}
                    />
                    {fieldError("maxTokens")}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="llm-active" className="cursor-pointer font-medium text-sm">
                Set as Active Configuration
              </Label>
              <p className="text-xs text-slate-500">
                Only the active config is utilized by the interview engine for candidate rounds.
              </p>
            </div>
            <Switch
              id="llm-active"
              checked={isActiveValue}
              onCheckedChange={(checked) =>
                setValue("isActive", checked, { shouldValidate: true })
              }
              data-testid="llm-active"
            />
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
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="llm-config-submit"
              className="bg-[#0C356A] hover:bg-[#0C356A]/90 text-white"
            >
              {isSubmitting
                ? "Saving..."
                : isCreate
                ? "Create Config"
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
