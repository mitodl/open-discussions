import React, { useCallback } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { UniqueIdentifier } from "@dnd-kit/core"

interface Props<T> {
  item: T
  id: UniqueIdentifier
  deleteItem: (item: T) => void
  title: string
}

export default function SortableItem<T>(props: Props<T>): JSX.Element {
  const { item, deleteItem, id, title } = props

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const deleteItemCB = useCallback(() => {
    deleteItem(item)
  }, [deleteItem, item])

  return (
    <div
      className="d-flex my-3"
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <span {...listeners} className="material-icons drag-handle">
        drag_indicator
      </span>
      <div className="title">{title}</div>
      <span
        className="material-icons ml-auto drag-delete-btn"
        onClick={deleteItemCB}
      >
        remove_circle_outline
      </span>
    </div>
  )
}
