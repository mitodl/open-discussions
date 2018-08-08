// @flow
/* global SETTINGS: false */
import React from "react"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import UserMenu from "./UserMenu"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: Profile,
  showUserMenu: boolean,
  toggleShowDrawer: Function,
  toggleShowUserMenu: Function
}

export default class Toolbar extends React.Component<Props> {
  toolbarRoot: HTMLElement | null
  toolbar: Object

  constructor(props: Props) {
    super(props)
    this.toolbarRef = React.createRef()
  }

  componentDidMount() {
    if (this.toolbarRef.current) {
      this.toolbar = new MDCToolbar(this.toolbarRef.current)
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
        <header className="mdc-toolbar" ref={this.toolbarRef}>
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
            {SETTINGS.username ? (
              <section className="mdc-toolbar__section mdc-toolbar__section--align-end user-menu-section">
                <UserMenu
                  toggleShowUserMenu={toggleShowUserMenu}
                  showUserMenu={showUserMenu}
                  profile={profile}
                />
              </section>
            ) : null}
          </div>
        </header>
      </div>
    )
  }
}
