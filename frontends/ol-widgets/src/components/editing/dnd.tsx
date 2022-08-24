import React, { useCallback, useMemo, useState } from "react"
import { defaultDropAnimationSideEffects, useSensors, useSensor, DndContext, DragOverlay, PointerSensor, KeyboardSensor, DragStartEvent } from "@dnd-kit/core"
import type { DropAnimation, Active, Data } from "@dnd-kit/core"
import { useSortable, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type SortableItemProps<T=unknown> = {
    id: string,
    children?: (props: HandleProps) => React.ReactNode
    data?: Data<T>
}
type HandleProps = React.HTMLAttributes<HTMLElement> & {
  ref: (el: HTMLElement | null) => void
}

const SortableItem: React.FC<SortableItemProps> = props => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({id: props.id, data: props.data })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging && { opacity: 0.5 })
  }
  const handleProps: HandleProps = useMemo(() => ({
    ...listeners,
    ref: setActivatorNodeRef
  }), [setActivatorNodeRef, listeners])

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      { props.children && props.children(handleProps) }
    </div>
  )
}

type RenderActive = (active: Active) => React.ReactElement

interface SortableListProps {
    children?: React.ReactNode
    itemIds: string[]
    renderActive: RenderActive
  }
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
}
const SortableList: React.FC<SortableListProps> = ({ children, itemIds, renderActive }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        tolerance: 1000,
        delay:     100,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [active, setActive] = useState<Active | null>()

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActive(e.active)
  }, [])
  const handleDragEnd = useCallback(() => {
    setActive(null)
  }, [])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext
        strategy={verticalListSortingStrategy}
        items={itemIds}
      >
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {active && renderActive(active)}
      </DragOverlay>
    </DndContext>
  )
}

export { SortableItem, SortableList }
export type { RenderActive }
