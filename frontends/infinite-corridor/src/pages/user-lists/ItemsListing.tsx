import React, { useCallback } from "react"
import type { UserListItem } from "ol-search-ui"
import LearningResourceCard from "../../components/LearningResourceCard"
import {
  SortableItem,
  SortableList,
  RenderActive,
  LoadingSpinner,
  CancelSort
} from "ol-util"
import { useMoveUserListItem } from "../../api/learning-resources"

type UserListItemsProps = {
  id?: number
  items?: UserListItem[]
  isLoading: boolean
  emptyMessage: string
  sortable?: boolean
}

const UserListItemsViewOnly: React.FC<{
  items: UserListItem[]
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

const UserListItemsSortable: React.FC<{
  listId: number
  items: UserListItem[]
}> = ({ items, listId }) => {
  const move = useMoveUserListItem()
  const renderDragging: RenderActive = useCallback(active => {
    const item = active.data.current as UserListItem
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
  const cancelSort: CancelSort<number> = useCallback(
    async e => {
      const active = e.active.data.current as unknown as UserListItem
      const over = e.over.data.current as unknown as UserListItem
      try {
        await move.mutateAsync({
          item: {
            item_id: active.id,
            list_id: listId
          },
          newPosition: over.position,
          oldIndex:    e.activeIndex,
          newIndex:    e.overIndex
        })
        return false
      } catch (e) {
        return true
      }
    },
    [move, listId]
  )
  return (
    <ul className="ic-card-row-list">
      <SortableList
        itemIds={items.map(item => item.id)}
        cancelSort={cancelSort}
        renderActive={renderDragging}
      >
        {items.map(item => {
          return (
            <SortableItem Component="li" key={item.id} id={item.id} data={item}>
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

const UserListItems: React.FC<UserListItemsProps> = ({
  id,
  items,
  isLoading,
  emptyMessage,
  sortable = false
}) => {
  if (sortable && !id) throw new Error("Sortable list must have an id")
  return (
    <>
      {isLoading && <LoadingSpinner loading />}
      {items &&
        (items.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : sortable && id ? (
          <UserListItemsSortable listId={id} items={items} />
        ) : (
          <UserListItemsViewOnly items={items} />
        ))}
    </>
  )
}

export default UserListItems
export type { UserListItemsProps }
