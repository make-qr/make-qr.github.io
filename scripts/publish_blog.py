#!/usr/bin/env python3
"""Generate Make QR blog posts and publish by schedule (Asia/Ho_Chi_Minh).

Usage:
  python3 scripts/publish_blog.py              # publish due posts + rebuild index/sitemap
  python3 scripts/publish_blog.py --generate   # (re)write all HTML from catalog
  python3 scripts/publish_blog.py --dry-run    # show what would publish today
  python3 scripts/publish_blog.py --as-of 2026-08-01
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "blog"
DRAFTS = BLOG / "drafts"
SITEMAP = ROOT / "sitemap.xml"
POSTS_JSON = BLOG / "posts.json"
TZ = ZoneInfo("Asia/Ho_Chi_Minh")
SITE = "https://make-qr.github.io"
CACHE = "20260724-2"

ICON = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    "%3Crect x='4' y='4' width='10' height='10' rx='2' fill='%231E40AF'/%3E"
    "%3Crect x='18' y='4' width='10' height='10' rx='2' fill='%231E40AF'/%3E"
    "%3Crect x='4' y='18' width='10' height='10' rx='2' fill='%231E40AF'/%3E"
    "%3Crect x='18' y='18' width='4' height='4' fill='%231E40AF'/%3E"
    "%3Crect x='24' y='18' width='4' height='4' fill='%231E40AF'/%3E"
    "%3Crect x='18' y='24' width='4' height='4' fill='%231E40AF'/%3E"
    "%3Crect x='24' y='24' width='4' height='4' fill='%231E40AF'/%3E%3C/svg%3E"
)


def d(iso: str) -> date:
    return date.fromisoformat(iso)


def fmt_human(iso: str) -> str:
    dt = d(iso)
    return dt.strftime(f"%b {dt.day}, %Y")


# ---------------------------------------------------------------------------
# Catalog: existing + Phase 1–3
# publish = first day the post should appear on index + sitemap
# ---------------------------------------------------------------------------

POSTS: list[dict] = [
    {
        "slug": "how-to-create-wifi-qr-code",
        "title": "How to create a WiFi QR code guests can scan in seconds",
        "description": "Create a free WiFi QR code with your SSID and password. Guests scan once to join — no signup, no watermark, static and private.",
        "category": "QR Code",
        "cta_label": "Open free WiFi QR generator →",
        "cta_href": "/",
        "read_min": 6,
        "keywords": ["wifi qr code", "qr code generator", "ssid qr", "guest wifi"],
        "publish": "2026-07-24",
        "related": [
            ("static-vs-dynamic-qr-codes.html", "Static vs dynamic QR codes"),
            ("how-to-create-vcard-qr-code.html", "How to create a vCard QR code"),
            ("/pages/scan-qr.html", "Scan a QR code online"),
        ],
        "body": """
<h2>What a WiFi QR code contains</h2>
<p>Phones that support WiFi QR codes read a short text string with the network name (SSID), password, encryption type (usually WPA/WPA2), and an optional hidden-network flag. Make QR builds a <strong>static</strong> code: those details live inside the image. There is no tracking redirect, no expiration date, and no embedded ads when someone scans it.</p>

<h2>Step-by-step on Make QR</h2>
<ol>
<li>Open the <a href="/">Make QR generator</a> and choose the <strong>WiFi</strong> type.</li>
<li>Enter the SSID exactly as it appears on your router or phone settings.</li>
<li>Enter the password and choose encryption (WPA/WPA2 for most home routers; “No password” only for open networks).</li>
<li>If the network is hidden, enable the hidden option.</li>
<li>Optionally adjust colors, frame or logo — keep dark modules on a light background.</li>
<li>Download the PNG and print it for your desk, reception counter or guest room.</li>
</ol>

<h2>iPhone and Android tips</h2>
<ul>
<li>Recent iOS and Android cameras open a “Join Wi‑Fi” prompt when they recognize the code.</li>
<li>If nothing happens, open the native Camera app (not a third-party scanner) and hold steady for a second.</li>
<li>Some corporate networks that need a portal login still require that extra step after joining.</li>
</ul>

<h2>Print checklist</h2>
<ul>
<li>Leave a quiet white margin around the code.</li>
<li>Do not shrink a dense WiFi code below about 2×2 cm for close scanning.</li>
<li>If you add a logo, use High (H) error correction and keep the logo small in the center.</li>
<li>Test with one Android and one iPhone before printing a batch.</li>
</ul>

<h2>When to regenerate</h2>
<p>Static WiFi codes do not expire, but they stop working if you change the password or SSID. Generate a new code, replace printed copies, and discard the old file so guests do not scan outdated credentials.</p>

<h2>Privacy</h2>
<p>Make QR creates the code in your browser. Your WiFi password is not uploaded to our servers for QR creation — useful for cafés, offices and home guest networks.</p>
""",
    },
    {
        "slug": "static-vs-dynamic-qr-codes",
        "title": "Static vs dynamic QR codes: which should you use?",
        "description": "Compare static and dynamic QR codes. Learn why static codes never expire, avoid ad redirects, and keep working without a paid subscription.",
        "category": "QR Code",
        "cta_label": "Create a static QR code free →",
        "cta_href": "/",
        "read_min": 6,
        "keywords": ["static qr code", "dynamic qr code", "qr code expire"],
        "publish": "2026-07-24",
        "related": [
            ("how-to-create-wifi-qr-code.html", "How to create a WiFi QR code"),
            ("best-qr-code-size-for-print.html", "Best QR code size for print"),
            ("/", "Free QR code generator"),
        ],
        "body": """
