// @flow
import React, { useState } from "react"
import { useMutation, useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import InfiniteScroll from "react-infinite-scroller"

import { Cell, Grid } from "../components/Grid"
import { Loading } from "../components/Loading"
import { SortableItem, SortableContainer } from "../components/SortableList"
import {
  LearningResourceCard,
  LearningResourceRow
} from "../components/LearningResourceCard"
import { SEARCH_LIST_UI } from "../lib/search"
import {
  userListItemsRequest,
  updateUserListItemPositionMutation,
  createUserListItemsSelector,
  createUserListItemsPageSelector
} from "../lib/queries/user_list_items"

import type { ResourceItem } from "../lib/queries/user_list_items"
import type { UserList } from "../flow/discussionTypes"

type UserListItemsProps = {
  userListId: number,
  items: Array<ResourceItem>,
  className: string,
  isSorting: ?boolean
}

type ItemsProps = {
  userListId: number,
  className: string,
  items: Array<ResourceItem>
}

type UserListItemSortableCardsProps = {
  userListId: number,
  className: string,
  isSorting: ?boolean,
  pageSize: number
}

type PaginatedUserListItemsProps = {
  userList: UserList,
  pageSize: number
}

const SortItems = ({ userListId, items, className }: ItemsProps) => {
  const [{ isPending }, updateUserListItemPosition] = useMutation(
    updateUserListItemPositionMutation
  )

  return (
    <SortableContainer
      shouldCancelStart={() => isPending}
      onSortEnd={async ({ oldIndex, newIndex }) => {
        const item = items[oldIndex]
        await updateUserListItemPosition(
          userListId,
          item.item.item_id,
          oldIndex,
          newIndex
        )
      }}
    >
      <Grid className={isPending ? `${className} saving` : className}>
        {items.map((item, i) => (
          <SortableItem key={`item-${item.item.item_id}`} index={i}>
            <Cell width={12}>
              <LearningResourceCard
                object={item.resource}
                searchResultLayout={SEARCH_LIST_UI}
                reordering
              />
            </Cell>
          </SortableItem>
        ))}
      </Grid>
    </SortableContainer>
  )
}

const ViewItems = ({ items, className }: ItemsProps) => {
  return (
    <Grid className={className}>
      {items.map(item => (
        <Cell width={12} key={`item-${item.item.item_id}`}>
          <LearningResourceCard
            object={item.resource}
            searchResultLayout={SEARCH_LIST_UI}
          />
        </Cell>
      ))}
    </Grid>
  )
}

const SortAndViewItems = ({ isSorting, ...props }: UserListItemsProps) => {
  return isSorting ? <SortItems {...props} /> : <ViewItems {...props} />
}

const loader = <Loading className="infinite" key="loader" />

export function UserListItemSortableCards({
  userListId,
  className,
  isSorting,
  pageSize
}: UserListItemSortableCardsProps) {
  const [page, setPage] = useState(0)

  const [{ isFinished }] = useRequest(
    userListItemsRequest(userListId, pageSize * page, pageSize)
  )
  const initialLoadDone = page !== 0 || isFinished

  const { items, count } = useSelector(createUserListItemsSelector(userListId))

  console.log({
    isFinished,
    page,
    len: items.length
  })

  return initialLoadDone ? (
    <InfiniteScroll
      hasMore={
        isFinished &&
        items.length < count &&
        items.length >= pageSize * (page + 1)
      }
      loadMore={() => setPage(page + 1)}
      initialLoad={page === 0}
      loader={loader}
    >
      <SortAndViewItems
        userListId={userListId}
        items={items}
        className={className}
        isSorting={isSorting}
      />
    </InfiniteScroll>
  ) : (
    loader
  )
}

export function PaginatedUserListItems({
  userList,
  pageSize
}: PaginatedUserListItemsProps) {
  const userListId = userList.id
  const [page, setPage] = useState(0)
  const begin = page * pageSize
  const end = begin + pageSize

  const [{ isFinished }] = useRequest(
    userListItemsRequest(userListId, begin, pageSize)
  )

  const { items, count } = useSelector(
    createUserListItemsPageSelector(userListId, begin, end)
  )

  return isFinished ? (
    <div className="user-list-items">
      {items.map((item, i) => (
        <LearningResourceRow
          key={i}
          object={item.resource}
          searchResultLayout={SEARCH_LIST_UI}
        />
      ))}
      <div className="pagination-nav">
        <button
          onClick={() => setPage(page - 1)}
          disabled={begin === 0}
          className="blue-btn outlined previous"
        >
          <i className="material-icons keyboard_arrow_left">
            keyboard_arrow_left
          </i>
          <span>Previous</span>
        </button>
        <button
          onClick={() => setPage(page + 1)}
          disabled={end > count}
          className="blue-btn outlined next"
        >
          <span>Next</span>
          <i className="material-icons keyboard_arrow_right">
            keyboard_arrow_right
          </i>
        </button>
      </div>
    </div>
  ) : (
    loader
  )
}
