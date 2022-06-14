// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { Route, Switch } from "react-router-dom"
import R from "ramda"

import ManageWidgetHeader from "../components/widgets/ManageWidgetHeader"
import { BannerPageWrapper } from "../components/PageBanner"

import { actions } from "../actions"

import type { FieldChannel } from "../flow/discussionTypes"
import type { Match } from "react-router"

type Props = {
  getFieldChannel: (fieldName: string) => Promise<*>,
  fieldName: string,
  fieldChannel: FieldChannel,
  history: Object,
  match: Match
}

class FieldChannelRouter extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (!R.eqProps("channelName", prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { getFieldChannel, fieldName } = this.props
    getFieldChannel(fieldName)
  }

  renderFieldIndexPage = routeProps => {
    const { fieldName } = this.props
    return <FieldPage fieldName={fieldName} {...routeProps} />
  }

  renderSearchPage = routeProps => {
    const { fieldName } = this.props
    //return <FieldSearchPage fieldName={fieldName} {...routeProps} />
  }

  renderMembersPage = () => {
    const { fieldName } = this.props
    //return <FieldMembersPage fieldName={fieldName} />
  }

  render() {
    const { fieldChannel, match, history } = this.props

    return (
      <BannerPageWrapper>
        {fieldChannel ? (
          <ChannelHeader
            fieldChannel={fieldChannel}
            history={history}
            isModerator={fieldChannel.user_is_moderator}
          >
            <ChannelNavbar channel={fieldChannel}>
              <ManageWidgetHeader channel={fieldChannel} />
            </ChannelNavbar>
          </ChannelHeader>
        ) : null}
        <Route exact path={match.url} render={this.renderFieldIndexPage} />
        <Switch>
          <Route
            path={`${match.url}/members/`}
            render={this.renderMembersPage}
          />
        </Switch>
      </BannerPageWrapper>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { fieldChannels } = state
  const fieldName = getFieldName(ownProps)
  const fieldChannel = fieldChannels.data.get(fieldName)

  return { fieldChannel, fieldName }
}

const mapDispatchToProps = {
  getFieldChannel: actions.fieldChannels.get
}

export default R.compose(connect(mapStateToProps, mapDispatchToProps))(
  FieldChannelRouter
)
