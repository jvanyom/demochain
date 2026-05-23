import * as z from 'zod'

import { addressSchema } from './address'

declare const organizationIdBrand: unique symbol
export type OrganizationId = number & { readonly [organizationIdBrand]: true }

export const organizationIdSchema = z
	.number()
	.int()
	.nonnegative()
	// oxlint-disable-next-line no-unsafe-type-assertion
	.transform((orgId): OrganizationId => orgId as OrganizationId)

export function asOrganizationId(orgId: number): OrganizationId {
	return organizationIdSchema.parse(orgId)
}

const organizationSchema = z.object({
	id: organizationIdSchema,
	name: z.string(),
	description: z.string(),
	organizer: addressSchema,
	memberCount: z.number().int().nonnegative()
})

export type Organization = z.infer<typeof organizationSchema>
