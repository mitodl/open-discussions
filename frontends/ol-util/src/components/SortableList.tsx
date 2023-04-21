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
import type { DropAnimation, Active, Data, Over } from "@dnd-kit/core"
import {
  useSortable,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  hasSortableData,
  arrayMove
} from "@dnd-kit/sortable"
import type { SortableData } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CancelDropArguments } from "@dnd-kit/core/dist/components/DndContext/DndContext"

type SortableItemProps<I extends UniqueIdentifier = UniqueIdentifier> = {
  id: I
  children?: (props: HandleProps) => React.ReactNode
  data?: Data
  Component?: React.ElementType
  disabled?: boolean
}
type HandleProps = React.HTMLAttributes<HTMLElement> & {
  ref: (el: HTMLElement | null) => void
}

const DRAG_UNDERLAY_OPACITY = "0.5"

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
  } = useSortable({ id: props.id, data: props.data, disabled: props.disabled })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging && { opacity: DRAG_UNDERLAY_OPACITY })
  }
  const handleProps: HandleProps = useMemo(
    () => ({
      ...listeners,
      ref:       setActivatorNodeRef,
      className: !props.disabled ? "ol-draggable" : undefined
    }),
    [setActivatorNodeRef, listeners, props.disabled]
  )

  const { Component = "div" } = props

  return (
    <Component ref={setNodeRef} style={style} {...attributes}>
      {props.children && props.children(handleProps)}
    </Component>
  )
}

type RenderActive = (active: Active) => React.ReactElement
type SortEndEvent<I extends UniqueIdentifier = UniqueIdentifier> = {
  /**
   * The item order post-sort
   */
  itemIds: I[]
  activeIndex: number
  overIndex: number
  active: Active & { data: { current: SortableData } }
  over: Over & { data: { current: SortableData } }
}
type OnSortEnd<I extends UniqueIdentifier = UniqueIdentifier> = (
  event: SortEndEvent<I>
) => void
type CancelDrop<I extends UniqueIdentifier = UniqueIdentifier> = (
  event: SortEndEvent<I>
) => boolean | Promise<boolean>

const makeSortEndEvent = <I extends UniqueIdentifier>(
  e: DragEndEvent | CancelDropArguments
): SortEndEvent<I> | undefined => {
  const { active, over } = e
  if (!hasSortableData(active)) return
  if (!hasSortableData(over)) return
  const { items: oldItems, index: from } = active.data.current.sortable
  const { index: to } = over.data.current.sortable
  const newItems = arrayMove(oldItems, from, to) as I[]
  if (from === to) return
  return {
    itemIds:     newItems,
    active,
    over,
    activeIndex: from,
    overIndex:   to
  }
}

interface SortableListProps<I extends UniqueIdentifier = UniqueIdentifier> {
  children?: React.ReactNode
  itemIds: I[]
  onSortEnd?: OnSortEnd<I>
  renderActive: RenderActive
  cancelDrop?: CancelDrop<I>
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
 * Create a sortable list of items. Wrap your list and items in SortableList
 * and `SortableItem`.
 *
 * Items must have ids. `SortableList` will emit an event with the **new** sort
 * order when sorting ends.
 *
 *  Notes:
 *  - does not support sorting between lists.
 *  - SortableItem's child is a render function called with props that should be
 *    passed to drag handle.
 *  - itemIds passed to `SortableList` **must** be in same order as the items
 *    appear in the DOM. (This is a requirement of @dnd-kit)
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
  onSortEnd,
  cancelDrop
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
      const event = makeSortEndEvent<I>(e)
      if (!event) return
      onSortEnd?.(event)
    },
    [onSortEnd]
  )

  const handleCancelDrop = useCallback(
    (e: CancelDropArguments) => {
      setActive(null)
      const event = makeSortEndEvent<I>(e)
      if (!event) return true
      return cancelDrop?.(event) ?? false
    },
    [cancelDrop]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragStart}
      onDragEnd={handleDragEnd}
      cancelDrop={handleCancelDrop}
    >
      <SortableContext strategy={verticalListSortingStrategy} items={itemIds}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimationConfig}>
        <div className="ol-dragging">{active && renderActive(active)}</div>
      </DragOverlay>
    </DndContext>
  )
}

export default SortableList
export { SortableItem, arrayMove }
export type {
  RenderActive,
  SortEndEvent,
  OnSortEnd,
  CancelDrop,
  SortableItemProps,
  SortableListProps
}
