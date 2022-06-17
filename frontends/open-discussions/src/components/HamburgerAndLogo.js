// @flow
/* global SETTINGS: false */
import React from "react"

import MITLogoLink from "./MITLogoLink"

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
    <MITLogoLink />
    <span className="mdc-toolbar__title">
      <a href={SETTINGS.authenticated_site.base_url}>
        {SETTINGS.authenticated_site.title}
      </a>{" "}
    </span>
  </React.Fragment>
)

export default HamburgerAndLogo
