import type { CSSProperties } from 'react'

type AvatarProps = {
  spriteIndex: number
  className?: string
  label?: string
  rounded?: 'full' | 'card'
}

const xPositions = ['0%', '33.333%', '66.667%', '100%']
const yPositions = ['5.556%', '50%', '94.444%']

export function Avatar({
  spriteIndex,
  className = '',
  label,
  rounded = 'full',
}: AvatarProps) {
  const column = spriteIndex % 4
  const row = Math.floor(spriteIndex / 4)
  const style = {
    backgroundPosition: `${xPositions[column]} ${yPositions[row]}`,
  } satisfies CSSProperties

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`portrait-sprite ${rounded === 'full' ? 'rounded-full' : 'rounded-[24px]'} ${className}`}
      role={label ? 'img' : undefined}
      style={style}
    />
  )
}
