// @flow
import React from "react"
import { Link } from "react-router-dom"
import onClickOutside from "react-onclickoutside"

import Button from "./Button"

type LoginPopupProps = {
  closePopup: Function,
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
    const { visible, className } = this.props
    return visible ? (
      <div className={`popup login-popup ${className || ""}`}>
        <div className="triangle" />
        <Button className="close-btn" onClick={this.handleClickOutside}>
          <i className="material-icons">close</i>
        </Button>
        <h4>Join MIT Open</h4>
        <div className="popup-text">
          As a member, you can share your ideas, subscribe, vote, and comment on
          educational content that matters to you.
        </div>
        <div className="bottom-row">
          <div className="popup-buttons">
            <Link className="link-button" to="/login">
              Log In
            </Link>
            <Link className="link-button red" to="/signup">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    ) : null
  }
}

export default onClickOutside(LoginPopupHelper)
