#!/usr/bin/env python3
"""Generate P1 utility tool pages for make-qr.github.io"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "pages"

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4151519079019358" crossorigin="anonymous"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{desc}">
    <meta name="keywords" content="{keywords}">
    <meta name="author" content="Make QR">
    <title>{title} | Make QR</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛠️</text></svg>">
    <link href="../assets/css/tailwind.min.css" rel="stylesheet">
    <link href="../assets/css/style.css?v=20260729-1" rel="stylesheet">
    <script src="../assets/js/template-loader.js?v=20260729-1" defer></script>
    <script src="../assets/js/p1-tools.js?v=20260729-1" defer></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-257SVV94KB"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-257SVV94KB');
    </script>
</head>
<body class="page-body" data-tool="{slug}">
<main class="max-w-4xl mx-auto px-4 py-8">
"""

FOOT = """
<p class="mt-10 text-sm text-gray-500 text-center">Free · Private · No signup — processing stays in your browser when possible.</p>
</main>
</body>
</html>
"""


def page(slug, title, desc, keywords, body):
    html = HEAD.format(title=title, desc=desc, keywords=keywords, slug=slug) + body + FOOT
    (PAGES / f"{slug}.html").write_text(html, encoding="utf-8")
    print("wrote", slug)


def card(title, lead, inner):
    return f"""
<div class="text-center mb-8">
  <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h1>
  <p class="text-lg text-gray-600">{lead}</p>
</div>
<div class="bg-white rounded-lg shadow-md p-6 space-y-4">{inner}</div>
"""


# --- Image format converters ---
CONVERTERS = [
    ("webp-to-jpg", "WebP to JPG", "webp", "image/webp,.webp", "image/jpeg", ".jpg", "Convert WebP images to JPG in your browser. Free, private, no upload."),
    ("png-to-jpg", "PNG to JPG", "png", "image/png,.png", "image/jpeg", ".jpg", "Convert PNG images to JPG online. Runs locally in your browser."),
    ("jpg-to-png", "JPG to PNG", "jpg", "image/jpeg,.jpg,.jpeg", "image/png", ".png", "Convert JPG images to PNG online. Free browser-based converter."),
    ("webp-to-png", None, None, None, None, None, None),  # already exists — skip overwrite? keep existing richer page
]

for slug, title, src, accept, mime, ext, desc in CONVERTERS:
    if title is None:
        continue
    quality_block = ""
    if mime == "image/jpeg":
        quality_block = """
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">JPG quality: <span id="fc-quality-val">92</span>%</label>
  <input type="range" id="fc-quality" min="40" max="100" value="92" class="w-full">
</div>"""
    body = card(
        title,
        desc,
        f"""
<div data-format-converter data-from-label="{src.upper()}" data-accept="{accept}" data-to-mime="{mime}" data-to-ext="{ext}" data-quality="0.92">
  <div id="fc-drop" class="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 bg-gray-50">
    <p class="font-medium text-gray-700">Drop {src.upper()} files here or click to select</p>
    <p class="text-sm text-gray-500 mt-1">Multiple files supported · processed locally</p>
    <input type="file" id="fc-file" class="hidden" multiple>
  </div>
  {quality_block}
  <button type="button" id="fc-convert" disabled class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">Convert</button>
  <p id="fc-status" class="text-sm text-gray-500"></p>
  <div id="fc-results" class="hidden space-y-3">
    <h2 class="text-lg font-semibold">Results</h2>
    <div id="fc-list" class="space-y-3"></div>
  </div>
</div>
""",
    )
    page(slug, title, desc, f"{slug.replace('-', ' ')}, image converter, {src} to {ext[1:]}", body)

# image-to-base64 / base64-to-image / resizer / rotate / flip
page(
    "image-to-base64",
    "Image to Base64",
    "Convert any image to a Base64 data URL in your browser. Nothing is uploaded.",
    "image to base64, base64 encoder image",
    card(
        "Image to Base64",
        "Encode an image as a Base64 data URI locally.",
        """
<input type="file" id="i2b-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<img id="i2b-preview" class="hidden max-h-48 mx-auto rounded border" alt="Preview">
<textarea id="i2b-out" rows="8" class="w-full border rounded-lg px-3 py-2 font-mono text-xs" placeholder="Base64 output"></textarea>
<button type="button" id="i2b-copy" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Copy</button>
""",
    ),
)

