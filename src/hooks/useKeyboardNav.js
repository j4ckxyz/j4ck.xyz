import { useEffect, useCallback } from 'react';

const useKeyboardNav = (containerRef, itemSelector) => {

    const getFocusableItems = useCallback(() => {
        if (!containerRef.current) return [];
        return Array.from(containerRef.current.querySelectorAll(itemSelector));
    }, [containerRef, itemSelector]);

    const focusItem = (item) => {
        if (item) {
            item.focus();
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const handleLinearNav = (direction) => {
        const items = getFocusableItems();
        if (items.length === 0) return;

        const currentIndex = items.indexOf(document.activeElement);
        let nextIndex;

        if (currentIndex === -1) {
            nextIndex = direction === 1 ? 0 : items.length - 1;
        } else {
            nextIndex = (currentIndex + direction + items.length) % items.length;
        }

        focusItem(items[nextIndex]);
    };

    const handleGeometricNav = (direction) => {
        const items = getFocusableItems();
        const current = document.activeElement;

        // If nothing focused, focus first item
        if (!items.includes(current)) {
            focusItem(items[0]);
            return;
        }

        const currentRect = current.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        let bestCandidate = null;
        let minDistance = Infinity;

        items.forEach(item => {
            if (item === current) return;

            const rect = item.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            let isValid = false;
            // Direction vectors: J (Down) = +y, K (Up) = -y
            if (direction === 'DOWN') {
                isValid = center.y > currentCenter.y; // Simplified: just visually below
            } else if (direction === 'UP') {
                isValid = center.y < currentCenter.y; // Simplified: just visually above
            }

            if (isValid) {
                // Euclidean distance, but we could weight Y distance more if needed
                const dx = center.x - currentCenter.x;
                const dy = center.y - currentCenter.y;
                const distance = dx * dx + dy * dy;

                // Priority: Must be "more" in the direction than sideways? 
                // Simple distance usually works well enough for grids
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCandidate = item;
                }
            }
        });

        if (bestCandidate) {
            focusItem(bestCandidate);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            let acted = false;
            switch (e.key) {
                case ']':
                    handleLinearNav(1);
                    acted = true;
                    break;
                case '[':
                    handleLinearNav(-1);
                    acted = true;
                    break;
                case 'j':
                case 'J':
                    handleGeometricNav('DOWN');
                    acted = true;
                    break;
                case 'k':
                case 'K':
                    handleGeometricNav('UP');
                    acted = true;
                    break;
                default:
                    break;
            }

            if (acted) {
                import('../utils/sound').then(mod => mod.playKeySound());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleLinearNav, handleGeometricNav]);
};

export default useKeyboardNav;
