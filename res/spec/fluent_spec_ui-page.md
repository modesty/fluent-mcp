# **Context**: UI Page API spec: define custom UI Pages [sys_ui_page] for custom user interfaces and landing pages. UI Pages provide flexible HTML/XHTML interfaces that can include static content, dynamic Jelly templates, or custom scripts. Use the dedicated `UiPage` construct for cleaner, type-safe UI Page definitions.

```typescript
import { UiPage } from '@servicenow/sdk/core';

// Creates a new UI Page (`sys_ui_page`) using the UiPage construct
UiPage({
    $id: '', // string | guid, mandatory - Unique identifier for the UI Page
    
    // Core properties
    endpoint: '', // string, mandatory - Endpoint for the page, must end with '.do'
                  // Format: `<scope_name>_<ui_page_name>.do`
                  // Example: 'x_myapp_custom_page.do'
    
    description: '', // string, optional - Description about the UI page's purpose and functionality
    
    // Page type configuration
    direct: false, // boolean, optional - If true, creates a direct UI page that loads without ServiceNow UI wrapper
                   // Direct pages bypass standard ServiceNow chrome/navigation
                   // Default: false (page loads with standard UI wrapper)
    
    // Content definition
    html: '', // string, optional - Define what is rendered when the page is shown
              // Can contain:
              // - Static XHTML/HTML markup
              // - Dynamically generated content using Jelly tags
              // - Calls to UI Macros and Script Includes
              // - AngularJS directives and templates
              // Example: '<div>Hello World</div>' or Jelly template
    
    // Categorization
    category: 'general', // string, optional - Category for organizing UI pages
                         // Valid values: 'general' | 'homepages' | 'htmleditor' | 'kb' | 'cms' | 'catalog'
                         // Default: 'general'
    
    // Client-side scripting
    clientScript: '', // string, optional - Client-side JavaScript that runs in the browser
                      // Used for:
                      // - Event handlers for buttons and form elements
                      // - DOM manipulation and DHTML features
                      // - Setting focus to fields
                      // - Client-side validation
                      // - AJAX calls and async operations
                      // Note: Runs after the page is loaded
    
    // Server-side scripting
    processingScript: '', // string | function, optional - Script that runs on the server when the page is submitted
                          // Executes on form submission or page POST
                          // Used for:
                          // - Form data processing
                          // - Database operations
                          // - Server-side validation
                          // - Business logic execution
                          // Can be a string or function
                          // Example as string: 'gs.addInfoMessage("Processed");'
                          // Example as function: function() { gs.addInfoMessage("Processed"); }
}): UiPage; // returns a UiPage object
```
