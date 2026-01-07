import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faExternalLinkAlt, faPlay, faRetweet, faQuoteLeft } from '@fortawesome/free-solid-svg-icons'
import { faBluesky } from '@fortawesome/free-brands-svg-icons'
import TwemojiText from './TwemojiText'

const BlueskyPost = () => {
  const [post, setPost] = useState(null)
  const [repost, setRepost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const HANDLE = 'j4ck.xyz'
  const PROFILE_URL = 'https://bsky.app/profile/j4ck.xyz'

  useEffect(() => {
    const fetchLatestPost = async () => {
      try {
        setLoading(true)

        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${HANDLE}&limit=20`,
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
    if (!text) return null
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
            className="post-link text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <TwemojiText>{facetText}</TwemojiText>
          </a>
        )
      } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#mention') {
        result.push(
          <span key={`mention-${i}`} className="post-mention text-blue-400">
            <TwemojiText>{facetText}</TwemojiText>
          </span>
        )
      } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#tag') {
        result.push(
          <span key={`tag-${i}`} className="post-hashtag text-blue-400">
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
    
    // Handle ViewRecord (the typical case)
    if (record.$type === 'app.bsky.embed.record#viewRecord') {
      const handle = record.author.handle
      const uri = record.uri
      const parts = uri.split('/')
      const postId = parts[parts.length - 1]
      return `https://bsky.app/profile/${handle}/post/${postId}`
    }

    // Fallback for record objects inside the post record itself (not the view)
    const uri = record.uri || record.value?.uri
    if (!uri) return '#'

    const atUriMatch = uri.match(/at:\/\/([^\/]+)\/app\.bsky\.feed\.post\/(.+)/)
    if (!atUriMatch) return '#'

    const [, did, postId] = atUriMatch
    // Best effort: if we don't have the handle, we might only have DID. 
    // Bsky.app supports /profile/DID/post/POSTID links too.
    const authorHandle = record.author?.handle || did

    return `https://bsky.app/profile/${authorHandle}/post/${postId}`
  }

  const renderQuote = (record) => {
    // Handle deleted/blocked posts
    if (!record || record.$type === 'app.bsky.embed.record#viewNotFound' || record.$type === 'app.bsky.embed.record#viewBlocked' || record.$type === 'app.bsky.embed.record#viewDetached') {
      return (
        <div className="mt-2 p-3 border border-[#333] rounded bg-[#151515] text-[#666] text-xs font-mono">
          [Quote unavailable]
        </div>
      )
    }
    
    // Handle viewRecord
    if (record.$type === 'app.bsky.embed.record#viewRecord') {
      return (
        <a 
          href={getQuotePostUrl(record)} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block mt-2 p-3 border border-[#333] rounded bg-[#1a1a1a] hover:bg-[#222] transition-colors group/quote"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={record.author.avatar} 
              alt={record.author.handle}
              className="w-4 h-4 rounded-full bg-[#333]"
            />
            <span className="font-bold text-xs text-[#eee]">{record.author.displayName}</span>
            <span className="text-xs text-[#666]">@{record.author.handle}</span>
          </div>
          <div className="text-xs text-[#ccc] line-clamp-4">
            {record.value?.text}
          </div>
        </a>
      )
    }

    return null
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
        <a 
          href={external.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 border border-[#333] rounded-lg overflow-hidden bg-[#1a1a1a] hover:bg-[#222] transition-colors group/card"
          onClick={(e) => e.stopPropagation()}
        >
          {external.thumb && (
            <div className="h-32 w-full overflow-hidden border-b border-[#333]">
              <img src={external.thumb} alt={external.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className="p-3">
            <div className="text-sm font-bold text-[#eee] line-clamp-1">{external.title}</div>
            <div className="text-xs text-[#888] line-clamp-2 mt-1 font-mono">{external.description}</div>
          </div>
        </a>
      );
    }

    // 3. Record (Quote Post only)
    if (embed.$type === 'app.bsky.embed.record#view') {
      return renderQuote(embed.record);
    }

    // 4. Record With Media (Media + Quote)
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
      return (
        <div className="mt-2">
          {renderEmbed(embed.media)}
          {renderQuote(embed.record.record)}
        </div>
      )
    }

    // 5. Video (Thumbnail only)
    if (embed.$type === 'app.bsky.embed.video#view') {
      return (
        <div className="mt-3 rounded-lg overflow-hidden border border-[#333] bg-black relative aspect-video group/video">
           <img 
             src={embed.thumbnail} 
             alt={embed.alt || "Video thumbnail"} 
             className="w-full h-full object-cover opacity-80 group-hover/video:opacity-60 transition-opacity"
           />
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover/video:scale-110 transition-transform">
               <FontAwesomeIcon icon={faPlay} className="text-black text-lg" />
             </div>
           </div>
        </div>
      )
    }

    return null;
  };

  if (loading) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 h-full flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4 text-[#666]">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-red-500" />
          <span className="font-mono text-sm">Initializing feed...</span>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 h-full flex flex-col justify-between min-h-[300px]">
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
          Manual Override
        </a>
      </div>
    )
  }

  return (
    <div className="bg-[#111] border border-[#333] p-6 h-full flex flex-col hover:border-red-500 transition-colors duration-300 group relative overflow-hidden rounded-lg">

      {/* Repost Header */}
      {repost && (
        <div className="text-xs text-[#666] mb-3 flex items-center gap-2 font-mono pb-2 border-b border-[#222]">
          <FontAwesomeIcon icon={faRetweet} className="text-green-500" />
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

      <div
        onClick={(e) => {
          if (!e.target.closest('a') && !e.target.closest('button')) {
            window.open(getPostUrl(post), '_blank');
          }
        }}
        className="flex-1 block mb-4 group-hover:opacity-90 transition-opacity relative z-10 cursor-pointer"
      >
        <div className="text-[#ccc] text-sm leading-relaxed mb-4 font-mono whitespace-pre-wrap">
          {formatPostText(post.record.text, post.record.facets)}
        </div>

        {/* Render Embeds */}
        {post.embed && renderEmbed(post.embed)}
      </div>

      <div className="pt-4 border-t border-[#222] flex justify-between items-center relative z-10 mt-auto">
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
