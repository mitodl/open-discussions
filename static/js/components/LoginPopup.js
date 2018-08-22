// @flow
import React from "react"
import onClickOutside from "react-onclickoutside"

import Button from "./Button"

type LoginPopupProps = {
  closePopup: Function,
  message: string,
  visible: boolean,
  className?: string
}

export class LoginPopupHelper extends React.Component<LoginPopupProps> {
  handleClickOutside = () => {
    const { closePopup, visible } = this.props
    if (visible) {
      closePopup()
    }
  }

  render() {
    const { message, visible, className } = this.props
    return visible ? (
      <div className={`popup login-popup ${className || ""}`}>
        <div className="triangle" />
        <Button className="close-popup" onClick={this.handleClickOutside}>
          <span>x</span>
        </Button>
        <div className="popup-title">{message}</div>
        <div className="bottom-row">
          <div className="popup-buttons">
            <a className="link-button" href="/login">
              Log In
            </a>
            <a className="link-button red" href="/signup">
              Become a member
            </a>
          </div>
        </div>
      </div>
    ) : null
  }
}

export default onClickOutside(LoginPopupHelper)
