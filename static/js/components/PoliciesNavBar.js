// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"

import IntraPageNav from "./IntraPageNav"

import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from "../lib/url"

const PoliciesNavBar = () => (
  <IntraPageNav>
    <NavLink to={TERMS_OF_SERVICE_URL}>Terms & Conditions</NavLink>{" "}
    <NavLink to={PRIVACY_POLICY_URL}>Privacy Statement</NavLink>
  </IntraPageNav>
)
export default PoliciesNavBar
