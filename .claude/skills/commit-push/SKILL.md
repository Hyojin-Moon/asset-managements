---
name: commit-push
description: 변경사항을 분석하여 자동으로 커밋 메시지를 생성하고 푸시합니다. 키워드: 커밋, 푸시, git, 배포
user-invocable: true
allowed-tools: Bash
---

# Git 커밋 & 푸시

## 실행 단계

1. **현재 브랜치 확인**: `git branch --show-current`
   - 브랜치명에서 JIRA 이슈번호 형식이 있다면 추출 (예: `feature/EXP-976` → `EXP-976`)

2. **변경사항 분석**:
   - `git status`로 변경된 파일 목록 확인
   - `git diff`로 실제 변경 내용 분석

3. **커밋 메시지 자동 생성**:
   - 변경사항을 분석하여 한국어로 간결한 요약 작성
   - 형식: `feat, docs, chore 등 : 변경 요약`

4. **커밋 및 푸시**:
   - `git add .`
   - `git commit -m "생성된 메시지"`
   - `git push origin 현재브랜치`

## 커밋 메시지 컨벤션

```
feat: 변경 요약

(선택) 상세 내용
```

### 좋은 예시
- `feat: 구독 해지 방지 페이지 UI 개선`
- `feat: 스토어 장바구니 수량 계산 수정`

### 커밋 메시지 작성 가이드
- 변경의 "무엇"보다 "왜"에 초점
- 50자 이내의 간결한 요약
- 한국어로 작성

## 주의사항

- 커밋 메시지에 Claude Code 관련 문구 절대 포함 금지
- .env, credentials.json 등 민감한 파일 커밋 주의
- 커밋 전 변경사항 사용자에게 보여주고 묻지말고 바로 커밋 푸시
