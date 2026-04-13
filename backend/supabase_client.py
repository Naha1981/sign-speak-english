import os
from typing import Dict, List

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

SERVICE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

ANON_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def get_auth_headers(token: str) -> Dict[str, str]:
    return {
        **ANON_HEADERS,
        "Authorization": f"Bearer {token}",
    }


def query_table(table: str, filters: dict = None) -> List[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    if filters:
        for k, v in filters.items():
            params[k] = f"eq.{v}"
    resp = requests.get(url, headers=SERVICE_HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def insert_row(table: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=SERVICE_HEADERS, json=data, timeout=15)
    resp.raise_for_status()
    return resp.json()


def update_row(table: str, row_id: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"id": "eq." + row_id}
    resp = requests.patch(url, headers=SERVICE_HEADERS, json=data, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()
