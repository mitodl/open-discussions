// @flow
import { createAction } from "redux-actions"

export const FORM_BEGIN_EDIT = "FORM_BEGIN_EDIT"
export const formBeginEdit = createAction<string, *>(FORM_BEGIN_EDIT)

export const FORM_UPDATE = "FORM_UPDATE"
export const formUpdate = createAction<string, *>(FORM_UPDATE)

export const FORM_VALIDATE = "FORM_VALIDATE"
export const formValidate = createAction<string, *>(FORM_VALIDATE)

export const FORM_END_EDIT = "FORM_END_EDIT"
export const formEndEdit = createAction<string, *>(FORM_END_EDIT)
