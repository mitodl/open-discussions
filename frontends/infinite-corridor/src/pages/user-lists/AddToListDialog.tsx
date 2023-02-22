import React, { useCallback, useState } from "react"
import Dialog from "@mui/material/Dialog"
import Box from "@mui/material/Box"
import CloseIcon from "@mui/icons-material/Close"
import IconButton from "@mui/material/IconButton"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Divider from "@mui/material/Divider"
import Checkbox from "@mui/material/Checkbox"
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import LockIcon from '@mui/icons-material/Lock'
import Chip from "@mui/material/Chip"

import { LearningResource, PrivacyLevel, UserList } from "ol-search-ui"
import { LoadingSpinner } from "ol-util"

import { useAddToUserListItems, useDeleteFromUserListItems, useResource, useUserListsListing } from "../../api/learning-resources"

type ResourceKey = Pick<LearningResource, "id" | "object_type">

type AddToListDialogProps =  {
  open: boolean
  resourceKey: ResourceKey
  onClose: () => void
}

const useRequestRecord = () => {
  const [pending, setPending] = useState<Map<string, "delete" | "add">>(new Map())
  const key = (resource: LearningResource, userList: UserList) => `${resource.object_type}-${resource.id}-${userList.id}`
  const get = (resource: LearningResource, userList: UserList) => pending.get(key(resource, userList))
  const set = (resource: LearningResource, userList: UserList, value: "delete" | "add") => {
    setPending(current => new Map(current).set(key(resource, userList), value))
  }
  const clear = (resource: LearningResource, userList: UserList) => {
    setPending(current => {
      const next = new Map(current)
      next.delete(key(resource, userList))
      return next
    })
  }
  return { get, set, clear }
}

const AddToListDialog: React.FC<AddToListDialogProps> = ({
  open,
  resourceKey,
  onClose
}) => {
  const requestRecord = useRequestRecord()
  const resourceQuery = useResource(resourceKey.object_type, resourceKey.id)
  const resource = resourceQuery.data
  const userListsQuery = useUserListsListing()
  const userLists = userListsQuery.data?.results
  const addTo = useAddToUserListItems()
  const deleteFrom = useDeleteFromUserListItems()
  const handleToggle = (userList: UserList) => async () => {
    if (!resource) return
    const listItem = resource.lists.find(list => list.list_id === userList.id)
    try {
      if (listItem) {
        requestRecord.set(resource, userList, "delete")
        await deleteFrom.mutateAsync(listItem)
      } else {
        requestRecord.set(resource, userList, "add")
        await addTo.mutateAsync({
          userListId: userList.id,
          payload:    { object_id: resource.id, content_type: resource.object_type }
        })
      }
    } finally {
      requestRecord.clear(resource, userList)
    }
  }

  const isReady = resource && userLists

  return (
    <Dialog className="add-to-list-dialog" open={open} onClose={onClose}>
      <DialogTitle>Add to list</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      {isReady && <DialogContent className="add-to-list-description">
        Adding <span className="resource-title-inline">{resource.title}</span>
      </DialogContent>
      }
      {isReady && <DialogContent className="add-to-list-listing">
        <List>
          {userListsQuery?.data?.results.map(userList => {
            const labelId = `checkbox-list-label-${userList.id}`
            const isAdding = requestRecord.get(resource, userList) === "add"
            const isDeleting = requestRecord.get(resource, userList) === "delete"
            const disabled = isAdding || isDeleting
            const isChecked = isAdding || resource.lists.some(list => list.list_id === userList.id)
            return  (
              <ListItem key={userList.id} secondaryAction={
                <PrivacyChip privacyLevel={userList.privacy_level} />
              }>
                <ListItemButton disabled={disabled} onClick={handleToggle(userList)}>
                  <Checkbox
                    edge="start"
                    disabled={disabled}
                    checked={isChecked}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                  />
                  <ListItemText id={labelId} primary={userList.title} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </DialogContent>}
      {!isReady && <DialogContent>
        <LoadingSpinner loading={!isReady} />
      </DialogContent>}
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
