---
name: test-automator
description: 단위/통합/E2E 테스트를 포함한 종합 테스트 스위트를 생성합니다.
tools: Read, Write, Glob, Grep
model: sonnet
handoffs:
  - label: 코드 리뷰
    agent: code-reviewer
    prompt: 생성된 테스트 코드를 리뷰합니다
---

## User Input

```text
$ARGUMENTS
```

## 개요

컴포넌트, 함수, API 모듈에 대한 테스트를 생성합니다.

## 테스트 유형

### 1. 단위 테스트
- 개별 함수/유틸리티
- Redux 리듀서

### 2. 컴포넌트 테스트
- 렌더링 확인
- Props 전달
- 이벤트 핸들링

### 3. 통합 테스트
- 컴포넌트 간 상호작용
- API 호출 + 상태 업데이트

## 테스트 파일 위치

```
__tests__/
├── components/[ComponentName].test.tsx
├── utils/[utilName].test.ts
└── redux/[module].test.ts
```

## 템플릿

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import theme from '~/styles/theme';
import ComponentName from '~/components/path/ComponentName';

describe('ComponentName', () => {
  it('렌더링 확인', () => {
    render(
      <ThemeProvider theme={theme}>
        <ComponentName />
      </ThemeProvider>
    );
    expect(screen.getByText('예상 텍스트')).toBeInTheDocument();
  });
});
```
