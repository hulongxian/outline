import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

const MaxP12Base64Length = 512 * 1024;

export const JiraConnectSchema = BaseSchema.extend({
  body: z.object({
    /** Jira instance URL */
    url: z.url(),
    /** Whether this is Jira Cloud */
    isCloud: z.boolean().optional(),
    /** Atlassian account email (Cloud) or username (Data Center basic auth) */
    email: z.email().optional(),
    username: z.string().max(255).optional(),
    /** pat (Bearer) or basic (username + password) for Server/Data Center */
    authType: z.enum(["pat", "basic"]).optional(),
    /**
     * Personal access token, API token, or password.
     * Must not be named `token` — that field is reserved for session auth in the request body.
     */
    apiToken: z.string().optional(),
    /** Base64-encoded P12/PFX client certificate */
    p12Base64: z.string().max(MaxP12Base64Length).optional(),
    /** Passphrase for the P12 file */
    p12Passphrase: z.string().max(255).optional(),
    /** Remove stored client certificate */
    clearP12: z.boolean().optional(),
    /** Existing integration id to update */
    integrationId: z.uuid().optional(),
  }),
});

export type JiraConnectReq = z.infer<typeof JiraConnectSchema>;
