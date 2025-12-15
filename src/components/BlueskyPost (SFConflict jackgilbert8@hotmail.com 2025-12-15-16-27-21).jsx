import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { faBluesky } from '@fortawesome/free-brands-svg-icons'
import TwemojiText from './TwemojiText'

const BlueskyPost = () => {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const HANDLE = 'j4ck.xyz'
  const PROFILE_URL = 'https://bsky.app/profile/j4ck.xyz'

  useEffect(() => {
    const fetchLatestPost = async () => {
      try {
        setLoading(true)

        // Using the public Bluesky API
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

        // Find the first post that's not a reply
        const latestPost = data.feed?.find(item =>
          item.post &&
          !item.post.record.reply &&
          item.post.author.handle === HANDLE
        )?.post

        if (latestPost) {
          console.log('Bluesky post data:', latestPost) // Debug log
          if (latestPost.embed) {
            console.log('Embed data:', latestPost.embed) // Debug embed structure
          }
          setPost(latestPost)
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
      // Ensure we have a valid date string
      if (!dateString) return 'recently'

      const date = new Date(dateString)

      // Check if the date is valid
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

    // Sort facets by index
    const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)

    sortedFacets.forEach((facet, i) => {
      const { byteStart, byteEnd } = facet.index

      // Add text before this facet
      if (byteStart > lastIndex) {
        result.push(
          <TwemojiText key={`text-${i}`}>
            {text.slice(lastIndex, byteStart)}
          </TwemojiText>
        )
      }

      const facetText = text.slice(byteStart, byteEnd)

      // Handle different facet types
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

    // Add remaining text
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
    console.log('Quote post record:', record) // Debug log

    if (!record) return '#'

    // Check different possible locations for the URI
    const uri = record.uri || record.value?.uri || record.record?.uri
    console.log('Quote post URI:', uri) // Debug log

    if (!uri) return '#'

    // AT URI format: at://did:plc:xxx/app.bsky.feed.post/postid
    const atUriMatch = uri.match(/at:\/\/([^\/]+)\/app\.bsky\.feed\.post\/(.+)/)
    if (!atUriMatch) {
      console.log('URI does not match expected format:', uri)
      return '#'
    }

    const [, did, postId] = atUriMatch

    // If we have the author info, use the handle, otherwise use the DID
    const authorHandle = record.author?.handle || record.value?.author?.handle || did

    const finalUrl = `https://bsky.app/profile/${authorHandle}/post/${postId}`
    console.log('Generated quote URL:', finalUrl) // Debug log

    return finalUrl
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

  return (
    <div className="bg-[#111] border border-[#333] rounded-2xl p-6 h-full flex flex-col hover:border-red-500 transition-colors duration-300 group relative overflow-hidden">
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

        {/* Embedded Content Simplification for Grid */}
        {post.embed && (
          <div className="border border-[#333] rounded-lg p-2 bg-[#1a1a1a] text-xs text-[#666] font-mono truncate">
            [Media Attachment Detected]
          </div>
        )}
      </a>

      <div className="pt-4 border-t border-[#222] flex justify-between items-center relative z-10">
        <div className="text-xs text-[#444] font-mono">
            // LATEST TRANSMISSION
        </div>
        <FontAwesomeIcon icon={faBluesky} className="text-[#222] group-hover:text-[#0085ff] transition-colors" />
      </div>

      {/* Decorative */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#0085ff10] to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  )
}

export default BlueskyPost
