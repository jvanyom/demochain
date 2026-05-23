import type { ProposalStateKind } from '@/domain'
import type { ComponentType, JSX } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Clock, CheckCircle2, Vote, Archive, XCircle, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STATUS_I18N_KEY = {
	PendingApproval: 'pending',
	Rejected: 'rejected',
	PendingStart: 'approved',
	Open: 'voting',
	Closed: 'closed'
} as const satisfies Record<ProposalStateKind, string>

const map: Record<
	ProposalStateKind,
	{
		tone: 'warning' | 'primary' | 'success' | 'neutral' | 'danger'
		icon: ComponentType<{ size?: number }>
	}
> = {
	PendingApproval: { tone: 'warning', icon: Clock },
	Rejected: { tone: 'danger', icon: XCircle },
	PendingStart: { tone: 'primary', icon: CheckCircle2 },
	Open: { tone: 'success', icon: Vote },
	Closed: { tone: 'neutral', icon: Archive }
}

export function StatusBadge({ status }: { status: ProposalStateKind }): JSX.Element {
	const { t } = useTranslation()

	const conf = map[status]
	const Icon = conf?.icon ?? HelpCircle

	return (
		<Badge tone={conf?.tone}>
			<Icon size={12} />
			{t(`proposal.status.${STATUS_I18N_KEY[status]}`)}
		</Badge>
	)
}
