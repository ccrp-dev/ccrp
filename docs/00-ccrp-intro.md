---
sidebar_position: 2
---

# CCRP: Coalesced Chunk Read Protocol

## The Problem: The N+1 Query Problem in the Cloud

Cloud object storage (like Amazon S3, Google Cloud Storage, or Azure Blob
Storage) is incredibly powerful for storing vast amounts of data. It's scalable,
durable, and cost-effective. However, it has a significant drawback when it
comes to performance for certain access patterns.

Object stores are optimized for reading and writing large, single objects. They
perform poorly when you need to read thousands or millions of small objects.
Each request for a small object incurs a fixed latency cost for the network
round trip and the service overhead. When you need to read 10,000 small files,
you pay that cost 10,000 times. This is often called the "N+1 query problem."

This is a major issue for modern, chunked data formats like Zarr, which are
designed for parallel and subsetted access to massive N-dimensional arrays. A
data scientist on their laptop or a web application trying to visualize a slice
of a large dataset might need to fetch thousands of individual chunks. The
cumulative latency of these requests can make the application unusably slow.

This forces data producers into a difficult compromise:

- **Use large chunks:** This reduces the number of requests but is inefficient
  for small, unaligned queries, as you have to download much more data than you
  need.
- **Use small chunks:** This is efficient for storage and querying but is
  crippled by the high latency of object storage.

## The Solution: A Request Coalescing Gateway

**CCRP (Coalesced Chunk Read Protocol)** is a specification for a simple,
high-performance, read-only API that solves this problem. It acts as a "request
coalescer" or a "byte broker" that sits between the client and the object store.

Instead of the client making thousands of requests to the object store, it makes
a single request to the CCRP service. This request describes the logical slice
of data the client needs. The CCRP service, running in the same cloud
environment as the data, then performs the following steps:

1. **Parses the request:** It understands the logical query from the client.
2. **Plans the query:** It translates the logical query into a list of
   physical object chunks that need to be fetched.
3. **Fetches in parallel:** It initiates thousands of parallel requests to the
   object store internally, where latency is negligible.
4. **Streams the response:** It streams the raw, concatenated bytes of the
   requested chunks back to the client in a single, efficient HTTP response.

Critically, a CCRP service **does not process the data**. It does not decompress,
re-chunk, or interpret the bytes. It is a lightweight gateway that forwards bytes,
making it highly scalable and computationally inexpensive.

This approach provides the best of both worlds: data can be stored in small,
efficient chunks, and clients can access it quickly and efficiently without being
penalized by network latency.
