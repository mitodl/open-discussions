// @flow
import { useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { useDispatch } from "react-redux"
import qs from "query-string"
import { useSelector } from "react-redux"

import { searchResultToLearningResource } from "../lib/search"
import { learningResourceSelector } from "../lib/queries/learning_resources"
import { pushLRHistory } from "../actions/ui"

import type { LearningResourceResult } from "../flow/searchTypes"

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
    // dependencies intentionall blank here
    // this effect should only run on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useSearchResultToFavoriteLR() {
  const selector = useSelector(learningResourceSelector)

  const getFavoriteOrListedObject = useCallback(
    (searchResult: LearningResourceResult) => {
      const object = searchResultToLearningResource(searchResult)
      const storedObject = selector(object.id, object.object_type)
      return storedObject || object
    },
    [selector]
  )
  return getFavoriteOrListedObject
}
