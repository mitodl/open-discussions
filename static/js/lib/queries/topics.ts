
import { topicApiURL } from "../url";
import { merge } from "ramda";
import { constructIdMap } from "../redux_query";
import { createSelector } from "reselect";

import { CourseTopic } from "../../flow/discussionTypes";

export const getTopicsRequest = () => ({
  queryKey: "topicsRequest",
  url: topicApiURL,
  transform: (body: {results: Array<CourseTopic>;} | null | undefined) => ({
    topics: body ? constructIdMap(body.results) : {}
  }),
  update: {
    topics: merge
  }
});

export const topicsArraySelector = createSelector(state => state.entities.topics, topics => topics ? Object.keys(topics).map(key => topics[key]) : []);