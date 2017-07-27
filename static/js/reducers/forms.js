//@flow
import { deriveReducer } from "../lib/form_actions"
import { newChannel } from "../lib/channels"

export const channelForm = deriveReducer("channel", newChannel)
