#!/usr/bin/env python3
"""Generate remaining P1 tool pages."""
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
    <link href="../assets/css/style.css?v=20260802-1" rel="stylesheet">
    <script src="../assets/js/template-loader.js?v=20260802-1" defer></script>
    <script src="../assets/js/p1-tools.js?v=20260802-1" defer></script>
    <script src="../assets/js/p1-tools-more.js?v=20260802-1" defer></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-257SVV94KB"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-257SVV94KB');</script>
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
    (PAGES / f"{slug}.html").write_text(
        HEAD.format(title=title, desc=desc, keywords=keywords, slug=slug) + body + FOOT,
        encoding="utf-8",
    )
    print("wrote", slug)


def card(title, lead, inner):
    return f"""
<div class="text-center mb-8">
  <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h1>
  <p class="text-lg text-gray-600">{lead}</p>
</div>
<div class="bg-white rounded-lg shadow-md p-6 space-y-4">{inner}</div>
"""


def yt_key_note():
    return """
<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
  <label class="block font-medium mb-1">Optional YouTube Data API key (saved only in this browser)</label>
  <input id="yt-api-key" type="password" autocomplete="off" class="w-full border rounded-lg px-3 py-2" placeholder="AIza…">
  <p class="mt-1 text-xs">Required for stats/tags/comments/channel branding. Create a free key in Google Cloud → YouTube Data API v3.</p>
</div>
"""


# Universal + hubs
page(
    "image-converter",
    "Image Converter",
    "Convert images between PNG, JPG, WebP, BMP, GIF, and ICO in your browser.",
    "image converter, convert image format",
    card(
        "Image Converter",
        "Pick a file and output format. Conversion runs locally.",
        """
<input type="file" id="uc-file" accept="image/*,.ico" class="w-full border rounded-lg px-3 py-2">
<label class="text-sm block">Convert to
<select id="uc-to" class="w-full border rounded-lg px-3 py-2">
  <option value="png">PNG</option>
  <option value="jpg">JPG</option>
  <option value="webp">WebP</option>
  <option value="bmp">BMP</option>
  <option value="gif">GIF</option>
  <option value="ico">ICO</option>
</select></label>
<button type="button" id="uc-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert</button>
<img id="uc-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="uc-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
""",
    ),
)

page(
    "jpg-converter",
    "JPG Converter",
    "Convert images to JPG or from JPG to other formats. Free browser tool.",
    "jpg converter, convert to jpg",
    card(
        "JPG Converter",
        "Convert any common image to JPG, or open dedicated tools below.",
        """
<input type="file" id="uc-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<input type="hidden" id="uc-to" value="jpg">
<button type="button" id="uc-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert to JPG</button>
<img id="uc-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="uc-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
<p class="text-sm text-gray-600">Related: <a class="text-blue-600 underline" href="jpg-to-png.html">JPG to PNG</a> · <a class="text-blue-600 underline" href="png-to-jpg.html">PNG to JPG</a> · <a class="text-blue-600 underline" href="webp-to-jpg.html">WebP to JPG</a></p>
""",
    ),
)

page(
    "ico-converter",
    "ICO Converter",
    "Convert an image to an ICO favicon file in your browser.",
    "ico converter, favicon converter",
    card(
        "ICO Converter",
        "Creates a PNG-compressed ICO (works in modern browsers).",
        """
<div data-encode-format="ico">
<input type="file" id="ef-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<button type="button" id="ef-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert to ICO</button>
<img id="ef-preview" class="hidden max-h-32 mx-auto" alt="Preview">
<button type="button" id="ef-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download ICO</button>
</div>
""",
    ),
)

