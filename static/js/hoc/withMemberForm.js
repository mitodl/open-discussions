// @flow
import React from "react"
import R from "ramda"

import Card from "../components/Card"
import EditChannelMembersForm from "../components/admin/EditChannelMembersForm"
import EditChannelNavbar from "../components/admin/EditChannelNavbar"
import MembersNavbar from "../components/admin/MembersNavbar"

import { validateMembersForm } from "../lib/validation"

import type { AddMemberForm, Channel, Member } from "../flow/discussionTypes"
import type { FormValue } from "../flow/formTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

const withMemberForm = (WrappedComponent: *) => {
  type Props = {
    channel: Channel,
    form: FormValue<AddMemberForm>,
    loadChannel: () => Promise<*>,
    loadMembers: () => Promise<*>,
    members: Array<Member>,
    usernameGetter: (member: Member) => string,
    addMember: (channel: Channel, email: string) => Promise<*>,
    removeMember: (channel: Channel, email: string) => Promise<*>,
    memberTypeDescription: string,
    processing: boolean,
    beginFormEdit: () => void,
    endFormEdit: () => void,
    formValidate: Function,
    updateEmail: (email: string) => void
  }

  class withMemberForm extends React.Component<Props> {
    componentDidMount() {
      this.loadData()
    }

    componentDidUpdate(prevProps: Props) {
      if (shouldLoadData(prevProps, this.props)) {
        this.loadData()
      }
    }

    componentWillUnmount() {
      const { endFormEdit } = this.props
      endFormEdit()
    }

    loadData = async () => {
      const {
        channel,
        loadChannel,
        loadMembers,
        members,
        beginFormEdit
      } = this.props

      const promises = []
      if (!channel) {
        promises.push(loadChannel())
      }

      if (!members) {
        promises.push(loadMembers())
      }
      await Promise.all(promises)

      beginFormEdit()
    }

    addMember = async () => {
      const {
        addMember,
        form,
        channel,
        memberTypeDescription,
        formValidate,
        beginFormEdit
      } = this.props

      const validation = validateMembersForm(form)

      if (!form || !channel || !R.isEmpty(validation)) {
        formValidate({ errors: validation.value })
      } else {
        try {
          await addMember(channel, form.value.email)
          beginFormEdit()
        } catch (e) {
          formValidate({
            errors: { email: `Error adding new ${memberTypeDescription}` }
          })
        }
      }
    }

    removeMember = async (username: string) => {
      const { channel, removeMember } = this.props

      await removeMember(channel, username)
    }

    renderBody = () => {
      const {
        channel,
        form,
        members,
        memberTypeDescription,
        processing,
        updateEmail,
        beginFormEdit,
        usernameGetter
      } = this.props

      if (!channel || !members || !form) {
        return null
      }

      return (
        <React.Fragment>
          <EditChannelNavbar channelName={channel.name} />
          <Card>
            <MembersNavbar channel={channel} />
            <EditChannelMembersForm
              channel={channel}
              members={members}
              usernameGetter={usernameGetter}
              form={form.value}
              validation={form.errors}
              processing={processing}
              updateEmail={updateEmail}
              addMember={this.addMember}
              removeMember={this.removeMember}
              beginFormEdit={beginFormEdit}
              memberTypeDescription={memberTypeDescription}
            />
          </Card>
        </React.Fragment>
      )
    }

    render() {
      return <WrappedComponent {...this.props} renderBody={this.renderBody} />
    }
  }
  return withMemberForm
}

export default withMemberForm
