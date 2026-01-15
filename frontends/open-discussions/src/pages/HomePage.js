// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import MetaTags from "../components/MetaTags"

import Card from "../components/Card"
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
        <Card className="shutdown-notice">
          <div className="shutdown-message">
            <h2>Service Shutdown Notice</h2>
            <p>
              This site is being shut down. The discussion channels that were
              previously available on open.mit.edu are no longer in service.
            </p>
            <p>
              We encourage you to explore our new learning platform at{" "}
              <a
                href="https://learn.mit.edu"
                target="_blank"
                rel="noopener noreferrer"
              >
                learn.mit.edu
              </a>
              .
            </p>
            <p>
              If you have any questions, please{" "}
              <a
                href="https://mitlearn.zendesk.com/hc/en-us/requests/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                contact us
              </a>
              .
            </p>
          </div>
        </Card>
        <IntroCard />
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
