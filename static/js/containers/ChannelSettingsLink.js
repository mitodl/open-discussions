// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { hideDropdown, showDropdown } from "../actions/ui"
import DropdownMenu from "../components/DropdownMenu"
import { Link } from "react-router-dom"
import { editChannelBasicURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

export const CHANNEL_SETTINGS_MENU_DROPDOWN = "CHANNEL_SETTINGS_MENU_DROPDOWN"

type Props = {
  channel: Channel,
  isOpen: boolean,
  showDropdown: () => void,
  hideDropdown: () => void
}

export class ChannelSettingsLink extends React.Component<Props> {
  renderMenu = () => {
    const { channel, hideDropdown } = this.props

    return (
      <DropdownMenu closeMenu={hideDropdown} className="settings-menu-dropdown">
        <li>
          <Link to={editChannelBasicURL(channel.name)}>Channel settings</Link>
        </li>
      </DropdownMenu>
    )
  }

  toggleMenu = () => {
    const { isOpen, showDropdown, hideDropdown } = this.props
    if (isOpen) {
      hideDropdown()
    } else {
      showDropdown()
    }
  }

  render() {
    const { isOpen } = this.props

    return (
      <div className="settings-menu">
        <a onClick={() => this.toggleMenu()} className="edit-button">
          <i className="material-icons settings">settings</i>
        </a>
        {isOpen ? this.renderMenu() : null}
      </div>
    )
  }
}

const mapStateToProps = state => {
  const {
    ui: { dropdownMenus }
  } = state

  const isOpen = dropdownMenus.has(CHANNEL_SETTINGS_MENU_DROPDOWN)
  return { isOpen }
}

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  showDropdown: () => dispatch(showDropdown(CHANNEL_SETTINGS_MENU_DROPDOWN)),
  hideDropdown: () => dispatch(hideDropdown(CHANNEL_SETTINGS_MENU_DROPDOWN))
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ChannelSettingsLink)
