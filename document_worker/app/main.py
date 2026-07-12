import os
import json
import io
import time
import re
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import google.generativeai as genai

app = FastAPI(title="IMOBZY Document Intelligence Worker")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "http://api:3002/api/documents/webhook/worker-result")
DOCUMENT_WEBHOOK_SECRET = os.getenv("DOCUMENT_WEBHOOK_SECRET", "")

DOCUMENT_TYPES = ["ESCRITURA", "MATRICULA", "CAR", "CCIR", "ITR", "IPTU", "CONTRATO", "CND", "OUTRO"]

EXTRACTION_SCHEMAS = {
    "CAR": ["codigo", "situacao", "area_ha", "reserva_legal_pct", "app_pct", "proprietario", "municipio", "uf"],
    "ESCRITURA": ["comprador", "vendedor", "valor", "data", "cartorio", "livro", "folha", "matricula"],
    "MATRICULA": ["numero", "cartorio", "comarca", "area", "proprietario", "registro_anterior", "data_atualizacao"],
    "CCIR": ["codigo", "situacao", "area", "ano_exercicio"],
    "ITR": ["nirf", "situacao", "area_declarada", "valor_da_terra_nua"],
    "IPTU": ["inscricao", "valor_venal", "area_terreno", "area_construida", "situacao"],
    "CONTRATO": ["locador", "locatario", "valor", "vigencia_inicio", "vigencia_fim", "tipo"],
    "CND": ["tipo_certidao", "cpf_cnpj", "validade", "situacao"],
}

class ExtractRequest(BaseModel):
    document_id: str
    file_url: str
    organization_id: str = None

class ExtractResponse(BaseModel):
    document_id: str
    document_type: str
    classification_confidence: float
    raw_text: str
    ocr_confidence: float
    extracted_data: dict
    extraction_confidence: float
    alternatives: list
    processing_time_ms: int

@app.get("/health")
async def health():
    return {"status": "ok", "service": "document-worker"}

@app.post("/document/extract", response_model=ExtractResponse)
async def extract_document(req: ExtractRequest):
    start_time = time.time()

    try:
        file_response = requests.get(req.file_url, timeout=60)
        file_response.raise_for_status()
        contents = file_response.content
        content_type = file_response.headers.get("content-type", "application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch file: {str(e)}")

    ocr_text = ""
    ocr_conf = 0.0

    try:
        if "pdf" in content_type:
            images = convert_from_bytes(contents, dpi=300)
            texts = []
            for img in images:
                text = pytesseract.image_to_string(img, lang="por")
                texts.append(text)
            ocr_text = "\n".join(texts)
            ocr_conf = 0.7 if len(ocr_text) > 50 else 0.3
        else:
            img = Image.open(io.BytesIO(contents))
            ocr_text = pytesseract.image_to_string(img, lang="por")
            ocr_conf = 0.75 if len(ocr_text) > 50 else 0.35
    except Exception as e:
        ocr_text = ""
        ocr_conf = 0.0

    if not ocr_text.strip():
        ocr_text = "OCR nao conseguiu extrair texto do documento."
        ocr_conf = 0.05

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    classify_prompt = f"""Classifique este documento entre as opcoes:
{', '.join(DOCUMENT_TYPES)}

Responda APENAS JSON:
{{"document_type": "TIPO", "confidence": 0.0-1.0, "alternatives": ["alt1", "alt2"]}}

Texto do documento:
{ocr_text[:4000]}"""

    classification_raw = model.generate_content(classify_prompt)
    classification = _parse_json(classification_raw.text)
    doc_type = classification.get("document_type", "OUTRO")
    class_conf = classification.get("confidence", 0.5)
    alternatives = classification.get("alternatives", [])

    fields = EXTRACTION_SCHEMAS.get(doc_type, ["conteudo"])
    extract_prompt = f"""Extraia os campos abaixo deste documento brasileiro.

Campos a extrair: {', '.join(fields)}

Responda APENAS JSON com os campos encontrados. Se nao encontrar um campo, use null.
Inclua um campo "_confidence" (0-1) indicando sua confianca na extracao.

Texto do documento:
{ocr_text[:6000]}"""

    extraction_raw = model.generate_content(extract_prompt)
    extracted = _parse_json(extraction_raw.text)
    extraction_conf = extracted.pop("_confidence", 0.5) if isinstance(extracted, dict) else 0.5

    if not isinstance(extracted, dict):
        extracted = {"conteudo_extraido": str(extracted)}

    elapsed_ms = int((time.time() - start_time) * 1000)

    result_dict = {
        "document_id": req.document_id,
        "document_type": doc_type,
        "classification_confidence": class_conf,
        "raw_text": ocr_text[:10000],
        "ocr_confidence": ocr_conf,
        "extracted_data": extracted,
        "extraction_confidence": extraction_conf,
        "alternatives": alternatives,
        "processing_time_ms": elapsed_ms,
    }

    result = ExtractResponse(**result_dict)

    try:
        headers = {}
        if DOCUMENT_WEBHOOK_SECRET:
            headers["x-document-webhook-secret"] = DOCUMENT_WEBHOOK_SECRET

        requests.post(WEBHOOK_URL, json={
            "document_id": req.document_id,
            "result": result_dict,
        }, headers=headers, timeout=10)
    except Exception as e:
        print(f"[Worker] Webhook failed: {e}")

    return result

@app.post("/document/extract-sync")
async def extract_document_sync(req: ExtractRequest):
    return await extract_document(req)

def _parse_json(text):
    text = re.sub(r"```json|```", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {"error": "failed to parse", "raw": text[:500]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
