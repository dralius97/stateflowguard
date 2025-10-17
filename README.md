# StateFlowGuard

StateFlowGuard is a lightweight, schema-driven finite state machine (FSM) engine built for Node.js and TypeScript.  
It supports both **stateless** and **stateful** FSM models, with optional caching and validation layers for optimized control flow management.

---

## Features

- **Stateless and Stateful Modes**  
  Choose between simple, immutable FSMs or persistent stateful machines.

- **Strict Schema Validation**  
  Ensures FSM definitions are type-safe and structurally consistent.

- **Cache Integration**  
  Avoid redundant transitions and speed up repeated state evaluations.

- **Flexible Validation Modes**  
  Switch between hash-based or deep structural validation for optimal performance.

- **Typed Event System**  
  Strongly typed transitions and contextual guards to prevent invalid transitions at compile time.

---

## Installation

```bash
npm install stateflowguard
```

---

## Basic Usage

```ts
import { StateFlowGuard } from "stateflowguard";

// Define FSM schema
const machine = new StateFlowGuard({
  initial: "idle",
  schema: {
    idle: {
      transition: {
        START: { to: "running" },
      },
    },
    running: {
      transition: {
        STOP: { to: "idle" },
      },
    },
    FINAL: "FINAL",
  },
});

// Start validation
const result = machine.validate({ event: "START", eventContext: {}, stateContext: {} });
console.log(result);
```

---

## Advanced Options

### Validation Engine Mode

During initialization, you can configure how validation is handled:

```ts
const fsm = new StateFlowGuard({
  mode: "strict", // or "loose"
  validationEngine: "hash", // or "deep"
});
```

| Option              | Description |
|----------------------|-------------|
| `mode: "strict"`     | Enforces schema validation for every transition. |
| `mode: "loose"`      | Skips schema validation for faster execution. |
| `validationEngine: "hash"` | Uses SHA1 or SHA256-based hashing for structure validation. |
| `validationEngine: "deep"` | Performs recursive object comparison for accuracy. |

---

## Caching Layer

The cache sits **before** FSMCore execution, storing previously validated transitions to prevent redundant computation.

```ts
fsm.cache.set({ state: "idle", event: "START" }, { isValid: true, next: "running" });
```

---

## Error Handling

The FSM emits structured errors using `FSMError`:

| Type | Meaning |
|-------|----------|
| `VALIDATION_ERROR` | Schema or event validation failed. |
| `SCHEMA_ERROR` | Schema definition is invalid. |
| `UNEXPECTED_ERROR` | Unexpected runtime failure. |
| `REQUEST_ERROR` | External input or dependency error. |
| `PLACEHOLDER` | Internal placeholder for fallback. |
| `FINAL_STATE` | Reached terminal state. |

---

## Repository

For complete documentation and examples, visit the GitHub repository:  
[https://github.com/dralius97/stateflowguard](https://github.com/dralius97/stateflowguard)
