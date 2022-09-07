import { useState, useEffect } from "react"
import isEmpty from "lodash/isEmpty"
import isNil from "lodash/isNil"

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

export const PHONE = "PHONE"
export const TABLET = "TABLET"
export const DESKTOP = "DESKTOP"

export const PHONE_WIDTH = 599
export const TABLET_WIDTH = 999

export const getViewportWidth = () => window.innerWidth

export const useWidth = () => {
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

  return width
}

export const useDeviceCategory = () => {
  const width = useWidth()

  if (width <= PHONE_WIDTH) {
    return PHONE
  }
  if (width <= TABLET_WIDTH) {
    return TABLET
  }
  return DESKTOP
}

export const emptyOrNil = (x: unknown): boolean => isNil(x) || isEmpty(x)