page(
    "base64-to-image",
    "Base64 to Image",
    "Decode a Base64 string or data URL into an image download. Private and free.",
    "base64 to image, decode base64 image",
    card(
        "Base64 to Image",
        "Paste a data URL or raw Base64 string to preview and download.",
        """
<textarea id="b2i-in" rows="6" class="w-full border rounded-lg px-3 py-2 font-mono text-xs" placeholder="data:image/png;base64,...."></textarea>
<button type="button" id="b2i-convert" class="w-full bg-blue-600 text-white py-3 rounded-lg">Decode</button>
<img id="b2i-preview" class="hidden max-h-64 mx-auto rounded border" alt="Decoded">
<button type="button" id="b2i-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download PNG</button>
""",
    ),
)

page(
    "image-resizer",
    "Image Resizer",
    "Resize images to exact pixel dimensions in your browser. Free and private.",
    "image resizer, resize image online",
    card(
        "Image Resizer",
        "Choose an image, set width/height, download the result.",
        """
<input type="file" id="rz-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<div class="grid grid-cols-2 gap-3">
  <label class="text-sm">Width <input type="number" id="rz-w" class="w-full border rounded-lg px-3 py-2"></label>
  <label class="text-sm">Height <input type="number" id="rz-h" class="w-full border rounded-lg px-3 py-2"></label>
</div>
<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="rz-keep" checked> Keep aspect ratio when editing width</label>
<button type="button" id="rz-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Resize</button>
<img id="rz-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="rz-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
""",
    ),
)

page(
    "rotate-image",
    "Rotate Image",
    "Rotate an image by 90°, 180°, or 270° locally in your browser.",
    "rotate image online, image rotator",
    card(
        "Rotate Image",
        "Rotate without uploading files to a server.",
        """
<input type="file" id="rf-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<label class="text-sm block">Angle
  <select id="rf-angle" class="w-full border rounded-lg px-3 py-2">
    <option value="90">90°</option>
    <option value="180">180°</option>
    <option value="270">270°</option>
  </select>
</label>
<button type="button" id="rf-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Rotate</button>
<img id="rf-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="rf-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
""",
    ),
)

page(
    "flip-image",
    "Flip Image",
    "Flip an image horizontally in your browser. Free, private, no signup.",
    "flip image online, mirror image",
    card(
        "Flip Image",
        "Mirror an image horizontally — processed on your device.",
        """
<input type="file" id="rf-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<button type="button" id="rf-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Flip horizontal</button>
<img id="rf-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="rf-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
""",
    ),
)

# Misc info tools
page(
    "what-is-my-ip",
    "What Is My IP",
    "See your public IP address instantly. Free IP lookup tool.",
    "what is my ip, my ip address, public ip",
    card(
        "What Is My IP Address",
        "Your public IP as seen by the internet.",
        """
<p id="my-ip-value" class="text-3xl font-mono font-bold text-center text-blue-700 py-6">Loading…</p>
<p id="my-ip-error" class="text-sm text-red-600 text-center"></p>
<button type="button" id="my-ip-refresh" class="w-full bg-blue-600 text-white py-3 rounded-lg">Refresh</button>
<p class="text-xs text-gray-500">Lookup uses a public IP API (ipify). No account required.</p>
""",
    ),
)

page(
    "what-is-my-user-agent",
    "What Is My User Agent",
    "Show your browser user agent string. Free and instant.",
    "what is my user agent, user agent string",
    card(
        "What Is My User Agent",
        "The User-Agent header your browser sends.",
        """
<p id="my-ua-value" class="font-mono text-sm break-all bg-gray-50 border rounded-lg p-4">—</p>
""",
    ),
)

