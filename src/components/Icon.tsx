import { Icon as IconifyIcon } from '@iconify/react';

/**
 * Emoji → iconify icon mapping. Game-Icons covers most crops/produce in a
 * unified silhouette style; Pixelarticons covers UI bits cleanly.
 *
 * If an emoji isn't mapped, we render it as text — so platforms with good
 * emoji rendering still show something useful as a fallback.
 */
const EMOJI_TO_ICON: Record<string, string> = {
  // ---- Crops (game-icons) ----
  '🥕': 'game-icons:carrot',
  '🫛': 'game-icons:beanstalk',
  '🥦': 'game-icons:broccoli',
  '🥔': 'game-icons:potato',
  '🌷': 'game-icons:tulip',
  '🥬': 'game-icons:fluffy-cloud',     // leafy approximation (kale/bok choy/cabbage)
  '🌸': 'game-icons:lotus',
  '🧄': 'game-icons:garlic',
  '🌾': 'game-icons:wheat',
  '☕': 'game-icons:coffee-beans',
  '🍓': 'game-icons:strawberry',
  '🪴': 'game-icons:potted-plant',
  '🫐': 'game-icons:berries-bowl',
  '🌽': 'game-icons:corn',
  '🍺': 'game-icons:hops',
  '🌶️': 'game-icons:chili-pepper',
  '🍈': 'game-icons:melon',
  '🌺': 'game-icons:flower-pot',
  '⭐': 'game-icons:star-formation',
  '🌼': 'game-icons:daisy',
  '🌻': 'game-icons:sunflower',
  '🍅': 'game-icons:tomato',
  '🍍': 'game-icons:pineapple',
  '🥒': 'game-icons:cucumber',
  '🌿': 'game-icons:plant-watering',
  '🍠': 'game-icons:potato',
  '🔴': 'game-icons:berries-bowl',     // cranberries
  '🍆': 'game-icons:eggplant',
  '🌹': 'game-icons:rose',
  '🍇': 'game-icons:grapes',
  '🎃': 'game-icons:pumpkin',
  '💎': 'game-icons:cut-diamond',
  '🍵': 'game-icons:tea-pot',
  '🌵': 'game-icons:cactus',
  '🍉': 'game-icons:watermelon',
  '🪨': 'game-icons:stone-block',
  '🌱': 'game-icons:seedling',

  // ---- Fertilizers ----
  '🚫': 'pixelarticons:close-box',
  '🟫': 'game-icons:powder',           // basic
  '🟧': 'game-icons:powder',           // quality (color via CSS)
  '🟪': 'game-icons:crystal-bars',     // deluxe
  '🟢': 'game-icons:vine-leaf',        // speed
  '🔵': 'game-icons:vine-leaf',        // deluxe-speed
  '⚡': 'pixelarticons:zap',           // hyper-speed
  '💧': 'game-icons:water-drop',
  '🌊': 'game-icons:wave',
  '🌳': 'game-icons:oak-leaf',

  // ---- UI ----
  '🧪': 'game-icons:potion-ball',
  '📜': 'game-icons:scroll-quill',
  '☀️': 'pixelarticons:sun-alt',
  '🌙': 'pixelarticons:moon',

  // ---- Quality ----
  '⬜': 'pixelarticons:square-rounded',
  '🥈': 'game-icons:abstract-013',     // silver-ish badge
  '🥇': 'game-icons:medal',
  '💠': 'game-icons:diamonds',
};

interface Props {
  emoji: string;
  size?: number | string;
  className?: string;
  title?: string;
}

export function Icon({ emoji, size = '1em', className, title }: Props) {
  const name = EMOJI_TO_ICON[emoji];
  if (!name) {
    return <span className={className} title={title} aria-hidden>{emoji}</span>;
  }
  return (
    <span className={className} title={title} aria-hidden>
      <IconifyIcon
        icon={name}
        width={size}
        height={size}
        className="pixel-icon"
      />
    </span>
  );
}
