# Create a UI Page with Jelly template for dynamic content

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['dynamic_user_info_page'],
    endpoint: 'x_myapp_user_info.do',
    description: 'A UI page using Jelly to display dynamic user information',
    category: 'general',
    html: `
        <?xml version="1.0" encoding="utf-8" ?>
        <j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
            <g:evaluate var="jvar_user">
                var user = gs.getUser();
                user;
            </g:evaluate>
            
            <div style="padding: 20px;">
                <h2>User Information</h2>
                <table class="table table-striped">
                    <tr>
                        <td><strong>User Name:</strong></td>
                        <td>${jvar_user.getName()}</td>
                    </tr>
                    <tr>
                        <td><strong>User ID:</strong></td>
                        <td>${jvar_user.getUserID()}</td>
                    </tr>
                    <tr>
                        <td><strong>Email:</strong></td>
                        <td>${jvar_user.getEmail()}</td>
                    </tr>
                    <tr>
                        <td><strong>First Name:</strong></td>
                        <td>${jvar_user.getFirstName()}</td>
                    </tr>
                    <tr>
                        <td><strong>Last Name:</strong></td>
                        <td>${jvar_user.getLastName()}</td>
                    </tr>
                </table>
            </div>
        </j:jelly>
    `,
})
```
