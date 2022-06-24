// @flow
import React, { useRef, useCallback, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Drawer, DrawerContent } from "@rmwc/drawer"
import { Theme } from "@rmwc/theme"
import { useRequest, useMutation } from "redux-query-react"
import { createSelector } from "reselect"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import { pushLRHistory, popLRHistory, clearLRHistory } from "../actions/ui"
import { embedlyRequest, getEmbedlys } from "../lib/queries/embedly"
import { LR_TYPE_VIDEO, OBJECT_TYPE_MAPPING } from "../lib/constants"
import { useResponsive } from "../hooks/util"
import {
  learningResourceSelector,
  getResourceRequest,
  similarResourcesRequest,
  getSimilarResources
} from "../lib/queries/learning_resources"
import { interactionMutation } from "../lib/queries/interactions"
import { isAudioPlayerLoadedSelector } from "../lib/redux_selectors"

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

const getSimilarResourcesForObject = createSelector(
  getLRHistory,
  learningResourceSelector,
  getSimilarResources,
  (LRHistory, lrSelector, similarResources) => {
    const { objectId, objectType } = LRHistory
    const object = lrSelector(objectId, objectType)

    if (!object || !object.id || !similarResources) {
      return null
    }
    return similarResources[`${object.object_type}_${object.id}`]
  }
)

type Props = {
  hideSimilarLearningResources?: boolean
}

export default function LearningResourceDrawer(props: Props) {
  const { hideSimilarLearningResources } = props

  const drawerContent = useRef()

  useResponsive()

  const { objectId, objectType, runId, numHistoryEntries } = useSelector(
    getLRHistory
  )

  const [, logInteraction] = useMutation(interactionMutation)

  useEffect(() => {
    if (!objectId || !objectType) {
      return
    }
    logInteraction("view", OBJECT_TYPE_MAPPING[objectType], objectId)
  }, [objectId, objectType, logInteraction])

  useRequest(getResourceRequest(objectId, objectType))

  const object = useSelector(learningResourceSelector)(objectId, objectType)

  useRequest(
    objectType === LR_TYPE_VIDEO && object ? embedlyRequest(object.url) : null
  )

  const embedly = useSelector(getEmbedlyForObject)

  useRequest(
    object && !hideSimilarLearningResources
      ? similarResourcesRequest(object)
      : null
  )

  const similarResources = useSelector(getSimilarResourcesForObject)

  const audioPlayerLoaded = useSelector(isAudioPlayerLoadedSelector)
  const audioPlayerPadding = audioPlayerLoaded
    ? " audio-player-padding-bottom"
    : ""

  const dispatch = useDispatch()

  const closeDrawer = useCallback(() => {
    dispatch(clearLRHistory())
    const { current } = drawerContent
    if (current) {
      current.scroll({ top: 0 })
    }
  }, [dispatch])

  const pushHistory = useCallback(object => dispatch(pushLRHistory(object)), [
    dispatch
  ])
  const popHistory = useCallback(() => dispatch(popLRHistory()), [dispatch])

  return (
    <Theme>
      <Drawer
        open={numHistoryEntries > 0}
        onClose={closeDrawer}
        dir="rtl"
        className={`align-right lr-drawer${audioPlayerPadding}`}
        modal
      >
        <DrawerContent dir="ltr" ref={drawerContent}>
          <div className="drawer-nav">
            <div
              tabIndex="0"
              className="drawer-close"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  closeDrawer()
                }
              }}
              onClick={closeDrawer}
            >
              <i className="material-icons clear">clear</i>
            </div>
            {numHistoryEntries > 1 ? (
              <div
                tabIndex="0"
                className="back"
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    popHistory()
                  }
                }}
                onClick={popHistory}
              >
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
              similarItems={similarResources}
              hideSimilarLearningResources={!!hideSimilarLearningResources}
            />
          ) : null}
          <div className="footer" />
        </DrawerContent>
      </Drawer>
    </Theme>
  )
}