for slug, fmt, title, desc in [
    ("jpg-to-bmp", "bmp", "JPG to BMP", "Convert JPG images to BMP format locally."),
    ("jpg-to-gif", "gif", "JPG to GIF", "Convert JPG images to GIF format locally."),
    ("jpg-to-ico", "ico", "JPG to ICO", "Convert JPG images to ICO favicons locally."),
    ("png-to-bmp", "bmp", "PNG to BMP", "Convert PNG images to BMP format locally."),
    ("png-to-gif", "gif", "PNG to GIF", "Convert PNG images to GIF format locally."),
    ("png-to-ico", "ico", "PNG to ICO", "Convert PNG images to ICO favicons locally."),
]:
    page(
        slug,
        title,
        desc,
        slug.replace("-", " "),
        card(
            title,
            desc,
            f"""
<div data-encode-format="{fmt}">
<input type="file" id="ef-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<button type="button" id="ef-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert</button>
<img id="ef-preview" class="hidden max-h-64 mx-auto rounded border" alt="Preview">
<button type="button" id="ef-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
</div>
""",
        ),
    )

page(
    "ico-to-png",
    "ICO to PNG",
    "Extract PNG from ICO favicon files in your browser.",
    "ico to png, favicon to png",
    card(
        "ICO to PNG",
        "Best with modern PNG-compressed ICO files.",
        """
<input type="file" id="ico-file" accept=".ico,image/x-icon,image/vnd.microsoft.icon" class="w-full border rounded-lg px-3 py-2">
<button type="button" id="ico-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Convert</button>
<img id="ico-preview" class="hidden max-h-40 mx-auto" alt="Preview">
<button type="button" id="ico-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download PNG</button>
""",
    ),
)

page(
    "image-cropper",
    "Image Cropper",
    "Crop images in your browser. Drag to select an area, then download.",
    "image cropper, crop image online",
    card(
        "Image Cropper",
        "Upload an image, drag on the canvas to select a region.",
        """
<input type="file" id="crop-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<canvas id="crop-canvas" class="w-full border rounded-lg bg-gray-50 touch-none"></canvas>
<button type="button" id="crop-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Crop selection</button>
<button type="button" id="crop-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download cropped PNG</button>
""",
    ),
)

page(
    "image-enlarger",
    "Image Enlarger",
    "Enlarge images by 2×–4× in your browser (smooth upscale).",
    "image enlarger, enlarge image online, upscale image",
    card(
        "Image Enlarger",
        "Browser upscaling improves size; it is not AI super-resolution.",
        """
<input type="file" id="en-file" accept="image/*" class="w-full border rounded-lg px-3 py-2">
<label class="text-sm">Scale
<select id="en-scale" class="w-full border rounded-lg px-3 py-2">
  <option value="2">2×</option>
  <option value="3">3×</option>
  <option value="4">4×</option>
</select></label>
<button type="button" id="en-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Enlarge</button>
<img id="en-preview" class="hidden max-w-full mx-auto rounded border" alt="Preview">
<button type="button" id="en-download" class="hidden w-full bg-gray-800 text-white py-3 rounded-lg">Download</button>
""",
    ),
)

# Legal
page(
    "privacy-policy-generator",
    "Privacy Policy Generator",
    "Generate a basic privacy policy template for your website.",
    "privacy policy generator",
    card(
        "Privacy Policy Generator",
        "Fill in your details to create a starting template (not legal advice).",
        """
<input id="legal-name" class="w-full border rounded-lg px-3 py-2" placeholder="Company / site name">
<input id="legal-site" class="w-full border rounded-lg px-3 py-2" placeholder="https://yoursite.com">
<input id="legal-email" class="w-full border rounded-lg px-3 py-2" placeholder="privacy@yoursite.com">
<input id="legal-country" class="w-full border rounded-lg px-3 py-2" placeholder="United States">
<button type="button" id="legal-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="legal-out" rows="16" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
""",
    ),
)

page(
    "terms-and-condition-generator",
    "Terms and Conditions Generator",
    "Generate a basic terms and conditions template for your website.",
    "terms and conditions generator, terms of service generator",
    card(
        "Terms and Conditions Generator",
        "Create a starting Terms template (not legal advice).",
        """
<input id="legal-name" class="w-full border rounded-lg px-3 py-2" placeholder="Company / site name">
<input id="legal-site" class="w-full border rounded-lg px-3 py-2" placeholder="https://yoursite.com">
<input id="legal-email" class="w-full border rounded-lg px-3 py-2" placeholder="legal@yoursite.com">
<input id="legal-country" class="w-full border rounded-lg px-3 py-2" placeholder="United States">
<button type="button" id="legal-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="legal-out" rows="16" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
""",
    ),
)

