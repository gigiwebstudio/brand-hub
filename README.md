# Brand Hub — Setup Guide

## 배포 순서

### 1. Google Drive API Key 발급
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **APIs & Services → Library** → "Google Drive API" 검색 → Enable
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. API Key 복사해두기

### 2. GitHub에 올리기
```bash
cd brand-hub-app
git init
git add .
git commit -m "Initial Brand Hub"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/brand-hub.git
git push -u origin main
```

### 3. Vercel 배포
1. https://vercel.com 접속 → GitHub으로 로그인
2. **New Project** → brand-hub repo 선택 → Import
3. **Environment Variables** 추가:
   - Key: `GOOGLE_DRIVE_API_KEY`
   - Value: 위에서 복사한 API Key
4. **Deploy** 클릭

### 4. Drive 폴더 공개 설정 확인
각 클라이언트 Drive 폴더가 **"링크 있는 누구나 볼 수 있음"** 으로 설정되어 있어야 이미지가 표시됩니다.

## 로컬 개발
```bash
npm install
cp .env.local.example .env.local
# .env.local에 API Key 입력
npm run dev
```
