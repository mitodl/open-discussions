// @flow
import React from "react"

type Props = {
  onClick: Function
}

const CloseButton = ({ onClick }: Props) => (
  <div className="close-button" onClick={onClick}>
    <i className="material-icons clear">clear</i>
  </div>
)

export default CloseButton
