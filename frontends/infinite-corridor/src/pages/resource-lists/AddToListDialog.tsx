import React, { useState } from "react"
import Dialog from "@mui/material/Dialog"
import Box from "@mui/material/Box"
import CloseIcon from "@mui/icons-material/Close"
import IconButton from "@mui/material/IconButton"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Divider from "@mui/material/Divider"
import Checkbox from "@mui/material/Checkbox"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import LockIcon from "@mui/icons-material/Lock"
import Chip from "@mui/material/Chip"
import AddIcon from "@mui/icons-material/Add"
import * as NiceModal from "@ebay/nice-modal-react"

import {
  LearningResource,
  PrivacyLevel,
  StaffList,
  UserList
} from "ol-search-ui"
import { LoadingSpinner } from "ol-util"

import {
  useAddToListItems,
  useDeleteFromListItems,
  useFavorite,
  useResource,
  useStaffListsListing,
  useUnfavorite,
  useUserListsListing
} from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"

type ResourceKey = Pick<LearningResource, "id" | "object_type">

type AddToListDialogProps = {
  resourceKey: ResourceKey
  mode: "userlist" | "stafflist"
}

type ListOrFavorites =
  | UserList
  | StaffList
  | {
      id: "favorites"
      title: string
      privacy_level: PrivacyLevel
    }

const useRequestRecord = () => {
  const [pending, setPending] = useState<Map<string, "delete" | "add">>(
    new Map()
  )
  const key = (resource: LearningResource, list: ListOrFavorites) =>
    `${resource.object_type}-${resource.id}-${list.id}`
  const get = (resource: LearningResource, list: ListOrFavorites) =>
    pending.get(key(resource, list))
  const set = (
    resource: LearningResource,
    list: ListOrFavorites,
    value: "delete" | "add"
  ) => {
    setPending(current => new Map(current).set(key(resource, list), value))
  }
  const clear = (resource: LearningResource, list: ListOrFavorites) => {
    setPending(current => {
      const next = new Map(current)
      next.delete(key(resource, list))
      return next
    })
  }
  return { get, set, clear }
}

const useToggleItemInList = (
  mode: "stafflist" | "userlist",
  resource?: LearningResource
) => {
  const requestRecord = useRequestRecord()
  const addTo = useAddToListItems()
  const deleteFrom = useDeleteFromListItems()
  const favorite = useFavorite()
  const unfavorite = useUnfavorite()
  const handleAdd = async (list: ListOrFavorites) => {
    if (!resource) return
    try {
      requestRecord.set(resource, list, "add")
      if (list.id === "favorites") {
        await favorite.mutateAsync(resource)
      } else {
        await addTo.mutateAsync({
          list,
          item: { object_id: resource.id, content_type: resource.object_type }
        })
      }
    } finally {
      requestRecord.clear(resource, list)
    }
  }
  const handleRemove = async (list: ListOrFavorites) => {
    if (!resource) return
    const lists = mode === "userlist" ? resource.lists : resource.stafflists
    try {
      requestRecord.set(resource, list, "delete")
      if (list.id === "favorites") {
        await unfavorite.mutateAsync(resource)
      } else {
        const listItem = lists.find(l => l.list_id === list.id)
        if (!listItem) return // should not happen
        await deleteFrom.mutateAsync({ list, item: listItem })
      }
    } finally {
      requestRecord.clear(resource, list)
    }
  }

  const isChecked = (list: ListOrFavorites): boolean => {
    if (!resource) return false
    if (list.id === "favorites") {
      return !!resource.is_favorite
    }
    const lists = mode === "userlist" ? resource.lists : resource.stafflists
    return lists.some(l => l.list_id === list.id)
  }

  const isAdding = (list: ListOrFavorites) =>
    !!resource && requestRecord.get(resource, list) === "add"
  const isRemoving = (list: ListOrFavorites) =>
    !!resource && requestRecord.get(resource, list) === "delete"

  const handleToggle = (list: ListOrFavorites) => async () => {
    return isChecked(list) ? handleRemove(list) : handleAdd(list)
  }
  return { handleToggle, isChecked, isAdding, isRemoving }
}

type PrivacyChipProps = { privacyLevel: PrivacyLevel }
const PrivacyChip: React.FC<PrivacyChipProps> = ({ privacyLevel }) => {
  const isPrivate = privacyLevel === PrivacyLevel.Private
  const icon = isPrivate ? <LockIcon /> : <LockOpenIcon />
  const label = isPrivate ? "Private" : "Public"
  return <Chip icon={icon} label={label} size="small" />
}

const FAVORITESS = [
  {
    id:            "favorites",
    title:         "Favorites",
    privacy_level: PrivacyLevel.Private
  }
] as const
const AddToListDialogInner: React.FC<AddToListDialogProps> = ({
  resourceKey,
  mode
}) => {
  const modal = NiceModal.useModal()
  const resourceQuery = useResource(resourceKey.object_type, resourceKey.id)
  const resource = resourceQuery.data
  const userListsQuery = useUserListsListing({ enabled: mode === "userlist" })
  const staffListsQuery = useStaffListsListing({
    enabled: mode === "stafflist"
  })
  const listsQuery = mode === "userlist" ? userListsQuery : staffListsQuery
  const lists: ListOrFavorites[] = [
    ...(mode === "userlist" ? FAVORITESS : []),
    ...(listsQuery.data?.results || [])
  ]
  if (mode === "userlist") {
    lists
  }

  const { handleToggle, isChecked, isAdding, isRemoving } = useToggleItemInList(
    mode,
    resource
  )

  const isReady = resource && listsQuery.isSuccess

  const title = mode === "userlist" ? "Add to My Lists" : "Add to Learning List"
  return (
    <Dialog className="add-to-list-dialog" {...NiceModal.muiDialogV5(modal)}>
      <DialogTitle>{title}</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={modal.hide} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      {isReady && (
        <DialogContent className="add-to-list-description">
          Adding <span className="resource-title-inline">{resource.title}</span>
        </DialogContent>
      )}
      {isReady && (
        <DialogContent className="add-to-list-listing">
          <List>
            {lists.map(list => {
              const adding = isAdding(list)
              const removing = isRemoving(list)
              const disabled = adding || removing
              const checked = adding || isChecked(list)
              return (
                <ListItem
                  key={list.id}
                  secondaryAction={
                    <PrivacyChip privacyLevel={list.privacy_level} />
                  }
                >
                  <ListItemButton
                    aria-disabled={disabled}
                    onClick={disabled ? undefined : handleToggle(list)}
                  >
                    <Checkbox
                      edge="start"
                      disabled={disabled}
                      checked={checked}
                      tabIndex={-1}
                      disableRipple
                    />
                    <ListItemText primary={list.title} />
                  </ListItemButton>
                </ListItem>
              )
            })}
            <ListItem className="add-to-list-new">
              <ListItemButton
                onClick={() => manageListDialogs.createList(mode)}
              >
                <AddIcon />
                <ListItemText primary="Create a new list" />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
      )}
      {!isReady && (
        <DialogContent>
          <LoadingSpinner loading={!isReady} />
        </DialogContent>
      )}
    </Dialog>
  )
}

const AddToListDialog = NiceModal.create(AddToListDialogInner)

export default AddToListDialog
export type { AddToListDialogProps }
