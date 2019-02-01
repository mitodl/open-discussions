// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { Route, Switch } from "react-router-dom"
import R from "ramda"

import ChannelPage from "./ChannelPage"
import SearchPage from "./SearchPage"
import PostPage from "./PostPage"
import ManageWidgetHeader from "./widgets/ManageWidgetHeader"
import ChannelAboutPage from "./ChannelAboutPage"

import ChannelHeader from "../components/ChannelHeader"
import ChannelNavbar from "../components/ChannelNavbar"

import { actions } from "../actions"
import { getChannelName } from "../lib/util"
import { searchRoute } from "../lib/routing"

import type { Channel } from "../flow/discussionTypes"
import type { Match } from "react-router"

type Props = {
  getChannel: (channelName: string) => Promise<*>,
  channelName: string,
  channel: Channel,
  history: Object,
  match: Match
}

class ChannelRouter extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (!R.eqProps("channelName", prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { getChannel, channelName } = this.props

    getChannel(channelName)
  }

  renderChannelIndexPage = routeProps => {
    const { channelName } = this.props
    return <ChannelPage channelName={channelName} {...routeProps} />
  }

  renderSearchPage = routeProps => {
    const { channelName } = this.props
    return <SearchPage channelName={channelName} {...routeProps} />
  }

  renderPostPage = routeProps => {
    const { channelName } = this.props
    return <PostPage channelName={channelName} {...routeProps} />
  }

  renderAboutPage = () => {
    const { channel } = this.props
    return <ChannelAboutPage channel={channel} />
  }

  renderChannelNavbar = (withWidgetHeader: boolean) => {
    const { channel } = this.props
    return (
      <ChannelNavbar channel={channel}>
        {withWidgetHeader ? <ManageWidgetHeader channel={channel} /> : null}
      </ChannelNavbar>
    )
  }

  render() {
    const { channel, match, history } = this.props

    return (
      <div className="channel-page-wrapper">
        {channel ? (
          <ChannelHeader
            channel={channel}
            history={history}
            isModerator={channel.user_is_moderator}
          >
            <Route
              exact
              path={match.url}
              render={() => this.renderChannelNavbar(true)}
            />
            <Route
              path={`${match.url}/about/`}
              render={() => this.renderChannelNavbar(true)}
            />
            {SETTINGS.allow_search ? (
              <Route
                path={searchRoute(match.url)}
                render={() => this.renderChannelNavbar(false)}
              />
            ) : null}
          </ChannelHeader>
        ) : null}
        <Route exact path={match.url} render={this.renderChannelIndexPage} />
        <Switch>
          {SETTINGS.allow_search ? (
            <Route
              path={`${match.url}/search/`}
              render={this.renderSearchPage}
            />
          ) : null}
          <Route path={`${match.url}/about/`} render={this.renderAboutPage} />
          ) : null}
          <Route
            exact
            path={`${match.url}/:postID/:postSlug?`}
            render={this.renderPostPage}
          />
          <Route
            exact
            path={`${match.url}/:postID/:postSlug?/comment/:commentID`}
            component={this.renderPostPage}
          />
        </Switch>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { channels } = state
  const channelName = getChannelName(ownProps)
  const channel = channels.data.get(channelName)

  return { channel, channelName }
}

const mapDispatchToProps = {
  getChannel: actions.channels.get
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ChannelRouter)
