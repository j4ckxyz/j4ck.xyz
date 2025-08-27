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
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffDays > 0) return `${diffDays}d`
    if (diffHours > 0) return `${diffHours}h`
    if (diffMinutes > 0) return `${diffMinutes}m`
    return 'now'
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
      <div className="bluesky-post loading">
        <div className="post-header">
          <div className="post-avatar">
            <div className="avatar-placeholder"></div>
          </div>
          <div className="post-author">
            <div className="author-name">jack</div>
            <div className="author-handle">@j4ck.xyz</div>
          </div>
          <div className="post-time">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
          </div>
        </div>
        <div className="post-content">
          <div className="loading-text">Loading latest post...</div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="bluesky-post error">
        <div className="post-header">
          <div className="post-avatar">
            <div className="avatar-placeholder"></div>
          </div>
          <div className="post-author">
            <div className="author-name">jack</div>
            <div className="author-handle">@j4ck.xyz</div>
          </div>
        </div>
        <div className="post-content">
          <TwemojiText>Unable to load latest post 😅</TwemojiText>
        </div>
        <div className="post-actions">
          <a 
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="view-profile-btn"
          >
            <FontAwesomeIcon icon={faBluesky} />
            View Profile
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bluesky-post">
      <a 
        href={getPostUrl(post)}
        target="_blank"
        rel="noopener noreferrer"
        className="post-link-wrapper"
        aria-label={`View post on Bluesky: ${post.record.text?.slice(0, 100)}...`}
      >
        <div className="post-header">
          <div className="post-avatar">
            {post.author.avatar ? (
              <img 
                src={post.author.avatar} 
                alt={`${post.author.displayName || post.author.handle} avatar`}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder"></div>
            )}
          </div>
          <div className="post-author">
            <div className="author-name">
              <TwemojiText>{post.author.displayName || 'jack'}</TwemojiText>
            </div>
            <div className="author-handle">@{post.author.handle}</div>
          </div>
          <div className="post-time">
            {formatDate(post.record.createdAt)}
            <FontAwesomeIcon icon={faExternalLinkAlt} className="external-link" />
          </div>
        </div>
        
        <div className="post-content">
          {formatPostText(post.record.text, post.record.facets)}
        </div>

        {/* Handle embedded media */}
        {post.embed && (
          <div className="post-embed">
            {/* Handle images - check different possible structures */}
            {(post.embed.images || post.embed.$type === 'app.bsky.embed.images') && (
              <div className="embed-images">
                {(post.embed.images || []).map((image, index) => (
                  <img
                    key={index}
                    src={image.fullsize || image.thumb || image.image?.ref}
                    alt={image.alt || 'Post image'}
                    className="embed-image"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            
            {/* Handle video embeds */}
            {(post.embed.video || post.embed.$type === 'app.bsky.embed.video') && (
              <div className="embed-video">
                <video
                  src={post.embed.video?.playlist || post.embed.playlist}
                  poster={post.embed.video?.thumbnail || post.embed.thumbnail}
                  controls
                  className="embed-video-player"
                  preload="metadata"
                >
                  <source src={post.embed.video?.playlist || post.embed.playlist} type="application/x-mpegURL" />
                  Your browser does not support the video tag.
                </video>
                {(post.embed.video?.alt || post.embed.alt) && (
                  <div className="embed-video-alt">{post.embed.video?.alt || post.embed.alt}</div>
                )}
              </div>
            )}
            
            {/* Handle external link embeds */}
            {(post.embed.external || post.embed.$type === 'app.bsky.embed.external') && (
              <div className="embed-external">
                {post.embed.external?.thumb && (
                  <img 
                    src={post.embed.external.thumb} 
                    alt="Link preview"
                    className="embed-thumb"
                    loading="lazy"
                  />
                )}
                <div className="embed-external-content">
                  <div className="embed-title">
                    <TwemojiText>{post.embed.external?.title}</TwemojiText>
                  </div>
                  <div className="embed-description">
                    <TwemojiText>{post.embed.external?.description}</TwemojiText>
                  </div>
                  <div className="embed-uri">{post.embed.external?.uri}</div>
                </div>
              </div>
            )}
            
            {/* Handle quote posts */}
            {(post.embed.record || post.embed.$type === 'app.bsky.embed.record') && (
              <a 
                href={getQuotePostUrl(post.embed.record)}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-quote"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="quote-header">
                  {(post.embed.record?.author || post.embed.record?.value?.author) && (
                    <>
                      {(post.embed.record.author?.avatar || post.embed.record.value?.author?.avatar) && (
                        <img 
                          src={post.embed.record.author?.avatar || post.embed.record.value?.author?.avatar} 
                          alt={`${(post.embed.record.author?.displayName || post.embed.record.value?.author?.displayName || post.embed.record.author?.handle || post.embed.record.value?.author?.handle)} avatar`}
                          className="quote-avatar"
                        />
                      )}
                      <div className="quote-author">
                        <div className="quote-author-name">
                          <TwemojiText>{(post.embed.record.author?.displayName || post.embed.record.value?.author?.displayName || post.embed.record.author?.handle || post.embed.record.value?.author?.handle)}</TwemojiText>
                        </div>
                        <div className="quote-author-handle">@{(post.embed.record.author?.handle || post.embed.record.value?.author?.handle)}</div>
                      </div>
                    </>
                  )}
                </div>
                {(post.embed.record?.value?.text || post.embed.record?.text) && (
                  <div className="quote-content">
                    <TwemojiText>{post.embed.record?.value?.text || post.embed.record?.text}</TwemojiText>
                  </div>
                )}
                {!(post.embed.record?.value?.text || post.embed.record?.text) && (
                  <div className="quote-indicator">[Quote post]</div>
                )}
              </a>
            )}
          </div>
        )}
      </a>
      
      <div className="post-actions">
        <a 
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="show-more-btn"
        >
          <FontAwesomeIcon icon={faBluesky} />
          Show More
        </a>
      </div>
    </div>
  )
}

export default BlueskyPost
