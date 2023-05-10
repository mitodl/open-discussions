import React, { useCallback, useEffect } from "react"
import classNames from "classnames"
import type { ListItem } from "ol-search-ui"
import LearningResourceCard from "../../components/LearningResourceCard"
import {
  SortableItem,
  SortableList,
  RenderActive,
  LoadingSpinner,
  arrayMove,
  OnSortEnd
} from "ol-util"
import { useMoveListItem } from "../../api/learning-resources"

type ResourceListItemsProps = {
  id?: number
  items?: ListItem[]
  isLoading?: boolean
  isRefetching?: boolean
  emptyMessage: string
  sortable?: boolean
  mode?: "userlist" | "stafflist"
}

const ResourceListItemsViewOnly: React.FC<{
  items: ListItem[]
}> = ({ items }) => {
  return (
    <ul className="ic-card-row-list">
      {items.map(item => {
        return (
          <li key={item.id}>
            <LearningResourceCard
              variant="row-reverse"
              resource={item.content_data}
            />
          </li>
        )
      })}
    </ul>
  )
}

const ResourceListItemsSortable: React.FC<{
  listId: number
  items: ListItem[]
  isRefetching?: boolean
  mode: NonNullable<ResourceListItemsProps["mode"]>
}> = ({ items, listId, isRefetching, mode }) => {
  const move = useMoveListItem(mode)

  /**
   * `sorted` is a local copy of `items`:
   *  - `onSortEnd`, we'll update `sorted` copy immediately to prevent UI from
   *  snapping back to its original position.
   *  - `items` is the source of truth (most likely, this is coming from an API)
   *    so sync `items` -> `sorted` when `items` changes.
   */
  const [sorted, setSorted] = React.useState<ListItem[]>([])
  useEffect(() => setSorted(items), [items])

  const renderDragging: RenderActive = useCallback(active => {
    const item = active.data.current as ListItem
    return (
      <LearningResourceCard
        className="ic-dragging"
        sortable
        suppressImage
        variant="row-reverse"
        resource={item.content_data}
      />
    )
  }, [])

  const onSortEnd: OnSortEnd<number> = useCallback(
    async e => {
      const active = e.active.data.current as unknown as ListItem
      const over = e.over.data.current as unknown as ListItem
      setSorted(current => {
        const newOrder = arrayMove(current, e.activeIndex, e.overIndex)
        return newOrder
      })
      move.mutate({
        item: {
          item_id: active.id,
          list_id: listId
        },
        newPosition: over.position,
        oldIndex:    e.activeIndex,
        newIndex:    e.overIndex
      })
    },
    [move, listId]
  )
  const disabled = isRefetching || move.isLoading
  return (
    <ul
      className={classNames("ic-card-row-list", {
        "sorting-disabled": disabled
      })}
    >
      <SortableList
        itemIds={sorted.map(item => item.id)}
        onSortEnd={onSortEnd}
        renderActive={renderDragging}
      >
        {sorted.map(item => {
          return (
            <SortableItem
              Component="li"
              key={item.id}
              id={item.id}
              data={item}
              disabled={disabled}
            >
              {handleProps => {
                return (
                  <div {...handleProps}>
                    <LearningResourceCard
                      sortable
                      suppressImage
                      variant="row-reverse"
                      resource={item.content_data}
                    />
                  </div>
                )
              }}
            </SortableItem>
          )
        })}
      </SortableList>
    </ul>
  )
}

const ResourceListItems: React.FC<ResourceListItemsProps> = ({
  id,
  items,
  isLoading,
  isRefetching,
  emptyMessage,
  sortable = false,
  mode
}) => {
  if (sortable && !id) throw new Error("Sortable list must have an id")
  if (sortable && !mode) throw new Error("Sortable list must have a mode")
  return (
    <>
      {isLoading && <LoadingSpinner loading />}
      {items &&
        (items.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : sortable && id && mode ? (
          <ResourceListItemsSortable
            listId={id}
            mode={mode}
            items={items}
            isRefetching={isRefetching}
          />
        ) : (
          <ResourceListItemsViewOnly items={items} />
        ))}
    </>
  )
}

export default ResourceListItems
export type { ResourceListItemsProps as ResourceListItemsProps }
