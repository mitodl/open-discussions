import { createTheme } from "@mui/material/styles"

/**
 * MaterialUI Theme for Infinite Corridor.
 */
const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#a31f34"
    },
    secondary: {
      main: "#03152d"
    },
    text: {
      primary: "#03152d",
    },
  },
  breakpoints: {
    values: {
      // These match our theme breakpoints in breakpoints.scss
      xs: 0, // mui default
      sm: 600, // mui defailt
      md: 840, // custom
      lg: 1200, // mui default
      xl: 1536 // mui default
    }
  }
})

export { muiTheme }
