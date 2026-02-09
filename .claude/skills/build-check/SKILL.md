---
name: build-check
description: 빌드 및 테스트를 실행하여 코드 상태를 확인합니다. 키워드: 빌드, 테스트, 타입체크, 검증
user-invocable: true
allowed-tools: Bash
---

# 빌드 체크 스킬

## 목적

코드 변경 후 빌드와 테스트가 정상적으로 통과하는지 확인합니다.

## 실행 단계

### 1. TypeScript 타입 체크

```bash
npx tsc --noEmit --skipLibCheck
```

타입 오류가 있으면 오류 내용과 수정 방법을 안내합니다.

### 2. 테스트 실행

```bash
npm test
```

테스트 실패 시 실패한 테스트와 원인을 분석합니다.

### 3. 개발 빌드

```bash
npm run build-dev
```

빌드 실패 시 오류 메시지를 분석하고 해결 방법을 제시합니다.

## 결과 보고

### 성공 시

```
✅ 빌드 체크 완료

- TypeScript 타입 체크: 통과
- 테스트: X개 통과
- 개발 빌드: 성공
```

### 실패 시

```
❌ 빌드 체크 실패

**실패 항목**: [TypeScript/테스트/빌드]

**오류 내용**:
[오류 메시지]

**수정 방법**:
[구체적인 해결 방법]
```

## 빠른 체크 옵션

- `/build-check type` - TypeScript만 체크
- `/build-check test` - 테스트만 실행
- `/build-check build` - 빌드만 실행
- `/build-check` - 전체 실행 (기본)
