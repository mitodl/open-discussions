// @flow
// using the 'import * as' syntax to include types
import React from "react"

type CardProps = {|
  children: any,
  className?: string,
  title?: any
|}

const Card = ({ children, className, title }: CardProps) => (
  <div className={className ? `card ${className}` : "card"}>
    <div className="card-contents">
      {title ? <div className="title">{title}</div> : null}
      {children}
    </div>
  </div>
)

export default Card
