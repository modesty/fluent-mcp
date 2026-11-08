# Two catalog client scripts: onLoad to initialize field visibility, and onSubmit to validate that a future date is selected before submission

```typescript
import { CatalogClientScript, CatalogItem } from '@servicenow/sdk/core'
import { DateVariable, MultiLineTextVariable, SelectBoxVariable, SingleLineTextVariable } from '@servicenow/sdk/core'

// Catalog item the scripts attach to (fulfilled by an existing flow; look sys_ids up with now-sdk query)
export const laptopRequestItem = CatalogItem({
    $id: Now.ID['laptop_request_catalog_item'],
    name: 'Laptop Request',
    shortDescription: 'Request a new laptop for business use',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'], // Service Catalog
    flow: '523da512c611228900811a37c97c2014', // sys_hub_flow that fulfills the request
    variables: {
        employee_type: SelectBoxVariable({
            question: 'Employee Type',
            order: 100,
            mandatory: true,
            choices: {
                employee: { label: 'Employee', sequence: 1 },
                contractor: { label: 'Contractor', sequence: 2 },
            },
        }),
        corporate_card_number: SingleLineTextVariable({ question: 'Corporate Card Number', order: 200 }),
        justification: MultiLineTextVariable({ question: 'Business Justification', order: 300, mandatory: true }),
        required_by: DateVariable({ question: 'Required By Date', order: 400 }),
    },
})

// onLoad: Pre-populate the requester's name and hide the corporate card field by default
export const laptopFormOnLoad = CatalogClientScript({
    $id: Now.ID['laptop_form_on_load_script'],
    name: 'Laptop Form - Initialize Fields',
    type: 'onLoad',
    catalogItem: laptopRequestItem,
    appliesTo: 'item',
    appliesOnCatalogItemView: true,
    active: true,
    uiType: 'desktop',
    script: `
function onLoad() {
    // Hide corporate card field initially
    g_form.setDisplay('corporate_card_number', false);

    // Set default justification placeholder text
    if (!g_form.getValue('justification')) {
        g_form.setValue('justification', '');
    }
}
    `,
})

// onChange: Show/hide corporate card field based on employee type selection
export const laptopEmployeeTypeOnChange = CatalogClientScript({
    $id: Now.ID['laptop_employee_type_on_change'],
    name: 'Laptop Form - Show Corporate Card for Employees',
    type: 'onChange',
    variableName: laptopRequestItem.variables.employee_type,
    catalogItem: laptopRequestItem,
    appliesTo: 'item',
    appliesOnCatalogItemView: true,
    active: true,
    uiType: 'desktop',
    script: `
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) return;
    var isEmployee = (newValue === 'employee');
    g_form.setDisplay('corporate_card_number', isEmployee);
    g_form.setMandatory('corporate_card_number', isEmployee);
}
    `,
})

// onSubmit: Validate that the required-by date is at least 5 business days in the future
export const laptopDateValidationOnSubmit = CatalogClientScript({
    $id: Now.ID['laptop_date_validation_on_submit'],
    name: 'Laptop Form - Validate Required By Date',
    type: 'onSubmit',
    catalogItem: laptopRequestItem,
    appliesTo: 'item',
    appliesOnCatalogItemView: true,
    appliesOnRequestedItems: true,
    active: true,
    uiType: 'all',
    vaSupported: true,
    script: `
function onSubmit() {
    var reqDate = g_form.getValue('required_by');
    if (!reqDate) return true;

    var today = new Date();
    var selectedDate = new Date(reqDate);
    var diffDays = Math.round((selectedDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 5) {
        alert('Required By date must be at least 5 business days from today. Please update your date selection.');
        return false;
    }
    return true;
}
    `,
})
```
