// @flow
import React from "react"

type CardProps = {|
  children: any,
  className?: string,
  title?: any,
  borderless?: boolean,
  persistentShadow?: boolean
|}

const getClassName = (className, borderless, persistentShadow) => {
  const classes = [
    "card",
    className || "",
    borderless ? "borderless" : "",
    persistentShadow ? "persistent-shadow" : ""
  ]

  return classes.join(" ").trim().replace(/\s+/g, " ")
}

/**
 * Renders child content into some styled divs. Optionally specify whether the
 * card has border and permanent shadow.
 *
 * @deprecated Use MUI cards instead.
 */
const Card = ({
  children,
  className,
  title,
  borderless,
  persistentShadow
}: CardProps) => {
  return (
    <div className={getClassName(className, borderless, persistentShadow)}>
      <div className="card-contents">
        {title && <div className="card-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export default Card
