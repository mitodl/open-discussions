// @flow
import React from "react"
import { Route, Switch } from "react-router-dom"
import { useRequest } from "redux-query-react"

import CourseSearchPage from "./CourseSearchPage"
import CourseIndexPage from "./CourseIndexPage"
import UserListsPage from "./UserListsPage"
import UserListDetailPage from "./UserListDetailPage"
import FavoritesDetailPage from "./FavoritesDetailPage"

import LearningResourceDrawer from "../components/LearningResourceDrawer"
import AddToListDialog from "../components/AddToListDialog"

import { favoritesRequest } from "../lib/queries/learning_resources"

import type { Match } from "react-router"
import {fieldIndexRoute} from "../lib/routing";
import FieldChannelRouter from "./FieldChannelRouter";
import FieldsIndexPage from "./FieldsIndexPage";

type Props = {
  match: Match
}

export default function FieldsRouter(props: Props) {
  const { match } = props

  useRequest(favoritesRequest())

  return (
    <>
      <Route exact path={`${match.url}`} component={FieldsIndexPage} />
      <Route
        path={fieldIndexRoute(match.url)}
        component={FieldChannelRouter}
      />
    </>
  )
}
