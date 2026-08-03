import { z } from "zod";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../constants.js";

const executionWorkspaceStrategySchema = z
  .object({
    type: z.enum(["project_primary", "git_worktree", "adapter_managed", "cloud_sandbox"]).optional(),
    baseRef: z.string().optional().nullable(),
    branchTemplate: z.string().optional().nullable(),
    worktreeParentDir: z.string().optional().nullable(),
    provisionCommand: z.string().optional().nullable(),
    teardownCommand: z.string().optional().nullable(),
  })
  .strict();

export const issueExecutionWorkspaceSettingsSchema = z
  .object({
    mode: z.enum(["inherit", "shared_workspace", "isolated_workspace", "operator_branch", "reuse_existing", "agent_default"]).optional(),
    workspaceStrategy: executionWorkspaceStrategySchema.optional().nullable(),
    workspaceRuntime: z.record(z.unknown()).optional().nullable(),
  })
  .strict();

export const issueAssigneeAdapterOverridesSchema = z
  .object({
    adapterConfig: z.record(z.unknown()).optional(),
    useProjectWorkspace: z.boolean().optional(),
  })
  .strict();

export const createIssueSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  projectWorkspaceId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  inheritExecutionWorkspaceFromIssueId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(ISSUE_STATUSES).optional().default("backlog"),
  priority: z.enum(ISSUE_PRIORITIES).optional().default("medium"),
  assigneeAgentId: z.string().uuid().optional().nullable(),
  assigneeUserId: z.string().optional().nullable(),
  requestDepth: z.number().int().nonnegative().optional().default(0),
  billingCode: z.string().optional().nullable(),
  assigneeAdapterOverrides: issueAssigneeAdapterOverridesSchema.optional().nullable(),
  executionWorkspaceId: z.string().uuid().optional().nullable(),
  executionWorkspacePreference: z.enum([
    "inherit",
    "shared_workspace",
    "isolated_workspace",
    "operator_branch",
    "reuse_existing",
    "agent_default",
  ]).optional().nullable(),
  executionWorkspaceSettings: issueExecutionWorkspaceSettingsSchema.optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
  scheduledWakeAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export type CreateIssue = z.infer<typeof createIssueSchema>;

export const createIssueLabelSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{6})$/, "Color must be a 6-digit hex value"),
});

export type CreateIssueLabel = z.infer<typeof createIssueLabelSchema>;

export const updateIssueSchema = createIssueSchema.partial().extend({
  comment: z.string().min(1).optional(),
  reopen: z.boolean().optional(),
  interrupt: z.boolean().optional(),
  hiddenAt: z.string().datetime().nullable().optional(),
});

export type UpdateIssue = z.infer<typeof updateIssueSchema>;
export type IssueExecutionWorkspaceSettings = z.infer<typeof issueExecutionWorkspaceSettingsSchema>;

export const checkoutIssueSchema = z.object({
  agentId: z.string().uuid().optional(),
  expectedStatuses: z.array(z.enum(ISSUE_STATUSES)).nonempty(),
});

export type CheckoutIssue = z.infer<typeof checkoutIssueSchema>;

// PostgreSQL text columns reject NULL bytes (0x00). LLM agents sometimes emit
// a literal NULL byte when escaping UUIDs with leading zero — they tokenise
// the JSON escape sequence (backslash u 0000 0xxxxxxx-) into codepoint
// U-plus-0000 followed by "0xxxxxxx-". Without this refine, server returns 500
// "PostgresError: invalid byte sequence for encoding UTF8: 0x00", agent
// silently retries or hallucinates success. Reject early with 400 so caller
// strips and retries explicitly. Same rule applied to issue document body.
const noNullByte = (s: string) => !s.includes("\x00");
const NO_NULL_BYTE_MSG = "Body chứa NULL byte (0x00). LLM agents thường tạo ký tự này khi escape UUID có leading zero (ví dụ \\u00004a4beca-...). Strip NULL byte trước khi gửi lại.";

export const addIssueCommentSchema = z.object({
  body: z.string().min(1).refine(noNullByte, { message: NO_NULL_BYTE_MSG }),
  reopen: z.boolean().optional(),
  interrupt: z.boolean().optional(),
});

export type AddIssueComment = z.infer<typeof addIssueCommentSchema>;

export const linkIssueApprovalSchema = z.object({
  approvalId: z.string().uuid(),
});

export type LinkIssueApproval = z.infer<typeof linkIssueApprovalSchema>;

export const createIssueAttachmentMetadataSchema = z.object({
  issueCommentId: z.string().uuid().optional().nullable(),
});

export type CreateIssueAttachmentMetadata = z.infer<typeof createIssueAttachmentMetadataSchema>;

export const ISSUE_DOCUMENT_FORMATS = ["markdown"] as const;

export const issueDocumentFormatSchema = z.enum(ISSUE_DOCUMENT_FORMATS);

export const issueDocumentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Document key must be lowercase letters, numbers, _ or -");

export const upsertIssueDocumentSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  format: issueDocumentFormatSchema,
  body: z.string().max(524288).refine(noNullByte, { message: NO_NULL_BYTE_MSG }),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  baseRevisionId: z.string().uuid().nullable().optional(),
});

export const restoreIssueDocumentRevisionSchema = z.object({});

export type IssueDocumentFormat = z.infer<typeof issueDocumentFormatSchema>;
export type UpsertIssueDocument = z.infer<typeof upsertIssueDocumentSchema>;
export type RestoreIssueDocumentRevision = z.infer<typeof restoreIssueDocumentRevisionSchema>;