page(
    "what-is-my-browser",
    "What Is My Browser",
    "Detect your browser, platform, and language from the user agent.",
    "what is my browser, browser detector",
    card(
        "What Is My Browser",
        "Quick browser / platform summary from your user agent.",
        """
<p id="my-browser-value" class="text-xl font-semibold text-center py-6">—</p>
""",
    ),
)

page(
    "what-is-my-screen-resolution",
    "What Is My Screen Resolution",
    "Check screen size, available area, DPR, and viewport size.",
    "what is my screen resolution, screen size checker",
    card(
        "Screen Resolution",
        "Live screen and viewport metrics for this device.",
        """
<p id="my-screen-value" class="text-lg font-mono text-center py-6">—</p>
""",
    ),
)

# Text / dev
page(
    "word-counter",
    "Word Counter",
    "Count words, characters, sentences, and lines instantly in your browser.",
    "word counter, character count",
    card(
        "Word Counter",
        "Paste text to count words and characters. Nothing is uploaded.",
        """
<textarea id="wc-input" rows="10" class="w-full border rounded-lg px-3 py-2" placeholder="Type or paste text…"></textarea>
<div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
  <div class="bg-gray-50 rounded-lg p-3"><div class="text-2xl font-bold" id="wc-words">0</div><div class="text-xs text-gray-500">Words</div></div>
  <div class="bg-gray-50 rounded-lg p-3"><div class="text-2xl font-bold" id="wc-chars">0</div><div class="text-xs text-gray-500">Characters</div></div>
  <div class="bg-gray-50 rounded-lg p-3"><div class="text-2xl font-bold" id="wc-chars-no-space">0</div><div class="text-xs text-gray-500">No spaces</div></div>
  <div class="bg-gray-50 rounded-lg p-3"><div class="text-2xl font-bold" id="wc-sentences">0</div><div class="text-xs text-gray-500">Sentences</div></div>
  <div class="bg-gray-50 rounded-lg p-3"><div class="text-2xl font-bold" id="wc-lines">0</div><div class="text-xs text-gray-500">Lines</div></div>
</div>
""",
    ),
)

page(
    "uuid-generator",
    "UUID Generator",
    "Generate a random UUID v4 in your browser. Free and private.",
    "uuid generator, guid generator",
    card(
        "UUID Generator",
        "Create a random UUID (v4) locally.",
        """
<input id="uuid-out" class="w-full border rounded-lg px-3 py-3 font-mono text-center" readonly>
<div class="flex gap-3">
  <button type="button" id="uuid-gen" class="flex-1 bg-blue-600 text-white py-3 rounded-lg">Generate</button>
  <button type="button" id="uuid-copy" class="px-6 bg-gray-800 text-white py-3 rounded-lg">Copy</button>
</div>
""",
    ),
)

page(
    "base64-encode",
    "Base64 Encode",
    "Encode text to Base64 online. Runs entirely in your browser.",
    "base64 encode, encode base64",
    card(
        "Base64 Encode",
        "Convert text to Base64.",
        """
<textarea id="b64-in" rows="6" class="w-full border rounded-lg px-3 py-2" placeholder="Plain text"></textarea>
<button type="button" id="b64-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Encode</button>
<textarea id="b64-out" rows="6" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="Base64 output"></textarea>
""",
    ),
)

page(
    "base64-decode",
    "Base64 Decode",
    "Decode Base64 text online. Private, free, no signup.",
    "base64 decode, decode base64",
    card(
        "Base64 Decode",
        "Convert Base64 back to text.",
        """
<textarea id="b64-in" rows="6" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="Base64 input"></textarea>
<button type="button" id="b64-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Decode</button>
<textarea id="b64-out" rows="6" class="w-full border rounded-lg px-3 py-2" placeholder="Decoded text"></textarea>
""",
    ),
)

