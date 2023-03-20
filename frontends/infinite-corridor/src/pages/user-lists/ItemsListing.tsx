import React from "react"
import type { PaginatedUserListItems } from "ol-search-ui"
import LearningResourceCard from "../../components/LearningResourceCard"

type UserListItemsProps = {
  isLoading: boolean
  data?: PaginatedUserListItems
  emptyMessage: string
}

const UserListItems: React.FC<UserListItemsProps> = ({
  isLoading,
  data,
  emptyMessage
}) => {
  return (
    <>
      {isLoading && <p>Loading...</p>}
      {data &&
        (data.results.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : (
          <ul className="ic-card-row-list">
            {data.results.map(list => {
              return (
                <li key={list.id}>
                  <LearningResourceCard
                    variant="row-reverse"
                    resource={list.content_data}
                  />
                </li>
              )
            })}
          </ul>
        ))}
    </>
  )
}

export default UserListItems
export type { UserListItemsProps }
