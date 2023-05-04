import React, { useCallback } from "react"
import { StaffList, UserList } from "ol-search-ui"
import { useToggle } from "ol-util"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import ListItemIcon from "@mui/material/ListItemIcon"
import IconButton from "@mui/material/IconButton"

type EditListMenuProps<L extends UserList | StaffList> = {
  resource: L
  onEdit: (resource: L) => void
  onDelete: (resource: L) => void
}
const EditListMenu = <L extends UserList | StaffList>({
  resource,
  onEdit,
  onDelete
}: EditListMenuProps<L>) => {
  const [open, toggleOpen] = useToggle(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleEdit = useCallback(() => {
    onEdit(resource)
    toggleOpen.off()
  }, [resource, onEdit, toggleOpen])
  const handleDelete = useCallback(() => {
    onDelete(resource)
    toggleOpen.off()
  }, [resource, onDelete, toggleOpen])
  return (
    <>
      <IconButton
        aria-label={`Edit list ${resource.title}`}
        onClick={toggleOpen.on}
        ref={setAnchorEl}
        size="small"
      >
        <MoreVertIcon fontSize="inherit" />
      </IconButton>
      <Menu open={open} onClose={toggleOpen.off} anchorEl={anchorEl}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  )
}
export default EditListMenu
