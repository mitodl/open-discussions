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
import { getChannelName } from "../../lib/util"

import type { AddMemberForm, Channel, Member } from "../../flow/discussionTypes"
import type { WithFormProps } from "../../flow/formTypes"
import { validateMembersForm } from "../../lib/validation"

const CONTRIBUTORS_KEY = "channel:edit:contributors"
const { getForm, actionCreators } = configureForm(
  CONTRIBUTORS_KEY,
  newMemberForm
)

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

type Props = {
  channel: Channel,
  loadChannel: () => Promise<*>,
  loadMembers: () => Promise<*>,
  members: Array<Member>,
  removeMember: (channel: Channel, email: string) => Promise<*>
} & WithFormProps<AddMemberForm>

export class EditChannelContributorsPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { channel, loadChannel, loadMembers, members } = this.props

    const promises = []
    if (!channel) {
      promises.push(loadChannel())
    }

    if (!members) {
      promises.push(loadMembers())
    }
    await Promise.all(promises)
  }

  render() {
    const { renderForm, form, channel, members, removeMember } = this.props

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
              memberTypeDescription: "contributor"
            })
          )}
          <MembersList
            channel={channel}
            removeMember={removeMember}
            editable={editable}
            members={members}
            usernameGetter={R.prop("contributor_name")}
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
    state.channels.processing || state.channelContributors.processing
  const members = state.channelContributors.data.get(channelName)
  const form = getForm(state)

  return {
    channel,
    members,
    channelName,
    processing,
    validateForm: validateMembersForm,
    form:         form
  }
}

const loadMembers = (channelName: string) =>
  actions.channelContributors.get(channelName)
const loadChannel = (channelName: string) => actions.channels.get(channelName)
const addMember = (channel: Channel, email: string) =>
  actions.channelContributors.post(channel.name, email)
const removeMember = (channel: Channel, username: string) =>
  actions.channelContributors.delete(channel.name, username)

const mergeProps = mergeAndInjectProps(
  (
    { channelName, channel },
    {
      loadMembers,
      loadChannel,
      onSubmit,
      onSubmitError,
      formValidate,
      formBeginEdit
    }
  ) => ({
    loadMembers:    () => loadMembers(channelName),
    loadChannel:    () => loadChannel(channelName),
    onSubmitResult: formBeginEdit,
    onSubmit:       form => onSubmit(channel, form),
    onSubmitError:  () => onSubmitError(formValidate)
  })
)

const onSubmitError = formValidate =>
  formValidate({ email: `Error adding new contributor` })

const onSubmit = (channel, { email }) => addMember(channel, email)

export default R.compose(
  connect(
    mapStateToProps,
    {
      loadMembers,
      loadChannel,
      addMember,
      removeMember,
      onSubmit,
      onSubmitError,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(EditChannelMembersForm),
  withSingleColumn("edit-channel")
)(EditChannelContributorsPage)
