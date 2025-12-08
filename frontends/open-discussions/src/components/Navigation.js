// @flow
import React from "react"
import { Link } from "react-router-dom"

import NavigationItem from "./NavigationItem"

import { FRONTPAGE_URL } from "../lib/url"

type Props = {
  pathname: string
}

const Navigation = ({ pathname }: Props) => (
  <div className="navigation">
    <div className="location-list">
      <div
        className={pathname === "/" ? "location current-location" : "location"}
      >
        <Link className="home-link" to={FRONTPAGE_URL}>
          <NavigationItem
            badge={() => <i className="material-icons home">home</i>}
            whenExpanded={() => <span className="title">Home</span>}
          />
        </Link>
      </div>
    </div>
  </div>
)

export default Navigation
