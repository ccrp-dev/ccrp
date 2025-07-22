# API Reference

This section provides detailed information about CCRP link relations,
endpoints, request/response formats, headers, and conformance classes.

## Link Relations

CCRP is a RESTful API that uses link relations for navigation. Clients should
follow links rather than constructing URLs.

### IANA-Registered Relations

| Relation | Description | Used In |
|----------|-------------|---------|
| `self` | The current resource | All resources |
| `next` | Next page of results | Paginated responses |
| `conformance` | Conformance declaration | Landing page |
| `service-desc` | OpenAPI service description | Landing page |

### CCRP-Specific Relations

| Relation | Description | Target |
| -------- | ----------- | ------ |
| `https://ccrp.io/spec/v1/rel/datasets` | Collection of available datasets | Dataset list |
| `https://ccrp.io/spec/v1/rel/data` | Data query and retrieval endpoint | Data endpoint for a dataset |

Following these relations ensures your client remains compatible even if URL
structures change:

```json
{
  "links": [
    {
      "href": "/dataset/temperature/data",
      "rel": "https://ccrp.io/spec/v1/rel/data",
      "type": "application/octet-stream",
      "title": "Query and retrieve data"
    }
  ]
}
```

## Endpoints Overview

While clients should use link relations for navigation, the typical URL
structure is:

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | API landing page with service information and conformance |
| `/conformance` | GET | Machine-readable conformance declaration |
| `/dataset` | GET | List available datasets (paginated) |
| `/dataset/{dataset_id}` | GET | Get metadata for a specific dataset |
| `/dataset/{dataset_id}/data` | HEAD | Plan a query and get size/ETag |
| `/dataset/{dataset_id}/data` | GET | Retrieve actual data bytes |

## Landing Page

### GET /

Returns service information and entry points for API navigation.

**Response:**

```json
{
  "title": "Example CCRP Service",
  "description": "CCRP service providing efficient access to chunked climate data",
  "attribution": "Data provided by NOAA",
  "conformsTo": [
    "https://ccrp.io/spec/v1/conformance/core",
    "https://ccrp.io/spec/v1/conformance/range-requests"
  ],
  "links": [
    {
      "href": "/",
      "rel": "self",
      "type": "application/json"
    },
    {
      "href": "/dataset",
      "rel": "https://ccrp.io/spec/v1/rel/datasets",
      "type": "application/json",
      "title": "Available datasets"
    },
    {
      "href": "/conformance",
      "rel": "conformance",
      "type": "application/json",
      "title": "Conformance declaration"
    }
  ]
}
```

**Error Responses:**

- None expected for this endpoint

## Conformance

### GET /conformance

Returns the list of conformance classes supported by this implementation.

**Response:**

```json
{
  "conformsTo": [
    "https://ccrp.io/spec/v1/conformance/core",
    "https://ccrp.io/spec/v1/conformance/range-requests",
    "https://ccrp.io/spec/v1/conformance/multipart-responses"
  ]
}
```

**Error Responses:**

- None expected for this endpoint

## Dataset Discovery

### GET /dataset

Returns a paginated list of available datasets.

**Query Parameters:**

- `limit` (integer, 1-1000, default: 100): Maximum datasets per page
- `token` (string): Pagination token from previous response

**Response:**

```json
{
  "datasets": [
    {
      "id": "noaa-goes-17-L2",
      "title": "NOAA GOES-17 Level 2 Data",
      "description": "Geostationary satellite imagery",
      "format": "zarr",
      "links": [
        {
          "href": "/dataset/noaa-goes-17-L2",
          "rel": "self",
          "type": "application/json"
        }
      ]
    }
  ],
  "links": [
    {
      "href": "/dataset",
      "rel": "self",
      "type": "application/json"
    },
    {
      "href": "/dataset?token=eyJsYXN0X2lkIjoibm9hYS1nb2VzLTE3LUwyIn0",
      "rel": "next",
      "type": "application/json"
    }
  ],
  "nextToken": "eyJsYXN0X2lkIjoibm9hYS1nb2VzLTE3LUwyIn0"
}
```

**Error Responses:**

- **400 Bad Request**: Invalid query parameters (e.g., limit > 1000)

## Dataset Metadata

### `GET /dataset/{dataset_id}`

Returns complete metadata for a dataset, including native format metadata.

**Response:**

```json
{
  "id": "noaa-goes-17-L2",
  "title": "NOAA GOES-17 Level 2 Data",
  "description": "Geostationary satellite imagery and derived products",
  "format": "zarr",
  "latest_version": "commit-f4a2b1c8",
  "native_metadata": {
    "zarr_format": 3,
    "node_type": "group",
    "attributes": {},
    "children": {
      "temperature": {
        "node_type": "array",
        "shape": [8760, 180, 360],
        "chunk_grid": {
          "type": "regular",
          "chunk_shape": [24, 30, 30]
        },
        "data_type": "float32",
        "codecs": [...]
      }
    }
  },
  "links": [
    {
      "href": "/dataset/noaa-goes-17-L2",
      "rel": "self",
      "type": "application/json"
    },
    {
      "href": "/dataset/noaa-goes-17-L2/data",
      "rel": "https://ccrp.io/spec/v1/rel/data",
      "type": "application/octet-stream",
      "title": "Query and retrieve data"
    }
  ]
}
```

