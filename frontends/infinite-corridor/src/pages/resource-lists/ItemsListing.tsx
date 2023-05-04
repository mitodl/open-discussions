import React, { useCallback } from "react"
import classNames from "classnames"
import type { ListItem } from "ol-search-ui"
import LearningResourceCard from "../../components/LearningResourceCard"
import {
  SortableItem,
  SortableList,
  RenderActive,
  LoadingSpinner,
  CancelDrop
} from "ol-util"
import { useMoveUserListItem } from "../../api/learning-resources"

type UserListItemsProps = {
  id?: number
  items?: ListItem[]
  isLoading?: boolean
  isRefetching?: boolean
  emptyMessage: string
  sortable?: boolean
}

const UserListItemsViewOnly: React.FC<{
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

const UserListItemsSortable: React.FC<{
  listId: number
  items: ListItem[]
  isRefetching?: boolean
}> = ({ items, listId, isRefetching }) => {
  const move = useMoveUserListItem()
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

  /**
   * Use the cancelDrop callback to move the item.
   *
   * Why?
   *
   * The `useMoveUserListItem` mutation function makes an API call and
   * optimistically updates the UI for immediate feedback. Except optimistic
   * updates in react-query aren't actually immediate, they're asynchronous (no
   * server interaction, but on the JS event loop).
   *
   * Using the cancelDrop callback delays dnd-kit's drop event until our API
   * call has finished, at which point the optimistic update is also done.
   *
   * See https://github.com/clauderic/dnd-kit/issues/921
   */
  const moveItemsOnCancelDrop: CancelDrop<number> = useCallback(
    async e => {
      const active = e.active.data.current as unknown as ListItem
      const over = e.over.data.current as unknown as ListItem
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
  const disabled = isRefetching || move.isLoading
  return (
    <ul
      className={classNames("ic-card-row-list", {
        "sorting-disabled": disabled
      })}
    >
      <SortableList
        itemIds={items.map(item => item.id)}
        cancelDrop={moveItemsOnCancelDrop}
        renderActive={renderDragging}
      >
        {items.map(item => {
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

const UserListItems: React.FC<UserListItemsProps> = ({
  id,
  items,
  isLoading,
  isRefetching,
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
          <UserListItemsSortable
            listId={id}
            items={items}
            isRefetching={isRefetching}
          />
        ) : (
          <UserListItemsViewOnly items={items} />
        ))}
    </>
  )
}

export default UserListItems
export type { UserListItemsProps }
