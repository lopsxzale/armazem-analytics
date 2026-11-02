"""Baixa os dados abertos usados no projeto para data/raw/.

Fonte: Montgomery County (MD, EUA) - Warehouse and Retail Sales
https://data.montgomerycountymd.gov/d/v76h-r7br

Uso: python src/extract.py
"""

from pathlib import Path

import requests

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

MONTGOMERY_URL = "https://data.montgomerycountymd.gov/api/views/v76h-r7br/rows.csv?accessType=DOWNLOAD"
MONTGOMERY_FILE = RAW_DIR / "montgomery_warehouse_retail_sales.csv"


def download(url: str, dest: Path, chunk_size: int = 1 << 20) -> Path:
    """Baixa `url` para `dest` em streaming e devolve o caminho salvo."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in resp.iter_content(chunk_size):
                f.write(chunk)
    tmp.replace(dest)
    return dest


def main() -> None:
    path = download(MONTGOMERY_URL, MONTGOMERY_FILE)
    size_mb = path.stat().st_size / 1e6
    print(f"Montgomery salvo em {path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
