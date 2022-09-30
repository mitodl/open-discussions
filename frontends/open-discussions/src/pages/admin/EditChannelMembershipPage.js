// @flow
import React from "react"
import R from "ramda"

import { MetaTags, Card } from "ol-util"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import MembersNavbar from "../../components/admin/MembersNavbar"
import MembersList from "../../components/admin/MembersList"

import { formatTitle } from "../../lib/title"
import { channelURL } from "../../lib/url"

import type { AddMemberForm, Channel, Member } from "../../flow/discussionTypes"
import type { WithFormProps } from "../../flow/formTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

type Props = {
  channel: Channel,
  loadChannel: () => Promise<Channel>,
  loadMembers: () => Promise<*>,
  members: Array<Member>,
  removeMember: (channelName: string, email: string) => Promise<*>,
  memberToRemove: ?Member,
  dialogOpen: boolean,
  setDialogVisibility: (visibility: boolean) => void,
  setDialogData: (data: any) => void,
  history: Object,
  setSnackbarMessage: (obj: Object) => void
} & WithFormProps<AddMemberForm>

const editChannelMembershipPage = (
  memberTypeDescription: string,
  displayName: string,
  usernameGetter: Function,
  redirectAfterSelfRemoval: boolean
) => {
  class EditChannelMembershipPage extends React.Component<Props> {
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
      const { removeMember, setSnackbarMessage, setDialogVisibility } =
        this.props
      await removeMember(channel.name, usernameGetter(member))

      if (redirectAfterSelfRemoval) {
        this.validateModerator()
      }

      setSnackbarMessage({
        message: `Successfully removed ${String(
          member.email
        )} as a ${memberTypeDescription}`
      })
      setDialogVisibility(false)
    }

    render() {
      const {
        renderForm,
        channel,
        members,
        memberToRemove,
        dialogOpen,
        setDialogData,
        setDialogVisibility
      } = this.props

      if (!channel) {
        return null
      }

      const editable = !channel.membership_is_managed

      return (
        <React.Fragment>
          <MetaTags>
            <title>{formatTitle("Edit Channel")}</title>
          </MetaTags>

          <EditChannelNavbar channelName={channel.name} />
          <Card className="members">
            <MembersNavbar channel={channel} />
            {!editable ? (
              <div className="membership-notice">
                Membership is managed via MicroMasters
              </div>
            ) : (
              renderForm({
                memberTypeDescription
              })
            )}
            <MembersList
              channel={channel}
              removeMember={this.removeMember}
              editable={editable}
              members={members}
              usernameGetter={usernameGetter}
              memberTypeDescription={memberTypeDescription}
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

  EditChannelMembershipPage.displayName = displayName

  return EditChannelMembershipPage
}

export default editChannelMembershipPage
