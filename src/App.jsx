import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faCloud } from '@fortawesome/free-solid-svg-icons'
import TwemojiText from './components/TwemojiText'
import BlueskyBio from './components/BlueskyBio'
import BlueskyPost from './components/BlueskyPost'
import ThemeToggle from './components/ThemeToggle'
import DropdownLink from './components/DropdownLink'
import './App.css'

function App() {
  const socialLinks = [
    {
      name: 'Bluesky',
      handle: '@j4ck.xyz',
      url: 'https://bsky.app/profile/j4ck.xyz',
      icon: faBluesky,
      ariaLabel: 'Visit my Bluesky profile @j4ck.xyz'
    },
    {
      name: 'Twitter',
      handle: '@jglypt',
      url: 'https://twitter.com/jglypt',
      icon: faTwitter,
      ariaLabel: 'Visit my Twitter profile @jglypt'
    },
    {
      name: 'Email',
      handle: 'jack@jglypt.net',
      url: 'mailto:jack@jglypt.net',
      icon: faEnvelope,
      ariaLabel: 'Send me an email at jack@jglypt.net'
    }
  ]

  const atmosphereLink = {
    name: 'Follow me on ATmosphere - @j4ck.xyz',
    handle: '@j4ck.xyz',
    icon: faCloud,
    ariaLabel: 'Access my ATmosphere profile and services',
    options: [
      {
        name: '⚡ Flashes',
        url: 'https://app.flashes.blue/profile/j4ck.xyz',
        ariaLabel: 'Visit my Flashes profile'
      },
      {
        name: '🍃 Leaflet',
        url: 'https://blog.j4ck.xyz',
        ariaLabel: 'Read my blog on Leaflet'
      }
    ]
  }

  return (
    <div className="app">
      <ThemeToggle />
      <main className="container">
        <header className="header">
          <h1 className="title">j4ck.xyz</h1>
          <BlueskyBio />
          <div className="bio-separator"></div>
          <p className="subtitle">
            <TwemojiText>Find my socials! 👇</TwemojiText>
          </p>
        </header>
        
        <nav className="social-links" role="navigation" aria-label="Social media links">
          <ul className="links-list">
            {/* Bluesky first */}
            <li className="link-item">
              <a
                href={socialLinks[0].url}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialLinks[0].ariaLabel}
              >
                <FontAwesomeIcon 
                  icon={socialLinks[0].icon} 
                  className="social-icon"
                  aria-hidden="true" 
                />
                <span className="link-text">
                  <span className="platform">
                    <TwemojiText>{socialLinks[0].name}</TwemojiText>
                  </span>
                  <span className="handle">{socialLinks[0].handle}</span>
                </span>
              </a>
            </li>

            {/* ATmosphere dropdown */}
            <li className="link-item">
              <DropdownLink
                name={atmosphereLink.name}
                handle={atmosphereLink.handle}
                icon={atmosphereLink.icon}
                options={atmosphereLink.options}
                ariaLabel={atmosphereLink.ariaLabel}
              />
            </li>
            
            {/* Twitter and Email */}
            {socialLinks.slice(1).map((link) => (
              <li key={link.name} className="link-item">
                <a
                  href={link.url}
                  className="social-link"
                  target={link.name !== 'Email' ? '_blank' : undefined}
                  rel={link.name !== 'Email' ? 'noopener noreferrer' : undefined}
                  aria-label={link.ariaLabel}
                >
                  <FontAwesomeIcon 
                    icon={link.icon} 
                    className="social-icon"
                    aria-hidden="true" 
                  />
                  <span className="link-text">
                    <span className="platform">
                      <TwemojiText>{link.name}</TwemojiText>
                    </span>
                    <span className="handle">{link.handle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        <BlueskyPost />
      </main>
    </div>
  )
}

export default App
