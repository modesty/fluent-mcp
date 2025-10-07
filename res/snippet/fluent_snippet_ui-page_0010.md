# Create a UI Page for knowledge base article display

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['kb_article_viewer_page'],
    endpoint: 'x_myapp_kb_viewer.do',
    description: 'A UI page for displaying knowledge base articles with search functionality',
    category: 'kb',
    html: `
        <?xml version="1.0" encoding="utf-8" ?>
        <j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
            <g:evaluate var="jvar_article_sys_id">
                g_request.getParameter('article') || '';
            </g:evaluate>
            
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <input type="text" id="searchBox" placeholder="Search knowledge base..." 
                           style="width: 400px; padding: 10px;">
                    <button onclick="searchArticles()" style="padding: 10px 20px;">Search</button>
                </div>
                
                <j:if test="${!empty(jvar_article_sys_id)}">
                    <g:evaluate var="jvar_article">
                        var gr = new GlideRecord('kb_knowledge');
                        if (gr.get('${jvar_article_sys_id}')) {
                            var article = {
                                number: gr.getValue('number'),
                                short_description: gr.getValue('short_description'),
                                text: gr.getValue('text'),
                                author: gr.getDisplayValue('author'),
                                created: gr.getDisplayValue('sys_created_on')
                            };
                            JSON.stringify(article);
                        } else {
                            '{}';
                        }
                    </g:evaluate>
                    
                    <div class="panel panel-default">
                        <div class="panel-heading">
                            <h3 class="panel-title">
                                <script>
                                    var article = ${jvar_article};
                                    document.write(article.number + ': ' + article.short_description);
                                </script>
                            </h3>
                        </div>
                        <div class="panel-body">
                            <script>
                                document.write(article.text || 'No content available');
                            </script>
                        </div>
                        <div class="panel-footer">
                            <small>
                                <script>
                                    document.write('Author: ' + article.author + ' | Created: ' + article.created);
                                </script>
                            </small>
                        </div>
                    </div>
                </j:if>
                
                <j:if test="${empty(jvar_article_sys_id)}">
                    <div class="alert alert-info">
                        Please search for an article or select one from the list.
                    </div>
                </j:if>
            </div>
        </j:jelly>
    `,
    clientScript: `
        function searchArticles() {
            var searchTerm = document.getElementById('searchBox').value;
            if (searchTerm) {
                // Navigate to search results or use AJAX to load results
                window.location.href = 'x_myapp_kb_search.do?query=' + encodeURIComponent(searchTerm);
            }
        }
        
        // Add enter key support for search
        document.addEventListener('DOMContentLoaded', function() {
            var searchBox = document.getElementById('searchBox');
            if (searchBox) {
                searchBox.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchArticles();
                    }
                });
            }
        });
    `,
})
```
