# LaundryGo 웹뷰 개발 가이드

## 파일 구조 규칙

### 새 페이지 추가 시

```
pages/
└── [feature]/
    └── index.tsx          # 페이지 컴포넌트
```

### 새 컴포넌트 추가 시

```
components/
└── [Feature]/
    ├── index.tsx          # 메인 컴포넌트
    └── styled.ts          # styled-components
```

### Redux 모듈 추가 시

```
redux/modules/
└── [feature].ts           # actions, reducer, saga
```

### API 연동 추가 시

```
api/
└── [feature].ts           # API 호출 함수
```

---

## 네이티브 브릿지 사용

```typescript
// utils/postMessage.ts의 함수 사용
import {
  showToast,      // 토스트 메시지
  showAlert,      // 알림 다이얼로그
  closeWindow,    // 창 닫기
  pagePush,       // 페이지 이동
  fullPagePush,   // 전체 페이지 이동
  brazeEvent,     // Braze 이벤트
  kakaoShare      // 카카오 공유
} from '~/utils/postMessage';
```

### 사용 예시

```typescript
// 토스트 메시지
showToast('메시지 내용');

// 창 닫기
closeWindow();

// 페이지 이동
pagePush('/path/to/page');

// Braze 이벤트
brazeEvent('event_name', { key: 'value' });
```

---

## Amplitude 이벤트 추가

### 1. 상수 정의

```typescript
// utils/constants/amplitude.ts
export const AMPLITUDE_EVENTS = {
  FEATURE_BUTTON_CLICKED: 'feature_button_clicked',
  // ...
};
```

### 2. 이벤트 트래킹

```typescript
import * as amplitude from '@amplitude/analytics-browser';
import { AMPLITUDE_EVENTS } from '~/utils/constants/amplitude';

amplitude.track(AMPLITUDE_EVENTS.FEATURE_BUTTON_CLICKED, {
  property: 'value'
});
```

### 이벤트 명명 규칙

`{page}_{element}_{action}` 형식 사용
- 예: `store_order-bt_clicked`
- 예: `subscription_plan-card_viewed`

---

## Import 순서 규칙

```typescript
// 1. 서드파티 패키지 (react 먼저, 이후 알파벳순)
import React from 'react';
import styled from 'styled-components';

// 2. Redux 관련
import { useSelector, useDispatch } from 'react-redux';

// 3. API 관련
import { fetchData } from '~/api/feature';

// 4. 유틸리티 및 상수
import { formatDate } from '~/utils/common';
import { CONSTANTS } from '~/utils/constants';

// 5. 컴포넌트
import Button from '~/components/Button';

// 6. 타입 (import type 사용)
import type { FeatureType } from '~/types/feature';
```

---

## 디렉토리 구조 참고

```
pages/                    # Next.js 페이지 (라우팅)
├── store/               # 스토어 관련 페이지
├── guide/               # 가이드 페이지
├── subscription/        # 구독 관련 페이지
├── landing/             # 랜딩 페이지
└── event/               # 이벤트 페이지

components/              # 재사용 컴포넌트

redux/modules/           # Redux ducks 패턴
├── store.ts            # 스토어 모듈
├── user.ts             # 사용자 모듈
└── [feature].ts        # 기능별 모듈

api/                     # API 서비스
├── lib/fetcher.ts      # Axios 인스턴스
└── [feature].ts        # 기능별 API

utils/                   # 유틸리티
├── postMessage.ts      # 네이티브 브릿지
├── common.ts           # 공통 유틸
└── constants/          # 상수
    └── amplitude.ts    # Amplitude 이벤트

hooks/                   # 커스텀 훅
contexts/               # React Context
types/                  # TypeScript 타입
```

---

## 환경별 URL

| 환경 | 웹뷰 URL | API URL |
|------|----------|---------|
| Local | `http://localhost:3001` | `https://dev-api.laundrygo.com` |
| Dev | `https://dev-app.laundrygo.com` | `https://dev-api.laundrygo.com` |
| Stage | `https://stage-app.laundrygo.com` | `https://stage-api.laundrygo.com` |
| Stage2 | `https://stage2-app.laundrygo.com` | `https://stage2-api.laundrygo.com` |
| Prod | `https://app.laundrygo.com` | `https://api.laundrygo.com` |
