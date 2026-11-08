# Create a Service Portal widget dependency for custom CSS styles

```typescript
import { Record, SPWidgetDependency, CssInclude } from '@servicenow/sdk/core'

// A dependency cannot hold inline CSS: each CSS include points at an external `url`
// or at an `sp_css` style sheet record (`spCss`), never both. Keep the styles in an
// sp_css record and include that.
const customPortalCss = Record({
    $id: Now.ID['custom_portal_sp_css'],
    table: 'sp_css',
    data: {
        name: 'Custom Portal Styles',
        css: `/* Custom CSS for portal widgets */
.custom-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.custom-button {
    background-color: #337ab7;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 3px;
    cursor: pointer;
}

.custom-button:hover {
    background-color: #286090;
}`,
    },
})

export const customStyles = SPWidgetDependency({
    $id: Now.ID['custom_styles'],
    name: 'Custom Portal Styles',
    cssIncludes: [
        {
            order: 50, // lower order loads first
            include: CssInclude({
                $id: Now.ID['custom_styles_css_include'],
                name: 'Custom Portal Styles CSS',
                spCss: customPortalCss,
            }),
        },
    ],
})
```
