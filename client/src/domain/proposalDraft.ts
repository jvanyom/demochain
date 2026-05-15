import * as z from 'zod';

const APPROVAL_BUFFER_DAYS = 3;
const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

// Dev: any past/future start, 1-minute voting window suffices.
// Prod: start ≥ APPROVAL_BUFFER_DAYS ahead, window ≥ 1 hour.
const DEV = import.meta.env.DEV;

function minStartDate(): Date {
    if (DEV) return new Date(0);
    return new Date(Date.now() + APPROVAL_BUFFER_DAYS * MS_PER_DAY);
}

export const proposalDraftBasicsSchema = z.object({
    title: z.string().trim().min(1, {error: 'proposal.empty-title'}),
    description: z.string().trim().min(1, {error: 'proposal.empty-description'}),
});

function addDateIssues(
    startDate: Date,
    endDate: Date,
    addIssue: (params: { code: 'custom'; message: string; path: string[] }) => void,
): void {
    if (startDate < minStartDate()) {
        addIssue({code: 'custom', message: 'proposal.starting-too-soon', path: ['startDate']});
    }
    const minEnd = DEV ? startDate : new Date(startDate.getTime() + MS_PER_HOUR);
    if (endDate <= minEnd) {
        addIssue({code: 'custom', message: 'proposal.small-voting-window', path: ['endDate']});
    }
}

export const proposalDraftDatesSchema = z
    .object({
        startDate: z.date(),
        endDate: z.date(),
    })
    .superRefine((data, ctx) => {
        addDateIssues(data.startDate, data.endDate, (issue) => ctx.addIssue(issue));
    });

function hasDuplicateOptions(values: string[]): boolean {
    const lower = values.map((v) => v.toLowerCase());
    return new Set(lower).size !== lower.length;
}

export const proposalDraftOptionsSchema = z.object({
    options: z
        .array(z.string().trim().min(1, {error: 'proposal.empty-options'}))
        .min(2, {error: 'proposal.too-few-options'})
        .refine((opts) => !hasDuplicateOptions(opts), {error: 'proposal.duplicated-options'}),
});

export const proposalDraftSchema = proposalDraftBasicsSchema
    .and(proposalDraftDatesSchema)
    .and(proposalDraftOptionsSchema);

type ProposalDraft = z.infer<typeof proposalDraftSchema>;

// Form-level schema for react-hook-form: dates are strings (from datetime-local inputs).
// Date validation delegates to proposalDraftDatesSchema to avoid duplication.
export const proposalFormSchema = z
    .object({
        orgId: z.string().min(1, {error: 'org.required'}),
        title: z.string().trim().min(1, {error: 'proposal.empty-title'}),
        description: z.string().trim().min(1, {error: 'proposal.empty-description'}),
        startDate: z.string().min(1, {error: 'proposal.starting-too-soon'}),
        endDate: z.string().min(1, {error: 'proposal.small-voting-window'}),
        options: z
            .array(z.object({value: z.string().trim().min(1, {error: 'proposal.empty-options'})}))
            .min(2, {error: 'proposal.too-few-options'})
            .refine(
                (opts) => {
                    const vals = opts.flatMap((o) => {
                        const v = o.value.toLowerCase().trim();
                        return v ? [v] : [];
                    });
                    return !hasDuplicateOptions(vals);
                },
                {error: 'proposal.duplicated-options'},
            ),
    })
    .superRefine((data, ctx) => {
        if (!data.startDate || !data.endDate) return;
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
        addDateIssues(startDate, endDate, (issue) => ctx.addIssue(issue));
    });

export type ProposalFormValues = z.infer<typeof proposalFormSchema>;
