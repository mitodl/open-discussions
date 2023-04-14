import React, { useCallback } from "react"
import type { PaginatedUserListItems, UserListItem } from "ol-search-ui"
import LearningResourceCard from "../../components/LearningResourceCard"
import {
  SortableItem,
  SortableList,
  RenderActive,
  LoadingSpinner
} from "ol-util"

type UserListItemsProps = {
  isLoading: boolean
  data?: PaginatedUserListItems
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
  items: UserListItem[]
}> = ({ items }) => {
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
  return (
    <ul className="ic-card-row-list">
      <SortableList
        itemIds={items.map(item => item.id)}
        onSortEnd={event => console.log(event)}
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
  isLoading,
  data,
  emptyMessage,
  sortable = false
}) => {
  const items = data?.results
  return (
    <>
      {isLoading && <LoadingSpinner loading />}
      {items &&
        (items.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : sortable ? (
          <UserListItemsSortable items={items} />
        ) : (
          <UserListItemsViewOnly items={items} />
        ))}
    </>
  )
}

export default UserListItems
export type { UserListItemsProps }
