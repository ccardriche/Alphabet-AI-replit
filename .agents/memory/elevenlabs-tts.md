---
name: ElevenLabs TTS connector
description: Correct way to call ElevenLabs via @replit/connectors-sdk in this project
---

## Pattern
```typescript
const { ReplitConnectors } = await import("@replit/connectors-sdk");
const sdk = new ReplitConnectors();
const conns = await sdk.listConnections({ connector_names: "elevenlabs" });
const settings = conns?.[0]?.settings as Record<string, string> | undefined;
const apiKey = settings?.api_key;
// Then use fetch directly to https://api.elevenlabs.io/v1/...
```

**Why:** The SDK's `listConnections` takes `{ connector_names: string }` (not an array, not a plain string). The `settings` type is `{}` in TS so needs a cast. The proxy method does not exist on the SDK default export — only on ReplitConnectors instances.
