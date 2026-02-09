# ImportSet API example: import set with transform scripts (onBefore, onAfter lifecycle hooks)
```typescript
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
	$id: Now.ID['asset_import_transform'],
	name: 'Asset Import Transform',
	targetTable: 'alm_hardware',
	sourceTable: 'u_asset_staging',
	active: true,
	order: 100,
	runBusinessRules: false,
	enforceMandatoryFields: 'allFields',
	fields: {
		asset_tag: {
			sourceField: 'u_asset_tag',
			coalesce: true,
		},
		display_name: 'u_name',
		serial_number: 'u_serial',
		model_category: {
			sourceField: 'u_model_category',
			choiceAction: 'ignore',
		},
		install_date: {
			sourceField: 'u_install_date',
			dateFormat: 'MM-dd-yyyy',
		},
	},
	scripts: [
		{
			$id: Now.ID['asset_validate_before'],
			active: true,
			order: 100,
			when: 'onBefore',
			script: `(function runTransformScript(source, map, log, target) {
	// Validate asset tag format before transform
	var assetTag = source.u_asset_tag.toString();
	if (!assetTag.startsWith('AST-')) {
		log.warn('Invalid asset tag format: ' + assetTag);
		ignore = true;
	}
})(source, map, log, target);`,
		},
		{
			$id: Now.ID['asset_log_after'],
			active: true,
			order: 100,
			when: 'onAfter',
			script: `(function runTransformScript(source, map, log, target) {
	// Log successful import
	log.info('Successfully imported asset: ' + target.asset_tag);
})(source, map, log, target);`,
		},
		{
			$id: Now.ID['asset_summary_complete'],
			active: true,
			order: 100,
			when: 'onComplete',
			script: `(function runTransformScript(source, map, log, target) {
	// Log completion summary
	log.info('Asset import transform completed');
})(source, map, log, target);`,
		},
	],
})
```
