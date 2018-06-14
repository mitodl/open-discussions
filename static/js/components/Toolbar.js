// @flow
/* global SETTINGS: false */
import React from "react"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import UserMenu from "./UserMenu"
import type { Profile } from "../flow/discussionTypes"

export default class Toolbar extends React.Component<*, void> {
  toolbarRoot: HTMLElement | null
  toolbar: Object

  props: {
    toggleShowSidebar: Function,
    toggleShowUserMenu: Function,
    showUserMenu: boolean,
    profile: Profile
  }

  componentDidMount() {
    this.toolbar = new MDCToolbar(this.toolbarRoot)
  }

  componentWillUnmount() {
    if (this.toolbar) {
      this.toolbar.destroy()
    }
  }

  render() {
    const {
      toggleShowSidebar,
      toggleShowUserMenu,
      showUserMenu,
      profile
    } = this.props

    return (
      <div className="navbar">
        <header className="mdc-toolbar" ref={div => (this.toolbarRoot = div)}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <a
                href="#"
                className="material-icons mdc-toolbar__icon--menu"
                onClick={toggleShowSidebar}
              >
                menu
              </a>
              <a href="http://www.mit.edu" className="mitlogo">
                <img src="/static/images/mit-logo-transparent3.svg" />
              </a>
              <span className="mdc-toolbar__title">
                <a href={SETTINGS.authenticated_site.base_url}>
                  {SETTINGS.authenticated_site.title}
                </a>{" "}
              </span>
            </section>
            <section className="mdc-toolbar__section mdc-toolbar__section--align-end user-menu-section">
              <UserMenu
                toggleShowUserMenu={toggleShowUserMenu}
                showUserMenu={showUserMenu}
                profile={profile}
              />
            </section>
          </div>
        </header>
      </div>
    )
  }
}
