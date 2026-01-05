Here is the consolidated and formatted documentation for Quickslice v0.20.0, optimized for use by an LLM coding agent.

---

# Quickslice Documentation (v0.20.0)

> **Warning:** This project is in early development. APIs may change without notice.

## 1. Introduction

Quickslice is a quick way to spin up an **AppView** for AT Protocol applications. Import your Lexicon schemas and you get a GraphQL API with OAuth authentication, real-time sync from the network, and joins across record types without setting up a database or writing any backend code.

### The Problem

Building an AppView from scratch means writing a lot of infrastructure code:

* Jetstream connection and event handling
* Record ingestion and validation
* Database schema design and normalization
* XRPC API endpoints for querying and writing data
* OAuth session management and PDS writes
* Efficient batching when resolving related records

This adds up before you write any application logic.

### What Quickslice Does

Quickslice handles all of that automatically:

* **Connects to Jetstream** and tracks the record types defined in your Lexicons.
* **Indexes** relevant records into a database (SQLite or Postgres).
* **Generates GraphQL** queries, mutations, and subscriptions from your Lexicon definitions.
* **Handles OAuth** and writes records back to the user's PDS.
* **Enables joins** by DID, URI, or strong reference, so you can query a status and its author's profile in one request.

### When to Use It

* You want to skip the AppView boilerplate.
* You want to prototype Lexicon data structures quickly.
* You want OAuth handled for you.
* You want to ship your AppView already.

---

## 2. Tutorial: Build Statusphere

This tutorial builds **Statusphere**, an app where users share their current status as an emoji.

### Step 1: Project Setup and Importing Lexicons

Every AT Protocol app starts with Lexicons. Here's the Lexicon for a status record:

```json
{
  "lexicon": 1,
  "id": "xyz.statusphere.status",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["status", "createdAt"],
        "properties": {
          "status": {
            "type": "string",
            "minLength": 1,
            "maxGraphemes": 1,
            "maxLength": 32
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}

```

Importing this Lexicon into Quickslice triggers three automatic steps:

1. **Jetstream registration:** Quickslice tracks `xyz.statusphere.status` records from the network.
2. **Database schema:** Quickslice creates a normalized table with proper columns and indexes.
3. **GraphQL types:** Quickslice generates query, mutation, and subscription types.

### Step 2: Querying Status Records

Query indexed records with GraphQL using Relay-style connections:

```graphql
query GetStatuses {
  xyzStatusphereStatus(
    first: 20
    sortBy: [{ field: createdAt, direction: DESC }]
  ) {
    edges {
      node {
        uri
        did
        status
        createdAt
      }
    }
  }
}

```

### Step 3: Joining Profile Data

Quickslice enables joins directly from a status to its author's profile (`app.bsky.actor.profile`):

```graphql
query StatusesWithProfiles {
  xyzStatusphereStatus(first: 20) {
    edges {
      node {
        status
        createdAt
        appBskyActorProfileByDid {
          displayName
          avatar { url }
        }
      }
    }
  }
}

```

**Quickslice automatically:**

* Collects DIDs from the status records.
* Batches them into a single database query (DataLoader pattern).
* Joins profile data efficiently to avoid N+1 issues.

### Step 4: Writing a Status (Mutations)

To set a user's status, call a mutation:

```graphql
mutation CreateStatus($status: String!, $createdAt: DateTime!) {
  createXyzStatusphereStatus(
    input: { status: $status, createdAt: $createdAt }
  ) {
    uri
    status
    createdAt
  }
}

```

### Step 5: Authentication & Deployment

* **Auth:** Quickslice manages the authorization flow (redirects to PDS, exchanges tokens, manages sessions).
* **Deployment:** Deploy via Railway, generate an OAuth signing key (`goat key generate -t p256`), and upload your Lexicons.

---

## 3. Core Concepts

### Queries

Quickslice generates a GraphQL query for each Lexicon record type at the `/graphql` endpoint.

**Relay Connections:**
Queries return `edges`, `node`, `cursor`, `pageInfo`, and `totalCount`.

**Built-in Fields:**

* `uri`: AT-URI of the record.
* `cid`: Content identifier (hash).
* `did`: Author's decentralized identifier.
* `collection`: The Lexicon collection.
* `actorHandle`: Resolves author's DID to their current handle.
* `indexedAt`: When Quickslice indexed the record.

**Filter Operators:**

| Operator | Description | Example |
| --- | --- | --- |
| `eq` | Equal to | `{ status: { eq: "👍" } }` |
| `ne` | Not equal to | `{ status: { ne: "👎" } }` |
| `in` | In array | `{ status: { in: ["👍", "🎉"] } }` |
| `contains` | String contains (case-insensitive) | `{ displayName: { contains: "alice" } }` |
| `gt` | Greater than | `{ createdAt: { gt: "2025-01-01..." } }` |
| `lt` | Less than | `{ createdAt: { lt: "2025-06-01..." } }` |
| `gte` | Greater than or equal | `{ position: { gte: 1 } }` |
| `lte` | Less than or equal | `{ position: { lte: 10 } }` |
| `isNull` | Null check (Required for Refs) | `{ reply: { isNull: true } }` |

**Sorting:**

```graphql
sortBy: [{ field: createdAt, direction: DESC }]

```

### Joins

Quickslice generates three join types automatically:

