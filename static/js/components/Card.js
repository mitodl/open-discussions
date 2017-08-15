// @flow
import React from "react"

type CardProps = {
  children: React$Element<*>,
  className?: string,
  title?: string
}

const Card = ({ children, className, title }: CardProps) =>
  <div className={className ? `card ${className}` : "card"}>
    <div className="card-contents">
      {title
        ? <div className="title">
          {title}
        </div>
        : null}
      {children}
    </div>
  </div>

export default Card
