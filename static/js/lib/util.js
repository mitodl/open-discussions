// @flow
import type { Match } from "react-router"

export const getChannelName = (props: { match: Match }): string => props.match.params.channelName || ""

/**
 * Returns a promise which resolves after a number of milliseconds have elapsed
 */
export const wait = (millis: number): Promise<void> => (
  new Promise(resolve => setTimeout(resolve, millis))
)
