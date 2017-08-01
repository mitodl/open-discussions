// @flow
import React from "react"

type CardProps = {
  children: React$Element<*>,
  className?: string
}

const Card = ({ children, className }: CardProps) =>
  <div className={className ? `card ${className}` : "card"}>
    <div className="content">
      {children}
    </div>
  </div>

export default Card
