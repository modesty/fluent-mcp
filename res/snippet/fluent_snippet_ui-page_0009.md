# Create a UI Page with UI Macro integration

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['ui_macro_demo_page'],
    endpoint: 'x_myapp_macro_demo.do',
    description: 'A UI page demonstrating UI Macro integration for reusable components',
    category: 'general',
    html: `
        <?xml version="1.0" encoding="utf-8" ?>
        <j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
            <div style="padding: 20px;">
                <h2>UI Macro Integration Demo</h2>
                
                <!-- Using standard ServiceNow UI Macros -->
                <g2:ui_reference table="incident" name="number" id="incident_ref"/>
                
                <hr/>
                
                <!-- Custom content sections -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h3 class="panel-title">Reference Field Example</h3>
                            </div>
                            <div class="panel-body">
                                <p>Select an incident using the reference field above.</p>
                                <button onclick="getSelectedIncident()">Get Selected Value</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div id="selectedInfo"></div>
                    </div>
                </div>
            </div>
        </j:jelly>
    `,
    clientScript: `
        function getSelectedIncident() {
            var incidentRef = document.getElementById('incident_ref');
            if (incidentRef && incidentRef.value) {
                document.getElementById('selectedInfo').innerHTML = 
                    '<div class="alert alert-info">Selected Incident: ' + incidentRef.value + '</div>';
            } else {
                document.getElementById('selectedInfo').innerHTML = 
                    '<div class="alert alert-warning">No incident selected</div>';
            }
        }
    `,
})
```
