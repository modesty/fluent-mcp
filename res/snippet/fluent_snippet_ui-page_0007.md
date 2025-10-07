# Create a UI Page for custom dashboard with charts

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['custom_dashboard_page'],
    endpoint: 'x_myapp_dashboard.do',
    description: 'A custom dashboard UI page with charts and data visualization',
    category: 'homepages',
    html: `
        <?xml version="1.0" encoding="utf-8" ?>
        <j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
            <g:evaluate var="jvar_stats">
                // Server-side logic to gather statistics
                var stats = {};
                
                var incGr = new GlideAggregate('incident');
                incGr.addAggregate('COUNT');
                incGr.query();
                if (incGr.next()) {
                    stats.totalIncidents = incGr.getAggregate('COUNT');
                }
                
                var openGr = new GlideAggregate('incident');
                openGr.addQuery('active', true);
                openGr.addAggregate('COUNT');
                openGr.query();
                if (openGr.next()) {
                    stats.openIncidents = openGr.getAggregate('COUNT');
                }
                
                JSON.stringify(stats);
            </g:evaluate>
            
            <div style="padding: 20px;">
                <h1>Custom Dashboard</h1>
                <div class="row">
                    <div class="col-md-3">
                        <div class="panel panel-primary">
                            <div class="panel-heading">Total Incidents</div>
                            <div class="panel-body" style="font-size: 36px; text-align: center;">
                                <j:set var="jvar_data" value="${jvar_stats}" />
                                <script>
                                    var data = ${jvar_data};
                                    document.write(data.totalIncidents || 0);
                                </script>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="panel panel-warning">
                            <div class="panel-heading">Open Incidents</div>
                            <div class="panel-body" style="font-size: 36px; text-align: center;">
                                <script>
                                    document.write(data.openIncidents || 0);
                                </script>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <canvas id="myChart" width="400" height="200"></canvas>
                </div>
            </div>
        </j:jelly>
    `,
    clientScript: `
        // Initialize chart using Chart.js (if available)
        window.addEventListener('load', function() {
            var ctx = document.getElementById('myChart');
            if (ctx && typeof Chart !== 'undefined') {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Total', 'Open', 'Closed'],
                        datasets: [{
                            label: 'Incidents',
                            data: [data.totalIncidents || 0, data.openIncidents || 0, 
                                   (data.totalIncidents - data.openIncidents) || 0],
                            backgroundColor: ['#3498db', '#f39c12', '#27ae60']
                        }]
                    }
                });
            }
        });
    `,
})
```
