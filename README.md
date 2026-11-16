# 하늘섬 탐험일지

초등 3학년 하루 17분 학습 웹앱 (iPad Safari, 홈 화면 앱). 모든 그림·애니메이션·효과음은 코드로 만든다.

- 기획 문서(`docs/`)는 학교·학급 정보가 있어 공개 저장소에 올리지 않는다 (로컬에만 보관)
- 개발: `npm run dev` · 테스트: `npm test` · 빌드: `npm run build`
- 아이콘: `node scripts/make-icons.mjs` (포롱 픽셀맵에서 PNG 생성)
- 배포: `main`에 push하면 GitHub Actions가 GitHub Pages로 배포

아이의 이름·기록은 저장소에 넣지 않는다. 모든 학습 기록은 iPad의 IndexedDB에만 저장하고, 백업은 JSON 파일로 내보낸다.

## 현재 단계: M0 (iPad 점검)

홈 화면 오른쪽 위 `⚙︎ 점검`에서 저장, 소리, 읽어 주기, 성능, 백업을 확인하고 `호환표 복사`로 결과를 모은다.
