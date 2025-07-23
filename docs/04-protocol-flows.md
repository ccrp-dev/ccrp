# Protocol Flows

This section illustrates common CCRP interaction patterns with detailed HTTP
request/response examples.

## Simple Query Flow

The simplest CCRP pattern is a direct GET request for data. This is suitable
for smaller queries where parallel downloads aren't needed.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  [chunk bytes]                            |
  |<------------------------------------------|
```

### Example: Single Variable Time Series

#### Request

```http
GET /dataset/ocean-temp/data?time[gte]=2024-01-01&time[lt]=2024-01-08&lat=35&lon=-120&variable=sst HTTP/1.1
Host: ccrp.example.com
Accept: multipart/mixed
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=chunk-boundary
Content-Length: 524288
ETag: "a4f2c9d7b3e8"
CCRP-Resolved-Version: v20240115
Cache-Control: private, max-age=3600

--chunk-boundary
Content-ID: chunk-0
Content-Type: application/octet-stream
Content-Length: 524288

[binary chunk data]
--chunk-boundary--
```

### When to Use

- Queries returning < 100MB of data
- Interactive exploratory analysis
- Simple scripting scenarios
- When network bandwidth isn't a constraint

## Progressive Download Flow

For large datasets or limited-bandwidth scenarios, retrieve data in sequential
chunks using Range requests. This enables progress tracking and resumable
downloads without parallel connections.

### Flow Sequence

```
Client                                    CCRP Service
  |                                            |
  |  GET /dataset/{id}/data?{query}            |
  |  Range: bytes=0-10485759                   |
  |------------------------------------------->|
  |                                            |
  |  206 Partial Content                       |
  |  Content-Range: bytes 0-10485759/52428800  |
  |<-------------------------------------------|
  |                                            |
  |  GET /dataset/{id}/data?{query}            |
  |  Range: bytes=10485760-20971519            |
  |------------------------------------------->|
  |                                            |
  |  206 Partial Content                       |
  |  Content-Range: bytes 10485760-20971519/...|
  |<-------------------------------------------|
  |                                            |
  |  (continues until complete)                |
```

### Example: Bandwidth-Limited Progressive Download

#### Request 1: First 10MB

```http
GET /dataset/high-res-imagery/data?time=2024-01-15&band=B04 HTTP/1.1
Host: ccrp.example.com
Range: bytes=0-10485759
```

```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-10485759/52428800
Content-Length: 10485760
Content-Type: multipart/mixed; boundary=chunk-boundary
ETag: "d4e9f3c8a2b7"

--chunk-boundary
Content-ID: chunk-0
Content-Type: application/octet-stream

[partial binary chunk data]
--chunk-boundary--
```

#### Request 2: Next 10MB

```http
GET /dataset/high-res-imagery/data?time=2024-01-15&band=B04 HTTP/1.1
Host: ccrp.example.com
Range: bytes=10485760-20971519
```

```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 10485760-20971519/52428800
Content-Length: 10485760
Content-Type: multipart/mixed; boundary=chunk-boundary
ETag: "d4e9f3c8a2b7"

--chunk-boundary
Content-ID: chunk-1
Content-Type: application/octet-stream

[partial binary chunk data]
--chunk-boundary--
```

**Note:** The ETag identifies a specific query plan. For unversioned datasets,
any modification to the underlying chunks invalidates existing query plans.
Using If-Match with an invalidated ETag returns 412 Precondition Failed,
requiring a new query.

**Note:** Query parameter order does not affect the result. The same query
parameters in any order must produce the same query plan and ETag. For example,
`?time=2024-01-15&band=B04` and `?band=B04&time=2024-01-15` are equivalent.

### When to Use

- Limited bandwidth connections
- Memory-constrained clients
- Progress bar implementations
- Resumable downloads after interruption
- Streaming processing scenarios

## Parallel Download Flow

For large queries, use the HEAD + Range pattern to enable parallel downloads
and progress tracking.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  HEAD /dataset/{id}/data?{query}          |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  Content-Length: 5368709120               |
  |  ETag: "b8a4f2c9d7e3"                     |
  |<------------------------------------------|
  |                                           |
  |  (Client decides on parallelism)          |
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |  Range: bytes=0-1073741823                |
  |  If-Match: "b8a4f2c9d7e3"                 |
  |------------------------------------------>|
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |  Range: bytes=1073741824-2147483647       |
  |  If-Match: "b8a4f2c9d7e3"                 |
  |------------------------------------------>|
  |                                           |
  |  206 Partial Content                      |
  |  Content-Range: bytes 0-1073741823/...    |
  |<------------------------------------------|
  |                                           |
  |  206 Partial Content                      |
  |  Content-Range: bytes 1073741824-.../...  |
  |<------------------------------------------|
```

