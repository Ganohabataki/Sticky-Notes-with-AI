# 📌 Sticky Notes Agent

> Windows 98 스타일의 레트로 데스크톱 메모 애플리케이션

Electron 기반의 데스크톱 스티키 노트 앱입니다. 텍스트 입력과 음성 입력(Web Speech API)을 통해 메모를 생성하고, 드래그 가능한 노트 카드로 바탕화면에 배치할 수 있습니다.

---

## 📸 주요 기능

### 1. 텍스트 메모 입력
- 텍스트 입력창에 메모를 작성하고 **Queue Note** 버튼 또는 `Ctrl+Enter`로 노트를 생성합니다.
- 생성된 노트는 바탕화면 위에 카드 형태로 배치됩니다.

### 2. 음성 메모 입력
- **Voice Input** 모드로 전환하면 마이크를 통한 음성 인식이 가능합니다.
- Web Speech API(한국어 `ko-KR`)를 사용하며, 실시간 중간 결과와 최종 결과가 텍스트로 변환됩니다.
- 변환된 텍스트를 확인 후 **Queue Transcript** 버튼으로 노트를 생성합니다.

### 3. 드래그 가능한 노트 카드
- 생성된 노트는 바탕화면 어디든 드래그하여 배치할 수 있습니다.
- 6가지 테마 컬러(Orbital Black, Mission Blue, Solar Copper, Radar Green, Plasma Violet, Heat Shield)가 랜덤으로 적용됩니다.
- 노트 글씨 크기를 `+` / `-` 버튼으로 11px~20px 범위에서 조절할 수 있습니다.
- 긴 메모는 접기/펼치기(**More / Less**) 기능을 제공합니다.

### 4. 메모 삭제 및 삭제 로그
- 노트 좌측 상단의 체크 버튼(☐)을 누르면 구겨지는 애니메이션과 함께 삭제됩니다.
- 삭제된 메모는 **Deleted Log**에 최대 200건까지 기록되며, `localStorage`에 저장됩니다.
- 삭제 로그에서는 생성 시각, 삭제 시각, 테마, 글씨 크기, 원본 내용을 확인할 수 있습니다.

### 5. 민감 정보 자동 마스킹
- 메모에 포함된 민감 정보를 자동으로 감지하여 마스킹합니다.
- 마스킹 대상:
  - 파일 경로 (Windows/Unix) → `[REDACTED_PATH]`
  - 민감 확장자 파일명 (`.env`, `.pem`, `.key` 등) → `[REDACTED_FILE]`
  - API 키, 토큰, 비밀번호 등 Key-Value → `[REDACTED_SECRET]`
  - 흔한 토큰 접두사 (`sk-`, `ghp_`, `AKIA` 등) → `[REDACTED_TOKEN]`
  - PEM 개인키 블록 → `[REDACTED_PRIVATE_KEY]`

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| **프레임워크** | Electron 31 |
| **프론트엔드** | HTML / CSS / JavaScript (Vanilla) |
| **음성 인식** | Web Speech API (`SpeechRecognition`) |
| **데이터 저장** | `localStorage` (삭제 로그) |
| **빌드** | electron-builder (Windows Portable) |
| **디자인** | Windows 98 레트로 UI |

---

## 📂 프로젝트 구조

```
Sticky Notes/
├── main.js          # Electron 메인 프로세스 (창 생성 및 앱 생명주기)
├── index.html       # 앱 화면 구조 (HTML)
├── styles.css       # Windows 98 스타일 시트 + 노트 카드 애니메이션
├── script.js        # 앱 로직 (입력 모드 전환, 노트 CRUD, 드래그, 음성 인식)
├── package.json     # 프로젝트 설정 및 의존성
├── .gitignore       # Git 추적 제외 파일 목록
└── README.md        # 프로젝트 소개 문서
```

---

## 🚀 실행 방법

### 사전 요구사항

- [Node.js](https://nodejs.org/) (v18 이상 권장)
- npm (Node.js 설치 시 포함)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/Ganohabataki/Sticky-Notes-with-AI.git
cd Sticky-Notes-with-AI

# 2. 의존성 설치
npm install

# 3. 개발 모드 실행
npm start
```

### 빌드 (Windows Portable EXE)

```bash
# 포터블 실행 파일 생성
npm run dist
```

빌드 결과물은 `dist/` 폴더에 `StickyNotesAgent.exe`로 생성됩니다.

---

## ⚠️ 참고 사항

- **음성 인식**은 Chromium 기반 엔진(Web Speech API)을 사용하므로 **인터넷 연결이 필요**합니다.
- 삭제 로그는 `localStorage`에 저장되므로, 앱 데이터 초기화 시 삭제됩니다.

---

## 🔮 향후 개발 계획

본 프로젝트는 원래 **로컬 AI 모델(Ollama)과 연동**하여 다음과 같은 기능을 구현할 예정이었습니다:

- 🤖 **음성 요약 기능**: 음성으로 입력된 긴 메모를 AI가 자동으로 요약
- 📋 **메모 자동 분류**: AI가 메모 내용을 분석하여 카테고리별로 정리
- 💡 **스마트 제안**: 메모 내용을 바탕으로 관련 작업이나 일정 제안

> **현재 요금제 제약으로 AI 기능 탑재가 보류**되어 있으며, 추후 Ollama 등 로컬 LLM 연동이 가능해지면 위 기능들을 구현할 계획입니다.

---

## 📄 라이선스

이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.
