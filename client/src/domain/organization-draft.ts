import * as z from 'zod'

export const organizationDraftSchema = z.object({
	name: z.string().trim().min(1, { error: 'org.empty-name' }).max(100, { error: 'org.name-too-long' }),
	description: z
		.string()
		.trim()
		.min(1, { error: 'org.empty-description' })
		.max(1000, { error: 'org.description-too-long' })
})

export type OrganizationDraft = z.infer<typeof organizationDraftSchema>
