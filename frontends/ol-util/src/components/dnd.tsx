import React, { useCallback, useMemo, useState } from "react"
import {
  defaultDropAnimationSideEffects,
  useSensors,
  useSensor,
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier
} from "@dnd-kit/core"
import type { DropAnimation, Active, Data } from "@dnd-kit/core"
import {
  useSortable,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  hasSortableData,
  arrayMove
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type SortableItemProps<I extends UniqueIdentifier = UniqueIdentifier> = {
  id: I
  children?: (props: HandleProps) => React.ReactNode
  data?: Data
}
type HandleProps = React.HTMLAttributes<HTMLElement> & {
  ref: (el: HTMLElement | null) => void
}

const SortableItem = <I extends UniqueIdentifier = UniqueIdentifier>(
  props: SortableItemProps<I>
): React.ReactElement => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef
  } = useSortable({ id: props.id, data: props.data })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging && { opacity: 0.5 })
  }
  const handleProps: HandleProps = useMemo(
    () => ({
      ...listeners,
      ref: setActivatorNodeRef
    }),
    [setActivatorNodeRef, listeners]
  )

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {props.children && props.children(handleProps)}
    </div>
  )
}

type RenderActive = (active: Active) => React.ReactElement
type SortEndEvent<I extends UniqueIdentifier = UniqueIdentifier> = {
  itemIds: I[]
}

interface SortableListProps<I extends UniqueIdentifier = UniqueIdentifier> {
  children?: React.ReactNode
  itemIds: I[]
  onSortEnd: (event: SortEndEvent<I>) => void
  renderActive: RenderActive
}
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5"
      }
    }
  })
}
const SortableList = <I extends UniqueIdentifier = UniqueIdentifier>({
  children,
  itemIds,
  renderActive,
  onSortEnd
}: SortableListProps<I>): React.ReactElement => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        tolerance: 1000,
        delay:     100
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const [active, setActive] = useState<Active | null>()

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActive(e.active)
  }, [])
  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActive(null)
      const { active, over } = e
      if (!hasSortableData(active)) return
      if (!hasSortableData(over)) return
      const { items: oldItems, index: from } = active.data.current.sortable
      const { index: to } = over.data.current.sortable
      const newItems = arrayMove(oldItems, from, to) as I[]
      onSortEnd({ itemIds: newItems })
    },
    [onSortEnd]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext strategy={verticalListSortingStrategy} items={itemIds}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {active && renderActive(active)}
      </DragOverlay>
    </DndContext>
  )
}

export { SortableItem, SortableList }
export type { RenderActive, SortEndEvent, SortableItemProps, SortableListProps }
