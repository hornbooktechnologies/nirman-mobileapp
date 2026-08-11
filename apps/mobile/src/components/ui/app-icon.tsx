import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AppIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type AppIconProps = {
  color: string;
  name: AppIconName;
  size: number;
};

export function AppIcon({ color, name, size }: AppIconProps) {
  return <MaterialCommunityIcons color={color} name={name} size={size} />;
}
