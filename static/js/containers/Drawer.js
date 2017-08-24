// @flow
import React from "react"
import { connect } from "react-redux"
import { MDCTemporaryDrawer } from "@material/drawer/dist/mdc.drawer"
import { withRouter } from "react-router"
import R from "ramda"

import Navigation from "../components/Navigation"

import { setShowDrawer } from "../actions/ui"
import { getSubscribedChannels } from "../lib/redux_selectors"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"
import type { Location } from "react-router"

class Drawer extends React.Component {
  // the ref for the rendered DOM element, which MDCTemporaryDrawer needs
  // access to in order to manage it's animations and so on
  drawerRoot: React$Element<*, *, *>
  mdcDrawer: Object

  props: {
    location: Location,
    dispatch: Dispatch,
    showDrawer: boolean,
    subscribedChannels: Array<Channel>
  }

  componentDidMount() {
    this.mdcDrawer = new MDCTemporaryDrawer(this.drawerRoot)
    this.mdcDrawer.listen("MDCTemporaryDrawer:close", this.onDrawerClose)
  }

  onDrawerClose = () => {
    const { dispatch, showDrawer } = this.props

    // two MDCTemporaryDrawer:close events seem to fire when the drawer
    // closes, so this is a little hack to debounce that.
    if (showDrawer) {
      dispatch(setShowDrawer(false))
    }
  }

  componentWillUnmount() {
    if (this.mdcDrawer) {
      this.mdcDrawer.destroy()
    }
  }

  componentDidUpdate() {
    const { showDrawer } = this.props
    this.mdcDrawer.open = showDrawer
  }

  render() {
    const { subscribedChannels, location: { pathname } } = this.props

    return (
      <aside
        className="mdc-temporary-drawer mdc-typography"
        ref={div => (this.drawerRoot = div)}
      >
        <nav className="mdc-temporary-drawer__drawer">
          <header className="mdc-temporary-drawer__header">
            <div className="mdc-temporary-drawer__header-content">
              Open Discussions
            </div>
          </header>
          <nav className="mdc-temporary-drawer__content mdc-list">
            <Navigation
              subscribedChannels={subscribedChannels}
              pathname={pathname}
            />
          </nav>
        </nav>
      </aside>
    )
  }
}

const mapStateToProps = state => ({
  subscribedChannels: getSubscribedChannels(state),
  channels:           state.channels,
  showDrawer:         state.ui.showDrawer
})

export default R.compose(connect(mapStateToProps), withRouter)(Drawer)
