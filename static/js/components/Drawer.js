// @flow

import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "rmwc/Drawer"
import { Theme } from "rmwc/Theme"
import ScrollArea from "react-scrollbar"

import Navigation from "../components/Navigation"
import NavigationItem, {
  NavigationExpansion
} from "../components/NavigationItem"
import HamburgerAndLogo from "../components/HamburgerAndLogo"
import Footer from "../components/Footer"

import {
  setShowDrawerMobile,
  setShowDrawerHover,
  setShowDrawerDesktop
} from "../actions/ui"
import { getSubscribedChannels } from "../lib/redux_selectors"
import {
  getViewportWidth,
  isMobileWidth,
  DRAWER_BREAKPOINT,
  userIsAnonymous
} from "../lib/util"
import { getChannelNameFromPathname, newPostURL } from "../lib/url"
import { userCanPost } from "../lib/channels"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"
import type { Location } from "react-router"

type DrawerPropsFromState = {
  showDrawerDesktop: boolean,
  showDrawerMobile: boolean,
  showDrawerHover: boolean,
  subscribedChannels: Array<Channel>,
  channels: Map<string, Channel>
}

type DrawerProps = DrawerPropsFromState & {
  location: Location,
  dispatch: Dispatch<*>,
  reversed?: boolean
}

export class ResponsiveDrawer extends React.Component<DrawerProps> {
  width: number

  constructor(props: DrawerProps) {
    super(props)
    this.width = getViewportWidth()
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.onResize())
  }

  onResize() {
    const { showDrawerMobile, dispatch } = this.props
    const newWidth = getViewportWidth()

    if (
      newWidth > this.width &&
      newWidth > DRAWER_BREAKPOINT &&
      this.width < DRAWER_BREAKPOINT &&
      showDrawerMobile
    ) {
      dispatch(setShowDrawerMobile(false))
    }

    this.width = newWidth

    // this setState call forces a re-render of the component
    // to ensure that the drawer is responsive
    this.setState({})
  }

  onMouseEnter = () => {
    const { dispatch } = this.props
    dispatch(setShowDrawerHover(true))
  }

  onMouseExit = () => {
    const { dispatch } = this.props
    dispatch(setShowDrawerHover(false))
  }

  onDrawerClose = () => {
    const { dispatch } = this.props

    if (isMobileWidth()) {
      dispatch(setShowDrawerMobile(false))
    } else {
      dispatch(setShowDrawerDesktop(false))
    }
  }

  get wrappingClass() {
    const { showDrawerDesktop, showDrawerHover } = this.props

    const isMobile = isMobileWidth()

    if (isMobile) {
      return ""
    }
    if (showDrawerDesktop) {
      return "persistent-drawer-open"
    }
    if (showDrawerHover) {
      return "persistent-drawer-hover"
    }
    return "persistent-drawer-closed"
  }

  render() {
    const {
      channels,
      showDrawerDesktop,
      showDrawerHover,
      showDrawerMobile,
      subscribedChannels,
      location: { pathname }
    } = this.props
    const isMobile = isMobileWidth()

    const channelName = getChannelNameFromPathname(pathname)
    const currentChannel = channels.get(channelName)

    const composeHref = userIsAnonymous() ? null : newPostURL(channelName)

    let showComposeLink
    if (userIsAnonymous()) {
      showComposeLink = true
    } else {
      showComposeLink = currentChannel
        ? userCanPost(currentChannel)
        : R.any(userCanPost, [...channels.values()])
    }

    const expanded = isMobile ? true : showDrawerDesktop || showDrawerHover

    return (
      <div className={this.wrappingClass}>
        <Theme>
          <Drawer
            persistent={!isMobile}
            temporary={isMobile}
            open={isMobile ? showDrawerMobile : true}
            onClose={this.onDrawerClose}
            onPointerEnter={this.onMouseEnter}
            onPointerLeave={this.onMouseExit}
          >
            <ScrollArea horizontal={false}>
              <DrawerContent>
                <NavigationExpansion.Provider value={expanded}>
                  <div>
                    {isMobile ? (
                      <div className="drawer-mobile-header">
                        <HamburgerAndLogo
                          onHamburgerClick={this.onDrawerClose}
                        />
                      </div>
                    ) : null}
                    <Navigation
                      subscribedChannels={subscribedChannels}
                      pathname={pathname}
                      showComposeLink={showComposeLink}
                      composeHref={composeHref}
                    />
                  </div>
                  <NavigationItem fading whenExpanded={() => <Footer />} />
                </NavigationExpansion.Provider>
              </DrawerContent>
            </ScrollArea>
          </Drawer>
        </Theme>
      </div>
    )
  }
}

export const mapStateToProps = (state: Object): DrawerPropsFromState => ({
  subscribedChannels: getSubscribedChannels(state),
  showDrawerDesktop:  state.ui.showDrawerDesktop,
  showDrawerHover:    state.ui.showDrawerHover,
  showDrawerMobile:   state.ui.showDrawerMobile,
  channels:           state.channels.data
})

export default R.compose(
  connect(mapStateToProps),
  withRouter
)(ResponsiveDrawer)