**Note:** The Content-Length returned by HEAD represents the total size of ALL
chunks that match your query, not individual chunk sizes.
This is the total number of bytes you'll need to retrieve.

### Example: Large Spatial Query

#### Step 1: Plan the query

```http
HEAD /dataset/satellite-imagery/data?time=2024-01-15&lat[gte]=30&lat[lt]=45&lon[gte]=-125&lon[lt]=-110 HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Length: 5368709120
Accept-Ranges: bytes
ETag: "c7d3e9f4a2b8"
CCRP-Resolved-Version: v20240115
```

#### Step 2: Parallel retrieval (showing one of four parallel requests)

```http
GET /dataset/satellite-imagery/data?time=2024-01-15&lat[gte]=30&lat[lt]=45&lon[gte]=-125&lon[lt]=-110 HTTP/1.1
Host: ccrp.example.com
Range: bytes=0-1342177279
If-Match: "c7d3e9f4a2b8"
```

```http
HTTP/1.1 206 Partial Content
Content-Length: 1342177280
Content-Range: bytes 0-1342177279/5368709120
Content-Type: multipart/mixed; boundary=chunk-boundary

[multipart response with multiple chunks]
```

### When to Use

- Large queries (> 100MB)
- Need for progress tracking
- Maximizing download throughput
- Resilient downloads with retry capability

## Version Resolution Flow

This flow shows how implicit version requests are resolved to explicit versions
for consistency.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |  (no version specified)                   |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  CCRP-Resolved-Version: v20240120         |
  |<------------------------------------------|
  |                                           |
  |  (Client uses version for next request)   |
  |                                           |
  |  GET /dataset/{id}/data?{query2}          |
  |  &version=v20240120                       |
  |------------------------------------------>|
```

### Example: Multi-Request Session

#### Request 1: Initial query without version

```http
GET /dataset/weather/data?time=2024-01-15&variable=temperature HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=chunk-boundary
Content-Length: 1048576
CCRP-Resolved-Version: v20240115-1430
ETag: "d9e4f3c8a2b7"

--chunk-boundary
Content-ID: chunk-0
Content-Type: application/octet-stream

[binary chunk data]
--chunk-boundary--
```

#### Request 2: Follow-up query with explicit version

```http
GET /dataset/weather/data?time=2024-01-15&variable=humidity&version=v20240115-1430 HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=chunk-boundary
Content-Length: 1048576
CCRP-Resolved-Version: v20240115-1430
ETag: "e1f5a3d9b8c4"

--chunk-boundary
Content-ID: chunk-0
Content-Type: application/octet-stream

[binary chunk data]
--chunk-boundary--
```

### When to Use

- Multi-step analysis workflows
- Ensuring consistency across related queries
- Reproducible data retrieval
- Collaborative scenarios where version matters

## Multipart Response Flow

CCRP returns chunks with clear boundaries and identifiers using the multipart/mixed
format.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |  Accept: multipart/mixed                  |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  Content-Type: multipart/mixed            |
  |  [chunk1][boundary][chunk2][boundary]...  |
  |<------------------------------------------|
```

### Example: Multipart Request

```http
GET /dataset/sensor-array/data?time=2024-01-15&station=A001,A002,A003 HTTP/1.1
Host: ccrp.example.com
Accept: multipart/mixed
```

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=chunk-boundary
Content-Length: 3145728

--chunk-boundary
Content-ID: chunk-2024-01-15-A001
Content-Type: application/octet-stream
Content-Length: 1048576

[binary data for station A001]
--chunk-boundary
Content-ID: chunk-2024-01-15-A002
Content-Type: application/octet-stream
Content-Length: 1048576

[binary data for station A002]
--chunk-boundary
Content-ID: chunk-2024-01-15-A003
Content-Type: application/octet-stream
Content-Length: 1048576