<h2>Static QR codes</h2>
<p>A static QR code stores the content directly in the pattern: a URL, WiFi credentials, vCard, email or plain text. The phone reads that content immediately — no middle server required.</p>
<ul>
<li><strong>Never expires</strong> because nothing depends on a subscription.</li>
<li><strong>No scan redirect</strong> between the camera and the destination.</li>
<li><strong>No embedded ads in the scan flow</strong> from the code itself.</li>
<li><strong>Private generation</strong> when you use a browser-side tool like Make QR.</li>
</ul>
<p>Trade-off: changing the destination later means printing a new code. That is fine for business cards, packaging, WiFi posters and menus that stay stable.</p>

<h2>Dynamic QR codes</h2>
<p>A dynamic QR code usually points at a short URL controlled by a vendor. That vendor redirects to your real destination and may track scans.</p>
<ul>
<li>You can edit the destination without reprinting.</li>
<li>You may get click analytics.</li>
<li>The code can fail if the plan expires or the service shuts down.</li>
<li>Some free dynamic tools insert ads or interstitial pages on scan.</li>
</ul>

<h2>Quick comparison</h2>
<table class="blog-table">
<thead><tr><th></th><th>Static</th><th>Dynamic</th></tr></thead>
<tbody>
<tr><td>Destination in the pattern</td><td>Yes</td><td>Usually no</td></tr>
<tr><td>Editable later</td><td>No</td><td>Yes</td></tr>
<tr><td>Depends on a paid service</td><td>No</td><td>Often</td></tr>
<tr><td>Ad redirect risk</td><td>None from the code</td><td>Possible</td></tr>
<tr><td>Best for</td><td>Print, WiFi, contacts, stable links</td><td>Campaigns that change often</td></tr>
</tbody>
</table>

<h2>When dynamic still makes sense</h2>
<p>Choose dynamic only if you must change destinations weekly, need vendor analytics, and accept the dependency. Read the terms carefully for ads, retention and what happens when billing stops.</p>

<h2>Recommendation</h2>
<p>For packaging, signs, guest WiFi and business cards, choose <strong>static</strong>. Make QR focuses on static codes so your content stays yours: free forever, no embedded ads in the scan path, no account required.</p>
""",
    },
    {
        "slug": "merge-pdf-without-signup",
        "title": "Merge PDF files in your browser without signup",
        "description": "Merge multiple PDF files in your browser without signup. Free, private, client-side PDF merger from Make QR.",
        "category": "PDF",
        "cta_label": "Open Merge PDF tool →",
        "cta_href": "/pages/merge-pdf.html",
        "read_min": 5,
        "keywords": ["merge pdf", "combine pdf", "pdf merger", "no signup pdf"],
        "publish": "2026-07-24",
        "related": [
            ("how-to-split-pdf.html", "Split a PDF into separate files"),
            ("reorder-pdf-pages.html", "Reorder PDF pages"),
            ("/pages/merge-pdf.html", "Merge PDF tool"),
        ],
        "body": """
<h2>Why merge in the browser?</h2>
<p>Many online PDF sites ask you to upload documents to a remote server. For a simple merge that is unnecessary. Make QR’s PDF tools combine pages in your browser session — no signup, no watermark, suitable for contracts, scans and travel packs.</p>

<h2>How to merge PDFs</h2>
<ol>
<li>Open the <a href="/pages/merge-pdf.html">Merge PDF</a> tool.</li>
<li>Drop or select two or more PDF files.</li>
<li>Reorder files if the final sequence matters.</li>
<li>Run merge and download the combined PDF.</li>
</ol>

<h2>Practical tips</h2>
<ul>
<li>Put cover pages or signature pages in the right order before merging.</li>
<li>Very large scanned PDFs take longer because processing uses your device CPU and RAM.</li>
<li>Rename the download before sharing so recipients know it is the final pack.</li>
<li>Close the tab when you finish with sensitive files.</li>
</ul>

<h2>Local processing vs upload services</h2>
<p>Upload-based mergers can be convenient on weak devices, but they send file contents to someone else’s servers. If the PDF includes IDs, payroll or medical pages, prefer a client-side tool and a trusted network.</p>

