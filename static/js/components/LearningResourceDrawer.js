// @flow
import React, { useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Drawer, DrawerContent } from "@rmwc/drawer"
import { Theme } from "@rmwc/theme"
import { useRequest } from "redux-query-react"
import { createSelector } from "reselect"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import { pushLRHistory, popLRHistory, clearLRHistory } from "../actions/ui"
import { embedlyRequest, getEmbedlys } from "../lib/queries/embedly"
import { LR_TYPE_VIDEO } from "../lib/constants"
import { useResponsive } from "../hooks/util"
import {
  learningResourceSelector,
  getResourceRequest
} from "../lib/queries/learning_resources"

const getLRHistory = createSelector(
  state => state.ui,
  ui => {
    const mostRecentHistoryEntry =
      ui.LRDrawerHistory[ui.LRDrawerHistory.length - 1]

    const objectId = mostRecentHistoryEntry
      ? mostRecentHistoryEntry.objectId
      : undefined
    const objectType = mostRecentHistoryEntry
      ? mostRecentHistoryEntry.objectType
      : undefined
    const runId = mostRecentHistoryEntry
      ? mostRecentHistoryEntry.runId
      : undefined

    return {
      objectId,
      objectType,
      runId,
      numHistoryEntries: ui.LRDrawerHistory.length
    }
  }
)

const getEmbedlyForObject = createSelector(
  getLRHistory,
  learningResourceSelector,
  getEmbedlys,
  (LRHistory, lrSelector, embedlys) => {
    const { objectId, objectType } = LRHistory
    const object = lrSelector(objectId, objectType)

    if (
      !object ||
      object.object_type !== LR_TYPE_VIDEO ||
      !object.url ||
      !embedlys
    ) {
      return null
    }

    return embedlys[object.url] || null
  }
)

export default function LearningResourceDrawer() {
  useResponsive()

  const { objectId, objectType, runId, numHistoryEntries } = useSelector(
    getLRHistory
  )

  useRequest(getResourceRequest(objectId, objectType))

  const object = useSelector(learningResourceSelector)(objectId, objectType)

  useRequest(
    objectType === LR_TYPE_VIDEO && object ? embedlyRequest(object.url) : null
  )

  const embedly = useSelector(getEmbedlyForObject)

  const dispatch = useDispatch()
  const clearHistory = useCallback(() => dispatch(clearLRHistory()), [dispatch])
  const pushHistory = useCallback(object => dispatch(pushLRHistory(object)), [
    dispatch
  ])
  const popHistory = useCallback(() => dispatch(popLRHistory()), [dispatch])

  return (
    <Theme>
      <Drawer
        open={numHistoryEntries > 0}
        onClose={clearHistory}
        dir="rtl"
        className="align-right lr-drawer"
        modal
      >
        <DrawerContent dir="ltr">
          <div className="drawer-nav">
            <div className="drawer-close" onClick={clearHistory}>
              <i className="material-icons clear">clear</i>
            </div>
            {numHistoryEntries > 1 ? (
              <div className="back" onClick={popHistory}>
                <i className="material-icons arrow_back">arrow_back</i>
              </div>
            ) : null}
          </div>
          {object ? (
            <ExpandedLearningResourceDisplay
              object={object}
              runId={runId}
              setShowResourceDrawer={pushHistory}
              embedly={embedly}
            />
          ) : null}
          <div className="footer" />
        </DrawerContent>
      </Drawer>
    </Theme>
  )
}
