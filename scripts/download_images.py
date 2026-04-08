#!/usr/bin/env python3

import json
import mimetypes
import pathlib
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parent.parent
QUIZ_DB_PATH = ROOT / "public" / "data" / "angfa-quiz-db.json"
IMAGE_DIR = ROOT / "public" / "assets" / "products"
TIMEOUT_SECONDS = 30


def extension_from_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    suffix = pathlib.Path(parsed.path).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
      return suffix
    return ".jpg"


def extension_from_response(response, fallback: str) -> str:
    content_type = response.headers.get_content_type()
    guessed = mimetypes.guess_extension(content_type)
    if guessed == ".jpe":
        return ".jpg"
    if guessed == ".bin":
        return fallback
    return guessed or fallback


def download(url: str, destination: pathlib.Path) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        fallback = extension_from_url(url)
        actual_extension = extension_from_response(response, fallback)
        final_path = destination.with_suffix(actual_extension)
        final_path.write_bytes(response.read())
    return final_path.name


def main() -> None:
    payload = json.loads(QUIZ_DB_PATH.read_text())
    items = payload["items"]
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = []

    for item in items:
        source_url = item.get("source_image_url") or item.get("image_url")
        if not source_url:
            failed.append({"id": item["id"], "reason": "missing image url"})
            continue

        item["source_image_url"] = source_url
        basename = item["product_code"]
        existing_files = list(IMAGE_DIR.glob(f"{basename}.*"))
        if existing_files:
            item["image_url"] = f"./public/assets/products/{existing_files[0].name}"
            skipped += 1
            continue

        try:
            filename = download(source_url, IMAGE_DIR / basename)
            item["image_url"] = f"./public/assets/products/{filename}"
            downloaded += 1
        except urllib.error.URLError as exc:
            failed.append({"id": item["id"], "reason": str(exc)})
        except TimeoutError as exc:
            failed.append({"id": item["id"], "reason": str(exc)})

    payload["local_image_summary"] = {
        "downloaded": downloaded,
        "skipped_existing": skipped,
        "failed": len(failed),
    }
    if failed:
        payload["local_image_failures"] = failed

    QUIZ_DB_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(
        json.dumps(
            {
                "downloaded": downloaded,
                "skipped_existing": skipped,
                "failed": len(failed),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
