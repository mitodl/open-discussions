import React, { useCallback } from "react"
import { useFormik, FormikConfig } from "formik"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import { RadioChoiceField } from "ol-forms"
import { UserList, LearningResourceType as LRType, PrivacyLevel } from "ol-search-ui"
import * as Yup from "yup"
import { useTopics } from "../../api/learning-resources"

type ListFormSchema = Pick<UserList,
  | "title"
  | "list_type"
  | "privacy_level"
  | "short_description"
  | "topics"
  >

const listFormSchema: Yup.SchemaOf<ListFormSchema> = Yup.object().shape({
  title:             Yup.string().default("").required("Title is required"),
  list_type:         Yup.string().default(LRType.Userlist).required("List type is required"),
  privacy_level:     Yup.string().default(PrivacyLevel.Private).required("Privacy is required"),
  short_description: Yup.string().default("").required("Short description is required"),
  topics:            Yup.array().of(Yup.object().shape({
    id:   Yup.number().required(),
    name: Yup.string().required()
  }))
    .min(1, "At least one subject is required.")
    .max(3, "Select no more than 3 subjects.")
    .default([]).required()
})

const variantProps = { InputLabelProps: { shrink: true } }

const LIST_TYPE_CHOICES = [
  {
    value: LRType.Userlist,
    label: (
      <>
        <span className="option-header">
          Learning List
        </span>
        <span className="option-detail">
         Create a list of of any of our learning resources.
        </span>
      </>
    ),
    className: "radio-option"
  },
  {
    value: LRType.LearningPath,
    label: (
      <>
        <span className="option-header">
          Learning Path
        </span>
        <span className="option-detail">
          An ordered list of learning resources.
        </span>
      </>
    ),
    className: "radio-option"
  }
]

const PRIVACY_CHOICES = [
  {
    value:     PrivacyLevel.Private,
    label:     "Private",
    className: "radio-option"
  },
  {
    value:     PrivacyLevel.Public,
    label:     "Public",
    className: "radio-option"
  }
]

interface ManageListFormProps {
  id: string
  resource?: UserList | null
  onSubmit?: FormikConfig<Partial<ListFormSchema>>["onSubmit"]
}
const ManageListForm: React.FC<ManageListFormProps> = ({ resource, onSubmit, id: formId }) => {
  const handleSubmit: FormikConfig<Partial<ListFormSchema>>["onSubmit"] = useCallback((values, helpers) => {
    if (onSubmit) {
      onSubmit(values, helpers)
    }
  }, [onSubmit])
  const formik = useFormik({
    initialValues:    resource ?? listFormSchema.getDefault() as Partial<ListFormSchema>,
    validationSchema: listFormSchema,
    onSubmit:         handleSubmit,
    validateOnChange: false,
    validateOnBlur:   false
  })

  const topicsQuery = useTopics()
  const topics = topicsQuery.data?.results ?? []
  return (
    <form id={formId} onSubmit={formik.handleSubmit} className="manage-list-form">
      <RadioChoiceField
        className="form-row"
        name="list_type"
        label="List Type"
        choices={LIST_TYPE_CHOICES}
        value={formik.values.list_type}
        row
        onChange={formik.handleChange}
      />
      <RadioChoiceField
        className="form-row"
        name="privacy_level"
        label="Privacy"
        choices={PRIVACY_CHOICES}
        value={formik.values.privacy_level}
        row
        onChange={formik.handleChange}
      />
      <TextField
        className="form-row"
        name="title"
        label="Title"
        placeholder="List Title"
        value={formik.values.title}
        error={!!formik.errors.title}
        helperText={formik.errors.title}
        onChange={formik.handleChange}
        {...variantProps}
        fullWidth
      />
      <TextField
        className="form-row"
        label="Description"
        name="short_description"
        placeholder="List Description"
        value={formik.values.short_description}
        error={!!formik.errors.short_description}
        helperText={formik.errors.short_description}
        onChange={formik.handleChange}
        {...variantProps}
        fullWidth
        multiline
        minRows={3}
      />
      <Autocomplete
        className="form-row"
        multiple
        options={topics}
        getOptionLabel={option => option.name}
        value={formik.values.topics}
        onChange={(_event, value) => formik.setFieldValue("topics", value)}
        renderInput={params => (
          <TextField
            {...params}
            {...variantProps}
            error={!!formik.errors.topics}
            helperText={formik.errors.topics}
            label="Subjects"
            name="topics"
            placeholder={formik.values.topics?.length ? undefined : "Pick 1 to 3 subjects" }
          />
        )}
      />
    </form>
  )
}

export default ManageListForm
