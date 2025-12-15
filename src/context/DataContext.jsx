import React, { createContext, useContext, useEffect, useState } from 'react';
import { BskyAgent } from '@atproto/api';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [blogs, setBlogs] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(true);
    const [loadingPhotos, setLoadingPhotos] = useState(true);

    useEffect(() => {
        // Fetch Blogs (PDS)
        const fetchBlogs = async () => {
            const agent = new BskyAgent({ service: 'https://pds.j4ck.xyz' });
            try {
                const records = await agent.api.com.atproto.repo.listRecords({
                    repo: 'j4ck.xyz',
                    collection: 'pub.leaflet.document',
                    limit: 20,
                });
                setBlogs(records.data.records);
            } catch (e) {
                console.error("Failed to fetch blogs:", e);
            } finally {
                setLoadingBlogs(false);
            }
        };

        // Fetch Photos (GraphQL)
        const fetchPhotos = async () => {
            const query = `
                query GetUserPhotos($handle: String!, $limit: Int = 20) {
                  socialGrainPhoto(
                    where: {
                      actorHandle: { eq: $handle }
                    }
                    sortBy: [{ field: createdAt, direction: DESC }]
                    first: $limit
                  ) {
                    edges {
                      node {
                        uri
                        createdAt
                        alt
                        photo {
                          url(preset: "feed_fullsize")
                        }
                      }
                    }
                  }
                }
            `;

            try {
                const response = await fetch('https://quickslices.atproto.uk/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        variables: { handle: 'j4ck.xyz', limit: 20 }
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.data?.socialGrainPhoto?.edges) {
                        setPhotos(result.data.socialGrainPhoto.edges);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch photos:", e);
            } finally {
                setLoadingPhotos(false);
            }
        };

        fetchBlogs();
        fetchPhotos();
    }, []);

    return (
        <DataContext.Provider value={{ blogs, photos, loadingBlogs, loadingPhotos }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
