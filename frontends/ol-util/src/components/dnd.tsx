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

const DRAG_UNDERLAY_OPACITY = "0.4"

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
    ...(isDragging && { opacity: DRAG_UNDERLAY_OPACITY })
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
  /**
   * The item order post-sort
   */
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
        opacity: DRAG_UNDERLAY_OPACITY
      }
    }
  })
}

/**
 * Create a sortable list of items! Just wrap your list and items in
 * `SortableList` and `SortableItem`.
 *
 *  Notes:
 *  - emits `onSortEnd` events with the new item order
 *  - itemIds passed to `SortableList` **must** be in same order as the items
 *    appear in the DOM. (This is a requirement of @dnd-kit)
 *  - SortableItem's child is a render function called with props that should be
 *    passed to drag handle.
 *
 * @example
 * ```tsx
 * const ExampleUsage = () => {
 *   const [itemIds, setItemIds] = useState(["A", "B", "C", "D"])
 *   return (
 *     <SortableList
 *       itemIds={itemIds}
 *       onSortEnd={e => setItemIds(e.itemIds)}
 *       renderActive={active => <div>Active Item: {active.id}</div>}
 *     >
 *       {itemIds.map(id => (
 *         <SortableItem key={id} id={id}>
 *           {handleProps => (
 *             <div>
 *               My item {id} so cool.
 *               <div {...handleProps}>Drag Handle</div>
 *             </div>
 *           )}
 *         </SortableItem>
 *       ))}
 *     </SortableList>
 *   )
 * }
 * ```
 */
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
