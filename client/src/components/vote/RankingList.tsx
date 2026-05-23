import type { ProposalOption } from '@/domain'
import type { JSX } from 'react'

import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent
} from '@dnd-kit/core'
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
	options: ProposalOption[]
	onChange: (next: ProposalOption[]) => void
}

export function RankingList({ options, onChange }: Props): JSX.Element {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	function handleDragEnd(event: DragEndEvent): void {
		const { active, over } = event
		if (!over || active.id === over.id) return

		const oldIndex = options.findIndex(option => option.id === active.id)
		const newIndex = options.findIndex(option => option.id === over.id)

		onChange(arrayMove(options, oldIndex, newIndex))
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={options.map(option => option.id)} strategy={verticalListSortingStrategy}>
				<ul className="space-y-3">
					{options.map((option, index) => (
						<SortableRow key={option.id} option={option} index={index} />
					))}
				</ul>
			</SortableContext>
		</DndContext>
	)
}

function SortableRow({ option, index }: { option: ProposalOption; index: number }): JSX.Element {
	const { t } = useTranslation()

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: option.id
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : ('auto' as const)
	}

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-4 rounded-2xl border bg-elevated p-4 shadow-sm transition ${
				isDragging
					? 'border-primary shadow-glow ring-2 ring-primary/30'
					: 'border-border/70 hover:border-primary/50'
			}`}
		>
			<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-fg">
				{index + 1}
			</div>

			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-fg">{option.title}</div>

				{option.description && <div className="line-clamp-1 text-xs text-muted">{option.description}</div>}

				<div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
					{t('common.position', { position: index + 1 })}
				</div>
			</div>

			<button
				type="button"
				// oxlint-disable-next-line react/jsx-props-no-spreading
				{...attributes}
				// oxlint-disable-next-line react/jsx-props-no-spreading
				{...listeners}
				className="flex size-10 cursor-grab items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-fg active:cursor-grabbing"
				aria-label="Reorder"
			>
				<GripVertical size={18} />
			</button>
		</li>
	)
}
