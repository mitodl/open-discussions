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

export const makeDialogKey = (name: string) => `DIALOG_IMAGE_UPLOAD_${name}`
const makeFormKey = (name: string) => `image:upload:${name}`

type ImageProps = {
  dispatch: Dispatch<any>,
  dialogOpen: boolean,
  onClick?: Function,
  showDialog: () => any,
  hideDialog: () => any,
  isAdd: boolean,
  name: string,
  description: string,
  onSubmit: () => void,
  onUpdate: (event: Object) => Promise<*>,
  width: number,
  height: number,
  showButton: boolean
} & WithFormProps<ImageForm>

export class ImageUploader extends React.Component<ImageProps> {
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
      description,
      width,
      height,
      showButton,
      processing
    } = this.props

    return (
      <span>
        {renderForm({
          setDialogVisibility: this.setDialogVisibility,
          dialogOpen:          dialogOpen,
          formBeginEdit:       formBeginEdit,
          formEndEdit:         formEndEdit,
          formValidate:        formValidate,
          description:         description,
          width:               width,
          height:              height,
          processing:          processing
        })}
        {showButton ? (
          <button
            className="open-photo-dialog"
            onClick={e => {
              e.preventDefault()
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
        ) : null}
      </span>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { name, onUpdate, processing } = ownProps
  const formKey = makeFormKey(name)
  const dialogKey = makeDialogKey(name)
  const { getForm } = configureForm(formKey, newImageForm)
  const { ui } = state
  const dialogOpen = ui.dialogs.has(dialogKey)

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
    { onUpdate },
    { formValidate, formBeginEdit, formEndEdit, hideDialog },
    { name }
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

      formBeginEdit()
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
