import React from "react"
import { LearningResourceCard, type PaginatedUserListItems } from "ol-search-ui"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"
import { imgConfigs } from "../../util/constants"
import IconButton from "@mui/material/IconButton"
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder"
import AddToListDialog, { useAddToListDialog } from "./AddToListDialog"

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
  const addToList = useAddToListDialog()
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
                    footerActionSlot={
                      <IconButton
                        onClick={() => addToList.open(list.content_data)}
                      >
                        <BookmarkBorderIcon />
                      </IconButton>
                    }
                  />
                </li>
              )
            })}
          </ul>
        ))}
      {addToList.ressourceKey && (
        <AddToListDialog
          resourceKey={addToList.ressourceKey}
          onClose={addToList.close}
          open={addToList.isOpen}
        />
      )}
    </>
  )
}

export default UserListItems
export type { UserListItemsProps }
