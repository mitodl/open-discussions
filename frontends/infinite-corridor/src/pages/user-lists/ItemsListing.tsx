import React from "react"
import { LearningResourceCard, type PaginatedUserListItems } from "ol-search-ui"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"
import { imgConfigs } from "../../util/constants"

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
  const activateResource = useActivateResourceDrawer()
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
                    className="ic-resource-card"
                    resource={list.content_data}
                    imgConfig={imgConfigs["row-reverse"]}
                    onActivate={activateResource}
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
