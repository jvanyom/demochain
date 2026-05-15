import * as z from 'zod';

export const organizationDraftSchema = z.object({
    name: z.string().trim().min(1, {error: 'org.empty-name'}),
    description: z.string().trim().min(1, {error: 'org.empty-description'}),
});

export type OrganizationDraft = z.infer<typeof organizationDraftSchema>;