**Fields:**

- `format`: Indicates the metadata format type (`zarr`, `iceberg`, etc.)
- `latest_version`: Current version if dataset supports versioning, null
  otherwise
- `native_metadata`: Complete metadata in the format's native structure

**Error Responses:**

- **404 Not Found**: Dataset does not exist

## Data Query and Retrieval

### `HEAD /dataset/{dataset_id}/data`

Plans a query and returns metadata needed for subsequent retrieval.

**Query Parameters:**

- `version` (string, optional): Specific version to query
- Additional dimension-based parameters using [CCRP query syntax](./03-query-syntax.md)

**Version Parameter Behavior:**

- If specified and dataset supports versioning: Uses the specified version
- If specified but dataset doesn't support versioning: Ignored
- If specified but version doesn't exist: Returns 404
- If not specified and dataset supports versioning: Uses latest version

**Response Headers:**

- `Content-Length`: Total size in bytes
- `ETag`: Unique identifier for this query plan
- `Accept-Ranges: bytes`: Indicates range request support
- `CCRP-Resolved-Version`: Version used (only present for versioned datasets)

**Example:**

```
HEAD /dataset/temperature/data?time[gte]=2024-01&time[lt]=2024-02&lat[gte]=30&lat[lt]=40
```

**Error Responses:**

- **400 Bad Request**: Invalid query syntax or parameters
- **404 Not Found**: Dataset or specified version not found
- **413 Payload Too Large**: Query would return too much data

### `GET /dataset/{dataset_id}/data`

Retrieves actual data bytes for a query.

**Query Parameters:**

- Same as HEAD request

**Request Headers:**

- `Range` (optional): Byte range for partial requests
- `If-Match` (optional): ETag for cache validation
- `Accept` (optional): Preferred response format
  - `application/octet-stream` (default): Concatenated bytes
  - `multipart/mixed`: Separate parts with chunk identifiers (requires
    multipart conformance)

**Content Negotiation:**

- If Accept header requests unsupported format: Returns 406 Not Acceptable
- Content negotiation is only available with multipart-responses conformance
  class

**Response:**

- **200 OK**: Complete data returned
- **206 Partial Content**: Range request fulfilled
- **400 Bad Request**: Invalid query parameters
- **404 Not Found**: Dataset or version not found
- **406 Not Acceptable**: Requested format not supported
- **412 Precondition Failed**: ETag mismatch
- **413 Payload Too Large**: Query would return too much data

## Headers

### Request Headers

| Header | Used In | Description |
|--------|---------|-------------|
| `Range` | GET data | Request specific byte range |
| `If-Match` | GET data | Validate against ETag |
| `Accept` | GET data | Request response format |

### Response Headers

| Header | Used In | Description |
|--------|---------|-------------|
| `Content-Length` | HEAD, GET data | Size in bytes |
| `Content-Range` | GET data (206) | Byte range returned |
| `ETag` | HEAD, GET data | Query plan identifier |
| `Accept-Ranges` | HEAD data | Indicates "bytes" support |
| `CCRP-Resolved-Version` | HEAD, GET data | Version used for query |

## Error Responses

All errors return a JSON object with the following structure:

```json
{
  "error": "Brief error message",
  "details": "Detailed explanation",
  "dimension": "Specific dimension if applicable"
}
```

Common error scenarios:

- **400**: Invalid query syntax, unknown operators, invalid ranges
- **404**: Dataset not found, version not found
- **406**: Requested content type not available
- **412**: Query plan expired, ETag mismatch
- **413**: Query complexity or size limits exceeded

## Conformance Classes

### Core Conformance

**URI**: `https://ccrp.io/spec/v1/conformance/core`

Required functionality:

- All endpoints listed above
- Basic query operators (equality, ranges, sets)
- Simple concatenated response format
- Dataset versioning (if applicable)

### Standard Conformance Classes

#### Range Requests

**URI**: `https://ccrp.io/spec/v1/conformance/range-requests`

- Support for HTTP Range headers
- 206 Partial Content responses
- Multi-part parallel downloads

#### ETag Validationx

**URI**: `https://ccrp.io/spec/v1/conformance/etag-validation`

- Support for If-Match headers
- 412 Precondition Failed responses
- Query plan caching and validation

#### Multipart Responses

**URI**: `https://ccrp.io/spec/v1/conformance/multipart-responses`

- Support for `multipart/mixed` responses
- Chunk identification via Content-ID
- Content negotiation via Accept header
- 406 Not Acceptable for unsupported formats

### Advanced Conformance Classes

#### Complex Queries

**URI**: `https://ccrp.io/spec/v1/conformance/complex-queries`

- POST `/dataset/{dataset_id}/data` endpoint
- JSON-based query expressions
- Cross-dimension correlations

Additional conformance classes may be defined for specific features or
optimizations.
