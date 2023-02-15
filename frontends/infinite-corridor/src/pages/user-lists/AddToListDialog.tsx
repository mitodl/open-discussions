import React, { useCallback, useState } from "react"
import Dialog from "@mui/material/Dialog"
import Box from "@mui/material/Box"
import CloseIcon from "@mui/icons-material/Close"
import IconButton from "@mui/material/IconButton"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import { LearningResource, PrivacyLevel, UserList } from "ol-search-ui"
import Divider from "@mui/material/Divider"
import Checkbox from "@mui/material/Checkbox"

import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import LockIcon from '@mui/icons-material/Lock'
import Chip from "@mui/material/Chip"

import { useAddToUserListItems, useDeleteFromUserListItems, useResource, useUserListsListing } from "../../api/learning-resources"

type ResourceKey = Pick<LearningResource, "id" | "object_type">

type AddToListDialogProps =  {
  open: boolean
  resourceKey: ResourceKey
  onClose: () => void
}

const AddToListDialog: React.FC<AddToListDialogProps> = ({
  open,
  resourceKey,
  onClose
}) => {
  const resourceQuery = useResource(resourceKey.object_type, resourceKey.id)
  const resource = resourceQuery.data
  const userListsQuery = useUserListsListing()
  const addTo = useAddToUserListItems()
  const deleteFrom = useDeleteFromUserListItems()

  const handleToggle: (list: UserList) => () => void = userList => () => {
    if (!resource) return
    const listItem = resource.lists.find(list => list.list_id === userList.id)
    if (listItem) {
      deleteFrom.mutate(listItem)
    } else {
      addTo.mutate({
        userListId: userList.id,
        payload:    { object_id: resource.id, content_type: resource.object_type }
      })
    }
  }

  return (
    <Dialog className="add-to-list-dialog" open={open} onClose={onClose}>
      <DialogTitle>Add to list</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <DialogContent>
        Adding <span className="resource-title-inline">{resource?.title}</span>
        <List disablePadding>
          {userListsQuery?.data?.results.map(userList => {
            const labelId = `checkbox-list-label-${userList.id}`
            const isChecked = resource?.lists.some(list => list.list_id === userList.id)
            return  (
              <ListItem key={userList.id} secondaryAction={
                <PrivacyChip privacyLevel={userList.privacy_level} />
              }>
                <ListItemButton onClick={handleToggle(userList)}>
                  <Checkbox
                    edge="start"
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
      </DialogContent>
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
