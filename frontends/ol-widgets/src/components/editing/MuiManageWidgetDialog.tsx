import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControlLabel from "@mui/material/FormControlLabel"
import { Formik, Form, Field, ErrorMessage } from "formik"
import type { WidgetInstance, WidgetSpec } from "../../interfaces"
import { getWidgetFieldComponent } from "./getWidgetFieldComponent"
import { useCallback, useMemo, useState } from "react"
import { getWidgetSchema } from "./schemas"

type NascentWidget = Omit<WidgetInstance, 'id'> & { id: null }

type WidgetSubmitEvent = {
  widget: WidgetInstance
  type: 'edit'
} | {
  widget: NascentWidget
  type: 'add'
}

type WidgetSubmitHandler = (event: WidgetSubmitEvent) => void

interface MuiManageWidgetDialogProps {
  widget?: WidgetInstance | null
  specs: WidgetSpec[]
  isOpen: boolean
  onCancel: () => void
  onSubmit: WidgetSubmitHandler
  className?: string
  errorClassName?: string
  fieldClassName?: string
}

interface WidgetEditingProps {
  widget: WidgetInstance | NascentWidget
  spec: WidgetSpec
  onSubmit: (event: WidgetSubmitEvent) => void
  onCancel: () => void
  errorClassName?: string
  fieldClassName?: string
}

const DialogContentEditing: React.FC<WidgetEditingProps> = ({
  widget,
  spec,
  onSubmit,
  onCancel,
  fieldClassName,
  errorClassName
}) => {
  const validationSchema = useMemo(
    () => getWidgetSchema(widget.widget_type),
    [widget.widget_type]
  )
  const onSubmitForm = useCallback((widget: WidgetInstance | NascentWidget) => {
    const event: WidgetSubmitEvent = widget.id === null ? {
      widget,
      type: 'add'
    } : {
      widget,
      type: 'edit'
    }
    onSubmit(event)
  }, [onSubmit])
  return (
    <>
      <DialogTitle>Edit Widget</DialogTitle>
      <Formik
        initialValues={widget as WidgetInstance<Record<string, unknown>>}
        validationSchema={validationSchema}
        validateOnChange={false}
        onSubmit={onSubmitForm}
      >
        {({ handleSubmit, values }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <label htmlFor="title">Title</label>
              <Field
                className={fieldClassName}
                name="title"
                type="text"
                value={values.title}
              />
              <ErrorMessage
                className={errorClassName}
                component="div"
                name="title"
              />
              {spec.form_spec.map(fieldSpec => {
                const fieldName = fieldSpec.field_name
                // Formik uses dot notation for nested objects as name attrs
                // https://formik.org/docs/guides/arrays#nested-objects
                const attrName = `configuration.${fieldName}`
                return (
                  <React.Fragment key={fieldName}>
                    <label htmlFor={attrName}>{fieldSpec.label}</label>
                    <Field
                      className={fieldClassName}
                      as={getWidgetFieldComponent(fieldSpec)}
                      name={attrName}
                      value={values.configuration[fieldSpec.field_name]}
                    />
                    <ErrorMessage
                      className={errorClassName}
                      component="div"
                      name={attrName}
                    />
                  </React.Fragment>
                )
              })}
            </DialogContent>
            <DialogActions>
              <Button type="submit" variant="outlined" onClick={onCancel}>
              Cancel
              </Button>
              <Button type="submit" variant="contained">
              Submit
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </>
  )
}

interface WidgetAddingProps {
  specs: WidgetSpec[]
  onCancel: () => void
  onSubmit: (widget: NascentWidget) => void
}

type AddWidgetFormValues = {
  widget_type: string
}

const DialogContentAdding: React.FC<WidgetAddingProps> = ({specs, onCancel, onSubmit}) => {
  const initialValues = useMemo(() => ({ widget_type: specs[0].widget_type }), [specs])
  const onSubmitType = useCallback((values: AddWidgetFormValues) => {
    const spec = mustFindSpec(specs, values.widget_type)
    const widget: NascentWidget = {
      title:         'New Widget',
      configuration: Object.fromEntries(spec.form_spec.map(fieldSpec => [fieldSpec.field_name, fieldSpec.default])),
      widget_type:   spec.widget_type,
      id:            null
    }
    onSubmit(widget)
  }, [specs, onSubmit])
  return (
    <>
      <DialogTitle>New Widget</DialogTitle>
      <Formik
        initialValues={initialValues}
        onSubmit={onSubmitType}
      >
        {({ handleSubmit }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <RadioGroup name='spec'>
                {specs.map(spec => (
                  <FormControlLabel
                    key={spec.widget_type}
                    value={spec.widget_type}
                    control={<Radio />}
                    label={spec.widget_type}
                  />
                ))}
              </RadioGroup>
            </DialogContent>
            <DialogActions>
              <Button type="submit" variant="outlined" onClick={onCancel}>
              Cancel
              </Button>
              <Button type="submit" variant="contained">
              Submit
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </>
  )
}

const mustFindSpec = (specs: WidgetSpec[], widgetType: string): WidgetSpec => {
  const spec = specs.find(s => s.widget_type === widgetType)
  if (!spec) {
    throw new Error(`Could not find spec for widget of type ${widgetType}`)
  }
  return spec
}

/**
 * A dialog for editing the widget. If you need to style it, pass a classname
 * and use normal MUI classes.
 */
const MuiManageWidgetDialog: React.FC<MuiManageWidgetDialogProps> = ({
  widget: initialWidget = null,
  specs,
  onSubmit,
  isOpen,
  onCancel,
  className,
  fieldClassName,
  errorClassName
}) => {
  const [widget, setWidget] = useState<WidgetInstance | NascentWidget | null>(initialWidget)
  const handlePickNewWidget: WidgetAddingProps["onSubmit"] = useCallback(nascentWidget => setWidget(nascentWidget), [])
  return (
    <Dialog fullWidth className={className} open={isOpen} onClose={onCancel}>
      {widget ? <DialogContentEditing
        widget={widget}
        spec={mustFindSpec(specs, widget.widget_type)}
        onSubmit={onSubmit}
        onCancel={onCancel}
        fieldClassName={fieldClassName}
        errorClassName={errorClassName}
      /> : <DialogContentAdding specs={specs} onSubmit={handlePickNewWidget}  onCancel={onCancel} /> }
    </Dialog>
  )
}

export default MuiManageWidgetDialog
export type { MuiManageWidgetDialogProps, WidgetSubmitEvent, WidgetSubmitHandler }
