---
layout: default
title: RFCs
nav_order: 8
has_children: true
---

RFCs are documentation around how we have made technical decisions.

## What qualifies for an RFC?

An RFC is merited for technical solutions to problems of medium-high complexity, particularly if they impact realms of architecture, security, or tooling. They're meant to document the decision making process around how we approach these problems technically.

The documentation comes in 2 forms:
- **RFC** - documents the research, design, and decision around the technical approach
- **Pull Request** - documents the history of how we got there

## What doesn't qualify for an RFC?

Anything that isn't a solution to a technical problem.

## How to write a new RFC

- Duplicate the template file `_0001-template.md` following the existing naming convention of `NNNN-lowercase-dashed-title.md`
- Notify in the slack channel #mit-open-eng that you've taken that RFC number
- Set a `nav_order` matching your RFC number (don't zero-pad it)
- Fill out your RFC document
  - Note any sections that aren't applicable as such
  - This is a good time to write up architectural (or any other kind) documentation alongside your RFC.
- Create a PR with your proposed RFC and engage the team in discussion and feedback.
  - This should happen as much in the PR on Github as possible so it's easier to lookup later.
