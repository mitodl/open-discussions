import React, { useCallback, useMemo } from "react"
import { useFormik, FormikConfig } from "formik"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import { RadioChoiceField, RadioChoiceProps, FormDialog } from "ol-forms"
import {
  UserList,
  StaffList,
  LearningResourceType as LRType,
  PrivacyLevel
} from "ol-search-ui"
import * as Yup from "yup"
import {
  useTopics,
  useCreateUserList,
  useUpdateUserList,
  useCreateStaffList,
  useUpdateStaffList
} from "../../api/learning-resources"
import Alert from "@mui/material/Alert"

type ListFormSchema = Pick<
  UserList | StaffList,
  "title" | "list_type" | "privacy_level" | "short_description" | "topics"
>

const listFormSchema: Yup.SchemaOf<ListFormSchema> = Yup.object().shape({
  title:     Yup.string().default("").required("Title is required."),
  list_type: Yup.string()
    .default(LRType.Userlist)
    .required("List type is required."),
  privacy_level: Yup.mixed<PrivacyLevel>()
    .oneOf(Object.values(PrivacyLevel))
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

const getListTypeChoices = (mode: "stafflist" | "userlist"): RadioChoiceProps[] => {
  return [
    {
      value: mode === "stafflist" ? LRType.StaffList : LRType.Userlist,
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
      value: mode === "stafflist" ? LRType.StaffPath : LRType.LearningPath,
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
}
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

interface UpsertListDialogProps {
  title: string
  open: boolean
  resource?: UserList | StaffList | null
  onClose: () => void
  mode: "stafflist" | "userlist"
}
const UpsertListDialog: React.FC<UpsertListDialogProps> = ({
  resource,
  open,
  onClose,
  title,
  mode
}) => {
  const createUserList = useCreateUserList()
  const updateUserList = useUpdateUserList()
  const createStaffList = useCreateStaffList()
  const updateStaffList = useUpdateStaffList()
  const createList = mode === "stafflist" ? createStaffList : createUserList
  const updateList = mode === "stafflist" ? updateStaffList : updateUserList
  const mutation = resource?.id ? updateList : createList
  const handleSubmit: FormikConfig<Partial<ListFormSchema>>["onSubmit"] =
    useCallback(
      async values => {
        if (resource?.id) {
          await updateList.mutateAsync({ id: resource.id, ...values })
        } else {
          await createList.mutateAsync(values)
        }
        onClose()
      },
      [resource, onClose, createList, updateList]
    )
  const formik = useFormik({
    enableReinitialize: true,
    initialValues:
      resource ?? (listFormSchema.getDefault() as Partial<ListFormSchema>),
    validationSchema: listFormSchema,
    onSubmit:         handleSubmit,
    validateOnChange: false,
    validateOnBlur:   false
  })

  const topicsQuery = useTopics({ enabled: open })
  const topics = topicsQuery.data?.results ?? []

  const canChangePrivacy = mode === "stafflist" || SETTINGS.user.is_public_list_editor

  const typeChoices = useMemo(() => getListTypeChoices(mode), [mode])

  return (
    <FormDialog
      open={open}
      title={title}
      formClassName="manage-list-form"
      onClose={onClose}
      onReset={formik.resetForm}
      onSubmit={formik.handleSubmit}
      noValidate
      footerContent={
        mutation.isError &&
        !formik.isSubmitting && (
          <Alert severity="error">
            There was a problem saving your list. Please try again later.
          </Alert>
        )
      }
    >
      <RadioChoiceField
        className="form-row"
        name="list_type"
        label="List Type"
        choices={typeChoices}
        value={formik.values.list_type}
        row
        onChange={formik.handleChange}
      />
      {canChangePrivacy && (
        <RadioChoiceField
          className="form-row"
          name="privacy_level"
          label="Privacy"
          choices={PRIVACY_CHOICES}
          value={formik.values.privacy_level}
          row
          onChange={formik.handleChange}
        />
      )}
      <TextField
        required
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
        required
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
            required
            error={!!formik.errors.topics}
            helperText={formik.errors.topics}
            label="Subjects"
            name="topics"
            placeholder={
              formik.values.topics?.length ? undefined : "Pick 1 to 3 subjects"
            }
          />
        )}
      />
    </FormDialog>
  )
}

export default UpsertListDialog
export type { UpsertListDialogProps }
