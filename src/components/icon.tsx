import {
  Activity, ArrowRight, ArrowUp, Bell, Book, BookOpen, CalendarDays,
  Camera, Check, ChevronLeft, ChevronRight, Compass, Copy, Eye, EyeOff, Flame,
  Globe, Hand, Headphones, House, Layers, LayoutGrid, Link, Lock,
  MessageCircle, Mic, Moon, Pencil, Play, Plus, QrCode, Search,
  Settings, SlidersHorizontal, Sparkles, Square, Sun, User, Video,
  Volume2, X,
} from 'lucide-react-native';
import { I18nManager, Platform, type StyleProp, type ViewStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Semantic names match the HTML prototype; add new icons here. */
export const icons = {
  home: House,
  mic: Mic,
  chat: MessageCircle,
  cards: Copy,
  user: User,
  search: Search,
  bell: Bell,
  back: ChevronLeft,
  fwd: ChevronRight,
  up: ArrowUp,
  play: Play,
  check: Check,
  plus: Plus,
  close: X,
  flame: Flame,
  book: Book,
  pen: Pencil,
  wave2: Activity,
  globe: Globe,
  sun: Sun,
  moon: Moon,
  grid: LayoutGrid,
  link: Link,
  qr: QrCode,
  cal: CalendarDays,
  speaker: Volume2,
  cam: Video,
  hand: Hand,
  filter: SlidersHorizontal,
  spark: Sparkles,
  arrowr: ArrowRight,
  lock: Lock,
  layers: Layers,
  headphones: Headphones,
  read: BookOpen,
  stop: Square,
  camera: Camera,
  settings: Settings,
  explore: Compass,
  eye: Eye,
  eyeOff: EyeOff,
} as const;

export type IconName = keyof typeof icons;

export type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  themeColor?: ThemeColor;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  themeColor = 'textPrimary',
  color,
  filled = false,
  style,
  accessibilityLabel,
}: IconProps) {
  const theme = useTheme();
  const Glyph = icons[name];
  const tint = color ?? theme[themeColor];
  const mirrored = I18nManager.isRTL && (name === 'back' || name === 'fwd' || name === 'arrowr');

  return (
    <Glyph
      size={size}
      color={tint}
      strokeWidth={strokeWidth}
      fill={filled ? tint : 'none'}
      style={[{ flexShrink: 0, pointerEvents: 'none' }, mirrored && { transform: [{ scaleX: -1 }] }, style]}
      {...(Platform.OS === 'web'
        ? { 'aria-hidden': !accessibilityLabel, 'aria-label': accessibilityLabel }
        : {
            accessible: !!accessibilityLabel,
            accessibilityLabel,
            accessibilityRole: 'image' as const,
            accessibilityElementsHidden: !accessibilityLabel,
            importantForAccessibility: accessibilityLabel ? 'yes' as const : 'no' as const,
          })}
    />
  );
}
