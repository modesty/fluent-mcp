#**Context:** This chunk is part of the broader ATF (Automated Test Framework) documentation for ServiceNow, focusing specifically on APIs that validate the visibility and sharing permissions of reports and responsive dashboards. These APIs are essential for ensuring that reports and dashboards can be viewed and shared appropriately within the ServiceNow environment. This is particularly relevant when testing access control and user permissions related to reporting functionalities. The chunk is situated within the context of automated testing steps that verify UI and functional aspects of ServiceNow applications.
```typescript
atf.reporting.reportVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  report: get_sys_id('sys_report', ''), // sys_id | Record&lt;'sys_report'&gt;;
  assert: 'can_view_report', // 'can_view_report' | 'cannot_view_report';
}): void;

atf.responsiveDashboard.responsiveDashboardSharing({
  $id: Now.ID[''], // string | guid, mandatory
  dashboard: get_sys_id('pa_dashboards', ''), // sys_id | Record&lt;'pa_dashboards'&gt;;
  assert: 'can_share_dashboard',// 'can_share_dashboard' | 'cannot_share_dashboard';
}): void;

atf.responsiveDashboard.responsiveDashboardVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  dashboard: get_sys_id('pa_dashboards', ''), // string | Record&lt;'pa_dashboards'&gt;;
  assert: 'dashboard_is_visible', // 'dashboard_is_visible' | 'dashboard_is_not_visible';
}): void;

```