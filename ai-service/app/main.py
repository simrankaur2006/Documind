import io, os, re
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

load_dotenv()
app = FastAPI(title="DocuMind AI service")

API_KEY = os.getenv("AI_SERVICE_KEY", "")
LLM_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
LLM_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
EMB_URL = os.getenv("EMBEDDING_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai").rstrip("/")
EMB_KEY = os.getenv("EMBEDDING_API_KEY", "")
EMB_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
EMB_DIM = int(os.getenv("EMBEDDING_DIM", "768"))
MAX_BYTES = 10 * 1024 * 1024

SYSTEM_PROMPT = (
    "You are DocuMind AI, an assistant that answers strictly from the provided document context.\n"
    "Rules:\n- Use ONLY the context. Never use outside knowledge and never invent facts or citations.\n"
    "- If the context does not contain the answer, reply exactly: "
    "\"I couldn't find enough information in your documents to answer this confidently.\"\n"
    "- Be concise but useful. Use Markdown. Refer to sources as [1], [2] matching the context labels."
)


def check_key(key: str | None):
    if API_KEY and key != API_KEY:
        raise HTTPException(401, "Unauthorized")


def split_text(text: str, size: int = 1000, overlap: int = 150):
    text = re.sub(r"\s+", " ", text).strip()
    out, i = [], 0
    while i < len(text):
        out.append(text[i : i + size])
        i += size - overlap
    return out


async def embed_texts(texts: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    try:
        async with httpx.AsyncClient(timeout=90) as c:
            for i in range(0, len(texts), 32):
                r = await c.post(
                    f"{EMB_URL}/embeddings",
                    headers={"Authorization": f"Bearer {EMB_KEY}"},
                    json={"model": EMB_MODEL, "input": texts[i : i + 32], "dimensions": EMB_DIM},
                )
                r.raise_for_status()
                out += [d["embedding"] for d in r.json()["data"]]
    except (httpx.HTTPError, KeyError):
        raise HTTPException(502, "Embedding provider request failed")
    return out


def extract_pages(name: str, data: bytes) -> list[tuple[int, str]]:
    ext = name.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        from pypdf import PdfReader
        return [(i + 1, p.extract_text() or "") for i, p in enumerate(PdfReader(io.BytesIO(data)).pages)]
    if ext == "docx":
        from docx import Document
        return [(1, "\n".join(p.text for p in Document(io.BytesIO(data)).paragraphs))]
    if ext == "txt":
        return [(1, data.decode("utf-8", errors="ignore"))]
    raise HTTPException(400, "Unsupported file type")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ingest")
async def ingest(file: UploadFile = File(...), x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large")
    try:
        pages = extract_pages(file.filename or "", data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Could not read this file. It may be corrupted or password-protected.")
    chunks = []
    for page_no, text in pages:
        for part in split_text(text):
            chunks.append({"content": part, "page": page_no})
    if not chunks:
        raise HTTPException(422, "No extractable text found (scanned PDFs need OCR).")
    embeddings = await embed_texts([c["content"] for c in chunks])
    for c, e in zip(chunks, embeddings):
        c["embedding"] = e
    return {"chunks": chunks, "pages": len(pages), "chars": sum(len(c["content"]) for c in chunks)}


class EmbedReq(BaseModel):
    texts: list[str]


@app.post("/embed")
async def embed(req: EmbedReq, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    return {"embeddings": await embed_texts(req.texts)}


class AnswerReq(BaseModel):
    question: str
    contexts: list[dict]  # {label, source, page, content}
    history: list[dict] = []


@app.post("/answer")
async def answer(req: AnswerReq, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    context = "\n\n".join(
        f"[{c['label']}] {c['source']}" + (f" (page {c['page']})" if c.get("page") else "") + f"\n{c['content']}"
        for c in req.contexts
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m["role"], "content": m["content"][:2000]} for m in req.history]
    messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion: {req.question}"})
    try:
        async with httpx.AsyncClient(timeout=90) as c:
            r = await c.post(
                f"{LLM_URL}/chat/completions",
                headers={"Authorization": f"Bearer {LLM_KEY}"},
                json={"model": LLM_MODEL, "messages": messages, "temperature": 0.2},
            )
            r.raise_for_status()
            return {"answer": r.json()["choices"][0]["message"]["content"].strip()}
    except (httpx.HTTPError, KeyError, IndexError):
        raise HTTPException(502, "LLM provider request failed")
