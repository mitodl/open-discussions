// @flow

import React from "react"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "@rmwc/drawer"
import { Theme } from "@rmwc/theme"
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
import { isAudioPlayerLoadedSelector } from "../lib/redux_selectors"
import { getViewportWidth, isMobileWidth, DRAWER_BREAKPOINT } from "../lib/util"

import type { Dispatch } from "redux"
import type { Location } from "react-router"

type DrawerPropsFromState = {
  showDrawerDesktop: boolean,
  showDrawerMobile: boolean,
  showDrawerHover: boolean,
  audioPlayerLoaded: boolean
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
      return "persistent-drawer open"
    }
    if (showDrawerHover) {
      return "persistent-drawer hover"
    }
    return "persistent-drawer closed"
  }

  render() {
    const {
      showDrawerDesktop,
      showDrawerHover,
      showDrawerMobile,
      audioPlayerLoaded,
      location: { pathname }
    } = this.props
    const isMobile = isMobileWidth()

    const expanded = isMobile ? true : showDrawerDesktop || showDrawerHover
    const audioPlayerPadding = audioPlayerLoaded
      ? " audio-player-padding-bottom"
      : ""

    return (
      <div className={`${this.wrappingClass}${audioPlayerPadding}`}>
        <Theme>
          <Drawer
            modal={isMobile}
            open={isMobile ? showDrawerMobile : true}
            onClose={this.onDrawerClose}
            onPointerEnter={this.onMouseEnter}
            onPointerLeave={this.onMouseExit}
            className={this.wrappingClass}
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
                    <Navigation pathname={pathname} />
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
  showDrawerDesktop: state.ui.showDrawerDesktop,
  showDrawerHover:   state.ui.showDrawerHover,
  showDrawerMobile:  state.ui.showDrawerMobile,
  audioPlayerLoaded: isAudioPlayerLoadedSelector(state)
})

export default connect(mapStateToProps)(withRouter(ResponsiveDrawer))
