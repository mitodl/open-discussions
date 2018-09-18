// @flow
import React from "react"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { connect } from "react-redux"

import Card from "../../components/Card"
import EditChannelMembersForm from "../../components/admin/EditChannelMembersForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import MembersNavbar from "../../components/admin/MembersNavbar"
import MembersList from "../../components/admin/MembersList"
import withForm from "../../hoc/withForm"
import withSingleColumn from "../../hoc/withSingleColumn"

import { newMemberForm } from "../../lib/channels"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { actions } from "../../actions"
import { mergeAndInjectProps } from "../../lib/redux_props"
import { channelURL } from "../../lib/url"
import { getChannelName } from "../../lib/util"
import { validateMembersForm } from "../../lib/validation"
import {
  setDialogData,
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_MEMBER
} from "../../actions/ui"

import type { AddMemberForm, Channel, Member } from "../../flow/discussionTypes"
import type { WithFormProps } from "../../flow/formTypes"

export const MODERATORS_KEY = "channel:edit:moderators"
const { getForm, actionCreators } = configureForm(MODERATORS_KEY, newMemberForm)

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))
const usernameGetter = R.prop("moderator_name")

type Props = {
  channel: Channel,
  loadChannel: () => Promise<Channel>,
  loadMembers: () => Promise<*>,
  members: Array<Member>,
  removeMember: (channel: Channel, email: string) => Promise<*>,
  memberToRemove: ?Member,
  dialogOpen: boolean,
  setDialogVisibility: (visibility: boolean) => void,
  setDialogData: (data: any) => void,
  history: Object,
  setSnackbarMessage: (obj: Object) => void
} & WithFormProps<AddMemberForm>

export class EditChannelModeratorsPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { channel, loadMembers, members } = this.props

    if (!members) {
      loadMembers()
    }
    if (!channel) {
      this.validateModerator()
    }
  }

  validateModerator = async () => {
    const { loadChannel, history } = this.props

    const channel = await loadChannel()
    if (!channel.user_is_moderator) {
      history.push(channelURL(channel.name))
    }
  }

  removeMember = async (channel: Channel, member: Member) => {
    const { removeMember, setSnackbarMessage } = this.props
    await removeMember(channel, usernameGetter(member))
    this.validateModerator()
    setSnackbarMessage({
      message: `Successfully removed ${String(member.email)} as a moderator`
    })
  }

  render() {
    const {
      renderForm,
      form,
      channel,
      members,
      memberToRemove,
      dialogOpen,
      setDialogData,
      setDialogVisibility
    } = this.props

    if (!channel || !members || !form) {
      return null
    }

    const editable = !channel.membership_is_managed

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        <Card>
          <MembersNavbar channel={channel} />
          {!editable ? (
            <div className="membership-notice">
              Membership is managed via MicroMasters
            </div>
          ) : (
            renderForm({
              memberTypeDescription: "moderator"
            })
          )}
          <MembersList
            channel={channel}
            removeMember={this.removeMember}
            editable={editable}
            members={members}
            usernameGetter={usernameGetter}
            memberTypeDescription="moderator"
            memberToRemove={memberToRemove}
            dialogOpen={dialogOpen}
            setDialogData={setDialogData}
            setDialogVisibility={setDialogVisibility}
          />
        </Card>
      </React.Fragment>
    )
  }
}

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
    validateForm: validateMembersForm,
    form:         form
  }
}

const loadMembers = (channelName: string) =>
  actions.channelModerators.get(channelName)
const loadChannel = (channelName: string) => actions.channels.get(channelName)
const addModerator = (channel: Channel, email: string) =>
  actions.channelModerators.post(channel.name, email)
const addSubscriber = (channel: Channel, username: string) =>
  actions.channelSubscribers.post(channel.name, username)
const removeMember = (channel: Channel, username: string) =>
  actions.channelModerators.delete(channel.name, username)
const onSubmitError = formValidate =>
  formValidate({ email: `Error adding new moderator` })

const mergeProps = mergeAndInjectProps(
  (
    { channelName, channel },
    {
      loadMembers,
      loadChannel,
      addModerator,
      addSubscriber,
      formValidate,
      formBeginEdit,
      setSnackbarMessage
    }
  ) => ({
    loadMembers:    () => loadMembers(channelName),
    loadChannel:    () => loadChannel(channelName),
    onSubmitResult: formBeginEdit,
    onSubmit:       async form => {
      const newMember = await addModerator(channel, form.email)
      await addSubscriber(channel, newMember.moderator.moderator_name)

      setSnackbarMessage({
        message: `Successfully added ${
          newMember.moderator.email
        } as a moderator`
      })
    },
    onSubmitError: () => onSubmitError(formValidate)
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      loadMembers,
      loadChannel,
      addModerator,
      addSubscriber,
      removeMember,
      onSubmitError,
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
  withSingleColumn("edit-channel")
)(EditChannelModeratorsPage)
