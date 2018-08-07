// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"

import ImageUploaderForm from "../components/ImageUploaderForm"
import withForm from "../hoc/withForm"

import { showDialog, hideDialog } from "../actions/ui"
import { configureForm } from "../lib/forms"
import { newImageForm } from "../lib/profile"
import { mergeAndInjectProps } from "../lib/redux_props"
import { validateImageForm } from "../lib/validation"

import type { ImageForm } from "../flow/discussionTypes"
import type { WithFormProps } from "../flow/formTypes"
import type { Dispatch } from "redux"

const makeDialogKey = name => `DIALOG_IMAGE_UPLOAD_${name}`
const makeFormKey = name => `image:upload:${name}`

type ImageProps = {
  dispatch: Dispatch<any>,
  dialogOpen: boolean,
  onClick?: Function,
  showDialog: () => void,
  hideDialog: () => void,
  isAdd: boolean,
  name: string,
  description: string,
  onSubmit: () => void,
  onUpdate: (event: Object) => Promise<*>
} & WithFormProps<ImageForm>

class ImageUploader extends React.Component<ImageProps> {
  setDialogVisibility = (visibility: boolean) => {
    const { showDialog, hideDialog } = this.props
    if (visibility) {
      showDialog()
    } else {
      hideDialog()
    }
  }

  render() {
    const {
      isAdd,
      renderForm,
      dialogOpen,
      formBeginEdit,
      formEndEdit,
      formValidate,
      description
    } = this.props

    return (
      <React.Fragment>
        <span>
          {renderForm({
            setDialogVisibility: this.setDialogVisibility,
            dialogOpen:          dialogOpen,
            formBeginEdit:       formBeginEdit,
            formEndEdit:         formEndEdit,
            formValidate:        formValidate,
            description:         description
          })}
          <button
            className="open-photo-dialog"
            onClick={() => {
              this.setDialogVisibility(true)
            }}
          >
            {isAdd ? (
              <i name="camera_alt" className="material-icons add">
                add
              </i>
            ) : (
              <i name="camera_alt" className="material-icons edit">
                edit
              </i>
            )}
          </button>
        </span>
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { name, onUpdate } = ownProps
  const formKey = makeFormKey(name)
  const dialogKey = makeDialogKey(name)
  const { getForm } = configureForm(formKey, newImageForm)
  const { ui, profileImage } = state
  const dialogOpen = ui.dialogs.has(dialogKey)
  const processing = profileImage.processing

  return {
    dialogOpen,
    processing,
    onUpdate,
    userName:     ownProps.userName,
    validateForm: validateImageForm,
    form:         getForm(state)
  }
}

const onSubmitError = formValidate =>
  formValidate({ image: `Error uploading image` })

const mergeProps = mergeAndInjectProps(
  (
    { name, onUpdate },
    { formValidate, formBeginEdit, formEndEdit, hideDialog }
  ) => ({
    onSubmit: async ({ image, edit }) => {
      await onUpdate({
        target: {
          name,
          value: {
            image,
            edit
          }
        }
      })

      formEndEdit()
      hideDialog()
    },
    onSubmitError: () => onSubmitError(formValidate),
    formValidate:  formValidate,
    formBeginEdit: formBeginEdit,
    formEndEdit:   formEndEdit
  })
)

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) => {
  const { name } = ownProps
  const dialogKey = makeDialogKey(name)
  const formKey = makeFormKey(name)
  const { actionCreators } = configureForm(formKey, newImageForm)

  return bindActionCreators(
    {
      showDialog: () => showDialog(dialogKey),
      hideDialog: () => hideDialog(dialogKey),
      ...actionCreators
    },
    dispatch
  )
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withForm(ImageUploaderForm)
)(ImageUploader)
