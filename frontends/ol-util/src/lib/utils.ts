import useMediaQuery from "@mui/material/useMediaQuery"
import type { Theme, Breakpoint } from "@mui/material/styles"

import isEmpty from "lodash/isEmpty"
import isNil from "lodash/isNil"
import padStart from "lodash/padStart"
import moment from "moment"

export const initials = (title: string): string => {
  return title
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(item => (item[0] ?? "").toUpperCase())
    .join("")
}

export const capitalize = (txt: string) =>
  (txt[0] ?? "").toUpperCase() + txt.slice(1).toLowerCase()

/**
 * Returns true if the screen width is at least as wide as the given MUI
 * breakpoint width.
 */
export const useMuiBreakpoint = (breakpoint: Breakpoint): boolean => {
  return useMediaQuery<Theme>(theme => theme.breakpoints.up(breakpoint))
}

export const emptyOrNil = (x: unknown): boolean => isNil(x) || isEmpty(x)

/**
 * Format an ISO-8601 duration string so to a readable format
 * The logic here ensures that if there is a colon (:) to the left
 * of a time component (minutes, seconds) it is zero-padded
 * hours are not included if they are zero
 * this follows what most humans would consider a reasonable "clock display" format
 * Examples of output of this function:
 *
 *  3:00:01
 *  43:07
 *  3:09
 *  0:47
 */
export const formatDurationClockTime = (value: string) => {
  const duration = moment.duration(value)
  const values = []

  if (duration.asHours() >= 1) {
    // never zero-pad this as it will always be the first component, if it present
    values.push(duration.hours().toString())
  }

  if (values.length) {
    // zero-pad the minutes if they're not the first time component
    values.push(padStart(duration.minutes().toString(), 2, "0"))
  } else {
    // otherwise it's not padded
    values.push(duration.minutes().toString())
  }

  // always zero-pad the seconds, because there's always at least a minutes component ahead of it
  values.push(padStart(duration.seconds().toString(), 2, "0"))

  return values.join(":")
}

/**
 * Append an 's' to the end of a string if the count is not 1. Optionally,
 * provide a custom plural string.
 */
export const pluralize = (singular: string, count: number, plural?: string) => {
  if (count === 1) {
    return singular
  }
  return plural ?? `${singular}s`
}

export const generateLoginRedirectUrl = () => {
  const pathname = window.location.pathname
  return `/login/?next=${pathname}`
}
