import customLevels from './customLevels';

export const TILE_SIZE = 40;
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const GRAVITY = 1.2;
export const JUMP_STRENGTH = -18;
export const MOVE_SPEED = 9;
export const FRICTION = 0.82;
export const ENEMY_SPEED = 3;

// All levels: 14 rows (index 0-13). Ground '#' at row 13 ->y=520, bottom=560.
// Top 20px of ground visible = thin ground strip flush with canvas bottom.
// Gameplay platforms connect down to ground. Only 1 row of ground '#' at the bottom.

// Level 1: Snails - snails on every platform surface
const LEVEL_1 = [
  '                                                            ',
  '                                                            ',
  '                                                            ',
  '            ##   ##                                         ',
  '                                                            ',
  '                        *                                   ',
  '                                                            ',
  '    P         N   ####S####     N    *                      ',
  '         N                      ###########   N        G    ',
  '    ##  N   N      N  N  N N                  N  ##   ###   ',
  '  ####   ######  ########  ######  N  N   N ######  N ###   ',
  '  ####   ######  ########  ######  ########## ######  ###   ',
  '                                                            ',
  '########################################################################',
];

// Level 2: Monster1 - monsters at varying heights on different platforms
const LEVEL_2 = [
  '                                                            ',
  '                                                            ',
  '                                                            ',
  '                          Y              Y                  ',
  '    P                  ####           ####                  ',
  '              Y    *           *                            ',
  '         ####    ####    ####    ####       Y          Y    ',
  '              Y        Y    Y         ####       Y      G  ',
  '    ##                     ####    ####  ####  ####  ### ###',
  '  ####   S    S                                      ### ###',
  '  ####  ###  ###   ####    ####   ########  ######## ### ###',
  '                                                            ',
  '                                                            ',
  '########################################################################',
];

// Level 3: Rabbits - platforms at varying heights
// Pipe 'U' is on the ground level (not floating)
const LEVEL_3 = [
  '                                                                                            ',
  '                                                                                            ',
  '                                                                                            ',
  '                                                                                            ',
  '    P        R       *       R       *       R       *               G                      ',
  '        R          R          R          R          R         R                             ',
  '   ####      ##      ###       ##       ####      ##       ###                              ',
  '       ###        ####        ##         ####        ###                                    ',
  '  ######     ###        ####       ###        ####        ####                              ',
  '            ######     ##      ######     ##      ######                                    ',
  '                                                                                            ',
  '                                                                                            ',
  '                                        U                                                   ',
  '############################################################################################',
];

// Level 4: Water pits with piranhas + Frogs
// Water pools: 2 rows tall, flanked by land walls
// Pattern: #FWWWF# top row (piranhas in water) + #WWWWW# bottom row (deep water)
// First pond has 3 piranhas (FFF pattern)
const LEVEL_4 = [
  '                                                                              ',
  '                                                                              ',
  '                                                                              ',
  '    P                                                                         ',
  '              *                *                *                              ',
  '         ####            ####            ####            ####                  ',
  '    ##        K    K          K    K          K    K          K    K      G   ',
  '  ####  K         K     K         K     K         K     K         K   #######',
  '  ####  ##      ##      ##      ##      ##      ##      ##########   #######',
  '  ####  #FFFWWW#        #FWWWWF#        #FWWWWF#                     #######',
  '  ####  #WWWWWW#        #WWWWWW#        #WWWWWW#                     #######',
  '  ####  ########        ########        ########                     #######',
  '                                                                              ',
  '############################################################################# ',
];

// Level 5: Vines + Eagles + Mud pits
// Mud is only 1 layer, fully surrounded by land on all sides (left, right, bottom)
// Added 5 extra vines (total 11 vines)
const LEVEL_5 = [
  '                                                            ',
  '                                                            ',
  '       A              A              A                      ',
  '    P    V  V    V  V    V  V    V  V    V  V    V         ',
  '         ####    ####   ####    ####   ####    ####         ',
  '                                                            ',
  '                                                            ',
  '    ##                                                   G  ',
  '  ####  ##    ##     ##    ##     ##    ##            ######',
  '  ####  ##LLL##      ##LLL##      ##LLL##    ######  ######',
  '  ####  #######      #######      #######     ######  ######',
  '                                                            ',
  '       T           T           T           T           T            ',
  '########################################################################',
];

// Level 6: Crushing Pillars - Pillars press down toward stair-like ground platforms
// 'I' = pillar origin (extends down to ground, moves up/down)
// Ground has stair-like platforms at different heights for variety
const LEVEL_6 = [
  '                                                                                    ',
  '                                                                                    ',
  '    P  *  I####I     *  I####I     *  I####I     *  I####I     *                    ',
  '         I####I        I####I        I####I        I####I                           ',
  '                                                                                    ',
  '    ##                                                                           G  ',
  '                                                                              ######',
  '                                                                         ###  ######',
  '                                                                    ###  ###  ######',
  '              ####           ####           ####           ###  ###  ###  ###  ######',
  '  ####   ###########   ###########   ###########   ###  ###  ###  ###########  #####',
  '  ####   ###########   ###########   ###########   ###  ###  ###  ###########  #####',
  '  ####   ###########   ###########   ###########   ###  ###  ###  ###########  #####',
  '########################################################################################',
];

