// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "rmwc/Drawer"
import { Theme } from "rmwc/Theme"
import ScrollArea from "react-scrollbar"

import Navigation from "../components/Navigation"
import HamburgerAndLogo from "../components/HamburgerAndLogo"
import Footer from "../components/Footer"

import { setShowDrawerMobile, setShowDrawerDesktop } from "../actions/ui"
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
  subscribedChannels: Array<Channel>,
  channels: Map<string, Channel>
}

type DrawerProps = DrawerPropsFromState & {
  location: Location,
  dispatch: Dispatch<*>
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

  onDrawerClose = () => {
    const { dispatch } = this.props

    if (isMobileWidth()) {
      dispatch(setShowDrawerMobile(false))
    } else {
      dispatch(setShowDrawerDesktop(false))
    }
  }

  render() {
    const {
      channels,
      showDrawerDesktop,
      showDrawerMobile,
      subscribedChannels,
      location: { pathname }
    } = this.props
    const isMobile = isMobileWidth()

    const wrappingClass =
      !isMobile && showDrawerDesktop ? "persistent-drawer-open" : ""

    const channelName = getChannelNameFromPathname(pathname)
    const currentChannel = channels.get(channelName)
    let showComposeLink, composeHref, useLoginPopup
    if (userIsAnonymous()) {
      showComposeLink = true
      useLoginPopup = true
    } else {
      showComposeLink = currentChannel
        ? userCanPost(currentChannel)
        : R.any(userCanPost, [...channels.values()])
      composeHref = newPostURL(channelName)
      useLoginPopup = false
    }

    return (
      <div className={wrappingClass}>
        <Theme>
          <Drawer
            persistent={!isMobile}
            temporary={isMobile}
            open={isMobile ? showDrawerMobile : showDrawerDesktop}
            onClose={this.onDrawerClose}
          >
            <ScrollArea horizontal={false}>
              <DrawerContent>
                <div>
                  {isMobile ? (
                    <div className="drawer-mobile-header">
                      <HamburgerAndLogo onHamburgerClick={this.onDrawerClose} />
                    </div>
                  ) : null}
                  <Navigation
                    subscribedChannels={subscribedChannels}
                    pathname={pathname}
                    showComposeLink={showComposeLink}
                    composeHref={composeHref}
                    useLoginPopup={useLoginPopup}
                  />
                </div>
                <Footer />
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
  showDrawerMobile:   state.ui.showDrawerMobile,
  channels:           state.channels.data
})

export default R.compose(
  connect(mapStateToProps),
  withRouter
)(ResponsiveDrawer)
