// @flow
/* global SETTINGS:false */
import React from "react"
import onClickOutside from "react-onclickoutside"

type DropdownMenuProps = {
  closeMenu: Function,
  children: any,
  className?: string
}

export class _DropdownMenu extends React.Component<DropdownMenuProps> {
  handleClickOutside = () => {
    const { closeMenu } = this.props

    closeMenu()
  }

  // this sets onClickOutside as the onClick prop for
  // all the children, so that the menu will close after
  // an option is selected
  setClickHandlersOnChildren = () => {
    const { closeMenu, children } = this.props

    return React.Children.map(
      children,
      child =>
        child ? React.cloneElement(child, { onClick: closeMenu }) : child
    )
  }

  className = () => {
    const { className } = this.props
    return className ? `dropdown-menu ${className}` : "dropdown-menu"
  }

  render() {
    return (
      <ul className={this.className()}>{this.setClickHandlersOnChildren()}</ul>
    )
  }
}

const DropdownMenu = onClickOutside(_DropdownMenu)
export default DropdownMenu
