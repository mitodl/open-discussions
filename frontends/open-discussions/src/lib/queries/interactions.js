// @flow
import { createSelector } from "reselect"

import {
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE,
} from "../constants"
import { interactionsApiURL, popularContentUrl } from "../url"
import { constructIdMap, DEFAULT_POST_OPTIONS } from "../redux_query"
import {
  filterObjectType,
  learningResourceSelector,
  updateLearningResources,
  mapResourcesToResourceRefs
} from "./learning_resources"

import type {
  LearningResourceRef,
  LearningResource
} from "../../flow/discussionTypes"

export const interactionMutation = (
  interactionType: string,
  contentType: string,
  contentId: number
) => {
  return {
    queryKey: "interactionMutation",
    body:     {
      interaction_type: interactionType,
      content_type:     contentType,
      content_id:       contentId
    },
    url:     interactionsApiURL,
    options: {
      method: "POST",
      ...DEFAULT_POST_OPTIONS
    }
  }
}

export const popularContentSelector = createSelector(
  learningResourceSelector,
  state => state.entities.popularResources || [],
  (lrSelector, popularResources) => {
    return popularResources.map((item: LearningResourceRef) =>
      lrSelector(item.object_id, item.content_type)
    )
  }
)

export const popularContentRequest = () => ({
  url:       popularContentUrl,
  transform: (body: ?{ results: Array<LearningResource> }) => {
    return body
      ? {
        courses: constructIdMap(
          filterObjectType(body.results, LR_TYPE_COURSE)
        ),
        programs: constructIdMap(
          filterObjectType(body.results, LR_TYPE_PROGRAM)
        ),
        userLists: constructIdMap(
          filterObjectType(body.results, LR_TYPE_USERLIST)
        ),
        podcasts: constructIdMap(
          filterObjectType(body.results, LR_TYPE_PODCAST)
        ),
        podcastEpisodes: constructIdMap(
          filterObjectType(body.results, LR_TYPE_PODCAST_EPISODE)
        ),
        videos:           constructIdMap(filterObjectType(body.results, LR_TYPE_VIDEO)),
        popularResources: mapResourcesToResourceRefs(body.results)
      }
      : {}
  },
  update: {
    ...updateLearningResources,
    popularResources: (
      prev: Array<LearningResourceRef>,
      next: Array<LearningResourceRef>
    ) => next
  }
})
