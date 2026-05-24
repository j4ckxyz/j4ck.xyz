import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faCloud, faBolt, faLeaf, faCamera } from '@fortawesome/free-solid-svg-icons'
import BentoGrid from '../components/BentoGrid'
import ProfileCard from '../components/ProfileCard'
import SocialCard from '../components/SocialCard'
import BlueskyPost from '../components/BlueskyPost'
import SystemStatusCard from '../components/SystemStatusCard'
import SEO from '../components/SEO'

import { useRef } from 'react'
import useKeyboardNav from '../hooks/useKeyboardNav'

function Home() {
    const gridRef = useRef(null);
    useKeyboardNav(gridRef, 'a[href], button');

    return (
        <BentoGrid ref={gridRef}>
            <SEO
                title="Home"
                description="Jack's digital garden. Code, photos, and thoughts."
                image="home.png"
                path="/"
            />

            {/* Row 1 */}
            <div className="col-span-1 md:col-span-2 h-64">
                <ProfileCard />
            </div>

            <div className="col-span-1 h-64">
                <SocialCard
                    name="grain.social"
                    handle="My photos!"
                    url="https://grain.social/profile/did:plc:4hawmtgzjx3vclfyphbhfn7v"
                    icon={faCamera}
                    color="#85A1FF"
                />
            </div>

            {/* Row 2 */}
            <div className="col-span-1 md:row-span-2 h-full min-h-[500px]">
                <BlueskyPost />
            </div>

            <div className="col-span-1 h-64">
                <SocialCard
                    name="Bluesky"
                    handle="@j4ck.xyz"
                    url="https://bsky.app/profile/j4ck.xyz"
                    icon={faBluesky}
                    color="#0085ff"
                    delay={0.1}
                />
            </div>

            <div className="col-span-1 h-64">
                <SocialCard
                    name="Leaflet"
                    handle="Blog & Articles"
                    url="https://blog.j4ck.xyz"
                    icon={faLeaf}
                    color="#4CAF50"
                    delay={0.2}
                />
            </div>

            {/* Row 3 */}
            <div className="col-span-1 h-64">
                <SocialCard
                    name="GitHub"
                    handle="j4ckxyz"
                    url="https://github.com/j4ckxyz"
                    icon={faGithub}
                    color="#a855f7"
                    delay={0.3}
                />
            </div>

            <div className="col-span-1 h-64">
                <SocialCard
                    name="Discord"
                    handle="j4ck.xyz"
                    copyValue="j4ck.xyz"
                    icon={faDiscord}
                    color="#5865F2"
                    delay={0.35}
                />
            </div>

            {/* Row 4 */}
            <div className="col-span-1 h-64">
                <SocialCard
                    name="Email"
                    handle="Contact"
                    url="mailto:jack@jglypt.net"
                    icon={faEnvelope}
                    color="#ff3333"
                    delay={0.4}
                />
            </div>

            <div className="col-span-1 md:col-span-2 h-64">
                <SystemStatusCard />
            </div>

        </BentoGrid>
    )
}

export default Home