// Level 7: Pea slope challenge
const LEVEL_7 = [
  '                                                                                ',
  '                                                                                ',
  '                                                                                ',
  '                              Q                              Q                  ',
  '                          ######                         ######                 ',
  '                                                                                ',
  '                 Q                         Q                                    ',
  '             ######                    #####                                    ',
  '                                                                                ',
  ' P                  M                         M                              G  ',
  '############ZZXX###############ZZXX###############ZZXX###########################',
  '################################################################################',
  '################################################################################',
  '################################################################################',
];

// Level 8: Cannon Barrage - Cannons on floating platforms and ground
// 'C' = cannon (shoots left), 'B' = cannon (shoots right)
// Some cannons on upper floating platforms, only 3 cannons on ground level
// Water pools (#FWWWWF# / #WWWWWW# pattern) between ground platforms
const LEVEL_8 = [
  '                                                                                    ',
  '                                                                                    ',
  '                                                                                    ',
  '    P    *         *   ####      *         *         *   ####      *                ',
  '         C              C              C              C                             ',
  '    ##   ####      ####      ####      ####      ####      ####                    ',
  '                                                                                    ',
  '              *         *         *         *         *                          G  ',
  '              C              C              C                                       ',
  '         ####      ####      ####      ####      ####      ####       ####   ######',
  '                                                                                    ',
  '         ##            ##            ##            ##            ##          ######  ',
  '  ##  #WWWWWW#  ##  #WWWWWW#  ##  #WWWWWW#  ##  #WWWWWW#  ##  #WWWWWW#    ######  ',
  '########################################################################################',
];

// Level 9: Caves - 6 caves (3 intake O, 3 exhaust E), paired by order
// Varied terrain with hills, gaps, and platforms at different heights
// O = intake (suction), E = exhaust (blow out)
// Pairing: 1st O ->1st E, 2nd O ->2nd E, 3rd O ->3rd E
// Pair 2 is swapped: intake on top, exhaust on bottom
// Caves are horizontally offset (not vertically aligned)
const LEVEL_9 = [
  '                                                                                    ',
  '                                                                                    ',
  '                                                                                    ',
  '    P        E                O                    E                                ',
  '            ###              ###                  ###                                ',
  '    ##                  ####                  ####                                   ',
  '                                                                                    ',
  '         *            *           *          *          *                        G  ',
  '  #     J  ##   ##      ##   J #      ##   J  ###     J  ##    ##   ######         ',
  '  #       ####  ####   ###     ###   ####    #####     # ####  ###  ######         ',
  '  #      ###### ###### ###     ##### ######  #####     #####  ####  ######         ',
  '  #      ######  ##### ##      #### ## ##### ## ##     #######  ##### ######        ',
  '     O   ##     J  ##       E   ##       J  ##     O                               ',
  '########################################################################################',
];

// Level 10: Final Gauntlet - All enemy types combined in epic finale
const LEVEL_10 = [
  '                                                                                                      ',
  '       A              A  ####        A  *           A   *          A              A                   ',
  '                 ###                                                                  ####            ',
  '    P       *    *         *           ###     *     ####     *###      *    *                        ',
  '           ####                 ####           #              ####   ####    ####                     ',
  '              R    Y         K    N         R    Y         K    N         R    Y                      ',
  '         ##     ###   ###  ####  ########    ####  ###   ####  ####        ####                       ',
  '   #          K         K         K         K         K         K      ## K                G          ',
  '  ###    K         K         K         K         K         K         K         K    ##  ######        ',
  '  ####  #FWWWWF#           #FWWWWF#           #FWWWWF#     ####  #FWWWWF##    ####      ###########   ',
  ' #####WW#WWWWWW#   ##     #WWWWWW#          #WWWWWW#          #WWWWWW#WWWWWWWWWWWWWWW####     ###     ',
  ' ###############WWWWWWWW##########WWWWWW############WWWW##############WWWWWWW####WW######    ####     ',
  'WW##########WWWWWWWWWWWWWWWW#####WWWWWWWW###########WWWWW########WWWWWWWWWWWWWWWWW####WWWWWWWWWWWWWW##',
  '###########################################################################################WWWWWWWWW##',
];

const BASE_LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_7, LEVEL_8, LEVEL_9, LEVEL_10];

export const LEVELS = BASE_LEVELS.map((level, index) => customLevels[index] || level);

// Sub-world for Level 3 (underground)
const SUB_WORLD_1 = [
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '    P                     *       ',
  '                                  ',
  '    ##    ##    ##    ##    ##    ',
  '  D                               ',
  '  ####  ####  ####  ####  ####  ##',
  '                                  ',
  '                                  ',
  '                                  ',
  '##################################',
];

export const SUB_WORLD_LEVELS = [SUB_WORLD_1];




