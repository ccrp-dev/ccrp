# Coalesced Chunk Retrieval Protocol (CCRP)

This repo contains the documentation for the specification of the Coalesced
Chunk Retrieval Protocol (CCRP).

> [!WARNING]
> CCRP is currently under initial active development, and is being worked with
> significant contributions from LLM-based coding agents. It has not undergone
> a full review at this time, so be aware the documentation and specification
> may contain significant errors or gaps.

## What is CCRP?

CCRP is the Coalesced Chunk Retrieval Protocol. The protocol defines a way to
make a single API call to fetch multiple data chunks from cloud storage at
once, eliminating the network latency that cripples big data analysis.

### Why CCRP?

Cloud object storage like S3 is great for storing huge datasets, but it's
terrible at reading many small pieces at once. A data scientist wanting a
specific slice of a large dataset might need 10,000 tiny data chunks, leading
to 10,000 separate, high-latency HTTP GET requests from their laptop.

This forces data producers into a bad compromise: use huge chunks that are
inefficient to query, or small chunks that are too slow to access.

### How?

CCRP is proposed as a new, standard API primitive that acts as a request
coalescer. The client makes one single, batch request specifying all the chunks
they need using some combination of dimensional filtering and coordinate
slicing, as appropriate. The service, running inside the cloud next to the
backing data block store, grabs the bytes for all matching chunks from the
block store with near-zero latency and streams the combined data back to the
client in a single response.

Think of this like GraphQL, but for chunked datasets in cloud storage.

GraphQL originated from a version of the same problem with REST APIs. To get a
user, their posts, and their comments, you have to make three separate API
calls: `/users/1`, `/users/1/posts`, and `/users/1/comments`.

GraphQL solved this by letting clients send one single query describing
everything they need, and they get it all back in one round trip.

CCRP does for data chunks what GraphQL did for web resources. It replaces
thousands of slow, chatty requests with a single, efficient one. It offloads
chunk byte range calculation from the client side, and allows for read
coalescing where it would otherwise be impossible.

### What makes CCRP different?

Other solutions have proposed similar advantages. Things like OPeNDAP and
TileDB come to mind, but CCRP is different. Consider the following:

* **It's a lightweight “byte broker”, not a compute engine.**  The API's only
  job is to find and forward bytes. It doesn't decompress, filter, or process
  the data. This makes it incredibly fast, scalable, and simple.
* **It decouples the logical data model from the physical layout.**  Users can
  request data in a way that makes sense for their analysis (e.g., "give me
  this time series"). The API translates this into an optimal fetch plan for
  how the data is *actually* stored (array data from Zarr chunks, tabular data
  from partitioned Parquet files, etc.).
* **It should be a native cloud primitive.**  This isn't just a proxy in front
  of an object store–though the reference implementation will likely be
  something to this effect. For maximum performance, this should be a parallel,
  first-class interface into the cloud provider's internal block store, just
  like the S3 API is today, to eliminate extra network hops and get around the
  inadequate (for this use-case) object model. Look at [the S3 Vectors
  product](https://aws.amazon.com/blogs/aws/introducing-amazon-s3-vectors-first-cloud-storage-with-native-vector-support-at-scale/)
  for an example of AWS already doing something like this in a different
      domain.
* **The goal is an open standard, not a product.**  This is a missing piece of
  global data infrastructure. The goal is to create a compelling specification
  that all cloud providers can and will implement, making data access better
  for everyone.

## Contributing

For development and contribution guidelines, including how to set up the
project and run scripts, please see [CONTRIBUTING.md](../CONTRIBUTING.md).
