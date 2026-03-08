from fastapi import Header, HTTPException
from typing import Optional


def require_user(x_user_email: Optional[str] = Header(default=None, alias="X-User-Email")) -> str:
    """MVP auth boundary.

    The Next.js app (via NextAuth) will later call backend routes with this header.
    For now, we just enforce presence and return the email as the user identity.
    """

    if not x_user_email:
        raise HTTPException(status_code=401, detail="Missing X-User-Email")

    return x_user_email.strip().lower()
