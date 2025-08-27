import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import TwemojiText from './TwemojiText'

const BlueskyBio = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const HANDLE = 'j4ck.xyz'

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        
        // Using the public Bluesky API to get profile info
        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${HANDLE}`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const profileData = await response.json()
        setProfile(profileData)
      } catch (err) {
        console.error('Error fetching Bluesky profile:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const formatBioText = (text, facets = []) => {
    if (!text) return null
    
    let processedText = text
    
    // Remove links and their text from the bio
    if (facets && facets.length > 0) {
      // Sort facets by index in reverse order to maintain correct positions when removing
      const sortedFacets = [...facets].sort((a, b) => b.index.byteStart - a.index.byteStart)
      
      sortedFacets.forEach((facet) => {
        const { byteStart, byteEnd } = facet.index
        
        // Remove links entirely (including j4ck.xyz and any other links)
        if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#link') {
          processedText = processedText.slice(0, byteStart) + processedText.slice(byteEnd)
        }
      })
    }
    
    // Clean up the text by removing empty lines and extra whitespace
    const lines = processedText
      .split('\n')
      .map(line => line.trim()) // Remove leading/trailing whitespace
      .filter(line => line.length > 0) // Remove empty lines
    
    // If no lines left after filtering, return null
    if (lines.length === 0) return null
    
    return lines.map((line, index) => (
      <div key={index} className="bio-line">
        <TwemojiText>{line}</TwemojiText>
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="bluesky-bio loading">
        <FontAwesomeIcon icon={faSpinner} spin className="bio-loading-spinner" />
        <span className="bio-loading-text">Loading bio...</span>
      </div>
    )
  }

  if (error || !profile?.description) {
    return null // Don't show anything if there's an error or no bio
  }

  return (
    <div className="bluesky-bio">
      <div className="bio-content">
        {formatBioText(profile.description, profile.descriptionFacets)}
      </div>
    </div>
  )
}

export default BlueskyBio
