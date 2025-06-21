#**Context:** This chunk is part of the ServiceNow Automated Test Framework (ATF) documentation and focuses on testing and verifying application navigation. It includes APIs to test the visibility of modules and application menus in the ServiceNow platform's left navigation bar and provides steps to navigate specific modules programmatically, enhancing automated UI testing capabilities.
```typescript
// Verifies visibility of modules in the left navigation bar.
atf.applicationNavigator.moduleVisibility({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    navigator: 'polaris', // 'ui15' | 'polaris' | 'ui16'
    assertNotVisible: 'at_least_modules_not_visible', // 'only_modules_not_visible' | 'at_least_modules_not_visible'
    notVisibleModules: [get_sys_id('sys_app_module', '')], // array of sys_id | Record&lt;'sys_app_module'&gt;
    assertVisible: 'at_least_modules_visible', // 'at_least_modules_visible' | 'only_modules_visible'
    visibleModules: [get_sys_id('sys_app_module', '')], // array of sys_id of | Record&lt;'sys_app_module'&gt;
}): void;

// Navigates to a module, as if a user had clicked on it
atf.applicationNavigator.navigateToModule({
    $id: Now.ID[''], // string | guid, mandatory
    module: get_sys_id('sys_app_module', '') // sys_id | Record&lt;'sys_app_module'&gt;
}): void;

// Verifies visibility of application menus in the left navigation bar
atf.applicationNavigator.applicationMenuVisibility({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    navigator: 'polaris', // 'ui15' | 'polaris' | 'ui16'
    visible: [get_sys_id('sys_app_application', '')], // array of sys_id | Record&lt;'sys_app_application'&gt;
    assertVisible: 'at_least_applications_visible', // 'at_least_applications_visible' | 'only_applications_visible'
    notVisible: [get_sys_id('sys_app_application', '')], // array of sys_id | Record&lt;'sys_app_application'&gt;
    assertNotVisible: 'at_least_applications_not_visible', // 'at_least_applications_not_visible' | 'only_applications_not_visible'
}): void;
```