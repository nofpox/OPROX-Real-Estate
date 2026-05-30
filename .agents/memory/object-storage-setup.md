---
name: Object storage setup
description: GCS-backed object storage configuration for file uploads (proof photos)
---

## Rule
Object storage is provisioned and live. Use the presigned URL flow — never send files to the Express server directly.

**Why:** Files go directly to GCS via presigned URL; the API server only handles metadata and URL generation.

## Bucket
- Bucket ID: `replit-objstore-25f6ba7d-2591-4dc2-a25f-f526d2d673df`
- Secrets: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`

## Server files (copied from .local/skills/object-storage/templates/)
- `artifacts/api-server/src/lib/objectStorage.ts` — ObjectStorageService class
- `artifacts/api-server/src/lib/objectAcl.ts` — ACL framework
- `artifacts/api-server/src/routes/storage.ts` — Express routes

## Endpoints
- `POST /api/storage/uploads/request-url` — get presigned URL (body: name, size, contentType)
- `GET /api/storage/objects/:path` — serve stored objects
- `GET /api/storage/public-objects/:path` — serve public assets

## URL construction
- objectPath from upload = `/objects/uploads/<uuid>`
- Serving URL = `/api/storage` + objectPath (do NOT add /objects/ again)
- In frontend image src: `/api/storage${objectPath}`

## Known fix
objectStorage.ts line ~265 needed a type cast: `const body = await response.json() as { signed_url: string }` to satisfy strict TS.
