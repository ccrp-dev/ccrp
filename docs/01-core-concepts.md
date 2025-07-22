# Core Concepts

CCRP is built on several fundamental concepts that guide its design and
implementation. Understanding these concepts is essential for both implementing
and using CCRP effectively.

## RESTful Design and Discoverability

CCRP follows REST principles with an emphasis on discoverability. Every
response includes links to related resources, allowing clients to navigate the
API without hard-coded URLs.

### Self-Describing Resources

Starting from the root endpoint, clients can discover:

- Available datasets
- Supported capabilities (conformance classes)
- Related endpoints and their purposes

```json
{
  "conformsTo": [
    "https://ccrp.io/spec/v1/conformance/core",
    "https://ccrp.io/spec/v1/conformance/range-requests"
  ],
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

### HATEOAS (Hypermedia as the Engine of Application State)

Clients navigate through the API by following links, not by constructing URLs.
Each dataset includes a link to its data endpoint:

```json
{
  "id": "temperature-global",
  "links": [
    {
      "href": "/dataset/temperature-global/data",
      "rel": "https://ccrp.io/spec/v1/rel/data",
      "type": "application/octet-stream"
    }
  ]
}
```

## Conformance-Based Architecture

CCRP uses conformance classes to advertise capabilities. This allows
implementations to start simple and add features incrementally.

### Conformance Classes

Each conformance class is identified by a URI and defines a set of requirements:

- **Core**: Basic query and retrieval capabilities
- **Standard**: Recommended extensions for enhanced functionality
- **Advanced**: Optional extensions for complex use cases

### Capability Discovery

Clients can determine server capabilities programmatically:

```json
GET /conformance

{
  "conformsTo": [
    "https://ccrp.io/spec/v1/conformance/core",
    "https://ccrp.io/spec/v1/conformance/range-requests"
  ]
}
```

This allows clients to adapt their behavior based on available features.

## Coordinate-Based Queries

CCRP operates on logical coordinates, not physical storage details. This
abstraction is key to its flexibility.

### Logical vs Physical

When you query:

```
GET /dataset/ocean-temp/data?time=2024-01:2024-02&depth=0:100
```

You're using:

- **Logical coordinates**: January 2024, depths 0-100m
- Not **physical indices**: chunks [15,0,0] through [17,10,5]

CCRP handles the translation.

### Chunk Boundary Expansion

CCRP returns complete chunks that overlap your query region. If chunks contain
depths 0-50m and 50-100m, and you request depth=25:75, you'll receive both
complete chunks (0-100m of data).

This behavior is predictable and simple:

- The server expands to chunk boundaries
- The client extracts the exact subset needed
- No partial chunk complexity

### Half-Open Intervals

Following Python/NumPy conventions, ranges use half-open intervals `[start, end)`:

- `time=2024-01:2024-02` includes January but not February
- `lat=30:40` includes 30 but not 40

This provides consistency with scientific Python ecosystems.

## Version Pinning and Reproducibility

For datasets that use versioning systems like Iceberg or Icechunk, CCRP
provides mechanisms for reproducible access.

### Optional Version Specification

For datasets with version control, queries can specify a version:

```
GET /dataset/weather/data?time=2024-01&version=v20240315
```

Or use the latest:

```
GET /dataset/weather/data?time=2024-01
```

Note: Version support is only available for datasets using transactional
storage layers like Apache Iceberg or Icechunk for Zarr.

### Version Resolution

When no version is specified for a versioned dataset, CCRP:

1. Resolves to the latest version
2. Returns the resolved version in a header
3. Allows subsequent requests to use this version for consistency

```
GET /dataset/weather/data?time=2024-01
→ CCRP-Resolved-Version: v20240320
```

This enables both convenience and reproducibility.

## Dataset Abstraction

CCRP provides a uniform interface across different storage formats while
preserving format-specific metadata.

### Format Transparency

The same query pattern works for:

- Zarr arrays with dimensions
- Iceberg tables with columns
- Future formats that organize data in chunks

### Native Metadata Preservation

Each dataset returns its complete native metadata:

- Zarr: Full `zarr.json` with array shapes, dtypes, codecs
- Iceberg: Complete `metadata.json` with schema and partitioning

This allows format-aware clients to interpret the data correctly while keeping
CCRP format-agnostic.

## Two-Phase Protocol

CCRP supports both simple and sophisticated access patterns through its
two-phase protocol.

### Simple Access

For basic use cases, a single GET request suffices:

```
GET /dataset/temperature/data?lat=30:40&lon=-120:-110
→ 200 OK [data bytes]
```

### Advanced Access with Planning

For large queries or parallel downloads:

1. **HEAD request** returns the total size and an ETag:

```
HEAD /dataset/temperature/data?lat=30:40&lon=-120:-110
→ Content-Length: 5368709120
→ ETag: "abc123"
```

1. **Multiple GET requests** with byte ranges:

```
GET /dataset/temperature/data?lat=30:40&lon=-120:-110
Range: bytes=0-1073741823
If-Match: "abc123"
```

This enables:

- Parallel downloads for maximum throughput
- Progress tracking
- Resumable transfers
- Consistent multi-request sessions

The ETag ensures all requests reference the same query plan, preventing
inconsistencies.

These concepts work together to create a simple yet powerful protocol for
chunked data access. By hiding complexity while preserving flexibility, CCRP
makes cloud data as accessible as local files.