[binary data for station A003]
--chunk-boundary--
```

### When to Use

- Need to identify individual chunks in the response
- Processing chunks separately as they arrive
- Debugging or inspection of chunk boundaries
- When chunk metadata is important
## Error Recovery Flow

This flow demonstrates handling expired ETags and other recoverable errors.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  HEAD /dataset/{id}/data?{query}          |
  |------------------------------------------>|
  |  200 OK, ETag: "old123"                   |
  |<------------------------------------------|
  |                                           |
  |  (Time passes, cache expires)             |
  |                                           |
  |  GET /dataset/{id}/data?{query}           |
  |  If-Match: "old123"                       |
  |------------------------------------------>|
  |                                           |
  |  412 Precondition Failed                  |
  |<------------------------------------------|
  |                                           |
  |  HEAD /dataset/{id}/data?{query}          |
  |------------------------------------------>|
  |  200 OK, ETag: "new456"                   |
  |<------------------------------------------|
```

### Example: Expired Query Plan

#### Initial HEAD request

```http
HEAD /dataset/realtime-sensors/data?time[gte]=2024-01-15T12:00:00Z&time[lt]=2024-01-15T13:00:00Z HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Length: 10485760
ETag: "f3a9c8d4e2b7"
```

#### Later GET request with expired ETag

```http
GET /dataset/realtime-sensors/data?time[gte]=2024-01-15T12:00:00Z&time[lt]=2024-01-15T13:00:00Z HTTP/1.1
Host: ccrp.example.com
If-Match: "f3a9c8d4e2b7"
Range: bytes=0-1048575
```

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/json

{
  "error": "Query plan has expired",
  "details": "Please initiate a new HEAD request"
}
```

#### Recovery with new HEAD request

```http
HEAD /dataset/realtime-sensors/data?time[gte]=2024-01-15T12:00:00Z&time[lt]=2024-01-15T13:00:00Z HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Length: 10485760
ETag: "a7b3d9f5c1e8"
```

### When to Handle

- Long-running download sessions
- Cached query plans with short TTLs
- Network interruption recovery
- Robust client implementations

## Dataset Discovery Flow

This flow shows navigating from the API root to retrieving data.

### Flow Sequence

```
Client                                   CCRP Service
  |                                           |
  |  GET /                                    |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  (landing page with links)                |
  |<------------------------------------------|
  |                                           |
  |  (follows datasets link)                  |
  |  GET /dataset                             |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  (dataset list)                           |
  |<------------------------------------------|
  |                                           |
  |  (follows specific dataset link)          |
  |  GET /dataset/{id}                        |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  (dataset metadata)                       |
  |<------------------------------------------|
  |                                           |
  |  (follows data link)                      |
  |  GET /dataset/{id}/data?{query}           |
  |------------------------------------------>|
  |                                           |
  |  200 OK                                   |
  |  [chunk bytes]                            |
  |<------------------------------------------|
```

### Example: Complete Discovery

#### Step 1: Landing page

```http
GET / HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "title": "Climate Data CCRP Service",
  "links": [
    {
      "href": "/dataset",
      "rel": "https://ccrp.io/spec/v1/rel/datasets",
      "type": "application/json",
      "title": "Available datasets"
    }
  ]
}
```

#### Step 2: Dataset list

```http
GET /dataset HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "datasets": [
    {
      "id": "global-temperature",
      "title": "Global Temperature Analysis",
      "links": [
        {
          "href": "/dataset/global-temperature",
          "rel": "self",
          "type": "application/json"
        }
      ]
    }
  ]
}
```

#### Step 3: Dataset metadata

```http
GET /dataset/global-temperature HTTP/1.1
Host: ccrp.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "global-temperature",
  "format": "zarr",
  "links": [
    {
      "href": "/dataset/global-temperature/data",
      "rel": "https://ccrp.io/spec/v1/rel/data",
      "type": "multipart/mixed"
    }
  ],
  "native_metadata": {
    "zarr_format": 3,
    ...
  }
}
```

#### Step 4: Data retrieval

```http
GET /dataset/global-temperature/data?time=2024-01-15&lat[gte]=-10&lat[lt]=10 HTTP/1.1
Host: ccrp.example.com
```

### When to Use

- Building dynamic clients
- First-time API exploration
- Generic CCRP client libraries
- Service capability discovery
