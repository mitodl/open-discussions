import React, { useCallback } from "react"
import { useFormik, FormikConfig } from "formik"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import { RadioChoiceField } from "ol-forms"
import {
  UserList,
  LearningResourceType as LRType,
  PrivacyLevel
} from "ol-search-ui"
import * as Yup from "yup"
import {
  useTopics,
  useCreateUserList,
  useUpdateUserList
} from "../../api/learning-resources"
import Alert from "@mui/material/Alert"

type ListFormSchema = Pick<
  UserList,
  "title" | "list_type" | "privacy_level" | "short_description" | "topics"
>

const listFormSchema: Yup.SchemaOf<ListFormSchema> = Yup.object().shape({
  title:     Yup.string().default("").required("Title is required."),
  list_type: Yup.string()
    .default(LRType.Userlist)
    .required("List type is required."),
  privacy_level: Yup.string()
    .default(PrivacyLevel.Private)
    .required("A privacy setting is required."),
  short_description: Yup.string()
    .default("")
    .required("Description is required."),
  topics: Yup.array()
    .of(
      Yup.object().shape({
        id:   Yup.number().required(),
        name: Yup.string().required()
      })
    )
    .min(1, "Select between 1 and 3 subjects.")
    .max(3, "Select between 1 and 3 subjects.")
    .default([])
    .required()
})

const variantProps = { InputLabelProps: { shrink: true } }

const LIST_TYPE_CHOICES = [
  {
    value: LRType.Userlist,
    label: (
      <>
        <span className="option-header">Learning List</span>
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
        <span className="option-header">Learning Path</span>
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

interface UpsertListFormProps {
  resource?: UserList | null
  onClose: () => void
}
const UpsertListForm: React.FC<UpsertListFormProps> = ({
  resource,
  onClose
}) => {
  const createUserList = useCreateUserList()
  const updateUserList = useUpdateUserList()
  const handleSubmit: FormikConfig<Partial<ListFormSchema>>["onSubmit"] =
    useCallback(
      async values => {
        if (resource?.id) {
          await updateUserList.mutateAsync({ id: resource.id, ...values })
        } else {
          await createUserList.mutateAsync(values)
        }
        onClose()
      },
      [resource, onClose, createUserList, updateUserList]
    )
  const formik = useFormik({
    initialValues:
      resource ?? (listFormSchema.getDefault() as Partial<ListFormSchema>),
    validationSchema: listFormSchema,
    onSubmit:         handleSubmit,
    validateOnChange: false,
    validateOnBlur:   false
  })

  const topicsQuery = useTopics()
  const topics = topicsQuery.data?.results ?? []
  const hasError = createUserList.isError || updateUserList.isError
  return (
    <form onSubmit={formik.handleSubmit} className="manage-list-form">
      <DialogContent>
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
          isOptionEqualToValue={(option, value) => option.id === value.id}
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
              placeholder={
                formik.values.topics?.length ?
                  undefined :
                  "Pick 1 to 3 subjects"
              }
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={formik.isSubmitting}
        >
          Save
        </Button>
      </DialogActions>
      {hasError && !formik.isSubmitting && (
        <DialogContent>
          <Alert severity="error">
            There was an error saving your list. Please try again.
          </Alert>
        </DialogContent>
      )}
    </form>
  )
}

interface UpsertListDialogProps {
  title: string
  open: boolean
  resource?: UserList | null
  onClose: () => void
}
const UpsertListDialog: React.FC<UpsertListDialogProps> = ({
  resource,
  open,
  onClose,
  title
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <UpsertListForm resource={resource} onClose={onClose} />
    </Dialog>
  )
}

export default UpsertListDialog
