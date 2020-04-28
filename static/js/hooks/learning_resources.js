// @flow
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useDispatch } from "react-redux"
import qs from "query-string"

import { pushLRHistory } from "../actions/ui"

export function useLRDrawerParams() {
  const { search } = useLocation()
  // eslint-disable-next-line camelcase
  const { lr_id, type } = qs.parse(search)

  return {
    objectId:   lr_id,
    objectType: type
  }
}

export function useLearningResourcePermalink() {
  const dispatch = useDispatch()
  const { objectId, objectType } = useLRDrawerParams()

  useEffect(() => {
    if (objectId && objectType) {
      dispatch(
        pushLRHistory({
          objectId,
          objectType
        })
      )
    }
  }, [])
}
