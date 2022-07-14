import React from "react"
import classnames from "classnames"

interface CardProps {
    children: React.ReactNode,
    className?: string,
    title?: React.ReactNode,
    borderless?: boolean,
    persistentShadow?: boolean
}


/**
 * Renders child content into some styled divs. Optionally specify whether the
 * card has border and permanent shadow.
 */
const Card: React.FC<CardProps> = ({ className, persistentShadow, borderless, title, children }) => {
  return (
    <div className={classnames("card", className, {
      borderless,
      "persistent-shadow": persistentShadow
    })}>
      <div className="card-contents">
        {title && <div className="card-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export default Card