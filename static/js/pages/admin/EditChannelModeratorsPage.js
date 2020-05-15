// @flow
import R from "ramda"
import { connect } from "react-redux"

import EditChannelMembersForm from "../../components/admin/EditChannelMembersForm"
import withChannelHeader from "../../hoc/withChannelHeader"
import withForm from "../../hoc/withForm"
import withSingleColumn from "../../hoc/withSingleColumn"
import editChannelMembershipPage from "./EditChannelMembershipPage"

import { newMemberForm } from "../../lib/channels"
import { configureForm } from "../../lib/forms"
import { actions } from "../../actions"
import { mergeAndInjectProps } from "../../lib/redux_props"
import { getChannelName } from "../../lib/util"
import { validateMembersForm } from "../../lib/validation"
import {
  setDialogData,
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_MEMBER
} from "../../actions/ui"

import type { FormErrors } from "../../flow/formTypes"

export const MODERATORS_KEY = "channel:edit:moderators"
const { getForm, actionCreators } = configureForm(MODERATORS_KEY, newMemberForm)

const usernameGetter = R.prop("moderator_name")

const onSubmitFailure = (): FormErrors<*> => ({
  email: "Error adding new moderator"
})

export const EditChannelModeratorsPage = editChannelMembershipPage(
  "moderator",
  "EditChannelModeratorsPage",
  usernameGetter,
  true
)

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelModerators.processing
  const members = state.channelModerators.data.get(channelName)
  const memberToRemove = state.ui.dialogs.get(DIALOG_REMOVE_MEMBER)
  const dialogOpen = state.ui.dialogs.has(DIALOG_REMOVE_MEMBER)
  const form = getForm(state)

  return {
    channel,
    members,
    channelName,
    processing,
    memberToRemove,
    dialogOpen,
    onSubmitFailure,
    validateForm: validateMembersForm,
    form:         form
  }
}

const mergeProps = mergeAndInjectProps(
  (
    { channelName, channel },
    {
      loadMembers,
      loadChannel,
      addModerator,
      addSubscriber,
      formBeginEdit,
      setSnackbarMessage
    }
  ) => ({
    loadMembers:    () => loadMembers(channelName),
    loadChannel:    () => loadChannel(channelName),
    onSubmitResult: formBeginEdit,
    onSubmit:       async form => {
      const newMember = await addModerator(channel.name, form.email)
      await addSubscriber(channel.name, newMember.moderator.moderator_name)

      setSnackbarMessage({
        message: `Successfully added ${
          newMember.moderator.email
        } as a moderator`
      })
    }
  })
)
export default R.compose(
  connect(
    mapStateToProps,
    {
      loadMembers:   actions.channelModerators.get,
      loadChannel:   actions.channels.get,
      addModerator:  actions.channelModerators.post,
      addSubscriber: actions.channelSubscribers.post,
      removeMember:  actions.channelModerators.delete,
      setSnackbarMessage,
      setDialogData: (data: any) =>
        setDialogData({ dialogKey: DIALOG_REMOVE_MEMBER, data: data }),
      setDialogVisibility: (visibility: boolean) =>
        visibility
          ? showDialog(DIALOG_REMOVE_MEMBER)
          : hideDialog(DIALOG_REMOVE_MEMBER),
      ...actionCreators
    },
    mergeProps
  ),
  withForm(EditChannelMembersForm),
  withChannelHeader,
  withSingleColumn("edit-channel")
)(EditChannelModeratorsPage)
