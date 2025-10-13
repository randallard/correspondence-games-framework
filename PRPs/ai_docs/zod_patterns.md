# Zod Patterns for Game State Validation

Research Date: 2025-10-13
Zod Version: v3.x
Purpose: Game state schema validation for Correspondence Games Framework

## Official Documentation

### Primary Resources
- **Official Documentation**: https://zod.dev/
- **V3 Specific Docs**: https://v3.zod.dev/
- **GitHub Repository**: https://github.com/colinhacks/zod

### Key Documentation Sections
- **API Reference**: https://zod.dev/api (objects, strings, enums, methods)
- **Basic Usage**: https://zod.dev/basics (parse, safeParse, type inference)
- **Error Customization**: https://zod.dev/error-customization (custom error messages)
- **Error Formatting**: https://zod.dev/error-formatting (ZodError handling)

## Installation & Setup

```bash
npm install zod
```

### TypeScript Configuration Requirements
```json
{
  "compilerOptions": {
    "strict": true,  // REQUIRED - without this, fields become optional!
    "strictNullChecks": true  // Minimum requirement
  }
}
```

## Core Patterns for Game State

### 1. UUID Validation

```typescript
import { z } from "zod";

// Basic UUID validation
const gameIdSchema = z.string().uuid();

// Specific UUID version
const uuidV4Schema = z.string().uuid({ version: "v4" });

// Convenience methods
z.uuidv4();
z.uuidv6();
z.uuidv7();

// With custom error message
z.string().uuid("Invalid game ID format");

// In object schema
const GameStateSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid({ version: "v4" }),
});
```

**UUID vs GUID**:
- `z.uuid()` - RFC 9562/4122 compliant (strict)
- `z.guid()` - Any 8-4-4-4-12 hex pattern (permissive)

### 2. Enum Schemas

```typescript
// Preferred: z.enum() with as const
const GameStatus = ["pending", "active", "completed", "abandoned"] as const;
const GameStatusSchema = z.enum(GameStatus);
type GameStatus = z.infer<typeof GameStatusSchema>; // "pending" | "active" | "completed" | "abandoned"

// Direct enum definition
const FishEnum = z.enum(["Salmon", "Tuna", "Trout"]);

// From object (when you need labels)
const GAME_MODES = {
  SOLO: 'solo',
  MULTIPLAYER: 'multiplayer',
  TOURNAMENT: 'tournament',
} as const;

const GameModeSchema = z.enum([
  GAME_MODES.SOLO,
  ...Object.values(GAME_MODES),
]);

// Native TypeScript enum (for existing enums)
enum UserRole {
  Admin = "ADMIN",
  Player = "PLAYER",
  Spectator = "SPECTATOR",
}

const userRoleSchema = z.nativeEnum(UserRole);
```

**Best Practices**:
- ✅ Use `z.enum()` with `as const` for new code
- ✅ Single source of truth with `as const` array
- ✅ Use `z.nativeEnum()` only for existing TypeScript enums
- ❌ Avoid creating new TypeScript enums when using Zod

### 3. Optional, Nullable, and Default Values

```typescript
// Optional (allows undefined)
const schema = z.object({
  nickname: z.string().optional(),  // string | undefined
});

// Nullable (allows null)
const schema = z.object({
  lastMove: z.string().nullable(),  // string | null
});

// Nullish (allows null AND undefined)
const schema = z.object({
  avatar: z.string().nullish(),  // string | null | undefined
});

// Default values
const schema = z.object({
  theme: z.string().default("light"),
  maxPlayers: z.number().default(4),
});

// Chain nullable and optional
z.string().nullable().optional();  // string | null | undefined
// or use .nullish() as shorthand
z.string().nullish();  // string | null | undefined

// Optional with validation constraint
z.string().min(4).optional().or(z.literal(''));  // min 4 chars OR empty string
```

**Type Inference**:
- `.optional()` → `T | undefined`
- `.nullable()` → `T | null`
- `.nullish()` → `T | null | undefined`
- `.default()` → `T` (non-optional, always present)

### 4. Type Inference with z.infer

