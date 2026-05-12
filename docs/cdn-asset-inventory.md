# CDN Asset Inventory — manuscdn.com URLs

**Date:** 12 May 2026  
**Total unique assets:** 34 (27 images + 7 videos)  
**Total size:** ~257 MB (9 MB images + 248 MB videos)

---

## Images (27 files, ~9 MB total) → Cloudinary

| # | Filename | Type | Size | Used In |
|---|----------|------|------|---------|
| 1 | PNSTmVAGBQQgOlVy.png | PNG | 116 KB | Header.tsx, LoginTransition.tsx, main.tsx (logo — 3 refs) |
| 2 | cCIiqSZESwdbtugN.png | PNG | 5.5 MB | ChatWidget.tsx, VoiceChatWidget.tsx (greeting lady — DELETING these files) |
| 3 | cuoZWmjPGnGiJcSS.jpg | JPG | 271 KB | Home.tsx (hero video poster) |
| 4 | fYHiyJVvyVYquZaW.jpg | JPG | 395 KB | Home.tsx (video poster), Menu.tsx |
| 5 | CWmnTPwxvTOuCjdR.jpg | JPG | 370 KB | LeelaHyderabad.tsx (event poster) |
| 6 | oYJCqVKJtKJXPqDV.jpg | JPG | 137 KB | Events.tsx |
| 7 | AhKEDpajDbldxQIF.jpg | JPG | 216 KB | Events.tsx |
| 8 | gaVGmAQGfvzdLfvo.jpg | JPG | 266 KB | Events.tsx |
| 9 | WkPwhHgxpahbIVvi.jpg | JPG | 95 KB | Menu.tsx (hazelnut milk tea) |
| 10 | AcVAopeVLVKfoKoM.jpg | JPG | 89 KB | Menu.tsx |
| 11 | CdvihcYqWwSGVVqs.jpg | JPG | 116 KB | Menu.tsx |
| 12 | FpNjaMkCtHPSSjAg.jpg | JPG | 71 KB | Menu.tsx |
| 13 | HzuOkwViKWywSApJ.jpg | JPG | 89 KB | Menu.tsx |
| 14 | IWpHWvXBnTknigfp.jpg | JPG | 108 KB | Menu.tsx |
| 15 | JIfaoWUoeItjtLNs.jpg | JPG | 96 KB | Menu.tsx |
| 16 | NyxsfcZEQisPUFXb.jpg | JPG | 96 KB | Menu.tsx |
| 17 | VumwBnugNbUPZfGP.jpg | JPG | 117 KB | Menu.tsx |
| 18 | aJzlzKDqlmGFMmbT.jpg | JPG | 46 KB | Menu.tsx |
| 19 | fwbObkBdJAfUquQz.jpg | JPG | 76 KB | Menu.tsx |
| 20 | gijTUDecXirMLNbg.jpg | JPG | 44 KB | Menu.tsx |
| 21 | kTxbrdufpmJRQCdX.jpg | JPG | 79 KB | Menu.tsx |
| 22 | lQcSLUexheHdEdYh.jpg | JPG | 105 KB | Menu.tsx |
| 23 | pYbRhiNlPbOcebsT.jpg | JPG | 133 KB | Menu.tsx |
| 24 | soALHhslexdCuzFf.jpg | JPG | 60 KB | Menu.tsx |
| 25 | uefHOGNUJaQUNIhx.jpg | JPG | 100 KB | Menu.tsx |
| 26 | wtAnUeYdJDFoSgKS.jpg | JPG | 31 KB | Menu.tsx |
| 27 | ycWWgbSAUZVoaeTy.jpg | JPG | 75 KB | Menu.tsx |

**Note:** Item #2 (cCIiqSZESwdbtugN.png, 5.5 MB) is only used in ChatWidget and VoiceChatWidget — both files are being deleted in Step 2. This asset does NOT need migration. Effective image migration: **26 images, ~3.5 MB**.

---

## Videos (7 files, ~248 MB total) → DigitalOcean Spaces

| # | Filename | Type | Size | Used In |
|---|----------|------|------|---------|
| 1 | ecOaguDqCiMAAaot.mp4 | MP4 | 52.3 MB | Home.tsx (hero background video) |
| 2 | bnVxigSNwrNZdrqE.mp4 | MP4 | 44.5 MB | Home.tsx (category tile video) |
| 3 | OXrITxhITgHnggSH.mp4 | MP4 | 38.0 MB | Home.tsx (category tile video) |
| 4 | SidroKXBRlTSURyD.mp4 | MP4 | 37.3 MB | Home.tsx (category tile video) |
| 5 | CKsMrsUAUMbuMMbu.mov | MOV | 35.8 MB | Home.tsx (category tile video) |
| 6 | tRoWoigbWbPFdWft.mp4 | MP4 | 21.3 MB | Home.tsx (category tile video) |
| 7 | bNweCHEHeGisBBOW.mp4 | MP4 | 18.7 MB | Home.tsx (category tile video) |

---

## Files Affected (after excluding deletions)

| Source File | Image Refs | Video Refs | Total Refs |
|-------------|-----------|-----------|------------|
| client/src/pages/Home.tsx | 2 | 7 | 9 |
| client/src/pages/Menu.tsx | 16 | 0 | 16 |
| client/src/pages/Events.tsx | 3 | 0 | 3 |
| client/src/pages/LeelaHyderabad.tsx | 1 | 0 | 1 |
| client/src/components/Header.tsx | 1 | 0 | 1 |
| client/src/components/LoginTransition.tsx | 1 | 0 | 1 |
| client/src/main.tsx | 1 | 0 | 1 |
| **Total** | **25** | **7** | **32** |

(ChatWidget.tsx and VoiceChatWidget.tsx excluded — being deleted)

---

## Migration Plan

**Images (26 assets, ~3.5 MB):**
1. Download all 26 images to local sandbox
2. Upload to Cloudinary under `taiwan-maami/static/` folder
3. Replace manuscdn.com URLs with Cloudinary delivery URLs (f_auto,q_auto for optimization)

**Videos (7 assets, ~248 MB):**
1. Download all 7 videos to local sandbox
2. Upload to DigitalOcean Spaces bucket
3. Replace manuscdn.com URLs with DO Spaces CDN URLs

**Events.tsx special case:** 3 URLs are malformed (Cloudinary URL wrapping manuscdn URL). These need to be fixed — download the original manuscdn images and upload properly to Cloudinary.
