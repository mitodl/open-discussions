import React from "react"
import Grid from "@mui/material/Grid"
import type { GridProps } from "@mui/material/Grid"

type GridContainerProps = Omit<
  GridProps,
  "item" | "container" | "columnSpacing"
>

type ColumnVariant = "main-2" | "sidebar-2"
type GridItemProps = Omit<
  GridProps,
  "item" | "container" | "xs" | "sm" | "md" | "lg" | "xl"
> & { variant: ColumnVariant }

const columnVariants: Record<ColumnVariant, GridProps> = {
  "main-2": {
    xs: 12,
    md: 8
  },
  "sidebar-2": {
    xs: 12,
    md: 4
  }
}

/**
 * This is a thin wrapper around MUI's [Grid](https://mui.com/material-ui/react-grid/)
 * component specifying some app-specific props.
 */
const GridContainer: React.FC<GridContainerProps> = props => (
  <Grid container columnSpacing={6} {...props} />
)

/**
 * Represents a grid column and accepts a `variant` prop that determines the
 * column width.
 *
 * Supported Variants:
 *  - `main-2`, `side-2`: The main and sidebar columns in an asymetric two-column
 *    column layout. The layout collapses to a single column on small screens.
 *
 * This is a thin wrapper around MUI's [Grid](https://mui.com/material-ui/react-grid/)
 * component. This is a `<Grid item />` with breakpoint widths specified by `variant`.
 */
const GridColumn: React.FC<GridItemProps> = ({ variant, ...others }) => (
  <Grid item {...columnVariants[variant]} {...others} />
)

export { GridContainer, GridColumn }
