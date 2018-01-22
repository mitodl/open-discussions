// @flow
import * as api from "../lib/api"
import { GET, POST, INITIAL_STATE } from "redux-hammock/constants"

import type {
  GenericReport,
  ReportRecord,
  PostReportRecord,
  CommentReportRecord
} from "../flow/discussionTypes"

type ReportData = {
  posts: Map<string, PostReportRecord>,
  comments: Map<string, CommentReportRecord>,
  reports: Array<ReportRecord>
}

const getReportInitialData = (): ReportData => ({
  posts:    new Map(),
  comments: new Map(),
  reports:  []
})

export const reportsEndpoint = {
  name:         "reports",
  verbs:        [POST, GET],
  postFunc:     (report: GenericReport) => api.reportContent(report),
  getFunc:      (channelName: string) => api.getReports(channelName),
  initialState: {
    ...INITIAL_STATE,
    data: getReportInitialData()
  },
  getSuccessHandler: (response: Array<ReportRecord>): ReportData => {
    const update = getReportInitialData()
    update.reports = response

    response.forEach(report => {
      if (report.post !== null) {
        update.posts.set(report.post.id, report)
      } else {
        update.comments.set(report.comment.id, report)
      }
    })
    return update
  },
  postSuccessHandler: (_: any, data: ReportData) => data
}
