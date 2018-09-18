// @flow
import React from "react"

type NavProps = {
  children: any
}

const IntraPageNav = ({ children }: NavProps) => (
  <div className="intra-page-nav">{children}</div>
)

export default IntraPageNav
