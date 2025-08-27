import { useEffect, useRef } from 'react'
import twemoji from 'twemoji'

const TwemojiText = ({ children, className = '', ...props }) => {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      // Parse emojis and replace with Twemoji SVGs
      twemoji.parse(ref.current, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
        className: 'twemoji'
      })
    }
  }, [children])

  return (
    <span ref={ref} className={className} {...props}>
      {children}
    </span>
  )
}

export default TwemojiText
