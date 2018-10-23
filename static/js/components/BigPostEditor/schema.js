// @flow

import { Schema } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"

// in addition to the node types supported already by prosemirror-markdown we
// want to support text nodes (paragraphs), along with images and embed.ly
// links
//
// we may not add images right away, but we should have support for them OOB
//
// I think given that images are already supplied in the prosemirror base
// schema we'll just need to implement a custom node type for the embedly link type
//
// and then most of the rest will be UI work

export const bigPostSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks
})
