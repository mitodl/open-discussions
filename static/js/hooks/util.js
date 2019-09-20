// @flow
import { useState, useEffect } from "react"

import { getViewportWidth } from "../lib/util"
import {
  PHONE,
  PHONE_WIDTH,
  TABLET,
  TABLET_WIDTH,
  DESKTOP
} from "../lib/constants"

export const useDeviceCategory = () => {
  const [width, setWidth] = useState(getViewportWidth())

  useEffect(() => {
    const cb = () => {
      setWidth(getViewportWidth())
    }
    window.addEventListener("resize", cb)
    return () => {
      window.removeEventListener("resize", cb)
    }
  }, [])

  if (width <= PHONE_WIDTH) {
    return PHONE
  }
  if (width <= TABLET_WIDTH) {
    return TABLET
  }
  return DESKTOP
}
