import React from "react"
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Divider from '@mui/material/Divider';
import { MITLogoLink } from "ol-util";

const Header: React.FC = () => {
  return (
    <AppBar className="ic-header" position="sticky">
    <Toolbar variant="dense">
      <MITLogoLink className="ic-mit-logo" />
      <Divider className="ic-divider" orientation="vertical" flexItem />
      <h2>Infinite Corridor</h2>
    </Toolbar>
  </AppBar>
  )
}

export default Header