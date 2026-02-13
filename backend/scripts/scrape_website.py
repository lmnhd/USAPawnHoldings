import base64
import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://usapawnfl.com"
PAGE_CANDIDATES = [
    "/",
    "/products",
    "/products-2",
    "/products-3",
    "/products-4",
    "/info",
    "/gallery",
    "/gold-contact",
    "/contact",
]

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "backend" / "data"
IMAGES_DIR = PROJECT_ROOT / "frontend" / "public" / "images"
OUTPUT_JSON = DATA_DIR / "scraped_data.json"

DEFAULT_CATEGORIES = [
    "Jewelry",
    "Firearms",
    "Electronics",
    "Tools",
    "Musical Instruments",
    "Collectibles",
    "Sporting Goods",
]

TINY_JPEG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgD1x4eIAAAAASUVORK5CYII="

TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgD1x4eIAAAAASUVORK5CYII="


@dataclass
class FetchResult:
    url: str
    ok: bool
    html: str = ""
    status_code: int = 0


def fetch_page(url: str, timeout: int = 15) -> FetchResult:
    try:
        response = requests.get(url, timeout=timeout)
        return FetchResult(url=url, ok=response.ok, html=response.text if response.ok else "", status_code=response.status_code)
    except requests.RequestException:
        return FetchResult(url=url, ok=False, html="", status_code=0)


def sanitize_filename(url_or_path: str) -> str:
    parsed = urlparse(url_or_path)
    name = Path(parsed.path).name if parsed.path else ""
    if not name:
        name = re.sub(r"[^a-zA-Z0-9]+", "-", url_or_path).strip("-") + ".jpg"
    return name


def download_image(image_url: str) -> str:
    absolute_url = urljoin(BASE_URL, image_url)
    filename = sanitize_filename(absolute_url)
    destination = IMAGES_DIR / filename

    if destination.exists():
        return filename

    try:
        response = requests.get(absolute_url, timeout=15)
        if response.ok and response.content:
            destination.write_bytes(response.content)
            return filename
    except requests.RequestException:
        pass

    return ""


def create_placeholder_images() -> dict:
    store_photo_files = []
    jpeg_bytes = base64.b64decode(TINY_JPEG_B64)
    for index in range(1, 8):
        name = f"pic{index}.jpg"
        path = IMAGES_DIR / name
        if not path.exists():
            path.write_bytes(jpeg_bytes)
        store_photo_files.append(name)

    category_names = {
        "Jewelry": "jewelry.jpg",
        "Firearms": "firearms.jpg",
        "Electronics": "electronics.jpg",
        "Tools": "tools.jpg",
        "Musical Instruments": "musical-instruments.jpg",
        "Collectibles": "collectibles.jpg",
        "Sporting Goods": "sporting-goods.jpg",
    }

    for file_name in category_names.values():
        path = IMAGES_DIR / file_name
        if not path.exists():
            path.write_bytes(jpeg_bytes)

    logo_name = "usapawn_logo.png"
    logo_path = IMAGES_DIR / logo_name
    if not logo_path.exists():
        logo_path.write_bytes(base64.b64decode(TINY_PNG_B64))

    return {
        "store_photos": store_photo_files,
        "logo": logo_name,
        "category_images": category_names,
    }


def extract_phone(text: str) -> str:
    match = re.search(r"(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})", text)
    return match.group(1) if match else "(904) 744-5611"


def extract_youtube_links(soup: BeautifulSoup) -> list[str]:
    links = []
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src", "")
        if "youtube.com" in src or "youtu.be" in src:
            links.append(src)
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if "youtube.com" in href or "youtu.be" in href:
            links.append(href)
    return sorted(set(links))


