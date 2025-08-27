import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import TwemojiText from './components/TwemojiText'
import BlueskyBio from './components/BlueskyBio'
import BlueskyPost from './components/BlueskyPost'
import ThemeToggle from './components/ThemeToggle'
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
            {socialLinks.map((link) => (
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
