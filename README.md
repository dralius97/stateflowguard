# StateFlowGuard

StateFlowGuard is a lightweight, schema-driven Determined Finite State Machine (FSM) engine built for Node.js and TypeScript.  
It supports both **stateless** and **stateful** FSM models, with optional caching and validation layers for optimized control flow management.

---

## Features

- **Stateless and Stateful Modes**  
  Choose between simple, immutable FSMs or persistent stateful machines.
  - **StatelessFSM**
   FSM will not remember current state, you have save your own state and send your current state on parameter.
  - **StatefulFSM**
   FSM will remember your current, you just have to send event and guard context.

- **Strict Schema Validation**  
  Ensures FSM definitions are type-safe and structurally consistent.

- **Cache Integration**  
  Avoid redundant transitions and speed up repeated state evaluations.

- **WildCard and FALLBACK**
  Support WildCard event ('*') and FALLBACK event ('FALLBACK')

- **Flexible Validation Modes**  
  Switch between hash-based or deep structural validation for optimal performance.

- **Typed Event System**  
  Strongly typed transitions and contextual guards to prevent invalid transitions at compile time.

- **Event Lifecycle**
  Event lifecycle can be accessed by using ".on".

---

## Installation

```bash
npm install stateflowguard
```

---

## Basic Usage

```ts
import { StatefulFSM } from "stateflowguard";

// Define FSM schema
const machine = new StatefulFSM({
  initial: "idle",
  state: {
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
// { isValid: true, message: 'Transition_Allowed', next: 'running' }
console.log(result);


// { isValid: false, message: 'event invalid', reason: "event 'STOP' not found in state 'idle'", code: 'VALIDATION_ERROR' }
const result = machine.validate({ event: "STOP", eventContext: {}, stateContext: {} });


```

---

## Advanced Options

### Validation Engine Mode

During initialization, you can configure how validation is handled:

```ts
const fsm = new StatefulFSM(
     {
        mode: "strict" | "loose", // default "loose"
        validationEngine: "hash" | "deep", // default "deep"
        useCache: boolean, // default false
        cacheDuration: number, // default 10000 (on ms), max: 60000 
        cacheLimit:  number, // default 10 max: 100
        historyLength: number, // default 10 max: 100
    }
 );


const fsm = new StatelessFSM( 
    schema: SchemaFSM, 
    {
        mode: "strict" | "loose", // default "loose"
        validationEngine: "hash" | "deep", // default "deep"
        useCache: boolean, // default false
        cacheDuration: number, // default 10000 (on ms), max: 60000 
        cacheLimit:  number, // default 10 max: 100
    }
);
```

---
## Example Schema
```ts
//example Stateless Schema
{
  draft: {
    transition: {
      SUBMIT: {
        to: "pending",
        eventGuard: {
          allow: {
            userRole: { value: ["author", "editor"], mode: "intersect" }
          },
          not: {
            status: { value: ["locked"], mode: "equal" }
          }
        }
      }
    }
  },
  pending: {
    transition: {
      APPROVE: {
        to: "approved",
        eventGuard: {
          allow: {
            userRole: { value: ["admin", "manager"], mode: "intersect" }
          }
        }
      },
      REJECT: {
        to: "draft",
        eventGuard: {
          allow: {
            userRole: { value: ["admin", "manager"], mode: "intersect" }
          }
        }
      }
    },
    stateguard: {
      not: {
        archived: { value: true, mode: "equal" }
      }
    }
  },
  approved: {
    transition: {
      PUBLISH: {
        to: "published",
        eventGuard: {
          allow: {
            userRole: { value: ["admin"], mode: "equal" }
          }
        }
      }
    }
  },
  published: "FINAL"
}


//example Stateful Schema
{
    initial: "draft"
    state: {
      draft: {
        transition: {
          SUBMIT: {
            to: "pending",
            eventGuard: {
              allow: {
                userRole: { value: ["author", "editor"], mode: "intersect" }
              },
              not: {
                status: { value: ["locked"], mode: "equal" }
              }
            }
          }
        }
      },
      pending: {
        transition: {
          APPROVE: {
            to: "approved",
            eventGuard: {
              allow: {
                userRole: { value: ["admin", "manager"], mode: "intersect" }
              }
            }
          },
          REJECT: {
            to: "draft",
            eventGuard: {
              allow: {
                userRole: { value: ["admin", "manager"], mode: "intersect" }
              }
            }
          }
        },
        stateguard: {
          not: {
            archived: { value: true, mode: "equal" }
          }
        }
      },
      approved: {
        transition: {
          PUBLISH: {
            to: "published",
            eventGuard: {
              allow: {
                userRole: { value: ["admin"], mode: "equal" }
              }
            }
          }
        }
      },
      published: "FINAL"
    }
}

```

---

## Schema Definition

