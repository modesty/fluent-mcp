
# Now.attach

`Now.attach()` attaches an image file to a record at build time. It reads the file, compresses it, and creates the corresponding `sys_attachment` and `sys_attachment_doc` records in the XML output.

## Syntax

```typescript
Now.attach(path: ImagePath): Image
```

The file path is **relative to the `.now.ts` file** that contains the call.

## Supported image formats

| Extension | Format |
|-----------|--------|
| `.jpg`, `.jpeg` | JPEG |
| `.png` | PNG |
| `.gif` | GIF |
| `.bmp` | Bitmap |
| `.ico` | Icon |
| `.svg` | SVG |

Both lowercase and uppercase extensions are accepted (e.g., `.PNG`, `.JPG`).

## How it works

1. The SDK reads the image file from disk
2. Compresses the file data using gzip
3. Splits the compressed data into base64-encoded chunks
4. Generates a SHA-256 hash for deduplication
5. Creates `sys_attachment` and `sys_attachment_doc` records linked to the parent record

During transform (XML → Fluent), the SDK extracts the attachment data back into an image file and generates a `Now.attach()` call.

## Examples

### Portal with a logo

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['my-portal'],
    table: 'sp_portal',
    data: {
        title: 'My Portal',
        icon: Now.attach('../../assets/portal-icon.png'),
    },
})
```

### Reusing the same image across multiple fields

Store the attachment in a variable to avoid reading and compressing the file multiple times:

```typescript
import { Record } from '@servicenow/sdk/core'

const logo = Now.attach('../../assets/company-logo.jpg')

Record({
    $id: Now.ID['portal-a'],
    table: 'sp_portal',
    data: {
        title: 'Portal A',
        icon: logo,
        logo: logo,
    },
})
```

### Sharing an image across multiple records

```typescript
import { Record } from '@servicenow/sdk/core'

const icon = Now.attach('../../assets/app-icon.png')

Record({
    $id: Now.ID['portal-one'],
    table: 'sp_portal',
    data: {
        title: 'Portal One',
        icon: icon,
    },
})

Record({
    $id: Now.ID['portal-two'],
    table: 'sp_portal',
    data: {
        title: 'Portal Two',
        icon: icon,
    },
})
```

## File organization

A common pattern is to keep image assets in an `assets/` directory at the project root:

```
src/
├── fluent/
│   ├── portal.now.ts        ← Now.attach('../../assets/logo.png')
│   └── generated/
│       └── keys.ts
├── assets/
│   ├── logo.png
│   ├── favicon.ico
│   └── banner.jpg
└── now.config.json
```

