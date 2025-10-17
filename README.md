# stateflowguard

stateflowguard adalah implementasi Finite State Machine (FSM) yang stateless dengan dukungan validasi skema menggunakan Zod. Library ini memungkinkan Anda untuk mendefinisikan transisi state dengan guard conditions yang fleksibel.

## Fitur

- **Stateless**: Tidak menyimpan state internal, cocok untuk arsitektur distributed
- **Stateless**: Tidak menyimpan state internal, cocok untuk arsitektur distributed
- **Validasi Skema**: Validasi otomatis menggunakan Zod
- **Guard Conditions**: Mendukung state guard dan event guard
- **Mode Fleksibel**: Pilih antara mode `strict` atau `loose`
- **Type-Safe**: Full TypeScript support

## Instalasi

```bash
npm install stateflowguard
```

## Penggunaan Dasar

### 1. Definisikan State Schema

```typescript
const trafficLightSchema = {
  red: {
    transition: {
      NEXT: {
        to: "green",
        eventGuard: {
          allow: {
            time: { value: "day", mode: "equal" }
          }
        }
      }
    },
    stateguard: {
      allow: {
        power: { value: "on", mode: "equal" }
      }
    }
  },
  green: {
    transition: {
      NEXT: {
        to: "yellow",
        eventGuard: {
          allow: {
            manual: { value: false, mode: "equal" }
          }
        }
      }
    }
  },
  yellow: {
    transition: {
      NEXT: {
        to: "red"
      }
    }
  }
}
```

### 2. Inisialisasi FSM

```typescript
// Mode loose (default) - tidak melakukan validasi skema
const fsm = new StatelessFSM(trafficLightSchema, { mode: 'loose' })

// Mode strict - melakukan validasi skema saat inisialisasi
const strictFsm = new StatelessFSM(trafficLightSchema, { mode: 'strict' })
```

### 3. Gunakan FSM

```typescript
// Transisi dari state red ke green
const result = fsm.transition({
  event: "NEXT",
  stateContext: { power: "on" },
  eventContext: { time: "day" }
})
```

## Struktur Schema

### State Node

```typescript
{
  transition: {
    [eventName: string]: {
      to: string,                    // State tujuan
      eventGuard?: {                 // Guard untuk event (opsional)
        allow?: { ... },             // Kondisi yang harus dipenuhi
        not?: { ... }                // Kondisi yang harus dihindari
      }
    }
  },
  stateguard?: {                     // Guard untuk state (opsional)
    allow?: { ... },
    not?: { ... }
  }
}
```

### Guard Record

```typescript
{
  [key: string]: {
    value: any,                      // Nilai yang akan dibandingkan
    mode: 'equal' | 'intersect' | 'subset'  // Mode perbandingan
  }
}
```

## Guard Modes

### 1. Equal
Membandingkan nilai secara strict equality
```typescript
allow: {
  status: { value: "active", mode: "equal" }
}
// Hanya cocok jika status === "active"
```

### 2. Intersect
Memeriksa apakah ada irisan antara dua array
```typescript
allow: {
  roles: { value: ["admin", "editor"], mode: "intersect" }
}
// Cocok jika user memiliki salah satu dari role tersebut
```

### 3. Subset
Memeriksa apakah nilai adalah subset dari array yang diberikan
```typescript
allow: {
  permissions: { value: ["read", "write", "delete"], mode: "subset" }
}
// Cocok jika semua permissions user ada dalam array tersebut
```

## Contoh Penggunaan Advanced

### Workflow Approval System

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
            status: { value: "locked", mode: "equal" }
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
            userRole: { value: "admin", mode: "equal" }
          }
        }
      }
    }
  },
  published: {
    transition: {}
  }
}

const fsm = new StatelessFSM(approvalSchema, 'strict')

// Penggunaan
const result = fsm.transition({
  event: "SUBMIT",
  stateContext: { archived: false },
  eventContext: { 
    userRole: ["author"],
    status: "ready"
  }
})
```

## Mode Operasi

### Loose Mode (Default)
- Tidak melakukan validasi skema saat inisialisasi
- Lebih cepat dan fleksibel
- Cocok untuk development atau schema yang dinamis

### Strict Mode
- Melakukan validasi skema lengkap saat inisialisasi
- Menangkap error lebih awal
- Cocok untuk production atau schema yang tetap

## API Reference

### Constructor

```typescript
constructor(transition: T, mode: 'strict'|'loose' = 'loose')
```

**Parameters:**
- `transition`: State schema yang mendefinisikan FSM
- `mode`: Mode validasi ('strict' atau 'loose')

### Methods

```typescript
transition(request: {
  event: string,
  stateContext?: Record<string, any>,
  eventContext?: Record<string, any>
})
```

**Parameters:**
- `event`: Nama event yang akan ditrigger
- `stateContext`: Context dari state saat ini (untuk state guard)
- `eventContext`: Context dari event (untuk event guard)

## Best Practices

1. **Gunakan Strict Mode di Production**: Untuk menangkap error lebih awal
2. **Definisikan Guard dengan Jelas**: Pastikan guard conditions mudah dipahami
3. **Dokumentasikan States**: Berikan komentar untuk setiap state dan transisi
4. **Pisahkan Logic**: Jangan masukkan business logic kompleks dalam guard
5. **Test Thoroughly**: Test semua path transisi yang mungkin

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.