<h2>Related PDF tools</h2>
<ul>
<li><a href="/pages/split-pdf.html">Split PDF</a> into ranges or single pages</li>
<li><a href="/pages/rotate-pdf.html">Rotate PDF</a> pages that scanned sideways</li>
<li><a href="/pages/delete-pdf-pages.html">Delete PDF pages</a> you do not need</li>
<li><a href="/pages/organize-pdf.html">Organize PDF</a> to reorder everything cleanly</li>
</ul>
""",
    },
]

# Phase 1–3 new posts (publish schedule starts 2026-07-25)
NEW_POSTS_META = [
    # phase 1
    ("how-to-scan-qr-code-on-pc", "How to scan a QR code on PC (camera, paste, upload)", "Scan QR codes on your computer with camera, Ctrl+V paste, or image upload — free browser scanner from Make QR.", "QR Code", "Open QR scanner →", "/pages/scan-qr.html", 5, ["scan qr code", "qr scanner pc", "paste qr screenshot"], "2026-07-25", "QR Code"),
    ("how-to-make-qr-code-with-logo", "How to make a QR code with a logo that still scans", "Add a logo to a static QR code without breaking scans. Error correction, size and contrast tips from Make QR.", "QR Code", "Create QR with logo →", "/", 6, ["qr code with logo", "branded qr code"], "2026-07-26", "QR Code"),
    ("best-qr-code-size-for-print", "Best QR code size for print (business card, A4, poster)", "Recommended QR print sizes for business cards, flyers, A4 sheets and posters so phones can scan reliably.", "QR Code", "Generate print-ready QR →", "/", 5, ["qr code size", "qr print size", "business card qr"], "2026-07-27", "QR Code"),
    ("how-to-create-vcard-qr-code", "How to create a vCard QR code for business cards", "Encode name, phone, email and company into a vCard QR code for networking and printed cards.", "QR Code", "Create vCard QR →", "/", 5, ["vcard qr code", "contact qr code", "business card qr"], "2026-07-28", "QR Code"),
    ("how-to-split-pdf", "Split a PDF into separate files (step-by-step)", "Split a PDF into page ranges or separate files in your browser — free, private, no signup.", "PDF", "Open Split PDF →", "/pages/split-pdf.html", 5, ["split pdf", "separate pdf pages"], "2026-07-29", "PDF"),
    ("compress-jpg-without-ruining-quality", "Compress JPG without ruining quality", "Reduce JPG file size for email and web while keeping photos sharp enough — browser-side compression.", "Image", "Compress JPG free →", "/pages/compress-jpg.html", 5, ["compress jpg", "reduce jpg size"], "2026-07-30", "Image"),
    ("convert-images-to-webp", "Convert images to WebP for faster websites", "Convert PNG or JPG images to WebP in the browser to shrink assets for faster page loads.", "Image", "Convert to WebP →", "/pages/convert-to-webp.html", 5, ["convert to webp", "webp converter"], "2026-07-31", "Image"),
    ("how-to-test-microphone-in-browser", "How to test your microphone in the browser", "Check mic levels, permissions and left/right input before a call — free browser microphone test.", "Device Test", "Open microphone test →", "/pages/test-tools/microphone-test.html", 4, ["microphone test", "mic test online"], "2026-08-01", "Device Test"),
    # phase 2
    ("how-to-rotate-pdf-pages", "How to rotate PDF pages that scanned sideways", "Fix sideways or upside-down PDF pages in your browser without installing Acrobat.", "PDF", "Rotate PDF pages →", "/pages/rotate-pdf.html", 4, ["rotate pdf", "fix scanned pdf"], "2026-08-02", "PDF"),
    ("delete-pdf-pages-without-acrobat", "Delete pages from a PDF without Acrobat", "Remove unwanted PDF pages locally in Chrome or Edge — free and private.", "PDF", "Delete PDF pages →", "/pages/delete-pdf-pages.html", 4, ["delete pdf pages", "remove pdf pages"], "2026-08-03", "PDF"),
    ("extract-pdf-pages", "Extract selected PDF pages into a new file", "Save only the pages you need into a new PDF without uploading documents.", "PDF", "Extract PDF pages →", "/pages/extract-pdf-pages.html", 4, ["extract pdf pages", "save pdf pages"], "2026-08-04", "PDF"),
    ("reorder-pdf-pages", "Reorder PDF pages before you send a contract", "Drag pages into the right order, then download a clean PDF for signing or sharing.", "PDF", "Organize PDF →", "/pages/organize-pdf.html", 4, ["reorder pdf", "organize pdf pages"], "2026-08-05", "PDF"),
    ("png-vs-jpg-vs-webp", "PNG vs JPG vs WebP: which format should you use?", "Choose the right image format for photos, graphics and websites — with free conversion tools.", "Image", "Browse image tools →", "/pages/convert-to-webp.html", 6, ["png vs jpg", "webp vs png", "image format"], "2026-08-06", "Image"),
    ("how-to-create-email-sms-qr-code", "How to create an email or SMS QR code", "Pre-fill an email or text message with a static QR code for support desks and print materials.", "QR Code", "Create email/SMS QR →", "/", 4, ["email qr code", "sms qr code"], "2026-08-07", "QR Code"),
    ("qr-code-color-mistakes", "QR code color mistakes that break scanning", "Avoid low contrast, inverted colors and busy backgrounds that make QR codes unscannable.", "QR Code", "Design a scannable QR →", "/", 5, ["qr code color", "qr contrast", "qr not scanning"], "2026-08-08", "QR Code"),
    ("keyboard-test-checklist", "Keyboard test checklist before buying a used laptop", "Test every key, ghosting and stuck switches in the browser before you pay for a used laptop.", "Device Test", "Open keyboard test →", "/pages/test-keyboard/index.html", 4, ["keyboard test", "laptop keyboard check"], "2026-08-09", "Device Test"),
    # phase 3
    ("percentage-calculator-discounts-tips", "How to use a percentage calculator for discounts and tips", "Work out sale discounts, tip amounts and percentage change quickly with a free online calculator.", "Calculators", "Open percentage calculator →", "/calculators/percentage-calculator.html", 5, ["percentage calculator", "discount calculator", "tip calculator"], "2026-08-10", "Calculators"),
    ("loan-mortgage-payment-calculator", "Mortgage and loan payments explained with a free calculator", "Estimate monthly loan or mortgage payments and see how rate and term change the total.", "Calculators", "Open loan calculator →", "/calculators/loan-calculator.html", 6, ["loan calculator", "mortgage calculator", "monthly payment"], "2026-08-11", "Calculators"),
    ("bmi-calculator-meaning", "BMI calculator: what the number means (and what it doesn’t)", "Use a free BMI calculator responsibly — understand categories and the limits of BMI as a health signal.", "Calculators", "Open BMI calculator →", "/calculators/bmi-calculator.html", 5, ["bmi calculator", "body mass index"], "2026-08-12", "Calculators"),
    ("scientific-calculator-deg-rad-tips", "Scientific calculator online: DEG/RAD and expression tips", "Use DEG vs RAD correctly, edit expressions with a cursor, and calculate trig and logs in the browser.", "Calculators", "Open scientific calculator →", "/calculators/scientific-calculator.html", 5, ["scientific calculator", "deg rad", "online calculator"], "2026-08-13", "Calculators"),
    ("device-checks-before-meeting", "Webcam, speaker and dead-pixel checks before a meeting", "Run a quick device checklist in your browser so your next video call starts without surprises.", "Device Test", "Open device tests →", "/pages/test-tools/index.html", 4, ["webcam test", "speaker test", "dead pixel test"], "2026-08-14", "Device Test"),
]


BODIES: dict[str, str] = {
    "how-to-scan-qr-code-on-pc": """
