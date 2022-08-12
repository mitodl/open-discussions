import React from "react"
import { useHistory } from "react-router"
import { Formik, Form, Field } from "formik"
import { Button } from "@mui/material"
import * as Yup from "yup"

import { FieldChannelAppearanceForm, useMutateField } from "../../api/fields"
import type { FieldChannel } from "../../api/fields/interfaces"
import FieldAvatar from "../../components/FieldAvatar"
import { makeFieldViewPath } from "../../pages/urls"

type FormProps = {
  field: FieldChannel
}

const appearanceSchema = Yup.object().shape({
  title: Yup.string().required("Title is required")
})

const EditFieldAppearanceForm = (props: FormProps): JSX.Element => {
  const { field } = props
  const mutation = useMutateField(field)
  const history = useHistory()

  return (
    <Formik
      initialValues={{
        title:              field.title,
        public_description: field.public_description
      }}
      validationSchema={appearanceSchema}
      onSubmit={async (values: FieldChannelAppearanceForm) => {
        mutation.mutate(
          {
            title:              values.title,
            public_description: values.public_description
          },
          {
            onSuccess: () => {
              history.push(makeFieldViewPath(field.name))
            }
          }
        )
      }}
    >
      {({ handleSubmit, values, errors, isSubmitting }) => (
        <>
          <Form onSubmit={handleSubmit} className="form channel-form">
            <div className="row avatar-and-title">
              <FieldAvatar field={field} imageSize="medium" />
              <div className="title-container">
                <label htmlFor="field-title">
                  <span className="header">Title</span>
                </label>
                <Field
                  id="field-title"
                  className="form-field"
                  name="title"
                  type="text"
                  value={values.title}
                  tabIndex="0"
                />
                {errors.title ? (
                  <div className="validation-message">{errors.title}</div>
                ) : null}
              </div>
            </div>
            <div className="row form-item">
              <label htmlFor="field-description">
                <span className="header">Description</span>
              </label>
              <Field
                id="field-description"
                name="public_description"
                className="form-field"
                as="textarea"
                value={values.public_description}
              />
              {errors.public_description ? (
                <div className="validation-message">
                  {errors.public_description}
                </div>
              ) : null}
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
  )
}

export default EditFieldAppearanceForm
