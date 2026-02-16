# TestForge — Verified Patterns

검증된 코드 패턴을 기록합니다. 새 코드 작성 시 참조하세요.

## Hono API 패턴

### 라우트 정의
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

app.get('/api/items', async (c) => {
  const items = await db.query('SELECT * FROM items');
  return c.json(items);
});

app.post('/api/items',
  zValidator('json', createItemSchema),
  async (c) => {
    const data = c.req.valid('json');
    // ... create item
    return c.json(item, 201);
  }
);
```

### 에러 응답
```typescript
return c.json({ code: 'NOT_FOUND', message: 'Item not found' }, 404);
```

## React 컴포넌트 패턴

### 페이지 컴포넌트
```typescript
export default function ItemsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['items'], queryFn: fetchItems });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto p-6">
      {/* content */}
    </div>
  );
}
```

### Zustand 스토어
```typescript
import { create } from 'zustand';

interface AppStore {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));
```

## DuckDB 쿼리 패턴

### Parameterized Query
```typescript
const result = await db.all(
  'SELECT * FROM scenarios WHERE feature_id = ?',
  [featureId]
);
```

### UUID 생성
```typescript
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

## 테스트 패턴

### Bun Test
```typescript
import { describe, test, expect } from 'bun:test';

describe('ItemService', () => {
  test('should create item', async () => {
    const result = await createItem({ name: 'test' });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('test');
  });
});
```
