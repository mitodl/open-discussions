// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import MITLogoLink from "./MITLogoLink"
import UserMenu from "./UserMenu"
import { COURSE_URL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  showUserMenu: boolean,
  toggleShowUserMenu: Function
}

export default class CourseToolbar extends React.Component<Props> {
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

  render() {
    const { toggleShowUserMenu, showUserMenu, profile } = this.props

    return (
      <div className="navbar">
        <header className="mdc-toolbar" ref={this.toolbarRoot}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <MITLogoLink />
              <span className="mdc-toolbar__title">
                <Link to="/">MIT Open</Link>
                {" | "}
                <Link to={COURSE_URL}>Courses</Link>
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
