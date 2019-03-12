// @flow
/* global SETTINGS: false */
import React from "react"
import { NavLink } from "react-router-dom"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import UserMenu from "./UserMenu"
import HamburgerAndLogo from "../components/HamburgerAndLogo"

import { SITE_SEARCH_URL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  showUserMenu: boolean,
  toggleShowDrawer: Function,
  toggleShowUserMenu: Function
}

export default class Toolbar extends React.Component<Props> {
  toolbarRoot: { current: null | React$ElementRef<typeof HTMLElement> }
  toolbar: Object

  constructor(props: Props) {
    super(props)
    this.toolbarRoot = React.createRef()
  }

  componentDidMount() {
    if (this.toolbarRoot.current) {
      this.toolbar = new MDCToolbar(this.toolbarRoot.current)
    }
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
        <header className="mdc-toolbar" ref={this.toolbarRoot}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <HamburgerAndLogo onHamburgerClick={this.toggleShowDrawer} />
            </section>
            <section className="mdc-toolbar__section mdc-toolbar__section--align-end user-menu-section">
              {SETTINGS.allow_search ? (
                <NavLink
                  exact
                  to={SITE_SEARCH_URL}
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
