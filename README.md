# stateflowguard

[![npm version](https://img.shields.io/npm/v/stateflowguard.svg)](https://www.npmjs.com/package/stateflowguard)
[![GitHub](https://img.shields.io/badge/github-dralius97/stateflowguard-blue)](https://github.com/dralius97/stateflowguard)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

**stateflowguard** adalah implementasi **Finite State Machine (FSM)** yang mendukung **guard validation**, **type safety**, dan **mode fleksibel** (strict/loose).

---

## Fitur

- **Validasi Skema Otomatis** — Cegah kesalahan definisi state sejak inisialisasi.  
- **Guard Conditions** — Mendukung `stateGuard` dan `eventGuard`.  
- **Mode Fleksibel** — Pilih antara `strict` (validasi penuh) atau `loose` (lebih ringan).  
- **Type-Safe** — Dibangun sepenuhnya dengan TypeScript.  

---

## Instalasi

```bash
npm install stateflowguard
```

---

## 🚦 Penggunaan Dasar

### 1. Definisikan State Schema

```typescript
const trafficLightSchema = {
  red: {
    transition: {
      NEXT: {
        to: "green",
        eventGuard: {
          allow: {
            time: { value: ["day"], mode: "equal" }
          }
        }
      }
    },
    stateguard: {
      allow: {
        power: { value: ["on"], mode: "equal" }
      }
    }
  },
  green: {
    transition: {
      NEXT: {
        to: "yellow",
        eventGuard: {
          allow: {
            manual: { value: [false], mode: "equal" }
          }
        }
      }
    }
  },
  yellow: {
    transition: {
      NEXT: { to: "red" }
    }
  }
}
```

### 2. Inisialisasi FSM

```typescript
import { StatelessFSM } from "stateflowguard"

const fsm = new StatelessFSM(trafficLightSchema, { mode: 'loose' })
const strictFsm = new StatelessFSM(trafficLightSchema, { mode: 'strict' })
```

### 3. Gunakan FSM

```typescript
const result = fsm.transition({
  event: "NEXT",
  stateContext: { power: "on" },
  eventContext: { time: "day" }
})
```

---

## Struktur Schema

### State Node

```typescript
{
  transition: {
    [eventName: string]: {
      to: string,
      eventGuard?: {
        allow?: { ... },
        not?: { ... }
      }
    }
  },
  stateguard?: {
    allow?: { ... },
    not?: { ... }
  }
}
```

### Guard Record

```typescript
{
  [key: string]: {
    value: any[],
    mode: 'equal' | 'intersect' | 'subset'
  }
}
```

---

## Guard Modes

### 1. `equal`
```typescript
allow: {
  status: { value: ["active"], mode: "equal" }
}
```

### 2. `intersect`
```typescript
allow: {
  roles: { value: ["admin", "editor"], mode: "intersect" }
}
```

### 3. `subset`
```typescript
allow: {
  permissions: { value: ["read", "write", "delete"], mode: "subset" }
}
```

---

## Contoh Penggunaan Lanjutan

```typescript
const approvalSchema = {
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
  published: { transition: {} }
}

const fsm = new StatelessFSM(approvalSchema, { mode: 'strict' })
```

---

## Mode Operasi

| Mode | Deskripsi | Kegunaan |
|------|------------|----------|
| **Loose (default)** | Tidak validasi schema, cepat & fleksibel | Cocok untuk development |
| **Strict** | Validasi schema penuh di awal | Cocok untuk production |

---

## API Reference

### Constructor

```typescript
constructor(transition: T, options?: { mode?: 'strict' | 'loose' })
```

### Methods

```typescript
transition(request: {
  event: string,
  stateContext?: Record<string, any>,
  eventContext?: Record<string, any>
})
```

---

## Best Practices

1. Gunakan **Strict Mode** di production.  
2. Definisikan **guard** secara eksplisit dan jelas.  
3. Dokumentasikan setiap **state & transition**.  
4. Pisahkan **business logic** dari guard.  
5. **Uji semua path transisi** menggunakan unit test.  

---

## License

Licensed under the [ISC License](LICENSE).

---

## Contributing

Kontribusi sangat disambut!  
Silakan buka [Pull Request](https://github.com/dralius97/stateflowguard/pulls) atau laporkan issue di [GitHub](https://github.com/dralius97/stateflowguard/issues).

---

### Repository
➡️ [https://github.com/dralius97/stateflowguard](https://github.com/dralius97/stateflowguard)
