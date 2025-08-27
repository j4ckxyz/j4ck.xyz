import React, { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import TwemojiText from './TwemojiText'

const DropdownLink = ({ 
  name, 
  handle, 
  icon, 
  options, 
  ariaLabel 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button
        className="dropdown-trigger social-link"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={ariaLabel}
      >
        <FontAwesomeIcon 
          icon={icon} 
          className="social-icon"
          aria-hidden="true" 
        />
        <span className="link-text">
          <span className="platform">
            <TwemojiText>{name}</TwemojiText>
          </span>
          <span className="handle">{handle}</span>
        </span>
        <FontAwesomeIcon 
          icon={isOpen ? faChevronUp : faChevronDown} 
          className="dropdown-arrow"
          aria-hidden="true" 
        />
      </button>
      
      {isOpen && (
        <div className="dropdown-menu" role="menu">
          {options.map((option, index) => (
            <a
              key={index}
              href={option.url}
              className="dropdown-item"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              aria-label={option.ariaLabel}
              onClick={() => setIsOpen(false)}
            >
              <span className="dropdown-item-text">
                <TwemojiText>{option.name}</TwemojiText>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropdownLink
