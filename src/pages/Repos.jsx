import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faStar, faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import useKeyboardNav from '../hooks/useKeyboardNav';

const Repos = () => {
    const { repos, loadingRepos, reposError } = useData();
    const containerRef = useRef(null);
    useKeyboardNav(containerRef, 'a[href]');

    const shown = (repos || []).slice(0, 6);

    return (
        <div className="w-full">
            <SEO
                title="Repos"
                description="Public code repositories."
                image="repos.png"
                path="/repos"
            />
            <h1 className="text-4xl font-bold mb-10 flex items-center gap-4">
                <FontAwesomeIcon icon={faGithub} className="text-[var(--text-primary)]" />
                /repos
                <span className="text-sm font-normal text-[var(--text-muted)]">@j4ckxyz</span>
            </h1>

            {loadingRepos && shown.length === 0 ? (
                <div className="animate-pulse font-mono text-[var(--accent-red)]">Compiling data...</div>
            ) : shown.length > 0 ? (
                <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shown.map((repo) => (
                        <a
                            key={repo.id}
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-xl transition-all hover:border-[var(--accent-red)] hover:-translate-y-1 group flex flex-col justify-between h-40"
                        >
                            <div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-red)] transition-colors mb-2">
                                    {repo.name}
                                </h3>
                                <p className="text-[var(--text-secondary)] text-sm line-clamp-2">
                                    {repo.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)] uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-faint)] inline-block" aria-hidden="true" />
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
            ) : (
                <p className="text-[var(--text-muted)]">
                    {reposError === 'rate_limited'
                        ? "GitHub's rate limit is temporarily blocking this list — try again shortly."
                        : 'No repos to show right now.'}
                </p>
            )}
        </div>
    );
};

export default Repos;