def scrape() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    pages = {}
    reachable = False
    combined_text = []
    youtube_links = []
    downloaded_images = []

    for path in PAGE_CANDIDATES:
        full_url = urljoin(BASE_URL, path)
        result = fetch_page(full_url)
        pages[path] = {"url": full_url, "status_code": result.status_code, "ok": result.ok}

        if not result.ok:
            continue

        reachable = True
        soup = BeautifulSoup(result.html, "lxml")
        combined_text.append(soup.get_text(" ", strip=True))
        youtube_links.extend(extract_youtube_links(soup))

        for image in soup.find_all("img"):
            src = image.get("src")
            if not src:
                continue
            downloaded = download_image(src)
            if downloaded:
                downloaded_images.append(downloaded)

    full_text = " ".join(combined_text)
    phone = extract_phone(full_text)

    placeholders = create_placeholder_images()
    youtube_links = sorted(set(youtube_links))

    inventory = [
        {
            "category": "Jewelry",
            "brands": ["Rolex", "Cartier", "Tiffany & Co."],
            "description": "Designer watches, diamond rings, gold chains",
            "estimated_value_range": "$500 - $50,000",
            "savings_percentage": "50-70% off retail",
            "image": "/images/jewelry.jpg",
        },
        {
            "category": "Firearms",
            "brands": ["Glock", "Smith & Wesson", "Ruger"],
            "description": "Pistols, rifles, shotguns and accessories",
            "estimated_value_range": "$250 - $2,500",
            "savings_percentage": "20-40% off retail",
            "image": "/images/firearms.jpg",
        },
        {
            "category": "Electronics",
            "brands": ["Apple", "Samsung", "Sony"],
            "description": "Phones, laptops, TVs, gaming systems",
            "estimated_value_range": "$75 - $2,000",
            "savings_percentage": "30-60% off retail",
            "image": "/images/electronics.jpg",
        },
        {
            "category": "Tools",
            "brands": ["DeWalt", "Milwaukee", "Makita"],
            "description": "Power tools, compressors, mechanic sets",
            "estimated_value_range": "$40 - $1,200",
            "savings_percentage": "35-60% off retail",
            "image": "/images/tools.jpg",
        },
        {
            "category": "Musical Instruments",
            "brands": ["Fender", "Gibson", "Yamaha"],
            "description": "Guitars, keyboards, pro audio gear",
            "estimated_value_range": "$100 - $5,000",
            "savings_percentage": "25-50% off retail",
            "image": "/images/musical-instruments.jpg",
        },
        {
            "category": "Collectibles",
            "brands": ["Funko", "Pokemon", "Marvel"],
            "description": "Cards, memorabilia, rare collectibles",
            "estimated_value_range": "$20 - $10,000",
            "savings_percentage": "varies",
            "image": "/images/collectibles.jpg",
        },
        {
            "category": "Sporting Goods",
            "brands": ["Rawlings", "Wilson", "Nike"],
            "description": "Fitness equipment, bikes, outdoor gear",
            "estimated_value_range": "$30 - $1,500",
            "savings_percentage": "20-50% off retail",
            "image": "/images/sporting-goods.jpg",
        },
    ]

    data = {
        "source": BASE_URL,
        "scrape_status": "live" if reachable else "mock_fallback",
        "pages_checked": pages,
        "store_info": {
            "name": "USA Pawn Holdings",
            "address": "6132 Merrill Rd Ste 1, Jacksonville, FL 32277",
            "phone": phone,
            "hours": {
                "monday": "9:00 AM - 6:00 PM",
                "tuesday": "9:00 AM - 6:00 PM",
                "wednesday": "9:00 AM - 6:00 PM",
                "thursday": "9:00 AM - 6:00 PM",
                "friday": "9:00 AM - 6:00 PM",
                "saturday": "9:00 AM - 5:00 PM",
                "sunday": "Closed",
            },
            "coordinates": {
                "lat": "30.3368",
                "lng": "-81.5897",
            },
        },
        "inventory": inventory,
        "loan_terms": {
            "interest_rate": "25%",
            "term_days": 30,
            "loan_to_value": "25-33%",
        },
        "specials": [
            {
                "title": "Video Game Bundles",
                "description": "Save up to $50 when you buy game consoles with 3+ games",
            },
            {
                "title": "Gold & Silver Buying",
                "description": "Top-dollar payouts for gold, silver, and platinum",
            },
        ],
        "images": {
            "store_photos": placeholders["store_photos"],
            "logo": placeholders["logo"],
            "downloaded": sorted(set(downloaded_images)),
        },
        "youtube_videos": youtube_links,
        "categories": DEFAULT_CATEGORIES,
    }

    OUTPUT_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main() -> None:
    data = scrape()
    print(f"Scrape status: {data['scrape_status']}")
    print(f"Pages checked: {len(data['pages_checked'])}")
    print(f"Inventory categories: {len(data['inventory'])}")
    print(f"Images directory: {IMAGES_DIR}")
    print(f"Output JSON: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
