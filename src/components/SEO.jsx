import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, path }) => {
    const siteUrl = 'https://j4ck.xyz';
    const fullTitle = title ? `${title} | j4ck.xyz` : 'j4ck.xyz';
    const fullImage = image ? `${siteUrl}/og/${image}` : `${siteUrl}/og/home.png`;
    const fullUrl = path ? `${siteUrl}${path}` : siteUrl;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={fullUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={fullImage} />
        </Helmet>
    );
};

export default SEO;
