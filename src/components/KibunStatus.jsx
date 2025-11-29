import React, { useEffect, useState } from 'react'
import TwemojiText from './TwemojiText'
import './KibunStatus.css'

const timeAgo = (dateString) => {
  const date = Date.parse(dateString);
  const curDate = new Date(date);
  const now = Date.now();
  const yest = new Date(Date.parse(dateString));
  const today = new Date(date);
  yest.setDate(today - 1);
  const diff = (now - date) / 1000; // difference in seconds
  if (diff < 5) {
    return "just now";
  } else if (diff < 60) {
    return `${Math.floor(diff)} seconds ago`;
  } else if (diff < 60*60) {
    const min = Math.floor(diff / 60);
    return `${min} minute${min > 1 ? 's' : ''} ago`;
  } else if (diff < 60*60*24) {
    const hr = Math.floor(diff / (60*60));
    return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  } else if (date.getDate() === yest.getDate() && date.getMonth() === yest.getMonth() && date.getYear() === yest.getYear()) {
    return "yesterday";
  }
  return `${curDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).toLowerCase()}`;
}

const KibunStatus = ({ username }) => {
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Resolve DID
        const userDidData = await fetch(`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${username}`);
        if (!userDidData.ok) throw new Error('Failed to resolve DID');
        const userDidDoc = await userDidData.json();
        const userDid = userDidDoc.did;
        const userPds = userDidDoc.pds;

        // Get Profile
        const userInfoReq = await fetch(`${userPds}/xrpc/com.atproto.repo.getRecord?repo=${userDid}&collection=app.bsky.actor.profile&rkey=self`);
        if (!userInfoReq.ok) throw new Error('Failed to fetch profile');
        const userInfoData = await userInfoReq.json();
        setProfile(userInfoData.value);

        // Get Status
        const statusData = await fetch(`${userPds}/xrpc/com.atproto.repo.listRecords?repo=${userDid}&collection=social.kibun.status&limit=1`);
        if (!statusData.ok) throw new Error('Failed to fetch status');
        const statuses = await statusData.json();
        
        if (statuses.records.length > 0) {
          setStatus(statuses.records[0].value);
        } else {
          setStatus(null);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username]);

  if (loading) return null; // Or a loading spinner if desired, but status.cafe usually just pops in
  if (error || !status) return null;

  return (
    <div className="kibun-container">
      <div className="kibun-header">
        <a href={`https://www.kibun.social/users/${username}`} target="_blank" rel="noopener noreferrer" className="kibun-displayname">
          <TwemojiText>{profile?.displayName || username}</TwemojiText>
        </a>
        <span className="kibun-emoji"><TwemojiText>{status.emoji}</TwemojiText></span>
        <a href={`https://kibun.social/users/${username}`} target="_blank" rel="noopener noreferrer" className="kibun-handle">
          @{username}
        </a>
        <span className="kibun-datetime">{timeAgo(status.createdAt)}</span>
      </div>
      <div className="kibun-status">
        <TwemojiText>{status.text}</TwemojiText>
      </div>
      <a 
        href="https://www.kibun.social/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="kibun-link"
        title="Powered by kibun.social"
      >
        kibun.social
      </a>
    </div>
  );
};

export default KibunStatus;
