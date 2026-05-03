import * as z from 'zod';

const APPROVAL_BUFFER_DAYS = 3;

const MS_PER_DAY = 86_400_000;

function minStartDate(): Date {
  return new Date(Date.now() + APPROVAL_BUFFER_DAYS * MS_PER_DAY);
}

export const basicsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'proposal.empty-title' }),
  description: z
    .string()
    .trim()
    .min(1, { message: 'proposal.empty-description' }),
});

export const datesSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate < minStartDate()) {
      ctx.addIssue({
        code: 'custom',
        message: 'proposal.starting-too-soon',
        path: ['startDate'],
      });
    }

    const startPlusOne = new Date(data.startDate);
    startPlusOne.setDate(startPlusOne.getDate() + 1);

    if (data.endDate <= startPlusOne) {
      ctx.addIssue({
        code: 'custom',
        message: 'proposal.small-voting-window',
        path: ['endDate'],
      });
    }
  });

export const optionsSchema = z.object({
  options: z
    .array(z.string().trim().min(1, { message: 'proposal.empty-options' }))
    .min(2, { message: 'proposal.too-few-options' })
    .refine(
      (opts) => {
        const lower = opts.map((o) => o.toLowerCase());
        return new Set(lower).size === lower.length;
      },
      { message: 'proposal.duplicated-options' },
    ),
});

export const proposalSchema = basicsSchema.and(datesSchema).and(optionsSchema);
