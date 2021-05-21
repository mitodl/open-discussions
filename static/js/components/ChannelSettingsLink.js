/* global SETTINGS: false */
// @flow
import React from "react"
import { Link } from "react-router-dom"
import R from "ramda"
import { connect } from "react-redux"
import { Route } from "react-router-dom"

import DropdownMenu from "../components/DropdownMenu"

import { actions } from "../actions"
import { hideDropdown, showDropdown } from "../actions/ui"
import { channelURL, editChannelBasicURL } from "../lib/url"
import { WIDGET_FORM_KEY } from "../lib/widgets"

import type { Channel } from "../flow/discussionTypes"

export const CHANNEL_SETTINGS_MENU_DROPDOWN = "CHANNEL_SETTINGS_MENU_DROPDOWN"

type Props = {
  channel: Channel,
  history: Object,
  isOpen: boolean,
  showDropdown: () => void,
  hideDropdown: () => void,
  startFormEdit: () => void
}

export class ChannelSettingsLink extends React.Component<Props> {
  startEdit = () => {
    const { channel, history, startFormEdit } = this.props
    history.push(channelURL(channel.name))
    startFormEdit()
  }

  toggleMenu = () => {
    const { isOpen, showDropdown, hideDropdown } = this.props
    if (isOpen) {
      hideDropdown()
    } else {
      showDropdown()
    }
  }

  render = () => {
    const { channel, isOpen, hideDropdown } = this.props

    return (
      <React.Fragment>
        <a onClick={this.toggleMenu} className="edit-button">
          <i className="material-icons settings">settings</i>
        </a>
        {isOpen ? (
          <Route path={`${channelURL(channel.name)}/:postID/:postSlug?`}>
            {({ match }) => (
              <DropdownMenu
                closeMenu={hideDropdown}
                className="settings-menu-dropdown"
              >
                <li>
                  <Link to={editChannelBasicURL(channel.name)}>
                    Channel settings
                  </Link>
                </li>
                {match ? null : (
                  <li>
                    <a onClick={this.startEdit}>Manage widgets</a>
                  </li>
                )}
              </DropdownMenu>
            )}
          </Route>
        ) : null}
      </React.Fragment>
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

const mapDispatchToProps = {
  showDropdown:  () => showDropdown(CHANNEL_SETTINGS_MENU_DROPDOWN),
  hideDropdown:  () => hideDropdown(CHANNEL_SETTINGS_MENU_DROPDOWN),
  startFormEdit: () => actions.forms.formBeginEdit({ formKey: WIDGET_FORM_KEY })
}

export default R.compose(connect(mapStateToProps, mapDispatchToProps))(
  ChannelSettingsLink
)
