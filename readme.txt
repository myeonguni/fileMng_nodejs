@ 만든이 : myeonguni.com

# 시작하는 방법
-> npm install (작성된 package.json 기반으로 모듈 설치)
-> mongodb url 매칭
  - ./app.js : 6번째 줄 연결할 db url로 맞춰주기
-> node app (3000 포트로 서버 실행)


# 프로젝트 주요 기능 설명
#1 로그인 & 로그아웃 & 회원가입
  - 회원가입 : everyauth 사용(facebook, github, google, twitter 지원)
  - 로그인, 로그아웃 : session 처리
  - mongodb 사용

#2 파일 매니저 기능
  - 1계정 당 1개의 프로젝트 지원
  - 프로젝트 업로드: zip, tar 확장자만 가능, 업로드 완료 시 자동 압축해제, 로딩 이미지
  - 업로드 폴더 위치:./uploads/userid/.
  - jstree + edit(esayui+codemirror): 파일/폴더 추가, 파일읽기, 파일내용수정, 파일/폴더 삭제 가능

#3 채팅 기능
  - 전체(익명) 채팅
  - 귓속말(쪽지) 채팅
  - mongodb 사용