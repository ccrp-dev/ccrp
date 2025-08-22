# Frequently Asked Questions

Have a question that is not answered here? [Start a discussion on
GitHub!](https://github.com/ccrp-dev/ccrp/discussions)

## Can't we just make client-side optimizations instead of implementing a new API?

A major problem with client-side coalescing is that many object storage API
implementations do not allow multi-range `GET` requests as required to support a
single request for multiple disjoint chunk byte ranges. Could support for such
a thing be added to object store APIs? Certainly!

But then you still cannot coalesce across multiple objects. See [Why can't I
use multi-range `GET` requests instead of
CCRP?](#why-cant-i-use-multi-range-get-requests-instead-of-ccrp)

## Why can't I use multi-range `GET` requests instead of CCRP?

If your object storage provider support multi-range `GET` requests, that's great!
That does provide a way to make a single request for multiple chunks with
disjoint byte ranges within a single object. Except some major object store API
implementations do not support this feature.

The real problem with multi-range `GET` requests is that they don't work across
objects. Many valid access patterns for many datasets will require queries
spanning multiple objects. The idea here is that having the abstraction of
objects between the dataset bytes and the client requesting them is artificial:
the logical dataset structure is what clients what to query, but then they have
to consider the physical data layout and organization to be able to request
what they want.

In other words, multi-range `GET` requests can be a means of making object chunk
access more efficient, but do not solve the root problem. Something else is
required to form a general solution to the issue, ideally something that
removes the erroneous file/object abstraction, hence CCRP.

## Object store clients can use parallelism for speed, but isn't CCRP a single stream?

It's true that using parallel sessions to download data is more performant
because it allows for better throughput saturation via the decoupling of TCP
congestion windows. Naively it would seem like CCRP is a step backwards because
the same data that would be accessed via many parallel requests from an object
store API can be accessed with only a single request using CCRP.

CCRP recognizes that querying data and trying to use parallelism for efficiency
are two orthogonal problems that cannot be separated with the current data
access model. Thus querying with CCRP is done via a single request, but
downloading that data is not limited to the same request as used for querying.
CCRP does support a single request to query and download, but alternately it
supports using a `HEAD` request to plan a query and see how large the response
will be. Then mutliple request for partial content ranges can be used to
retrieve the response in whatever sizes the client deems are most efficient.

## Isn't this just a proxy in front of S3? Won't that decrease efficiency?

Initially, yes, a CCRP proof of concept will likely just be a proxy in front of
an object store and be dependent on the same object API and the consequent
performance limitations. If this proxy is run in the same cloud provider region
as the data behind it, it could make data access more efficient for clients
running outside that cloud provider region. But for clients in the same region
it would add latency.

Except a key end goal is to not have CCRP simply be a proxy. Ideally CCRP is
implemented as a managed service by cloud providers with direct access to the
bytes of chunked data stored in the provider's object store. That way data
producers can organize and manage their data via a standard object store using
files as they do now, but client access through CCRP can go directly to the
chunk bytes and not through the object store API.

## How is this different than something like OPeNDAP?

OPeNDAP is not just a byte broker, it doesn't simply stream bytes from a
backing disk or block store to the client. Rather, OPeNDAP will read data off
disk then do some fairly heavy compute as needed to rechunk the data to match
the client's request. This process involves uncompressing each chunk read from
the backing store, splitting that chunk up or merging it with other chunks, and
recompressing the output. The indexing and resolution what bytes to read is
generally the same in CCRP, but CCRP does not perform any processing on the
resolved chunk bytes, they are merely forwarded to the client.

Consequently, CCRP client query coordinates must be aligned to chunk
boundaries. Relative to OPeNDAP this requirement is a limitation, but one that
is intentional to keep CCRP simple, performant, and scalable.
