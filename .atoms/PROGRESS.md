---
last_updated: 2026-05-14T10:27:30Z
---

# Requirements & Progress

## Requirements Overview

## User Stories

## Task Breakdown
- [x] Fix auto-advance issue: Add 1-second cooldown after gameWon to prevent accidental level skip
- [x] Modify Level 4 water pool: Use grass.png/land.png for platforms and water.png/pond.png for water hazards
- [x] Refine water pool pattern: Narrower pools (#FWWWWF# pattern) matching demo image for Levels 4, 8, and 10
- [x] Remove slopes from Level 3: Replaced 'ZZ' slope tiles with '##' regular platforms
- [x] Add monsters at varying heights in Level 2: Added 'Y' monsters on elevated platforms at different heights
- [x] Fix mid-game crash: Added try-catch in game loop, fixed monster1 bounce-every-frame issue, fixed mud instant-death logic, clear refs on restart
- [x] Redesign HUD to pixel art retro style with neon accents
- [x] Redesign star exchange dialog in pixel style
- [x] Redesign level select in pixel grid style
- [x] Redesign game over screen in retro pixel style
- [x] Redesign level complete screen in pixel style
- [x] Redesign mobile touch controls in retro gamepad style
- [x] Redesign keyboard hints bar in terminal/pixel style
- [x] Redesign game over screen in retro pixel style
- [x] Redesign level complete screen in pixel style
- [x] Redesign mobile touch controls in retro gamepad style
- [x] Revert all UI to clean simple icon style: HUD with pill indicators, level select with flat-3D cartoon buttons, white card overlays, simple controls
- [x] Add grand victory scene for Level 10 completion: fireworks, trophy, shooting stars, golden confetti, 5-star spin animation, stats summary, replay/home buttons
- [x] Level 10: Thunder sound triggers with lightning flash, egg projectiles spin faster (0.35 vs 0.08), enhanced hit flash with red screen flash + shockwave ring + alternating glow
- [x] Cleanup: Removed unused bCloudImg ref, lastLightningRef, and b-cloud image loading code
- [x] Level 10: Enhanced bat dive-bombing behavior (flying→diving→ascending states) and periodic atmospheric lightning flashes
- [x] Level 7: Redesigned terrain with individual tile-based slopes (slope_left.png, slope_right.png) for seamless staircase terrain
- [x] Level 2: Added foreground bird decoration using bird.png (two birds flying at different heights/speeds with gentle sine wave paths)
- [x] Level 3 sub-world: Integrated earth.png as tiled background, earth-1.png for platform tiles, root-of-tree.png as hanging decorations from top/bottom

## Progress Log
- 2026-06-02: Redesigned homepage logo from image to CSS 3D bubble text "小西西的奇妙冒险" with per-character colors, white outlines, 3D depth shadows, and playful rotations (BLOCK BLAST style)
- 2026-05-27: Fixed Level 3 pipe: moved from floating mid-air (row 8) to ground level (row 12, just above ground)
- 2026-05-27: Fixed Level 5 sky: removed coloredClouds ellipses, moved sun to bottom-right (x:0.85, y:0.8)
- 2026-05-27: Redesigned Level 8 cannons: added cannons on upper floating platforms (row 5), reduced ground cannons to 3
- 2026-05-27: Tripled flower parallax speed (0.18x vs grass 0.02x) and added infinite looping so flowers continuously cycle across screen
- 2026-05-27: Added Level 1 stretched background image (01.jpg) rendered behind all game elements
- 2026-05-18: Fixed auto-advance issue by adding gameWonTimeRef cooldown (1 second delay before Enter can advance to next level)
- 2026-05-18: Implemented tile-based rendering for platforms (grass.png top + land.png body) and water hazards (water.png surface + pond.png body)
- 2026-05-19: Redesigned Level 4 water pools to single-row pattern with land walls flanking water
- 2026-05-19: Redesigned Level 5 mud pits to be in recessed pits (凹坑) surrounded by land on all sides
- 2026-05-19: Redesigned Level 6 with stair-like ground platforms at different heights for pillars to crush toward
- 2026-05-19: Updated Level 10 water pools to match new single-row pattern
- 2026-05-19: Added snails on every platform surface in Level 1
- 2026-05-19: Fixed Level 4 water pools to be 2 tiles tall (surface + deep water) so piranhas can bob up/down properly
- 2026-05-19: Fixed Level 5 mud pits - shortened mud (LLL) to fit within surrounding land walls
- 2026-05-19: Fixed Level 6 pillar crush damage - now detects direct collision with player and crush against platforms
- 2026-05-19: Added star exchange feature: collect 3 stars → UI flashes for 5s → click to exchange for 1 life (max 3)
- 2026-05-19: Fixed Level 4 piranhas: first pond has 3 piranhas, all piranhas bob within pond's full 128px height
- 2026-05-19: Pond rendered at full 128px natural height, piranhas overlap with pond visually
- 2026-05-19: Replaced pond.png with new user-provided image
- 2026-05-19: Level 5: Added 5 extra vines (total 11 vines)
- 2026-05-19: Level 6: Changed pillar damage to crush-only (must be sandwiched between pillar and platform)
- 2026-05-19: Level 4: Piranhas strictly constrained within pond's 2-tile height (80px), clamped to bounds
- 2026-05-19: Fixed pond rendering: constrained to exactly 2 tiles (80px) height, no longer extends below grass/land floor
- 2026-05-19: Fixed piranha movement: bobs only within pond body (below wave surface, above land floor)
- 2026-05-19: Fixed Level 5 mud: only 1 tile tall, fully surrounded by land (added land floor below mud pits)
- 2026-05-19: Fixed Level 4 water flush: 'F' positions now also create water hazard tiles so water surface is level across entire pool
- 2026-05-19: Fixed Level 5 vines: now hang from bottom of floating platforms (start at platform bottom edge, extend 4 tiles down)
- 2026-05-19: Added slopes to Level 3 using slope.png (top) + land.png (body), 3 tiles tall with proper collision
- 2026-05-19: Removed slopes from Level 3 (replaced Z tiles with # platforms)
- 2026-05-19: Added monsters at varying heights in Level 2 (new elevated platforms with Y enemies)
- 2026-05-19: Fixed mid-game crash: monster1 now bounces every 800ms instead of every frame, mud uses gradual damage instead of instant death, game loop wrapped in try-catch, resetGame clears all input refs
- 2026-05-20: Fixed Level 3 pipe visibility: cleared platform tiles directly above pipe position in row 9, removed adjacent ## on row 11
- 2026-05-20: Verified Level 6 pillars are impassable (already included in allSolids collision detection)
- 2026-05-20: Verified Level 5 flowers-in-mud fix (nearMud check already prevents decorative flowers from spawning near mud)
- 2026-05-20: Fixed rendering crash: replaced undefined `now` variable with `Date.now()` in cannon smoke animation (line 1657)
- 2026-05-20: Added particle trail effect for Level 8 eagle-bullet projectiles (orange/yellow glowing trail with sparks)
- 2026-05-20: Improved pea projectile physics: stronger gravity, proper slope rolling (no bounce on slopes), damped bouncing on flat platforms, friction-based ground rolling
- 2026-05-20: Enhanced star collection animation: 4-phase sequence (rise up → grow to 2x → rotate 360° counter-clockwise → accelerate upward and fade out, 1200ms total)
- 2026-05-25: Redesigned game UI to Kirby-inspired cute style: pastel pink/orange/cream palette, rounded card panels with pink borders, ribbon-style headers, warm gradient backgrounds, playful buttons, confetti particles on win, cute mobile controls
- 2026-05-25: Enhanced game background: warm gradient sky (blue→peach→orange→green), dreamy bokeh circles, parallax clouds/mountains/trees with depth, foreground swaying flowers with blur depth-of-field effect
- 2026-05-25: Redesigned foreground flowers: fixed positions (not parallax), continuous undulating grass layers, level-specific creatures (ladybug L1/9, bird L2/10, grasshopper L3, bee L4, fireflies L6), flowers close at night (L7)
- 2026-05-26: Added smooth animated level transitions: star-wipe effect with time-of-day color themes, level name display during transition, 1.5s animation duration
- 2026-05-27: Level 5 thorns: added TTT thorn tiles below mud pits, instant death on contact (lives=0 immediately)
- 2026-05-27: Level 7 mirrored slopes: added X (left-facing) slopes on right side of valley for ascending terrain
- 2026-05-27: Redesigned Level 8: replaced cannons with popcorn buckets (red/white striped, cute face, squish animation), shoots 3-5 popcorn kernels in random directions every 3s, popcorn arcs with gravity and kills player on contact
- 2026-05-27: Redesigned Level 5 thorns: intertwined vine/bramble style with curving stems, sharp red thorns, small leaves, ground-rooted base (moved from floating row to ground-adjacent row 12)
- 2026-05-27: Redesigned Level 5 thorns again: thick bulky PvZ-style tentacle vines with creature eyes, curling spiral tips, thick thorn spikes, swaying animation, filling entire ground area
- 2026-05-27: Redesigned popcorn bucket charge animation: 3-phase (inflate with surprise face → squash flat holding breath with puffed cheeks/sweat → spring upward stretch and bounce release)
- 2026-05-28: Added Level 5 stretched background image (05.jpg) rendered behind all game elements, same approach as Level 1
- 2026-05-28: Implemented Level 9 cave openings using cave.png with airflow particle effects (upward-blowing particles, wispy trails, glowing rim) and airflow physics that push player upward when above caves
- 2026-05-28: Redesigned Level 9 windmills: wider blades (2x), round metallic hub with bolts, wooden pole base, removed house/desk-lamp structure, airflow-driven rotation (slow→fast→slow sine wave), firework frequency scales with speed, fireworks are white body + yellow halo + meteor tail, bounce 3 times on ground/platforms then disappear, added 2 floating platforms to Level 9
- 2026-05-28: Refined windmills: halved height (1.5 tiles), doubled width (4 tiles), stands on platform/ground, clear 3-phase cycle (accelerate 3s → fast 4s → decelerate 3s), flame frequency scales with speed (300ms at max, 2000ms at min), elongated meteor-style streaking tail with tapered gradient shape
- 2026-05-28: Further refined windmills: blade size halved again (2 tiles wide), added platforms below row-13 windmills, tripled max rotation speed (baseSpeed 0.15), redesigned fire trail with physically realistic thermal layers (white-hot core → yellow → orange combustion → red/dark smoke dissipation), turbulent edges, convection-driven ember sparks
- 2026-05-28: Added firework explosion particle effects: sparks spawn on ground/platform bounce with impact-speed-scaled intensity, orange/yellow/red particles with gravity and fade-out
- 2026-05-29: Added camera shake effect during firework explosions: intensity scales with impact speed, 200ms duration with linear decay, high-frequency random offset applied to entire canvas
- 2026-05-29: Redesigned BGM: cheerful bouncy melody with sine wave lead, triangle harmony, staccato bass, light hi-hat percussion for pleasant upbeat feel
- 2026-05-29: Replaced Level 9 firework image-based tail with pure particle trail (scattered glowing dots with color temperature gradient, no spliced segments)
- 2026-05-29: Implemented two-layer sun composite: sun1.png (rays) rotates continuously with pulsing glow, sun2.png (face) stays static centered on top
- 2026-05-29: Redesigned level-complete ribbons: 30 colorful ribbon pieces burst from behind UI card center, sway outward, fall with physics, and settle at screen bottom without disappearing
- 2026-05-29: Added sound toggle button (🔊/🔇) to in-game HUD next to back button, mutes/unmutes BGM and SFX
- 2026-06-02: Replaced level transition sun/moon canvas primitives with actual image assets (sun1.png rotating rays + sun2.png static face for sun, moon.png for moon) with glow effects and crossfade
- 2026-06-02: Updated homepage: replaced background with Main-Menu2.jpg, added animated sun (sun1.png rotating rays + sun2.png static face + pulsing glow halo), retained clouds
- 2026-06-03: Replaced homepage background with Main-Menu2.jpg, replaced buttons with image-based buttons (homepage-button1.png for level select, homepage-button.png for start game), redesigned level select UI to cartoon popup style (cream background, dashed stitch border, red ribbon header, colorful 3D rounded level buttons)
- 2026-06-03: Redesigned level select UI to flat-3D chunky style per user reference images: vibrant colored buttons (green/orange/pink/purple/blue/yellow/red/cyan) with thick borders and bottom shadow edges, green-bordered card on gradient green-to-yellow background, red 3D banner header, orange chunky back button, decorative corner circles
- 2026-06-03: Added flowing aurora borealis effect to Level 8 background (4 undulating bands with green/cyan/purple gradients + shimmering vertical rays)
- 2026-06-03: Added mother birds with eggs to Level 10 (3 colorful birds fly across at different heights carrying spotted eggs, dropping one egg mid-flight with gravity, crack, and splat effects)
- 2026-06-03: Redesigned Level 8 aurora to particle-based vertical pillars: upward-flowing cyan/turquoise particles, shimmering vertical ray streaks, bright horizon glow, matching reference image style
- 2026-06-04: Replaced Level 9 windmill canvas drawing with image-based pinwheel (pinwheel-1.png rotating blades + pinwheel-2.png fixed support pole)
- 2026-06-04: Doubled pinwheel rotation speed (baseSpeed 0.15→0.30), improved pole anchoring to platform (wider pole, 75% height alignment)
- 2026-06-04: Integrated wind sound effect for Level 9: starts/stops with level entry/exit, volume scales with windmill rotation speed, respects mute toggle
- 2026-06-04: Redesigned pinwheel proportions to match reference: short stout pole (40% height), thick 24px width, large blades (95% entity width), increased rotation speed to 0.45 baseSpeed, pole anchored directly on grass/platform surface
- 2026-06-09: Level 10: Enhanced bat dive-bombing behavior (3-state: flying→diving→ascending), periodic atmospheric lightning every 5+ seconds with thunder SFX and camera shake
- 2026-06-09: Level 7: Redesigned terrain with individual tile-based slopes (slope_left.png, slope_right.png) for seamless staircase terrain

