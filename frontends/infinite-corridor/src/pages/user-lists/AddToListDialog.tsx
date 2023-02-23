import React, { useCallback, useState } from "react"
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

import { LearningResource, PrivacyLevel, UserList } from "ol-search-ui"
import { LoadingSpinner } from "ol-util"

import {
  useAddToUserListItems,
  useDeleteFromUserListItems,
  useFavorite,
  useResource,
  useUnfavorite,
  useUserListsListing
} from "../../api/learning-resources"
import { CreateListDialog, useCreationDialog } from "./ManageListDialogs"

type ResourceKey = Pick<LearningResource, "id" | "object_type">

type AddToListDialogProps = {
  open: boolean
  resourceKey: ResourceKey
  onClose: () => void
}

type UserListOrFavorites =
  | UserList
  | {
      id: "favorites"
      title: string
      privacy_level: PrivacyLevel
    }

const useRequestRecord = () => {
  const [pending, setPending] = useState<Map<string, "delete" | "add">>(
    new Map()
  )
  const key = (resource: LearningResource, list: UserListOrFavorites) =>
    `${resource.object_type}-${resource.id}-${list.id}`
  const get = (resource: LearningResource, list: UserListOrFavorites) =>
    pending.get(key(resource, list))
  const set = (
    resource: LearningResource,
    list: UserListOrFavorites,
    value: "delete" | "add"
  ) => {
    setPending(current => new Map(current).set(key(resource, list), value))
  }
  const clear = (resource: LearningResource, list: UserListOrFavorites) => {
    setPending(current => {
      const next = new Map(current)
      next.delete(key(resource, list))
      return next
    })
  }
  return { get, set, clear }
}

const useToggleItemInList = (resource?: LearningResource) => {
  const requestRecord = useRequestRecord()
  const addTo = useAddToUserListItems()
  const deleteFrom = useDeleteFromUserListItems()
  const favorite = useFavorite()
  const unfavorite = useUnfavorite()
  const handleAdd = async (list: UserListOrFavorites) => {
    if (!resource) return
    try {
      requestRecord.set(resource, list, "add")
      if (list.id === "favorites") {
        await favorite.mutateAsync(resource)
      } else {
        await addTo.mutateAsync({
          userListId: list.id,
          payload:    {
            object_id:    resource.id,
            content_type: resource.object_type
          }
        })
      }
    } finally {
      requestRecord.clear(resource, list)
    }
  }
  const handleRemove = async (list: UserListOrFavorites) => {
    if (!resource) return
    try {
      requestRecord.set(resource, list, "delete")
      if (list.id === "favorites") {
        await unfavorite.mutateAsync(resource)
      } else {
        const listItem = resource.lists.find(l => l.list_id === list.id)
        if (!listItem) return // should not happen
        await deleteFrom.mutateAsync(listItem)
      }
    } finally {
      requestRecord.clear(resource, list)
    }
  }

  const isChecked = (list: UserListOrFavorites): boolean => {
    if (!resource) return false
    if (list.id === "favorites") {
      return !!resource.is_favorite
    }
    return resource.lists.some(l => l.list_id === list.id)
  }

  const isAdding = (list: UserListOrFavorites) =>
    !!resource && requestRecord.get(resource, list) === "add"
  const isRemoving = (list: UserListOrFavorites) =>
    !!resource && requestRecord.get(resource, list) === "delete"

  const handleToggle = (list: UserListOrFavorites) => async () => {
    return isChecked(list) ? handleRemove(list) : handleAdd(list)
  }
  return { handleToggle, isChecked, isAdding, isRemoving }
}

const AddToListDialog: React.FC<AddToListDialogProps> = ({
  open,
  resourceKey,
  onClose
}) => {
  const listCreation = useCreationDialog()
  const resourceQuery = useResource(resourceKey.object_type, resourceKey.id)
  const resource = resourceQuery.data
  const userListsQuery = useUserListsListing()
  const userLists = userListsQuery.data?.results
  const lists: UserListOrFavorites[] = [
    {
      id:            "favorites",
      title:         "Favorites",
      privacy_level: PrivacyLevel.Private
    },
    ...(userLists || [])
  ]

  const { handleToggle, isChecked, isAdding, isRemoving } =
    useToggleItemInList(resource)

  const isReady = resource && userLists

  return (
    <Dialog className="add-to-list-dialog" open={open} onClose={onClose}>
      <DialogTitle>Add to list</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose} aria-label="Close">
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
              <ListItemButton onClick={listCreation.handleStart}>
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
      <CreateListDialog
        open={listCreation.isOpen}
        onClose={listCreation.handleFinish}
      />
    </Dialog>
  )
}

type PrivacyChipProps = { privacyLevel: PrivacyLevel }
const PrivacyChip: React.FC<PrivacyChipProps> = ({ privacyLevel }) => {
  const isPrivate = privacyLevel === PrivacyLevel.Private
  const icon = isPrivate ? <LockIcon /> : <LockOpenIcon />
  const label = isPrivate ? "Private" : "Public"
  return <Chip icon={icon} label={label} size="small" />
}

const useAddToListDialog = () => {
  /**
   * Track isOpen and the current resource separately.
   * If we infer `isOpen === !!resource`, then the diagram content is not
   * visible during the closing animation.
   */
  const [isOpen, setIsOpen] = useState(false)
  const [ressourceKey, setResourceKey] = useState<ResourceKey | null>(null)
  const open = useCallback((resource: LearningResource) => {
    setIsOpen(true)
    setResourceKey(resource)
  }, [])
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    ressourceKey,
    open,
    close
  }
}

export default AddToListDialog
export { useAddToListDialog }
export type { AddToListDialogProps }