page(
    "http-status-code-checker",
    "HTTP Status Code Checker",
    "Check the HTTP status code of any URL.",
    "http status code checker, check http status",
    card(
        "HTTP Status Code Checker",
        "Enter a URL to see its HTTP response code.",
        """
<input id="http-url" class="w-full border rounded-lg px-3 py-2" placeholder="https://example.com">
<button type="button" id="http-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Check status</button>
<div id="http-out" class="text-center py-4"></div>
""",
    ),
)

page(
    "domain-age-checker",
    "Domain Age Checker",
    "Check approximate domain age from public WHOIS data.",
    "domain age checker, whois age",
    card(
        "Domain Age Checker",
        "Lookup creation date / approximate age for a domain.",
        """
<input id="dom-input" class="w-full border rounded-lg px-3 py-2" placeholder="example.com">
<button type="button" id="dom-run" class="w-full bg-blue-600 text-white py-3 rounded-lg">Check age</button>
<div id="dom-out" class="py-4"></div>
""",
    ),
)

# YouTube remaining
page(
    "youtube-title-extractor",
    "YouTube Title Extractor",
    "Extract a YouTube video title from its URL using oEmbed.",
    "youtube title extractor",
    card(
        "YouTube Title Extractor",
        "Paste a video URL to fetch the title.",
        """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Extract title</button>
<p id="yt-out" class="text-lg font-semibold text-center py-4"></p>
""",
    ),
)

