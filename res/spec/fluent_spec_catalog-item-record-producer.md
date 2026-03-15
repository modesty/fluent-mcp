# **Context:** CatalogItemRecordProducer API spec: Used to create a Record Producer (`sc_cat_item_producer`) — a specialized catalog item that creates a record in a specified ServiceNow table when submitted. Inherits all CatalogItem properties and adds record-creation-specific fields

```typescript
import { CatalogItemRecordProducer } from '@servicenow/sdk/core'

// Creates a Record Producer (`sc_cat_item_producer`)
// Inherits all CatalogItem properties (see catalog-item spec) plus the following:
CatalogItemRecordProducer({
    $id: Now.ID['my_record_producer'], // string | Now.ID key, mandatory — unique identifier

    // ─── Inherited from CatalogItem (see catalog-item spec for full list) ───
    name: '',               // string, mandatory — display name
    shortDescription: '',   // string, optional
    description: '',        // string, optional — HTML description
    active: true,           // boolean, optional, default: true
    state: 'published',     // 'published' | 'draft' | ..., optional
    catalogs: [],           // (string | Record<'sc_catalog'>)[], optional
    categories: [],         // (string | Record<'sc_category'>)[], optional (requires catalogs)
    availableFor: [],       // (string | Record<'user_criteria'>)[], optional
    notAvailableFor: [],    // (string | Record<'user_criteria'>)[], optional
    variables: {},          // Record<string, VariableType>, optional — inline variable definitions
    variableSets: [],       // { variableSet, order }[], optional — attached VariableSets
    hideSaveAsDraft: false, // boolean, optional
    hideAttachment: false,  // boolean, optional
    mandatoryAttachment: false, // boolean, optional — mutually exclusive with hideAttachment
    requestMethod: 'submit', // 'order' | 'request' | 'submit', optional — typically 'submit' for record producers
    order: 0,               // number, optional
    roles: [],              // (string | Role)[], optional

    // ─── Record Producer-specific fields ───
    table: 'incident',      // string (TableName) | Table, mandatory — target table where the record will be created

    script: `               // string | function, optional — server-side script executed BEFORE record creation
        // Access variables via producer.var_name
        // Access the being-created GlideRecord via 'current'
        // Do NOT call current.update() or current.insert() here
        current.short_description = producer.issue_description;
        current.urgency = '2';
    `,

    postInsertScript: `     // string | function, optional — script executed AFTER the record is created
        // current.update() is safe to use here
        current.work_notes = 'Record created via Service Catalog';
        current.update();
    `,

    saveScript: `           // string | function, optional — script executed on each step save in Catalog Builder
        // Executed BEFORE the main script
    `,

    allowEdit: false,       // boolean, optional — allow editing the generated record after creation, default: false
    canCancel: false,       // boolean, optional — allow user to cancel the submission, default: false
    redirectUrl: 'generatedRecord', // 'generatedRecord' | 'catalogHomePage', optional — where to redirect after submit, default: 'generatedRecord'
    saveOptions: '',        // string, optional — advanced save configuration
}): CatalogItemRecordProducer // returns a CatalogItemRecordProducer object
```
