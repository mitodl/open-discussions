// @flow
import React from "react"

type CardProps = {
  children: React$Element<*>
}

const Card = ({ children }: CardProps) =>
  <div className="card">
    <div className="content">
      {children}
    </div>
  </div>

export default Card