1. **Forward Joins (`{fieldName}Resolved`):** Follows a URI or strong ref to another record. Returns a `Record` union type.
2. **Reverse Joins (`{SourceType}Via{FieldName}`):** Finds all records that reference a given record. Returns paginated connections.
3. **DID Joins (`{CollectionName}ByDid`):** Finds records by the same author.

**Example (Cross-Lexicon DID Join):**

```graphql
query {
  socialGrainPhoto(first: 5) {
    edges {
      node {
        alt
        appBskyActorProfileByDid {
          displayName
          avatar { url }
        }
      }
    }
  }
}

```

### Mutations

Mutations write records to the authenticated user's repository.

* **Create:** `create{CollectionName}`
* **Update:** `update{CollectionName}` (Requires `rkey`)
* **Delete:** `delete{CollectionName}` (Requires `rkey`)

**Optimistic Updates:** Quickslice indexes the record locally immediately, before Jetstream confirmation.

---

## 4. Features

### Moderation

Quickslice provides AT Protocol-compatible moderation through labels and reports.

* **Labels:** Admins can apply labels (e.g., `!takedown`, `porn`, `spam`).
* `!takedown` / `!suspend`: Automatically hides content from all queries.
* **Self-Labels:** Authors can label their own content (`com.atproto.label.defs#selfLabels`).


* **Reports:** Users can report content via `createReport`.
* **Preferences:** Users can configure visibility settings (HIDE, WARN, SHOW, IGNORE) via `viewerLabelPreferences`.

### Notifications

The `notifications` query searches all records for the authenticated user's DID.

* Returns matches where the record JSON contains your DID and was authored by someone else.
* Supports real-time updates via subscriptions.

### Viewer State

Viewer state fields show the authenticated user's relationship to records (e.g., "Have I liked this?").

* **Field Naming:** `viewer{CollectionName}Via{FieldName}`.
* **AT-URI Based:** Checks if you have a record pointing to the current record's URI.
* **DID Based:** Checks if you have a record pointing to the current record's author DID.

**Example:**

```graphql
viewerSocialGrainFavoriteViaSubject {
  uri
}

```

---

## 5. System

### Authentication

Quickslice proxies OAuth between your app and users' Personal Data Servers (PDS).

**Flow:**

1. App redirects to `/oauth/authorize`.
2. Quickslice redirects to PDS.
3. PDS returns auth code.
4. Quickslice exchanges code for tokens and manages the session.

**Headers:**

* **DPoP (Recommended/Public):** `Authorization: DPoP <access_token>` + `DPoP: <proof>`
* **Bearer (Confidential):** `Authorization: Bearer <access_token>`

**Client SDK:**
`npm install quickslice-client-js` handles PKCE, DPoP, and token refresh automatically.

### Deployment

**Recommended: Railway**

1. Deploy using the Quickslice template.
2. Generate Signing Key: `goat key generate -t p256`.
3. Set `OAUTH_SIGNING_KEY` env var.
4. Configure Domain and create Admin Account.
5. Upload Lexicons (ZIP file) and Trigger Backfill.

**Environment Variables:**

* `OAUTH_SIGNING_KEY` (Required): P-256 private key.
* `DATABASE_URL`: Path to SQLite (default) or Postgres URL.
* `SECRET_KEY_BASE`: Session encryption key.
* `EXTERNAL_BASE_URL`: Public URL for OAuth redirects.

---

## 6. Reference & Patterns

### Aggregations

Public endpoint to group and count records.

* **Format:** `{collectionName}Aggregated`
* **Args:** `groupBy`, `where`, `orderBy`, `limit`.
* **Date Truncation:** Use `interval: HOUR|DAY|WEEK|MONTH` in `groupBy`.

```graphql
query {
  fmTealAlphaFeedPlayAggregated(
    groupBy: [{ field: playedTime, interval: MONTH }]
    where: { actorHandle: { eq: "user.bsky.social" } }
    orderBy: { count: DESC }
  ) {
    playedTime
    count
  }
}

```

### Subscriptions

Real-time updates via WebSocket (`graphql-ws`).

* **Events:** `{collection}Created`, `{collection}Updated`, `{collection}Deleted`.
* Supports joins and field selection.

### Blobs

1. **Upload:** `mutation { uploadBlob(...) }` returns a `ref` (CID).
2. **Use:** Pass the `ref`, `mimeType`, and `size` into record mutations.
3. **Retrieve:** Use the `url` field with presets (`avatar`, `banner`, `feed_thumbnail`, `feed_fullsize`).

### Variables

GraphQL variables are supported for all standard scalar types.

* Use `$` prefix in query definition (e.g., `$status: String!`).
* Pass variables JSON in the request body.

### MCP (Model Context Protocol)

Quickslice exposes an MCP server at `{EXTERNAL_BASE_URL}/mcp`.

* **Tools:** `list_lexicons`, `get_lexicon`, `list_queries`, `execute_query`, `introspect_schema`.
* **Setup (Claude):** `claude mcp add --transport http quickslice https://your-instance.network/mcp`

### Common Patterns

* **Profile Lookups:** Always use `appBskyActorProfileByDid`.
* **Feed with Nested Data:** Combine `appBskyActorProfileByDid` (author) with `viewerLikeViaSubject` (state) and `likeViaSubject { totalCount }` (stats).
* **Client-Side Filtering:** Fetch `viewerLabelPreferences` once, then apply logic to hide/blur content based on `record.labels`.
