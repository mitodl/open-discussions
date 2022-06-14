// @flow
import { POST, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"

import type {
  ChannelModerators,
  Moderator,
  GenericReport,
  ReportRecord
} from "../../flow/discussionTypes"

export function getChannelModerators(
  channelName: string
): Promise<ChannelModerators> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/moderators/`)
}

export function addChannelModerator(
  channelName: string,
  email: string
): Promise<Moderator> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/moderators/`,
    {
      method: POST,
      body:   JSON.stringify({ email })
    }
  )
}

export function deleteChannelModerator(
  channelName: string,
  username: string
): Promise<void> {
  return fetchWithAuthFailure(
    `/api/v0/channels/${channelName}/moderators/${username}/`,
    { method: DELETE }
  )
}

export function reportContent(payload: GenericReport): Promise<GenericReport> {
  return fetchJSONWithAuthFailure(`/api/v0/reports/`, {
    method: POST,
    body:   JSON.stringify(payload)
  })
}

export const getReports = (channelName: string): Promise<Array<ReportRecord>> =>
  fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/reports/`)
