interface LogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
    showTagline?: boolean;
    className?: string;
  }
  
  export function Logo({ size = "md", showText = true, showTagline = false, className = "" }: LogoProps) {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-12 h-12", 
      lg: "w-16 h-16"
    };
  
    const textSizeClasses = {
      sm: "text-lg",
      md: "text-2xl",
      lg: "text-4xl"
    };
  
    const taglineSizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base"
    };
  
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Logo Icon */}
        <div className={`${sizeClasses[size]} flex-shrink-0`}>
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f5ff" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            
            {/* Rounded square background */}
            <rect
              x="20"
              y="20"
              width="160"
              height="160"
              rx="32"
              ry="32"
              fill="url(#logoGradient)"
              opacity="0.1"
              stroke="url(#logoGradient)"
              strokeWidth="3"
            />
            
            {/* Neural network connections */}
            <g stroke="url(#logoGradient)" strokeWidth="4" fill="none" opacity="0.8">
              {/* Connection lines */}
              <path d="M 60 80 Q 100 60 140 80" />
              <path d="M 80 120 Q 100 100 120 120" />
              <path d="M 100 70 Q 120 90 140 110" />
              <path d="M 70 140 Q 90 120 110 140" />
              <path d="M 120 140 Q 140 120 160 140" />
            </g>
            
            {/* Neural nodes */}
            <g>
              {/* Central main node */}
              <circle cx="100" cy="100" r="12" fill="url(#nodeGradient)" opacity="0.9" />
              <circle cx="100" cy="100" r="6" fill="#00f5ff" opacity="0.7" />
              
              {/* Surrounding nodes */}
              <circle cx="70" cy="80" r="8" fill="url(#nodeGradient)" opacity="0.8" />
              <circle cx="130" cy="80" r="8" fill="url(#nodeGradient)" opacity="0.8" />
              <circle cx="80" cy="130" r="8" fill="url(#nodeGradient)" opacity="0.8" />
              <circle cx="120" cy="130" r="8" fill="url(#nodeGradient)" opacity="0.8" />
              <circle cx="140" cy="110" r="6" fill="#8b5cf6" opacity="0.9" />
              <circle cx="60" cy="120" r="6" fill="#06b6d4" opacity="0.9" />
              <circle cx="110" cy="70" r="6" fill="#3b82f6" opacity="0.9" />
            </g>
          </svg>
        </div>
  
        {/* Text and Tagline */}
        {showText && (
          <div className="flex flex-col">
            <div className={`font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
              NEUROFLUXION
            </div>
            {showTagline && (
              <div className={`text-muted-foreground font-medium tracking-wide ${taglineSizeClasses[size]}`}>
                ORCHESTRATING INTELLIGENCE
              </div>
            )}
          </div>
        )}
      </div>
    );
  }