// @flow
import type { Match } from "react-router"

export const getChannelName = (props: { match: Match }): string => props.match.params.channelName || ""
