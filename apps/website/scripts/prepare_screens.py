"""Prepare the real app screenshots for the website.

- Phone captures (Android): the system status bar is painted over with a clean,
  consistent one (9:41 · signal · wifi · battery) and the gesture pill is removed.
- Tablet and web captures are converted as-is.
- Everything is written as WebP to src/assets/screens/{mobile,tablet,web}/ with tidy names.
The original screenshot folders are never modified.

Run: python3 scripts/prepare_screens.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC_MOBILE = ROOT / "Nirmansite_tab_Screens"
SRC_WEB = ROOT / "nirmansite-webapp-screenshots"
OUT = ROOT / "src" / "assets" / "screens"
FONT = ROOT / "scripts" / "Manrope-SemiBold.ttf"
INK = (32, 24, 18)

MOBILE = {
    "wokers_listing.png": "workers-listing",
    "add_new_worker.png": "add-worker",
    "attendance.png": "attendance",
    "mark_abscent.png": "mark-absent",
    "record_kharchi.png": "record-kharchi",
    "kharchi_adjustment.png": "kharchi-adjustment",
    "wages.png": "wages",
    "wages_batch_details.png": "wages-batch",
    "project_progress.png": "project-progress",
    "language.jpeg": "language",
    "sales.png": "sales-leads",
    "sales_add_new_lead.png": "sales-add-lead",
    "sales_lead_details.png": "sales-lead-details",
    "sales_followups.png": "sales-followups",
    "sales_site_visits.png": "sales-site-visits",
    "sales_bookings_listing.png": "sales-bookings",
    "sales_booking_details.png": "sales-booking-details",
    "Unit_inventory.png": "unit-inventory",
}
TABLET = {
    "dashboard_marketing.jpg": "dashboard",
    "attendance_marketing.jpg": "attendance",
    "worker_detail_marketing.jpg": "worker-detail",
    "kharchi_detail_marketing.jpg": "kharchi-detail",
    "wages_marketing.jpg": "wages",
    "Expenses_marketing.jpg": "expenses",
    "meterials_marketing.jpg": "materials",
    "progress_marketing.jpg": "progress",
    "sales_marketing.jpg": "sales",
}
WEB = {
    "dashboard.png": "dashboard",
    "attendacne.png": "attendance",
    "kharchi.png": "kharchi",
    "materials.png": "materials",
    "wages.png": "wages",
}


def erase_dark_marks(band: Image.Image, size: int) -> Image.Image:
    """Remove dark glyphs (status icons, gesture pill) from a light, smooth background band."""
    closed = band.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    a = np.asarray(band).astype(np.int16)
    c = np.asarray(closed).astype(np.int16)
    darker = (c - a).max(axis=2) > 14
    mask = Image.fromarray((darker * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))
    return Image.composite(closed, band, mask)


def draw_status_bar(img: Image.Image, bar_h: int) -> None:
    """Draw a clean status bar at 3x and composite it down (anti-aliased)."""
    w = img.width
    k = 3
    layer = Image.new("RGBA", (w * k, bar_h * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = w / 1080 * k  # scale unit
    cy = bar_h * k * 0.52
    font = ImageFont.truetype(str(FONT), int(40 * s))
    d.text((66 * s, cy), "9:41", font=font, fill=INK + (255,), anchor="lm")
    # battery
    bx, bw, bh = w * k - 60 * s - 58 * s, 58 * s, 28 * s
    d.rounded_rectangle([bx, cy - bh / 2, bx + bw, cy + bh / 2], radius=8 * s, outline=INK + (150,), width=int(3 * s))
    d.rounded_rectangle([bx + 5 * s, cy - bh / 2 + 5 * s, bx + 5 * s + (bw - 10 * s) * 0.8, cy + bh / 2 - 5 * s], radius=4 * s, fill=INK + (255,))
    d.rounded_rectangle([bx + bw + 3 * s, cy - 6 * s, bx + bw + 8 * s, cy + 6 * s], radius=2 * s, fill=INK + (150,))
    # wifi (three arcs + dot)
    wx = bx - 30 * s
    for i, r in enumerate((30, 20, 10)):
        rr = r * s
        d.arc([wx - rr, cy + 12 * s - rr, wx + rr, cy + 12 * s + rr], 225, 315, fill=INK + (255,), width=int(5.5 * s))
    d.ellipse([wx - 4 * s, cy + 8 * s, wx + 4 * s, cy + 16 * s], fill=INK + (255,))
    # signal bars
    sx = wx - 44 * s - 66 * s
    for i in range(4):
        h = (9 + i * 7) * s
        x0 = sx + i * 16 * s
        d.rounded_rectangle([x0, cy + 14 * s - h, x0 + 11 * s, cy + 14 * s], radius=2.5 * s, fill=INK + (255,))
    small = layer.resize((w, bar_h), Image.LANCZOS)
    img.alpha_composite(small, (0, 0))


# Demo customer phone numbers / emails that must not appear on a public site (x0, y0, x1, y1 in capture pixels)
PRIVATE = {
    "sales-leads": [(80, 1290, 300, 1346), (80, 1630, 300, 1686)],
    "sales-lead-details": [(80, 945, 300, 1005), (600, 1060, 1000, 1125)],
    "sales-booking-details": [(720, 1405, 975, 1470)],
}


def blur_private(img: Image.Image, name: str) -> None:
    for box in PRIVATE.get(name, []):
        region = img.crop(box).filter(ImageFilter.GaussianBlur(11))
        img.paste(region, box[:2])


def mobile(src: Path, name: str) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    u = w / 1080
    bar_h = round(90 * u)
    top = img.crop((0, 0, w, bar_h)).convert("RGB")
    img.paste(erase_dark_marks(top, 31 if u == 1 else 21), (0, 0))
    draw_status_bar(img, bar_h)
    pill_h = round(66 * u)
    x0, x1 = round(300 * u), round(780 * u)
    bottom = img.crop((x0, h - pill_h, x1, h)).convert("RGB")
    img.paste(erase_dark_marks(bottom, 21), (x0, h - pill_h))
    blur_private(img, name)
    save(img.convert("RGB"), OUT / "mobile" / f"{name}.webp", 90)


def save(img: Image.Image, path: Path, q: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=q, method=6)
    print(f"  {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    print("mobile:")
    for f, n in MOBILE.items():
        mobile(SRC_MOBILE / f, n)
    print("tablet:")
    for f, n in TABLET.items():
        save(Image.open(SRC_MOBILE / f).convert("RGB"), OUT / "tablet" / f"{n}.webp", 88)
    print("web:")
    # Full-page captures from a 1920x911 viewport: the 310px sidebar is fixed and the 60px top bar
    # sticks, so they are split out and only the body scrolls inside the laptop frame on the site.
    SIDE_W, VIEW_H, TOP_H, LAPTOP_H = 310, 911, 60, 1200
    for f, n in WEB.items():
        img = Image.open(SRC_WEB / f).convert("RGB")
        save(img, OUT / "web" / f"{n}.webp", 90)
        side = Image.new("RGB", (SIDE_W, LAPTOP_H), img.getpixel((3, VIEW_H - 20)))
        side.paste(img.crop((0, 0, SIDE_W, VIEW_H)), (0, 0))
        save(side, OUT / "web" / f"{n}-side.webp", 90)
        save(img.crop((SIDE_W, 0, img.width, TOP_H)), OUT / "web" / f"{n}-top.webp", 90)
        save(img.crop((SIDE_W, TOP_H, img.width, img.height)), OUT / "web" / f"{n}-body.webp", 90)
