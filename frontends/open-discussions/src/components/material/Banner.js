// @flow
import React from "react"

import type { BannerState } from "../../reducers/ui"

type Props = {
  banner: BannerState,
  hide: Function
}

export default class Banner extends React.Component<Props> {
  render() {
    const {
      banner: { message, visible },
      hide
    } = this.props

    const activeClass = visible ? "banner--active" : ""

    return (
      <div
        className={`banner ${activeClass}`}
        aria-live="assertive"
        aria-atomic="true"
        aria-hidden={!visible}
      >
        <div className="message">{message}</div>
        <a href="#" onClick={hide} className="material-icons close">
          close
        </a>
      </div>
    )
  }
}
