// @flow
import { connect } from "react-redux"
import { Link } from "react-router-dom"
import React from "react"
import R from "ramda"
import onClickOutside from "react-onclickoutside"

import Button from "./Button"


type LoginPopupProps = {
  closePopup: Function,
  message: Function
}

export class LoginPopupHelper extends React.Component<LoginPopupProps> {

  handleClickOutside = () => {
    const { closePopup } = this.props
    closePopup()
  }

  render() {
    const { message, closePopup } = this.props

    return (
      <div className="popup login-popup">
        <div className="triangle" />
        <Button className="close-popup" onClick={closePopup}>
          x
        </Button>
        <div className="popup-title">{message}</div>
        <div className="bottom-row">
          <div className="popup-buttons">
            <Link className="link-button" to="/login">
              Log In
            </Link>
            <Link className="link-button red" to="/signup">
              Become a member
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

export default R.compose(
  connect(
    R.always({}), // mapStateToProps is not needed - just return an object
  ),
  onClickOutside
)(LoginPopupHelper)
