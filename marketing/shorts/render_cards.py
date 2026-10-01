from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
FRAMES = ROOT / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
BG = (247, 243, 234)
INK = (34, 31, 27)
MUTED = (103, 93, 82)
ACCENT = (184, 74, 56)
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


def font(size: int, bold: bool = False):
    index = 8 if bold else 0
    return ImageFont.truetype(FONT, size=size, index=index)


def center_text(draw, text, y, fnt, fill=INK, spacing=12):
    box = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=spacing, align="center")
    x = (W - (box[2] - box[0])) // 2
    draw.multiline_text((x, y), text, font=fnt, fill=fill, spacing=spacing, align="center")


def phone_card(canvas, source_name, top=390):
    shot = Image.open(SOURCE / source_name).convert("RGB")
    target_h = 1180
    target_w = int(shot.width * target_h / shot.height)
    shot = shot.resize((target_w, target_h), Image.Resampling.LANCZOS)
    radius = 54
    shadow = Image.new("RGBA", (target_w + 80, target_h + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 40, target_w + 40, target_h + 40), radius, fill=(0, 0, 0, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    x = (W - target_w) // 2
    canvas.alpha_composite(shadow, (x - 40, top - 25))
    mask = Image.new("L", (target_w, target_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target_w, target_h), radius, fill=255)
    canvas.paste(shot, (x, top), mask)


def base():
    return Image.new("RGBA", (W, H), BG + (255,))


cards = [
    ("01-hook.png", "한자는 읽는데\n직접 쓰려면 막힌다", "01-home.png", "JLPT 한자를 손으로 익혀보세요"),
    ("02-levels.png", "N5부터 N1까지", "02-categories.png", "레벨별로 필요한 한자만"),
    ("03-study.png", "뜻·음독·훈독·예문", "03-list.png", "헷갈리는 정보는 한 화면에"),
    ("04-write.png", "획순 보고, 직접 쓰기", "04-detail.png", "틀린 한자는 오답노트로 다시"),
]

for filename, headline, shot, footer in cards:
    image = base()
    draw = ImageDraw.Draw(image)
    center_text(draw, headline, 105, font(78, True), spacing=8)
    phone_card(image, shot)
    center_text(draw, footer, 1635, font(43), fill=MUTED)
    draw.rounded_rectangle((300, 1750, 780, 1832), 41, fill=ACCENT)
    center_text(draw, "서당 · 일본 한자 쓰기", 1765, font(36, True), fill=(255, 255, 255))
    image.convert("RGB").save(FRAMES / filename, quality=95)

image = base()
draw = ImageDraw.Draw(image)
icon = Image.open(SOURCE / "icon.png").convert("RGBA").resize((380, 380), Image.Resampling.LANCZOS)
mask = Image.new("L", icon.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 380, 380), 88, fill=255)
image.paste(icon, (350, 330), mask)
center_text(draw, "서당", 790, font(112, True))
center_text(draw, "일본어 한자 획순 쓰기 학습", 940, font(47), fill=MUTED)
draw.rounded_rectangle((215, 1110, 865, 1220), 55, fill=ACCENT)
center_text(draw, "iOS · Android 출시", 1133, font(50, True), fill=(255, 255, 255))
center_text(draw, "기본 학습 무료", 1320, font(46, True))
center_text(draw, "앱스토어에서 ‘서당’ 검색", 1420, font(40), fill=MUTED)
image.convert("RGB").save(FRAMES / "05-cta.png", quality=95)

print(f"Rendered {len(cards) + 1} cards to {FRAMES}")
