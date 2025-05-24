from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["chrome-extension://<확장ID>"]
    allow_credentials=True,
    allow_methods=["*"],  # 모든 메서드 허용 (POST, GET, OPTIONS 등)
    allow_headers=["*"],
)

# 고정된 테스트 계정
VALID_ID = "hcmhcs0"
VALID_PW = "m1990201."

class LoginRequest(BaseModel):
    userId: str
    password: str

@app.post("/api/login")
async def login_handler(data: LoginRequest):
    if data.userId == VALID_ID and data.password == VALID_PW:
        return JSONResponse(content={"message": "로그인 성공", "token": "mock-jwt-token"}, status_code=200)
    else:
        return JSONResponse(content={"message": "아이디 또는 비밀번호가 잘못되었습니다."}, status_code=401)

# 선택사항: 루트 헬스 체크
@app.get("/")
def root():
    return {"status": "mock login server running"}

# 실행
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
