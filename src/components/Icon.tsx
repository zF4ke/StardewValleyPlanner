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
  '🌷': 'game-icons:lotus-flower',
  '🥬': 'game-icons:fluffy-cloud',     // leafy approximation (kale/bok choy/cabbage)
  '🌸': 'game-icons:lotus',
  '🧄': 'game-icons:garlic',
  '🌾': 'game-icons:wheat',
  '☕': 'game-icons:coffee-beans',
  '🍓': 'game-icons:strawberry',
  '🪴': 'game-icons:plant-roots',
  '🫐': 'game-icons:berries-bowl',
  '🌽': 'game-icons:corn',
  '🍺': 'game-icons:hops',
  '🌶️': 'game-icons:chili-pepper',
  '🍈': 'game-icons:hypersonic-melon',
  '🌺': 'game-icons:flower-pot',
  '⭐': 'game-icons:star-formation',
  '🌼': 'game-icons:daisy',
  '🌻': 'game-icons:sunflower',
  '🍅': 'game-icons:tomato',
  '🍍': 'game-icons:pineapple',
  '🥒': 'game-icons:solid-leaf',
  '🌿': 'game-icons:plant-watering',
  '🍠': 'game-icons:potato',
  '🔴': 'game-icons:berries-bowl',     // cranberries
  '🍆': 'game-icons:aubergine',
  '🌹': 'game-icons:rose',
  '🍇': 'game-icons:grapes',
  '🎃': 'game-icons:pumpkin',
  '💎': 'game-icons:cut-diamond',
  '🍵': 'game-icons:teapot-leaves',
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
  '🌊': 'game-icons:big-wave',
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

const EMOJI_COLOR: Record<string, string> = {
  '🥕': '#f28a2e', '🫛': '#6fbe48', '🥦': '#4d9a3d', '🥔': '#b98542',
  '🌷': '#e86aa0', '🥬': '#77b957', '🌸': '#f08fc4', '🧄': '#d8cfaa',
  '🌾': '#d6a43b', '☕': '#7b4a25', '🍓': '#d93a35', '🪴': '#6f9b42',
  '🫐': '#496cc8', '🌽': '#f0c23a', '🍺': '#d8972f', '🌶️': '#d9372f',
  '🍈': '#7fbd62', '🌺': '#df5c7b', '⭐': '#f4c430', '🌼': '#e9b83f',
  '🌻': '#e5a72e', '🍅': '#d84534', '🍍': '#d6a72c', '🥒': '#52983d',
  '🌿': '#5da449', '🍠': '#b9713d', '🔴': '#b92f36', '🍆': '#774aa4',
  '🌹': '#c83b54', '🍇': '#7b55b4', '🎃': '#d76b28', '💎': '#60b7e8',
  '🍵': '#5f9d59', '🌵': '#4e9b67', '🍉': '#da4c4a', '🪨': '#8d8a7e',
  '🌱': '#5ba83e', '🚫': '#ba3a32', '🟫': '#9a6a3d', '🟧': '#d97a2d',
  '🟪': '#9a67c8', '🟢': '#56a94f', '🔵': '#4d8edc', '⚡': '#f2c33a',
  '💧': '#4aa3df', '🌊': '#3b86c6', '🌳': '#4f9b47', '🧪': '#8dcf5d',
  '📜': '#c79852', '☀️': '#f5c542', '🌙': '#d8def8', '⬜': '#efe8d0',
  '🥈': '#bfc8d2', '🥇': '#e3b33c', '💠': '#68c7ea',
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
    <span
      className={className}
      title={title}
      aria-hidden
      data-emoji={emoji}
      style={{ color: EMOJI_COLOR[emoji] ?? 'currentColor' }}
    >
      <IconifyIcon
        icon={name}
        width={size}
        height={size}
        className="pixel-icon"
      />
    </span>
  );
}
