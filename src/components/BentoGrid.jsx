import React, { forwardRef } from 'react';

const BentoGrid = forwardRef(({ children }, ref) => {
    return (
        <div
            ref={ref}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '24px',
                width: '100%'
            }}>
            {children}
        </div>
    );
});

BentoGrid.displayName = 'BentoGrid';

export default BentoGrid;
