# **Context:** GraphQLApi API spec (SDK v4.11.0+): Defines a **scripted GraphQL API** — an SDL schema plus the resolvers that fetch its field data — secured by a schema-gate ACL for the whole API and field-level path ACLs enforced per query path. One `GraphQLApi()` call writes `sys_graphql_schema` plus one `sys_graphql_resolver` per `resolvers` entry, one `sys_graphql_resolver_mapping` per `paths` entry within each resolver, and one `sys_graphql_typeresolver` per `typeResolvers` entry. Import `GraphQLApi` from `@servicenow/sdk/core`. Queries reach `POST /api/now/graphql` wrapped as `{ <applicationNamespace> { <namespace> { ... } } }`.

```typescript
GraphQLApi({
  $id: Now.ID['graphql_api_1'], // Now.ID | string | number, mandatory - identity
  name: 'Catalog GraphQL', // string, mandatory - display name of the API
  namespace: 'catalogGql', // string, mandatory - the API namespace in the query envelope AND the second
    // segment of every runtime ACL path. Must be a valid GraphQL name (letter/underscore, then
    // letters/digits/underscores) and UNIQUE among the APIs in its application namespace — a duplicate
    // is a build ERROR
  applicationNamespace: 'xSncMyApp', // string, optional - the TOP-LEVEL envelope key. DERIVED from the
    // application scope, camel-cased with separators removed: scope `x_snc_my_app` -> `xSncMyApp`.
    // Setting it is ONLY honored in global scope (where the platform's real value depends on instance
    // settings and caller roles that the build cannot read, so it falls back to `now` — which is why a
    // GLOBAL-scope app should set it explicitly). In a SCOPED app the value is always derived and an
    // explicit differing value is reported as a hint and IGNORED. Valid GraphQL name, <= 40 characters
  schema: `
    type Item { name: String cost: Float }
    type Query { items: [Item] }
  `, // string, mandatory - the schema definition language (SDL). Inline as above, or keep it in a file
    // with Now.include('./schema.graphql'). The PLATFORM compiles the SDL on insert — Fluent does not
  active: true, // boolean, optional (default true) - whether the API can serve requests

  // ── RESOLVERS: fetch the data for schema fields (sys_graphql_resolver) ──
  resolvers: [
    {
      $id: Now.ID['items_resolver'], // Now.ID | string, mandatory - ALWAYS set it; `name` can change,
        // and $id is what keeps an update attached to the original record
      name: 'itemsResolver', // string, mandatory - identifier, UNIQUE within this schema
      paths: ['Query:items'], // string[], mandatory - schema fields this resolver serves, each in
        // `Type:field` form. One sys_graphql_resolver_mapping is created PER path; one resolver may
        // serve several. A duplicate path across resolvers is a build ERROR.
        // NOTE this is a DIFFERENT format from the slash-delimited ACL path (see enforceAcl below)
      script: resolveItems, // ((env) => unknown) | string, mandatory. THREE legal forms:
        //   1. an IMPORTED NAMED function from a server module (preferred — type-checked and reusable)
        //   2. an inline script STRING
        //   3. Now.include('./resolvers/items.js')
        // Writing the function INLINE here type-checks but is a BUILD ERROR — the type accepts a
        // function so an imported one can be passed by name, not so one can be defined in place.
        // Read field arguments inside the script with env.getArguments()
    },
  ],

  // ── TYPE RESOLVERS: pick the concrete type for a union or interface (sys_graphql_typeresolver) ──
  typeResolvers: [
    {
      $id: Now.ID['payload_type_resolver'], // Now.ID | string, mandatory - keeps the record stable if
        // the SDL type is later renamed
      typeName: 'SearchResult', // string, mandatory - the UNION or INTERFACE type in the SDL this applies
        // to. Must be unique among this API's typeResolvers; a duplicate is a build ERROR
      script: resolveSearchResultType, // ((env) => unknown) | string, mandatory - returns the concrete
        // type NAME. Same three legal forms as a resolver's script
    },
  ],

  // ── SECURITY: two-tier, and secure-by-default EXCEPT enforceAcl (see warning) ──
  enforceAcl: [schemaGateAcl], // (string | ReturnType<typeof Acl>)[], optional - the SCHEMA-GATE ACLs
    // (sys_security_acl) controlling access to the WHOLE API. Accepts Acl references or sys_ids.
    // ⚠️ This is an ARRAY, NOT a secure-by-default boolean: it defaults to EMPTY, i.e. NO schema gate.
    // Leaving it empty removes a layer of access control even though requiresAclAuthorization is true
  requiresAuthentication: true, // boolean, optional (DEFAULT true) - callers must be authenticated
  requiresAclAuthorization: true, // boolean, optional (DEFAULT true) - the enforceAcl schema gates are
    // actually enforced. Setting false makes a populated enforceAcl inert
  requiresSncInternalRole: true, // boolean, optional (DEFAULT true) - callers must hold `snc_internal`
  contextualAclMaxDepth: 4, // number, optional (DEFAULT 4) - max path DEPTH at which field-level path
    // ACLs are enforced. Depth counts EVERY segment INCLUDING the two envelope segments, so
    // `/xSncMyApp/catalogGql/items` is depth 3 and `/xSncMyApp/catalogGql/items/cost` is depth 4.
    // The default therefore covers top-level and second-level fields. Count the slash-separated
    // segments of the deepest ACL you need enforced and set at least that; deeper fields are NOT checked

  // ── Cross-cutting (from Now.Internal.WithIdAndMetadata) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - post-install developer access
  // $override: { ... } // optional - escape hatch for sys_* / sys_domain columns
  // NOTE: GraphQLApi does NOT accept `$meta` — no installMethod, no useEsLatest
  // WARNING (SDK v4.13.0+): a resolvers[] / typeResolvers[] ENTRY now type-checks with `$meta`, but the build
  // IGNORES it — `installMethod` does not move the record and `useEsLatest` writes no sys_es_latest_script.
  // Do not set `$meta` on resolver or type-resolver entries.
})

// ── FIELD-LEVEL PATH ACLs are STANDALONE Acl() records, never set inside GraphQLApi ──
// `name` is the SLASH-delimited runtime query path: applicationNamespace, then namespace, then the
// field names as they appear in the query tree. It uses NEITHER the raw application scope NOR the
// `Type:field` resolver-mapping format. A denied field resolves to `null`; a user with `admin`
// overrides the check unless the ACL sets adminOverrides: false.
Acl({
  $id: Now.ID['graphql_cost_field_acl'],
  type: 'graphql', // the ACL type that makes this a GraphQL path ACL
  name: '/xSncMyApp/catalogGql/items/cost', // depth 4 — needs contextualAclMaxDepth >= 4
  operation: 'execute',
  roles: ['catalog_admin'],
})
```
