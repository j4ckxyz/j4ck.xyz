import React, { useEffect, useRef } from 'react';

const CursorTrail = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        // Accessibility check
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        let mouse = { x: 0, y: 0 };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;

            // Spawn particles
            for (let i = 0; i < 2; i++) {
                particles.push({
                    x: mouse.x,
                    y: mouse.y,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5,
                    size: Math.random() * 3 + 2,
                    color: 'rgba(255, 51, 51, ', // red accent base
                    life: 1.0,
                    decay: Math.random() * 0.02 + 0.03 // fade speed
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update & draw particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.life * 0.6})`;
                // Glowing phosphor effect
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(255, 51, 51, 0.4)';
                ctx.fill();
            }
            
            // Reset shadowBlur for performance
            ctx.shadowBlur = 0;

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[40]"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default CursorTrail;
