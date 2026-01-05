#!/bin/bash

# 1. Create the directory structure
# We need your folders PLUS the com/atproto/repo folder for the dependency
echo "📂 Creating directory structure..."
mkdir -p lexicons/blue/flashes/actor
mkdir -p lexicons/blue/flashes/feed
mkdir -p lexicons/com/atproto/repo

# 2. Write the JSON files

# --- DEPENDENCY: com.atproto.repo.strongRef ---
echo "📝 Writing com.atproto.repo.strongRef.json..."
cat <<EOF > lexicons/com/atproto/repo/strongRef.json
{
  "lexicon": 1,
  "id": "com.atproto.repo.strongRef",
  "defs": {
    "main": {
      "type": "object",
      "required": ["uri", "cid"],
      "properties": {
        "uri": { "type": "string", "format": "at-uri" },
        "cid": { "type": "string", "format": "cid" }
      }
    }
  }
}
EOF

# --- YOUR LEXICONS ---

echo "📝 Writing blue.flashes.actor.portfolio.json..."
cat <<EOF > lexicons/blue/flashes/actor/portfolio.json
{
  "lexicon": 1,
  "id": "blue.flashes.actor.portfolio",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["subject", "createdAt", "sortOrder"],
        "properties": {
          "subject": {
            "type": "ref",
            "ref": "com.atproto.repo.strongRef"
          },
          "sortOrder": {
            "type": "integer",
            "minimum": 0
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
EOF

echo "📝 Writing blue.flashes.actor.profile.json..."
cat <<EOF > lexicons/blue/flashes/actor/profile.json
{
  "lexicon": 1,
  "id": "blue.flashes.actor.profile",
  "defs": {
    "main": {
      "type": "record",
      "key": "literal:self",
      "record": {
        "type": "object",
        "required": ["createdAt"],
        "properties": {
          "showFeeds": { "type": "boolean", "default": true },
          "showLikes": { "type": "boolean", "default": false },
          "showLists": { "type": "boolean", "default": false },
          "showMedia": { "type": "boolean", "default": true },
          "enablePortfolio": { "type": "boolean", "default": true },
          "allowRawDownload": { "type": "boolean", "default": false },
          "portfolioLayout": { 
            "type": "string",
            "knownValues": ["grid", "list"],
            "default": "grid"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
EOF

echo "📝 Writing blue.flashes.feed.post.json..."
cat <<EOF > lexicons/blue/flashes/feed/post.json
{
  "lexicon": 1,
  "id": "blue.flashes.feed.post",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["createdAt"],
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
EOF

# 3. Zip the 'lexicons' folder
echo "📦 Zipping lexicons..."
zip -r -X flashes_lexicons_v2.zip lexicons

# 4. Cleanup
echo "🧹 Cleaning up temporary folders..."
rm -rf lexicons

echo "✅ Done! Upload 'flashes_lexicons_v2.zip' to Quickslice."