page(
    "csv-to-json",
    "CSV to JSON",
    "Convert CSV to JSON in your browser. Free online converter.",
    "csv to json, convert csv json",
    card(
        "CSV to JSON",
        "Paste CSV (first row = headers).",
        """
<textarea id="cj-in" rows="8" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="name,age&#10;Ada,36"></textarea>
<button type="button" id="cj-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert</button>
<textarea id="cj-out" rows="10" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="JSON output"></textarea>
""",
    ),
)

page(
    "json-to-csv",
    "JSON to CSV",
    "Convert JSON arrays to CSV online. Private browser tool.",
    "json to csv, convert json csv",
    card(
        "JSON to CSV",
        "Paste a JSON array of objects.",
        """
<textarea id="cj-in" rows="8" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder='[{"name":"Ada","age":36}]'></textarea>
<button type="button" id="cj-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert</button>
<textarea id="cj-out" rows="10" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="CSV output"></textarea>
""",
    ),
)

page(
    "md5-generator",
    "MD5 Generator",
    "Generate an MD5 hash from text in your browser.",
    "md5 generator, md5 hash",
    card(
        "MD5 Hash Generator",
        "Hash text with MD5 locally (for checksums — not for passwords).",
        """
<textarea id="md5-in" rows="5" class="w-full border rounded-lg px-3 py-2" placeholder="Text to hash"></textarea>
<button type="button" id="md5-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate MD5</button>
<input id="md5-out" class="w-full border rounded-lg px-3 py-3 font-mono text-center" readonly placeholder="Hash">
""",
    ),
)

