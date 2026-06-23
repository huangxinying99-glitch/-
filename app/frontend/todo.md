# Mario-Style Platformer Game - 小西红柿闯关

## Design
- **Style**: Classic Mario-style pixel platformer with vibrant colors
- **Color Palette**: Sky blue (#5C94FC), Green platforms (#48D048), Brown ground (#8F563B), Red player (#FF4545)
- **Typography**: Retro pixel-style font feel using system fonts with bold weights
- **Key Components**: Canvas-based game rendering, HUD overlay, touch controls, menu screens

## Development Tasks
- [x] Create game constants (levels, physics, tile maps for 5 levels + sub-world)
- [x] Create game types (Entity, GameState, Projectile interfaces)
- [x] Create game loop hook (useGameLoop)
- [x] Create main Game component with full game logic (player, enemies, items, physics, rendering)
- [x] Create Index page integrating the Game component
- [x] Install motion dependency and run lint/build
- [x] Homepage leaves positioned outward to cover yellow corners with sway animation
- [x] Decorative flowers (flower.png / flowers.png) distributed on platform surfaces
- [x] Snail patrol restricted to ground/platform with edge detection
- [x] 3-layer parallax background: trees (fast) > mountains (medium) > clouds (slow)
- [x] Pipe mechanics: player stands on top, bounce animation before entering, jump to exit underground
- [x] Replace pipe rendering with pipe.png image
- [x] Replace rabbit rendering with rabbit.png image
- [x] Flower collection spawns coin pop-up animation with spinning coin and "+1" text
- [x] Tomato mouth protrudes forward when shooting (250ms animation)
- [x] Both single flower (flower.png) and flower bunch (flowers.png) appear on platform surfaces
- [x] Level 4 water pools fill recessed terrain with gradient, waves, and bubbles
- [x] Level 5 mud pits fill recessed terrain with gradient, bubbles, and claw animation
- [x] Homepage layout adjustment guide with Chinese comments for position/size tuning
- [x] Level 1 ceiling snails removed (ground-only snails)
- [x] Shooting animation uses stretched tomato image (no separate mouth overlay)
- [x] Decorative flowers sit on platform surface (not floating)
- [x] Level 2 Monster1 count increased from 3 to 6
- [x] Pipe auto-suck: player jumps to pipe and gets sucked in automatically
- [x] Goal flag replaced with big seed (seed.png) with glow and sparkle effects
- [x] Homepage leaves moved down by 1/4 body height (bottom: -15% → -29%)
- [x] Flower collection: shake animation (400ms) → coin pops out → player collects coin for +1
- [x] Underground sub-world pipes placed on ground level instead of ceiling
- [x] Underground exit pipe requires pressing DOWN key (not auto-trigger)
- [x] Exit pipe shows "按 ↓ 出去" hint text with bobbing animation
- [x] Flower collision hitbox expanded by 8px for easier triggering
- [x] Coin auto-collects after 600ms if player doesn't reach it
- [x] Level 4 water pools expanded to 8 tiles wide (FWWWWWWF), flush with ground platforms
- [x] ALL flowers (level-placed & decorative) are now interactive: shake on touch → coin pops out → collect for +1
- [x] Decorative flowers converted from visual-only to item entities with collision detection
- [x] Coin count displayed in top HUD bar

## Level Design
- **Level 1**: Snails (ground + ceiling), coins, flowers, goal flag
- **Level 2**: Two Monster1 enemies that jump low and shoot photo-balls
- **Level 3**: Pipe to underground world (5 moles in pits), 10 rabbits on surface
- **Level 4**: Water pits with piranhas (3 hits = game over), 10 frog enemies
- **Level 5**: Vines under platforms, diving eagles, 3 mud pits with claws

## Files to Create
1. `src/constants.ts` - Game constants, level tile maps, physics values
2. `src/types.ts` - TypeScript interfaces
3. `src/hooks/useGameLoop.ts` - RequestAnimationFrame game loop
4. `src/Game.tsx` - Main game component (rendering + logic)
5. `src/pages/Index.tsx` - Page wrapper