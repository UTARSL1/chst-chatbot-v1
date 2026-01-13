export function ChstLogo({ className = "w-12 h-12" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Outer square frame with corner brackets */}
            <g stroke="currentColor" strokeWidth="2" fill="none">
                {/* Top-left corner */}
                <path d="M 15 25 L 15 15 L 25 15" strokeLinecap="square" />

                {/* Top-right corner */}
                <path d="M 75 15 L 85 15 L 85 25" strokeLinecap="square" />

                {/* Bottom-right corner */}
                <path d="M 85 75 L 85 85 L 75 85" strokeLinecap="square" />

                {/* Bottom-left corner */}
                <path d="M 25 85 L 15 85 L 15 75" strokeLinecap="square" />
            </g>

            {/* Chat bubble */}
            <g stroke="currentColor" strokeWidth="2" fill="none">
                {/* Main bubble rectangle */}
                <rect x="30" y="35" width="40" height="25" strokeLinecap="square" strokeLinejoin="miter" />

                {/* Chat bubble tail */}
                <path d="M 35 60 L 30 65 L 35 65 Z" fill="currentColor" stroke="none" />
            </g>

            {/* Three dots inside bubble */}
            <g fill="currentColor">
                <circle cx="42" cy="47.5" r="1.5" />
                <circle cx="50" cy="47.5" r="1.5" />
                <circle cx="58" cy="47.5" r="1.5" />
            </g>
        </svg>
    );
}
