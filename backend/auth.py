from typing import List, Optional

import requests
from fastapi import Depends, Header, HTTPException

from supabase_client import SUPABASE_URL, get_auth_headers


def get_authorization_header(
    authorization: Optional[str] = Header(None),
) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization token")

    return token


def get_current_user(token: str = Depends(get_authorization_header)) -> dict:
    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers=get_auth_headers(token),
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Supabase auth token")

    return response.json()


def get_user_roles(token: str, user_id: str) -> List[str]:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.{user_id}",
        headers=get_auth_headers(token),
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=403, detail="Unable to fetch user roles")

    rows = response.json()
    return [row.get("role") for row in rows if row.get("role")]


def require_user(current_user: dict = Depends(get_current_user), token: str = Depends(get_authorization_header)) -> dict:
    roles = get_user_roles(token, current_user["id"])
    if not roles:
        raise HTTPException(status_code=403, detail="User does not have an assigned role")

    return {"user": current_user, "roles": roles}


def require_admin(auth_context: dict = Depends(require_user)) -> dict:
    if "admin" not in auth_context["roles"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth_context
