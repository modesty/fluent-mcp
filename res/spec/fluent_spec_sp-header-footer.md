# **Context**: SPHeaderFooter spec: Used to create a Service Portal header or footer widget (`sp_header_footer`). Headers and footers extend `sp_widget` with positioning capabilities for consistent placement across portal pages.

```typescript
// Creates a new Service Portal header or footer (`sp_header_footer`)
import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
  $id: '',                    // string | number | ExplicitKey<string>, mandatory
  name: '',                   // string, mandatory — widget name
  id: '',                     // string, optional — unique id (alphanumeric, -, _ only)
  description: '',            // string, optional
  static: false,              // boolean, optional, default false
                              //   true  → header/footer appears on every portal page
                              //   false → can be selectively placed on specific pages
  category: 'custom',         // 'standard' | 'custom' | 'sample' | 'otherApplications'
                              //   | 'knowledgeBase' | 'servicePortal' | 'serviceCatalog'
  hasPreview: false,          // boolean, optional — show preview pane in Service Portal editor

  // Templates / scripts (prefer Now.include() to keep content out of source strings)
  htmlTemplate: '',           // string, optional — HTML template
  serverScript: '',           // string, optional — server-side script (Now.include('./server-script.js'))
  clientScript: '',           // string, optional — client-side script
  linkScript: '',             // string, optional — client-side link script
  customCss: '',              // string, optional — custom SCSS or CSS (SCSS is compiled server-side)

  // Wiring
  controllerAs: 'c',          // string, optional — Angular controller alias (default 'c')
  dataTable: 'sp_instance',   // TableName, optional — default 'sp_instance'
  angularProviders: [],       // (string | Record<'sp_angular_provider'> | SPAngularProvider)[]
  dependencies: [],           // (string | SPWidgetDependency | Record<'sp_dependency'>)[]
  templates: [],              // SPTemplate[] — additional Angular templates (sp_ng_template): [{ $id, id, htmlTemplate }]
                              //   There is no separate SPNgTemplate() API — author them here.
  fields: [],                 // (keyof FullSchema<dataTable> | SystemColumns | (string & {}))[]
                              //   Field names from dataTable exposed to the widget. Typed against that table's
                              //   schema plus system columns; unmodeled names still compile as plain strings.
                              //   Maps to sp_widget.field_list and drives the designer's field picker.
  optionSchema: [],           // WidgetOption[] — option schema definition
  demoData: {},               // JsonSerializable — demo data for the widget
  docs: '',                   // string | Record<'sp_documentation'>
  roles: [],                  // (string | Role | Record<'sys_user_role'>)[] — roles allowed to view

  public: false,              // boolean, optional — make publicly visible
  internal: false,            // boolean, optional — internal-use only marker
  servicenow: false,          // boolean, optional — set true only when scope is sn_/snc_ prefixed

  protectionPolicy: 'read',   // 'read' | 'protected', optional — post-install access control for other developers
                              //   'read'      → others can see the widget but not change it
                              //   'protected' → others cannot change this record
                              //   omit       → other developers may customize it
  $override: {},              // Record<string, string | boolean | number>, optional — escape hatch to set
                              //   unmodeled sp_header_footer columns by DB column name

  $meta: {                    // object, optional
    installMethod: 'first install', // 'first install' → loaded on first install only
                                    // 'demo' → loaded only when demo data flag is set
                                    // 'once' → applied once (apply_once)
    useEsLatest: true,        // boolean, optional (SDK v4.10.1+) — run this record's server-side script
                              //   field(s) with the latest supported ECMAScript version rather than the
                              //   application's default. Omit to leave the sys_app/now.config default in
                              //   place. This setting applies to all fields defined for this entity.
  },
}): SPHeaderFooter
```

## Notes

- Headers and footers are a specialized form of `sp_widget`. The full widget property set is supported.
- `static: true` is the most common pattern — a single global header/footer used across the portal.
- Use `static: false` when you want to switch headers/footers per page (e.g. branded vs minimal layout).
