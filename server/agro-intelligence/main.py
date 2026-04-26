from fastapi import FastAPI, HTTPException
from agrobr import cepea, ibge
import pandas as pd
from typing import List, Optional
import uvicorn
from datetime import datetime

app = FastAPI(title="IMOBZY Agro-Intelligence Microservice")

@app.get("/")
async def root():
    return {"status": "online", "service": "agro-intelligence"}

@app.get("/prices")
async def get_latest_prices():
    """
    Busca os últimos preços disponíveis no CEPEA para os principais produtos.
    """
    products = ['soja', 'milho', 'boi_gordo', 'cafe', 'trigo']
    results = {}
    
    try:
        for product in products:
            latest = await cepea.ultimo(product)
            results[product] = {
                "valor": latest.valor,
                "unidade": "sc" if product != 'boi_gordo' else 'arroba',
                "data": latest.data,
                "moeda": "BRL"
            }
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/production/municipality/{ibge_code}")
async def get_municipal_production(ibge_code: str, year: Optional[int] = 2023):
    """
    Busca a produção agrícola municipal (IBGE PAM) para uma localidade.
    """
    try:
        # Puxa os top 5 produtos do município
        df = await ibge.pam(ano=year, nivel='municipio')
        
        # Filtra pelo código do IBGE (requer que a agrobr retorne o código ou localidade)
        # Nota: Normalmente passamos o nome ou o código dependendo da versão da agrobr
        # Para este MVP, simulamos o filtro no DataFrame
        
        # Como o DF pode ser grande, em prod usaríamos cache ou parâmetros de query
        municipality_data = df[df['localidade'].str.contains(ibge_code, case=False, na=False)]
        
        if municipality_data.empty:
            return {"success": False, "message": "Município não encontrado ou sem dados para o ano."}

        top_products = municipality_data.sort_values(by='valor_producao', ascending=False).head(5)
        
        return {
            "success": True, 
            "municipality": ibge_code,
            "year": year,
            "data": top_products.to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/environmental")
async def analyze_environmental_risk(geometry: dict):
    """
    Realiza cruzamento da geometria enviada com os dados de 
    Desmatamento (PRODES) e Alertas (DETER) do INPE via agrobr.
    """
    try:
        from agrobr import inpe
        
        # O motor da agrobr aceita GeoJSON ou Polígonos
        # Aqui simulamos a chamada para os datasets do INPE
        # Em uma implementação real, a agrobr faz a requisição espacial
        
        prodes_data = await inpe.prodes(geometry=geometry, inicio='2020-01-01')
        deter_alerts = await inpe.deter(geometry=geometry, ultimos_dias=90)
        
        risk_score = 0
        findings = []
        
        if not prodes_data.empty:
            risk_score += 40
            total_desmatado = prodes_data['area_km2'].sum()
            findings.append(f"Desmatamento histórico detectado: {total_desmatado:.2f} km² (PRODES)")
            
        if not deter_alerts.empty:
            risk_score += 50
            num_alertas = len(deter_alerts)
            findings.append(f"Alertas de desmatamento recentes: {num_alertas} (DETER - 90 dias)")

        status = "CRÍTICO" if risk_score >= 70 else "ATENÇÃO" if risk_score > 0 else "LIMPO"
        
        return {
            "success": True,
            "risk_score": risk_score,
            "status": status,
            "findings": findings,
            "details": {
                "prodes": prodes_data.to_dict(orient='records') if not prodes_data.empty else [],
                "deter": deter_alerts.to_dict(orient='records') if not deter_alerts.empty else []
            }
        }
    except Exception as e:
        # Fallback para caso a geometria seja inválida ou serviço offline
        return {"success": False, "error": str(e), "risk_score": 0, "status": "ERRO_ANALISE"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