page(
    "youtube-title-generator",
    "YouTube Title Generator",
    "Generate simple YouTube title ideas from a topic.",
    "youtube title generator",
    card(
        "YouTube Title Generator",
        "Enter a topic to get starter title ideas.",
        """
<input id="yt-in" class="w-full border rounded-lg px-3 py-2" placeholder="Topic keywords">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate titles</button>
<textarea id="yt-out" rows="8" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-description-generator",
    "YouTube Description Generator",
    "Generate a basic YouTube description draft from a topic.",
    "youtube description generator",
    card(
        "YouTube Description Generator",
        "Create a simple description template.",
        """
<input id="yt-in" class="w-full border rounded-lg px-3 py-2" placeholder="Video topic">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="yt-out" rows="10" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-description-extractor",
    "YouTube Description Extractor",
    "Extract a YouTube video description with the YouTube Data API.",
    "youtube description extractor",
    card(
        "YouTube Description Extractor",
        "Requires your own YouTube Data API key.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Extract</button>
<textarea id="yt-out" rows="12" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-tag-generator",
    "YouTube Tag Generator",
    "Generate comma-separated YouTube tags from keywords.",
    "youtube tag generator",
    card(
        "YouTube Tag Generator",
        "Turn keywords into a tag list.",
        """
<textarea id="yt-in" rows="4" class="w-full border rounded-lg px-3 py-2" placeholder="keywords about your video"></textarea>
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate tags</button>
<textarea id="yt-out" rows="4" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-tag-extractor",
    "YouTube Tag Extractor",
    "Extract tags from a YouTube video via the Data API.",
    "youtube tag extractor",
    card(
        "YouTube Tag Extractor",
        "Requires API key. Some videos hide tags.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Extract tags</button>
<textarea id="yt-out" rows="5" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-hashtag-generator",
    "YouTube Hashtag Generator",
    "Generate hashtags for YouTube titles and descriptions.",
    "youtube hashtag generator",
    card(
        "YouTube Hashtag Generator",
        "Create hashtags from your topic text.",
        """
<textarea id="yt-in" rows="4" class="w-full border rounded-lg px-3 py-2"></textarea>
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Generate</button>
<textarea id="yt-out" rows="3" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-hashtag-extractor",
    "YouTube Hashtag Extractor",
    "Extract hashtags from pasted YouTube text.",
    "youtube hashtag extractor",
    card(
        "YouTube Hashtag Extractor",
        "Paste a title/description containing #hashtags.",
        """
<textarea id="yt-in" rows="5" class="w-full border rounded-lg px-3 py-2"></textarea>
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Extract</button>
<textarea id="yt-out" rows="3" class="w-full border rounded-lg px-3 py-2"></textarea>
""",
    ),
)

page(
    "youtube-channel-id",
    "YouTube Channel ID Extractor",
    "Find a YouTube channel ID from a URL, handle, or video.",
    "youtube channel id, channel id extractor",
    card(
        "YouTube Channel ID Extractor",
        "UC… IDs work offline. Handles/videos need an API key.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="Channel URL, @handle, UC…, or video URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Extract ID</button>
<p id="yt-out" class="font-mono text-center text-lg py-4 break-all"></p>
""",
    ),
)

for slug, title, desc in [
    ("youtube-channel-statistics", "YouTube Channel Statistics", "View subscriber, view, and video counts for a channel."),
    ("youtube-channel-age-checker", "YouTube Channel Age Checker", "See when a YouTube channel was created."),
    ("youtube-video-count-checker", "YouTube Video Count Checker", "Check how many videos a channel has published."),
]:
    page(
        slug,
        title,
        desc,
        slug.replace("-", " "),
        card(
            title,
            desc + " Requires API key.",
            yt_key_note()
            + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="UC… channel ID or @handle">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Lookup</button>
<div id="yt-out" class="py-4"></div>
""",
        ),
    )

page(
    "youtube-video-statistics",
    "YouTube Video Statistics",
    "Check views, likes, comments and duration for a YouTube video.",
    "youtube video statistics",
    card(
        "YouTube Video Statistics",
        "Requires YouTube Data API key.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Get stats</button>
<div id="yt-out" class="py-4"></div>
""",
    ),
)

page(
    "youtube-views-ratio-calculator",
    "YouTube Views Ratio Calculator",
    "Calculate like/view and comment/view ratios for a video.",
    "youtube views ratio calculator",
    card(
        "YouTube Views Ratio Calculator",
        "Requires API key for live stats.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Calculate</button>
<div id="yt-out" class="py-4 text-center"></div>
""",
    ),
)

page(
    "youtube-region-restriction-checker",
    "YouTube Region Restriction Checker",
    "See which countries a YouTube video is allowed or blocked in.",
    "youtube region restriction checker",
    card(
        "YouTube Region Restriction Checker",
        "Requires API key.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Check</button>
<p id="yt-out" class="py-4 text-sm"></p>
""",
    ),
)

page(
    "youtube-comment-picker",
    "YouTube Comment Picker",
    "Pick a random comment from a YouTube video (giveaway helper).",
    "youtube comment picker, random comment picker",
    card(
        "YouTube Comment Picker",
        "Loads recent/relevant comments via API, then picks one at random.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="YouTube URL">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Pick a comment</button>
<p id="yt-out" class="py-4 text-sm whitespace-pre-wrap"></p>
""",
    ),
)

page(
    "youtube-channel-search",
    "YouTube Channel Finder",
    "Search YouTube channels by keyword using the Data API.",
    "youtube channel search, find youtube channel",
    card(
        "YouTube Channel Search",
        "Requires API key.",
        yt_key_note()
        + """
<input id="yt-q" class="w-full border rounded-lg px-3 py-2" placeholder="Search channels">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Search</button>
<div id="yt-out" class="space-y-3 py-2"></div>
""",
    ),
)

page(
    "youtube-channel-logo-downloader",
    "YouTube Channel Logo Downloader",
    "Download a YouTube channel profile image.",
    "youtube channel logo downloader",
    card(
        "YouTube Channel Logo Downloader",
        "Requires API key.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="UC… or @handle">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Get logo</button>
<div id="yt-out" class="py-4"></div>
""",
    ),
)

page(
    "youtube-channel-banner-downloader",
    "YouTube Channel Banner Downloader",
    "Download a YouTube channel banner image when available.",
    "youtube channel banner downloader",
    card(
        "YouTube Channel Banner Downloader",
        "Requires API key. Some channels may not expose a banner URL.",
        yt_key_note()
        + """
<input id="yt-url" class="w-full border rounded-lg px-3 py-2" placeholder="UC… or @handle">
<button type="button" id="yt-run" class="w-full bg-red-600 text-white py-3 rounded-lg">Get banner</button>
<div id="yt-out" class="py-4"></div>
""",
    ),
)

print("done remaining P1")
