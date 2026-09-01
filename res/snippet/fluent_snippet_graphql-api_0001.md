# Define a secured scripted GraphQL API in ServiceNow Fluent

```typescript
import { Acl, GraphQLApi } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// Schema-gate ACL for the whole API. enforceAcl defaults to EMPTY — without a gate listed here,
// requiresAclAuthorization: true enforces nothing.
const schemaGate = Acl({
  $id: Now.ID['gql_catalog_gate'],
  type: 'graphql',
  name: 'catalogGql', // schema-gate ACLs are named for the API namespace
  operation: 'execute',
  roles: ['catalog_reader'],
})

// Field-level path ACL. `name` is the SLASH-delimited runtime query path, starting with the
// application namespace and the API namespace — a different format from a resolver's `Type:field`.
// Four segments, so contextualAclMaxDepth must be >= 4 (the default) for this to be enforced.
Acl({
  $id: Now.ID['gql_catalog_cost_field'],
  type: 'graphql',
  name: '/xSncMyApp/catalogGql/items/cost',
  operation: 'execute',
  roles: ['catalog_admin'],
})

GraphQLApi({
  $id: Now.ID['gql_catalog'],
  name: 'Catalog GraphQL',
  namespace: 'catalogGql', // valid GraphQL name; unique within the application namespace
  // applicationNamespace omitted on purpose: in a SCOPED app it is derived from the scope, and an
  // explicit differing value is reported as a hint and ignored. Set it only in GLOBAL scope.

  // The PLATFORM compiles this SDL on insert — the Fluent build does not validate it.
  schema: `
    type Item {
      name: String
      cost: Float
    }
    type Query {
      items: [Item]
    }
  `,

  enforceAcl: [schemaGate],
  // requiresAuthentication / requiresAclAuthorization / requiresSncInternalRole and
  // contextualAclMaxDepth are omitted — their secure defaults (true/true/true/4) already apply.

  resolvers: [
    {
      $id: Now.ID['gql_catalog_items_resolver'], // always set a child $id — `name` can change
      name: 'itemsResolver',
      paths: ['Query:items'], // one sys_graphql_resolver_mapping per path
      // An INLINE FUNCTION here would type-check but is a build error. Legal forms are an imported
      // named server-module function (preferred), an inline string as below, or Now.include(...).
      script: `
        (function process(env) {
          var items = [];
          var gr = new GlideRecord('sc_cat_item');
          gr.setLimit(20);
          gr.query();
          while (gr.next()) {
            items.push({ name: gr.getValue('name'), cost: parseFloat(gr.getValue('price') || '0') });
          }
          return items;
        })(env);
      `,
    },
  ],
})
```