```typescript
// Basic type inference
const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  score: z.number(),
});

type Player = z.infer<typeof PlayerSchema>;
// type Player = {
//   id: string;
//   name: string;
//   score: number;
// }

// Input vs Output types (with transforms)
const TransformSchema = z.string().transform((val) => val.length);

type Input = z.input<typeof TransformSchema>;   // string
type Output = z.output<typeof TransformSchema>; // number
// z.infer is equivalent to z.output

// Complex nested inference
const GameStateSchema = z.object({
  game: z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "active", "completed"]),
  }),
  players: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  })),
  metadata: z.record(z.string()),
});

type GameState = z.infer<typeof GameStateSchema>;
// Fully typed nested structure
```

### 5. Schema Composition and Reuse

```typescript
// Base schemas
const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.number(),
});

// Extend - add new fields
const DetailedPlayerSchema = PlayerSchema.extend({
  email: z.string().email(),
  avatar: z.string().url().optional(),
});

// Pick - select specific fields
const PlayerIdName = PlayerSchema.pick({
  id: true,
  name: true,
});

// Omit - exclude fields
const PlayerWithoutTimestamp = PlayerSchema.omit({
  createdAt: true,
});

// Partial - make all fields optional
const PartialPlayer = PlayerSchema.partial();

// Partial specific fields
const PlayerWithOptionalName = PlayerSchema.partial({
  name: true,
});

// Required - make all fields required
const RequiredPlayer = PlayerSchema.required();

// Merge - combine schemas
const BaseGameSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "completed"]),
});

const TimestampSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number(),
});

const GameWithTimestamps = BaseGameSchema.merge(TimestampSchema);

// Nested schema composition
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string(),
});

const UserSchema = z.object({
  name: z.string(),
  address: AddressSchema,  // Reuse schema
});
```

**Important**:
- ✅ Use `.extend()` to add fields to objects
- ❌ Don't use `z.intersection()` for objects (lacks methods like `.pick()`)
- ⚠️ `.refine()` and `.transform()` return `ZodEffect`, not `ZodObject`
- ⚠️ Can't extend schemas with refinements (use `.safeExtend()` if needed)

### 6. Validation Error Handling

```typescript
// Method 1: .parse() - throws on error
try {
  const player = PlayerSchema.parse(untrustedData);
  // player is fully typed and validated
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.issues);
    // Array of validation issues
  }
}

// Method 2: .safeParse() - returns result object (PREFERRED)
const result = PlayerSchema.safeParse(untrustedData);

if (!result.success) {
  // result.error is ZodError
  console.error(result.error.issues);

  // Flatten errors for forms
  const flattened = z.flattenError(result.error);
  // { formErrors: string[], fieldErrors: { [field]: string[] } }

  // Pretty print errors
  const pretty = z.prettifyError(result.error);
  console.log(pretty);

  // Tree structure
  const tree = z.treeifyError(result.error);
  // Nested object with errors and properties
} else {
  // result.data is fully typed
  const player = result.data;
}

// Async validation (for async refinements/transforms)
const result = await PlayerSchema.safeParseAsync(untrustedData);
```

**ZodError Structure**:
```typescript
{
  issues: [
    {
      code: "invalid_type",
      expected: "string",
      received: "number",
      path: ["players", 0, "name"],
      message: "Expected string, received number"
    }
  ]
}
```

### 7. Custom Error Messages

```typescript
// Schema-level custom errors
const schema = z.object({
  username: z.string("Username must be a string"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  age: z.number({
    required_error: "Age is required",
    invalid_type_error: "Age must be a number",
  }),
});

// Error map function
const schema = z.string({
  error: (issue) => {
    if (issue.input === undefined) return "Field is required.";
    if (issue.code === "invalid_type") return "Must be a string.";
    return "Invalid input.";
  }
});

// Per-parse error customization
schema.parse(input, {
  error: (issue) => {
    if (issue.code === "invalid_type") {
      return `Expected ${issue.expected}, got ${issue.received}`;
    }
  }
});

// Global error customization
z.config({
  customError: (issue) => {
    // Customize all errors globally
    return "Custom error message";
  }
});
```

### 8. Custom Validation (Refine)