page(
    "lorem-ipsum-generator",
    "Lorem Ipsum Generator",
    "Generate Lorem Ipsum placeholder paragraphs instantly.",
    "lorem ipsum generator, placeholder text",
    card(
        "Lorem Ipsum Generator",
        "Create placeholder paragraphs for mockups.",
        """
<label class="text-sm">Paragraphs <input type="number" id="lorem-count" value="3" min="1" max="20" class="w-full border rounded-lg px-3 py-2"></label>
<button type="button" id="lorem-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="lorem-out" rows="12" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "text-to-hashtags",
    "Text to Hashtags",
    "Turn text into hashtags for social posts. Free online hashtag tool.",
    "text to hashtags, hashtag generator",
    card(
        "Text to Hashtags",
        "Extract simple hashtags from your text.",
        """
<textarea id="hash-in" rows="5" class="w-full border rounded-lg px-3 py-2" placeholder="Paste keywords or a caption"></textarea>
<button type="button" id="hash-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate hashtags</button>
<textarea id="hash-out" rows="4" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

# YouTube
page(
    "youtube-thumbnail-downloader",
    "YouTube Thumbnail Downloader",
    "Download YouTube video thumbnails in multiple resolutions. Free.",
    "youtube thumbnail downloader, download youtube thumbnail",
    card(
        "YouTube Thumbnail Downloader",
        "Paste a video URL or ID to get thumbnail links.",
        """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="https://www.youtube.com/watch?v=...">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Get thumbnails</button>
<div id="yt-thumbs" class="grid md:grid-cols-2 gap-4"></div>
""",
    ),
)

page(
    "youtube-embed-code-generator",
    "YouTube Embed Code Generator",
    "Generate an iframe embed code from any YouTube URL.",
    "youtube embed code generator, youtube iframe",
    card(
        "YouTube Embed Code",
        "Create a standard embed iframe.",
        """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate embed</button>
<textarea id="yt-embed" rows="5" class="w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
""",
    ),
)

page(
    "youtube-timestamp-link-generator",
    "YouTube Timestamp Link Generator",
    "Create a YouTube link that starts at a specific time.",
    "youtube timestamp link, youtube link with time",
    card(
        "YouTube Timestamp Link",
        "Build a share link with start time.",
        """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<div class="grid grid-cols-3 gap-3">
  <label class="text-sm">Hours<input id="yt-h" type="number" min="0" value="0" class="w-full border rounded-lg px-3 py-2"></label>
  <label class="text-sm">Minutes<input id="yt-m" type="number" min="0" max="59" value="0" class="w-full border rounded-lg px-3 py-2"></label>
  <label class="text-sm">Seconds<input id="yt-s" type="number" min="0" max="59" value="0" class="w-full border rounded-lg px-3 py-2"></label>
</div>
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate link</button>
<input id="yt-out" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" readonly>
""",
    ),
)

page(
    "youtube-title-checker",
    "YouTube Title Length Checker",
    "Check YouTube title length and get quick truncation guidance.",
    "youtube title length checker, youtube title character count",
    card(
        "YouTube Title Length Checker",
        "Titles around 60 characters display best in many search results.",
        """
<input id="yt-title" class="w-full border rounded-lg px-3 py-2" placeholder="Paste your video title">
<p class="text-center"><span id="yt-count" class="text-3xl font-bold">0</span> characters</p>
<p id="yt-tip" class="text-center text-sm text-gray-600"></p>
""",
    ),
)

page(
    "youtube-money-calculator",
    "YouTube Money Calculator",
    "Estimate YouTube earnings from views and RPM. Rough calculator only.",
    "youtube money calculator, youtube earnings calculator",
    card(
        "YouTube Money Calculator",
        "Rough estimate only — real revenue varies by niche and geography.",
        """
<label class="text-sm">Views<input id="yt-views" type="number" value="100000" class="w-full border rounded-lg px-3 py-2"></label>
<label class="text-sm">RPM (USD per 1000 views)<input id="yt-rpm" type="number" step="0.01" value="2.5" class="w-full border rounded-lg px-3 py-2"></label>
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Calculate</button>
<p id="yt-money" class="text-center font-semibold text-lg py-4"></p>
""",
    ),
)

page(
    "youtube-subscribe-link-generator",
    "YouTube Subscribe Link Generator",
    "Create a YouTube subscribe confirmation link for a channel.",
    "youtube subscribe link generator",
    card(
        "YouTube Subscribe Link",
        "Use a channel ID (UC…) or @handle.",
        """
<input id="yt-channel" class="w-full border rounded-lg px-3 py-2" placeholder="@handle or UCxxxxxxxx">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate</button>
<input id="yt-out" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" readonly>
""",
    ),
)

page(
    "youtube-video-title-capitalizer",
    "YouTube Title Capitalizer",
    "Convert a YouTube title to Title Case quickly.",
    "youtube title capitalizer, title case",
    card(
        "YouTube Title Capitalizer",
        "Apply simple Title Case to your video title.",
        """
<input id="yt-title" class="w-full border rounded-lg px-3 py-2" placeholder="your video title here">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Capitalize</button>
<input id="yt-out" class="w-full border rounded-lg px-3 py-2" readonly>
""",
    ),
)

# SEO generators
page(
    "meta-tag-generator",
    "Meta Tag Generator",
    "Generate title, description, Open Graph and Twitter meta tags.",
    "meta tag generator, og tags generator",
    card(
        "Meta Tag Generator",
        "Fill the fields and copy HTML meta tags.",
        """
<input id="meta-title" class="w-full border rounded-lg px-3 py-2" placeholder="Page title">
<input id="meta-desc" class="w-full border rounded-lg px-3 py-2" placeholder="Meta description">
<input id="meta-url" class="w-full border rounded-lg px-3 py-2" placeholder="Canonical URL (optional)">
<input id="meta-image" class="w-full border rounded-lg px-3 py-2" placeholder="OG image URL (optional)">
<button type="button" id="meta-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="meta-out" rows="10" class="w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
""",
    ),
)

page(
    "robots-txt-generator",
    "Robots.txt Generator",
    "Create a simple robots.txt file for your website.",
    "robots.txt generator, robots txt",
    card(
        "Robots.txt Generator",
        "Generate a basic robots.txt.",
        """
<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="robots-allow-all" checked> Allow all crawlers</label>
<input id="robots-sitemap" class="w-full border rounded-lg px-3 py-2" placeholder="https://example.com/sitemap.xml (optional)">
<button type="button" id="robots-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="robots-out" rows="8" class="w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
""",
    ),
)

print("Done generating P1 pages")
