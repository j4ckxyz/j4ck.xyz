import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { faBluesky } from '@fortawesome/free-brands-svg-icons'
import TwemojiText from './TwemojiText'
import Hls from 'hls.js'

const BlueskyPost = () => {
  const [post, setPost] = useState(null)
  const [repost, setRepost] = useState(null) // State for repost info
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const HANDLE = 'j4ck.xyz'
  const PROFILE_URL = 'https://bsky.app/profile/j4ck.xyz'

  useEffect(() => {
    const fetchLatestPost = async () => {
      try {
        setLoading(true)

        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${HANDLE}&limit=10`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data = await response.json()

        // Find the first post that matches our criteria:
        // 1. It's my own post (and NOT a reply)
        // 2. OR it's a repost (by me)
        const feedItem = data.feed?.find(item => {
          const isRepost = item.reason?.$type === 'app.bsky.feed.defs#reasonRepost'
          const isMyPost = item.post.author.handle === HANDLE
          const isReply = !!item.post.record.reply

          if (isRepost) return true; // Always show reposts
          if (isMyPost && !isReply) return true; // Show my posts (no replies)

          return false;
        })

        if (feedItem) {
          console.log('Bluesky feed item:', feedItem)
          setPost(feedItem.post)
          if (feedItem.reason) {
            setRepost(feedItem.reason)
          } else {
            setRepost(null)
          }
        } else {
          throw new Error('No posts found')
        }
      } catch (err) {
        console.error('Error fetching Bluesky post:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestPost()
  }, [])

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'recently'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'recently'
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      if (diffDays > 0) return `${diffDays}d`
      if (diffHours > 0) return `${diffHours}h`
      if (diffMinutes > 0) return `${diffMinutes}m`
      return 'now'
    } catch (error) {
      console.error('Error formatting date:', error, dateString)
      return 'recently'
    }
  }

  const formatPostText = (text, facets = []) => {
    if (!facets || facets.length === 0) {
      return <TwemojiText>{text}</TwemojiText>
    }

    let result = []
    let lastIndex = 0

    const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)

    sortedFacets.forEach((facet, i) => {
      const { byteStart, byteEnd } = facet.index

      if (byteStart > lastIndex) {
        result.push(
          <TwemojiText key={`text-${i}`}>
            {text.slice(lastIndex, byteStart)}
          </TwemojiText>
        )
      }

      const facetText = text.slice(byteStart, byteEnd)

      if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#link') {
        const uri = facet.features[0].uri
        result.push(
          <a
            key={`link-${i}`}
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="post-link"
          >
            <TwemojiText>{facetText}</TwemojiText>
          </a>
        )
      } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#mention') {
        result.push(
          <span key={`mention-${i}`} className="post-mention">
            <TwemojiText>{facetText}</TwemojiText>
          </span>
        )
      } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#tag') {
        result.push(
          <span key={`tag-${i}`} className="post-hashtag">
            <TwemojiText>{facetText}</TwemojiText>
          </span>
        )
      } else {
        result.push(
          <TwemojiText key={`other-${i}`}>{facetText}</TwemojiText>
        )
      }

      lastIndex = byteEnd
    })

    if (lastIndex < text.length) {
      result.push(
        <TwemojiText key="text-end">
          {text.slice(lastIndex)}
        </TwemojiText>
      )
    }

    return result
  }

  const getPostUrl = (post) => {
    if (!post?.uri) return PROFILE_URL
    const parts = post.uri.split('/')
    const postId = parts[parts.length - 1]
    return `https://bsky.app/profile/${post.author.handle}/post/${postId}`
  }

  const getQuotePostUrl = (record) => {
    if (!record) return '#'

    // Check different possible locations for the URI
    const uri = record.uri || record.value?.uri || record.record?.uri

    if (!uri) return '#'

    // AT URI format: at://did:plc:xxx/app.bsky.feed.post/postid
    const atUriMatch = uri.match(/at:\/\/([^\/]+)\/app\.bsky\.feed\.post\/(.+)/)
    if (!atUriMatch) {
      return '#'
    }

    const [, did, postId] = atUriMatch

    // If we have the author info, use the handle, otherwise use the DID
    const authorHandle = record.author?.handle || record.value?.author?.handle || did

    return `https://bsky.app/profile/${authorHandle}/post/${postId}`
  }

  if (loading) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#666]">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-red-500" />
          <span className="font-mono text-sm">Initializing feed feed...</span>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 h-full flex flex-col justify-between">
        <div className="text-[#666] font-mono mb-4">
           // ERROR: Feed Connection Failed
        </div>
        <div className="text-center py-8">
          <TwemojiText>Unable to establish link 😅</TwemojiText>
        </div>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#222] hover:bg-[#333] text-white py-2 px-4 rounded-lg text-center transition-colors border border-[#333] hover:border-red-500 font-mono text-sm flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faBluesky} />
          Manual Ovveride
        </a>
      </div>
    )
  }

  const renderEmbed = (embed) => {
    if (!embed) return null;

    // 1. Images
    if (embed.$type === 'app.bsky.embed.images#view') {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden mt-3 border border-[#333]">
          {embed.images.map((img, i) => (
            <div
              key={i}
              className={`relative ${embed.images.length === 1 ? 'col-span-2' : ''} ${embed.images.length === 3 && i === 0 ? 'col-span-2' : ''}`}
            >
              <img
                src={img.thumb}
                alt={img.alt}
                className="w-full h-full object-cover max-h-48 bg-[#222]"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      );
    }

    // 2. External Link
    if (embed.$type === 'app.bsky.embed.external#view') {
      const { external } = embed;
      return (
        <div className="mt-3 border border-[#333] rounded-lg overflow-hidden bg-[#1a1a1a] hover:bg-[#222] transition-colors">
          {external.thumb && (
            <div className="h-32 w-full overflow-hidden border-b border-[#333]">
              <img src={external.thumb} alt={external.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-3">
            <div className="text-sm font-bold text-[#eee] line-clamp-1">{external.title}</div>
            <div className="text-xs text-[#888] line-clamp-2 mt-1 font-mono">{external.description}</div>
          </div>
        </div>
      );
    }

    // 3. Record (Quote Post) or RecordWithMedia
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
      return (
        <div className="mt-2">
          {renderEmbed(embed.media)}
          <div className="mt-2 pl-2 border-l-2 border-[#333]">
            {/* Simplified quote rendering to prevent infinite recursion or layout break */}
            <a href={getQuotePostUrl(embed.record?.record)} target="_blank" rel="noopener noreferrer" className="block p-2 bg-[#1a1a1a] rounded hover:bg-[#222] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-[#333]">
                  {embed.record.record?.author?.avatar && <img src={embed.record.record.author.avatar} alt="" className="w-full h-full rounded-full" />}
                </div>
                <span className="font-bold text-xs text-[#eee]">{embed.record.record?.author?.displayName}</span>
                <span className="text-xs text-[#666]">@{embed.record.record?.author?.handle}</span>
              </div>
              <div className="text-xs text-[#ccc] line-clamp-3">
                {embed.record.record?.value?.text}
              </div>
            </a>
          </div>
        </div>
      )
    }

    // 4. Video
    if (embed.$type === 'app.bsky.embed.video#view') {
      return (
        <div className="mt-3 rounded-lg overflow-hidden border border-[#333] bg-black">
          <VideoPlayer playlist={embed.playlist} thumbnail={embed.thumbnail} />
        </div>
      )
    }

    return null;
  };

  // Internal Video Player Component
  const VideoPlayer = ({ playlist, thumbnail }) => {
    const videoRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    React.useEffect(() => {
      let hls = null;
      if (videoRef.current) {
        const video = videoRef.current;

        // Check if native HLS is supported (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playlist;
        }
        // Check if Hls.js is supported
        else if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(playlist);
          hls.attachMedia(video);
        }
      }

      return () => {
        if (hls) {
          hls.destroy();
        }
      }
    }, [playlist]);

    return (
      <div className="relative w-full aspect-video group">
        <video
          ref={videoRef}
          poster={thumbnail}
          controls={isPlaying}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors cursor-pointer"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.play();
                setIsPlaying(true);
              }
            }}
          >
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-black border-b-[8px] border-b-transparent"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#333] p-6 h-full flex flex-col hover:border-red-500 transition-colors duration-300 group relative overflow-hidden rounded-lg">

      {/* Repost Header */}
      {repost && (
        <div className="text-xs text-[#666] mb-2 flex items-center gap-2 font-mono">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin-pulse" style={{ animationDuration: '3s' }} />
          <span>{repost.by.handle === 'j4ck.xyz' ? 'j4ck.xyz' : repost.by.displayName} reposted</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full border border-[#333]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333]"></div>
          )}
          <div>
            <div className="font-bold text-white leading-tight">
              <TwemojiText>{post.author.displayName || 'jack'}</TwemojiText>
            </div>
            <div className="text-xs text-[#666] font-mono">
              @{post.author.handle}
            </div>
          </div>
        </div>
        <a href={getPostUrl(post)} target="_blank" rel="noopener noreferrer" className="text-[#666] hover:text-red-500 transition-colors text-xs font-mono">
          {formatDate(post.record.createdAt)}
          <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-2" />
        </a>
      </div>

      <a
        href={getPostUrl(post)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 block mb-4 group-hover:opacity-90 transition-opacity relative z-10"
      >
        <div className="text-[#ccc] text-sm leading-relaxed mb-4 font-mono">
          {formatPostText(post.record.text, post.record.facets)}
        </div>

        {/* Render Embeds */}
        {post.embed && renderEmbed(post.embed)}
      </a>

      <div className="pt-4 border-t border-[#222] flex justify-between items-center relative z-10">
        <div className="text-xs text-[#444] font-mono">
            // LATEST TRANSMISSION
        </div>
        <FontAwesomeIcon icon={faBluesky} className="text-[#222] group-hover:text-[#0085ff] transition-colors" />
      </div>

      {/* Decorative */}
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-t from-[#0085ff20] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}></div>
    </div>
  )
}

export default BlueskyPost