<h2>Three ways to scan on a computer</h2>
<p>Make QR’s <a href="/pages/scan-qr.html">QR scanner</a> works in a desktop browser. You can use a webcam, paste a screenshot, or upload an image file — useful when the code is on another monitor or in a PDF.</p>
<ol>
<li><strong>Camera</strong> — allow permission, point the webcam at the printed or on-screen code.</li>
<li><strong>Paste</strong> — capture the screen (<kbd>PrtSc</kbd> / screenshot tool), click the paste zone, then press <kbd>Ctrl</kbd>+<kbd>V</kbd> (Windows/Linux) or <kbd>⌘</kbd>+<kbd>V</kbd> (Mac).</li>
<li><strong>Upload</strong> — choose a PNG or JPG that contains the QR code.</li>
</ol>

<h2>Fix common permission issues</h2>
<ul>
<li>If the camera stays blank, check the site permission icon in the address bar and allow access.</li>
<li>Close other apps that lock the webcam (Zoom, Teams, OBS).</li>
<li>Use HTTPS or localhost; some browsers block camera on insecure contexts.</li>
</ul>

<h2>After you get a result</h2>
<p>Copy the decoded text from the result box. URLs can be opened carefully after you verify the domain. WiFi and contact payloads can be copied into your phone settings if the desktop OS does not act on them automatically.</p>
""",
    "how-to-make-qr-code-with-logo": """
<h2>Why logos need higher error correction</h2>
<p>Covering the center of a QR code removes data modules. Higher error correction (Quartile or High) adds redundancy so scanners can recover the missing pieces.</p>

<h2>Steps in Make QR</h2>
<ol>
<li>Open the <a href="/">generator</a> and enter your URL or text.</li>
<li>Open <strong>Design &amp; colors</strong> and upload a PNG, JPG or SVG logo.</li>
<li>Confirm error correction moves to a higher level when a logo is present.</li>
<li>Keep the logo small — roughly under 20% of the code area.</li>
<li>Download and test on a phone before printing.</li>
</ol>

<h2>Design rules that protect scans</h2>
<ul>
<li>Prefer a simple logo with transparent or light padding.</li>
<li>Do not cover the three large corner finder patterns.</li>
<li>Keep dark modules on a light background even with brand colors.</li>
<li>For tiny stickers, skip the logo and use color/frame branding instead.</li>
</ul>
""",
    "best-qr-code-size-for-print": """
<h2>Rule of thumb</h2>
<p>Larger viewing distance needs a larger code. As a starting point, use about 1 cm of QR width for every 10 cm of expected scan distance, then test in real lighting.</p>

<h2>Suggested sizes</h2>
<table class="blog-table">
<thead><tr><th>Use</th><th>Minimum QR size</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Business card</td><td>~2 × 2 cm</td><td>Keep quiet zone; avoid tiny logos</td></tr>
<tr><td>Flyer / A5</td><td>~2.5–3 cm</td><td>Works at arm’s length</td></tr>
<tr><td>A4 poster near desk</td><td>~4 cm</td><td>Increase if lighting is poor</td></tr>
<tr><td>Wall poster / window</td><td>6 cm+</td><td>Match hallway viewing distance</td></tr>
</tbody>
</table>

<h2>Export tips</h2>
<ul>
<li>Generate at 512×512 or 1024×1024 PNG for clean print scaling.</li>
<li>Do not stretch non-square; keep modules sharp.</li>
<li>Print a proof on the final paper stock — glossy glare can hurt scans.</li>
</ul>
""",
    "how-to-create-vcard-qr-code": """
<h2>What to include</h2>
<p>A vCard QR typically stores full name, organization, phone, email, website and address. Only include fields you are comfortable sharing when someone scans your card.</p>

<h2>Create one on Make QR</h2>
<ol>
<li>Open the <a href="/">generator</a> and choose <strong>vCard</strong>.</li>
<li>Fill in name and at least one phone or email.</li>
<li>Add company and website if useful for networking.</li>
<li>Style the code, download PNG, and place it on your business card layout.</li>
</ol>

<h2>Printing on cards</h2>
<ul>
<li>Keep the code at least ~2×2 cm.</li>
<li>Test with iOS and Android before ordering a print run.</li>
<li>If your details change often, print a short URL instead — or accept reprinting a new static code.</li>
</ul>
""",
    "how-to-split-pdf": """
<h2>When to split</h2>
<p>Use split when one PDF mixes unrelated sections, when email size limits block sending, or when a reviewer only needs selected pages.</p>

<h2>Steps</h2>
<ol>
<li>Open <a href="/pages/split-pdf.html">Split PDF</a>.</li>
<li>Add your file.</li>
<li>Choose page ranges or split points according to the tool options.</li>
<li>Download the resulting file(s).</li>
</ol>

<h2>Tips</h2>
<ul>
<li>Note page numbers from the viewer before splitting legal documents.</li>
<li>After splitting, rename outputs clearly (<code>contract-signature-pages.pdf</code>).</li>
<li>For reordering instead of cutting, use <a href="/pages/organize-pdf.html">Organize PDF</a>.</li>
</ul>
""",
    "compress-jpg-without-ruining-quality": """
