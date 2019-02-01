// @flow
import React from "react"

type BackButtonProps = {|
  onClick: Function,
  className?: string
|}

const BackButton = ({ onClick, className }: BackButtonProps) => (
  <a
    href="#"
    onClick={onClick}
    className={`material-icons back-button ${className || ""}`}
  >
    keyboard_backspace
  </a>
)

export default BackButton
