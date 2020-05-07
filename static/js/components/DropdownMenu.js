// @flow
/* global SETTINGS:false */
import React from "react"
import onClickOutside from "react-onclickoutside"

import { spaceSeparated } from "../lib/util"

type Props = {
  closeMenu: Function,
  children: any,
  className?: string
}

export class _DropdownMenu extends React.Component<Props> {
  handleClickOutside = () => {
    const { closeMenu } = this.props

    closeMenu()
  }

  // this sets onClickOutside as the onClick prop for
  // all the children, so that the menu will close after
  // an option is selected
  setClickHandlersOnChildren = () => {
    const { closeMenu, children } = this.props

    return React.Children.map(children, child =>
      child ? React.cloneElement(child, { onClick: closeMenu }) : child
    )
  }

  render() {
    const { className } = this.props

    return (
      <ul className={spaceSeparated(["dropdown-menu", className])}>
        {this.setClickHandlersOnChildren()}
      </ul>
    )
  }
}

const DropdownMenu = onClickOutside<Props, void>(_DropdownMenu)
export default DropdownMenu
