import React from "react"
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Divider from "@mui/material/Divider"
import { Link } from "react-router-dom"
import { MITLogoLink } from "ol-util"

const Header: React.FC = () => {
  return (
    <AppBar className="ic-header" position="sticky">
      <Toolbar variant="dense">
        <MITLogoLink className="ic-mit-logo" />
        <Divider className="ic-divider" orientation="vertical" flexItem />
        <h2 className="ic-header-title">
          <Link to="/infinite">Infinite Corridor</Link>
        </h2>
      </Toolbar>
    </AppBar>
  )
}

export default Header
