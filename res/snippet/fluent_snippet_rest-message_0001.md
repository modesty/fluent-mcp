# RestMessage API example: GET request with a declared variable substituted into a query parameter
```typescript
import { RestMessage } from '@servicenow/sdk/core'

RestMessage({
	$id: Now.ID['geocoding-msg'],
	name: 'Geocoding API',
	endpoint: 'https://geocoding-api.open-meteo.com/v1/search',
	description: 'Search for a city by name using Open-Meteo geocoding',
	functions: [
		{
			name: 'searchCity',
			httpMethod: 'GET',
			variables: [{ $id: Now.ID['geocoding-search-var-city'], name: 'city' }],
			queryParams: [
				{ $id: Now.ID['geocoding-search-param-name'], name: 'name', value: '${city}', order: 1 },
			],
		},
	],
})
```
