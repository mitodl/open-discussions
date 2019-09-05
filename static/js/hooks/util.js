// @flow
import { useState, useEffect } from "react"

import { getViewportWidth } from "../lib/util"
import { PHONE, TABLET, DESKTOP } from "../lib/constants"

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

  if (width <= 580) {
    return PHONE
  }
  if (width <= 800) {
    return TABLET
  }
  return DESKTOP
}
