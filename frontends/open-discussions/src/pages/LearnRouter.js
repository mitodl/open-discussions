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

type Props = {
  match: Match
}

export default function LearnRouter(props: Props) {
  const { match } = props

  useRequest(favoritesRequest())

  return (
    <>
      <Route exact path={`${match.url}`} component={CourseIndexPage} />
      <Route exact path={`${match.url}/search`} component={CourseSearchPage} />
      <Switch>
        <Route
          path={`${match.url}/lists/favorites`}
          component={FavoritesDetailPage}
        />
        <Route path={`${match.url}/lists/:id`} component={UserListDetailPage} />
      </Switch>
      <Route exact path={`${match.url}/lists`} component={UserListsPage} />
      <LearningResourceDrawer />
      <AddToListDialog />
    </>
  )
}
