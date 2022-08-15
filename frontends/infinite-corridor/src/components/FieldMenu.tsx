import * as React from "react"
import { Link } from "react-router-dom"
import { Menu } from "@mui/material"
import MenuItem from "@mui/material/MenuItem"

import { FieldChannel } from "../api/fields"
import { makeFieldEditPath } from "../pages/urls"

type SettingsMenuProps = {
  field: FieldChannel
}

const FieldMenu: React.FC<SettingsMenuProps> = props => {
  const { field } = props
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  return field ? (
    <div>
      <a onClick={handleClick} className="field-edit-button">
        <i className="material-icons settings">settings</i>
      </a>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleClose} disableRipple>
          <Link to={makeFieldEditPath(field.name)}>Field Settings</Link>
        </MenuItem>
      </Menu>
    </div>
  ) : null
}

export default FieldMenu
