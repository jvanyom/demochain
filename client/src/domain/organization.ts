import * as z from 'zod';
import { addressSchema } from './address';

declare const organizationIdBrand: unique symbol;
export type OrganizationId = number & { readonly [organizationIdBrand]: true };

export const organizationIdSchema = z
    .number()
    .int()
    .nonnegative()
    .transform((n): OrganizationId => n as OrganizationId);

export function asOrganizationId(n: number): OrganizationId {
  return organizationIdSchema.parse(n);
}

const organizationSchema = z.object({
  id: organizationIdSchema,
  name: z.string(),
  description: z.string(),
  organizer: addressSchema,
  memberCount: z.number().int().nonnegative(),
});

export type Organization = z.infer<typeof organizationSchema>;
