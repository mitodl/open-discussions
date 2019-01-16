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

export const CONTRIBUTORS_KEY = "channel:edit:contributors"

const { getForm, actionCreators } = configureForm(
  CONTRIBUTORS_KEY,
  newMemberForm
)

const usernameGetter = R.prop("contributor_name")

const onSubmitFailure = (): FormErrors<*> => ({
  email: "Error adding new contributor"
})

export const EditChannelContributorsPage = editChannelMembershipPage(
  "contributor",
  "EditChannelContributorsPage",
  usernameGetter,
  false
)

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelContributors.processing
  const members = state.channelContributors.data.get(channelName)
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
    { loadMembers, loadChannel, addMember, formBeginEdit, setSnackbarMessage }
  ) => ({
    loadMembers:    () => loadMembers(channelName),
    loadChannel:    () => loadChannel(channelName),
    onSubmitResult: formBeginEdit,
    onSubmit:       async form => {
      const newMember = await addMember(channel.name, form.email)
      setSnackbarMessage({
        message: `Successfully added ${
          newMember.contributor.email
        } as a contributor`
      })
    }
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      loadMembers:   actions.channelContributors.get,
      loadChannel:   actions.channels.get,
      addMember:     actions.channelContributors.post,
      removeMember:  actions.channelContributors.delete,
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
)(EditChannelContributorsPage)