<h2>What compression changes</h2>
<p>JPG compression discards fine detail to save bytes. Mild compression is usually invisible in social posts and email; heavy compression shows blockiness in skies and skin tones.</p>

<h2>How to compress on Make QR</h2>
<ol>
<li>Open <a href="/pages/compress-jpg.html">Compress JPG</a>.</li>
<li>Add your photo.</li>
<li>Lower quality gradually and compare the preview.</li>
<li>Download when size fits your limit (email attachment, CMS, chat app).</li>
</ol>

<h2>Practical targets</h2>
<ul>
<li>Chat / social: often 200–800 KB is enough.</li>
<li>Blog hero images: balance sharpness vs load time; WebP may be smaller — see our WebP guide.</li>
<li>Print archives: avoid aggressive compression; keep a master copy.</li>
</ul>
""",
    "convert-images-to-webp": """
<h2>Why WebP</h2>
<p>WebP often produces smaller files than JPG or PNG at similar visual quality, which helps websites load faster on mobile networks.</p>

<h2>Convert in the browser</h2>
<ol>
<li>Open <a href="/pages/convert-to-webp.html">Convert to WebP</a>.</li>
<li>Add PNG or JPG files.</li>
<li>Download the WebP output.</li>
<li>Need PNG again later? Use <a href="/pages/webp-to-png.html">WebP to PNG</a>.</li>
</ol>

<h2>Compatibility notes</h2>
<ul>
<li>Modern browsers support WebP well.</li>
<li>Some older email clients and print workflows still prefer JPG/PNG.</li>
<li>Keep originals when you may need lossless editing later.</li>
</ul>
""",
    "how-to-test-microphone-in-browser": """
<h2>Quick mic check</h2>
<ol>
<li>Open the <a href="/pages/test-tools/microphone-test.html">microphone test</a>.</li>
<li>Allow permission when the browser asks.</li>
<li>Speak normally and watch the level meter.</li>
<li>If the level stays flat, pick another input device in OS sound settings and reload.</li>
</ol>

<h2>Before an interview or class</h2>
<ul>
<li>Mute other tabs that might capture the mic.</li>
<li>Remove cases that cover laptop mics.</li>
<li>Test headphones with a built-in mic separately from the laptop array.</li>
</ul>
""",
    "how-to-rotate-pdf-pages": """
<h2>Fix sideways scans</h2>
<p>Phone scans often land as landscape pages in a portrait PDF. Rotating pages in the browser avoids reinstalling desktop PDF software.</p>
<ol>
<li>Open <a href="/pages/rotate-pdf.html">Rotate PDF</a>.</li>
<li>Upload the file.</li>
<li>Rotate individual pages or batches as needed.</li>
<li>Download the corrected PDF.</li>
</ol>
""",
    "delete-pdf-pages-without-acrobat": """
<h2>Remove pages locally</h2>
<ol>
<li>Open <a href="/pages/delete-pdf-pages.html">Delete PDF Pages</a>.</li>
<li>Select the pages to remove.</li>
<li>Confirm and download the new file.</li>
</ol>
<p>Double-check page numbers on legal or school submissions — deletion cannot be undone in the downloaded file unless you kept the original.</p>
""",
    "extract-pdf-pages": """
<h2>Keep only what you need</h2>
<ol>
<li>Open <a href="/pages/extract-pdf-pages.html">Extract PDF Pages</a>.</li>
<li>Choose the pages to keep.</li>
<li>Download the smaller PDF to share or archive.</li>
</ol>
<p>Extraction is ideal when a 40-page pack contains a 2-page form recipients actually need.</p>
""",
    "reorder-pdf-pages": """
<h2>Why order matters</h2>
<p>Contracts and homework packs are rejected when signature pages or covers appear in the wrong place. Reordering in the browser is faster than printing and scanning again.</p>
<ol>
<li>Open <a href="/pages/organize-pdf.html">Organize PDF</a>.</li>
<li>Drag pages into the correct sequence.</li>
<li>Download and spot-check the first and last pages.</li>
</ol>
""",
    "png-vs-jpg-vs-webp": """
<h2>Quick chooser</h2>
<table class="blog-table">
<thead><tr><th>Format</th><th>Best for</th><th>Watch-outs</th></tr></thead>
<tbody>
<tr><td>JPG</td><td>Photos</td><td>Lossy; poor for sharp text/logos</td></tr>
<tr><td>PNG</td><td>Graphics, transparency, screenshots</td><td>Larger files</td></tr>
<tr><td>WebP</td><td>Web delivery</td><td>Some legacy tools lack support</td></tr>
</tbody>
</table>
<p>Use Make QR’s <a href="/pages/compress-jpg.html">JPG</a>, <a href="/pages/compress-png.html">PNG</a> and <a href="/pages/convert-to-webp.html">WebP</a> tools to convert without signup.</p>
""",
    "how-to-create-email-sms-qr-code": """
<h2>Email QR</h2>
<ol>
<li>Choose <strong>Email</strong> in the <a href="/">generator</a>.</li>
<li>Enter the recipient address, optional subject and body.</li>
<li>Download and print near a support desk or on packaging inserts.</li>
</ol>
<h2>SMS QR</h2>
<ol>
<li>Choose <strong>SMS</strong>, enter the number and optional message text.</li>
<li>Phones open the messages app with fields pre-filled.</li>
</ol>
<p>Both formats are static — update printed materials if the number or inbox changes.</p>
""",
    "qr-code-color-mistakes": """
