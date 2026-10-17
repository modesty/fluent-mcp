# Low Impact Security Checks (5)

General defense-in-depth, supply chain, packaging hygiene, and privacy compliance checks.

1. **`procrossor_integration` — Legacy Processor Used as Integration Endpoint** *(Legacy)* [P2]
   - *Check:* Check if any `sys_processor*.xml` is used as an inbound integration webhook/endpoint.
   - *Fix:* Replace the Processor with a Scripted REST API (`RestApi()`). If legacy retention is unavoidable, enforce a dedicated "Web service access only" user via system property check (`gs.getUserName() != gs.getProperty(...)`).
2. **`external_sources` — External Sources (`<iframe>`, `<frame>`, `<script src>`)** [P2]
   - *Check:* Scan HTML/UI Pages/Widgets/Workspace components for `<iframe>`, `<frame>`, `<frameset>`, `<object>`, `<embed>`, or external `<script src="...">`.
   - *Fix:* Remove `<iframe>`/`<frame>` tags (prohibited without an approved security review exception) and add Subresource Integrity (`integrity` + `crossorigin`) to any allowed external scripts.
3. **`thirdparty_lib` — Vulnerable Third-Party JS Libraries** [P2]
   - *Check:* Inspect bundled JS libraries in `package.json`, `sys_ui_script*.xml`, and `sp_dependency*.xml` for outdated versions or known CVEs (KB0010053).
   - *Fix:* Upgrade third-party libraries to patched, supported versions and remove unused vendor bundles.
4. **`push_notification_install` — Packaged Push Notification Installations** [P3]
   - *Check:* Check for any `sys_push_notif_app_install*.xml` records accidentally captured in the package.
   - *Fix:* Delete all `sys_push_notif_app_install` records from the application package.
5. **`app_privacy_policy` — Missing App Privacy Policy Module** [P3]
   - *Check:* Verify an Application Menu module (`ApplicationMenu()` / `sys_app_module*.xml`) named `'App Privacy Policy'` exists and links to the partner's privacy policy URL or a scoped privacy UI Page (KB0010212 / KB0030801).
   - *Fix:* Add an `'App Privacy Policy'` module under the app menu disclosing data collection, external transmission, storage, and third-party sharing.
