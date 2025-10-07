# Create a UI Page with AJAX calls using GlideAjax

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['ajax_data_loader_page'],
    endpoint: 'x_myapp_ajax_loader.do',
    description: 'A UI page demonstrating AJAX calls to load data dynamically',
    category: 'general',
    html: `
        <div style="padding: 20px;">
            <h2>Load Data with AJAX</h2>
            <button onclick="loadData()">Load Incident Data</button>
            <div id="loading" style="display: none; margin-top: 10px;">
                <img src="images/loading_anim4.gif" alt="Loading..."/> Loading...
            </div>
            <div id="dataContainer" style="margin-top: 20px;"></div>
        </div>
    `,
    clientScript: `
        function loadData() {
            var loading = document.getElementById('loading');
            var container = document.getElementById('dataContainer');
            
            // Show loading indicator
            loading.style.display = 'block';
            container.innerHTML = '';
            
            // Make AJAX call using GlideAjax
            var ga = new GlideAjax('MyScriptInclude'); // Replace with your Script Include name
            ga.addParam('sysparm_name', 'getIncidentCount');
            ga.getXMLAnswer(function(answer) {
                loading.style.display = 'none';
                
                if (answer) {
                    var data = JSON.parse(answer);
                    var html = '<div class="alert alert-success">';
                    html += '<h4>Incident Statistics</h4>';
                    html += '<p>Total Incidents: ' + data.total + '</p>';
                    html += '<p>Open Incidents: ' + data.open + '</p>';
                    html += '<p>Closed Incidents: ' + data.closed + '</p>';
                    html += '</div>';
                    container.innerHTML = html;
                } else {
                    container.innerHTML = '<div class="alert alert-danger">Failed to load data</div>';
                }
            });
        }
    `,
})
```