<h2>Mistakes that break scans</h2>
<ul>
<li><strong>Low contrast</strong> — light gray on white or yellow on white.</li>
<li><strong>Inverted codes</strong> — light modules on dark backgrounds often fail on consumer cameras.</li>
<li><strong>Busy backgrounds</strong> — photos behind the code confuse detectors.</li>
<li><strong>Overstyled modules</strong> — extreme shapes plus a huge logo.</li>
</ul>
<h2>Safe styling</h2>
<p>Start with near-black on white, then introduce brand color only if contrast stays strong. Always test the final PNG on a phone in the real lighting where it will be scanned.</p>
""",
    "keyboard-test-checklist": """
<h2>Used-laptop keyboard checklist</h2>
<ol>
<li>Open the <a href="/pages/test-keyboard/index.html">keyboard test</a>.</li>
<li>Press every key including function row, arrows and modifiers.</li>
<li>Watch for keys that do not light up or stick down.</li>
<li>Type a paragraph to feel mushy or uneven switches.</li>
</ol>
<p>Combine with a <a href="/pages/test-tools/dead-pixel-test.html">dead pixel</a> and <a href="/pages/test-tools/webcam-test.html">webcam</a> check before you buy.</p>
""",
    "percentage-calculator-discounts-tips": """
<h2>Common percentage tasks</h2>
<ul>
<li>Discount: price after 15% off.</li>
<li>Tip: 10% or 15% of a bill.</li>
<li>Change: percent increase from last month’s metric.</li>
</ul>
<p>Open the <a href="/calculators/percentage-calculator.html">percentage calculator</a>, enter the base number and percent, and read the result. For restaurant tips you can also try the <a href="/calculators/tip-calculator.html">tip calculator</a>.</p>
""",
    "loan-mortgage-payment-calculator": """
<h2>What the calculator estimates</h2>
<p>Loan and mortgage calculators estimate periodic payments from principal, interest rate and term. They are planning tools — not bank offers.</p>
<ol>
<li>Open the <a href="/calculators/loan-calculator.html">loan calculator</a> or <a href="/calculators/mortgage-calculator.html">mortgage calculator</a>.</li>
<li>Enter amount, rate and years.</li>
<li>Compare how a longer term lowers the payment but may raise total interest.</li>
</ol>
<p>Confirm final numbers with your lender; taxes and insurance may be excluded.</p>
""",
    "bmi-calculator-meaning": """
<h2>Using BMI carefully</h2>
<p>BMI is a simple height–weight ratio used in population health. It does not diagnose disease and can misclassify muscular or elderly people.</p>
<ol>
<li>Open the <a href="/calculators/bmi-calculator.html">BMI calculator</a>.</li>
<li>Enter height and weight in the units shown.</li>
<li>Read the category as a rough signal only.</li>
</ol>
<p>For personal health decisions, talk to a qualified clinician — Make QR calculators are informational aids.</p>
""",
    "scientific-calculator-deg-rad-tips": """
<h2>DEG vs RAD</h2>
<p>Trig functions expect angles in degrees (DEG) or radians (RAD). <code>sin(30)</code> in DEG is 0.5; in RAD it is a different value. Match the mode to your textbook or exam setting.</p>
<h2>Expression editing</h2>
<p>On Make QR’s <a href="/calculators/scientific-calculator.html">scientific calculator</a> you can move the cursor, wrap terms in parentheses, and reuse <strong>Ans</strong>. Use this for nested roots, powers and combinations without retyping everything.</p>
""",
    "device-checks-before-meeting": """
