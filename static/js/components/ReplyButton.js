// @flow
import React from "react"

import LoginPopup from "./LoginPopup"
import { commentLoginText, userIsAnonymous } from "../lib/util"

type Props = {
  beginEditing?: Function
}

type State = {
  popupVisible: boolean
}

export default class ReplyButton extends React.Component<Props, State> {
  constructor() {
    super()
    this.state = {
      popupVisible: false
    }
  }

  onTogglePopup = async () => {
    const { popupVisible } = this.state
    this.setState({
      popupVisible: !popupVisible
    })
  }

  render() {
    const { beginEditing } = this.props
    const { popupVisible } = this.state
    return (
      <div>
        <div
          className="comment-action-button reply-button"
          onClick={e => {
            beginEditing && !userIsAnonymous()
              ? beginEditing(e)
              : this.onTogglePopup()
          }}
        >
          reply
        </div>
        {userIsAnonymous() ? (
          <LoginPopup
            message={commentLoginText}
            visible={popupVisible}
            closePopup={this.onTogglePopup}
          />
        ) : null}
      </div>
    )
  }
}
