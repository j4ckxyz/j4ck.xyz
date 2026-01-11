import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faCloud, faBolt, faLeaf } from '@fortawesome/free-solid-svg-icons'
import BentoGrid from '../components/BentoGrid'
import ProfileCard from '../components/ProfileCard'
import SocialCard from '../components/SocialCard'
import BlueskyPost from '../components/BlueskyPost'
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
            <div className="md:col-span-1 h-64">
                <ProfileCard />
            </div>

            <div className="h-64">
                <SocialCard
                    name="Bluesky"
                    handle="@j4ck.xyz"
                    url="https://bsky.app/profile/j4ck.xyz"
                    icon={faBluesky}
                    delay={0.1}
                />
            </div>

            <div className="h-64">
                <SocialCard
                    name="Discord"
                    handle="j4ckxyz"
                    copyValue="j4ckxyz"
                    icon={faDiscord}
                    delay={0.2}
                />
            </div>

            {/* Row 2 */}
            <div className="col-span-1 row-span-2 h-auto min-h-[500px]">
                <BlueskyPost />
            </div>

            <div className="h-64">
                <SocialCard
                    name="Email"
                    handle="Contact"
                    url="mailto:jack@jglypt.net"
                    icon={faEnvelope}
                    delay={0.3}
                />
            </div>

            <div className="h-64">
                <SocialCard
                    name="GitHub"
                    handle="j4ckxyz"
                    url="https://github.com/j4ckxyz"
                    icon={faGithub}
                    delay={0.35}
                />
            </div>

            {/* Row 3 - Atmosphere Spans 2 */}
            <div className="col-span-1 md:col-span-2 bg-[#111] border border-[#333] p-6 flex flex-col justify-center cut-corners">
                <div className="flex items-center gap-2 mb-4 text-[#999] font-mono uppercase text-xs tracking-widest">
                    <FontAwesomeIcon icon={faCloud} />
                    <span>ATmosphere Network</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SocialCard
                        name="Flashes"
                        handle="My photos!"
                        url="https://app.flashes.blue/profile/j4ck.xyz"
                        icon={faBolt}
                        color="#FFD700"
                    />
                    <SocialCard
                        name="Leaflet"
                        handle="Blog & Articles"
                        url="https://blog.j4ck.xyz"
                        icon={faLeaf}
                        color="#4CAF50"
                    />
                </div>
            </div>

        </BentoGrid>
    )
}

export default Home
