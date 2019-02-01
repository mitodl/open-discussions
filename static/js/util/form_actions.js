// @flow
import R from "ramda"

import { actions } from "../actions"
import { editChannelForm, EDIT_CHANNEL_PAYLOAD } from "../lib/channels"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"

export const beginChannelFormEdit = (channel: Channel) =>
  actions.forms.formBeginEdit(
    R.merge(EDIT_CHANNEL_PAYLOAD, {
      value: editChannelForm(channel)
    })
  )

export const updateChannelForm = (e: Object) =>
  actions.forms.formUpdate(
    R.merge(EDIT_CHANNEL_PAYLOAD, {
      value: {
        [e.target.name]: e.target.value
      }
    })
  )

export const channelFormDispatchToProps = (dispatch: Dispatch<*>) => ({
  beginChannelFormEdit: (channel: Channel) =>
    dispatch(beginChannelFormEdit(channel)),
  updateChannelForm:  (e: Object) => dispatch(updateChannelForm(e)),
  endChannelFormEdit: () =>
    dispatch(
      actions.forms.formEndEdit({
        ...EDIT_CHANNEL_PAYLOAD
      })
    ),
  dispatch
})