```typescript
// Simple refinement
const PositiveNumber = z.number().refine((val) => val > 0, {
  message: "Number must be positive",
});

// Complex validation (checksum example)
const ChecksummedGameState = z.object({
  data: z.string(),
  checksum: z.string(),
}).refine((obj) => {
  // Custom checksum validation logic
  const computed = computeChecksum(obj.data);
  return computed === obj.checksum;
}, {
  message: "Checksum validation failed",
  path: ["checksum"],  // Error path
});

// Multiple refinements
const schema = z.string()
  .refine((val) => val.length >= 8, "Must be at least 8 characters")
  .refine((val) => /[A-Z]/.test(val), "Must contain uppercase letter")
  .refine((val) => /[0-9]/.test(val), "Must contain number");

// Superrefine for multiple errors
const schema = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 8,
      type: "string",
      inclusive: true,
      message: "Too short",
    });
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Missing uppercase letter",
    });
  }
});
```

## Complete Game State Schema Example

```typescript
import { z } from "zod";

// Enums
const GameStatus = ["pending", "active", "completed", "abandoned"] as const;
const GameStatusSchema = z.enum(GameStatus);

const TurnStatus = ["waiting", "in_progress", "completed"] as const;
const TurnStatusSchema = z.enum(TurnStatus);

// Player schema
const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  joinedAt: z.number(),
  isActive: z.boolean().default(true),
  avatar: z.string().url().optional(),
});

// Move schema
const MoveSchema = z.object({
  playerId: z.string().uuid(),
  timestamp: z.number(),
  data: z.record(z.unknown()),  // Game-specific move data
});

// Game state schema
const GameStateSchema = z.object({
  // Core identifiers
  id: z.string().uuid(),
  gameType: z.string(),

  // Status
  status: GameStatusSchema,

  // Players
  players: z.array(PlayerSchema).min(1).max(10),
  currentPlayerIndex: z.number().int().min(0),

  // Game data
  moves: z.array(MoveSchema),
  state: z.record(z.unknown()),  // Game-specific state

  // Metadata
  createdAt: z.number(),
  updatedAt: z.number(),
  lastMoveAt: z.number().nullable(),

  // Optional fields
  winner: z.string().uuid().optional(),
  metadata: z.record(z.string()).optional(),
}).refine((data) => {
  // Validate currentPlayerIndex is within bounds
  return data.currentPlayerIndex < data.players.length;
}, {
  message: "currentPlayerIndex must be valid player index",
  path: ["currentPlayerIndex"],
});

// Counting game specific schema (extends base)
const CountingGameStateSchema = GameStateSchema.extend({
  gameType: z.literal("counting"),
  state: z.object({
    count: z.number().int().min(0),
    maxCount: z.number().int().min(1),
  }),
});

// Type inference
type GameState = z.infer<typeof GameStateSchema>;
type CountingGameState = z.infer<typeof CountingGameStateSchema>;
type Player = z.infer<typeof PlayerSchema>;
type GameStatus = z.infer<typeof GameStatusSchema>;

// Usage
function loadGameState(serialized: string): GameState | null {
  try {
    const parsed = JSON.parse(serialized);
    const result = GameStateSchema.safeParse(parsed);

    if (!result.success) {
      console.error("Game state validation failed:",
        z.prettifyError(result.error));
      return null;
    }

    return result.data;
  } catch (e) {
    console.error("Failed to parse game state:", e);
    return null;
  }
}

// Create new game with defaults
function createNewGame(players: Player[]): GameState {
  const gameState = GameStateSchema.parse({
    id: crypto.randomUUID(),
    gameType: "counting",
    status: "pending",
    players,
    currentPlayerIndex: 0,
    moves: [],
    state: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastMoveAt: null,
  });

  return gameState;
}
```

## Common Pitfalls and Solutions

### 1. TypeScript Config Not Strict
❌ **Problem**: Fields become optional unexpectedly
✅ **Solution**: Enable `"strict": true` in `tsconfig.json`

### 2. Schema-First vs Type-First Confusion
❌ **Problem**: Trying to create Zod schema from TypeScript type
✅ **Solution**: Define Zod schema first, infer type with `z.infer`

```typescript
// ❌ Don't do this
type Player = { name: string; score: number };
// Can't easily create schema from this

// ✅ Do this
const PlayerSchema = z.object({ name: z.string(), score: z.number() });
type Player = z.infer<typeof PlayerSchema>;
```

### 3. Extending Schemas with Refinements
❌ **Problem**: `.extend()` throws error on refined schemas
✅ **Solution**: Extract before refining, or use `.safeExtend()`

