import * as R from "ramda"
import { useState, useEffect } from "react"

export const initials: (title: string) => string = R.pipe(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  R.split(/\s+/),
  R.slice(0, 2),
  R.map((item: string) => (item ? item[0].toUpperCase() : "")),
  R.join("")
)

export const capitalize = (txt: string) =>
  txt[0].toUpperCase() + txt.slice(1).toLowerCase()

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
