/* global SETTINGS: false */
// @flow
import React from "react"
import R from "ramda"

import Editor, { editorUpdateFormShim } from "../Editor"
import EmbedlyCard from "../EmbedlyCard"
import PeopleSelector from "./PeopleSelector"

import {
  WIDGET_FIELD_TYPE_MARKDOWN,
  WIDGET_FIELD_TYPE_NUMBER,
  WIDGET_FIELD_TYPE_PEOPLE,
  WIDGET_FIELD_TYPE_TEXTAREA,
  WIDGET_FIELD_TYPE_URL
} from "../../lib/constants"

import type { WidgetFieldSpec } from "../../flow/widgetTypes"
import type { Profile } from "../../flow/discussionTypes"

type Props = {
  fieldSpec: WidgetFieldSpec,
  getValue: (lens: any) => any,
  updateValues: (lenses: Array<any>, values: Array<any>) => void
}

const WidgetField = ({ fieldSpec, getValue, updateValues }: Props) => {
  const configurationLens = R.lensPath(["configuration", fieldSpec.field_name])
  const jsonLens = R.lensPath(["json", fieldSpec.field_name])
  const configuration = getValue(configurationLens)
  const json = getValue(jsonLens)

  const configurationOrDefault = R.defaultTo(
    fieldSpec.default || "",
    configuration
  )

  const onChange = (event: any) =>
    updateValues([configurationLens], [event.target.value])

  switch (fieldSpec.input_type) {
  case WIDGET_FIELD_TYPE_MARKDOWN:
    return (
      <Editor
        initialValue={configurationOrDefault}
        onChange={editorUpdateFormShim("text", onChange)}
        placeHolder=""
      />
    )
  case WIDGET_FIELD_TYPE_TEXTAREA:
    return (
      <textarea
        value={configurationOrDefault}
        className="field"
        onChange={onChange}
        minLength={fieldSpec.props.min_length}
        maxLength={fieldSpec.props.max_length}
        placeholder={fieldSpec.props.placeholder}
      />
    )
  case WIDGET_FIELD_TYPE_NUMBER:
    return (
      <select
        className="field"
        value={configurationOrDefault}
        onChange={onChange}
      >
        {R.range(fieldSpec.props.min, fieldSpec.props.max + 1).map(index => (
          <option value={index} key={index}>
            {index}
          </option>
        ))}
      </select>
    )
  case WIDGET_FIELD_TYPE_URL:
    return (
      <React.Fragment>
        <input
          type="text"
          className="field"
          value={configurationOrDefault}
          onChange={onChange}
          minLength={fieldSpec.props.min_length}
          maxLength={fieldSpec.props.max_length}
          placeholder={fieldSpec.props.placeholder}
        />
        {fieldSpec.props.show_embed ? (
          <EmbedlyCard url={configurationOrDefault} />
        ) : null}
      </React.Fragment>
    )
  case WIDGET_FIELD_TYPE_PEOPLE: {
    const updateProfiles = (profiles: Array<Profile>) =>
      updateValues(
        [configurationLens, jsonLens],
        [profiles.map(profile => profile.username), profiles]
      )

    return (
      <PeopleSelector updateProfiles={updateProfiles} profiles={json || []} />
    )
  }
  default:
    return (
      <input
        type="text"
        className="field"
        value={configurationOrDefault}
        onChange={onChange}
        minLength={fieldSpec.props.min_length}
        maxLength={fieldSpec.props.max_length}
        placeholder={fieldSpec.props.placeholder}
      />
    )
  }
}

export default WidgetField
