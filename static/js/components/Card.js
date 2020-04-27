// @flow
import React from "react"

type CardProps = {|
  children: any,
  className?: string,
  title?: any,
  borderless?: boolean,
  onClick?: Function,
  persistentShadow?: boolean
|}

const getClassName = (className, borderless, persistentShadow) => {
  const classes = [
    "card",
    className || "",
    borderless ? "borderless" : "",
    persistentShadow ? "persistent-shadow" : ""
  ]

  return classes
    .join(" ")
    .trim()
    .replace(/\s+/g, " ")
}

const Card = ({
  children,
  className,
  title,
  borderless,
  onClick,
  persistentShadow
}: CardProps) => (
  <div
    className={getClassName(className, borderless, persistentShadow)}
    onClick={onClick || null}
  >
    <div className="card-contents">
      {title ? <div className="title">{title}</div> : null}
      {children}
    </div>
  </div>
)

export default Card
