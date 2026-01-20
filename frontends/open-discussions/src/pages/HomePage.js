// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import MetaTags from "../components/MetaTags"

import ShutdownNotice from "../components/ShutdownNotice"
import NewCoursesWidget from "../components/NewCoursesWidget"
import LiveStream from "../components/LiveStream"
import IntroCard from "../components/IntroCard"
import { withSidebar } from "../hoc/withSidebar"

import type { Match } from "react-router"
import type { Dispatch } from "redux"
import type { Location } from "react-router"

type Props = {
  match: Match,
  location: Location,
  dispatch: Dispatch<any>,
  showSidebar: boolean
}

export class HomePage extends React.Component<Props> {
  render() {
    const { match } = this.props

    return (
      <React.Fragment>
        <MetaTags canonicalLink={match?.url} />
        <IntroCard />
        <ShutdownNotice />
        <div className="home-content">
          <p>
            Welcome to MIT Open Learning. Use the search feature to find
            courses, podcasts, and learning resources.
          </p>
        </div>
      </React.Fragment>
    )
  }
}

export const mapStateToProps = (state: Object) => ({
  showSidebar: state.ui.showSidebar
})

const HomepageSidebar = () => (
  <React.Fragment>
    <LiveStream />
    {SETTINGS.course_ui_enabled ? <NewCoursesWidget /> : null}
  </React.Fragment>
)

export default R.compose(
  connect(mapStateToProps),
  withSidebar(HomepageSidebar, "home-page")
)(HomePage)
