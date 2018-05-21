// @flow
/* global SETTINGS:false */
import R from "ramda"

import type { Match } from "react-router"

export const getChannelName = (props: { match: Match }): string =>
  props.match.params.channelName || ""

export const getPostID = (props: { match: Match }): string =>
  props.match.params.postID || ""

export const getCommentID = (props: { match: Match }): string | void =>
  props.match.params.commentID || undefined

/**
 * Returns a promise which resolves after a number of milliseconds have elapsed
 */
export const wait = (millis: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, millis))

/**
 * Adds on an index for each item in an iterable
 */
export function* enumerate<T>(
  iterable: Iterable<T>
): Generator<[number, T], void, void> {
  let i = 0
  for (const item of iterable) {
    yield [i, item]
    ++i
  }
}

export const isEmptyText = R.compose(R.isEmpty, R.trim, R.defaultTo(""))

export const goBackAndHandleEvent = R.curry((history, e) => {
  e.preventDefault()
  history.goBack()
})

export const preventDefaultAndInvoke = R.curry(
  (invokee: Function, e: Event) => {
    if (e) {
      e.preventDefault()
    }
    invokee()
  }
)

export const userIsAnonymous = () => R.isNil(SETTINGS.username)

export const votingTooltipText = "Sign Up or Login to vote"
