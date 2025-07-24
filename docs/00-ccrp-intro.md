# The Coalesced Chunk Retrieval Protocol

## The Problem

Cloud-native data formats like Zarr and Apache Iceberg excel at storing massive
datasets as collections of chunks or files. This design enables parallel
writes, partial reads, and efficient updates. However, accessing many small
chunks efficiently remains a challenge.

Consider a typical scenario: analyzing a subset of a large dataset stored in
S3. Whether it's array data in Zarr or tabular data in Iceberg, your query
might touch hundreds or thousands of individual objects. Even from compute in
the same availability zone, each request involves:

- TCP connection overhead (or HTTP/2 stream setup)
- TLS negotiation (for HTTPS)
- S3 request processing
- 5-50ms per request, optimistically

For 1,000 chunks, that's still 5-50 seconds of cumulative latency. From outside
the cloud, this gets much worse.

This latency pressure forces data producers to use larger chunks than ideal.
Instead of 1MB chunks that align well with queries, they use 100MB chunks to
keep request counts manageable. The result: massive over-reading and poor query
performance.

## How CCRP Helps

The Coalesced Chunk Retrieval Protocol (CCRP) provides a simple service that
accepts chunk queries and returns the requested chunks. Think of this like GraphQL, but for chunked datasets in cloud storage.

GraphQL originated from a version of the same problem with REST APIs. To get a
user, their posts, and their comments, you have to make three separate API
calls: `/users/1`, `/users/1/posts`, and `/users/1/comments`.

GraphQL solved this by letting clients send one single query describing
everything they need, and they get it all back in one round trip.

CCRP does for data chunks what GraphQL did for web resources. It replaces
thousands of slow, chatty requests with a single, efficient one. It offloads
chunk byte range calculation from the client side, and allows for read
coalescing where it would otherwise be impossible. Instead of making N
requests for N chunks, you make one request:

```
GET /dataset/my-data/data?time[gte]=2024-01&time[lt]=2024-02&variable=temperature
```

CCRP:

1. Translates your query into the required chunks
2. Fetches them in parallel from the object store
3. Returns them as a multipart response with clear boundaries

That's it. No magic, no complex processing—just efficient request coalescing
where it matters.

## What CCRP Is (and Isn't)

CCRP is:

- ✅ A **request coalescer** for chunked data
- ✅ A **byte broker** - returns raw, unprocessed chunks
- ✅ **A linking target** - enables direct references to data slices from
  catalogs like STAC
- ✅ **Simple by design** - one request in, bytes out

CCRP is NOT:

- ❌ A compute engine - no filtering, transformation, or processing
- ❌ A caching layer - though implementations may cache metadata
- ❌ A new format - your data remains unchanged
- ❌ A complete analytics solution - it just solves the access problem

Currently, CCRP targets:

- **Zarr** arrays (with or without Icechunk versioning)
- **Parquet** tables (with or without Iceberg versioning)

Other chunked formats could be supported by future implementations.

## Why This Matters

When chunk access is efficient, data producers can optimize chunk sizes for
their data rather than for network limitations. This means:

- Better alignment between chunk boundaries and common query patterns
- Reduced data transfer and computation from over-reading
- Freedom to chunk along multiple dimensions
- Simpler data production pipelines

Additionally, CCRP enables new patterns:

- **Direct linking**: A STAC catalog can link to
  `https://ccrp.example.com/dataset/temperature/data?time[gte]=2024-01-15&lat[gte]=30&lat[lt]=40&lon[gte]=-120&lon[lt]=-110`
- **Reproducible references**: Version-pinned URLs that always return the same
  data
- **Simplified client code**: No need to understand chunking schemes

CCRP aims to make cloud-stored chunked data as easy and performant to access as
local data.

## Spec Status

CCRP is under active development.

The basic structure is in place, but it is likely that gaps and errors exist.
Everything is up for discussion, nothing is set in stone. Please help make CCRP
better by opening issues and/or PRs for any problems or improvments. Don't
hesitate to start a discussion to ask a question. This is intended to be a
community project, so please feel free to contribute.

With enough interest we can get a true working group formed around this project
to drive direction, refinement, and ecosystem implementation.
