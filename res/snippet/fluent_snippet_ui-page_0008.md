# Create a UI Page using AngularJS for dynamic content

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['angular_todo_page'],
    endpoint: 'x_myapp_todo.do',
    description: 'A UI page using AngularJS for interactive todo list',
    category: 'general',
    html: `
        <div ng-app="todoApp" ng-controller="TodoController" style="padding: 20px;">
            <h2>My Todo List</h2>
            <div style="margin-bottom: 20px;">
                <input type="text" ng-model="newTodo" placeholder="Enter new task" 
                       style="padding: 8px; width: 300px;">
                <button ng-click="addTodo()" style="padding: 8px 15px; margin-left: 10px;">
                    Add Task
                </button>
            </div>
            <ul style="list-style: none; padding: 0;">
                <li ng-repeat="todo in todos" style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <input type="checkbox" ng-model="todo.completed" 
                           ng-change="updateTodo(todo)">
                    <span ng-style="{'text-decoration': todo.completed ? 'line-through' : 'none'}">
                        {{todo.text}}
                    </span>
                    <button ng-click="deleteTodo($index)" 
                            style="float: right; color: red; border: none; background: none; cursor: pointer;">
                        Delete
                    </button>
                </li>
            </ul>
            <div style="margin-top: 20px;">
                <strong>Total: {{todos.length}}</strong> | 
                <strong>Completed: {{getCompletedCount()}}</strong> | 
                <strong>Remaining: {{getRemainingCount()}}</strong>
            </div>
        </div>
    `,
    clientScript: `
        var app = angular.module('todoApp', []);
        
        app.controller('TodoController', function($scope) {
            $scope.todos = [];
            $scope.newTodo = '';
            
            $scope.addTodo = function() {
                if ($scope.newTodo.trim()) {
                    $scope.todos.push({
                        text: $scope.newTodo,
                        completed: false
                    });
                    $scope.newTodo = '';
                }
            };
            
            $scope.deleteTodo = function(index) {
                $scope.todos.splice(index, 1);
            };
            
            $scope.updateTodo = function(todo) {
                // Update logic (e.g., save to server)
            };
            
            $scope.getCompletedCount = function() {
                return $scope.todos.filter(function(todo) {
                    return todo.completed;
                }).length;
            };
            
            $scope.getRemainingCount = function() {
                return $scope.todos.length - $scope.getCompletedCount();
            };
        });
    `,
})
```
