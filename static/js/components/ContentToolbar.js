// @flow
/* global SETTINGS: false */
import React from "react"
import { Link, Route } from "react-router-dom"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

import MITLogoLink from "./MITLogoLink"
import UserMenu from "./UserMenu"
import ResponsiveWrapper from "./ResponsiveWrapper"

import { TABLET, DESKTOP } from "../lib/constants"
import { COURSE_URL, userListIndexURL, PODCAST_URL } from "../lib/url"
import { userIsAnonymous } from "../lib/util"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  showUserMenu: boolean,
  toggleShowUserMenu: Function
}

export default class ContentToolbar extends React.Component<Props> {
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
      <div className="navbar course-toolbar">
        <header className="mdc-toolbar" ref={this.toolbarRoot}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <MITLogoLink />
              <div className="mdc-toolbar__title">
                <Link className="home-link" to="/">
                  MIT Open
                </Link>
                <div className="bar">{" | "}</div>
                <Route path="/learn/">
                  <Link className="section-link" to={COURSE_URL}>
                    LEARN
                  </Link>
                </Route>
                <Route path="/podcasts/">
                  <Link className="section-link" to={PODCAST_URL}>
                    PODCASTS
                  </Link>
                </Route>
              </div>
            </section>
            <section className="mdc-toolbar__section mdc-toolbar__section--align-end user-menu-section">
              <ResponsiveWrapper onlyOn={[TABLET, DESKTOP]}>
                {userIsAnonymous() ? (
                  <div />
                ) : (
                  <Link className="user-list-link" to={userListIndexURL}>
                    <i className="material-icons">bookmark</i>
                    My Lists
                  </Link>
                )}
              </ResponsiveWrapper>
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