```typescript
// ❌ Don't do this
const BaseSchema = z.object({ name: z.string() })
  .refine((data) => data.name !== "");
const ExtendedSchema = BaseSchema.extend({ age: z.number() }); // Error!

// ✅ Do this
const BaseSchema = z.object({ name: z.string() });
const ExtendedSchema = BaseSchema.extend({ age: z.number() })
  .refine((data) => data.name !== "");
```

### 4. Intersections Instead of Extend
❌ **Problem**: Using `z.intersection()` for objects
✅ **Solution**: Use `.extend()` or `.merge()`

```typescript
// ❌ Don't do this (lacks object methods)
const Combined = z.intersection(SchemaA, SchemaB);

// ✅ Do this
const Combined = SchemaA.extend(SchemaB.shape);
// or
const Combined = SchemaA.merge(SchemaB);
```

### 5. Not Handling Validation Errors
❌ **Problem**: Using `.parse()` without try-catch
✅ **Solution**: Use `.safeParse()` for cleaner error handling

```typescript
// ❌ Risky
const data = schema.parse(untrustedInput); // Throws!

// ✅ Safe
const result = schema.safeParse(untrustedInput);
if (!result.success) {
  // Handle errors
  return;
}
const data = result.data;
```

### 6. Deprecated Methods
❌ **Problem**: Using `.nonempty()`
✅ **Solution**: Use `.min(1)`

```typescript
// ❌ Deprecated
z.array(z.string()).nonempty();

// ✅ Current
z.array(z.string()).min(1);
```

### 7. Performance and Bundle Size
⚠️ **Note**: Zod is ~12kb gzipped
- Consider impact on client-side bundles
- Validation adds runtime overhead
- Use code splitting if needed
- Consider lighter alternatives for simple cases

## Best Practices Summary

### Schema Design
1. ✅ Define schemas before types (schema-first approach)
2. ✅ Use `as const` for enum values
3. ✅ Compose schemas with `.extend()`, `.pick()`, `.omit()`
4. ✅ Extract reusable schemas (Address, Player, etc.)
5. ✅ Use `.refine()` for custom business logic

### Type Inference
1. ✅ Use `z.infer<typeof Schema>` for types
2. ✅ Use `z.input<>` and `z.output<>` for transforms
3. ✅ Export both schema and inferred type

### Error Handling
1. ✅ Prefer `.safeParse()` over `.parse()`
2. ✅ Use `z.flattenError()` for form validation
3. ✅ Provide custom error messages for better UX
4. ✅ Log validation errors for debugging

### Validation
1. ✅ Validate at system boundaries (API, storage, URL)
2. ✅ Use UUID validation for IDs
3. ✅ Add refinements for business rules
4. ✅ Use `.default()` for optional fields with defaults

### Performance
1. ✅ Validate once, not repeatedly
2. ✅ Cache schemas (don't recreate)
3. ⚠️ Be mindful of bundle size on client
4. ⚠️ Consider validation cost in hot paths

## Additional Resources

### Official Ecosystem
- **JSON Schema Export**: https://zod.dev/json-schema
- **Ecosystem Tools**: https://zod.dev/ecosystem
- **Library Authors Guide**: https://zod.dev/library-authors

### Community Resources
- **Total TypeScript Zod Tutorial**: https://www.totaltypescript.com/tutorials/zod
- **LogRocket Guide**: https://blog.logrocket.com/schema-validation-typescript-zod/
- **Better Stack Guide**: https://betterstack.com/community/guides/scaling-nodejs/zod-explained/

### When to Use Zod
- ✅ Validating external data (API responses, user input, file parsing)
- ✅ Runtime validation of configuration
- ✅ Form validation with type inference
- ✅ API request/response validation
- ✅ Loading game state from storage/URL
- ❌ Internal type checking (TypeScript handles this)
- ❌ Simple cases where TypeScript types suffice

## Version Notes
- Current stable: v3.x
- TypeScript v5.5+ recommended
- Requires `"strict": true` in tsconfig.json
- 2kb core bundle (gzipped)
- Zero dependencies

---

**Last Updated**: 2025-10-13
**Framework**: Correspondence Games Framework
**Use Case**: Game state schema validation with UUID, enums, optional fields, and checksum validation
