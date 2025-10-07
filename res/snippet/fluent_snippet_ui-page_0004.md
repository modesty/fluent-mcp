# Create a UI Page with client-side JavaScript

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['interactive_calculator_page'],
    endpoint: 'x_myapp_calculator.do',
    description: 'A UI page with interactive client-side JavaScript functionality',
    category: 'general',
    html: `
        <div style="padding: 20px;">
            <h2>Simple Calculator</h2>
            <div style="margin-bottom: 20px;">
                <input type="number" id="num1" placeholder="Enter first number" style="width: 150px;">
                <select id="operator" style="width: 80px;">
                    <option value="+">+</option>
                    <option value="-">-</option>
                    <option value="*">×</option>
                    <option value="/">÷</option>
                </select>
                <input type="number" id="num2" placeholder="Enter second number" style="width: 150px;">
                <button onclick="calculate()">Calculate</button>
            </div>
            <div id="result" style="font-size: 18px; font-weight: bold;"></div>
        </div>
    `,
    clientScript: `
        function calculate() {
            var num1 = parseFloat(document.getElementById('num1').value);
            var num2 = parseFloat(document.getElementById('num2').value);
            var operator = document.getElementById('operator').value;
            var resultDiv = document.getElementById('result');
            
            if (isNaN(num1) || isNaN(num2)) {
                resultDiv.innerHTML = '<span style="color: red;">Please enter valid numbers</span>';
                return;
            }
            
            var result;
            switch(operator) {
                case '+':
                    result = num1 + num2;
                    break;
                case '-':
                    result = num1 - num2;
                    break;
                case '*':
                    result = num1 * num2;
                    break;
                case '/':
                    if (num2 === 0) {
                        resultDiv.innerHTML = '<span style="color: red;">Cannot divide by zero</span>';
                        return;
                    }
                    result = num1 / num2;
                    break;
            }
            
            resultDiv.innerHTML = 'Result: ' + result;
        }
    `,
})
```
