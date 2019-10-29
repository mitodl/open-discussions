Adding new Learning Resource Types
---

When adding a new type of Learning Resource, be sure to handle that new resource in the following code,
and in tests for that code:

#### Python
- course_catalog.serializers
  - add a serializer for the new type
  - update GenericForeignKeyFieldSerializer.to_representation
  - update UserListItemSerializer.validate

- course_catalog.views (add an API view for the new type)
- course_catalog.urls  (add a URL for the new view above)
 
 
- search.api
  - add a `gen<type>_id` function to generate a unique ES document id for the type
  - update `_apply_general_query_filters` function if applicable
  
- search.indexing_api 
   - create an ES mapping for the new type
   - add functions to index the new type
   
 - search.serializers
   - Add a new ES serializer
   - Create functions for bulk indexing of the new type

- search.task_helpers
  - Add upsert and delete functions for the type
  
- search.tasks
  - Add an `index_<type>s` function and add it to the `recreate_index` function

#### React

- lib/queries
  - Add code to make API requests for the new type
  
- flow/discussionTypes
  - Add your new type
  
- lib/constants.js
  - add a `LR_TYPE_<typename>` const
  - add the above to `LR_TYPE_ALL`  and `readableLearningResources`
  
- lib/search.js
  - Add query fields for the type
  - Include the type in `_searchFields`
 
 - components/LearningResourceCard.js
   - update `mapDispatchToProps` so that `toggleFavorite` will work with the new type
   
 - components/LearningResourceDrawer.js
   - at some point it needs to be able to display details for objects of the new type
   
