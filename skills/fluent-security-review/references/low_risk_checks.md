# Low / Process Risk Security Checks

Security check with low technical risk for ServiceNow scoped applications, enforcing Store privacy disclosure compliance.

1. **`app_privacy_policy` — App Privacy Policy** [P3] (Impact: Low)
   - *Check:* Verify that an Application Menu module (`ApplicationMenu()` in `.now.ts` or `sys_app_module*.xml`) named `'App Privacy Policy'` exists within the application package and links either to the partner's privacy policy URL or to a scoped UI Page detailing the application's data handling practices (KB0010212 / KB0030801).
   - *Fix:* Create an `'App Privacy Policy'` module under the application menu disclosing whether data is transferred, processed, or stored outside ServiceNow, what data is collected, how it is used, whether it is shared with third parties, and how it is transferred, stored, and secured.
