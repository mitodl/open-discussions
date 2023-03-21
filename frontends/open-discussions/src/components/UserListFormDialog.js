// @flow
/* global SETTINGS:false */
import React from "react"
import { useMutation, useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { Formik, Form, Field } from "formik"

import Dialog from "./Dialog"
import { Select } from "./Select"

import {
  createUserListMutation,
  userListMutation
} from "../lib/queries/user_lists"
import {
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_PUBLIC,
  LR_PRIVATE
} from "../lib/constants"
import {
  validateCreateUserListForm,
  validationMessage
} from "../lib/validation"

import type { UserList } from "../flow/discussionTypes"

import { getTopicsRequest, topicsArraySelector } from "../lib/queries/topics"
import { sortBy } from "../lib/util"

type Props = {
  hide: Function,
  userList?: UserList
}

export default function UserListFormDialog(props: Props) {
  // if a userList is provided we're editing it,
  // if not we're creating a new userList
  const { hide, userList } = props

  const [{ isFinished }] = useRequest(getTopicsRequest())

  const topics = useSelector(topicsArraySelector)

  const [, createUserList] = useMutation(createUserListMutation)
  const [, updateUserList] = useMutation(userListMutation)

  return isFinished ? (
    <Formik
      onSubmit={async params => {
        if (userList) {
          await updateUserList({
            ...params,
            id: userList.id
          })
        } else {
          await createUserList(params)
        }
        hide()
      }}
      initialValues={
        userList
          ? {
            title:             userList.title,
            short_description: userList.short_description,
            privacy_level:     userList.privacy_level,
            list_type:         userList.list_type,
            topics:            sortBy("name")(
              userList.topics.map(topic => topic.id) || []
            )
          }
          : {
            title:             "",
            short_description: "",
            topics:            [],
            privacy_level:     SETTINGS.is_public_list_editor ? null : LR_PRIVATE
          }
      }
      validate={validateCreateUserListForm}
      validateOnBlur={false}
      validateOnChange={false}
    >
      {({ handleSubmit, errors }) => (
        <Dialog
          title={userList ? `Edit ${userList.title}` : "Create new list"}
          open={true}
          hideDialog={hide}
          onAccept={handleSubmit}
          className="create-user-list-dialog"
          submitText="Save"
        >
          <Form className="user-list-create-form">
            <span className="input-name">List Type</span>
            <div className="type radio">
              <div className="option">
                <Field
                  name="list_type"
                  id="type-list"
                  type="radio"
                  value={LR_TYPE_USERLIST}
                  tabIndex="0"
                />
                <label htmlFor="type-list">
                  <span className="header">Learning List</span>
                  Create a list of any of our learning resources
                </label>
              </div>
              <div className="option">
                <Field
                  name="list_type"
                  type="radio"
                  id="type-lp"
                  value={LR_TYPE_LEARNINGPATH}
                  tabIndex="0"
                />
                <label htmlFor="type-lp">
                  <span className="header">Learning Path</span>
                  An ordered list of learning resources
                </label>
              </div>
            </div>
            {validationMessage(errors.list_type)}
            {SETTINGS.is_public_list_editor ? (
              <>
                <span className="input-name">Privacy</span>
                <div className="privacy radio">
                  <div className="option">
                    <Field
                      name="privacy_level"
                      id="radio-public"
                      type="radio"
                      value={LR_PUBLIC}
                      tabIndex="0"
                    />
                    <label htmlFor="radio-public">
                      <span className="header">Public</span>
                    </label>
                  </div>
                  <div className="option">
                    <Field
                      name="privacy_level"
                      type="radio"
                      id="radio-private"
                      value={LR_PRIVATE}
                      tabIndex="0"
                    />
                    <label htmlFor="radio-private">
                      <span className="header">Private</span>
                    </label>
                  </div>
                </div>
              </>
            ) : null}

            {validationMessage(errors.privacy_level)}
            <span className="input-name">List Title</span>
            <Field name="title" className="title" />
            {validationMessage(errors.title)}
            <span className="input-name">Description</span>
            <Field name="short_description" as="textarea" />
            {validationMessage(errors.short_description)}
            <span className="input-name">Subjects</span>
            <Field
              name="topics"
              className="basic-multi-select topics-select"
              options={sortBy("label")(
                topics.map(topic => ({ value: topic.id, label: topic.name }))
              )}
              component={Select}
              placeholder="Select 1 to 3 subjects...."
              isMulti={true}
              closeMenuOnSelect={false}
              openMenuOnClick={false}
              menuPlacement="top"
            />
            {validationMessage(errors.topics)}
          </Form>
        </Dialog>
      )}
    </Formik>
  ) : null
}
