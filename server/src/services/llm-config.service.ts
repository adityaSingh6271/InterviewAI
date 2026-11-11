import { randomUUID } from "node:crypto";
import { organizationRepository } from "../repositories/organization.repository";
import { llmConfigRepository } from "../repositories/llm-config.repository";
import type { AuthUser } from "../types/auth.types";
import type { ListParams, LlmConfig, Paginated } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { encryptSecret } from "../utils/encryption.util";
import { requireRoleRank, ROLE_RANK } from "../utils/scope.util";

/**
 * Organization LLM config service (PDF 13).
 *
 * The API key is write-only: it is AES-256-GCM encrypted here before it
 * reaches the repository and is never part of any read result - only the
 * masked provider/model metadata crosses the API boundary.
 */

function requireSuper(actor: AuthUser): void {
  requireRoleRank(actor, ROLE_RANK.SUPER_ADMIN);
}

async function organizationExists(organizationId: string): Promise<void> {
  const organization = await organizationRepository.findById(organizationId);
  if (!organization) throw AppError.notFound("Organization not found");
}

export const llmConfigService = {
  async list(
    actor: AuthUser,
    organizationId: string,
    params: ListParams,
  ): Promise<Paginated<LlmConfig>> {
    requireSuper(actor);
    await organizationExists(organizationId);
    return llmConfigRepository.list(organizationId, params);
  },

  async getById(actor: AuthUser, organizationId: string, id: string): Promise<LlmConfig> {
    requireSuper(actor);
    const config = await llmConfigRepository.findById(organizationId, id);
    if (!config) throw AppError.notFound("LLM config not found");
    return config;
  },

  async create(
    actor: AuthUser,
    organizationId: string,
    input: {
      provider: string;
      modelName: string;
      apiKey: string;
      settings: Record<string, unknown> | null;
      isActive: boolean;
    },
  ): Promise<LlmConfig> {
    requireSuper(actor);
    await organizationExists(organizationId);
    try {
      return await llmConfigRepository.create({
        id: randomUUID(),
        organizationId,
        provider: input.provider,
        modelName: input.modelName,
        apiKeyEncrypted: encryptSecret(input.apiKey),
        settings: input.settings,
        isActive: input.isActive,
      });
    } catch (error) {
      if ((error as { code?: unknown }).code === "23503") {
        throw AppError.conflict("Organization does not exist");
      }
      throw error;
    }
  },

  async update(
    actor: AuthUser,
    organizationId: string,
    id: string,
    input: {
      provider?: string;
      modelName?: string;
      apiKey?: string;
      settings?: Record<string, unknown>;
      isActive?: boolean;
    },
  ): Promise<LlmConfig> {
    requireSuper(actor);
    const updated = await llmConfigRepository.update(organizationId, id, {
      ...input,
      apiKeyEncrypted: input.apiKey !== undefined ? encryptSecret(input.apiKey) : undefined,
    });
    if (!updated) throw AppError.notFound("LLM config not found");
    return updated;
  },

  async remove(actor: AuthUser, organizationId: string, id: string): Promise<void> {
    requireSuper(actor);
    const removed = await llmConfigRepository.remove(organizationId, id);
    if (!removed) throw AppError.notFound("LLM config not found");
  },
};
