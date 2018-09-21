// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import UserMenu from "./UserMenu"
import { LOGIN_URL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: Profile,
  showUserMenu: boolean,
  toggleShowDrawer: Function,
  toggleShowUserMenu: Function
}

const loginButton = () =>
  SETTINGS.allow_email_auth ? (
    <Link to={LOGIN_URL} className="link-button outlined login-link">
      Log In
    </Link>
  ) : null

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
              <a
                href="#"
                className="material-icons mdc-toolbar__icon--menu"
                onClick={this.toggleShowDrawer}
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
              {SETTINGS.username ? (
                <UserMenu
                  toggleShowUserMenu={toggleShowUserMenu}
                  showUserMenu={showUserMenu}
                  profile={profile}
                />
              ) : (
                loginButton()
              )}
            </section>
          </div>
        </header>
      </div>
    )
  }
}
