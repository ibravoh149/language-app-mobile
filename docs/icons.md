# Icons

Use `Icon` from `@/components/icon` for interface icons on iOS, Android, and web.
It wraps Lucide with the prototype's rounded strokes, a default size of 22,
and a default stroke width of 2. Colors follow the active app theme.
Keep `AppIcon` for the Sprachbar brand mark.

```tsx
import { Icon, type IconName } from '@/components/icon';

<Icon name="mic" size={30} themeColor="textOnAccent" />
<Icon name="play" size={17} themeColor="accentBright" filled />
<Icon name="check" size={20} themeColor="success" />
```

`name` is type checked. Optional props are `size`, `strokeWidth`, `themeColor`,
`color` (an explicit override), `filled`, `style`, and `accessibilityLabel`.
Use filled rendering for simple closed shapes such as `play` and `stop`.
Directional navigation icons mirror automatically in RTL layouts.

Icons are decorative by default. Give the containing icon-only `Pressable`
an `accessibilityRole="button"` and a localized `accessibilityLabel` describing
its action. Supply the icon's own label only for a standalone meaningful image.

## Available Names

| Group | Names |
| --- | --- |
| Navigation | `home`, `explore`, `back`, `fwd`, `up`, `arrowr`, `grid`, `link` |
| Learning | `mic`, `cards`, `book`, `read`, `pen`, `headphones`, `wave2`, `speaker`, `layers` |
| Community | `chat`, `user`, `bell`, `cam`, `hand`, `cal`, `qr`, `globe` |
| Actions | `search`, `play`, `stop`, `check`, `plus`, `close`, `filter`, `camera` |
| Appearance and status | `sun`, `moon`, `flame`, `spark`, `lock`, `settings` |

Add icons through named Lucide imports and the `icons` registry in
`src/components/icon.tsx`. Use semantic names so screens do not depend on
a particular vendor glyph.

Native tab bars cannot render this SVG component directly. Their corresponding
SF Symbols and Material icons are centralized in `src/constants/tab-icons.ts`.
Web tabs use `Icon` directly.

Back navigation belongs to the root Expo native stack. Do not add custom
`back` icon buttons to auth or onboarding screens; the stack provides the
platform back control and manages gesture and hardware back navigation.

After adding `react-native-svg`, rebuild an existing custom development client
so its native renderer is included.
