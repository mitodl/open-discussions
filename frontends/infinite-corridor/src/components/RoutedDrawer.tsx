import React, { useCallback, useEffect, useMemo, useState } from "react"
import Drawer from "@mui/material/Drawer"
import type { DrawerProps } from "@mui/material/Drawer"
import { useSearchParams } from "ol-util"
import IconButton from "@mui/material/IconButton"
import type { SxProps } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"

const closeSx: SxProps = {
  position: "absolute",
  top:      "8px",
  right:    "8px"
}

type ChildParams<K extends string, R extends K> = Record<K, string | null> &
  Record<R, string>
type RoutedDrawerProps<K extends string, R extends K> = {
  params: readonly K[]
  requiredParams: readonly R[]
  children: (childProps: {
    params: ChildParams<K, R>
    closeDrawer: () => void
  }) => React.ReactNode
} & Omit<DrawerProps, "open" | "onClose" | "children">
/**
 * A route-controlled drawer that monitors URL search parameters and
 *  - opens the drawer when all `requiredParams` are present in the URL and
 *    closes the drawer when this condition is no longer fulfilled.
 *  - closes the drawer when manually dismissed, and removes all `params` from
 *    the URL
 *
 * The drawer content is a render function called with the URL parameters as
 * props.
 */
const RoutedDrawer = <K extends string, R extends K>(
  props: RoutedDrawerProps<K, R>
) => {
  const { params, requiredParams, children, ...others } = props
  const [searchParams, setSearchParams] = useSearchParams()
  const looseChildParams = useMemo(() => {
    return Object.fromEntries(
      params.map(name => [name, searchParams.get(name)] as const)
    ) as Record<K, string | null>
  }, [searchParams, params])
  const [childParams, setChildParams] = useState<ChildParams<K, R> | null>()
  const requiredArePresent = requiredParams.every(
    name => looseChildParams[name] !== null
  )
  useEffect(() => {
    if (requiredArePresent) {
      setChildParams(looseChildParams as ChildParams<K, R>)
    }
  }, [requiredArePresent, looseChildParams])

  const removeUrlParams = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    props.params.forEach(param => {
      newSearchParams.delete(param)
    })
    setSearchParams(newSearchParams)
  }, [searchParams, setSearchParams, props.params])

  return (
    <Drawer open={requiredArePresent} onClose={removeUrlParams} {...others}>
      {childParams && (
        <>
          {children?.({ params: childParams, closeDrawer: removeUrlParams })}
          <IconButton sx={closeSx} onClick={removeUrlParams}>
            <CloseIcon />
          </IconButton>
        </>
      )}
    </Drawer>
  )
}

export default RoutedDrawer
export type { RoutedDrawerProps }
