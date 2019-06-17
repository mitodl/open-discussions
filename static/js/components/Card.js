// @flow
import React from "react"

type CardProps = {|
  children: any,
  className?: string,
  title?: any,
  borderless?: boolean,
  onClick?: Function
|}

const getClassName = (className, borderless) =>
  `card ${className || ""} ${borderless ? "borderless" : ""}`
    .trim()
    .replace(/\s+/g, " ")

const Card = ({
  children,
  className,
  title,
  borderless,
  onClick
}: CardProps) => (
  <div
    className={getClassName(className, borderless)}
    onClick={onClick || null}
  >
    <div className="card-contents">
      {title ? <div className="title">{title}</div> : null}
      {children}
    </div>
  </div>
)

export default Card
