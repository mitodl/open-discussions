import React, { useCallback, useMemo } from "react"
import { useHistory } from "react-router"
import { Formik, Form } from "formik"
import { Autocomplete, Button, TextField } from "@mui/material"
import { SortableSelect } from "ol-forms"
import { UniqueIdentifier } from "@dnd-kit/core"

import {
  FieldChannelBasicForm,
  useMutateField,
  usePublicLists
} from "../../api/fields"
import type { FieldChannel, UserList } from "../../api/fields/interfaces"
import { makeFieldViewPath } from "../../pages/urls"

type FormProps = {
  field: FieldChannel
}

const EditFieldBasicForm = (props: FormProps): JSX.Element => {
  const { field } = props
  const mutation = useMutateField(field)
  const history = useHistory()

  const listsQuery = usePublicLists()
  const listOptions = useMemo(
    () => [
      ...(listsQuery.data?.results ?? []).map((userList: UserList) => ({
        label: userList.title,
        value: userList.id.toString()
      }))
    ],
    [listsQuery]
  )

  const loadOptions = useCallback(
    async (inputValue: string) => {
      return inputValue ?
        listOptions.filter(option =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        ) :
        listOptions
    },
    [listOptions]
  )

  return listsQuery.data ? (
    <Formik
      initialValues={{
        featured_list: field.featured_list?.id || null,
        lists:         field.lists?.map(list => list.id)
      }}
      onSubmit={async (values: FieldChannelBasicForm) => {
        mutation.mutate(
          {
            featured_list: values.featured_list,
            lists:         values.lists
          },
          {
            onSuccess: () => {
              history.push(makeFieldViewPath(field.name))
            }
          }
        )
      }}
    >
      {({
        handleSubmit,
        values,
        errors,
        isSubmitting,
        setTouched,
        setFieldValue
      }) => (
        <>
          <Form onSubmit={handleSubmit} className="form channel-form">
            <div className="row form-item">
              <label htmlFor="field-featured_list">
                <span className="header">Featured List</span>
              </label>
              <Autocomplete
                disablePortal
                id="field-featured_list"
                options={[{ label: "-----", value: null }, ...listOptions]}
                value={listOptions.find(
                  option => ~~option.value === values.featured_list
                )}
                onChange={(_, option) => {
                  setFieldValue(
                    "featured_list",
                    option?.value ? ~~option.value : null
                  )
                }}
                onBlur={() => setTouched({ ["featured_list"]: true })}
                renderInput={props => <TextField {...props} />}
              />
              {errors.featured_list ? (
                <div className="validation-message">{errors.featured_list}</div>
              ) : null}
            </div>
            <div className="row form-item">
              <label htmlFor="field-lists-sorted">
                <span className="header">Lists</span>
              </label>
              <SortableSelect
                name="field-lists-sorted"
                options={listOptions}
                defaultOptions={listOptions}
                loadOptions={loadOptions}
                onChange={(items: Array<UniqueIdentifier>) => {
                  setFieldValue(
                    "lists",
                    items.map(item => ~~item)
                  )
                }}
                isOptionDisabled={listOption =>
                  values.lists.includes(~~listOption.value)
                }
                value={listOptions
                  .map(option => ({ id: option.value, title: option.label }))
                  .filter(option => values.lists.includes(~~option.id))
                  .sort((a, b) =>
                    values.lists.indexOf(~~a.id) > values.lists.indexOf(~~b.id) ?
                      1 :
                      -1
                  )}
              />
            </div>
            <div className="row actions">
              <Button
                className="cancel"
                onClick={() => history.push(makeFieldViewPath(field.name))}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="save-changes"
                disabled={isSubmitting}
              >
                Save
              </Button>
            </div>
          </Form>
          <div>
            {mutation.isLoading ? null : (
              <>
                {mutation.error && mutation.error instanceof Error ? (
                  <div>An error occurred: {mutation.error.message}</div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </Formik>
  ) : (
    <></>
  )
}

export default EditFieldBasicForm
