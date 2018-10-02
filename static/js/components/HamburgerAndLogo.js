// @flow
/* global SETTINGS: false */
import React from "react"

type Props = {
  onHamburgerClick: Function
}

const HamburgerAndLogo = ({ onHamburgerClick }: Props) => (
  <React.Fragment>
    <a
      href="#"
      className="material-icons mdc-toolbar__icon--menu"
      onClick={onHamburgerClick}
    >
      menu
    </a>
    <a href="http://www.mit.edu" className="mitlogo">
      <img
        src={`/static/images/${
          SETTINGS.use_new_branding
            ? "MIT_circle.svg"
            : "mit-logo-transparent3.svg"
        }`}
      />
    </a>
  </React.Fragment>
)

export default HamburgerAndLogo
