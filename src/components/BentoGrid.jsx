import React, { forwardRef } from 'react';

const BentoGrid = forwardRef(({ children }, ref) => {
    return (
        <div
            ref={ref}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[1200px] mx-auto p-6"
        >
            {children}
        </div>
    );
});

BentoGrid.displayName = 'BentoGrid';

export default BentoGrid;