<h2>Five-minute pre-call checklist</h2>
<ol>
<li><a href="/pages/test-tools/microphone-test.html">Microphone</a> — levels move when you speak.</li>
<li><a href="/pages/test-tools/webcam-test.html">Webcam</a> — focus and lighting look acceptable.</li>
<li><a href="/pages/test-tools/speaker-test.html">Speakers</a> — left/right output works with your headset.</li>
<li><a href="/pages/test-tools/dead-pixel-test.html">Screen</a> — quick pass if you present slides.</li>
<li>Close bandwidth-heavy tabs before joining.</li>
</ol>
<p>All tests run in the browser from the <a href="/pages/test-tools/index.html">device test hub</a>.</p>
""",
}


def build_new_posts() -> list[dict]:
    out = []
    for slug, title, desc, category, cta_label, cta_href, read_min, keywords, publish, _cat in NEW_POSTS_META:
        related = [
            ("./", "All Guides"),
            (cta_href if cta_href.endswith(".html") or cta_href.endswith("/") else cta_href, "Open related tool"),
        ]
        # better related links by category
        if category == "QR Code":
            related = [
                ("static-vs-dynamic-qr-codes.html", "Static vs dynamic QR codes"),
                ("how-to-create-wifi-qr-code.html", "WiFi QR code guide"),
                ("/", "QR code generator"),
            ]
        elif category == "PDF":
            related = [
                ("merge-pdf-without-signup.html", "Merge PDF without signup"),
                ("/pages/merge-pdf.html", "Merge PDF tool"),
                ("/pages/split-pdf.html", "Split PDF tool"),
            ]
        elif category == "Image":
            related = [
                ("png-vs-jpg-vs-webp.html", "PNG vs JPG vs WebP"),
                ("/pages/compress-jpg.html", "Compress JPG"),
                ("/pages/convert-to-webp.html", "Convert to WebP"),
            ]
        elif category == "Device Test":
            related = [
                ("/pages/test-tools/index.html", "All device tests"),
                ("keyboard-test-checklist.html", "Keyboard test checklist"),
                ("how-to-test-microphone-in-browser.html", "Microphone test guide"),
            ]
        elif category == "Calculators":
            related = [
                ("/calculators/", "All calculators"),
                ("percentage-calculator-discounts-tips.html", "Percentage calculator guide"),
                ("/", "Make QR home"),
            ]
        out.append(
            {
                "slug": slug,
                "title": title,
                "description": desc,
                "category": category,
                "cta_label": cta_label,
                "cta_href": cta_href,
                "read_min": read_min,
                "keywords": keywords,
                "publish": publish,
                "related": related,
                "body": BODIES[slug],
            }
        )
    return out


ALL_POSTS = POSTS + build_new_posts()


def render_post(post: dict, published: bool) -> str:
    slug = post["slug"]
    pub = post["publish"]
    robots = "index, follow" if published else "noindex, nofollow"
    related_html = "\n".join(
        f'<li><a href="{href}">{text}</a></li>' for href, text in post["related"]
    )
    keywords = ", ".join(post["keywords"])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4151519079019358" crossorigin="anonymous"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{post['description']}">
    <meta name="author" content="Make QR">
    <meta property="og:title" content="{post['title']} | Make QR">
    <meta property="og:description" content="{post['description']}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{SITE}/blog/{slug}.html">
    <meta name="robots" content="{robots}">
    <link rel="canonical" href="{SITE}/blog/{slug}.html">
    <title>{post['title']} | Make QR Guides</title>
    <link rel="icon" href="{ICON}">
    <link href="../assets/css/tailwind.min.css" rel="stylesheet">
    <link href="../assets/css/style.css?v={CACHE}" rel="stylesheet">
    <script src="../assets/js/template-loader.js?v={CACHE}" defer></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-257SVV94KB"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-257SVV94KB');
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": {json.dumps(post['title'])},
      "description": {json.dumps(post['description'])},
      "datePublished": "{pub}",
      "dateModified": "{pub}",
      "author": {{ "@type": "Organization", "name": "Make QR" }},
      "publisher": {{ "@type": "Organization", "name": "Make QR", "url": "{SITE}/" }},
      "mainEntityOfPage": "{SITE}/blog/{slug}.html",
      "keywords": {json.dumps(post['keywords'])}
    }}
    </script>
</head>
<body class="page-body">
    <article class="blog-shell blog-post">
        <header class="blog-hero">
            <p class="blog-kicker"><a href="./">Guides</a> · {post['category']}</p>
            <h1>{post['title']}</h1>
            <p class="blog-meta"><time datetime="{pub}">{fmt_human(pub)}</time> · {post['read_min']} min read</p>
            <p class="blog-lead">{post['description']}</p>
        </header>

        <div class="blog-cta">
            <p>Use the free tool now.</p>
            <a class="blog-cta-btn" href="{post['cta_href']}">{post['cta_label']}</a>
        </div>

        <div class="blog-content">
{post['body'].strip()}
        </div>

        <div class="blog-cta blog-cta--bottom">
            <p>Free · Private · No signup</p>
            <a class="blog-cta-btn" href="{post['cta_href']}">{post['cta_label']}</a>
        </div>

        <nav class="blog-more" aria-label="More guides">
            <h2>More guides</h2>
            <ul>
{related_html}
            </ul>
        </nav>
    </article>
</body>
</html>
"""


def write_catalog_json() -> None:
    slim = [
        {
            "slug": p["slug"],
            "title": p["title"],
            "description": p["description"],
            "category": p["category"],
            "publish": p["publish"],
            "cta_href": p["cta_href"],
            "read_min": p["read_min"],
        }
        for p in ALL_POSTS
    ]
    POSTS_JSON.write_text(json.dumps(slim, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def generate_all_html(as_of: date) -> None:
    DRAFTS.mkdir(parents=True, exist_ok=True)
    BLOG.mkdir(parents=True, exist_ok=True)
    for post in ALL_POSTS:
        published = d(post["publish"]) <= as_of
        html = render_post(post, published=published)
        target = (BLOG / f"{post['slug']}.html") if published else (DRAFTS / f"{post['slug']}.html")
        # Always keep a canonical file under blog/ for path stability once published;
        # unpublished stay in drafts only.
        if published:
            (BLOG / f"{post['slug']}.html").write_text(html, encoding="utf-8")
            draft = DRAFTS / f"{post['slug']}.html"
            if draft.exists():
                draft.unlink()
        else:
            (DRAFTS / f"{post['slug']}.html").write_text(html, encoding="utf-8")
            live = BLOG / f"{post['slug']}.html"
            # remove live copy if somehow present while still scheduled future
            if live.exists() and post["slug"] not in {
                "how-to-create-wifi-qr-code",
                "static-vs-dynamic-qr-codes",
                "merge-pdf-without-signup",
            }:
                # only delete if publish in future
                if d(post["publish"]) > as_of:
                    live.unlink()
    write_catalog_json()


def published_posts(as_of: date) -> list[dict]:
    return sorted(
        [p for p in ALL_POSTS if d(p["publish"]) <= as_of],
        key=lambda p: p["publish"],
        reverse=True,
    )


def due_today(as_of: date) -> list[dict]:
    return [p for p in ALL_POSTS if d(p["publish"]) == as_of]


def render_index(posts: list[dict]) -> str:
    items = []
    for p in posts:
        items.append(
            f"""
            <article class="blog-list-item">
                <p class="blog-meta"><time datetime="{p['publish']}">{fmt_human(p['publish'])}</time> · {p['category']}</p>
                <h2><a href="{p['slug']}.html">{p['title']}</a></h2>
                <p>{p['description']}</p>
                <a class="blog-read-more" href="{p['slug']}.html">Read guide →</a>
            </article>"""
        )
    listing = "\n".join(items)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4151519079019358" crossorigin="anonymous"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Practical guides for QR codes, PDF tools, image utilities, calculators and device tests from Make QR.">
    <meta name="author" content="Make QR">
    <meta property="og:title" content="Guides | Make QR">
    <meta property="og:description" content="How-to guides that lead into free browser tools — no signup required.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{SITE}/blog/">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{SITE}/blog/">
    <title>Guides | Make QR</title>
    <link rel="icon" href="{ICON}">
    <link href="../assets/css/tailwind.min.css" rel="stylesheet">
    <link href="../assets/css/style.css?v={CACHE}" rel="stylesheet">
    <script src="../assets/js/template-loader.js?v={CACHE}" defer></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-257SVV94KB"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-257SVV94KB');
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Make QR Guides",
      "url": "{SITE}/blog/",
      "description": "Practical guides for QR codes, PDF tools and free browser utilities.",
      "publisher": {{ "@type": "Organization", "name": "Make QR", "url": "{SITE}/" }}
    }}
    </script>
