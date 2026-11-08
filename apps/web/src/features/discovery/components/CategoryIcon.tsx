import {
  Atom, BookOpen, BriefcaseBusiness, Clapperboard, Code2, Compass, CookingPot,
  Cpu, Gamepad2, GraduationCap, HeartPulse, House, Landmark, Leaf, Lightbulb,
  Music2, Palette, Sparkles, Trophy, UsersRound,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  'arts-design-crafts': Palette,
  'business-economics': BriefcaseBusiness,
  'culture-society': UsersRound,
  'education-learning': GraduationCap,
  'food-cooking': CookingPot,
  'fun-stuff': Sparkles,
  gaming: Gamepad2,
  health: HeartPulse,
  history: Landmark,
  'home-garden': House,
  'internet-software': Code2,
  'literature-writing': BookOpen,
  'music-audio': Music2,
  'nature-animals-earth': Leaf,
  'philosophy-life': Lightbulb,
  'science-math': Atom,
  sports: Trophy,
  'technology-hardware': Cpu,
  'tv-movies-video': Clapperboard,
  other: Compass,
}

export function CategoryIcon({ slug }: { slug: string }) {
  const Icon = icons[slug] ?? Compass
  return <Icon aria-hidden="true" />
}
