type AvatarProps = {
  imageData: string
  className?: string
  label?: string
  rounded?: 'full' | 'card'
}

export function Avatar({
  imageData,
  className = '',
  label,
  rounded = 'full',
}: AvatarProps) {
  return (
    <img
      alt={label ?? ''}
      className={`portrait-image ${rounded === 'full' ? 'rounded-full' : 'rounded-[24px]'} ${className}`}
      decoding="async"
      src={imageData}
    />
  )
}