</head>
<body class="page-body">
    <main class="blog-shell">
        <header class="blog-hero">
            <p class="blog-kicker">Guides</p>
            <h1>Make QR Guides</h1>
            <p class="blog-lead">Short, useful how-tos that lead straight into free browser tools — no signup, no watermark, private by default.</p>
        </header>
        <section class="blog-list" aria-label="Latest guides">
{listing}
        </section>
    </main>
</body>
</html>
"""


BLOG_URL_RE = re.compile(
    r"\s*<url>\s*<loc>https://make-qr\.github\.io/blog/[^<]*</loc>[\s\S]*?</url>\s*",
    re.M,
)


def update_template_loader_titles() -> None:
    path = ROOT / "assets/js/template-loader.js"
    text = path.read_text(encoding="utf-8")
    start = text.find("const PAGE_TITLES = {")
    end = text.find("};", start)
    if start < 0 or end < 0:
        return
    # Keep non-blog titles from original block when possible
    base = {
        "scan-qr": "QR Code Scanner",
        "compress-jpg": "JPG Compressor",
        "compress-png": "PNG Compressor",
        "convert-to-webp": "Convert to WebP",
        "webp-to-png": "WebP to PNG",
        "merge-pdf": "PDF Merger",
        "split-pdf": "Split PDF",
        "rotate-pdf": "Rotate PDF",
        "delete-pdf-pages": "Delete PDF Pages",
        "extract-pdf-pages": "Extract PDF Pages",
        "organize-pdf": "Organize PDF",
        "microphone-test": "Microphone Test",
        "webcam-test": "Webcam Test",
        "speaker-test": "Speaker Test",
        "mouse-test": "Mouse Test",
        "dead-pixel-test": "Dead Pixel Test",
        "controller-tester": "Controller Test",
        "test-tools": "Device Test Tools",
        "test-keyboard": "Keyboard Tester Pro",
    }
    for p in ALL_POSTS:
        short = p["title"]
        if len(short) > 48:
            short = short.split(":")[0].strip()
        base[p["slug"]] = short
    lines = ["const PAGE_TITLES = {"]
    for key, val in base.items():
        lines.append(f"    '{key}': {json.dumps(val)},")
    lines.append("};")
    text = text[:start] + "\n".join(lines) + text[end + 2 :]
    path.write_text(text, encoding="utf-8")


def update_sitemap(posts: list[dict]) -> None:
    xml = SITEMAP.read_text(encoding="utf-8")
    xml = BLOG_URL_RE.sub("\n", xml)
    entries = [
        f"""    <url>
        <loc>{SITE}/blog/</loc>
        <lastmod>{posts[0]['publish'] if posts else date.today().isoformat()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.85</priority>
    </url>"""
    ]
    for p in posts:
        entries.append(
            f"""    <url>
        <loc>{SITE}/blog/{p['slug']}.html</loc>
        <lastmod>{p['publish']}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>"""
        )
    block = "\n".join(entries) + "\n"
    if "</urlset>" not in xml:
        raise SystemExit("sitemap.xml missing </urlset>")
    xml = xml.replace("</urlset>", block + "</urlset>")
    # tidy extra blank lines
    xml = re.sub(r"\n{3,}", "\n\n", xml)
    SITEMAP.write_text(xml, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--as-of", help="YYYY-MM-DD (default: today Asia/Ho_Chi_Minh)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--generate", action="store_true", help="Regenerate all post HTML")
    args = parser.parse_args()
    as_of = d(args.as_of) if args.as_of else datetime.now(TZ).date()

    due = due_today(as_of)
    pub = published_posts(as_of)
    future = [p for p in ALL_POSTS if d(p["publish"]) > as_of]

    print(f"As of {as_of} ({TZ.key})")
    print(f"Published: {len(pub)} | Due today: {len(due)} | Scheduled future: {len(future)}")
    if due:
        print("Due today:")
        for p in due:
            print(f"  - {p['publish']} {p['slug']}")
    if args.dry_run:
        print("Future schedule:")
        for p in ALL_POSTS:
            flag = "LIVE" if d(p["publish"]) <= as_of else "WAIT"
            print(f"  [{flag}] {p['publish']}  {p['slug']}")
        return

    generate_all_html(as_of)
    (BLOG / "index.html").write_text(render_index(pub), encoding="utf-8")
    update_sitemap(pub)
    update_template_loader_titles()
    write_catalog_json()
    print("Updated blog HTML, index.html, posts.json, sitemap.xml")
    if due:
        print("Publish note: commit & push these files so GitHub Pages goes live.")


if __name__ == "__main__":
    main()
