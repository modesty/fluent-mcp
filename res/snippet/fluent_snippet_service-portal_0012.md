# Create a Service Portal Angular Provider as a directive

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
    $id: Now.ID['loading_spinner_directive'],
    name: 'loadingSpinner',
    type: 'directive',
    script: `function() {
    return {
        restrict: 'E',
        scope: {
            show: '='
        },
        template: '<div class="loading-spinner" ng-show="show">' +
                  '<i class="fa fa-spinner fa-spin fa-3x"></i>' +
                  '</div>',
        link: function(scope, element, attrs) {
            // Add custom styling
            element.find('.loading-spinner').css({
                'text-align': 'center',
                'padding': '20px'
            });
        }
    };
}`,
})
```
