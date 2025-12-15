import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faCloud, faBolt, faLeaf } from '@fortawesome/free-solid-svg-icons'
import BentoGrid from '../components/BentoGrid'
import ProfileCard from '../components/ProfileCard'
import SocialCard from '../components/SocialCard'
import BlueskyPost from '../components/BlueskyPost'
import SEO from '../components/SEO'

function Home() {
    return (
        <BentoGrid>
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
                    name="Twitter"
                    handle="@jglypt"
                    url="https://twitter.com/jglypt"
                    icon={faTwitter}
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
            <div className="col-span-1 md:col-span-2 bg-[#111] border border-[#333] rounded-2xl p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4 text-[#999] font-mono uppercase text-xs tracking-widest">
                    <FontAwesomeIcon icon={faCloud} />
                    <span>ATmosphere Network</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SocialCard
                        name="Flashes"
                        handle="My best photography"
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
