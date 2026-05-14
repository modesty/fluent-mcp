atf.reporting.reportVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  report: get_sys_id('sys_report', ''), // sys_id | Record&lt;'sys_report'&gt;;
  assert: 'can_view_report', // 'can_view_report' | 'cannot_view_report';
});

atf.responsiveDashboard.responsiveDashboardSharing({
  $id: Now.ID[''], // string | guid, mandatory
  dashboard: get_sys_id('pa_dashboards', ''), // sys_id | Record&lt;'pa_dashboards'&gt;;
  assert: 'can_share_dashboard',// 'can_share_dashboard' | 'cannot_share_dashboard';
});

atf.responsiveDashboard.responsiveDashboardVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  dashboard: get_sys_id('pa_dashboards', ''), // string | Record&lt;'pa_dashboards'&gt;;
  assert: 'dashboard_is_visible', // 'dashboard_is_visible' | 'dashboard_is_not_visible';
});
