# Gemini Context

This file contains context for the Gemini AI assistant.

## Project Overview

This is an API documentation project that uses:

- **Node.js**: The runtime environment.
- **Docusaurus**: For the main documentation site. The source is in the `/docs`
  directory.
- **Redoc/Redoc-CLI**: To generate API documentation from an OpenAPI
  specification.
- **OpenAPI**: The specification for the API is located at
  `/spec/openapi.yaml`.

## Developer Documentation

All developer-specific documentation, including descriptions of npm scripts and
development workflows, is located in `CONTRIBUTING.md`. When making changes
that affect the development process, update that file accordingly.

## Key Commands

- `npm start`: Start the development server.
- `npm run build`: Build the entire documentation site for production.
- `npm run serve`: Serve the production build locally.
- `npm run lint`: Lints the TypeScript and JavaScript files in the `docs`
  directory.
- `npm run lint:fix`: Lints and automatically fixes any issues in TypeScript,
  JavaScript, and Markdown files.
- `npm run format`: Automatically formats TypeScript, JavaScript, and Markdown
  files using Prettier.

## CCRP Project Summary

CCRP (Coalesced Chunk Read Protocol) is a specification for a read-only API to
solve the N+1 request problem for chunked datasets in cloud object storage. The
API acts as a request coalescer, allowing a client to fetch data from many
small chunks with a single API call.

The core ideas are:

- A "byte broker" service that fetches and forwards data without processing it.
- A `HEAD` + `Range` workflow to allow for parallel downloads. The client first
  makes a `HEAD` request to get a query plan (with total size and an `ETag`),
  then makes one or more `GET` requests with `Range` headers to fetch the data.
- A flexible query language for selecting data based on dimensions.
- Support for versioning via an explicit "version pin" or an implicit "latest"
  version.
- A metadata endpoint that provides both CCRP-specific information and the
  native metadata of the underlying data format (e.g., Zarr, Iceberg).
