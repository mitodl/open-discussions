// @flow
/* global SETTINGS: false */
import React from "react"
import { NavLink } from "react-router-dom"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import UserMenu from "./UserMenu"
import HamburgerAndLogo from "../components/HamburgerAndLogo"

import { siteSearchURL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  showUserMenu: boolean,
  toggleShowDrawer: Function,
  toggleShowUserMenu: Function
}

export default class Toolbar extends React.Component<Props> {
  toolbarRoot: HTMLElement | null
  toolbar: Object

  componentDidMount() {
    this.toolbar = new MDCToolbar(this.toolbarRoot)
  }

  componentWillUnmount() {
    if (this.toolbar) {
      this.toolbar.destroy()
    }
  }

  toggleShowDrawer = (e: Event) => {
    const { toggleShowDrawer } = this.props
    e.preventDefault()
    toggleShowDrawer()
  }

  render() {
    const { toggleShowUserMenu, showUserMenu, profile } = this.props

    return (
      <div className="navbar">
        <header className="mdc-toolbar" ref={div => (this.toolbarRoot = div)}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <HamburgerAndLogo onHamburgerClick={this.toggleShowDrawer} />
              <span className="mdc-toolbar__title">
                <a href={SETTINGS.authenticated_site.base_url}>
                  {SETTINGS.authenticated_site.title}
                </a>{" "}
              </span>
            </section>
            <section className="mdc-toolbar__section mdc-toolbar__section--align-end user-menu-section">
              {SETTINGS.allow_search ? (
                <NavLink
                  exact
                  to={siteSearchURL()}
                  activeClassName="active"
                  className="search-link navy"
                >
                  <i className="material-icons">search</i>
                </NavLink>
              ) : null}
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
