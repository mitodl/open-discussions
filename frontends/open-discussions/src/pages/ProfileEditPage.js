// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import MetaTags from "../components/MetaTags"

import ProfileForm from "../components/ProfileForm"
import { withSpinnerLoading } from "../components/Loading"
import withSingleColumn from "../hoc/withSingleColumn"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { getUserName } from "../lib/util"
import { profileURL } from "../lib/url"
import { Redirect } from "react-router"
import { validateProfileForm, validateUserWebsiteForm } from "../lib/validation"
import { any404Error, anyErrorExcept404 } from "../util/rest"
import { PERSONAL_SITE_TYPE, SOCIAL_SITE_TYPE } from "../lib/constants"

import type { Profile } from "../flow/discussionTypes"
import type { FormValue } from "../flow/formTypes"
import type { ProfilePayload } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

type Props = {
  dispatch: Dispatch<*>,
  history: Object,
  profileForm: FormValue<ProfilePayload>,
  socialSiteForm: Object,
  personalSiteForm: Object,
  processing: boolean,
  profile: Profile,
  userName: string,
  notFound: boolean,
  errored: boolean
}

const PROFILE_FORM_KEY = "profile:edit"
const EDIT_PROFILE_PAYLOAD = { formKey: PROFILE_FORM_KEY }
const getProfileForm = R.prop(PROFILE_FORM_KEY)

const SITE_FORM_KEYS = {
  [SOCIAL_SITE_TYPE]:   "profile:sites:social:edit",
  [PERSONAL_SITE_TYPE]: "profile:sites:personal:edit"
}
const getUserSocialSitesForm = R.prop(SITE_FORM_KEYS[SOCIAL_SITE_TYPE])
const getUserPersonalSitesForm = R.prop(SITE_FORM_KEYS[PERSONAL_SITE_TYPE])

export const getFormValuesFromProfile = (profile: Profile): ProfilePayload =>
  R.pickAll(["name", "bio", "headline"], profile)

class ProfileEditPage extends React.Component<Props> {
  beginFormEdit() {
    const { dispatch, profile } = this.props
    dispatch(
      actions.forms.formBeginEdit(
        R.merge(EDIT_PROFILE_PAYLOAD, {
          value: getFormValuesFromProfile(profile)
        })
      )
    )
  }

  componentDidMount() {
    const { profile } = this.props
    if (!profile) {
      this.initializePage()
    } else {
      this.beginFormEdit()
    }
  }

  initializePage = async () => {
    const { dispatch, userName } = this.props
    // Due to testing tool limitations, this dispatch call is copied here from loadData
    // instead of calling loadData as a helper method.
    await dispatch(actions.profiles.get(userName))
    this.beginFormEdit()
  }

  loadData = async () => {
    const { dispatch, userName } = this.props
    await dispatch(actions.profiles.get(userName))
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(EDIT_PROFILE_PAYLOAD))
  }

  onUpdate = async (e: Object) => {
    const { dispatch } = this.props
    const { name, value } = e.target

    dispatch(
      actions.forms.formUpdate({
        ...EDIT_PROFILE_PAYLOAD,
        value: {
          [name]: value
        }
      })
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, profileForm, profile } = this.props

    e.preventDefault()

    const validation = validateProfileForm(profileForm)

    if (!profileForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...EDIT_PROFILE_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      dispatch(
        actions.profiles.patch(profile.username, profileForm.value)
      ).then(profile => {
        history.push(`/profile/${profile.username}/`)
      })
    }
  }

  onDeleteWebsite = (websiteId: string) => {
    const { dispatch } = this.props

    dispatch(actions.userWebsites.delete(websiteId)).then(() => {
      this.loadData()
    })
  }

  onUpdateWebsite = R.curry(async (siteType: string, e: Object) => {
    const { dispatch } = this.props
    const { value } = e.target

    dispatch(
      actions.forms.formUpdate({
        formKey: SITE_FORM_KEYS[siteType],
        value:   {
          url: value
        }
      })
    )
  })

  onSubmitWebsite = R.curry(
    (siteType: string, formPropGetter: Function, e: Object) => {
      const { dispatch, profile } = this.props

      e.preventDefault()

      const sitesForm = formPropGetter(this.props)
      const url = R.path(["value", "url"], sitesForm)
      const validation = validateUserWebsiteForm(sitesForm)

      if (!sitesForm || !R.isEmpty(validation)) {
        dispatch(
          actions.forms.formValidate({
            formKey: SITE_FORM_KEYS[siteType],
            errors:  validation.value
          })
        )
        return
      }

      dispatch(actions.userWebsites.post(profile.username, url, siteType))
        .then(() => {
          this.loadData()
          dispatch(
            actions.forms.formEndEdit({
              formKey: SITE_FORM_KEYS[siteType]
            })
          )
        })
        .catch(error => {
          dispatch(
            actions.forms.formValidate({
              formKey: SITE_FORM_KEYS[siteType],
              errors:  {
                url: error.url
              }
            })
          )
        })
    }
  )

  onUpdateSocialSite = this.onUpdateWebsite(SOCIAL_SITE_TYPE)
  onSubmitSocialSite = this.onSubmitWebsite(
    SOCIAL_SITE_TYPE,
    R.prop("socialSiteForm")
  )
  onUpdatePersonalSite = this.onUpdateWebsite(PERSONAL_SITE_TYPE)
  onSubmitPersonalSite = this.onSubmitWebsite(
    PERSONAL_SITE_TYPE,
    R.prop("personalSiteForm")
  )

  render() {
    const {
      profile,
      profileForm,
      socialSiteForm,
      personalSiteForm,
      processing,
      history
    } = this.props
    if (!profile || !profileForm) {
      return null
    }

    return profile.username === SETTINGS.username ? (
      <React.Fragment>
        <MetaTags canonicalLink="profile/edit">
          <title>{formatTitle("Edit your profile")}</title>
        </MetaTags>
        <ProfileForm
          profile={profile}
          onUpdate={this.onUpdate}
          onSubmit={this.onSubmit}
          form={profileForm.value}
          validation={profileForm.errors}
          socialSiteFormValues={R.propOr({}, "value", socialSiteForm)}
          socialSiteFormErrors={R.propOr({}, "errors", socialSiteForm)}
          personalSiteFormValues={R.propOr({}, "value", personalSiteForm)}
          personalSiteFormErrors={R.propOr({}, "errors", personalSiteForm)}
          onUpdateSocialSite={this.onUpdateSocialSite}
          onSubmitSocialSite={this.onSubmitSocialSite}
          onUpdatePersonalSite={this.onUpdatePersonalSite}
          onSubmitPersonalSite={this.onSubmitPersonalSite}
          onDeleteSite={this.onDeleteWebsite}
          history={history}
          processing={processing}
        />
      </React.Fragment>
    ) : (
      <Redirect to={profileURL(profile.username)} />
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { profiles } = state
  const userName = getUserName(ownProps)
  const profileForm = getProfileForm(state.forms)
  const socialSiteForm = getUserSocialSitesForm(state.forms)
  const personalSiteForm = getUserPersonalSitesForm(state.forms)
  const processing = state.profiles.processing
  const profile = profiles.data.get(userName)
  const errored = anyErrorExcept404([profiles])
  const notFound = any404Error([profiles])
  const loaded = notFound ? true : R.none(R.isNil, [profile])
  return {
    processing,
    profile,
    profileForm,
    socialSiteForm,
    personalSiteForm,
    userName,
    notFound,
    errored,
    loaded
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("profile-edit-page"),
  withSpinnerLoading
)(ProfileEditPage)
