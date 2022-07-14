// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { Card } from "ol-util" 

import { actions } from "../actions"
import { livestreamEventURL } from "../lib/embed"

import type { LiveStreamEvent } from "../flow/livestreamTypes"

type StateProps = {|
  liveEvent: ?LiveStreamEvent
|}

type DispatchProps = {|
  getLivestream: Function
|}

type Props = {|
  ...StateProps,
  ...DispatchProps
|}

export class LiveStream extends React.Component<Props> {
  componentDidMount() {
    const { getLivestream } = this.props

    if (SETTINGS.livestream_ui_enabled) {
      getLivestream()
    }
  }

  render() {
    const { liveEvent } = this.props

    if (liveEvent && SETTINGS.livestream_ui_enabled) {
      const { ownerAccountId, id } = liveEvent

      return (
        <Card className="widget">
          <div className="title-row">
            <span className="title">Live Now @MIT</span>
          </div>
          <iframe
            src={livestreamEventURL(ownerAccountId, id)}
            frameBorder="0"
            scrolling="no"
            allowFullScreen
          />
        </Card>
      )
    } else {
      return null
    }
  }
}

const getLiveEvent = R.find(R.propEq("isLive", true))

const mapStateToProps = ({ livestream }): StateProps => ({
  liveEvent: getLiveEvent(livestream.data)
})

const mapDispatchToProps = {
  getLivestream: actions.livestream.get
}

export default connect<Props, {||}, _, DispatchProps, _, _>(
  mapStateToProps,
  mapDispatchToProps
)(LiveStream)
