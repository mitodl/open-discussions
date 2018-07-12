// @flow
import React from "react"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { connect } from "react-redux"

import withMemberForm from "../../hoc/withMemberForm"
import withSingleColumn from "../../hoc/withSingleColumn"

import { newMemberForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { actions } from "../../actions"
import { getChannelName } from "../../lib/util"

import type { AddMemberForm, Channel } from "../../flow/discussionTypes"
import type { FormValue } from "../../flow/formTypes"
import type { Dispatch } from "redux"

const EDIT_CHANNEL_KEY = "channel:edit:contributors"
const EDIT_CHANNEL_PAYLOAD = { formKey: EDIT_CHANNEL_KEY }
const getForm = R.prop(EDIT_CHANNEL_KEY)

type Props = {
  renderBody: () => React$Element<*>
}

export class EditChannelContributorsPage extends React.Component<Props> {
  render() {
    const { renderBody } = this.props

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        {renderBody()}
      </React.Fragment>
    )
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) => ({
  loadMembers: () =>
    dispatch(actions.channelContributors.get(getChannelName(ownProps))),
  loadChannel:  () => dispatch(actions.channels.get(getChannelName(ownProps))),
  formValidate: (payload: FormValue<AddMemberForm>) =>
    dispatch(
      actions.forms.formValidate({
        ...EDIT_CHANNEL_PAYLOAD,
        ...payload
      })
    ),
  beginFormEdit: () =>
    dispatch(
      actions.forms.formBeginEdit(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
          value: newMemberForm()
        })
      )
    ),
  endFormEdit: () => dispatch(actions.forms.formEndEdit(EDIT_CHANNEL_PAYLOAD)),
  updateEmail: (email: string) =>
    dispatch(
      actions.forms.formUpdate(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
          value: {
            email
          }
        })
      )
    ),
  addMember: (channel: Channel, email: string) =>
    dispatch(actions.channelContributors.post(channel.name, email)),
  removeMember: (channel: Channel, username: string) =>
    dispatch(actions.channelContributors.delete(channel.name, username))
})

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelContributors.processing
  const members = state.channelContributors.data.get(channelName)
  return {
    channel,
    members,
    channelName,
    processing,
    noun:           "contributor",
    usernameGetter: (member: any): string => member.contributor_name,
    form:           getForm(state.forms)
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withMemberForm,
  withSingleColumn("edit-channel")
)(EditChannelContributorsPage)
