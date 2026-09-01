# KisanLink Visual Direction Exploration

Direction A was selected on 1 September 2026. The optimized production assets are now stored in `frontend/public/assets/produce/` and referenced by the frontend. Options B and C remain here only as archived direction studies.

## Produce imagery

- **Option A — Isolated photography:** natural, catalog-quality produce on warm cream with a shared camera and lighting setup.
- **Option B — Premium realistic 3D:** consistent CGI produce staged on the application's existing pastel visual fields.
- **Option C — Editorial farm photography:** product-led harvest imagery with visible farm origin and a shared documentary color grade.

Selected direction: **Option A**. Its isolated photography now sits inside the application's existing pastel card compositions without changing the UI hierarchy.

The three preview sheets were generated with the built-in image generation tool and converted to optimized WebP files for this folder.

### Production asset prompt specification

Each produce file was generated separately with the built-in image generation tool using this shared specification:

```text
Use case: product-mockup
Asset type: KisanLink marketplace and hero transparent produce asset
Scene/backdrop: genuinely transparent background with clean alpha edges
Style/medium: high-end photorealistic isolated farm-produce photography, accurate natural texture, restrained premium catalog quality, never glossy
Composition/framing: centered three-quarter view, complete silhouette, consistent 70mm product-photo perspective, generous 18 percent transparent padding, soft contact shadow contained beneath the produce
Lighting/mood: one large softbox from upper left with gentle natural fill, warm neutral color balance
Color palette: natural produce color with restrained deep green or golden crop accents
Constraints: actual transparency; no visible backdrop; no text; no logo; no watermark; no packaging, utensils, hands, shelves, soil pile, or unrelated produce
Avoid: emoji look, cartoon clipart, oversaturation, plastic texture, floating object, cropped edges
```

Subject directives: four vine tomatoes; four new potatoes; three red onions; one cauliflower head; three green capsicums; four carrots; one Sharbati wheat sheaf; basmati rice panicles with long grains; three Himachali apples; yellow mustard flowers with seeds; one baby spinach bunch; and three cucumbers. Final files use true alpha, 1024px maximum width, and optimized WebP encoding.

### Option A prompt

```text
Use case: product-mockup
Asset type: KisanLink website produce art-direction preview sheet
Primary request: Create a premium horizontal triptych showing three isolated farm produce subjects in one consistent photographic art direction: ripe red tomato cluster, earthy new potatoes, and red onions.
Scene/backdrop: warm cream #F7F4EB with three equal, subtly separated areas and generous clean padding.
Subject: left tomato cluster with natural leaves; center group of 3 to 4 potatoes; right group of 2 to 3 red onions.
Style/medium: high-end photorealistic isolated produce photography, accurate natural texture, clean catalog cutout quality, understated rather than glossy.
Composition/framing: each product centered at the same visual scale, three-quarter view, complete silhouette, soft contact shadow, suitable for extraction into transparent WebP assets.
Lighting/mood: one shared large softbox from upper left, warm natural color balance, restrained premium mood.
Color palette: warm cream, natural produce colors, deep green leaf accents.
Constraints: consistent camera angle and lighting across all three; no text; no labels; no logos; no watermark; no utensils, packaging, hands, supermarket shelves, or extra produce.
Avoid: emoji look, cartoon clipart, oversaturated stock-photo styling, plastic surfaces, mismatched lighting.
```

### Option B prompt

```text
Use case: stylized-concept
Asset type: KisanLink website produce art-direction preview sheet
Primary request: Create a premium horizontal triptych showing three realistic 3D produce renders in one exact art direction: ripe red tomato cluster, earthy new potatoes, and red onions.
Scene/backdrop: three equal rounded visual fields using restrained pastel backdrops that fit KisanLink: tomato blush #F3C8B8, potato sand #E2D3B4, onion mauve #DFC9DD, surrounded by warm cream #F7F4EB.
Subject: left tomato cluster with a few elegant green leaves; center group of 3 to 4 potatoes; right group of 2 to 3 red onions.
Style/medium: sophisticated tactile 3D render with realistic proportions and texture, premium editorial CGI, softly stylized but not cartoonish.
Composition/framing: each product centered at the same visual scale in its own equal area, three-quarter view, complete silhouette, rounded composition and generous padding, suitable for marketplace cards and a larger hero crop.
Lighting/mood: one shared soft studio light from upper left, subtle ambient occlusion, controlled shadows, calm premium mood.
Color palette: KisanLink warm cream, deep natural green, soft produce pastels, natural produce colors.
Constraints: exact style, camera, material realism, and lighting consistency across all three; no text; no labels; no logos; no watermark; no utensils, packaging, hands, or extra produce.
Avoid: emoji shapes, toy-like clay, cartoon clipart, glossy plastic, neon colors, exaggerated faces, inconsistent stock styles.
```

### Option C prompt

```text
Use case: photorealistic-natural
Asset type: KisanLink website produce art-direction preview sheet
Primary request: Create a premium horizontal editorial-agriculture photography triptych for tomato, potato, and red onion, each visibly connected to farm origin while remaining clean enough for a marketplace card crop.
Scene/backdrop: three equal panels in real harvest settings: tomato on a weathered wooden harvest crate with a hint of vine and field bokeh; freshly lifted potatoes on soft dark soil in a shallow farm basket; red onions with papery skins on a woven field mat with subtle green rows behind.
Subject: left ripe tomatoes; center new potatoes; right red onions. No people or faces.
Style/medium: sophisticated Indian agricultural editorial photography, authentic textures, quiet documentary premium feel, not generic grocery stock.
Composition/framing: product-dominant close crop at consistent scale, shallow depth of field, clean center focal area, enough negative space and edge simplicity for rounded UI card crops.
Lighting/mood: shared soft early-morning natural light, warm but restrained, trustworthy and grounded.
Color palette: warm earth, cream, deep farm green, natural produce color; coherent color grade across all three panels.
Constraints: visually consistent lens, daylight, contrast, and grading across all panels; no text; no labels; no logos; no watermark; no hands, faces, plastic crates, retail shelving, packaging, or extra unrelated produce.
Avoid: staged supermarket photography, rustic clutter, oversaturation, dark moody food photography, tourist imagery, stereotypes.
```

## Logo concepts

- **01 Furrow Link:** two field rows become one direct trade link.
- **02 K-Route:** a compact K monogram built from growth and a routed connection.
- **03 Field Bridge:** farmer and buyer nodes joined above cultivated field rows.
- **04 Seed Exchange:** a seed silhouette formed by two reciprocal, interlocking halves.

Final direction: an original **Farmer Link** emblem inspired by the selected farmer-and-harvest references. The simplified farmer profile, linked forearms, seedling, and harvest sun are implemented as native SVGs in `frontend/public/assets/brand/`; the earlier four concepts remain archived exploration.

The logo concepts are original native SVG constructions and are shown as icon-only and wordmark variants on cream and deep green.
