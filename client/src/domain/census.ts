import * as z from 'zod';
import { addressSchema } from './address';
import { organizationIdSchema } from './organization';

const censusSchema = z.object({
  orgId: organizationIdSchema,
  members: z.array(addressSchema),
});

type Census = z.infer<typeof censusSchema>;
