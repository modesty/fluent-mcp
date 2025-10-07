# Create a UI Page with form submission and processing script

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['feedback_form_page'],
    endpoint: 'x_myapp_feedback.do',
    description: 'A UI page with form submission and server-side processing',
    category: 'general',
    html: `
        <div style="padding: 20px; max-width: 600px;">
            <h2>Submit Feedback</h2>
            <form method="POST" id="feedbackForm">
                <div style="margin-bottom: 15px;">
                    <label for="name">Your Name:</label><br/>
                    <input type="text" name="name" id="name" required style="width: 100%; padding: 8px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="email">Email:</label><br/>
                    <input type="email" name="email" id="email" required style="width: 100%; padding: 8px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="feedback">Feedback:</label><br/>
                    <textarea name="feedback" id="feedback" rows="5" required style="width: 100%; padding: 8px;"></textarea>
                </div>
                <button type="submit" style="padding: 10px 20px; background: #0066cc; color: white; border: none; cursor: pointer;">
                    Submit Feedback
                </button>
            </form>
        </div>
    `,
    processingScript: `
        // Get form parameters
        var name = g_request.getParameter('name');
        var email = g_request.getParameter('email');
        var feedback = g_request.getParameter('feedback');
        
        if (name && email && feedback) {
            // Create a record in a feedback table (example)
            var gr = new GlideRecord('x_myapp_feedback');
            gr.initialize();
            gr.setValue('name', name);
            gr.setValue('email', email);
            gr.setValue('comments', feedback);
            gr.insert();
            
            gs.addInfoMessage('Thank you for your feedback!');
        }
    `,
})
```