| Component        | Description |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`initial`**    | The **starting point** of your state machine — the first state the system enters before anything happens. In automata theory, this corresponds to the **initial state (q₀)**. You must define this property, because the FSM needs to know where to begin before it can process any transitions. The `initial` value should match one of the keys listed under the `state` object.                                |
| **`state`**      | Defines the **set of possible states (Q)** your machine can be in. Each key inside `state` represents one unique condition or configuration — for example, `idle`, `loading`, or `success`. These states describe how the machine behaves and which transitions are allowed from each point. Some states might be temporary, some guarded by conditions, and one might be marked as the terminal `"FINAL"` state. |
| **`transition`** | Describes **how the machine moves** from one state to another — formally known as the **transition function (δ : Q × Σ → Q)**. Each transition is triggered by an event and can include optional logic to decide whether the transition should happen. Think of it as “when X happens while in state Y, move to state Z.” This function forms the backbone of how the FSM reacts to input.                        |
| **`eventGuard`** | A **filter for incoming events**, ensuring that only valid inputs trigger a transition. It checks whether the event meets specific logical conditions before the state changes. In classical automata, this is like restricting which symbols are valid transitions — but here, you can make it context-sensitive (for example, “only if user is authenticated”).                                                 |
| **`stateGuard`** | A **constraint that must stay true** while the machine is in a particular state. It acts like a safeguard — if the condition fails, the state becomes invalid. In extended FSMs, this is often called a *state invariant*. You can use it to ensure your system remains consistent while staying in a specific configuration.                                                                                     |
| **`to`**         | The **destination state** — the next point the machine moves to once all conditions for a transition are met. It’s the output of the transition function. In simpler terms: when the event occurs and guards pass, the FSM moves from the current state to whatever `to` specifies.                                                                                                                               |
| **`FINAL`**      | The **end of the line** — a state where the FSM stops processing. Once the machine enters this state, no further transitions are allowed. In automata terms, it’s the **accepting or terminal state (F)**. In practice, it often marks a completed process, a successful workflow, or any terminal condition where the FSM has nothing left to do.                                                                |



---

## Option Definition

| Option              | Description |
|----------------------|-------------|
| `mode: "strict"`     | Enforces schema validation for every transition. |
| `mode: "loose"`      | Skips schema validation for faster execution. (default) |
| `validationEngine: "hash"` | Uses SHA256-based hashing for structure validation. |
| `validationEngine: "deep"` | Performs recursive object comparison for accuracy. (default)(recommended for simple schema) |
| `useCache: true` | Uses build-in cache. (default: false) |
| `cacheDuration: number` | Set persistence cache duration. (default: 10000 ) |
| `cacheLimit: number` | Set how much data that cache will contain. (default: 10) |

---

## .Validate Argument

| Components | Description |
|------------|-------------|
| `current state` | Only on StatelessFSM since it will not remember your last state |
| `event` | Event that trigger state transition |
| `eventContext` | Guard condition to access event level |  
| `stateContext` | Guard condition to access state level |

---

## Caching Layer

The cache sits **before** FSMCore execution, storing previously validated transitions to prevent redundant computation.
Data on cache will be keep on heap memmory and sweep expired cache every 500ms.

---

## WildCard and Fallback

You can set wild card ('*') as event, this will be default transition if you send event that not have been stated on this state before.

Fallback ('FALLBACK') as event, this willbe fallback transition if validation failed.


---

## Error Handling

The FSM emits structured errors using `FSMError`:

| Type | Meaning |
|-------|----------|
| `VALIDATION_ERROR` | Schema or event validation failed. |
| `SCHEMA_ERROR` | Schema definition is invalid. |
| `UNEXPECTED_ERROR` | Unexpected runtime failure. |
| `REQUEST_ERROR` | Error happened because argumen on fsm.validate(). |
| `FINAL_STATE` | Reached terminal state. |

---

## Event Lifecycle

| Lifecycle Event  | Trigger Timing | Description |
| ---------------- | -------------- | ----------- |
| **`onEnter`**    | Before the FSM transition begins. | Fired when the validator enters a new evaluation cycle. It provides the current state and context. This marks the entry point of the finite-state transition attempt. |
| **`success`**    | After the FSM successfully transitions to the next state. | Fired when the transition condition is satisfied and `isValid === true`. |
| **`invalid`**    | After the FSM fails to transition. | Fired when the given input (event) does not satisfy the transition rules. |
| **`onFallback`** | When the current state defines a `FALLBACK` transition and the primary transition fails. | Fired before performing a fallback transition. This represents a recovery mechanism, allowing the automaton to continue along an alternate path rather than halting.  |
| **`onExit`**     | After the FSM completes processing for the current input, regardless of validity. | Fired as the validator exits the transition cycle. Represents the end of one input-processing phase in automata terms. |
| **`error`**      | When an unexpected error occurs during validation or transition. | Fired for unrecoverable exceptions (internal FSM errors, invalid schema, or runtime failures). This ensures consistency even outside normal state transitions. |


---

## Repository

For complete documentation and examples, visit the GitHub repository:  
[https://github.com/dralius97/stateflowguard](https://github.com/dralius97/stateflowguard)
