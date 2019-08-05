// @flow
import React, { useState, useEffect } from "react"

import { isMobileGridWidth } from "../lib/util"

type GridProps = {
  children: any,
  className?: string
}

const gridClassName = (className: ?string) =>
  `mdc-layout-grid ${className || ""}`.trim()

export const Grid = ({ children, className }: GridProps) => (
  <div className={gridClassName(className)}>
    <div className="mdc-layout-grid__inner">{children}</div>
  </div>
)

// these are the cell widths that the material grid supports
// this is cumbersome, but it lets us have some assurance from Flow
// that we're always passing a good value
const one: 1 = 1
const two: 2 = 2
const three: 3 = 3
const four: 4 = 4
const five: 5 = 5
const six: 6 = 6
const seven: 7 = 7
const eight: 8 = 8
const nine: 9 = 9
const ten: 10 = 10
const eleven: 11 = 11
const twelve: 12 = 12

type CellWidth =
  | typeof one
  | typeof two
  | typeof three
  | typeof four
  | typeof five
  | typeof six
  | typeof seven
  | typeof eight
  | typeof nine
  | typeof ten
  | typeof eleven
  | typeof twelve

type CellProps = {
  children?: any,
  width: CellWidth,
  mobileWidth?: CellWidth,
  className?: string
}

const cellClassName = (width, className) =>
  `mdc-layout-grid__cell--span-${width} ${className || ""}`.trim()

export const Cell = ({
  children,
  width,
  mobileWidth,
  className
}: CellProps) => {
  const [, setState] = useState(null)

  useEffect(() => {
    window.addEventListener("resize", setState)

    return () => {
      window.removeEventListener("resize", setState)
    }
  }, [])

  return (
    <div
      className={cellClassName(
        mobileWidth && isMobileGridWidth() ? mobileWidth : width,
        className
      )}
    >
      {children}
    </div>
  )
}
