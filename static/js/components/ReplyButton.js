// @flow
import React from "react"

import LoginTooltip from "./LoginTooltip"

import { userIsAnonymous } from "../lib/util"

type Props = {
  beginEditing?: Function
}

const ReplyButton = ({ beginEditing }: Props) => (
  <LoginTooltip className="comment-reply-btn-popup">
    <div
      className="comment-action-button reply-button"
      onClick={beginEditing && !userIsAnonymous() ? beginEditing : null}
    >
      reply
    </div>
  </LoginTooltip>
)

export default ReplyButton
