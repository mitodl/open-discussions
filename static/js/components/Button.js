// @flow
import React from "react"

type ButtonProps = {
  children: React$Element<*, *, *>,
  onClick: Function
}

const Button = ({ children, onClick }: ButtonProps) =>
  <button
    className="mdc-button mdc-button--raised blue-button"
    onClick={onClick}
  >
    {children}
  </button>

export default Button
