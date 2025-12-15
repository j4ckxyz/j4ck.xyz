import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faStar, faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import SEO from '../components/SEO';

const Repos = () => {
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await fetch('https://api.github.com/users/j4ckxyz/repos?sort=updated&per_page=10');
                if (!response.ok) throw new Error('GitHub API failed');
                const data = await response.json();
                // Filter out forks if desired, or just take top 6
                setRepos(data.slice(0, 6));
            } catch (e) {
                console.error("Failed to fetch repos:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchRepos();
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-mono">
            <SEO
                title="Repos"
                description="Public code repositories."
                image="repos.png"
                path="/repos"
            />
            <div className="max-w-5xl mx-auto">
                <Link to="/" className="text-red-500 hover:text-white transition-colors mb-8 inline-block">← Back Home</Link>
                <h1 className="text-4xl font-bold mb-12 flex items-center gap-4">
                    <FontAwesomeIcon icon={faGithub} />
                    /repos
                    <span className="text-sm font-normal text-gray-600">@j4ckxyz</span>
                </h1>

                {loading ? (
                    <div className="animate-pulse text-red-500">Compiling data...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {repos.map((repo) => (
                            <a
                                key={repo.id}
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#111] border border-[#333] p-6 rounded-xl hover:border-red-500 transition-all hover:transform hover:-translate-y-1 group flex flex-col justify-between h-40"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-red-500 transition-colors mb-2">
                                        {repo.name}
                                    </h3>
                                    <p className="text-[#888] text-sm line-clamp-2">
                                        {repo.description || "No description provided."}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 mt-4 text-xs text-[#555] uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                                        {repo.language || 'N/A'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faStar} />
                                        {repo.stargazers_count}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faCodeBranch} />
                                        {repo.forks_count}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Repos;
