import React from "react"
import { GRID_MOBILE_BREAKPOINT } from "../constants"
import useResponsive from "../hooks/useResponsive"

const isMobileGridWidth = () => window.innerWidth < GRID_MOBILE_BREAKPOINT

type GridProps = {
  children: React.ReactNode
  className?: string
}

const gridClassName = (className?: string) =>
  `mdc-layout-grid ${className || ""}`.trim()

/**
 *
 * @deprecated Use [MUI `<Grid container />`](https://mui.com/material-ui/react-grid/) instead.
 */
const Grid = ({ children, className }: GridProps) => (
  <div className={gridClassName(className)}>
    <div className="mdc-layout-grid__inner">{children}</div>
  </div>
)

// these are the cell widths that the material grid supports
// this is cumbersome, but it lets us have some assurance from Flow
// that we're always passing a good value
export type CellWidth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type CellProps = {
  children?: React.ReactNode
  width: CellWidth
  mobileWidth?: CellWidth
  className?: string
  tabIndex?: number
}

const cellClassName = (width: number, className?: string) =>
  `mdc-layout-grid__cell--span-${width} ${className ?? ""}`.trim()

/**
 *
 * @deprecated Use [MUI `<Grid item />`](https://mui.com/material-ui/react-grid/) instead.
 */
const Cell = ({
  children,
  width,
  mobileWidth,
  className,
  tabIndex
}: CellProps) => {
  useResponsive()

  return (
    <div
      className={cellClassName(
        mobileWidth && isMobileGridWidth() ? mobileWidth : width,
        className
      )}
      tabIndex={tabIndex || -1}
    >
      {children}
    </div>
  )
}

export { Grid, Cell }
